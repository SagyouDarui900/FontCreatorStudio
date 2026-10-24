import React, { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { FontProject, GlyphData, PathContour } from '../types';
import { useUndoRedo } from '../hooks/useUndoRedo';
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
  handleUpdateAdvanceWidth: (val: number) => void;
  handleUpdateLsb: (val: number) => void;
  handleToggleLockGlyph: () => void;
  isGlyphLocked: boolean;
  undoStack: GlyphData[];
  redoStack: GlyphData[];
  canUndo: boolean;
  canRedo: boolean;
  handleUndo: () => void;
  handleRedo: () => void;
  commitHistory: () => void;
  clipboardContours: PathContour[] | null;
  setClipboardContours: React.Dispatch<React.SetStateAction<PathContour[] | null>>;
  handleQuickSaveCurrentGlyph: () => void;
}

const ProjectContext = createContext<ProjectContextType | null>(null);

interface ProjectProviderProps {
  project: FontProject;
  setProject: React.Dispatch<React.SetStateAction<FontProject>>;
  projectRef: React.MutableRefObject<FontProject>;
  saveProjectToIndexedDbWhenIdle: (p: FontProject) => Promise<void>;
  showToast: (text: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  children: React.ReactNode;
}

export function ProjectProvider({
  project,
  setProject,
  projectRef,
  saveProjectToIndexedDbWhenIdle,
  showToast,
  children,
}: ProjectProviderProps) {
  const [selectedUnicode, setSelectedUnicode] = useState<number>(12354); // 'あ' (U+3042)
  const [selectedChar, setSelectedChar] = useState<string>('あ');
  const [clipboardContours, setClipboardContours] = useState<PathContour[] | null>(null);

  const currentGlyph: GlyphData = useMemo(() => {
    return (
      project.glyphs[selectedUnicode] || {
        unicode: selectedUnicode,
        char: selectedChar,
        name: `uni${selectedUnicode.toString(16).toUpperCase().padStart(4, '0')}`,
        advanceWidth: project.metadata.unitsPerEm || 1000,
        lsb: 50,
        contours: [],
        modified: false,
      }
    );
  }, [project.glyphs, project.metadata.unitsPerEm, selectedUnicode, selectedChar]);

  const currentGlyphRef = useRef<GlyphData>(currentGlyph);
  useEffect(() => {
    currentGlyphRef.current = currentGlyph;
  }, [currentGlyph]);

  const {
    undoStack,
    redoStack,
    commitHistory,
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
    setSelectedChar,
    setProject,
  });

  const handleSelectGlyph = useCallback((unicode: number, char?: string) => {
    setSelectedUnicode(unicode);
    try {
      setSelectedChar(char || String.fromCodePoint(unicode));
    } catch {
      setSelectedChar(char || '');
    }
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
        advanceWidth: prev.metadata.unitsPerEm || 1000,
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
  }, [isGlyphLocked, project.metadata.unitsPerEm, selectedUnicode, selectedChar, setProject, showToast]);

  const handleUpdateContours = useCallback(
    (newContours: PathContour[], options?: { skipHistory?: boolean }) => {
      if (projectRef.current.glyphs[selectedUnicode]?.locked) {
        showToast(
          `文字「${selectedChar}」は編集ロックされています。ヘッダーの鍵アイコンで解除してください。`,
          'warning'
        );
        return;
      }
      if (!options?.skipHistory) {
        commitHistory();
      }
      setProject((prev) => {
        const existing = prev.glyphs[selectedUnicode] || {
          unicode: selectedUnicode,
          char: selectedChar,
          name: `uni${selectedUnicode.toString(16).toUpperCase().padStart(4, '0')}`,
          advanceWidth: prev.metadata.unitsPerEm || 1000,
          lsb: 50,
        };

        if (existing.contours === newContours) return prev;

        return {
          ...prev,
          glyphs: {
            ...prev.glyphs,
            [selectedUnicode]: {
              ...existing,
              contours: newContours,
              modified: true,
            },
          },
          updatedAt: Date.now(),
        };
      });
    },
    [selectedUnicode, selectedChar, commitHistory, setProject, showToast, projectRef]
  );

  const handleUpdateAdvanceWidth = useCallback(
    (val: number) => {
      commitHistory();
      setProject((prev) => {
        const existing = prev.glyphs[selectedUnicode] || currentGlyph;
        return {
          ...prev,
          glyphs: {
            ...prev.glyphs,
            [selectedUnicode]: {
              ...existing,
              advanceWidth: val,
              modified: true,
            },
          },
          updatedAt: Date.now(),
        };
      });
    },
    [selectedUnicode, currentGlyph, commitHistory, setProject]
  );

  const handleUpdateLsb = useCallback(
    (val: number) => {
      commitHistory();
      setProject((prev) => {
        const existing = prev.glyphs[selectedUnicode] || currentGlyph;
        return {
          ...prev,
          glyphs: {
            ...prev.glyphs,
            [selectedUnicode]: {
              ...existing,
              lsb: val,
              modified: true,
            },
          },
          updatedAt: Date.now(),
        };
      });
    },
    [selectedUnicode, currentGlyph, commitHistory, setProject]
  );

  const handleQuickSaveCurrentGlyph = useCallback(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(projectRef.current));
      setLastAutoSaveTimestamp(Date.now());
      void saveProjectToIndexedDbWhenIdle(projectRef.current);
    } catch (e) {
      console.warn('Immediate project save failed:', e);
    }

    const g = projectRef.current.glyphs?.[selectedUnicode] || {
      unicode: selectedUnicode,
      char: selectedChar,
      advanceWidth: projectRef.current.metadata.unitsPerEm || 1000,
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
    } else {
      showToast(`文字「${selectedChar}」の変更をブラウザに即時永続化しました`, 'success');
    }
  }, [selectedUnicode, selectedChar, showToast, saveProjectToIndexedDbWhenIdle, projectRef]);

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
      canUndo,
      canRedo,
      handleUndo,
      handleRedo,
      commitHistory,
      clipboardContours,
      setClipboardContours,
      handleQuickSaveCurrentGlyph,
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
      canUndo,
      canRedo,
      handleUndo,
      handleRedo,
      commitHistory,
      clipboardContours,
      handleQuickSaveCurrentGlyph,
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
