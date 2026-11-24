import React, { useRef, useState } from 'react';
import { FontMetadata, FontProject, GlyphData } from '../../types';
import { createDefaultProject } from '../../utils/font/projectDefaults';
import { validateStoredFontProjectWithReport } from '../../utils/font/validation';
import {
  exportProjectJsonFile,
  normalizeValidatedProject,
  formatRemovedDataNotice,
  preservePreRestoreSnapshot,
} from '../../utils/storageManager';
import type { FontImportReport } from '../../utils/font/io';
import type { PendingFontImportSummary } from './ImportFontConfirmModal';

interface UseProjectFileIOProps {
  project: FontProject;
  setProject: React.Dispatch<React.SetStateAction<FontProject>>;
  onProjectReplaced?: () => void;
  commitHistory?: (targetUnicode?: number) => void;
  commitProjectHistory?: () => void;
  onShowToast?: (text: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  onOpenExportModal?: () => void;
}

/**
 * Notice for font data that loadFontFromFile could not carry over
 * (Unicode-less glyphs, duplicate Unicodes, kerning). Returns null
 * when nothing was dropped.
 */
export function formatFontImportDroppedNotice(report?: FontImportReport): string | null {
  if (!report) return null;
  const parts: string[] = [];
  if (report.noUnicodeGlyphs > 0) {
    parts.push(`Unicodeを持たないグリフ${report.noUnicodeGlyphs}件を除外しました`);
  }
  if (report.duplicateUnicodes > 0) {
    parts.push(`重複するUnicodeのグリフ${report.duplicateUnicodes}件を除外しました（先に読み込んだものを採用）`);
  }
  if (report.kerningPairsSkipped > 0) {
    parts.push(`カーニング${report.kerningPairsSkipped}件は読み込まれませんでした`);
  } else if (report.kerningTablesPresent) {
    parts.push('カーニングは読み込まれませんでした');
  }
  if (parts.length === 0) return null;
  return `${parts.join('。')}。`;
}

export function useProjectFileIO({
  project,
  setProject,
  onProjectReplaced,
  commitHistory,
  commitProjectHistory,
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
    report?: FontImportReport;
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
        const { project: validated, removed, warnings, removedGlyphLabels } = normalizeValidatedProject(validateStoredFontProjectWithReport(json));
        if (validated) {
          // Data dropped by validation would otherwise be lost when
          // auto-save overwrites storage with the sanitized project:
          // keep the raw file content as a snapshot first.
          const preserved = removed ? preservePreRestoreSnapshot(json) : false;
          setProject(validated);
          onProjectReplaced?.();
          notify('プロジェクトセーブデータを読み込みました', 'success');
          const removedNotice = formatRemovedDataNotice(removed, warnings, removedGlyphLabels);
          if (removedNotice) {
            notify(removedNotice, 'warning');
          }
          if (preserved) {
            notify('読み込み前のデータはスナップショットに残しました（ストレージ管理から確認できます）', 'info');
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
    fileName: string,
    report?: FontImportReport
  ) => {
    const droppedNotice = formatFontImportDroppedNotice(report);
    if (mode === 'overwrite') {
      const importedCount = Object.keys(glyphs).length;
      // Register history before replacing, so Ctrl+Z restores the
      // overwritten glyphs (per glyph) and the previous metadata
      // (project-level config history).
      commitProjectHistory?.();
      for (const key of Object.keys(glyphs)) {
        commitHistory?.(Number(key));
      }
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
      if (droppedNotice) notify(droppedNotice, 'warning');
      return;
    }

    let addedCount = 0;
    const addedUnicodes: number[] = [];
    for (const [k] of Object.entries(glyphs)) {
      const u = Number(k);
      if (!project.glyphs[u]) {
        addedUnicodes.push(u);
      }
    }
    // New glyphs get a pre-import (empty) snapshot so Ctrl+Z removes
    // the imported outlines again.
    for (const u of addedUnicodes) {
      commitHistory?.(u);
    }
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
    if (droppedNotice) notify(droppedNotice, 'warning');
  };

  const applyPendingFontImport = (mode: 'overwrite' | 'addOnly') => {
    if (!pendingFontImportData) return;
    commitFontImport(
      pendingFontImportData.metadata,
      pendingFontImportData.glyphs,
      mode,
      pendingFontImportData.summary.fileName,
      pendingFontImportData.report
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
      const { metadata, glyphs, report } = await loadFontFromFile(file);
      const importedKeys = Object.keys(glyphs);
      const existingKeys = Object.keys(project.glyphs || {});
      if (existingKeys.length === 0) {
        commitFontImport(metadata, glyphs, 'overwrite', file.name, report);
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
            droppedNoUnicodeCount: report.noUnicodeGlyphs,
            droppedDuplicateUnicodeCount: report.duplicateUnicodes,
            droppedKerningCount: report.kerningPairsSkipped,
            kerningNotImported: report.kerningTablesPresent,
          },
          metadata,
          glyphs,
          report,
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
