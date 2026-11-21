import React, { useRef, useState } from 'react';
import { FontMetadata, FontProject, GlyphData } from '../../types';
import { createDefaultProject } from '../../utils/font/projectDefaults';
import { validateStoredFontProjectWithReport } from '../../utils/font/validation';
import {
  exportProjectJsonFile,
  normalizeValidatedProject,
  formatRemovedDataNotice,
} from '../../utils/storageManager';
import type { PendingFontImportSummary } from './ImportFontConfirmModal';

interface UseProjectFileIOProps {
  project: FontProject;
  setProject: React.Dispatch<React.SetStateAction<FontProject>>;
  onProjectReplaced?: () => void;
  onShowToast?: (text: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  onOpenExportModal?: () => void;
}

export function useProjectFileIO({
  project,
  setProject,
  onProjectReplaced,
  onShowToast,
  onOpenExportModal,
}: UseProjectFileIOProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const projectInputRef = useRef<HTMLInputElement>(null);
  const [isConfirmingNew, setIsConfirmingNew] = useState(false);
  const [newProjectName, setNewProjectName] = useState<string>('新規手書きフォント');
  const [pendingFontImportData, setPendingFontImportData] = useState<{
    summary: PendingFontImportSummary;
    metadata: Partial<FontMetadata>;
    glyphs: Record<number, GlyphData>;
  } | null>(null);

  const notify = (text: string, type: 'success' | 'info' | 'warning' | 'error' = 'info') => {
    if (onShowToast) {
      onShowToast(text, type);
    }
  };

  const handleNewProjectWithCustomName = (customName?: string) => {
    const newProj = createDefaultProject();
    const finalName = customName && customName.trim() ? customName.trim() : '新規手書きフォント';
    newProj.name = finalName;
    newProj.metadata.familyName = finalName;
    setProject(newProj);
    onProjectReplaced?.();
    setIsConfirmingNew(false);
    notify(`新しいフォント『${finalName}』を作成・キャンバスをリセットしました`, 'success');
  };

  const handleSaveProjectJson = () => {
    try {
      const res = exportProjectJsonFile(project);
      if (res.success) {
        notify(`プロジェクトセーブデータ『${res.filename}』を保存しました`, 'success');
      } else {
        notify('プロジェクトの保存に失敗しました', 'error');
      }
    } catch (err) {
      console.error('Failed to export project JSON:', err);
      notify('プロジェクトの保存に失敗しました', 'error');
    }
  };

  const handleLoadProjectJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const { project: validated, removed } = normalizeValidatedProject(validateStoredFontProjectWithReport(json));
        if (validated) {
          setProject(validated);
          onProjectReplaced?.();
          notify('プロジェクトセーブデータを読み込みました', 'success');
          const removedNotice = formatRemovedDataNotice(removed);
          if (removedNotice) {
            notify(removedNotice, 'warning');
          }
        } else {
          notify('無効なセーブデータファイルです。データが破損しているため読み込みませんでした', 'error');
        }
      } catch (err) {
        notify('セーブデータファイルの読み込みに失敗しました', 'error');
      }
    };
    // Report read failures instead of silently doing nothing (1-8).
    reader.onerror = () => {
      notify('セーブデータファイルの読み込みに失敗しました', 'error');
    };
    reader.onabort = () => {
      notify('セーブデータファイルの読み込みが中断されました', 'warning');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const commitFontImport = (
    metadata: Partial<FontMetadata>,
    glyphs: Record<number, GlyphData>,
    mode: 'overwrite' | 'addOnly',
    fileName: string
  ) => {
    if (mode === 'overwrite') {
      const importedCount = Object.keys(glyphs).length;
      setProject((prev) => ({
        ...prev,
        metadata: {
          ...prev.metadata,
          ...metadata,
        },
        glyphs: {
          ...prev.glyphs,
          ...glyphs,
        },
        updatedAt: Date.now(),
      }));
      notify(
        `フォント「${metadata.familyName || fileName}」から ${importedCount} 文字をインポートしました`,
        'success'
      );
      return;
    }

    let addedCount = 0;
    setProject((prev) => {
      const nextGlyphs: Record<number, GlyphData> = { ...prev.glyphs };
      for (const [k, glyph] of Object.entries(glyphs)) {
        const u = Number(k);
        if (!nextGlyphs[u]) {
          nextGlyphs[u] = glyph;
          addedCount++;
        }
      }
      return {
        ...prev,
        glyphs: nextGlyphs,
        updatedAt: Date.now(),
      };
    });
    notify(
      `フォント「${metadata.familyName || fileName}」から未作成の ${addedCount} 文字を追加しました`,
      'success'
    );
  };

  const applyPendingFontImport = (mode: 'overwrite' | 'addOnly') => {
    if (!pendingFontImportData) return;
    commitFontImport(
      pendingFontImportData.metadata,
      pendingFontImportData.glyphs,
      mode,
      pendingFontImportData.summary.fileName
    );
    setPendingFontImportData(null);
  };

  const cancelPendingFontImport = () => {
    setPendingFontImportData(null);
  };

  const handleImportTtf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { loadFontFromFile } = await import('../../utils/font/io');
      const { metadata, glyphs } = await loadFontFromFile(file);
      const importedKeys = Object.keys(glyphs);
      const existingKeys = Object.keys(project.glyphs || {});
      if (existingKeys.length === 0) {
        commitFontImport(metadata, glyphs, 'overwrite', file.name);
      } else {
        let overwriteCount = 0;
        let newOnlyCount = 0;
        for (const k of importedKeys) {
          if (project.glyphs[Number(k)]) {
            overwriteCount++;
          } else {
            newOnlyCount++;
          }
        }
        setPendingFontImportData({
          summary: {
            fileName: file.name,
            familyName: metadata.familyName || file.name.replace(/\.[^/.]+$/, ''),
            totalImportedCount: importedKeys.length,
            overwriteCount,
            newOnlyCount,
          },
          metadata,
          glyphs,
        });
      }
    } catch (err) {
      console.error(err);
      const msg =
        err instanceof Error && err.message.includes('サイズ')
          ? err.message
          : 'フォントファイルの読み込みに失敗しました。TTFまたはOTF形式であることを確認してください。';
      notify(msg, 'error');
    } finally {
      e.target.value = '';
    }
  };

  const handleExportTtf = () => {
    onOpenExportModal?.();
  };

  return {
    fileInputRef,
    projectInputRef,
    isConfirmingNew,
    setIsConfirmingNew,
    newProjectName,
    setNewProjectName,
    pendingFontImport: pendingFontImportData?.summary ?? null,
    applyPendingFontImport,
    cancelPendingFontImport,
    handleNewProjectWithCustomName,
    handleSaveProjectJson,
    handleLoadProjectJson,
    handleImportTtf,
    handleExportTtf,
    notify,
  };
}
