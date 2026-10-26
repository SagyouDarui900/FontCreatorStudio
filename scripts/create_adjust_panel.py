with open('src/components/TestPreviewModal.tsx', 'r') as f:
    text = f.read()

# Lines 840 to 1513 is renderSideAdjustPanel
start_idx = text.find('const renderSideAdjustPanel = () => {')
end_idx = text.find('if (!isOpen) return null;')

panel_code = text[start_idx:end_idx].strip()
# remove 'const renderSideAdjustPanel = () => {' and trailing '};'
inner_panel = panel_code[len('const renderSideAdjustPanel = () => {'):-2].strip()

char_adjust_code = f"""import React from 'react';
import {{
  Move,
  RotateCcw,
  Save,
  Lock,
  Unlock,
  ExternalLink,
  Scaling,
  MousePointerClick,
  ChevronDown,
  GripVertical,
  Columns,
  Eye,
  X,
}} from 'lucide-react';
import {{ FontProject, PathContour }} from '../../types';
import {{ TestPreviewModalProps }} from './types';
import {{ TestPreviewState }} from './hooks/useTestPreviewState';
import {{ contourToSvgPathData }} from './previewUtils';

interface CharAdjustPanelProps {{
  state: TestPreviewState;
  props: TestPreviewModalProps;
}}

export const CharAdjustPanel: React.FC<CharAdjustPanelProps> = ({{ state, props }}) => {{
  const {{
    selectedCharInfo,
    setSelectedCharInfo,
    glyphEntries,
    isDocked,
    setIsDocked,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    isSideAdjusterOpen,
    setIsSideAdjusterOpen,
    isLight,
    isMobileScreen,
    mobileTab,
    setMobileTab,
    rightAdjusterWidth,
    floatingPos,
    isDragging,
    adjustDx,
    setAdjustDx,
    adjustDy,
    setAdjustDy,
    adjustScaleX,
    setAdjustScaleX,
    adjustScaleY,
    setAdjustScaleY,
    isAspectLocked,
    setIsAspectLocked,
    showLivePreviewBox,
    setShowLivePreviewBox,
    activeGlyph,
    livePreviewContours,
    handleApplyTransformToGlyph,
    handleAutoCenterGlyph,
    handleJumpToMainEditor,
  }} = state;

  const {{
    project,
    onSelectGlyphForEdit,
    onClose,
  }} = props;

  if (!isSideAdjusterOpen && !isMobileScreen) return null;

{inner_panel}
}};
"""

with open('src/components/testpreview/CharAdjustPanel.tsx', 'w') as f:
    f.write(char_adjust_code)

print("Generated CharAdjustPanel.tsx")
