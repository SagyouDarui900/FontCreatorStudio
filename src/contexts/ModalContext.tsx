import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useViewportWidth, getResponsiveOverlayFlags } from '../utils/viewportLayout';

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
  // Modal stack & active (top) modal ID state & direct controllers
  modalStack: ModalId[];
  activeModal: ModalId | null;
  openModal: (id: ModalId) => void;
  closeModal: () => void;
  closeModalById: (id: ModalId) => void;
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
  // Ordered stack of open modals (last entry is the topmost active modal)
  const [modalStack, setModalStack] = useState<ModalId[]>([]);
  const activeModal = modalStack.length > 0 ? modalStack[modalStack.length - 1] : null;

  // Independent drawers / side panels
  const [showRadicals, setShowRadicals] = useState(false);
  const [showGridDrawer, setShowGridDrawer] = useState(() => {
    return typeof window !== 'undefined' ? window.innerWidth >= 1280 : false;
  });
  const [showMetricsDrawer, setShowMetricsDrawer] = useState(false);

  const viewportWidth = useViewportWidth();

  // Primary stack controllers
  const openModal = useCallback((id: ModalId) => {
    setModalStack((prev) => {
      if (prev.length > 0 && prev[prev.length - 1] === id) return prev;
      return [...prev.filter((m) => m !== id), id];
    });
  }, []);

  const closeModal = useCallback(() => {
    setModalStack((prev) => (prev.length > 0 ? prev.slice(0, -1) : prev));
  }, []);

  const closeModalById = useCallback((id: ModalId) => {
    setModalStack((prev) => {
      if (!prev.includes(id)) return prev;
      return prev.filter((m) => m !== id);
    });
  }, []);

  const isModalOpen = useCallback((id: ModalId) => modalStack.includes(id), [modalStack]);

  const { isGridOverlay, isMetricsOverlay, isRadicalsOverlay } = getResponsiveOverlayFlags(
    viewportWidth,
    showGridDrawer
  );

  const closeAllModals = useCallback(() => {
    setModalStack([]);
    setShowRadicals(false);
    setShowMetricsDrawer(false);
    if (isGridOverlay) {
      setShowGridDrawer(false);
    }
  }, [isGridOverlay]);

  // Stable setter factory for backward compatibility
  const createModalSetter = useCallback(
    (id: ModalId): React.Dispatch<React.SetStateAction<boolean>> =>
      (action) => {
        setModalStack((curr) => {
          const isCurr = curr.includes(id);
          const next = typeof action === 'function' ? action(isCurr) : action;
          if (next) {
            if (curr.length > 0 && curr[curr.length - 1] === id) return curr;
            return [...curr.filter((m) => m !== id), id];
          }
          return isCurr ? curr.filter((m) => m !== id) : curr;
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

  const isAnyModalOpen =
    modalStack.length > 0 ||
    (showRadicals && isRadicalsOverlay) ||
    (showGridDrawer && isGridOverlay) ||
    (showMetricsDrawer && isMetricsOverlay);

  const value = useMemo<ModalContextType>(
    () => ({
      modalStack,
      activeModal,
      openModal,
      closeModal,
      closeModalById,
      isModalOpen,
      showRadicals,
      setShowRadicals,
      showGridDrawer,
      setShowGridDrawer,
      showMetricsDrawer,
      setShowMetricsDrawer,
      isMobileThemeModalOpen: modalStack.includes('mobileTheme'),
      isTestModalOpen: modalStack.includes('test'),
      isFontInfoModalOpen: modalStack.includes('fontInfo'),
      isTraceModalOpen: modalStack.includes('trace'),
      isSvgModalOpen: modalStack.includes('svg'),
      isBatchNormalizeModalOpen: modalStack.includes('batchNormalize'),
      isQualityModalOpen: modalStack.includes('quality'),
      isSynthesisModalOpen: modalStack.includes('synthesis'),
      isKerningModalOpen: modalStack.includes('kerning'),
      isWeightInterpModalOpen: modalStack.includes('weightInterp'),
      isGlyphCompareModalOpen: modalStack.includes('glyphCompare'),
      isStorageManagerOpen: modalStack.includes('storageManager'),
      isShortcutsModalOpen: modalStack.includes('shortcuts'),
      isExportModalOpen: modalStack.includes('export'),
      isOpenTypeFeaturesModalOpen: modalStack.includes('openTypeFeatures'),
      isGridFittingModalOpen: modalStack.includes('gridFitting'),
      isPixelStudioOpen: modalStack.includes('pixelStudio'),
      isMojikumiStudioOpen: modalStack.includes('mojikumi'),
      isPenPresetsModalOpen: modalStack.includes('penPresets'),
      isJisProgressModalOpen: modalStack.includes('jisProgress'),
      isIvsManagerOpen: modalStack.includes('ivsManager'),
      ...modalSetters,
      isAnyModalOpen,
      closeAllModals,
    }),
    [
      modalStack,
      activeModal,
      openModal,
      closeModal,
      closeModalById,
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
