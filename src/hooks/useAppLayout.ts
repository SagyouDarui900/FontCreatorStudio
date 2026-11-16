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
  // Responsive layout tracking with visualViewport support
  const [viewportWidth, setViewportWidth] = useState<number>(() => {
    return typeof window !== 'undefined'
      ? Math.round(window.visualViewport ? window.visualViewport.width : window.innerWidth)
      : 1280;
  });

  useEffect(() => {
    const handleResize = () => {
      const w = window.visualViewport ? window.visualViewport.width : window.innerWidth;
      setViewportWidth(Math.round(w));
    };
    window.addEventListener('resize', handleResize);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
    }
    return () => {
      window.removeEventListener('resize', handleResize);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      }
    };
  }, []);

  // Consistent breakpoints:
  // < 1280: Grid, Metrics, and Radicals act as overlay drawers to protect canvas space on tablets & small laptops (1024-1279px)
  // 1280 - 1439: Grid is inline sidebar; Metrics / Radicals is overlay if Grid is open
  // >= 1440: Both Grid and Metrics / Radicals can be inline simultaneously
  const isGridOverlay = viewportWidth < 1280;
  const isMetricsOverlay = viewportWidth < 1280 || (viewportWidth < 1440 && showGridDrawer);
  const isRadicalsOverlay = viewportWidth < 1280 || (viewportWidth < 1440 && showGridDrawer);

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

  const toggleGridDrawer = useCallback(() => {
    setShowGridDrawer((prev) => {
      const next = !prev;
      if (next && viewportWidth < 640) {
        setShowMetricsDrawer(false);
        setShowRadicals(false);
      }
      return next;
    });
  }, [viewportWidth, setShowGridDrawer, setShowMetricsDrawer, setShowRadicals]);

  const toggleMetricsDrawer = useCallback(() => {
    const next = !showMetricsDrawer;
    // RadicalsDrawer（部首一覧）と MetricsPanel（メトリクス）が右端で重なり合わないよう排他制御
    if (next && showRadicals) {
      setShowRadicals(false);
    }
    if (next && viewportWidth < 640 && showGridDrawer) {
      setShowGridDrawer(false);
    }
    setShowMetricsDrawer(next);
  }, [showMetricsDrawer, showRadicals, showGridDrawer, viewportWidth, setShowMetricsDrawer, setShowRadicals, setShowGridDrawer]);

  const toggleRadicals = useCallback(() => {
    const next = !showRadicals;
    // RadicalsDrawer（部首一覧）と MetricsPanel（メトリクス）が右端で重なり合わないよう排他制御
    if (next && showMetricsDrawer) {
      setShowMetricsDrawer(false);
    }
    if (next && viewportWidth < 640 && showGridDrawer) {
      setShowGridDrawer(false);
    }
    setShowRadicals(next);
  }, [showRadicals, showMetricsDrawer, showGridDrawer, viewportWidth, setShowRadicals, setShowMetricsDrawer, setShowGridDrawer]);

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
    isRadicalsOverlay,
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
