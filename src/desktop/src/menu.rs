use tauri::{menu::*, AppHandle, Manager, Runtime};

pub const EVENT: &str = "markdew-document-command";
pub const REOPEN_CLOSED_ID: &str = "markdew-reopen-closed-file";
pub const RECENT_SUBMENU_ID: &str = "markdew-open-recent";
pub const CLEAR_RECENT_ID: &str = "markdew-clear-recent";
pub const NO_RECENT_ID: &str = "markdew-no-recent";
pub const RECENT_FILE_PREFIX: &str = "markdew-recent-file:";
pub const RECENT_FOLDER_PREFIX: &str = "markdew-recent-folder:";
pub const RECENT_PREFIX: &str = "markdew-recent:";

fn file_icon() -> tauri::image::Image<'static> {
    tauri::image::Image::new(&crate::icons_data::FILE_ICON_RGBA, 16, 16)
}

fn folder_icon() -> tauri::image::Image<'static> {
    tauri::image::Image::new(&crate::icons_data::FOLDER_ICON_RGBA, 16, 16)
}

fn find_nested_submenu<R: Runtime>(submenu: &Submenu<R>, id: &str) -> Option<Submenu<R>> {
    for item in submenu.items().unwrap_or_default() {
        if let MenuItemKind::Submenu(sub) = item {
            if sub.id().as_ref() == id {
                return Some(sub);
            }
            if let Some(nested) = find_nested_submenu(&sub, id) {
                return Some(nested);
            }
        }
    }
    None
}

fn find_submenu<R: Runtime>(menu: &Menu<R>, id: &str) -> Option<Submenu<R>> {
    for item in menu.items().unwrap_or_default() {
        if let MenuItemKind::Submenu(sub) = item {
            if sub.id().as_ref() == id {
                return Some(sub);
            }
            if let Some(nested) = find_nested_submenu(&sub, id) {
                return Some(nested);
            }
        }
    }
    None
}

pub fn find_check_item<R: Runtime>(menu: &Menu<R>, id: &str) -> Option<CheckMenuItem<R>> {
    fn search<R: Runtime>(items: Vec<MenuItemKind<R>>, id: &str) -> Option<CheckMenuItem<R>> {
        for item in items {
            match item {
                MenuItemKind::Check(check) => {
                    if check.id().as_ref() == id {
                        return Some(check);
                    }
                }
                MenuItemKind::Submenu(sub) => {
                    if let Ok(sub_items) = sub.items() {
                        if let Some(found) = search(sub_items, id) {
                            return Some(found);
                        }
                    }
                }
                _ => {}
            }
        }
        None
    }
    menu.items().ok().and_then(|items| search(items, id))
}

pub fn populate_recent_submenu<R: Runtime>(
    app: &AppHandle<R>,
    submenu: &Submenu<R>,
    items: &crate::recent::RecentItems,
) -> tauri::Result<()> {
    while let Ok(Some(_)) = submenu.remove_at(0) {}

    let lang = current_menu_language();
    let reopen_label = translate_menu_id(REOPEN_CLOSED_ID, &lang).unwrap_or("Reopen Closed File");

    // 1. Reopen Closed File (with native accelerator ⇧⌘T)
    let reopen_enabled = !items.closed_files.is_empty();
    let reopen_item = MenuItem::with_id(
        app,
        REOPEN_CLOSED_ID,
        reopen_label,
        reopen_enabled,
        Some("CmdOrCtrl+Shift+T"),
    )?;
    submenu.append(&reopen_item)?;

    // 2. Separator
    let sep1 = PredefinedMenuItem::separator(app)?;
    submenu.append(&sep1)?;

    let has_files = !items.files.is_empty();
    let has_folders = !items.folders.is_empty();

    if !has_files && !has_folders {
        let no_recent_label = translate_menu_id(NO_RECENT_ID, &lang).unwrap_or("No Recent Items");
        let no_recent = MenuItem::with_id(app, NO_RECENT_ID, no_recent_label, false, None::<&str>)?;
        submenu.append(&no_recent)?;
    } else {
        // 3. Files section (with Markdown icon and em-dash disambiguation)
        if has_files {
            let disambiguated_files = crate::recent::disambiguate_paths(&items.files);
            for (path, display_name) in disambiguated_files {
                let id = format!("{RECENT_FILE_PREFIX}{path}");
                let icon = file_icon();
                if let Ok(icon_item) = IconMenuItem::with_id(app, &id, &display_name, true, Some(icon), None::<&str>) {
                    submenu.append(&icon_item)?;
                } else {
                    let text_item = MenuItem::with_id(app, &id, &display_name, true, None::<&str>)?;
                    submenu.append(&text_item)?;
                }
            }
        }

        // 4. Separator between files and folders
        if has_files && has_folders {
            let sep_mid = PredefinedMenuItem::separator(app)?;
            submenu.append(&sep_mid)?;
        }

        // 5. Folders section (with folder icon and folder base name)
        if has_folders {
            let disambiguated_folders = crate::recent::disambiguate_paths(&items.folders);
            for (path, display_name) in disambiguated_folders {
                let id = format!("{RECENT_FOLDER_PREFIX}{path}");
                let icon = folder_icon();
                if let Ok(icon_item) = IconMenuItem::with_id(app, &id, &display_name, true, Some(icon), None::<&str>) {
                    submenu.append(&icon_item)?;
                } else {
                    let text_item = MenuItem::with_id(app, &id, &display_name, true, None::<&str>)?;
                    submenu.append(&text_item)?;
                }
            }
        }

        // 6. Separator before Clear Items
        let sep2 = PredefinedMenuItem::separator(app)?;
        submenu.append(&sep2)?;

        // 7. Clear Items
        let clear_label = translate_menu_id(CLEAR_RECENT_ID, &lang).unwrap_or("Clear Items");
        let clear_item = MenuItem::with_id(app, CLEAR_RECENT_ID, clear_label, true, None::<&str>)?;
        submenu.append(&clear_item)?;
    }

    Ok(())
}

pub fn refresh_recent_menu<R: Runtime>(app: &AppHandle<R>, items: &crate::recent::RecentItems) -> tauri::Result<()> {
    if let Some(menu) = app.menu() {
        if let Some(recent_sub) = find_submenu(&menu, RECENT_SUBMENU_ID) {
            populate_recent_submenu(app, &recent_sub, items)?;
        }
    }
    Ok(())
}
const COMMANDS: &[(&str, &str, &str)] = &[
    ("markdew-about", "About MarkDew", "about"),
    ("markdew-settings", "Settings…", "settings"),
    ("markdew-new", "New", "new"),
    ("markdew-open", "Open…", "open"),
    ("markdew-open-folder", "Open Folder…", "open-folder"),
    ("markdew-open-quickly", "Open Quickly…", "open-quickly"),
    ("markdew-save", "Save", "save"),
    ("markdew-save-as", "Save As…", "save-as"),
    (
        "markdew-close-document",
        "Close Document",
        "close-document",
    ),
    ("markdew-print", "Print…", "print"),
    ("markdew-import", "Import…", "import"),
    ("markdew-export-pdf", "PDF…", "export-pdf"),
    ("markdew-export-png", "Image (PNG)…", "export-png"),
    ("markdew-export-html", "HTML", "export-html"),
    ("markdew-export-html-plain", "HTML (without styles)", "export-html-plain"),
    ("markdew-export-docx", "Word (.docx)", "export-docx"),
    ("markdew-export-odt", "OpenOffice", "export-odt"),
    ("markdew-export-rtf", "RTF", "export-rtf"),
    ("markdew-export-epub", "Epub", "export-epub"),
    ("markdew-export-latex", "LaTeX", "export-latex"),
    ("markdew-export-mediawiki", "Media Wiki", "export-mediawiki"),
    ("markdew-export-rst", "reStructuredText", "export-rst"),
    ("markdew-export-textile", "Textile", "export-textile"),
    ("markdew-export-opml", "OPML", "export-opml"),
    ("markdew-export-previous", "Export with Previous", "export-previous"),
    ("markdew-export-overwrite", "Export and Overwrite with Previous", "export-overwrite"),
    ("markdew-export-settings", "Export Settings…", "export-settings"),
    ("markdew-undo", "Undo", "undo"),
    ("markdew-redo", "Redo", "redo"),
    ("markdew-find", "Find…", "find"),
    ("markdew-h1", "Heading 1", "h1"),
    ("markdew-h2", "Heading 2", "h2"),
    ("markdew-h3", "Heading 3", "h3"),
    ("markdew-h4", "Heading 4", "h4"),
    ("markdew-h5", "Heading 5", "h5"),
    ("markdew-h6", "Heading 6", "h6"),
    ("markdew-paragraph", "Paragraph", "paragraph"),
    ("markdew-table", "Table", "table"),
    ("markdew-code-block", "Code Fences", "code-block"),
    ("markdew-quote", "Quote", "quote"),
    ("markdew-bold", "Strong", "bold"),
    ("markdew-italic", "Emphasis", "italic"),
    ("markdew-code", "Inline Code", "code"),
    ("markdew-strike", "Strike", "strike"),
    ("markdew-link", "Hyperlink", "link"),
    ("markdew-toggle-sidebar", "Toggle Sidebar", "toggle-sidebar"),
    ("markdew-toggle-outline", "Outline", "toggle-outline"),
    ("markdew-source-mode", "Source Code Mode", "source-mode"),
    ("markdew-theme-system", "System", "theme-system"),
    ("markdew-theme-light", "Light", "theme-light"),
    ("markdew-theme-dark", "Dark", "theme-dark"),
];

pub fn command(id: &str, main_exists: bool) -> Option<&'static str> {
    if !main_exists {
        return None;
    }
    COMMANDS
        .iter()
        .find(|entry| entry.0 == id)
        .map(|entry| entry.2)
}

fn item<R: Runtime>(app: &AppHandle<R>, index: usize) -> tauri::Result<MenuItem<R>> {
    let (id, label, _) = COMMANDS[index];
    // WebView shortcuts remain the sole accelerator owner.
    MenuItem::with_id(app, id, label, true, None::<&str>)
}

fn item_by_id<R: Runtime>(app: &AppHandle<R>, id: &str) -> tauri::Result<MenuItem<R>> {
    let index = COMMANDS.iter().position(|entry| entry.0 == id).unwrap();
    item(app, index)
}

fn item_by_cmd<R: Runtime>(app: &AppHandle<R>, cmd: &str) -> tauri::Result<MenuItem<R>> {
    let index = COMMANDS.iter().position(|entry| entry.2 == cmd).unwrap();
    item(app, index)
}

fn check_item_by_cmd<R: Runtime>(
    app: &AppHandle<R>,
    cmd: &str,
    checked: bool,
) -> tauri::Result<CheckMenuItem<R>> {
    let index = COMMANDS.iter().position(|entry| entry.2 == cmd).unwrap();
    let (id, label, _) = COMMANDS[index];
    CheckMenuItem::with_id(app, id, label, true, checked, None::<&str>)
}

pub fn set_check_item_state<R: Runtime>(
    app: &AppHandle<R>,
    id: &str,
    checked: bool,
) -> tauri::Result<()> {
    if let Some(menu) = app.menu() {
        if let Some(item) = find_check_item(&menu, id) {
            item.set_checked(checked)?;
        }
    }
    Ok(())
}

static CURRENT_MENU_LANG: std::sync::RwLock<String> = std::sync::RwLock::new(String::new());

pub fn current_menu_language() -> String {
    CURRENT_MENU_LANG.read().map(|g| g.clone()).unwrap_or_default()
}

pub fn is_chinese_language(lang: &str) -> bool {
    lang.starts_with("zh")
}

pub fn translate_menu_id(id: &str, lang: &str) -> Option<&'static str> {
    let is_zh = is_chinese_language(lang);
    match id {
        // Submenus
        "markdew-file" => Some(if is_zh { "文件" } else { "File" }),
        RECENT_SUBMENU_ID => Some(if is_zh { "最近打开" } else { "Open Recent" }),
        "markdew-edit" => Some(if is_zh { "编辑" } else { "Edit" }),
        "markdew-paragraph" => Some(if is_zh { "段落" } else { "Paragraph" }),
        "markdew-format" => Some(if is_zh { "格式" } else { "Format" }),
        "markdew-view" => Some(if is_zh { "视图" } else { "View" }),
        "markdew-themes" => Some(if is_zh { "主题" } else { "Themes" }),
        "markdew-help" => Some(if is_zh { "帮助" } else { "Help" }),

        // Recent items
        REOPEN_CLOSED_ID => Some(if is_zh { "重新打开关闭的文件" } else { "Reopen Closed File" }),
        CLEAR_RECENT_ID => Some(if is_zh { "清空最近打开项" } else { "Clear Items" }),
        NO_RECENT_ID => Some(if is_zh { "无最近打开项" } else { "No Recent Items" }),

        // Commands
        "markdew-about" => Some(if is_zh { "关于 MarkDew" } else { "About MarkDew" }),
        "markdew-settings" => Some(if is_zh { "偏好设置…" } else { "Settings…" }),
        "markdew-new" => Some(if is_zh { "新建" } else { "New" }),
        "markdew-open" => Some(if is_zh { "打开…" } else { "Open…" }),
        "markdew-open-folder" => Some(if is_zh { "打开文件夹…" } else { "Open Folder…" }),
        "markdew-open-quickly" => Some(if is_zh { "快速打开…" } else { "Open Quickly…" }),
        "markdew-save" => Some(if is_zh { "保存" } else { "Save" }),
        "markdew-save-as" => Some(if is_zh { "另存为…" } else { "Save As…" }),
        "markdew-close-document" => Some(if is_zh { "关闭文档" } else { "Close Document" }),
        "markdew-print" => Some(if is_zh { "打印…" } else { "Print…" }),
        "markdew-export" => Some(if is_zh { "导出" } else { "Export" }),
        "markdew-import" => Some(if is_zh { "导入…" } else { "Import…" }),
        "markdew-export-pdf" => Some(if is_zh { "PDF…" } else { "PDF…" }),
        "markdew-export-png" => Some(if is_zh { "图片 (PNG)…" } else { "Image (PNG)…" }),
        "markdew-export-html" => Some(if is_zh { "HTML" } else { "HTML" }),
        "markdew-export-html-plain" => Some(if is_zh { "HTML（无样式）" } else { "HTML (without styles)" }),
        "markdew-export-docx" => Some(if is_zh { "Word (.docx)" } else { "Word (.docx)" }),
        "markdew-export-odt" => Some(if is_zh { "OpenOffice" } else { "OpenOffice" }),
        "markdew-export-rtf" => Some(if is_zh { "RTF" } else { "RTF" }),
        "markdew-export-epub" => Some(if is_zh { "Epub" } else { "Epub" }),
        "markdew-export-latex" => Some(if is_zh { "LaTeX" } else { "LaTeX" }),
        "markdew-export-mediawiki" => Some(if is_zh { "Media Wiki" } else { "Media Wiki" }),
        "markdew-export-rst" => Some(if is_zh { "reStructuredText" } else { "reStructuredText" }),
        "markdew-export-textile" => Some(if is_zh { "Textile" } else { "Textile" }),
        "markdew-export-opml" => Some(if is_zh { "OPML" } else { "OPML" }),
        "markdew-export-previous" => Some(if is_zh { "按上次设置导出" } else { "Export with Previous" }),
        "markdew-export-overwrite" => Some(if is_zh { "按上次设置导出并覆盖" } else { "Export and Overwrite with Previous" }),
        "markdew-export-settings" => Some(if is_zh { "导出设置…" } else { "Export Settings…" }),
        "markdew-undo" => Some(if is_zh { "撤销" } else { "Undo" }),
        "markdew-redo" => Some(if is_zh { "重做" } else { "Redo" }),
        "markdew-find" => Some(if is_zh { "查找…" } else { "Find…" }),
        "markdew-h1" => Some(if is_zh { "一级标题" } else { "Heading 1" }),
        "markdew-h2" => Some(if is_zh { "二级标题" } else { "Heading 2" }),
        "markdew-h3" => Some(if is_zh { "三级标题" } else { "Heading 3" }),
        "markdew-h4" => Some(if is_zh { "四级标题" } else { "Heading 4" }),
        "markdew-h5" => Some(if is_zh { "五级标题" } else { "Heading 5" }),
        "markdew-h6" => Some(if is_zh { "六级标题" } else { "Heading 6" }),
        "markdew-table" => Some(if is_zh { "表格" } else { "Table" }),
        "markdew-code-block" => Some(if is_zh { "代码块" } else { "Code Fences" }),
        "markdew-quote" => Some(if is_zh { "引用" } else { "Quote" }),
        "markdew-bold" => Some(if is_zh { "加粗" } else { "Strong" }),
        "markdew-italic" => Some(if is_zh { "斜体" } else { "Emphasis" }),
        "markdew-code" => Some(if is_zh { "行内代码" } else { "Inline Code" }),
        "markdew-strike" => Some(if is_zh { "删除线" } else { "Strike" }),
        "markdew-link" => Some(if is_zh { "超链接" } else { "Hyperlink" }),
        "markdew-toggle-sidebar" => Some(if is_zh { "切换侧边栏" } else { "Toggle Sidebar" }),
        "markdew-toggle-outline" => Some(if is_zh { "大纲" } else { "Outline" }),
        "markdew-source-mode" => Some(if is_zh { "源代码模式" } else { "Source Code Mode" }),
        "markdew-theme-system" => Some(if is_zh { "跟随系统" } else { "System" }),
        "markdew-theme-light" => Some(if is_zh { "浅色" } else { "Light" }),
        "markdew-theme-dark" => Some(if is_zh { "深色" } else { "Dark" }),
        _ => None,
    }
}

type Relabels = Vec<(String, String)>;

fn update_items_language<R: Runtime>(items: Vec<MenuItemKind<R>>, lang: &str, relabels: &mut Relabels) -> tauri::Result<()> {
    for item in items {
        match item {
            MenuItemKind::MenuItem(ref mi) => {
                let id = mi.id().as_ref();
                if id.starts_with(RECENT_FILE_PREFIX) || id.starts_with(RECENT_FOLDER_PREFIX) {
                    continue;
                }
                if let Some(text) = translate_menu_id(id, lang) {
                    relabels.push((mi.text().unwrap_or_default(), text.to_string()));
                    let _ = mi.set_text(text);
                }
            }
            MenuItemKind::Submenu(ref sub) => {
                let id = sub.id().as_ref();
                // Window and Help come from the platform default menu, so their IDs are generated.
                let default_title = match sub.text().unwrap_or_default().as_str() {
                    "Window" | "窗口" => Some(if is_chinese_language(lang) { "窗口" } else { "Window" }),
                    "Help" | "帮助" => Some(if is_chinese_language(lang) { "帮助" } else { "Help" }),
                    _ => None,
                };
                if let Some(text) = translate_menu_id(id, lang).or(default_title) {
                    relabels.push((sub.text().unwrap_or_default(), text.to_string()));
                    let _ = sub.set_text(text);
                }
                if let Ok(children) = sub.items() {
                    let _ = update_items_language(children, lang, relabels);
                }
            }
            MenuItemKind::Check(ref check) => {
                let id = check.id().as_ref();
                if let Some(text) = translate_menu_id(id, lang) {
                    relabels.push((check.text().unwrap_or_default(), text.to_string()));
                    let _ = check.set_text(text);
                }
            }
            MenuItemKind::Icon(ref icon) => {
                let id = icon.id().as_ref();
                if id.starts_with(RECENT_FILE_PREFIX) || id.starts_with(RECENT_FOLDER_PREFIX) {
                    continue;
                }
                if let Some(text) = translate_menu_id(id, lang) {
                    relabels.push((icon.text().unwrap_or_default(), text.to_string()));
                    let _ = icon.set_text(text);
                }
            }
            _ => {}
        }
    }
    Ok(())
}

// muda builds GTK submenu and icon titles as a box holding a label. Its set_text calls
// GtkMenuItem::set_label, which ignores a box child, so those titles keep the old language.
// Each label inside a menu bar is therefore set directly, matched by its previous text.
#[cfg(target_os = "linux")]
fn relabel_gtk_menu_bars<R: Runtime>(app: &AppHandle<R>, relabels: &Relabels) {
    use gtk::prelude::*;

    fn walk(widget: &gtk::Widget, in_menu_bar: bool, relabels: &Relabels) {
        let in_menu_bar = in_menu_bar || widget.is::<gtk::MenuBar>();
        if in_menu_bar {
            if let Some(label) = widget.downcast_ref::<gtk::Label>() {
                let current = label.text();
                if let Some((_, new)) = relabels.iter().find(|(old, new)| old.as_str() == current.as_str() && old != new) {
                    label.set_text_with_mnemonic(new);
                }
            }
            if let Some(item) = widget.downcast_ref::<gtk::MenuItem>() {
                if let Some(submenu) = item.submenu() {
                    walk(submenu.upcast_ref(), true, relabels);
                }
            }
        }
        if let Some(container) = widget.downcast_ref::<gtk::Container>() {
            for child in container.children() {
                walk(&child, in_menu_bar, relabels);
            }
        }
    }

    for window in app.webview_windows().values() {
        if let Ok(gtk_window) = window.gtk_window() {
            walk(gtk_window.upcast_ref(), false, relabels);
        }
    }
}

pub fn update_menu_language<R: Runtime>(app: &AppHandle<R>, lang: &str) -> tauri::Result<()> {
    if let Ok(mut lock) = CURRENT_MENU_LANG.write() {
        *lock = lang.to_string();
    }
    if let Some(menu) = app.menu() {
        if let Ok(items) = menu.items() {
            let mut relabels = Relabels::new();
            update_items_language(items, lang, &mut relabels)?;
            #[cfg(target_os = "linux")]
            relabel_gtk_menu_bars(app, &relabels);
        }
    }
    Ok(())
}

pub fn update_theme_checks<R: Runtime>(app: &AppHandle<R>, theme: &str) -> tauri::Result<()> {
    set_check_item_state(app, "markdew-theme-system", theme == "system")?;
    set_check_item_state(app, "markdew-theme-light", theme == "light")?;
    set_check_item_state(app, "markdew-theme-dark", theme == "dark")?;
    Ok(())
}

#[derive(Debug, PartialEq)]
enum Entry {
    Original(usize),
    File,
    Edit,
    Paragraph,
    Format,
    View,
    Themes,
}

fn order(titles: &[Option<String>]) -> Vec<Entry> {
    let mut result = Vec::new();
    let (mut has_file, mut has_edit, mut has_view) = (false, false, false);
    for (index, title) in titles.iter().enumerate() {
        match title.as_deref() {
            Some("File") => {
                if !has_file {
                    result.push(Entry::File);
                    has_file = true;
                }
            }
            Some("Edit") => {
                if !has_file {
                    result.push(Entry::File);
                    has_file = true;
                }
                if !has_edit {
                    result.push(Entry::Edit);
                    result.push(Entry::Paragraph);
                    result.push(Entry::Format);
                    has_edit = true;
                }
            }
            Some("View") => {
                if !has_file {
                    result.push(Entry::File);
                    has_file = true;
                }
                if !has_edit {
                    result.push(Entry::Edit);
                    result.push(Entry::Paragraph);
                    result.push(Entry::Format);
                    has_edit = true;
                }
                if !has_view {
                    result.push(Entry::View);
                    result.push(Entry::Themes);
                    has_view = true;
                }
            }
            _ => result.push(Entry::Original(index)),
        }
    }
    if !has_file {
        result.insert(0, Entry::File);
    }
    if !has_edit {
        let index = result.iter().position(|entry| *entry == Entry::File).unwrap();
        result.insert(index + 1, Entry::Edit);
        result.insert(index + 2, Entry::Paragraph);
        result.insert(index + 3, Entry::Format);
    }
    if !has_view {
        let index = result.iter().position(|entry| *entry == Entry::Format).unwrap();
        result.insert(index + 1, Entry::View);
        result.insert(index + 2, Entry::Themes);
    }
    result
}

#[cfg(target_os = "macos")]
fn populate_app_submenu<R: Runtime>(app: &AppHandle<R>, submenu: &Submenu<R>) -> tauri::Result<()> {
    while let Ok(Some(_)) = submenu.remove_at(0) {}
    submenu.append(&item_by_cmd(app, "about")?)?;
    submenu.append(&PredefinedMenuItem::separator(app)?)?;
    submenu.append(&MenuItem::with_id(
        app,
        "markdew-settings",
        "Settings…",
        true,
        Some("CmdOrCtrl+,"),
    )?)?;
    submenu.append(&PredefinedMenuItem::separator(app)?)?;
    submenu.append(&PredefinedMenuItem::services(app, None)?)?;
    submenu.append(&PredefinedMenuItem::separator(app)?)?;
    submenu.append(&PredefinedMenuItem::hide(app, None)?)?;
    submenu.append(&PredefinedMenuItem::hide_others(app, None)?)?;
    submenu.append(&PredefinedMenuItem::show_all(app, None)?)?;
    submenu.append(&PredefinedMenuItem::separator(app)?)?;
    submenu.append(&PredefinedMenuItem::quit(app, None)?)?;
    Ok(())
}

pub fn build<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<Menu<R>> {
    let recent = Submenu::with_id(app, RECENT_SUBMENU_ID, "Open Recent", true)?;
    let recent_items = if let Some(store) = app.try_state::<crate::recent::RecentStore>() {
        store.state.lock().map(|g| g.clone()).unwrap_or_default()
    } else {
        crate::recent::RecentItems::default()
    };
    populate_recent_submenu(app, &recent, &recent_items)?;

    let export = Submenu::with_id_and_items(
        app,
        "markdew-export",
        "Export",
        true,
        &[
            &item_by_id(app, "markdew-export-pdf")?,
            &item_by_id(app, "markdew-export-png")?,
            &item_by_id(app, "markdew-export-html")?,
            &item_by_id(app, "markdew-export-html-plain")?,
            &PredefinedMenuItem::separator(app)?,
            &item_by_id(app, "markdew-export-docx")?,
            &item_by_id(app, "markdew-export-odt")?,
            &item_by_id(app, "markdew-export-rtf")?,
            &item_by_id(app, "markdew-export-epub")?,
            &item_by_id(app, "markdew-export-latex")?,
            &item_by_id(app, "markdew-export-mediawiki")?,
            &item_by_id(app, "markdew-export-rst")?,
            &item_by_id(app, "markdew-export-textile")?,
            &item_by_id(app, "markdew-export-opml")?,
            &PredefinedMenuItem::separator(app)?,
            &item_by_id(app, "markdew-export-previous")?,
            &item_by_id(app, "markdew-export-overwrite")?,
            &PredefinedMenuItem::separator(app)?,
            &item_by_id(app, "markdew-export-settings")?,
        ],
    )?;

    let file = Submenu::with_id_and_items(
        app,
        "markdew-file",
        "File",
        true,
        &[
            &item_by_cmd(app, "new")?,
            &item_by_cmd(app, "open")?,
            &item_by_cmd(app, "open-folder")?,
            &PredefinedMenuItem::separator(app)?,
            &item_by_cmd(app, "open-quickly")?,
            &recent,
            &PredefinedMenuItem::separator(app)?,
            &item_by_cmd(app, "save")?,
            &item_by_cmd(app, "save-as")?,
            &item_by_cmd(app, "close-document")?,
            &PredefinedMenuItem::separator(app)?,
            &item_by_cmd(app, "import")?,
            &export,
            &PredefinedMenuItem::separator(app)?,
            &item_by_cmd(app, "print")?,
            #[cfg(not(target_os = "macos"))]
            &PredefinedMenuItem::separator(app)?,
            #[cfg(not(target_os = "macos"))]
            &MenuItem::with_id(app, "markdew-settings", "Settings…", true, Some("CmdOrCtrl+,"))?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::close_window(app, None)?,
            #[cfg(not(target_os = "macos"))]
            &PredefinedMenuItem::quit(app, None)?,
        ],
    )?;
    let edit = Submenu::with_id_and_items(
        app,
        "markdew-edit",
        "Edit",
        true,
        &[
            &item_by_cmd(app, "undo")?,
            &item_by_cmd(app, "redo")?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::cut(app, None)?,
            &PredefinedMenuItem::copy(app, None)?,
            &PredefinedMenuItem::paste(app, None)?,
            &PredefinedMenuItem::select_all(app, None)?,
            &PredefinedMenuItem::separator(app)?,
            &item_by_cmd(app, "find")?,
        ],
    )?;
    let paragraph = Submenu::with_id_and_items(
        app,
        "markdew-paragraph",
        "Paragraph",
        true,
        &[
            &item_by_cmd(app, "h1")?,
            &item_by_cmd(app, "h2")?,
            &item_by_cmd(app, "h3")?,
            &item_by_cmd(app, "h4")?,
            &item_by_cmd(app, "h5")?,
            &item_by_cmd(app, "h6")?,
            &item_by_cmd(app, "paragraph")?,
            &PredefinedMenuItem::separator(app)?,
            &item_by_cmd(app, "table")?,
            &item_by_cmd(app, "code-block")?,
            &item_by_cmd(app, "quote")?,
        ],
    )?;
    let format = Submenu::with_id_and_items(
        app,
        "markdew-format",
        "Format",
        true,
        &[
            &item_by_cmd(app, "bold")?,
            &item_by_cmd(app, "italic")?,
            &item_by_cmd(app, "code")?,
            &item_by_cmd(app, "strike")?,
            &item_by_cmd(app, "link")?,
        ],
    )?;
    let view = Submenu::with_id_and_items(
        app,
        "markdew-view",
        "View",
        true,
        &[
            &item_by_cmd(app, "toggle-sidebar")?,
            &check_item_by_cmd(app, "toggle-outline", false)?,
            &PredefinedMenuItem::separator(app)?,
            &check_item_by_cmd(app, "source-mode", false)?,
        ],
    )?;
    let themes = Submenu::with_id_and_items(
        app,
        "markdew-themes",
        "Themes",
        true,
        &[
            &check_item_by_cmd(app, "theme-system", true)?,
            &check_item_by_cmd(app, "theme-light", false)?,
            &check_item_by_cmd(app, "theme-dark", false)?,
        ],
    )?;
    let defaults = Menu::default(app)?;
    let menu = Menu::new(app)?;
    // Upstream File/Edit/View have generated IDs. Their literal package titles are
    // matched here; package/platform acceptance must check this dependency.
    let entries = defaults.items()?;
    let titles = entries
        .iter()
        .map(|entry| entry.as_submenu().map(|submenu| submenu.text()).transpose())
        .collect::<tauri::Result<Vec<_>>>()?;
    for entry in order(&titles) {
        match entry {
            Entry::File => menu.append(&file)?,
            Entry::Edit => menu.append(&edit)?,
            Entry::Paragraph => menu.append(&paragraph)?,
            Entry::Format => menu.append(&format)?,
            Entry::View => menu.append(&view)?,
            Entry::Themes => menu.append(&themes)?,
            Entry::Original(index) => {
                #[cfg(target_os = "macos")]
                if index == 0 {
                    if let Some(app_sub) = entries[index].as_submenu() {
                        let _ = populate_app_submenu(app, &app_sub);
                    }
                }
                #[cfg(not(target_os = "macos"))]
                if titles.get(index).and_then(|t| t.as_deref()) == Some("Help") {
                    if let Some(help_sub) = entries[index].as_submenu() {
                        while let Ok(Some(_)) = help_sub.remove_at(0) {}
                        let _ = help_sub.append(&item_by_cmd(app, "about")?);
                    }
                }
                menu.append(&entries[index])?;
            }
        }
    }
    #[cfg(not(target_os = "macos"))]
    {
        let has_help = titles.iter().any(|t| t.as_deref() == Some("Help"));
        if !has_help {
            let help = Submenu::with_id_and_items(
                app,
                "markdew-help",
                "Help",
                true,
                &[&item_by_cmd(app, "about")?],
            )?;
            menu.append(&help)?;
        }
    }
    Ok(menu)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn keeps_one_file_and_edit_menu_in_platform_order() {
        for titles in [
            vec!["App", "File", "Edit", "View", "Window", "Help"],
            vec!["File", "Edit", "Window", "Help"],
            vec!["Edit", "Window", "Help"],
            vec!["File", "File", "Edit", "Edit"],
            vec![],
        ] {
            let input: Vec<_> = titles.iter().map(|title| Some(title.to_string())).collect();
            let plan = order(&input);
            assert_eq!(
                plan.iter().filter(|entry| **entry == Entry::File).count(),
                1
            );
            assert_eq!(
                plan.iter().filter(|entry| **entry == Entry::Edit).count(),
                1
            );
            assert_eq!(
                plan.iter().filter(|entry| **entry == Entry::Paragraph).count(),
                1
            );
            assert_eq!(
                plan.iter().filter(|entry| **entry == Entry::Format).count(),
                1
            );
            assert_eq!(
                plan.iter().filter(|entry| **entry == Entry::View).count(),
                1
            );
            assert_eq!(
                plan.iter().filter(|entry| **entry == Entry::Themes).count(),
                1
            );
            let originals: Vec<_> = plan
                .iter()
                .filter_map(|entry| match entry {
                    Entry::Original(index) => Some(titles[*index]),
                    _ => None,
                })
                .collect();
            assert_eq!(
                originals,
                titles
                    .iter()
                    .copied()
                    .filter(|title| !["File", "Edit", "View"].contains(title))
                    .collect::<Vec<_>>()
            );
            let pos_file = plan.iter().position(|entry| *entry == Entry::File).unwrap();
            let pos_edit = plan.iter().position(|entry| *entry == Entry::Edit).unwrap();
            let pos_para = plan.iter().position(|entry| *entry == Entry::Paragraph).unwrap();
            let pos_format = plan.iter().position(|entry| *entry == Entry::Format).unwrap();
            let pos_view = plan.iter().position(|entry| *entry == Entry::View).unwrap();
            let pos_themes = plan.iter().position(|entry| *entry == Entry::Themes).unwrap();
            assert!(pos_file < pos_edit);
            assert!(pos_edit < pos_para);
            assert!(pos_para < pos_format);
            assert!(pos_format < pos_view);
            assert!(pos_view < pos_themes);
        }
    }
    #[test]
    fn routes_only_known_commands_to_a_live_main_window() {
        let mut ids = std::collections::HashSet::new();
        let mut buttons = std::collections::HashSet::new();
        for &(id, _, button) in COMMANDS {
            assert!(ids.insert(id));
            assert!(buttons.insert(button));
            assert_eq!(command(id, true), Some(button));
            assert_eq!(command(id, false), None);
        }
        for id in ["", "save", "quit", "markdew-file", "markdew-close-window"] {
            assert_eq!(command(id, true), None);
        }
    }
    #[test]
    fn check_menu_items_are_registered_in_commands() {
        let check_ids = [
            "markdew-theme-system",
            "markdew-theme-light",
            "markdew-theme-dark",
            "markdew-source-mode",
            "markdew-toggle-outline",
        ];
        for id in check_ids {
            assert!(
                COMMANDS.iter().any(|entry| entry.0 == id),
                "Missing command ID: {id}"
            );
            assert!(command(id, true).is_some());
        }
    }
    #[test]
    fn translates_all_submenus_commands_and_recent_items() {
        let submenu_ids = [
            "markdew-file",
            RECENT_SUBMENU_ID,
            "markdew-edit",
            "markdew-paragraph",
            "markdew-format",
            "markdew-view",
            "markdew-themes",
            "markdew-help",
        ];
        let recent_ids = [
            REOPEN_CLOSED_ID,
            CLEAR_RECENT_ID,
            NO_RECENT_ID,
        ];

        for lang in ["en", "zh-CN"] {
            for sub_id in submenu_ids {
                let trans = translate_menu_id(sub_id, lang);
                assert!(trans.is_some(), "Missing translation for submenu {sub_id} in {lang}");
                assert!(!trans.unwrap().is_empty());
            }
            for rec_id in recent_ids {
                let trans = translate_menu_id(rec_id, lang);
                assert!(trans.is_some(), "Missing translation for recent item {rec_id} in {lang}");
                assert!(!trans.unwrap().is_empty());
            }
            for &(cmd_id, _, _) in COMMANDS {
                let trans = translate_menu_id(cmd_id, lang);
                assert!(trans.is_some(), "Missing translation for command {cmd_id} in {lang}");
                assert!(!trans.unwrap().is_empty());
            }
        }
    }
}
