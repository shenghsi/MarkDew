export type LanguageCode = 'en' | 'zh-CN';
export type LanguageChoice = 'en' | 'zh-CN' | 'system';

export const LANGUAGE_STORAGE_KEY = 'markdew.language';

export function resolveLanguage(choice: LanguageChoice): LanguageCode {
  if (choice === 'zh-CN' || choice === 'en') return choice;
  if (typeof navigator !== 'undefined' && typeof navigator.language === 'string') {
    if (navigator.language.toLowerCase().startsWith('zh')) return 'zh-CN';
  }
  return 'en';
}

export function getLanguagePreference(storage: Storage = localStorage): LanguageChoice {
  try {
    const saved = storage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved === 'en' || saved === 'zh-CN' || saved === 'system') return saved;
  } catch {}
  return 'system';
}

export function getCurrentLanguage(storage: Storage = localStorage): LanguageCode {
  return resolveLanguage(getLanguagePreference(storage));
}

type Listener = (lang: LanguageCode) => void;
const listeners = new Set<Listener>();

export function setLanguagePreference(choice: LanguageChoice, storage: Storage = localStorage): void {
  try {
    storage.setItem(LANGUAGE_STORAGE_KEY, choice);
  } catch {}
  const resolved = resolveLanguage(choice);
  for (const listener of listeners) {
    listener(resolved);
  }
}

export function subscribeLanguageChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const translations = {
  en: {
    // Categories
    'cat.files': 'Files',
    'cat.editor': 'Editor',
    'cat.image': 'Image',
    'cat.markdown': 'Markdown',
    'cat.export': 'Export',
    'cat.appearance': 'Appearance',
    'cat.general': 'General',

    // General
    'general.language': 'Language',
    'general.lang_hint': '(applied immediately)',
    'general.update': 'Update',
    'general.check_updates': 'Check Updates',
    'general.auto_check_updates': 'Check for updates automatically',
    'general.auto_update_notice': 'MarkDew {v} is available.',
    'general.checking_updates': 'Checking for updates...',
    'general.up_to_date': 'MarkDew is up to date.',
    'general.update_available': 'Update available: Version {v}',
    'general.download_update': 'Download Update',
    'general.install_update': 'Update and Restart',
    'general.downloading_update': 'Downloading update...',
    'general.installing_update': 'Installing update. Enter your password if the system asks for it.',
    'general.check_failed': 'Cannot check for updates. Check your network connection.',
    'general.license': 'Registration / Activation',
    'general.license_desc': 'MarkDew is open-source under GNU AGPLv3 and commercial license terms.',
    'general.detail': 'Detail',
    'general.dialogs': 'Dialogs',
    'general.restore_defaults': 'Restore Default Settings',

    // Appearance
    'appearance.theme': 'Theme',
    'appearance.theme_system': 'System',
    'appearance.theme_light': 'Light',
    'appearance.theme_dark': 'Dark',
    'appearance.line_width': 'Editor Max Line Width',
    'appearance.line_width_desc': 'Set the maximum content width for the editor canvas.',
    'appearance.preset_compact': 'Compact',
    'appearance.preset_standard': 'Standard',
    'appearance.preset_wide': 'Wide',
    'appearance.preset_extra_wide': 'Extra Wide',
    'appearance.preset_full': 'Full Width',
    'appearance.writing_size': 'Writing Size',
    'appearance.writing_size_desc': 'Scale font size of the editing surface and preview elements.',
    'appearance.group_editor': 'Editor',
    'appearance.diagram': 'Mermaid Diagram',
    'appearance.diagram_colors': 'Colors',
    'appearance.diagram_text': 'Text',
    'appearance.diagram_shape': 'Shape and size',
    'appearance.diagram_desc': 'Style Mermaid diagrams in the preview and in print. Changes apply to open diagrams at once.',
    'appearance.diagram_palette': 'Color palette',
    'appearance.diagram_palette_app': 'Follow theme',
    'appearance.diagram_palette_classic': 'Classic (light)',
    'appearance.diagram_palette_warm': 'Warm',
    'appearance.diagram_palette_cool': 'Cool',
    'appearance.diagram_font': 'Font',
    'appearance.diagram_font_sans': 'Sans-serif',
    'appearance.diagram_font_serif': 'Serif',
    'appearance.diagram_font_mono': 'Monospace',
    'appearance.diagram_font_size': 'Font size',
    'appearance.diagram_radius': 'Corner radius',
    'appearance.diagram_radius_square': 'Square',
    'appearance.diagram_radius_default': 'Default',
    'appearance.diagram_radius_round': 'Rounded',
    'appearance.diagram_padding': 'Padding',
    'appearance.diagram_padding_compact': 'Compact',
    'appearance.diagram_padding_default': 'Default',
    'appearance.diagram_padding_roomy': 'Roomy',
    'appearance.diagram_max_height': 'Maximum height',
    'appearance.diagram_no_limit': 'No limit',

    // Image
    'image.pasted': 'Pasted images',
    'image.dropped': 'Dropped images',
    'image.desc': 'Configure how local images are transferred into documents.',
    'image.embed': 'Embed in Markdown',
    'image.link': 'Link original',
    'image.copy': 'Copy beside document',

    // Files
    'files.startup_sidebar': 'Startup Sidebar',
    'files.sidebar_desc': 'Select which pane opens by default in the sidebar.',
    'files.sidebar_files': 'Files Tree',
    'files.sidebar_outline': 'Outline',
    'files.sidebar_hidden': 'Hidden',

    // Empty state
    'empty.notice': 'No configuration options are available for this category yet.',
    'empty.sub': 'More options will be added in upcoming releases.',

    // Sidebar Context Menu
    'sidebar.new_file': 'New File',
    'sidebar.rename': 'Rename',
    'sidebar.delete': 'Delete',
    'sidebar.confirm_delete': 'Are you sure you want to delete "{name}"?',
    'sidebar.title_files': 'FILES',
    'sidebar.title_outline': 'OUTLINE',

    // Table Context Menu
    'table.row_above': 'Add Row Above',
    'table.row_below': 'Add Row Below',
    'table.column_before': 'Add Column Before',
    'table.column_after': 'Add Column After',
    'table.delete_row': 'Delete Row',
    'table.delete_column': 'Delete Column',
    'table.copy_table': 'Copy Table',
    'table.prettify_source': 'Prettify Source Code',
    'table.delete_table': 'Delete Table',

    // Toolbar / Document Bar / Format Bar
    'toolbar.files': 'Files',
    'toolbar.toggle_sidebar': 'Toggle Sidebar',
    'toolbar.outline': 'Outline',
    'toolbar.tools': 'Tools',
    'toolbar.source_mode': 'Source Code Mode',
    'toolbar.print': 'Print / PDF',
    'toolbar.close_document': 'Close document',
    'toolbar.code_block': 'Code Block',
    'toolbar.table': 'Table',
    'toolbar.image': 'Image',
    'toolbar.footnote': 'Footnote',
    'toolbar.goto_footnote': 'Go to Footnote',
    'toolbar.new': 'New',
    'toolbar.open': 'Open',
    'toolbar.save': 'Save',
    'toolbar.save_as': 'Save As',
    'toolbar.undo': 'Undo',
    'toolbar.redo': 'Redo',
    'toolbar.find': 'Find',
    'toolbar.check_save': 'Check Save',

    // Common
    'search.placeholder': 'Search...',
    'search.find': 'Find',
    'search.replace': 'Replace',
    'search.replace_all': 'Replace All',
    'search.match_case': 'Match Case',
    'search.whole_word': 'Match Whole Word',
    'search.regexp': 'Regular Expression',
    'search.prev': 'Previous Match',
    'search.next': 'Next Match',
    'search.close': 'Close',
    'btn.done': 'Done',
    'btn.close': 'Close',
    'title.settings': 'Settings',
  },
  'zh-CN': {
    // Categories
    'cat.files': '文件',
    'cat.editor': '编辑器',
    'cat.image': '图像',
    'cat.markdown': 'Markdown',
    'cat.export': '导出',
    'cat.appearance': '外观',
    'cat.general': '通用',

    // General
    'general.language': '语言',
    'general.lang_hint': '(立即生效)',
    'general.update': '软件更新',
    'general.check_updates': '检查更新',
    'general.auto_check_updates': '自动检查更新',
    'general.auto_update_notice': 'MarkDew {v} 已发布。',
    'general.checking_updates': '正在检查更新...',
    'general.up_to_date': 'MarkDew 已是最新版本。',
    'general.update_available': '发现新版本：版本 {v}',
    'general.download_update': '下载更新',
    'general.install_update': '更新并重新启动',
    'general.downloading_update': '正在下载更新…',
    'general.installing_update': '正在安装更新。如果系统要求，请输入密码。',
    'general.check_failed': '无法检查更新，请检查网络连接。',
    'general.license': '授权与激活',
    'general.license_desc': 'MarkDew 基于 GNU AGPLv3 开源协议与商业许可证双重授权。',
    'general.detail': '详情',
    'general.dialogs': '对话框',
    'general.restore_defaults': '恢复默认设置',

    // Appearance
    'appearance.theme': '主题',
    'appearance.theme_system': '跟随系统',
    'appearance.theme_light': '浅色',
    'appearance.theme_dark': '深色',
    'appearance.line_width': '编辑器最大行宽',
    'appearance.line_width_desc': '设置编辑器正文的最大显示宽度。',
    'appearance.preset_compact': '紧凑',
    'appearance.preset_standard': '标准',
    'appearance.preset_wide': '较宽',
    'appearance.preset_extra_wide': '超宽',
    'appearance.preset_full': '全宽',
    'appearance.writing_size': '显示缩放',
    'appearance.writing_size_desc': '缩放编辑区域与预览元素的文字大小。',
    'appearance.group_editor': '编辑器',
    'appearance.diagram': 'Mermaid 图表',
    'appearance.diagram_colors': '颜色',
    'appearance.diagram_text': '文字',
    'appearance.diagram_shape': '形状与尺寸',
    'appearance.diagram_desc': '设置 Mermaid 图表在预览与打印中的样式。更改会立即应用到已打开的图表。',
    'appearance.diagram_palette': '配色',
    'appearance.diagram_palette_app': '跟随主题',
    'appearance.diagram_palette_classic': '经典（浅色）',
    'appearance.diagram_palette_warm': '暖色',
    'appearance.diagram_palette_cool': '冷色',
    'appearance.diagram_font': '字体',
    'appearance.diagram_font_sans': '无衬线',
    'appearance.diagram_font_serif': '衬线',
    'appearance.diagram_font_mono': '等宽',
    'appearance.diagram_font_size': '字号',
    'appearance.diagram_radius': '圆角',
    'appearance.diagram_radius_square': '直角',
    'appearance.diagram_radius_default': '默认',
    'appearance.diagram_radius_round': '圆润',
    'appearance.diagram_padding': '内边距',
    'appearance.diagram_padding_compact': '紧凑',
    'appearance.diagram_padding_default': '默认',
    'appearance.diagram_padding_roomy': '宽松',
    'appearance.diagram_max_height': '最大高度',
    'appearance.diagram_no_limit': '不限制',

    // Image
    'image.pasted': '粘贴的图像',
    'image.dropped': '拖拽的图像',
    'image.desc': '配置插入本地图像时的保存策略。',
    'image.embed': '嵌入到 Markdown',
    'image.link': '引用原文件路径',
    'image.copy': '复制到文档同级 .assets 目录',

    // Files
    'files.startup_sidebar': '启动时侧边栏',
    'files.sidebar_desc': '设置启动时侧边栏默认显示的视图。',
    'files.sidebar_files': '文件树',
    'files.sidebar_outline': '大纲',
    'files.sidebar_hidden': '隐藏',

    // Sidebar Context Menu
    'sidebar.new_file': '新建文件',
    'sidebar.rename': '重命名',
    'sidebar.delete': '删除',
    'sidebar.confirm_delete': '确定要删除 "{name}" 吗？',
    'sidebar.title_files': '文件',
    'sidebar.title_outline': '大纲',

    // Table Context Menu
    'table.row_above': '在上方插入行',
    'table.row_below': '在下方插入行',
    'table.column_before': '在左侧插入列',
    'table.column_after': '在右侧插入列',
    'table.delete_row': '删除行',
    'table.delete_column': '删除列',
    'table.copy_table': '复制表格',
    'table.prettify_source': '美化源码',
    'table.delete_table': '删除表格',

    // Toolbar / Document Bar / Format Bar
    'toolbar.files': '文件',
    'toolbar.toggle_sidebar': '切换侧边栏',
    'toolbar.outline': '大纲',
    'toolbar.tools': '工具',
    'toolbar.source_mode': '源代码模式',
    'toolbar.print': '打印 / PDF',
    'toolbar.close_document': '关闭文档',
    'toolbar.code_block': '代码块',
    'toolbar.table': '表格',
    'toolbar.image': '图像',
    'toolbar.footnote': '脚注',
    'toolbar.goto_footnote': '跳转到脚注',
    'toolbar.new': '新建',
    'toolbar.open': '打开',
    'toolbar.save': '保存',
    'toolbar.save_as': '另存为',
    'toolbar.undo': '撤销',
    'toolbar.redo': '重做',
    'toolbar.find': '查找',
    'toolbar.check_save': '检查保存',

    // Empty state
    'empty.notice': '该分类暂无可配置选项。',
    'empty.sub': '更多选项将在后续版本中提供。',

    // Common
    'search.placeholder': '搜索...',
    'search.find': '查找',
    'search.replace': '替换',
    'search.replace_all': '全部替换',
    'search.match_case': '区分大小写',
    'search.whole_word': '全字匹配',
    'search.regexp': '正则表达式',
    'search.prev': '上一个匹配项',
    'search.next': '下一个匹配项',
    'search.close': '关闭',
    'btn.done': '完成',
    'btn.close': '关闭',
    'title.settings': '偏好设置',
  },
} as const;

export type TranslationKey = keyof typeof translations['en'];

if (typeof window !== 'undefined') {
  window.addEventListener('storage', event => {
    if (event.key === LANGUAGE_STORAGE_KEY) {
      const resolved = resolveLanguage(getLanguagePreference());
      for (const listener of listeners) {
        listener(resolved);
      }
    }
  });
}

export function t(
  key: TranslationKey,
  paramsOrStorage?: Record<string, string | number> | Storage,
  storageOption?: Storage,
): string {
  let params: Record<string, string | number> | undefined;
  let storage: Storage = localStorage;

  if (paramsOrStorage && typeof (paramsOrStorage as Storage).getItem === 'function') {
    storage = paramsOrStorage as Storage;
  } else if (paramsOrStorage) {
    params = paramsOrStorage as Record<string, string | number>;
    if (storageOption) storage = storageOption;
  } else if (storageOption) {
    storage = storageOption;
  }

  const lang = getCurrentLanguage(storage);
  const dict = (translations[lang] || translations.en) as Record<string, string>;
  let text = dict[key] || (translations.en as Record<string, string>)[key] || key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return text;
}
