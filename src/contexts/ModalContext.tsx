import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

export interface ModalContextType {
  // Mobile / drawer
  isMobileThemeModalOpen: boolean;
  setIsMobileThemeModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  showRadicals: boolean;
  setShowRadicals: React.Dispatch<React.SetStateAction<boolean>>;
  showGridDrawer: boolean;
  setShowGridDrawer: React.Dispatch<React.SetStateAction<boolean>>;
  showMetricsDrawer: boolean;
  setShowMetricsDrawer: React.Dispatch<React.SetStateAction<boolean>>;

  // Feature modals
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
  const [isMobileThemeModalOpen, setIsMobileThemeModalOpen] = useState(false);
  const [showRadicals, setShowRadicals] = useState(false);
  const [showGridDrawer, setShowGridDrawer] = useState(() => {
    return typeof window !== 'undefined' ? window.innerWidth >= 1280 : true;
  });
  const [showMetricsDrawer, setShowMetricsDrawer] = useState(false);

  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [isFontInfoModalOpen, setIsFontInfoModalOpen] = useState(false);
  const [isTraceModalOpen, setIsTraceModalOpen] = useState(false);
  const [isSvgModalOpen, setIsSvgModalOpen] = useState(false);
  const [isBatchNormalizeModalOpen, setIsBatchNormalizeModalOpen] = useState(false);
  const [isQualityModalOpen, setIsQualityModalOpen] = useState(false);
  const [isSynthesisModalOpen, setIsSynthesisModalOpen] = useState(false);
  const [isKerningModalOpen, setIsKerningModalOpen] = useState(false);
  const [isWeightInterpModalOpen, setIsWeightInterpModalOpen] = useState(false);
  const [isGlyphCompareModalOpen, setIsGlyphCompareModalOpen] = useState(false);
  const [isRadicalStudioOpen, setIsRadicalStudioOpen] = useState(false);
  const [isStorageManagerOpen, setIsStorageManagerOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isOpenTypeFeaturesModalOpen, setIsOpenTypeFeaturesModalOpen] = useState(false);
  const [isGridFittingModalOpen, setIsGridFittingModalOpen] = useState(false);
  const [isPixelStudioOpen, setIsPixelStudioOpen] = useState(false);
  const [isMojikumiStudioOpen, setIsMojikumiStudioOpen] = useState(false);
  const [isPenPresetsModalOpen, setIsPenPresetsModalOpen] = useState(false);

  const closeAllModals = useCallback(() => {
    setIsMobileThemeModalOpen(false);
    setShowRadicals(false);
    setIsTestModalOpen(false);
    setIsFontInfoModalOpen(false);
    setIsTraceModalOpen(false);
    setIsSvgModalOpen(false);
    setIsBatchNormalizeModalOpen(false);
    setIsQualityModalOpen(false);
    setIsSynthesisModalOpen(false);
    setIsKerningModalOpen(false);
    setIsWeightInterpModalOpen(false);
    setIsGlyphCompareModalOpen(false);
    setIsRadicalStudioOpen(false);
    setIsStorageManagerOpen(false);
    setIsShortcutsModalOpen(false);
    setIsExportModalOpen(false);
    setIsOpenTypeFeaturesModalOpen(false);
    setIsGridFittingModalOpen(false);
    setIsPixelStudioOpen(false);
    setIsMojikumiStudioOpen(false);
    setIsPenPresetsModalOpen(false);
  }, []);

  const isAnyModalOpen = useMemo(() => {
    return (
      isTestModalOpen ||
      isFontInfoModalOpen ||
      isTraceModalOpen ||
      isSvgModalOpen ||
      isBatchNormalizeModalOpen ||
      isQualityModalOpen ||
      isSynthesisModalOpen ||
      isKerningModalOpen ||
      isWeightInterpModalOpen ||
      isGlyphCompareModalOpen ||
      isRadicalStudioOpen ||
      isPenPresetsModalOpen ||
      isShortcutsModalOpen ||
      isStorageManagerOpen ||
      isExportModalOpen ||
      isOpenTypeFeaturesModalOpen ||
      isGridFittingModalOpen ||
      isPixelStudioOpen ||
      isMojikumiStudioOpen
    );
  }, [
    isTestModalOpen,
    isFontInfoModalOpen,
    isTraceModalOpen,
    isSvgModalOpen,
    isBatchNormalizeModalOpen,
    isQualityModalOpen,
    isSynthesisModalOpen,
    isKerningModalOpen,
    isWeightInterpModalOpen,
    isGlyphCompareModalOpen,
    isRadicalStudioOpen,
    isPenPresetsModalOpen,
    isShortcutsModalOpen,
    isStorageManagerOpen,
    isExportModalOpen,
    isOpenTypeFeaturesModalOpen,
    isGridFittingModalOpen,
    isPixelStudioOpen,
    isMojikumiStudioOpen,
  ]);

  const value = useMemo<ModalContextType>(
    () => ({
      isMobileThemeModalOpen,
      setIsMobileThemeModalOpen,
      showRadicals,
      setShowRadicals,
      showGridDrawer,
      setShowGridDrawer,
      showMetricsDrawer,
      setShowMetricsDrawer,
      isTestModalOpen,
      setIsTestModalOpen,
      isFontInfoModalOpen,
      setIsFontInfoModalOpen,
      isTraceModalOpen,
      setIsTraceModalOpen,
      isSvgModalOpen,
      setIsSvgModalOpen,
      isBatchNormalizeModalOpen,
      setIsBatchNormalizeModalOpen,
      isQualityModalOpen,
      setIsQualityModalOpen,
      isSynthesisModalOpen,
      setIsSynthesisModalOpen,
      isKerningModalOpen,
      setIsKerningModalOpen,
      isWeightInterpModalOpen,
      setIsWeightInterpModalOpen,
      isGlyphCompareModalOpen,
      setIsGlyphCompareModalOpen,
      isRadicalStudioOpen,
      setIsRadicalStudioOpen,
      isStorageManagerOpen,
      setIsStorageManagerOpen,
      isShortcutsModalOpen,
      setIsShortcutsModalOpen,
      isExportModalOpen,
      setIsExportModalOpen,
      isOpenTypeFeaturesModalOpen,
      setIsOpenTypeFeaturesModalOpen,
      isGridFittingModalOpen,
      setIsGridFittingModalOpen,
      isPixelStudioOpen,
      setIsPixelStudioOpen,
      isMojikumiStudioOpen,
      setIsMojikumiStudioOpen,
      isPenPresetsModalOpen,
      setIsPenPresetsModalOpen,
      isAnyModalOpen,
      closeAllModals,
    }),
    [
      isMobileThemeModalOpen,
      showRadicals,
      showGridDrawer,
      showMetricsDrawer,
      isTestModalOpen,
      isFontInfoModalOpen,
      isTraceModalOpen,
      isSvgModalOpen,
      isBatchNormalizeModalOpen,
      isQualityModalOpen,
      isSynthesisModalOpen,
      isKerningModalOpen,
      isWeightInterpModalOpen,
      isGlyphCompareModalOpen,
      isRadicalStudioOpen,
      isStorageManagerOpen,
      isShortcutsModalOpen,
      isExportModalOpen,
      isOpenTypeFeaturesModalOpen,
      isGridFittingModalOpen,
      isPixelStudioOpen,
      isMojikumiStudioOpen,
      isPenPresetsModalOpen,
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
