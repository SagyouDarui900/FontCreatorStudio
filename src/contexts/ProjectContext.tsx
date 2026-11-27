import React, { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { FontProject, GlyphData, PathContour, ToolMode } from '../types';
import { useUndoRedo } from '../hooks/useUndoRedo';
import { useGlyphActions } from '../hooks/useGlyphActions';
import {
  getPrevGlyphNav,
  getNextGlyphNav,
  getPrevUncompletedGlyphNav,
  getNextUncompletedGlyphNav,
} from '../utils/navigationHelper';
import {
  setLastAutoSaveTimestamp,
  exportGlyphJsonFile,
  LOCAL_STORAGE_PROJECT_KEY,
} from '../utils/storageManager';

const LOCAL_STORAGE_KEY = LOCAL_STORAGE_PROJECT_KEY;

export interface ProjectContextType {
  project: FontProject;
  setProject: React.Dispatch<React.SetStateAction<FontProject>>;
  projectRef: React.MutableRefObject<FontProject>;
  selectedUnicode: number;
  setSelectedUnicode: (unicode: number) => void;
  selectedChar: string;
  setSelectedChar: (char: string) => void;
  currentGlyph: GlyphData;
  handleSelectGlyph: (unicode: number, char?: string) => void;
  handleSelectPrevGlyph: () => void;
  handleSelectNextGlyph: () => void;
  handleSelectPrevUncompletedGlyph: () => void;
  handleSelectNextUncompletedGlyph: () => void;
  handleUpdateContours: (newContours: PathContour[], options?: { skipHistory?: boolean }) => void;
  handleUpdateAdvanceWidth: (val: number, options?: { skipHistory?: boolean }) => void;
  handleUpdateLsb: (val: number, options?: { skipHistory?: boolean }) => void;
  handleToggleLockGlyph: () => void;
  isGlyphLocked: boolean;
  undoStack: GlyphData[];
  redoStack: GlyphData[];
  setUndoStack: React.Dispatch<React.SetStateAction<GlyphData[]>>;
  canUndo: boolean;
  canRedo: boolean;
  handleUndo: () => void;
  handleRedo: () => void;
  commitHistory: (targetUnicode?: number) => void;
  commitProjectHistory: () => void;
  discardLastHistoryEntry: (expectedContours?: PathContour[], targetUnicode?: number) => boolean;
  clearHistory: () => void;
  clipboardContours: PathContour[] | null;
  clipboardKind: 'glyph' | 'contours' | null;
  /** True when the clipboard holds anything (contours or pixel data). */
  hasClipboard: boolean;
  setClipboardContours: React.Dispatch<React.SetStateAction<PathContour[] | null>>;
  handleQuickSaveCurrentGlyph: () => void;

  // Glyph actions
  handleSimplifyCurrentGlyph: (level?: 'mild' | 'normal' | 'strong') => void;
  handleAutoSpaceCurrentGlyph: (preset?: any) => void;
  handleClearGlyph: (unicode: number) => void;
  handleOptimizeGlyph: (unicode: number) => void;
  handleCopyGlyph: (unicode: number) => void;
  handlePasteGlyph: (unicode: number) => void;
  handleCopySelectedContours: (contourIds: string[]) => void;
  handlePasteClipboardContours: () => void;
  handleDuplicateAsSmallKana: (sourceUnicode: number) => void;
  handleGenerateDakutenTarget: (targetChar: string, isHandakuten?: boolean, sourceChar?: string) => void;
  handleCopyFromChar: (sourceChar: string) => void;
  handleInsertRadical: (radicalContours: PathContour[]) => void;
  handleBatchInsertRadical: (radicalContours: PathContour[], targetChars: string[]) => void;
}

const ProjectContext = createContext<ProjectContextType | null>(null);

interface ProjectProviderProps {
  project: FontProject;
  setProject: React.Dispatch<React.SetStateAction<FontProject>>;
  projectRef: React.MutableRefObject<FontProject>;
  saveProjectToIndexedDbWhenIdle: (p: FontProject) => Promise<boolean>;
  showToast: (text: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  setToolMode?: (mode: ToolMode) => void;
  children: React.ReactNode;
}

const EMPTY_CONTOURS: PathContour[] = [];
const NOOP_SET_TOOL_MODE = (_mode: ToolMode) => {};

export function ProjectProvider({
  project,
  setProject,
  projectRef,
  saveProjectToIndexedDbWhenIdle,
  showToast,
  setToolMode = NOOP_SET_TOOL_MODE,
  children,
}: ProjectProviderProps) {
  const [selectedUnicode, setSelectedUnicode] = useState<number>(12354); // 'あ' (U+3042)

  const selectedChar = useMemo(() => {
    const fromGlyph = project.glyphs[selectedUnicode]?.char;
    if (fromGlyph) return fromGlyph;
    try {
      return selectedUnicode > 0 ? String.fromCodePoint(selectedUnicode) : '';
    } catch {
      return '';
    }
  }, [project.glyphs, selectedUnicode]);

  const setSelectedChar = useCallback((_char: string) => {}, []);

  const currentGlyph: GlyphData = useMemo(() => {
    return (
      project.glyphs[selectedUnicode] || {
        unicode: selectedUnicode,
        char: selectedChar,
        name: `uni${selectedUnicode.toString(16).toUpperCase().padStart(4, '0')}`,
        advanceWidth: project.metadata?.unitsPerEm || 1000,
        lsb: 50,
        contours: EMPTY_CONTOURS,
        modified: false,
      }
    );
  }, [project.glyphs, project.metadata?.unitsPerEm, selectedUnicode, selectedChar]);

  const currentGlyphRef = useRef<GlyphData>(currentGlyph);
  useEffect(() => {
    currentGlyphRef.current = currentGlyph;
  }, [currentGlyph]);

  const {
    undoStack,
    redoStack,
    setUndoStack,
    commitHistory,
    commitProjectHistory,
    discardLastHistoryEntry,
    clearHistory,
    handleUndo,
    handleRedo,
    canUndo,
    canRedo,
  } = useUndoRedo({
    projectRef,
    currentGlyphRef,
    selectedUnicode,
    selectedChar,
    setSelectedUnicode,
    setProject,
  });

  const prevProjectIdRef = useRef(project.id);
  useEffect(() => {
    if (prevProjectIdRef.current !== project.id) {
      prevProjectIdRef.current = project.id;
      clearHistory();
    }
  }, [project.id, clearHistory]);

  const handleSelectGlyph = useCallback((unicode: number, _char?: string) => {
    setSelectedUnicode(unicode);
  }, []);

  const handleSelectPrevGlyph = useCallback(() => {
    const prev = getPrevGlyphNav(selectedUnicode);
    handleSelectGlyph(prev.unicode, prev.char);
  }, [selectedUnicode, handleSelectGlyph]);

  const handleSelectNextGlyph = useCallback(() => {
    const next = getNextGlyphNav(selectedUnicode);
    handleSelectGlyph(next.unicode, next.char);
  }, [selectedUnicode, handleSelectGlyph]);

  const handleSelectPrevUncompletedGlyph = useCallback(() => {
    const prev = getPrevUncompletedGlyphNav(selectedUnicode, project.glyphs || {});
    if (prev) {
      handleSelectGlyph(prev.unicode, prev.char);
      showToast(`前の未作成文字「${prev.char}」へジャンプしました`, 'info');
    } else {
      showToast('前の未作成グリフはありません（すべて作図完了しています）', 'success');
    }
  }, [selectedUnicode, project.glyphs, handleSelectGlyph, showToast]);

  const handleSelectNextUncompletedGlyph = useCallback(() => {
    const next = getNextUncompletedGlyphNav(selectedUnicode, project.glyphs || {});
    if (next) {
      handleSelectGlyph(next.unicode, next.char);
      showToast(`次の未作成文字「${next.char}」へジャンプしました`, 'info');
    } else {
      showToast('次の未作成グリフはありません（すべて作図完了！）', 'success');
    }
  }, [selectedUnicode, project.glyphs, handleSelectGlyph, showToast]);

  const isGlyphLocked = Boolean(project.glyphs[selectedUnicode]?.locked);

  const handleToggleLockGlyph = useCallback(() => {
    const nextLocked = !isGlyphLocked;
    setProject((prev) => {
      const existing = prev.glyphs[selectedUnicode] || {
        unicode: selectedUnicode,
        char: selectedChar,
        name: `uni${selectedUnicode.toString(16).toUpperCase().padStart(4, '0')}`,
        advanceWidth: prev.metadata?.unitsPerEm || 1000,
        lsb: 50,
        contours: [],
      };
      return {
        ...prev,
        glyphs: {
          ...prev.glyphs,
          [selectedUnicode]: {
            ...existing,
            locked: nextLocked,
          },
        },
        updatedAt: Date.now(),
      };
    });
    showToast(
      nextLocked
        ? `文字「${selectedChar}」を編集ロックしました（誤操作・意図しない変更を防止）`
        : `文字「${selectedChar}」の編集ロックを解除しました`,
      nextLocked ? 'warning' : 'info'
    );
  }, [isGlyphLocked, project.metadata?.unitsPerEm, selectedUnicode, selectedChar, setProject, showToast]);

  const checkIsLockedAndNotify = useCallback((): boolean => {
    if (projectRef.current.glyphs[selectedUnicode]?.locked) {
      showToast(
        `文字「${selectedChar}」は編集ロックされています。ヘッダーの鍵アイコンで解除してください。`,
        'warning'
      );
      return true;
    }
    return false;
  }, [selectedUnicode, selectedChar, showToast, projectRef]);

  const updateCurrentGlyphField = useCallback(
    <K extends 'contours' | 'advanceWidth' | 'lsb'>(
      field: K,
      value: GlyphData[K],
      options?: { skipHistory?: boolean }
    ) => {
      if (checkIsLockedAndNotify()) return;
      if (!options?.skipHistory) {
        commitHistory();
      }
      const latest =
        currentGlyphRef.current.unicode === selectedUnicode
          ? currentGlyphRef.current
          : projectRef.current.glyphs[selectedUnicode] || currentGlyphRef.current;
      if (latest[field] !== value) {
        currentGlyphRef.current = {
          ...latest,
          [field]: value,
          modified: true,
        };
      }
      setProject((prev) => {
        const existing = prev.glyphs[selectedUnicode] || {
          unicode: selectedUnicode,
          char: selectedChar,
          name: `uni${selectedUnicode.toString(16).toUpperCase().padStart(4, '0')}`,
          advanceWidth: prev.metadata?.unitsPerEm || 1000,
          lsb: 50,
          contours: [],
          modified: false,
        };
        if (existing[field] === value) return prev;
        return {
          ...prev,
          glyphs: {
            ...prev.glyphs,
            [selectedUnicode]: {
              ...existing,
              [field]: value,
              modified: true,
            },
          },
          updatedAt: Date.now(),
        };
      });
    },
    [checkIsLockedAndNotify, projectRef, selectedUnicode, selectedChar, commitHistory, setProject]
  );

  const handleUpdateContours = useCallback(
    (newContours: PathContour[], options?: { skipHistory?: boolean }) =>
      updateCurrentGlyphField('contours', newContours, options),
    [updateCurrentGlyphField]
  );

  const handleUpdateAdvanceWidth = useCallback(
    (val: number, options?: { skipHistory?: boolean }) =>
      updateCurrentGlyphField('advanceWidth', val, options),
    [updateCurrentGlyphField]
  );

  const handleUpdateLsb = useCallback(
    (val: number, options?: { skipHistory?: boolean }) =>
      updateCurrentGlyphField('lsb', val, options),
    [updateCurrentGlyphField]
  );

  const handleQuickSaveCurrentGlyph = useCallback(() => {
    void (async () => {
      // Immediate LocalStorage save: record whether it actually succeeded
      // (8-10) so a failure is not reported as a successful persist.
      let localSaved = false;
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(projectRef.current));
        setLastAutoSaveTimestamp(Date.now());
        localSaved = true;
      } catch (e) {
        console.warn('Immediate project save failed:', e);
      }
      // The IndexedDB save runs on a separate path; wait for its result
      // and take it into account as well.
      const indexedDbSaved = await saveProjectToIndexedDbWhenIdle(projectRef.current);

      const g = projectRef.current.glyphs?.[selectedUnicode] || {
        unicode: selectedUnicode,
        char: selectedChar,
        advanceWidth: projectRef.current.metadata?.unitsPerEm || 1000,
        contours: [],
        strokes: [],
        anchors: [],
      };

      const res = exportGlyphJsonFile(
        g,
        selectedUnicode,
        selectedChar,
        projectRef.current.metadata?.familyName || projectRef.current.name || '手書きフォント',
        projectRef.current.metadata?.version || '1.0'
      );

      if (res.success) {
        showToast(
          `文字「${selectedChar}」(U+${selectedUnicode.toString(16).toUpperCase().padStart(4, '0')}) を即時保存し、『${res.filename}』をダウンロードしました`,
          'success'
        );
      } else if (localSaved || indexedDbSaved) {
        showToast(`文字「${selectedChar}」の変更をブラウザに即時永続化しました`, 'success');
      } else {
        showToast(
          `文字「${selectedChar}」の変更をブラウザに保存できませんでした。編集内容は保持されています。`,
          'error'
        );
      }
    })();
  }, [selectedUnicode, selectedChar, showToast, saveProjectToIndexedDbWhenIdle, projectRef]);

  const glyphActions = useGlyphActions({
    project,
    setProject,
    selectedUnicode,
    selectedChar,
    setSelectedUnicode,
    setSelectedChar,
    currentGlyph,
    currentGlyphRef,
    commitHistory,
    setUndoStack,
    setToolMode,
    onShowToast: showToast,
    handleUpdateContours,
  });

  // A copy belongs to the project it was copied from. When the project
  // is replaced (new / loaded / imported), drop the clipboard so a stale
  // copy from the previous project cannot be pasted into the new one.
  // The paste handlers also refuse a copy whose source project id
  // differs from the current project.
  const prevProjectIdForClipboardRef = useRef(project.id);
  useEffect(() => {
    if (prevProjectIdForClipboardRef.current !== project.id) {
      prevProjectIdForClipboardRef.current = project.id;
      glyphActions.setClipboardContours(null);
    }
  }, [project.id, glyphActions]);

  const value = useMemo<ProjectContextType>(
    () => ({
      project,
      setProject,
      projectRef,
      selectedUnicode,
      setSelectedUnicode,
      selectedChar,
      setSelectedChar,
      currentGlyph,
      handleSelectGlyph,
      handleSelectPrevGlyph,
      handleSelectNextGlyph,
      handleSelectPrevUncompletedGlyph,
      handleSelectNextUncompletedGlyph,
      handleUpdateContours,
      handleUpdateAdvanceWidth,
      handleUpdateLsb,
      handleToggleLockGlyph,
      isGlyphLocked,
      undoStack,
      redoStack,
      setUndoStack,
      canUndo,
      canRedo,
      handleUndo,
      handleRedo,
      commitHistory,
      clearHistory,
      commitProjectHistory,
      discardLastHistoryEntry,
      clipboardContours: glyphActions.clipboardContours,
      clipboardKind: glyphActions.clipboardKind,
      hasClipboard: glyphActions.clipboard !== null,
      setClipboardContours: glyphActions.setClipboardContours,
      handleQuickSaveCurrentGlyph,
      handleSimplifyCurrentGlyph: glyphActions.handleSimplifyCurrentGlyph,
      handleAutoSpaceCurrentGlyph: glyphActions.handleAutoSpaceCurrentGlyph,
      handleClearGlyph: glyphActions.handleClearGlyph,
      handleOptimizeGlyph: glyphActions.handleOptimizeGlyph,
      handleCopyGlyph: glyphActions.handleCopyGlyph,
      handlePasteGlyph: glyphActions.handlePasteGlyph,
      handleCopySelectedContours: glyphActions.handleCopySelectedContours,
      handlePasteClipboardContours: glyphActions.handlePasteClipboardContours,
      handleDuplicateAsSmallKana: glyphActions.handleDuplicateAsSmallKana,
      handleGenerateDakutenTarget: glyphActions.handleGenerateDakutenTarget,
      handleCopyFromChar: glyphActions.handleCopyFromChar,
      handleInsertRadical: glyphActions.handleInsertRadical,
      handleBatchInsertRadical: glyphActions.handleBatchInsertRadical,
    }),
    [
      project,
      setProject,
      projectRef,
      selectedUnicode,
      selectedChar,
      currentGlyph,
      handleSelectGlyph,
      handleSelectPrevGlyph,
      handleSelectNextGlyph,
      handleSelectPrevUncompletedGlyph,
      handleSelectNextUncompletedGlyph,
      handleUpdateContours,
      handleUpdateAdvanceWidth,
      handleUpdateLsb,
      handleToggleLockGlyph,
      isGlyphLocked,
      undoStack,
      redoStack,
      setUndoStack,
      canUndo,
      canRedo,
      handleUndo,
      handleRedo,
      commitHistory,
      clearHistory,
      commitProjectHistory,
      discardLastHistoryEntry,
      handleQuickSaveCurrentGlyph,
      glyphActions,
    ]
  );

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProjectContext() {
  const ctx = useContext(ProjectContext);
  if (!ctx) {
    throw new Error('useProjectContext must be used within a ProjectProvider');
  }
  return ctx;
}
