/**
 * Platform detection helpers.
 *
 * iPadOS 13+ Safari reports a Macintosh user agent, so a plain
 * /iphone|ipad|ipod/ test misses iPad. A Macintosh user agent combined
 * with touch support (navigator.maxTouchPoints > 1) identifies iPadOS.
 * navigator.userAgentData.platform is checked first where available.
 */

type NavigatorWithUserAgentData = Navigator & {
  userAgentData?: { platform?: string };
};

function getUserAgentDataPlatform(): string | undefined {
  if (typeof navigator === 'undefined') return undefined;
  return (navigator as NavigatorWithUserAgentData).userAgentData?.platform;
}

/** True for iPad, including iPadOS 13+ Safari with a Macintosh user agent. */
export function isIPadOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  if (getUserAgentDataPlatform() === 'iPadOS') return true;
  return (
    /ipad/i.test(navigator.userAgent) ||
    (/macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
  );
}

/** True for iPhone, iPod, and iPad (including iPadOS 13+ Safari). */
export function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const platform = getUserAgentDataPlatform();
  if (platform === 'iOS' || platform === 'iPadOS') return true;
  return /iphone|ipod/i.test(navigator.userAgent) || isIPadOS();
}

/**
 * True for macOS and for iOS / iPadOS devices.
 * /mac/ matches "Macintosh" (macOS and iPadOS 13+ Safari), so an iPad is
 * treated as a Mac here: an external keyboard's Cmd key is the modifier
 * key on iPadOS. This preserves the previous
 * /mac|iphone|ipad|ipod/ test used by useAppShortcuts.
 */
export function isMacDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  if (getUserAgentDataPlatform() === 'macOS') return true;
  return /mac/i.test(navigator.userAgent) || isIOSDevice();
}
