import { useState, useEffect, useCallback } from 'react';

interface VendorDocument extends Document {
  webkitFullscreenElement?: Element | null;
  mozFullScreenElement?: Element | null;
  msFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void>;
  mozCancelFullScreen?: () => Promise<void>;
  msExitFullscreen?: () => Promise<void>;
}

interface VendorDocumentElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void>;
  mozRequestFullScreen?: () => Promise<void>;
  msRequestFullscreen?: () => Promise<void>;
}

export function useFullscreen(onFallbackZenMode?: () => void, isZenMode?: boolean) {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => {
    if (typeof document === 'undefined') return false;
    const vDoc = document as VendorDocument;
    return !!(
      document.fullscreenElement ||
      vDoc.webkitFullscreenElement ||
      vDoc.mozFullScreenElement ||
      vDoc.msFullscreenElement
    );
  });

  useEffect(() => {
    const vDoc = document as VendorDocument;
    const handleFullscreenChange = () => {
      const isFs = !!(
        document.fullscreenElement ||
        vDoc.webkitFullscreenElement ||
        vDoc.mozFullScreenElement ||
        vDoc.msFullscreenElement
      );
      setIsFullscreen(isFs);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = useCallback(() => {
    const vDoc = document as VendorDocument;
    const isCurrentlyFs = !!(
      document.fullscreenElement ||
      vDoc.webkitFullscreenElement ||
      vDoc.mozFullScreenElement ||
      vDoc.msFullscreenElement
    );

    if (!isCurrentlyFs) {
      const docEl = document.documentElement as VendorDocumentElement;
      const requestFs =
        docEl.requestFullscreen ||
        docEl.webkitRequestFullscreen ||
        docEl.mozRequestFullScreen ||
        docEl.msRequestFullscreen;

      if (requestFs) {
        requestFs.call(docEl).catch(() => {
          if (onFallbackZenMode) {
            onFallbackZenMode();
          }
        });
      } else if (onFallbackZenMode) {
        onFallbackZenMode();
      }
    } else {
      const exitFs =
        vDoc.exitFullscreen ||
        vDoc.webkitExitFullscreen ||
        vDoc.mozCancelFullScreen ||
        vDoc.msExitFullscreen;

      if (exitFs) {
        exitFs.call(vDoc).catch(() => {
          if (onFallbackZenMode && isZenMode) {
            onFallbackZenMode();
          }
        });
      } else if (onFallbackZenMode && isZenMode) {
        onFallbackZenMode();
      }
    }
  }, [onFallbackZenMode, isZenMode]);

  return { isFullscreen, toggleFullscreen };
}
