// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { ModalShell } from './ModalShell';
import { ModalSection } from './ModalSection';
import { ModalAlert } from './ModalAlert';
import { SliderRow } from './SliderRow';
import { ModalTabs } from './ModalTabs';
import { ModalFooter } from './ModalFooter';
import { ToolMenuCard } from './ToolMenuCard';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

function render(node: React.ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);
  act(() => {
    root.render(node);
  });
  return {
    container,
    cleanup: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe('ModalShell', () => {
  it('renders title, subtitle and dialog role with the default max width', () => {
    const { container, cleanup } = render(
      <ModalShell title="フォント出力" subtitle="説明文" onClose={vi.fn()}>
        本体
      </ModalShell>
    );
    const dialog = container.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-label')).toBe('フォント出力');
    expect(dialog.textContent).toContain('フォント出力');
    expect(dialog.textContent).toContain('説明文');
    expect(dialog.textContent).toContain('本体');
    expect(dialog.className).toContain('sm:max-w-5xl');
    expect(dialog.className).toContain('h-[100dvh]');
    expect(dialog.className).toContain('sm:max-h-[92vh]');
    expect(dialog.className).toContain('rounded-none sm:rounded-2xl');
    cleanup();
  });

  it('switches max width via props and hides the fullscreen button without onToggleFullscreen', () => {
    const { container, cleanup } = render(
      <ModalShell title="テスト" maxWidth="3xl" onClose={vi.fn()}>
        本体
      </ModalShell>
    );
    const dialog = container.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog.className).toContain('sm:max-w-3xl');
    expect(container.querySelector('button[title="全画面表示に拡大 (F)"]')).toBeNull();
    cleanup();

    const wide = render(
      <ModalShell title="テスト" maxWidth="7xl" onClose={vi.fn()}>
        本体
      </ModalShell>
    );
    const wideDialog = wide.container.querySelector('[role="dialog"]') as HTMLElement;
    expect(wideDialog.className).toContain('sm:max-w-7xl');
    wide.cleanup();
  });

  it('uses the fullscreen frame and shows the fullscreen toggle when provided', () => {
    const onToggle = vi.fn();
    const onClose = vi.fn();
    const { container, cleanup } = render(
      <ModalShell
        title="テスト"
        isFullscreen
        onToggleFullscreen={onToggle}
        onClose={onClose}
      >
        本体
      </ModalShell>
    );
    const dialog = container.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog.className).toContain('w-screen h-[100dvh]');
    expect(dialog.className).not.toContain('sm:max-w-5xl');
    expect(container.textContent).toContain('全画面');
    const toggle = container.querySelector(
      'button[title="通常表示に戻す (F または Esc)"]'
    ) as HTMLButtonElement;
    act(() => {
      toggle.click();
    });
    expect(onToggle).toHaveBeenCalledTimes(1);
    const close = container.querySelector('button[aria-label="閉じる"]') as HTMLButtonElement;
    expect(close.className).toContain('min-w-[40px]');
    expect(close.className).toContain('min-h-[40px]');
    act(() => {
      close.click();
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it('renders the footer node as given', () => {
    const { container, cleanup } = render(
      <ModalShell
        title="テスト"
        onClose={vi.fn()}
        footer={<ModalFooter primaryLabel="実行" onPrimary={vi.fn()} />}
      >
        本体
      </ModalShell>
    );
    expect(container.textContent).toContain('実行');
    cleanup();
  });
});

describe('ModalSection', () => {
  it('renders a text-xs bold heading and a p-3 card', () => {
    const { container, cleanup } = render(
      <ModalSection title="ファイル形式">中身</ModalSection>
    );
    const heading = container.querySelector('h3') as HTMLElement;
    expect(heading.textContent).toBe('ファイル形式');
    expect(heading.className).toContain('text-xs');
    expect(heading.className).toContain('font-bold');
    const card = heading.nextElementSibling as HTMLElement;
    expect(card.className).toContain('p-3');
    expect(card.className).toContain('rounded-xl');
    expect(card.textContent).toBe('中身');
    cleanup();
  });

  it('renders a circled step number and the sm padding variant', () => {
    const { container, cleanup } = render(
      <ModalSection title="処理対象" step={1} padding="sm">
        中身
      </ModalSection>
    );
    expect(container.querySelector('h3')?.textContent).toContain('①');
    const card = container.querySelector('h3')?.nextElementSibling as HTMLElement;
    expect(card.className).toContain('p-2.5');
    expect(card.className).not.toContain('p-3');
    cleanup();
  });
});

describe('ModalAlert', () => {
  it.each([
    ['error', 'rose'],
    ['warning', 'amber'],
    ['info', 'emerald'],
    ['success', 'emerald'],
  ] as const)('tone %s renders its title with the %s colour family', (tone, colour) => {
    const { container, cleanup } = render(
      <ModalAlert tone={tone} title="注意">
        本文
      </ModalAlert>
    );
    const box = container.querySelector('div.p-3') as HTMLElement;
    expect(box.className).toContain(`bg-${colour}-`);
    expect(box.textContent).toContain('注意');
    expect(box.textContent).toContain('本文');
    cleanup();
  });

  it('renders items as a list and marks errors with role=alert', () => {
    const { container, cleanup } = render(
      <ModalAlert tone="error" title="出力できません" items={['グリフがありません', '名前が未設定です']} />
    );
    const box = container.querySelector('[role="alert"]') as HTMLElement;
    expect(box).not.toBeNull();
    const items = container.querySelectorAll('li');
    expect(items).toHaveLength(2);
    expect(items[1].textContent).toBe('名前が未設定です');
    cleanup();
  });
});

describe('SliderRow', () => {
  it('renders label, value badge and an emerald-600 slider', () => {
    const { container, cleanup } = render(
      <SliderRow label="線の太さ" value={42} min={0} max={100} unit="%" onChange={vi.fn()} />
    );
    expect(container.textContent).toContain('線の太さ');
    expect(container.textContent).toContain('42%');
    const slider = container.querySelector('input[type="range"]') as HTMLInputElement;
    expect(slider.className).toContain('accent-emerald-600');
    expect(slider.value).toBe('42');
    const badge = slider.closest('div')?.previousElementSibling?.querySelector('span');
    expect(badge?.className).toContain('min-w-[64px]');
    expect(badge?.className).toContain('font-mono');
    cleanup();
  });

  it('calls onChange from the slider and from the number input when shown', () => {
    const onChange = vi.fn();
    const { container, cleanup } = render(
      <SliderRow
        label="線の太さ"
        value={42}
        min={0}
        max={100}
        onChange={onChange}
        showNumberInput
      />
    );
    // Set values through the native setter so React's input value tracker
    // sees the change (direct property assignment is ignored by React).
    const nativeValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    )?.set as (this: HTMLInputElement, value: string) => void;
    const slider = container.querySelector('input[type="range"]') as HTMLInputElement;
    act(() => {
      nativeValueSetter.call(slider, '55');
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(onChange).toHaveBeenCalledWith(55);
    const numberInput = container.querySelector('input[type="number"]') as HTMLInputElement;
    expect(numberInput).not.toBeNull();
    expect(numberInput.value).toBe('42');
    act(() => {
      nativeValueSetter.call(numberInput, '60');
      numberInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(onChange).toHaveBeenCalledWith(60);
    cleanup();
  });
});

describe('ModalTabs', () => {
  const tabs = [
    { id: 'vert', label: '縦書き', shortLabel: '縦書', count: 3 },
    { id: 'liga', label: '合字', count: 12 },
  ];

  it('renders tabs with counts and switches on click', () => {
    const onChange = vi.fn();
    const { container, cleanup } = render(
      <ModalTabs tabs={tabs} activeId="vert" onChange={onChange} />
    );
    const buttons = container.querySelectorAll('[role="tab"]');
    expect(buttons).toHaveLength(2);
    expect(buttons[0].getAttribute('aria-selected')).toBe('true');
    expect(buttons[1].getAttribute('aria-selected')).toBe('false');
    expect(buttons[0].textContent).toContain('3');
    expect(buttons[1].textContent).toContain('12');
    act(() => {
      (buttons[1] as HTMLButtonElement).click();
    });
    expect(onChange).toHaveBeenCalledWith('liga');
    cleanup();
  });

  it('shows the short label on mobile and the full label on desktop', () => {
    const { container, cleanup } = render(
      <ModalTabs tabs={tabs} activeId="vert" onChange={vi.fn()} />
    );
    const first = container.querySelector('[role="tab"]') as HTMLElement;
    const mobileLabel = first.querySelector('span.sm\\:hidden') as HTMLElement;
    const desktopLabel = first.querySelector('span.hidden.sm\\:inline') as HTMLElement;
    expect(mobileLabel.textContent).toBe('縦書');
    expect(desktopLabel.textContent).toBe('縦書き');
    cleanup();
  });
});

describe('ModalFooter', () => {
  it('places cancel on the left and the primary button on the right, and calls both handlers', () => {
    const onCancel = vi.fn();
    const onPrimary = vi.fn();
    const { container, cleanup } = render(
      <ModalFooter
        primaryLabel="ダウンロード"
        onPrimary={onPrimary}
        onCancel={onCancel}
        leftInfo={<span>3文字</span>}
      />
    );
    const buttons = container.querySelectorAll('button');
    expect(buttons[0].textContent).toBe('キャンセル');
    expect(buttons[1].textContent).toBe('ダウンロード');
    expect(container.textContent).toContain('3文字');
    act(() => {
      buttons[0].click();
      buttons[1].click();
    });
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onPrimary).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it('omits the cancel button without onCancel and disables the primary button', () => {
    const { container, cleanup } = render(
      <ModalFooter primaryLabel="実行" onPrimary={vi.fn()} primaryDisabled />
    );
    const buttons = container.querySelectorAll('button');
    expect(buttons).toHaveLength(1);
    expect((buttons[0] as HTMLButtonElement).disabled).toBe(true);
    expect(buttons[0].className).toContain('bg-emerald-600');
    cleanup();
  });
});

describe('ToolMenuCard', () => {
  it('renders the full title without truncation and the description with jp-wrap', () => {
    const onClick = vi.fn();
    const { container, cleanup } = render(
      <ToolMenuCard
        icon={<span>◆</span>}
        title="下絵トレース"
        description="手書きノートや画像からの輪郭抽出"
        onClick={onClick}
      />
    );
    const card = container.querySelector('button') as HTMLButtonElement;
    expect(card.className).toContain('h-full');
    expect(card.className).not.toContain('truncate');
    const title = card.querySelector('div.text-xs') as HTMLElement;
    expect(title.textContent).toBe('下絵トレース');
    expect(title.className).not.toContain('truncate');
    const desc = card.querySelector('div.jp-wrap') as HTMLElement;
    expect(desc.textContent).toBe('手書きノートや画像からの輪郭抽出');
    act(() => {
      card.click();
    });
    expect(onClick).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it('spans two columns when span=2', () => {
    const { container, cleanup } = render(
      <ToolMenuCard
        icon={<span>◆</span>}
        title="SVGインポート"
        description="ベクター画像のパス取り込み"
        onClick={vi.fn()}
        span={2}
      />
    );
    const card = container.querySelector('button') as HTMLButtonElement;
    expect(card.className).toContain('sm:col-span-2');
    cleanup();
  });
});
