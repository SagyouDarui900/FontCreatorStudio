/**
 * モーダル共通部品（監査 2026-11-27 (d) の共通化の提案による）。
 * ModalStackFrame（フォーカストラップ / Escape）と組み合わせて使う。
 * 各部品の使い方の詳細は、それぞれのファイル先頭のコメントを参照。
 */
export { ModalShell, type ModalShellProps, type ModalMaxWidth } from './ModalShell';
export { ModalSection, type ModalSectionProps } from './ModalSection';
export { ModalAlert, type ModalAlertProps, type ModalAlertTone } from './ModalAlert';
export { SliderRow, type SliderRowProps } from './SliderRow';
export { ModalTabs, type ModalTabsProps, type ModalTabItem } from './ModalTabs';
export { ModalFooter, type ModalFooterProps } from './ModalFooter';
export { ToolMenuCard, type ToolMenuCardProps, type ToolMenuAccent } from './ToolMenuCard';
