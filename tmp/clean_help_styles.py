import re

def clean_shortcuts_modal():
    path = 'src/components/ShortcutsHelpModal.tsx'
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()

    # Remove rounded classes (except we will put rounded-sm on the search input)
    c = re.sub(r'\brounded-2xl\b', '', c)
    c = re.sub(r'\brounded-xl\b', '', c)
    c = re.sub(r'\brounded-lg\b', '', c)
    c = re.sub(r'\brounded-full\b', '', c)
    c = re.sub(r'\brounded\b', '', c)
    c = re.sub(r'\bshadow-xs\b', '', c)
    c = re.sub(r'\bshadow-sm\b', '', c)
    c = re.sub(r'\bshadow-md\b', '', c)
    c = re.sub(r'\bshadow-lg\b', '', c)
    c = re.sub(r'\bshadow-xl\b', '', c)
    c = re.sub(r'\btransition-all\b', 'transition-colors', c)

    # Ensure search input has rounded-sm comment
    input_search = 'placeholder="ショートカットや機能を検索（例: ブラシ, 移動, 保存, 拡大）..."'
    if input_search in c:
        c = c.replace(
            'placeholder="ショートカットや機能を検索（例: ブラシ, 移動, 保存, 拡大）..."\n className={`w-full pl-9 pr-3 py-2 border text-xs outline-none transition-colors ${',
            'placeholder="ショートカットや機能を検索（例: ブラシ, 移動, 保存, 拡大）..."\n className={`w-full pl-9 pr-3 py-2 rounded-sm /* 入力のみ最大rounded-sm */ border text-xs outline-none transition-colors ${'
        )

    # Tone down boastful phrasing in FAQ 6
    c = c.replace(
        '局所サブセットブーリアン結合（Localized Subset Union）と幾何キャッシュが導入され、画数が増えても描画遅延が極小化されています。',
        '幾何演算の最適化とキャッシュにより、画数が多い文字でも安定して描画できるよう調整されています。'
    )

    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    print('Updated ShortcutsHelpModal.tsx')

def clean_beginner_tutorial():
    path = 'src/components/help/BeginnerTutorialTab.tsx'
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()

    # Remove rounded classes & shadows
    c = re.sub(r'\brounded-2xl\b', '', c)
    c = re.sub(r'\brounded-xl\b', '', c)
    c = re.sub(r'\brounded-lg\b', '', c)
    c = re.sub(r'\brounded-full\b', '', c)
    c = re.sub(r'\brounded\b', '', c)
    c = re.sub(r'\bshadow-xs\b', '', c)
    c = re.sub(r'\bshadow-sm\b', '', c)

    # Tone down "無料" pill badge and welcome card
    c = c.replace(
        '<span className="text-[10px] px-2 py-0.5  font-bold bg-emerald-600 text-white">\n              無料\n            </span>',
        '<span className="text-[10px] px-1.5 py-0.5 font-mono text-emerald-700 dark:text-emerald-300 border border-emerald-500/40">\n              ガイド\n            </span>'
    )

    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    print('Updated BeginnerTutorialTab.tsx')

def clean_glossary():
    path = 'src/components/help/GlossaryTab.tsx'
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()

    c = re.sub(r'\brounded-2xl\b', '', c)
    c = re.sub(r'\brounded-xl\b', '', c)
    c = re.sub(r'\brounded-lg\b', '', c)
    c = re.sub(r'\brounded-full\b', '', c)
    c = re.sub(r'\brounded-xs\b', '', c)
    c = re.sub(r'\brounded\b', '', c)
    c = re.sub(r'\bshadow-xs\b', '', c)
    c = re.sub(r'\bshadow-sm\b', '', c)
    c = re.sub(r'\btransition-all\b', 'transition-colors', c)

    # Ensure search input has rounded-sm comment
    c = c.replace(
        'placeholder="用語を検索（例: グリフ, 余白, ベジェ, TTF, 単純化）..."\n            className={`w-full pl-9 pr-3 py-2  border text-xs outline-none transition-colors ${',
        'placeholder="用語を検索（例: グリフ, 余白, ベジェ, TTF, 単純化）..."\n            className={`w-full pl-9 pr-3 py-2 rounded-sm /* 入力のみ最大rounded-sm */ border text-xs outline-none transition-colors ${'
    )

    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    print('Updated GlossaryTab.tsx')

clean_shortcuts_modal()
clean_beginner_tutorial()
clean_glossary()
