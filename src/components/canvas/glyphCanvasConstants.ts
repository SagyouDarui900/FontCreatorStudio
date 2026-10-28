import { ThemeMode } from '../../utils/theme';

export function getInkColors(theme: ThemeMode, isLight: boolean) {
  let fill = isLight ? '#1f2937' : '#ecfdf5';
  let stroke = isLight ? '#065f46' : '#34d399';

  if (theme === 'sepia') {
    fill = '#2d2217';
    stroke = '#8c673b';
  } else if (theme === 'warm') {
    fill = '#292019';
    stroke = '#ea580c';
  } else if (theme === 'nord') {
    fill = '#eceff4';
    stroke = '#88c0d0';
  } else if (theme === 'monochrome') {
    fill = '#000000';
    stroke = '#000000';
  }

  return { fill, stroke };
}
