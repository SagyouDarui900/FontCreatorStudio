import { useCallback, useMemo, useRef } from 'react';
import { useViewportWidth, getResponsiveOverlayFlags } from '../utils/viewportLayout';

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
  const viewportWidth = useViewportWidth();
  const { isGridOverlay, isMetricsOverlay, isRadicalsOverlay } = getResponsiveOverlayFlags(
    viewportWidth,
    showGridDrawer
  );

  const isZenMode = !showGridDrawer && !showMetricsDrawer && !showRadicals;

  // H11: remember the drawer layout before entering Zen mode so leaving
  // it restores exactly what was open, instead of only the grid drawer.
  const preZenLayoutRef = useRef<{
    showGridDrawer: boolean;
    showMetricsDrawer: boolean;
    showRadicals: boolean;
  } | null>(null);

  const toggleZenMode = useCallback(() => {
    if (showGridDrawer || showMetricsDrawer || showRadicals) {
      preZenLayoutRef.current = { showGridDrawer, showMetricsDrawer, showRadicals };
      setShowGridDrawer(false);
      setShowMetricsDrawer(false);
      setShowRadicals(false);
      if (showToast) {
        showToast('全面作図・集中モード（サイドバー収納）', 'info');
      }
    } else {
      const prev = preZenLayoutRef.current;
      preZenLayoutRef.current = null;
      if (prev) {
        setShowGridDrawer(prev.showGridDrawer);
        setShowMetricsDrawer(prev.showMetricsDrawer);
        setShowRadicals(prev.showRadicals);
      } else {
        setShowGridDrawer(true);
      }
      if (showToast) {
        showToast('標準レイアウトに戻しました', 'info');
      }
    }
  }, [showGridDrawer, showMetricsDrawer, showRadicals, setShowGridDrawer, setShowMetricsDrawer, setShowRadicals, showToast]);

  const toggleGridDrawer = useCallback(() => {
    setShowGridDrawer((prev) => {
      const next = !prev;
      if (next && viewportWidth < 1280) {
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
    if (next && viewportWidth < 1280 && showGridDrawer) {
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
    if (next && viewportWidth < 1280 && showGridDrawer) {
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
