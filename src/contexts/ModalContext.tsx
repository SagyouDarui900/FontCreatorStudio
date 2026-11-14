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
  isJisProgressModalOpen: boolean;
  setIsJisProgressModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isIvsManagerOpen: boolean;
  setIsIvsManagerOpen: React.Dispatch<React.SetStateAction<boolean>>;

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

  // Stable setter factory for backward compatibility
  const createModalSetter = useCallback(
    (id: ModalId): React.Dispatch<React.SetStateAction<boolean>> =>
      (action) => {
        setActiveModal((curr) => {
          const isCurr = curr === id;
          const next = typeof action === 'function' ? action(isCurr) : action;
          return next ? id : curr === id ? null : curr;
        });
      },
    []
  );

  const modalSetters = useMemo(
    () => ({
      setIsMobileThemeModalOpen: createModalSetter('mobileTheme'),
      setIsTestModalOpen: createModalSetter('test'),
      setIsFontInfoModalOpen: createModalSetter('fontInfo'),
      setIsTraceModalOpen: createModalSetter('trace'),
      setIsSvgModalOpen: createModalSetter('svg'),
      setIsBatchNormalizeModalOpen: createModalSetter('batchNormalize'),
      setIsQualityModalOpen: createModalSetter('quality'),
      setIsSynthesisModalOpen: createModalSetter('synthesis'),
      setIsKerningModalOpen: createModalSetter('kerning'),
      setIsWeightInterpModalOpen: createModalSetter('weightInterp'),
      setIsGlyphCompareModalOpen: createModalSetter('glyphCompare'),
      setIsRadicalStudioOpen: createModalSetter('radicalStudio'),
      setIsStorageManagerOpen: createModalSetter('storageManager'),
      setIsShortcutsModalOpen: createModalSetter('shortcuts'),
      setIsExportModalOpen: createModalSetter('export'),
      setIsOpenTypeFeaturesModalOpen: createModalSetter('openTypeFeatures'),
      setIsGridFittingModalOpen: createModalSetter('gridFitting'),
      setIsPixelStudioOpen: createModalSetter('pixelStudio'),
      setIsMojikumiStudioOpen: createModalSetter('mojikumi'),
      setIsPenPresetsModalOpen: createModalSetter('penPresets'),
      setIsJisProgressModalOpen: createModalSetter('jisProgress'),
      setIsIvsManagerOpen: createModalSetter('ivsManager'),
    }),
    [createModalSetter]
  );

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
      isTestModalOpen: activeModal === 'test',
      isFontInfoModalOpen: activeModal === 'fontInfo',
      isTraceModalOpen: activeModal === 'trace',
      isSvgModalOpen: activeModal === 'svg',
      isBatchNormalizeModalOpen: activeModal === 'batchNormalize',
      isQualityModalOpen: activeModal === 'quality',
      isSynthesisModalOpen: activeModal === 'synthesis',
      isKerningModalOpen: activeModal === 'kerning',
      isWeightInterpModalOpen: activeModal === 'weightInterp',
      isGlyphCompareModalOpen: activeModal === 'glyphCompare',
      isRadicalStudioOpen: activeModal === 'radicalStudio',
      isStorageManagerOpen: activeModal === 'storageManager',
      isShortcutsModalOpen: activeModal === 'shortcuts',
      isExportModalOpen: activeModal === 'export',
      isOpenTypeFeaturesModalOpen: activeModal === 'openTypeFeatures',
      isGridFittingModalOpen: activeModal === 'gridFitting',
      isPixelStudioOpen: activeModal === 'pixelStudio',
      isMojikumiStudioOpen: activeModal === 'mojikumi',
      isPenPresetsModalOpen: activeModal === 'penPresets',
      isJisProgressModalOpen: activeModal === 'jisProgress',
      isIvsManagerOpen: activeModal === 'ivsManager',
      ...modalSetters,
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
      modalSetters,
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
