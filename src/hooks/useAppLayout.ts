import { useState, useEffect, useCallback, useMemo } from 'react';

export interface UseAppLayoutOptions {
  showGridDrawer: boolean;
  setShowGridDrawer: (val: boolean | ((prev: boolean) => boolean)) => void;
  showMetricsDrawer: boolean;
  setShowMetricsDrawer: (val: boolean | ((prev: boolean) => boolean)) => void;
  showRadicals: boolean;
  setShowRadicals: (val: boolean | ((prev: boolean) => boolean)) => void;
  showToast?: (text: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export type MobileTab = 'canvas' | 'grid' | 'metrics' | 'radicals';

export function useAppLayout({
  showGridDrawer,
  setShowGridDrawer,
  showMetricsDrawer,
  setShowMetricsDrawer,
  showRadicals,
  setShowRadicals,
  showToast,
}: UseAppLayoutOptions) {
  // Responsive layout tracking
  const [viewportWidth, setViewportWidth] = useState<number>(() => {
    return typeof window !== 'undefined' ? window.innerWidth : 1280;
  });

  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isGridOverlay = viewportWidth < 1024;
  const isMetricsOverlay = viewportWidth < 1280 || (viewportWidth < 1440 && showGridDrawer);

  const isZenMode = !showGridDrawer && !showMetricsDrawer && !showRadicals;

  const toggleZenMode = useCallback(() => {
    if (showGridDrawer || showMetricsDrawer || showRadicals) {
      setShowGridDrawer(false);
      setShowMetricsDrawer(false);
      setShowRadicals(false);
      if (showToast) {
        showToast('全面作図・集中モード（サイドバー収納）', 'info');
      }
    } else {
      setShowGridDrawer(true);
      if (showToast) {
        showToast('標準レイアウトに戻しました', 'info');
      }
    }
  }, [showGridDrawer, showMetricsDrawer, showRadicals, setShowGridDrawer, setShowMetricsDrawer, setShowRadicals, showToast]);

  const toggleGridDrawer = useCallback(() => setShowGridDrawer((prev) => !prev), [setShowGridDrawer]);
  const toggleMetricsDrawer = useCallback(() => setShowMetricsDrawer((prev) => !prev), [setShowMetricsDrawer]);
  const toggleRadicals = useCallback(() => setShowRadicals((prev) => !prev), [setShowRadicals]);

  const handleCloseGridDrawer = useCallback(() => setShowGridDrawer(false), [setShowGridDrawer]);
  const handleCloseMetricsDrawer = useCallback(() => setShowMetricsDrawer(false), [setShowMetricsDrawer]);
  const handleCloseRadicalsDrawer = useCallback(() => setShowRadicals(false), [setShowRadicals]);

  // Mobile Tab switching logic
  const mobileActiveTab = useMemo<MobileTab>(() => {
    if (showGridDrawer) return 'grid';
    if (showMetricsDrawer) return 'metrics';
    if (showRadicals) return 'radicals';
    return 'canvas';
  }, [showGridDrawer, showMetricsDrawer, showRadicals]);

  const handleSwitchMobileTab = useCallback(
    (tab: MobileTab) => {
      if (tab === 'canvas') {
        setShowGridDrawer(false);
        setShowMetricsDrawer(false);
        setShowRadicals(false);
      } else if (tab === 'grid') {
        setShowGridDrawer(true);
        setShowMetricsDrawer(false);
        setShowRadicals(false);
      } else if (tab === 'metrics') {
        setShowMetricsDrawer(true);
        setShowGridDrawer(false);
        setShowRadicals(false);
      } else if (tab === 'radicals') {
        setShowRadicals(true);
        setShowGridDrawer(false);
        setShowMetricsDrawer(false);
      }
    },
    [setShowGridDrawer, setShowMetricsDrawer, setShowRadicals]
  );

  return {
    viewportWidth,
    isGridOverlay,
    isMetricsOverlay,
    isZenMode,
    toggleZenMode,
    toggleGridDrawer,
    toggleMetricsDrawer,
    toggleRadicals,
    handleCloseGridDrawer,
    handleCloseMetricsDrawer,
    handleCloseRadicalsDrawer,
    mobileActiveTab,
    handleSwitchMobileTab,
  };
}
