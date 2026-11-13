import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

export type ModalId =
  | 'mobileTheme'
  | 'test'
  | 'fontInfo'
  | 'trace'
  | 'svg'
  | 'batchNormalize'
  | 'quality'
  | 'synthesis'
  | 'kerning'
  | 'weightInterp'
  | 'glyphCompare'
  | 'radicalStudio'
  | 'storageManager'
  | 'shortcuts'
  | 'export'
  | 'openTypeFeatures'
  | 'gridFitting'
  | 'pixelStudio'
  | 'mojikumi'
  | 'penPresets'
  | 'jisProgress'
  | 'ivsManager';

export interface ModalContextType {
  // Active modal ID state & direct controllers
  activeModal: ModalId | null;
  openModal: (id: ModalId) => void;
  closeModal: () => void;
  isModalOpen: (id: ModalId) => boolean;

  // Mobile drawer / panels (managed independently from full modals)
  showRadicals: boolean;
  setShowRadicals: React.Dispatch<React.SetStateAction<boolean>>;
  showGridDrawer: boolean;
  setShowGridDrawer: React.Dispatch<React.SetStateAction<boolean>>;
  showMetricsDrawer: boolean;
  setShowMetricsDrawer: React.Dispatch<React.SetStateAction<boolean>>;

  // Backward-compatible individual modal getters and setters
  isMobileThemeModalOpen: boolean;
  setIsMobileThemeModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isTestModalOpen: boolean;
  setIsTestModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isFontInfoModalOpen: boolean;
  setIsFontInfoModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isTraceModalOpen: boolean;
  setIsTraceModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isSvgModalOpen: boolean;
  setIsSvgModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isBatchNormalizeModalOpen: boolean;
  setIsBatchNormalizeModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isQualityModalOpen: boolean;
  setIsQualityModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isSynthesisModalOpen: boolean;
  setIsSynthesisModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isKerningModalOpen: boolean;
  setIsKerningModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isWeightInterpModalOpen: boolean;
  setIsWeightInterpModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isGlyphCompareModalOpen: boolean;
  setIsGlyphCompareModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isRadicalStudioOpen: boolean;
  setIsRadicalStudioOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isStorageManagerOpen: boolean;
  setIsStorageManagerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isShortcutsModalOpen: boolean;
  setIsShortcutsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isExportModalOpen: boolean;
  setIsExportModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isOpenTypeFeaturesModalOpen: boolean;
  setIsOpenTypeFeaturesModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isGridFittingModalOpen: boolean;
  setIsGridFittingModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isPixelStudioOpen: boolean;
  setIsPixelStudioOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isMojikumiStudioOpen: boolean;
  setIsMojikumiStudioOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isPenPresetsModalOpen: boolean;
  setIsPenPresetsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;

  // Helper flags and actions
  isAnyModalOpen: boolean;
  closeAllModals: () => void;
}

const ModalContext = createContext<ModalContextType | null>(null);

export function ModalProvider({ children }: { children: React.ReactNode }) {
  // Single active modal identifier
  const [activeModal, setActiveModal] = useState<ModalId | null>(null);

  // Independent drawers / side panels
  const [showRadicals, setShowRadicals] = useState(false);
  const [showGridDrawer, setShowGridDrawer] = useState(() => {
    return typeof window !== 'undefined' ? window.innerWidth >= 1280 : false;
  });
  const [showMetricsDrawer, setShowMetricsDrawer] = useState(false);

  // Primary controllers
  const openModal = useCallback((id: ModalId) => {
    setActiveModal(id);
  }, []);

  const closeModal = useCallback(() => {
    setActiveModal(null);
  }, []);

  const isModalOpen = useCallback((id: ModalId) => activeModal === id, [activeModal]);

  const closeAllModals = useCallback(() => {
    setActiveModal(null);
    setShowRadicals(false);
  }, []);

  // Stable setters for backward compatibility
  const makeSetter = (id: ModalId) => (action: React.SetStateAction<boolean>) => {
    setActiveModal((curr) => {
      const isCurr = curr === id;
      const next = typeof action === 'function' ? action(isCurr) : action;
      return next ? id : curr === id ? null : curr;
    });
  };

  const setIsMobileThemeModalOpen = useCallback<React.Dispatch<React.SetStateAction<boolean>>>(makeSetter('mobileTheme'), []);
  const setIsTestModalOpen = useCallback<React.Dispatch<React.SetStateAction<boolean>>>(makeSetter('test'), []);
  const setIsFontInfoModalOpen = useCallback<React.Dispatch<React.SetStateAction<boolean>>>(makeSetter('fontInfo'), []);
  const setIsTraceModalOpen = useCallback<React.Dispatch<React.SetStateAction<boolean>>>(makeSetter('trace'), []);
  const setIsSvgModalOpen = useCallback<React.Dispatch<React.SetStateAction<boolean>>>(makeSetter('svg'), []);
  const setIsBatchNormalizeModalOpen = useCallback<React.Dispatch<React.SetStateAction<boolean>>>(makeSetter('batchNormalize'), []);
  const setIsQualityModalOpen = useCallback<React.Dispatch<React.SetStateAction<boolean>>>(makeSetter('quality'), []);
  const setIsSynthesisModalOpen = useCallback<React.Dispatch<React.SetStateAction<boolean>>>(makeSetter('synthesis'), []);
  const setIsKerningModalOpen = useCallback<React.Dispatch<React.SetStateAction<boolean>>>(makeSetter('kerning'), []);
  const setIsWeightInterpModalOpen = useCallback<React.Dispatch<React.SetStateAction<boolean>>>(makeSetter('weightInterp'), []);
  const setIsGlyphCompareModalOpen = useCallback<React.Dispatch<React.SetStateAction<boolean>>>(makeSetter('glyphCompare'), []);
  const setIsRadicalStudioOpen = useCallback<React.Dispatch<React.SetStateAction<boolean>>>(makeSetter('radicalStudio'), []);
  const setIsStorageManagerOpen = useCallback<React.Dispatch<React.SetStateAction<boolean>>>(makeSetter('storageManager'), []);
  const setIsShortcutsModalOpen = useCallback<React.Dispatch<React.SetStateAction<boolean>>>(makeSetter('shortcuts'), []);
  const setIsExportModalOpen = useCallback<React.Dispatch<React.SetStateAction<boolean>>>(makeSetter('export'), []);
  const setIsOpenTypeFeaturesModalOpen = useCallback<React.Dispatch<React.SetStateAction<boolean>>>(makeSetter('openTypeFeatures'), []);
  const setIsGridFittingModalOpen = useCallback<React.Dispatch<React.SetStateAction<boolean>>>(makeSetter('gridFitting'), []);
  const setIsPixelStudioOpen = useCallback<React.Dispatch<React.SetStateAction<boolean>>>(makeSetter('pixelStudio'), []);
  const setIsMojikumiStudioOpen = useCallback<React.Dispatch<React.SetStateAction<boolean>>>(makeSetter('mojikumi'), []);
  const setIsPenPresetsModalOpen = useCallback<React.Dispatch<React.SetStateAction<boolean>>>(makeSetter('penPresets'), []);

  const isAnyModalOpen = activeModal !== null;

  const value = useMemo<ModalContextType>(
    () => ({
      activeModal,
      openModal,
      closeModal,
      isModalOpen,
      showRadicals,
      setShowRadicals,
      showGridDrawer,
      setShowGridDrawer,
      showMetricsDrawer,
      setShowMetricsDrawer,
      isMobileThemeModalOpen: activeModal === 'mobileTheme',
      setIsMobileThemeModalOpen,
      isTestModalOpen: activeModal === 'test',
      setIsTestModalOpen,
      isFontInfoModalOpen: activeModal === 'fontInfo',
      setIsFontInfoModalOpen,
      isTraceModalOpen: activeModal === 'trace',
      setIsTraceModalOpen,
      isSvgModalOpen: activeModal === 'svg',
      setIsSvgModalOpen,
      isBatchNormalizeModalOpen: activeModal === 'batchNormalize',
      setIsBatchNormalizeModalOpen,
      isQualityModalOpen: activeModal === 'quality',
      setIsQualityModalOpen,
      isSynthesisModalOpen: activeModal === 'synthesis',
      setIsSynthesisModalOpen,
      isKerningModalOpen: activeModal === 'kerning',
      setIsKerningModalOpen,
      isWeightInterpModalOpen: activeModal === 'weightInterp',
      setIsWeightInterpModalOpen,
      isGlyphCompareModalOpen: activeModal === 'glyphCompare',
      setIsGlyphCompareModalOpen,
      isRadicalStudioOpen: activeModal === 'radicalStudio',
      setIsRadicalStudioOpen,
      isStorageManagerOpen: activeModal === 'storageManager',
      setIsStorageManagerOpen,
      isShortcutsModalOpen: activeModal === 'shortcuts',
      setIsShortcutsModalOpen,
      isExportModalOpen: activeModal === 'export',
      setIsExportModalOpen,
      isOpenTypeFeaturesModalOpen: activeModal === 'openTypeFeatures',
      setIsOpenTypeFeaturesModalOpen,
      isGridFittingModalOpen: activeModal === 'gridFitting',
      setIsGridFittingModalOpen,
      isPixelStudioOpen: activeModal === 'pixelStudio',
      setIsPixelStudioOpen,
      isMojikumiStudioOpen: activeModal === 'mojikumi',
      setIsMojikumiStudioOpen,
      isPenPresetsModalOpen: activeModal === 'penPresets',
      setIsPenPresetsModalOpen,
      isAnyModalOpen,
      closeAllModals,
    }),
    [
      activeModal,
      openModal,
      closeModal,
      isModalOpen,
      showRadicals,
      showGridDrawer,
      showMetricsDrawer,
      setIsMobileThemeModalOpen,
      setIsTestModalOpen,
      setIsFontInfoModalOpen,
      setIsTraceModalOpen,
      setIsSvgModalOpen,
      setIsBatchNormalizeModalOpen,
      setIsQualityModalOpen,
      setIsSynthesisModalOpen,
      setIsKerningModalOpen,
      setIsWeightInterpModalOpen,
      setIsGlyphCompareModalOpen,
      setIsRadicalStudioOpen,
      setIsStorageManagerOpen,
      setIsShortcutsModalOpen,
      setIsExportModalOpen,
      setIsOpenTypeFeaturesModalOpen,
      setIsGridFittingModalOpen,
      setIsPixelStudioOpen,
      setIsMojikumiStudioOpen,
      setIsPenPresetsModalOpen,
      isAnyModalOpen,
      closeAllModals,
    ]
  );

  return <ModalContext.Provider value={value}>{children}</ModalContext.Provider>;
}

export function useModalContext() {
  const ctx = useContext(ModalContext);
  if (!ctx) {
    throw new Error('useModalContext must be used within a ModalProvider');
  }
  return ctx;
}
