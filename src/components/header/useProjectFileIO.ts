import React, { useRef, useState } from 'react';
import { FontProject } from '../../types';
import { createDefaultProject, loadFontFromFile } from '../../utils/fontCompiler';
import { exportProjectJsonFile } from '../../utils/storageManager';

interface UseProjectFileIOProps {
  project: FontProject;
  setProject: React.Dispatch<React.SetStateAction<FontProject>>;
  onShowToast?: (text: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  onOpenExportModal?: () => void;
}

export function useProjectFileIO({
  project,
  setProject,
  onShowToast,
  onOpenExportModal,
}: UseProjectFileIOProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const projectInputRef = useRef<HTMLInputElement>(null);
  const [isConfirmingNew, setIsConfirmingNew] = useState(false);
  const [newProjectName, setNewProjectName] = useState<string>('新規手書きフォント');

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
        if (json.metadata && json.glyphs) {
          setProject(json);
          notify('プロジェクトセーブデータを読み込みました', 'success');
        } else {
          notify('無効なセーブデータファイルです', 'error');
        }
      } catch (err) {
        notify('セーブデータファイルの読み込みに失敗しました', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleImportTtf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { metadata, glyphs } = await loadFontFromFile(file);
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
      notify(`フォント「${metadata.familyName || file.name}」から ${Object.keys(glyphs).length} 文字をインポートしました`, 'success');
    } catch (err) {
      console.error(err);
      notify('フォントファイルの読み込みに失敗しました。TTFまたはOTF形式であることを確認してください。', 'error');
    }
    e.target.value = '';
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
    handleNewProjectWithCustomName,
    handleSaveProjectJson,
    handleLoadProjectJson,
    handleImportTtf,
    handleExportTtf,
    notify,
  };
}
