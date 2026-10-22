#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use std::{
    fs,
    io::{Read, Write},
    path::{Path, PathBuf},
    sync::Mutex,
};
use tauri::State;
use tauri::{Emitter, Manager};
use tauri_plugin_opener::OpenerExt;
mod assets;
mod directory;
mod documents;
mod export;
mod images;
mod local_links;
mod menu;
mod open_requests;
mod pandoc;
mod pdf;
mod web_links;
use documents::{with_document, Document, Documents};
mod quit;
mod updater;
mod recovery;
mod recent;
mod icons_data;
type RecoveryState = Mutex<Result<recovery::Documents, String>>;

#[tauri::command]
fn take_open_requests(
    window: tauri::WebviewWindow,
    queue: State<'_, Mutex<open_requests::Queue>>,
) -> Result<open_requests::Batch, String> {
    queue
        .lock()
        .map_err(|_| "Open requests are unavailable.".to_string())?
        .take(window.label())
}

#[tauri::command]
async fn resolve_document_link(
    app: tauri::AppHandle,
    window: tauri::WebviewWindow,
    document: u64,
    document_path: String,
    destination: String,
) -> Result<local_links::Target, String> {
    let label = window.label().to_owned();
    tauri::async_runtime::spawn_blocking(move || {
        local_links::resolve(
            &app.state::<Mutex<Documents>>(),
            &label,
            document,
            &document_path,
            &destination,
        )
    })
    .await
    .map_err(|error| error.to_string())?
}

#[tauri::command]
async fn open_web_link(
    app: tauri::AppHandle,
    window: tauri::WebviewWindow,
    url: String,
) -> Result<(), String> {
    let url = web_links::validate(window.label(), &url)?;
    tauri::async_runtime::spawn_blocking(move || {
        app.opener()
            .open_url(url, None::<&str>)
            .map_err(|error| error.to_string())
    })
    .await
    .map_err(|error| error.to_string())?
}

fn record_recent_path<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    path: &str,
    store: &recent::RecentStore,
) -> Result<(), String> {
    let mut guard = store.state.lock().map_err(|e| e.to_string())?;
    guard.add(path);
    guard.save(&store.file_path)?;
    menu::refresh_recent_menu(app, &guard).map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(Default)]
pub struct InitialTargets {
    pub folders: std::collections::HashMap<String, String>,
    pub files: std::collections::HashMap<String, String>,
}

static WINDOW_COUNTER: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(1);

fn open_folder_window_sync<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    targets: &Mutex<InitialTargets>,
    path: String,
    file: Option<String>,
) -> Result<(), String> {
    let installing = updater::INSTALLING.lock().map_err(|e| e.to_string())?;
    if *installing {
        return Err("Wait for the app update before you open another window.".into());
    }
    let id = format!(
        "window-{}-{}",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis())
            .unwrap_or(0),
        WINDOW_COUNTER.fetch_add(1, std::sync::atomic::Ordering::Relaxed)
    );
    {
        let mut guard = targets.lock().map_err(|e| e.to_string())?;
        guard.folders.insert(id.clone(), path.clone());
        if let Some(file_path) = file {
            guard.files.insert(id.clone(), file_path);
        }
    }
    let builder = tauri::WebviewWindowBuilder::new(app, &id, tauri::WebviewUrl::default())
        .title("MarkDew")
        .inner_size(1000.0, 760.0);
    #[cfg(target_os = "macos")]
    let builder = builder
        .title_bar_style(tauri::TitleBarStyle::Overlay)
        .hidden_title(true);
    if let Err(error) = builder.build() {
        if let Ok(mut guard) = targets.lock() {
            guard.folders.remove(&id);
            guard.files.remove(&id);
        }
        return Err(error.to_string());
    }
    if let Some(store) = app.try_state::<recent::RecentStore>() {
        let _ = record_recent_path(app, &path, &store);
    }
    Ok(())
}

#[tauri::command]
async fn open_folder_window(
    app: tauri::AppHandle,
    targets: State<'_, Mutex<InitialTargets>>,
    path: String,
    file: Option<String>,
) -> Result<(), String> {
    open_folder_window_sync(&app, &targets, path, file)
}

#[tauri::command]
fn take_initial_folder(
    window: tauri::WebviewWindow,
    targets: State<'_, Mutex<InitialTargets>>,
) -> Result<Option<String>, String> {
    Ok(targets.lock().map_err(|e| e.to_string())?.folders.remove(window.label()))
}

#[tauri::command]
fn take_initial_file(
    window: tauri::WebviewWindow,
    targets: State<'_, Mutex<InitialTargets>>,
) -> Result<Option<String>, String> {
    Ok(targets.lock().map_err(|e| e.to_string())?.files.remove(window.label()))
}

#[tauri::command]
fn toggle_maximize_window(window: tauri::WebviewWindow) -> Result<(), String> {
    if window.is_maximized().map_err(|e| e.to_string())? {
        window.unmaximize().map_err(|e| e.to_string())?;
    } else {
        window.maximize().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
async fn list_directory(path: String) -> Result<directory::Listing, String> {
    tauri::async_runtime::spawn_blocking(move || directory::list(&PathBuf::from(path)))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn save_png(request: tauri::ipc::Request<'_>) -> Result<(), String> {
    let path = request
        .headers()
        .get("x-export-path")
        .and_then(|header| header.to_str().ok())
        .ok_or("The export path is missing.")?;
    let path = percent_encoding::percent_decode_str(path)
        .decode_utf8()
        .map_err(|e| e.to_string())?
        .into_owned();
    let bytes = match request.body() {
        tauri::ipc::InvokeBody::Raw(bytes) if bytes.len() <= export::BYTE_LIMIT => bytes.clone(),
        _ => return Err("Use bounded binary PNG bytes for export.".into()),
    };
    tauri::async_runtime::spawn_blocking(move || export::save(&PathBuf::from(path), &bytes))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn copy_image(
    app: tauri::AppHandle,
    request: tauri::ipc::Request<'_>,
) -> Result<String, String> {
    let id = request
        .headers()
        .get("x-document-id")
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.parse::<u64>().ok())
        .ok_or("The document ID is missing.")?;
    let encoded = request
        .headers()
        .get("x-document-path")
        .and_then(|value| value.to_str().ok())
        .ok_or("The document path is missing.")?;
    let expected = percent_encoding::percent_decode_str(encoded)
        .decode_utf8()
        .map_err(|e| e.to_string())?
        .into_owned();
    let (path, generation) = with_document(&app.state::<Mutex<Documents>>(), Some(id), |doc| {
        let path = doc
            .path
            .clone()
            .ok_or("Save the document before copying an image.")?;
        if path.to_str() != Some(expected.as_str()) {
            return Err("The document changed. Choose the image again.".into());
        }
        if doc.uncertain {
            return Err("Check the last save before copying an image.".into());
        }
        Ok((path, doc.generation))
    })?;
    let bytes = match request.body() {
        tauri::ipc::InvokeBody::Raw(bytes) if bytes.len() <= LIMIT => bytes.clone(),
        _ => return Err("Use bounded binary image bytes.".into()),
    };
    tauri::async_runtime::spawn_blocking(move || {
        assets::copy_for_document(
            &app.state::<Mutex<Documents>>(),
            id,
            generation,
            &path,
            &bytes,
        )
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
fn quit_ready(gate: State<Mutex<quit::Gate>>) -> Result<Option<u64>, String> {
    gate.lock().map_err(|e| e.to_string())?.ready()
}

#[tauri::command]
fn resolve_quit(
    app: tauri::AppHandle,
    request: u64,
    allow: bool,
    gate: State<Mutex<quit::Gate>>,
    host: State<Mutex<Documents>>,
) -> Result<(), String> {
    let document = host.lock().map_err(|e| e.to_string())?;
    gate.lock()
        .map_err(|e| e.to_string())?
        .confirm(request, allow, document.uncertain()?)?;
    drop(document);
    if allow {
        app.exit(0);
    }
    Ok(())
}

fn with_recovery<T>(
    host: &RecoveryState,
    action: impl FnOnce(&mut recovery::Documents) -> Result<T, String>,
) -> Result<T, String> {
    let mut guard = host.lock().map_err(|e| e.to_string())?;
    action(guard.as_mut().map_err(|e| e.clone())?)
}
#[tauri::command]
fn recovery_start(
    app: tauri::AppHandle,
    host: State<RecoveryState>,
    documents: State<Mutex<Documents>>,
    document: Option<u64>,
) -> Result<recovery::Listing, String> {
    with_document(&documents, document, |_| {
        let mut guard = host.lock().map_err(|e| e.to_string())?;
        if guard.is_err() {
            *guard = app
                .path()
                .app_data_dir()
                .map_err(|e| e.to_string())
                .and_then(|path| recovery::Documents::new(path.join("recovery")));
        }
        guard
            .as_mut()
            .map_err(|e| e.clone())?
            .start_renderer_for(document.unwrap_or(0))
    })
}
#[tauri::command]
fn recovery_list(
    document: Option<u64>,
    host: State<RecoveryState>,
    documents: State<Mutex<Documents>>,
) -> Result<recovery::Listing, String> {
    with_document(&documents, document, |_| {
        with_recovery(&host, |store| store.listing(document))
    })
}
#[tauri::command]
fn recovery_document(
    document: u64,
    host: State<RecoveryState>,
    documents: State<Mutex<Documents>>,
) -> Result<recovery::Listing, String> {
    with_document(&documents, Some(document), |_| {
        with_recovery(&host, |store| store.open(document))
    })
}
#[tauri::command]
fn recovery_copy(
    id: String,
    document: Option<u64>,
    host: State<RecoveryState>,
    documents: State<Mutex<Documents>>,
) -> Result<recovery::Snapshot, String> {
    with_document(&documents, document, |_| {
        with_recovery(&host, |store| store.copy(document, &id))
    })
}
#[tauri::command]
fn recovery_discard(
    id: String,
    document: Option<u64>,
    host: State<RecoveryState>,
    documents: State<Mutex<Documents>>,
) -> Result<(), String> {
    with_document(&documents, document, |_| {
        with_recovery(&host, |store| store.discard(document, &id))
    })
}
#[tauri::command]
fn recovery_discard_all(
    document: Option<u64>,
    host: State<RecoveryState>,
    documents: State<Mutex<Documents>>,
) -> Result<(), String> {
    with_document(&documents, document, |_| {
        with_recovery(&host, |store| store.discard_all(document))
    })
}
#[tauri::command]
fn recovery_checkpoint(
    session: String,
    revision: u64,
    source: String,
    label: String,
    dirty: bool,
    document: Option<u64>,
    host: State<RecoveryState>,
    documents: State<Mutex<Documents>>,
) -> Result<(), String> {
    with_document(&documents, document, |_| {
        with_recovery(&host, |store| {
            store.checkpoint(document, &session, revision, source, label, dirty)
        })
    })
}

const LIMIT: usize = 8 * 1024 * 1024;
#[derive(Debug, Serialize, PartialEq)]
#[serde(tag = "kind", rename_all = "snake_case")]
enum FileObservation {
    Unchanged,
    Changed,
    Uncertain,
    Unavailable { message: String },
}
#[derive(Serialize)]
struct FileStatus {
    generation: u64,
    #[serde(flatten)]
    observation: FileObservation,
}
fn observe_file(path: Option<PathBuf>, baseline: &[u8], uncertain: bool) -> FileObservation {
    if uncertain {
        return FileObservation::Uncertain;
    }
    let Some(path) = path else {
        return FileObservation::Unchanged;
    };
    match read(&path) {
        Ok(bytes) if bytes == baseline => FileObservation::Unchanged,
        Ok(_) => FileObservation::Changed,
        Err(message) => FileObservation::Unavailable { message },
    }
}
#[tauri::command]
async fn file_status(
    document: Option<u64>,
    host: State<'_, Mutex<Documents>>,
) -> Result<FileStatus, String> {
    let (path, baseline, uncertain, generation) = with_document(&host, document, |doc| {
        Ok((
            doc.path.clone(),
            doc.baseline.clone(),
            doc.uncertain,
            doc.generation,
        ))
    })?;
    let status = tauri::async_runtime::spawn_blocking(move || FileStatus {
        generation,
        observation: observe_file(path, &baseline, uncertain),
    })
    .await
    .map_err(|e| e.to_string())?;
    documents::current(&host, document, generation)?;
    Ok(status)
}
fn next_generation(doc: &Document) -> Result<u64, String> {
    doc.generation
        .checked_add(1)
        .ok_or("Document generation limit.".into())
}
// The family names of the fonts installed in the system, sorted and without repeats. The page cannot list
// them itself, and the Settings font choices need them.
fn installed_font_families() -> Vec<String> {
    let mut database = fontdb::Database::new();
    database.load_system_fonts();
    let mut names = std::collections::BTreeSet::new();
    for face in database.faces() {
        for (family, _) in &face.families {
            let name = family.trim();
            if !name.is_empty() && !name.starts_with('.') {
                names.insert(name.to_string());
            }
        }
    }
    names.into_iter().collect()
}

#[tauri::command]
async fn list_fonts() -> Result<Vec<String>, String> {
    tauri::async_runtime::spawn_blocking(installed_font_families)
        .await
        .map_err(|error| error.to_string())
}

// The macOS web view ignores window.print(). Its own print call opens the system print dialog and returns
// when the dialog closes. Other web views print from the page, so they never call this.
#[tauri::command]
async fn print_page(window: tauri::WebviewWindow) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        window.print().map_err(|error| error.to_string())
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = window;
        Err("This web view prints from the page.".into())
    }
}

// WebKitGTK sends an image-only paste to the page with empty clipboard data, so the page cannot read a
// copied image. On Linux the host reads the clipboard image and returns it as PNG bytes (empty when the
// clipboard holds no image). The other web views give the page the image in the paste event.
#[cfg(target_os = "linux")]
fn clipboard_png() -> Option<Vec<u8>> {
    let clipboard = gtk::Clipboard::get(&gtk::gdk::SELECTION_CLIPBOARD);
    let pixbuf = clipboard.wait_for_image()?;
    pixbuf.save_to_bufferv("png", &[]).ok()
}

#[tauri::command]
async fn read_clipboard_image(app: tauri::AppHandle) -> Result<tauri::ipc::Response, String> {
    #[cfg(target_os = "linux")]
    {
        let (sender, receiver) = std::sync::mpsc::channel();
        app.run_on_main_thread(move || { let _ = sender.send(clipboard_png()); })
            .map_err(|error| error.to_string())?;
        let png = tauri::async_runtime::spawn_blocking(move || receiver.recv().ok().flatten())
            .await
            .map_err(|error| error.to_string())?;
        return Ok(tauri::ipc::Response::new(png.unwrap_or_default()));
    }
    #[cfg(not(target_os = "linux"))]
    {
        let _ = app;
        Ok(tauri::ipc::Response::new(Vec::<u8>::new()))
    }
}

#[tauri::command]
async fn read_image(
    destination: String,
    document_path: String,
    document: Option<u64>,
    host: State<'_, Mutex<Documents>>,
) -> Result<tauri::ipc::Response, String> {
    let (path, generation) = with_document(&host, document, |doc| {
        if doc
            .path
            .as_ref()
            .and_then(|path| path.to_str())
            .unwrap_or("")
            != document_path
        {
            return Err("The document changed. Load the image again.".into());
        }
        Ok((
            images::resolve(&destination, doc.path.as_ref())?,
            doc.generation,
        ))
    })?;
    let bytes = tauri::async_runtime::spawn_blocking(move || {
        let bytes = read(&path)?;
        images::validate(&bytes)?;
        Ok::<_, String>(bytes)
    })
    .await
    .map_err(|error| error.to_string())??;
    documents::current(&host, document, generation)?;
    Ok(tauri::ipc::Response::new(bytes))
}
#[derive(Serialize)]
struct Opened {
    source: String,
    path: String,
}
#[derive(Debug, Serialize)]
struct SaveError {
    message: String,
    uncertain: bool,
}

fn read(path: &PathBuf) -> Result<Vec<u8>, String> {
    if !fs::metadata(path).map_err(|e| e.to_string())?.is_file() {
        return Err("Select a regular file.".into());
    }
    let mut options = fs::OpenOptions::new();
    options.read(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        options.custom_flags(libc::O_NONBLOCK);
    }
    let file = options.open(path).map_err(|e| e.to_string())?;
    let before = file.metadata().map_err(|e| e.to_string())?;
    if !before.is_file() {
        return Err("Select a regular file.".into());
    }
    if before.len() > LIMIT as u64 {
        return Err("The file exceeds the 8 MiB limit.".into());
    }
    let mut bytes = Vec::new();
    (&file)
        .take(LIMIT as u64 + 1)
        .read_to_end(&mut bytes)
        .map_err(|e| e.to_string())?;
    if bytes.len() > LIMIT {
        return Err("The file exceeds the 8 MiB limit.".into());
    }
    let after = file.metadata().map_err(|e| e.to_string())?;
    if before.len() != after.len() || before.modified().ok() != after.modified().ok() {
        return Err("The file changed during the read.".into());
    }
    #[cfg(unix)]
    {
        use std::os::unix::fs::MetadataExt;
        let current = fs::metadata(path).map_err(|e| e.to_string())?;
        if after.dev() != current.dev() || after.ino() != current.ino() {
            return Err("The file was replaced during the read.".into());
        }
    }
    Ok(bytes)
}

fn sync_parent(path: &PathBuf) -> Result<(), String> {
    #[cfg(unix)]
    fs::File::open(path.parent().ok_or("No parent folder.")?)
        .and_then(|directory| directory.sync_all())
        .map_err(|e| e.to_string())?;
    Ok(())
}

fn create_file_in_dir(parent: &str, name: Option<&str>) -> Result<String, String> {
    let parent_path = fs::canonicalize(PathBuf::from(parent)).map_err(|e| e.to_string())?;
    if !parent_path.is_dir() {
        return Err("Parent is not a directory.".into());
    }
    let target_name = if let Some(n) = name.filter(|s| !s.trim().is_empty()) {
        let trimmed = n.trim();
        if trimmed.ends_with(".md") {
            trimmed.to_string()
        } else {
            format!("{trimmed}.md")
        }
    } else {
        let base = "Untitled.md";
        if !parent_path.join(base).exists() {
            base.to_string()
        } else {
            let mut index = 1;
            loop {
                let candidate = format!("Untitled {index}.md");
                if !parent_path.join(&candidate).exists() {
                    break candidate;
                }
                index += 1;
            }
        }
    };
    let target_path = parent_path.join(&target_name);
    if target_path.exists() {
        return Err("File already exists.".into());
    }
    fs::File::create(&target_path).map_err(|e| e.to_string())?;
    sync_parent(&target_path).ok();
    target_path
        .to_str()
        .ok_or_else(|| "Invalid UTF-8 path.".to_string())
        .map(|s| s.to_string())
}

#[tauri::command]
async fn create_file(parent: String, name: Option<String>) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        create_file_in_dir(&parent, name.as_deref())
    })
    .await
    .map_err(|e| e.to_string())?
}

fn rename_file_sync(
    old_path: &str,
    new_path: &str,
    host: &Mutex<Documents>,
) -> Result<(), String> {
    let old_buf = fs::canonicalize(PathBuf::from(old_path)).map_err(|e| e.to_string())?;
    let new_buf = PathBuf::from(new_path);
    if !old_buf.exists() {
        return Err("Source file does not exist.".into());
    }
    if new_buf.exists() {
        return Err("Destination file already exists.".into());
    }
    let parent = new_buf
        .parent()
        .ok_or_else(|| "Destination has no parent directory.".to_string())?;
    if !parent.exists() {
        return Err("Destination parent directory does not exist.".to_string());
    }

    let registry = host.lock().map_err(|e| e.to_string())?;
    let ids = registry.ids();
    let mut matching_docs = Vec::new();
    for id in ids {
        if let Ok(slot) = registry.get(Some(id)) {
            if let Ok(doc) = slot.lock() {
                if doc.path.as_ref() == Some(&old_buf) {
                    if doc.uncertain {
                        return Err("Check the last save before renaming this file.".into());
                    }
                    matching_docs.push(slot.clone());
                }
            }
        }
    }
    drop(registry);

    fs::rename(&old_buf, &new_buf).map_err(|e| e.to_string())?;
    sync_parent(&new_buf).ok();

    let canonical_new = fs::canonicalize(&new_buf).unwrap_or(new_buf);

    for slot in matching_docs {
        if let Ok(mut doc) = slot.lock() {
            doc.path = Some(canonical_new.clone());
            if let Ok(gen) = next_generation(&doc) {
                doc.generation = gen;
            }
        }
    }

    Ok(())
}

#[tauri::command]
fn rename_file(
    old_path: String,
    new_path: String,
    host: State<Mutex<Documents>>,
) -> Result<(), String> {
    rename_file_sync(&old_path, &new_path, &host)
}

#[tauri::command]
fn record_closed_file(
    app: tauri::AppHandle,
    path: String,
    store: State<recent::RecentStore>,
) -> Result<(), String> {
    let mut guard = store.state.lock().map_err(|e| e.to_string())?;
    guard.push_closed(&path);
    guard.save(&store.file_path)?;
    menu::refresh_recent_menu(&app, &guard).map_err(|e| e.to_string())?;
    Ok(())
}

fn delete_path_on_disk(p: &Path) -> Result<(), String> {
    if !p.exists() {
        return Err("File or folder does not exist.".into());
    }
    let s = p.to_string_lossy();
    if s.trim().is_empty() || s == "/" || s == "\\" {
        return Err("Cannot delete root directory.".into());
    }
    if p.is_dir() {
        fs::remove_dir_all(p).map_err(|e| e.to_string())?;
    } else {
        fs::remove_file(p).map_err(|e| e.to_string())?;
    }
    Ok(())
}

// An open document keeps working after its file is deleted. It loses the path,
// so a later save asks for a new one. The generation change retires stale checks.
fn detach_deleted_documents(host: &Mutex<Documents>, deleted: &Path) -> Result<(), String> {
    let registry = host.lock().map_err(|e| e.to_string())?;
    for id in registry.ids() {
        let Ok(slot) = registry.get(Some(id)) else { continue };
        let Ok(mut doc) = slot.lock() else { continue };
        if doc.path.as_ref().is_some_and(|open| open.starts_with(deleted)) {
            doc.path = None;
            doc.uncertain = false;
            doc.generation = next_generation(&doc)?;
        }
    }
    Ok(())
}

// Open documents keep canonical paths, while the Files list keeps the path as the folder was
// opened. The renderer asks for the canonical spelling to match one to the other.
#[tauri::command]
fn canonical_path(path: String) -> Result<String, String> {
    fs::canonicalize(PathBuf::from(&path))
        .map_err(|e| e.to_string())?
        .to_str()
        .map(str::to_string)
        .ok_or_else(|| "Invalid UTF-8 path.".to_string())
}

#[tauri::command]
async fn delete_path(
    app: tauri::AppHandle,
    recent: State<'_, recent::RecentStore>,
    host: State<'_, Mutex<Documents>>,
    path: String,
) -> Result<(), String> {
    let p = PathBuf::from(&path);
    // Resolve the path first: open documents keep canonical paths.
    let canonical = fs::canonicalize(&p).unwrap_or_else(|_| p.clone());
    tauri::async_runtime::spawn_blocking(move || delete_path_on_disk(&p))
        .await
        .map_err(|e| e.to_string())??;
    detach_deleted_documents(&host, &canonical)?;

    if let Ok(mut guard) = recent.state.lock() {
        guard.remove_path(&path);
        let _ = guard.save(&recent.file_path);
        let _ = menu::refresh_recent_menu(&app, &guard);
    }
    Ok(())
}

#[tauri::command]
fn update_menu_state(
    app: tauri::AppHandle,
    theme: Option<String>,
    source_mode: Option<bool>,
    outline: Option<bool>,
    language: Option<String>,
) -> Result<(), String> {
    if let Some(t) = theme {
        menu::update_theme_checks(&app, &t).map_err(|e| e.to_string())?;
    }
    if let Some(sm) = source_mode {
        menu::set_check_item_state(&app, "markdew-source-mode", sm).map_err(|e| e.to_string())?;
    }
    if let Some(o) = outline {
        menu::set_check_item_state(&app, "markdew-toggle-outline", o).map_err(|e| e.to_string())?;
    }
    if let Some(l) = language {
        menu::update_menu_language(&app, &l).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn add_recent_file(
    app: tauri::AppHandle,
    path: String,
    store: State<recent::RecentStore>,
) -> Result<(), String> {
    record_recent_path(&app, &path, &store)
}

#[tauri::command]
fn get_recent_files(store: State<recent::RecentStore>) -> Result<Vec<String>, String> {
    let guard = store.state.lock().map_err(|e| e.to_string())?;
    Ok(guard.files.clone())
}

#[tauri::command]
fn clear_recent_files(
    app: tauri::AppHandle,
    store: State<recent::RecentStore>,
) -> Result<(), String> {
    let mut guard = store.state.lock().map_err(|e| e.to_string())?;
    guard.clear();
    guard.save(&store.file_path)?;
    menu::refresh_recent_menu(&app, &guard).map_err(|e| e.to_string())?;
    Ok(())
}



fn reset(doc: &mut Document) -> Result<(), String> {
    if doc.uncertain {
        return Err("Check the last save before you create a document.".into());
    }
    *doc = Document {
        generation: next_generation(doc)?,
        ..Document::default()
    };
    Ok(())
}

#[tauri::command]
fn new_document(document: Option<u64>, host: State<Mutex<Documents>>) -> Result<(), String> {
    with_document(&host, document, reset)
}

#[tauri::command]
fn create_document(host: State<Mutex<Documents>>) -> Result<u64, String> {
    host.lock().map_err(|error| error.to_string())?.create()
}

#[derive(Serialize)]
struct DocumentInfo {
    id: u64,
    path: String,
    baseline: String,
    uncertain: bool,
}
fn live_documents(host: &Mutex<Documents>) -> Result<Vec<DocumentInfo>, String> {
    let mut registry = host.lock().map_err(|error| error.to_string())?;
    if registry.ids().is_empty() {
        registry.create()?;
    }
    registry
        .ids()
        .into_iter()
        .map(|id| {
            let slot = registry.get(Some(id))?;
            let doc = slot.lock().map_err(|error| error.to_string())?;
            Ok(DocumentInfo {
                id,
                path: doc
                    .path
                    .as_ref()
                    .map(|path| path.to_str().ok_or("Invalid document path."))
                    .transpose()?
                    .unwrap_or("")
                    .to_owned(),
                baseline: String::from_utf8(doc.baseline.clone())
                    .map_err(|_| "Invalid document baseline.")?,
                uncertain: doc.uncertain,
            })
        })
        .collect()
}
#[tauri::command]
fn document_list(host: State<Mutex<Documents>>) -> Result<Vec<DocumentInfo>, String> {
    live_documents(&host)
}

#[derive(Serialize)]
struct RecoveryToken {
    document: u64,
    session: String,
    revision: u64,
}
#[derive(Serialize)]
struct DocumentStartup {
    documents: Vec<DocumentInfo>,
    sessions: Vec<RecoveryToken>,
    recovery: recovery::Listing,
}
#[tauri::command]
fn document_start(
    app: tauri::AppHandle,
    window: tauri::WebviewWindow,
    host: State<Mutex<Documents>>,
    recovery: State<RecoveryState>,
) -> Result<DocumentStartup, String> {
    if window.label() != "main" {
        return start_secondary_window_document(&host, &recovery, || {
            app.path()
                .app_data_dir()
                .map_err(|error| error.to_string())
                .map(|path| path.join("recovery"))
        });
    }
    start_documents(&host, &recovery, || {
        app.path()
            .app_data_dir()
            .map_err(|error| error.to_string())
            .map(|path| path.join("recovery"))
    })
}

fn start_secondary_window_document(
    host: &Mutex<Documents>,
    recovery: &RecoveryState,
    root: impl FnOnce() -> Result<PathBuf, String>,
) -> Result<DocumentStartup, String> {
    let mut registry = host.lock().map_err(|error| error.to_string())?;
    let id = registry.create()?;
    let slot = registry.get(Some(id))?;
    let doc = slot.lock().map_err(|error| error.to_string())?;
    let documents = vec![DocumentInfo {
        id,
        path: doc
            .path
            .as_ref()
            .map(|path| path.to_str().ok_or("Invalid document path."))
            .transpose()?
            .unwrap_or("")
            .to_owned(),
        baseline: String::from_utf8(doc.baseline.clone())
            .map_err(|_| "Invalid document baseline.")?,
        uncertain: doc.uncertain,
    }];
    drop(doc);
    drop(registry);

    let mut guard = recovery.lock().map_err(|error| error.to_string())?;
    if guard.is_err() {
        *guard = root().and_then(recovery::Documents::new);
    }
    let store = guard.as_mut().map_err(|error| error.clone())?;
    let listing = store.open(id)?;
    let (session, revision) = store.token(id)?;
    let sessions = vec![RecoveryToken {
        document: id,
        session,
        revision,
    }];
    Ok(DocumentStartup {
        documents,
        sessions,
        recovery: listing,
    })
}
fn start_documents(
    host: &Mutex<Documents>,
    recovery: &RecoveryState,
    root: impl FnOnce() -> Result<PathBuf, String>,
) -> Result<DocumentStartup, String> {
    let mut registry = host.lock().map_err(|error| error.to_string())?;
    if registry.ids().is_empty() {
        registry.create()?;
    }
    let ids = registry.ids();
    let slots: Vec<_> = ids
        .iter()
        .map(|id| registry.get(Some(*id)))
        .collect::<Result<_, _>>()?;
    let docs: Vec<_> = slots
        .iter()
        .map(|slot| slot.lock().map_err(|error| error.to_string()))
        .collect::<Result<_, _>>()?;
    let documents = ids
        .iter()
        .zip(docs.iter())
        .map(|(id, doc)| {
            Ok(DocumentInfo {
                id: *id,
                path: doc
                    .path
                    .as_ref()
                    .map(|path| path.to_str().ok_or("Invalid document path."))
                    .transpose()?
                    .unwrap_or("")
                    .to_owned(),
                baseline: String::from_utf8(doc.baseline.clone())
                    .map_err(|_| "Invalid document baseline.")?,
                uncertain: doc.uncertain,
            })
        })
        .collect::<Result<Vec<_>, String>>()?;
    let mut guard = recovery.lock().map_err(|error| error.to_string())?;
    if guard.is_err() {
        *guard = root().and_then(recovery::Documents::new);
    }
    let store = guard.as_mut().map_err(|error| error.clone())?;
    let listing = store.start_documents(&ids)?;
    let sessions = ids
        .iter()
        .map(|id| {
            let (session, revision) = store.token(*id)?;
            Ok(RecoveryToken {
                document: *id,
                session,
                revision,
            })
        })
        .collect::<Result<_, String>>()?;
    Ok(DocumentStartup {
        documents,
        sessions,
        recovery: listing,
    })
}

#[tauri::command]
fn retire_document(
    document: u64,
    session: String,
    revision: u64,
    host: State<Mutex<Documents>>,
    recovery: State<RecoveryState>,
) -> Result<(), String> {
    retire_recovered(&host, &recovery, document, &session, revision)
}
fn retire_recovered(
    host: &Mutex<Documents>,
    recovery: &RecoveryState,
    document: u64,
    session: &str,
    revision: u64,
) -> Result<(), String> {
    let mut registry = host.lock().map_err(|error| error.to_string())?;
    // Keep recovery locked through registry removal. Lock order is registry,
    // document, recovery; checkpoints use document then recovery.
    let mut recovery_guard = None;
    registry.retire_with(document, || {
        let mut guard = recovery.lock().map_err(|error| error.to_string())?;
        guard
            .as_mut()
            .map_err(|error| error.clone())?
            .retire(document, session, revision)?;
        recovery_guard = Some(guard);
        Ok(())
    })
}

#[tauri::command]
fn open_document(
    path: String,
    document: Option<u64>,
    host: State<Mutex<Documents>>,
) -> Result<Opened, String> {
    with_document(&host, document, |doc| {
        load_document(doc, PathBuf::from(path), read)
    })
}
fn load_document(
    doc: &mut Document,
    requested: PathBuf,
    reader: impl FnOnce(&PathBuf) -> Result<Vec<u8>, String>,
) -> Result<Opened, String> {
    if doc.uncertain {
        return Err("Check the last save before you open another file.".into());
    }
    let path = fs::canonicalize(requested).map_err(|e| e.to_string())?;
    let bytes = reader(&path)?;
    let source = String::from_utf8(bytes.clone()).map_err(|_| "The file is not valid UTF-8.")?;
    let display_path = path
        .to_str()
        .ok_or("The native path is not valid UTF-8.")?
        .to_owned();
    doc.generation = next_generation(doc)?;
    doc.path = Some(path.clone());
    doc.baseline = bytes;
    Ok(Opened {
        source,
        path: display_path,
    })
}

fn save_with(
    doc: &mut Document,
    path: PathBuf,
    bytes: &[u8],
    confirm: impl FnOnce(&PathBuf, &[u8]) -> Result<(), String>,
) -> Result<(), String> {
    if doc.uncertain {
        return Err("Check the last save before you save again.".into());
    }
    if bytes.len() > LIMIT {
        return Err("The document exceeds the 8 MiB limit.".into());
    }
    let generation = next_generation(doc)?;
    let same = doc.path.as_ref() == Some(&path);
    if same && read(&path)? != doc.baseline {
        return Err("The file changed on disk. Save to a new file.".into());
    }
    if !same && path.exists() {
        return Err("The destination exists. Select a new file name.".into());
    }
    let parent = path
        .parent()
        .ok_or("The destination has no parent folder.")?;
    let mut pending = tempfile::NamedTempFile::new_in(parent).map_err(|e| e.to_string())?;
    pending.write_all(bytes).map_err(|e| e.to_string())?;
    if same {
        pending
            .as_file()
            .set_permissions(
                fs::metadata(&path)
                    .map_err(|e| e.to_string())?
                    .permissions(),
            )
            .map_err(|e| e.to_string())?;
    }
    pending.as_file().sync_all().map_err(|e| e.to_string())?;
    if same {
        if read(&path)? != doc.baseline {
            return Err("The file changed during Save. Save to a new file.".into());
        }
        pending.persist(&path).map_err(|e| e.to_string())?;
    } else {
        pending
            .persist_noclobber(&path)
            .map_err(|e| e.to_string())?;
    }
    doc.path = Some(path.clone());
    doc.baseline = bytes.to_vec();
    doc.generation = generation;
    doc.uncertain = true;
    // Publication has occurred. A later failure must not be reported as an unchanged file.
    confirm(&path, bytes)?;
    doc.uncertain = false;
    Ok(())
}

fn confirm_save(path: &PathBuf, bytes: &[u8]) -> Result<(), String> {
    sync_parent(path)?;
    if read(path)? != bytes {
        return Err("The file differs from the last save. Keep this window open.".into());
    }
    Ok(())
}

fn save(doc: &mut Document, path: PathBuf, bytes: &[u8]) -> Result<(), String> {
    save_with(doc, path, bytes, confirm_save)
}

#[tauri::command]
fn save_document(
    path: String,
    source: String,
    document: Option<u64>,
    host: State<Mutex<Documents>>,
) -> Result<(), SaveError> {
    let registry = host.lock().map_err(|e| SaveError {
        message: e.to_string(),
        uncertain: true,
    })?;
    let slot = registry.get(document).map_err(|message| SaveError {
        message,
        uncertain: false,
    })?;
    let mut doc = slot.lock().map_err(|e| SaveError {
        message: e.to_string(),
        uncertain: true,
    })?;
    drop(registry);
    let result = (|| {
        let requested = PathBuf::from(path);
        let path = if requested.exists() {
            fs::canonicalize(requested).map_err(|e| e.to_string())?
        } else {
            fs::canonicalize(
                requested
                    .parent()
                    .ok_or("The destination has no parent folder.")?,
            )
            .map_err(|e| e.to_string())?
            .join(requested.file_name().ok_or("The file name is missing.")?)
        };
        path.to_str().ok_or("The native path is not valid UTF-8.")?;
        save(&mut doc, path, source.as_bytes())
    })();
    result.map_err(|message| SaveError {
        message,
        uncertain: doc.uncertain,
    })
}

#[tauri::command]
fn check_save(document: Option<u64>, host: State<Mutex<Documents>>) -> Result<(), String> {
    with_document(&host, document, |doc| reconcile(doc, confirm_save))
}

fn reconcile(
    doc: &mut Document,
    confirm: impl FnOnce(&PathBuf, &[u8]) -> Result<(), String>,
) -> Result<(), String> {
    if !doc.uncertain {
        return Ok(());
    }
    let generation = next_generation(doc)?;
    confirm(doc.path.as_ref().ok_or("No saved file.")?, &doc.baseline)?;
    doc.uncertain = false;
    doc.generation = generation;
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(updater::Pending::default())
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_opener::Builder::new()
                .open_js_links_on_click(false)
                .build(),
        )
        .manage(Mutex::new(Documents::default()))
        .manage(Mutex::new(quit::Gate::default()))
        .manage(Mutex::new(InitialTargets::default()))
        .manage({
            let mut queue = open_requests::Queue::default();
            queue.arguments(
                std::env::args_os().skip(1),
                std::env::current_dir().ok().as_deref(),
            );
            Mutex::new(queue)
        })
        .menu(menu::build)
        .on_menu_event(|app, event| {
            let id = event.id().as_ref();
            if id == menu::REOPEN_CLOSED_ID {
                if let Some(store) = app.try_state::<recent::RecentStore>() {
                    let path_opt = if let Ok(mut guard) = store.state.lock() {
                        let popped = guard.pop_closed();
                        let _ = guard.save(&store.file_path);
                        let _ = menu::refresh_recent_menu(app, &guard);
                        popped
                    } else {
                        None
                    };
                    if let Some(path) = path_opt {
                        let path_buf = PathBuf::from(&path);
                        let target = app
                            .webview_windows()
                            .into_iter()
                            .find(|(_, w)| w.is_focused().unwrap_or(false))
                            .map(|(label, _)| label)
                            .or_else(|| app.get_webview_window("main").map(|w| w.label().to_string()))
                            .or_else(|| app.webview_windows().into_iter().next().map(|(label, _)| label));
                        if let Some(label) = target {
                            let _ = app.emit_to(
                                &label,
                                "markdew-open-request",
                                open_requests::Batch {
                                    paths: vec![path],
                                    warnings: vec![],
                                },
                            );
                        } else {
                            let targets = app.state::<Mutex<InitialTargets>>();
                            let containing_folder = path_buf.parent().and_then(|p| p.to_str()).unwrap_or("").to_string();
                            let _ = open_folder_window_sync(app, &targets, containing_folder, Some(path));
                        }
                    }
                }
                return;
            }
            if id == menu::CLEAR_RECENT_ID {
                if let Some(store) = app.try_state::<recent::RecentStore>() {
                    if let Ok(mut guard) = store.state.lock() {
                        guard.clear();
                        let _ = guard.save(&store.file_path);
                        let _ = menu::refresh_recent_menu(app, &guard);
                    }
                }
                return;
            }
            if let Some(path) = id.strip_prefix(menu::RECENT_FOLDER_PREFIX) {
                let targets = app.state::<Mutex<InitialTargets>>();
                if let Err(error) = open_folder_window_sync(app, &targets, path.to_string(), None) {
                    eprintln!("Cannot open folder window: {error}");
                }
                return;
            }
            let file_path = id
                .strip_prefix(menu::RECENT_FILE_PREFIX)
                .or_else(|| id.strip_prefix(menu::RECENT_PREFIX));
            if let Some(path) = file_path {
                let path_buf = PathBuf::from(path);
                if path_buf.is_dir() {
                    let targets = app.state::<Mutex<InitialTargets>>();
                    if let Err(error) = open_folder_window_sync(app, &targets, path.to_string(), None) {
                        eprintln!("Cannot open folder window: {error}");
                    }
                } else {
                    let target = app
                        .webview_windows()
                        .into_iter()
                        .find(|(_, w)| w.is_focused().unwrap_or(false))
                        .map(|(label, _)| label)
                        .or_else(|| app.get_webview_window("main").map(|w| w.label().to_string()))
                        .or_else(|| app.webview_windows().into_iter().next().map(|(label, _)| label));
                    if let Some(label) = target {
                        let _ = app.emit_to(
                            &label,
                            "markdew-open-request",
                            open_requests::Batch {
                                paths: vec![path.to_string()],
                                warnings: vec![],
                            },
                        );
                    } else {
                        let targets = app.state::<Mutex<InitialTargets>>();
                        let containing_folder = path_buf.parent().and_then(|p| p.to_str()).unwrap_or("").to_string();
                        if let Err(error) = open_folder_window_sync(app, &targets, containing_folder, Some(path.to_string())) {
                            eprintln!("Cannot open folder window: {error}");
                        }
                    }
                }
                return;
            }
            if let Some(command) = menu::command(
                id,
                !app.webview_windows().is_empty(),
            ) {
                if command.starts_with("theme-") {
                    let mode = command.trim_start_matches("theme-");
                    let _ = menu::update_theme_checks(app, mode);
                    let _ = app.emit(menu::EVENT, command);
                } else {
                    let target = app
                        .webview_windows()
                        .into_iter()
                        .find(|(_, w)| w.is_focused().unwrap_or(false))
                        .map(|(label, _)| label)
                        .or_else(|| app.get_webview_window("main").map(|w| w.label().to_string()));
                    if let Some(label) = target {
                        if let Err(error) = app.emit_to(&label, menu::EVENT, command) {
                            eprintln!("Cannot send document command: {error}");
                        }
                    }
                }
            }
        })
        .setup(|app| {
            let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;
            let store = recovery::Documents::new(app_data.join("recovery"));
            app.manage(Mutex::new(store));
            let recent_store = recent::RecentStore::new(app_data.join("recent_files.json"));
            if let Ok(guard) = recent_store.state.lock() {
                let _ = menu::refresh_recent_menu(app.handle(), &guard);
            }
            app.manage(recent_store);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            updater::check_app_update,
            updater::install_app_update,
            resolve_document_link,
            open_web_link,
            list_directory,
            open_folder_window,
            take_initial_folder,
            take_initial_file,
            toggle_maximize_window,
            create_file,
            rename_file,
            delete_path,
            canonical_path,
            read_clipboard_image,
            print_page,
            list_fonts,
            pandoc::pandoc_check,
            pandoc::pandoc_export,
            pandoc::pandoc_import,
            pdf::export_pdf,
            update_menu_state,
            record_closed_file,
            add_recent_file,
            get_recent_files,
            clear_recent_files,
            open_document,
            new_document,
            create_document,
            document_list,
            document_start,
            retire_document,
            save_document,
            check_save,
            recovery_list,
            recovery_start,
            recovery_document,
            recovery_copy,
            recovery_discard,
            recovery_discard_all,
            recovery_checkpoint,
            file_status,
            read_image,
            copy_image,
            save_png,
            quit_ready,
            resolve_quit,
            take_open_requests
        ])
        .build(tauri::generate_context!())
        .expect("Cannot start MarkDew")
        .run(|app, event| {
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Opened { ref urls } = event {
                if let Ok(mut queue) = app.state::<Mutex<open_requests::Queue>>().lock() {
                    queue.urls(urls);
                    if let Err(error) = app.emit_to("main", open_requests::EVENT, ()) {
                        eprintln!("Cannot notify document Open: {error}");
                    }
                }
            }
            if let tauri::RunEvent::ExitRequested { api, code, .. } = event {
                if code == Some(tauri::RESTART_EXIT_CODE)
                    && updater::RESTART_READY.swap(false, std::sync::atomic::Ordering::SeqCst) {
                    return;
                }
                if updater::INSTALLING.lock().map(|active| *active).unwrap_or(true) {
                    api.prevent_exit();
                    return;
                }
                // Close has its own renderer guard. A destroyed last window can exit.
                if app.webview_windows().is_empty() {
                    return;
                }
                let gate = app.state::<Mutex<quit::Gate>>();
                let mut gate = match gate.lock() {
                    Ok(gate) => gate,
                    Err(_) => {
                        api.prevent_exit();
                        return;
                    }
                };
                if gate.consume(code) {
                    return;
                }
                api.prevent_exit();
                match gate.request() {
                    Ok(Some(request)) => {
                        if let Err(error) = app.emit_to("main", "markdew-quit-request", request) {
                            let _ = gate.resolve(request, false);
                            eprintln!("Cannot request Quit: {error}");
                        }
                    }
                    Ok(None) => (),
                    Err(error) => eprintln!("Cannot request Quit: {error}"),
                }
            }
        });
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn startup_enumerates_live_baselines_and_uncertainty_after_zero_retires() {
        let dir = tempfile::tempdir().unwrap();
        let host = Mutex::new(Documents::default());
        let recovery = Mutex::new(Ok(
            recovery::Documents::new(dir.path().to_path_buf()).unwrap()
        ));
        let id = host.lock().unwrap().create().unwrap();
        let exact = "\u{feff}日本語😀\r\na\rb\n";
        with_document(&host, Some(id), |doc| {
            doc.baseline = exact.as_bytes().to_vec();
            doc.uncertain = true;
            Ok(())
        })
        .unwrap();
        host.lock().unwrap().retire(0).unwrap();
        let old = with_recovery(&recovery, |store| store.open(id))
            .unwrap()
            .session;
        with_recovery(&recovery, |store| {
            store.checkpoint(
                Some(id),
                &old,
                1,
                "unsaved predecessor".into(),
                "file.md".into(),
                true,
            )
        })
        .unwrap();
        let startup = start_documents(&host, &recovery, || {
            panic!("Initialized store should not be replaced")
        })
        .unwrap();
        assert_eq!(startup.documents.len(), 1);
        assert_eq!(startup.documents[0].id, id);
        assert_eq!(startup.documents[0].baseline, exact);
        assert!(startup.documents[0].uncertain);
        assert_eq!(startup.sessions[0].document, id);
        assert_ne!(startup.sessions[0].session, old);
        assert!(startup.recovery.entries.iter().any(|entry| entry.id == old));
        assert_eq!(
            with_recovery(&recovery, |store| store.copy(Some(id), &old))
                .unwrap()
                .source,
            "unsaved predecessor"
        );
        assert!(with_recovery(&recovery, |store| store.checkpoint(
            Some(id),
            &old,
            2,
            "stale".into(),
            "".into(),
            true
        ))
        .is_err());
    }
    #[test]
    fn startup_creates_a_fresh_id_for_empty_registry_and_can_retry_store_failure() {
        let dir = tempfile::tempdir().unwrap();
        let host = Mutex::new(Documents::default());
        host.lock().unwrap().retire(0).unwrap();
        let recovery = Mutex::new(Err("initial failure".into()));
        assert!(start_documents(&host, &recovery, || Err("path failed".into())).is_err());
        let ids = host.lock().unwrap().ids();
        assert_eq!(ids.len(), 1);
        assert_ne!(ids[0], 0);
        let startup = start_documents(&host, &recovery, || Ok(dir.path().to_path_buf())).unwrap();
        assert_eq!(startup.documents[0].id, ids[0]);
        assert_eq!(startup.sessions[0].document, ids[0]);
        assert_eq!(startup.sessions[0].revision, 0);
    }
    #[test]
    fn invalid_startup_baseline_does_not_rotate_or_omit_a_document() {
        let dir = tempfile::tempdir().unwrap();
        let host = Mutex::new(Documents::default());
        let recovery = Mutex::new(Ok(
            recovery::Documents::new(dir.path().to_path_buf()).unwrap()
        ));
        let token = with_recovery(&recovery, |store| store.token(0)).unwrap();
        let id = host.lock().unwrap().create().unwrap();
        with_document(&host, Some(id), |doc| {
            doc.baseline = vec![255];
            doc.uncertain = true;
            Ok(())
        })
        .unwrap();
        assert!(start_documents(&host, &recovery, || panic!("Initialized store")).is_err());
        assert_eq!(
            with_recovery(&recovery, |store| store.token(0)).unwrap(),
            token
        );
        assert_eq!(host.lock().unwrap().ids().len(), 2);
        assert!(host.lock().unwrap().uncertain().unwrap());
    }
    #[cfg(unix)]
    #[test]
    fn invalid_startup_native_path_is_not_silently_untitled() {
        use std::os::unix::ffi::OsStringExt;
        let dir = tempfile::tempdir().unwrap();
        let host = Mutex::new(Documents::default());
        let recovery = Mutex::new(Ok(
            recovery::Documents::new(dir.path().to_path_buf()).unwrap()
        ));
        let token = with_recovery(&recovery, |store| store.token(0)).unwrap();
        with_document(&host, None, |doc| {
            doc.path = Some(PathBuf::from(std::ffi::OsString::from_vec(vec![255])));
            doc.uncertain = true;
            Ok(())
        })
        .unwrap();
        assert!(start_documents(&host, &recovery, || panic!("Initialized store")).is_err());
        assert_eq!(
            with_recovery(&recovery, |store| store.token(0)).unwrap(),
            token
        );
        assert!(host.lock().unwrap().uncertain().unwrap());
    }
    #[test]
    fn retirement_requires_its_current_clear_and_keeps_uncertain_documents() {
        let dir = tempfile::tempdir().unwrap();
        let host = Mutex::new(Documents::default());
        let recovery = Mutex::new(Ok(
            recovery::Documents::new(dir.path().to_path_buf()).unwrap()
        ));
        let id = host.lock().unwrap().create().unwrap();
        let session = with_document(&host, Some(id), |_| {
            with_recovery(&recovery, |store| store.open(id))
        })
        .unwrap()
        .session;
        assert!(retire_recovered(&host, &recovery, id, &session, 0).is_err());
        with_document(&host, Some(id), |_| {
            with_recovery(&recovery, |store| {
                store.checkpoint(Some(id), &session, 1, "".into(), "".into(), false)
            })
        })
        .unwrap();
        with_document(&host, Some(id), |doc| {
            doc.uncertain = true;
            Ok(())
        })
        .unwrap();
        assert!(retire_recovered(&host, &recovery, id, &session, 1).is_err());
        assert!(host.lock().unwrap().get(Some(id)).is_ok());
        assert_eq!(
            with_recovery(&recovery, |store| store.listing(Some(id)))
                .unwrap()
                .session,
            session
        );
        with_document(&host, Some(id), |doc| {
            doc.uncertain = false;
            Ok(())
        })
        .unwrap();
        assert!(retire_recovered(&host, &recovery, id, "wrong-session", 1).is_err());
        retire_recovered(&host, &recovery, id, &session, 1).unwrap();
        assert!(host.lock().unwrap().get(Some(id)).is_err());
        assert!(with_recovery(&recovery, |store| store.listing(Some(id))).is_err());
        assert!(
            with_document(&host, Some(id), |_| with_recovery(&recovery, |store| store
                .open(id)))
            .is_err()
        );
    }
    #[test]
    fn checkpoint_and_retirement_race_cannot_remove_later_dirty_source() {
        use std::sync::{Arc, Barrier};
        for _ in 0..16 {
            let dir = tempfile::tempdir().unwrap();
            let host = Arc::new(Mutex::new(Documents::default()));
            let recovery = Arc::new(Mutex::new(Ok(recovery::Documents::new(
                dir.path().to_path_buf(),
            )
            .unwrap())));
            let id = host.lock().unwrap().create().unwrap();
            let session = with_recovery(&recovery, |store| store.open(id))
                .unwrap()
                .session;
            with_recovery(&recovery, |store| {
                store.checkpoint(Some(id), &session, 1, "".into(), "".into(), false)
            })
            .unwrap();
            let barrier = Arc::new(Barrier::new(2));
            let writer_host = host.clone();
            let writer_recovery = recovery.clone();
            let writer_barrier = barrier.clone();
            let writer_session = session.clone();
            let writer = std::thread::spawn(move || {
                writer_barrier.wait();
                with_document(&writer_host, Some(id), |_| {
                    with_recovery(&writer_recovery, |store| {
                        store.checkpoint(
                            Some(id),
                            &writer_session,
                            2,
                            "latest input".into(),
                            "".into(),
                            true,
                        )
                    })
                })
            });
            barrier.wait();
            let retired = retire_recovered(&host, &recovery, id, &session, 1);
            let written = writer.join().unwrap();
            if retired.is_ok() {
                assert!(written.is_err());
                assert!(host.lock().unwrap().get(Some(id)).is_err());
            } else {
                written.unwrap();
                assert!(host.lock().unwrap().get(Some(id)).is_ok());
                assert_eq!(
                    with_recovery(&recovery, |store| store.copy(Some(id), &session))
                        .unwrap()
                        .source,
                    "latest input"
                );
            }
        }
    }
    #[test]
    fn document_ids_keep_exact_saves_and_conflicts_independent() {
        let dir = tempfile::tempdir().unwrap();
        let first_path = dir.path().join("first.md");
        let second_path = dir.path().join("second.md");
        let host = Mutex::new(Documents::default());
        let second = host.lock().unwrap().create().unwrap();
        let source = "\u{feff}日本語😀\r\na\rb\n";
        with_document(&host, None, |doc| {
            save(doc, first_path.clone(), source.as_bytes())
        })
        .unwrap();
        with_document(&host, Some(second), |doc| {
            save(doc, second_path.clone(), b"second\r\n")
        })
        .unwrap();
        fs::write(&first_path, b"external").unwrap();
        assert!(with_document(&host, None, |doc| save(
            doc,
            first_path.clone(),
            b"replacement"
        ))
        .is_err());
        with_document(&host, Some(second), |doc| {
            save(doc, second_path.clone(), b"second edit\r\n")
        })
        .unwrap();
        assert_eq!(fs::read(first_path).unwrap(), b"external");
        assert_eq!(fs::read(second_path).unwrap(), b"second edit\r\n");
        with_document(&host, None, |doc| {
            assert_eq!(doc.baseline, source.as_bytes());
            assert_eq!(doc.generation, 1);
            Ok(())
        })
        .unwrap();
        with_document(&host, Some(second), |doc| {
            assert_eq!(doc.baseline, b"second edit\r\n");
            assert_eq!(doc.generation, 2);
            Ok(())
        })
        .unwrap();
    }
    #[test]
    fn two_documents_for_one_path_do_not_share_save_authority() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("shared.md");
        fs::write(&path, b"original").unwrap();
        // IPC canonicalizes Save paths before it calls the shared save function.
        let path = fs::canonicalize(path).unwrap();
        let host = Mutex::new(Documents::default());
        let second = host.lock().unwrap().create().unwrap();
        for id in [None, Some(second)] {
            with_document(&host, id, |doc| load_document(doc, path.clone(), read)).unwrap();
        }
        with_document(&host, None, |doc| save(doc, path.clone(), b"first edit")).unwrap();
        assert!(with_document(&host, Some(second), |doc| save(
            doc,
            path.clone(),
            b"second edit"
        ))
        .is_err());
        assert_eq!(fs::read(&path).unwrap(), b"first edit");
        with_document(&host, Some(second), |doc| {
            assert_eq!(doc.baseline, b"original");
            assert!(!doc.uncertain);
            Ok(())
        })
        .unwrap();
    }
    #[test]
    fn inactive_document_uncertainty_blocks_quit_until_its_own_reconciliation() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("uncertain.md");
        let host = Mutex::new(Documents::default());
        let second = host.lock().unwrap().create().unwrap();
        assert!(with_document(&host, Some(second), |doc| save_with(
            doc,
            path.clone(),
            b"captured",
            |_, _| Err("sync failed".into())
        ))
        .is_err());
        let mut gate = quit::Gate::default();
        let request = gate.request().unwrap().unwrap();
        assert!(gate
            .confirm(request, true, host.lock().unwrap().uncertain().unwrap())
            .is_err());
        assert!(!gate.consume(Some(0)));
        assert!(host.lock().unwrap().retire(second).is_err());
        // Checking another document cannot resolve this document's uncertain Save.
        with_document(&host, None, |doc| reconcile(doc, confirm_save)).unwrap();
        assert!(host.lock().unwrap().uncertain().unwrap());
        with_document(&host, Some(second), |doc| reconcile(doc, confirm_save)).unwrap();
        gate.confirm(request, true, host.lock().unwrap().uncertain().unwrap())
            .unwrap();
        assert!(gate.consume(Some(0)));
    }
    #[test]
    fn file_observation_keeps_baseline_and_detects_changes_replacement_and_missing_file() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("source.md");
        let source = "\u{feff}日本語😀\r\na\rb\n";
        fs::write(&path, source).unwrap();
        assert_eq!(
            observe_file(Some(path.clone()), source.as_bytes(), false),
            FileObservation::Unchanged
        );
        let replacement = tempfile::NamedTempFile::new_in(dir.path()).unwrap();
        fs::write(replacement.path(), source).unwrap();
        replacement.persist(&path).unwrap();
        assert_eq!(
            observe_file(Some(path.clone()), source.as_bytes(), false),
            FileObservation::Unchanged
        );
        fs::write(&path, "external").unwrap();
        assert_eq!(
            observe_file(Some(path.clone()), source.as_bytes(), false),
            FileObservation::Changed
        );
        assert_eq!(
            observe_file(Some(path.clone()), source.as_bytes(), true),
            FileObservation::Uncertain
        );
        fs::remove_file(&path).unwrap();
        assert!(matches!(
            observe_file(Some(path), source.as_bytes(), false),
            FileObservation::Unavailable { .. }
        ));
        assert_eq!(
            observe_file(Some(dir.path().to_path_buf()), source.as_bytes(), false),
            FileObservation::Unavailable {
                message: "Select a regular file.".into()
            }
        );
    }
    #[test]
    fn file_generations_survive_reset_and_failed_changes() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("source.md");
        let mut doc = Document::default();
        save(&mut doc, path.clone(), b"saved").unwrap();
        assert_eq!(doc.generation, 1);
        fs::write(&path, "external").unwrap();
        assert!(save(&mut doc, path, b"new").is_err());
        assert_eq!(doc.generation, 1);
        assert_eq!(doc.baseline, b"saved");
        reset(&mut doc).unwrap();
        assert_eq!(doc.generation, 2);
        doc.generation = u64::MAX;
        assert!(reset(&mut doc).is_err());
        assert_eq!(doc.generation, u64::MAX);
    }
    #[test]
    fn reload_failures_keep_baseline_and_later_writes_are_detected() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("source.md");
        let mut doc = Document::default();
        save(&mut doc, path.clone(), b"original").unwrap();
        let generation = doc.generation;
        fs::write(&path, b"\xff").unwrap();
        assert!(load_document(&mut doc, path.clone(), read).is_err());
        assert_eq!(doc.baseline, b"original");
        assert_eq!(doc.generation, generation);
        assert!(load_document(&mut doc, path.clone(), |_| Err("read failed".into())).is_err());
        assert_eq!(doc.baseline, b"original");
        assert_eq!(doc.generation, generation);
        fs::write(&path, b"read snapshot").unwrap();
        let opened = load_document(&mut doc, path.clone(), |path| {
            let bytes = read(path)?;
            fs::write(path, b"later external").map_err(|e| e.to_string())?;
            Ok(bytes)
        })
        .unwrap();
        assert_eq!(opened.source, "read snapshot");
        assert_eq!(doc.baseline, b"read snapshot");
        assert_eq!(
            observe_file(doc.path.clone(), &doc.baseline, false),
            FileObservation::Changed
        );
        doc.uncertain = true;
        assert!(load_document(&mut doc, path, read).is_err());
        assert_eq!(doc.baseline, b"read snapshot");
    }
    #[test]
    fn exact_save_and_conflict() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("source.md");
        let mut doc = Document::default();
        let source = "\u{feff}# 日本語\r\na\rb\n😀";
        save(&mut doc, path.clone(), source.as_bytes()).unwrap();
        assert_eq!(fs::read(&path).unwrap(), source.as_bytes());
        fs::write(&path, b"external").unwrap();
        assert!(save(&mut doc, path.clone(), b"replacement").is_err());
        assert_eq!(fs::read(&path).unwrap(), b"external");
    }
    #[test]
    fn refuse_existing_destination_and_uncertain_save() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("existing.md");
        fs::write(&path, b"original").unwrap();
        let mut doc = Document::default();
        assert!(save(&mut doc, path.clone(), b"replacement").is_err());
        doc.uncertain = true;
        assert!(save(&mut doc, dir.path().join("new.md"), b"replacement").is_err());
        assert_eq!(fs::read(&path).unwrap(), b"original");
    }
    #[test]
    fn publication_failure_retains_snapshot_and_blocks_reset() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("saved.md");
        let mut doc = Document::default();
        let error = save_with(&mut doc, path.clone(), b"captured", |_, _| {
            Err("read failed".into())
        })
        .unwrap_err();
        assert_eq!(error, "read failed");
        assert!(doc.uncertain);
        assert_eq!(doc.baseline, b"captured");
        assert!(reset(&mut doc).is_err());
        assert_eq!(fs::read(&path).unwrap(), b"captured");
        assert!(reconcile(&mut doc, |_, _| Err("sync failed".into())).is_err());
        assert!(doc.uncertain);
        reconcile(&mut doc, confirm_save).unwrap();
        reset(&mut doc).unwrap();
        assert!(doc.path.is_none());
        assert!(doc.baseline.is_empty());
    }
    #[test]
    fn post_publication_read_failure_keeps_uncertainty() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("saved.md");
        let mut doc = Document::default();
        assert!(
            save_with(&mut doc, path.clone(), b"captured", |path, bytes| {
                fs::remove_file(path).unwrap();
                confirm_save(path, bytes)
            })
            .is_err()
        );
        assert!(doc.uncertain);
        assert_eq!(doc.baseline, b"captured");
        assert!(reconcile(&mut doc, confirm_save).is_err());
        assert!(doc.uncertain);
        fs::write(&path, b"captured").unwrap();
        reconcile(&mut doc, confirm_save).unwrap();
        assert!(!doc.uncertain);
    }
    #[test]
    fn reject_directories_and_oversize_reads() {
        let dir = tempfile::tempdir().unwrap();
        assert!(read(&dir.path().to_path_buf()).is_err());
        let path = dir.path().join("large.md");
        fs::File::create(&path)
            .unwrap()
            .set_len(LIMIT as u64 + 1)
            .unwrap();
        assert!(read(&path).is_err());
    }
    #[test]
    fn file_creation_and_renaming_with_document_sync() {
        let dir = tempfile::tempdir().unwrap();
        let parent = dir.path().to_str().unwrap().to_string();

        // 1. Create untitled file
        let created1 = create_file_in_dir(&parent, None).unwrap();
        assert!(created1.ends_with("Untitled.md"));
        assert!(PathBuf::from(&created1).exists());

        // 2. Create second untitled file gets incremented name
        let created2 = create_file_in_dir(&parent, None).unwrap();
        assert!(created2.ends_with("Untitled 1.md"));
        assert!(PathBuf::from(&created2).exists());

        // 3. Create with explicit name
        let created_custom = create_file_in_dir(&parent, Some("my-note")).unwrap();
        assert!(created_custom.ends_with("my-note.md"));
        assert!(PathBuf::from(&created_custom).exists());

        // 4. Rename file and sync with open document
        let host = Mutex::new(Documents::default());
        let doc_slot = host.lock().unwrap().get(None).unwrap();
        doc_slot.lock().unwrap().path = Some(fs::canonicalize(PathBuf::from(&created1)).unwrap());

        let new_path = dir.path().join("renamed.md").to_str().unwrap().to_string();
        let rename_result = rename_file_sync(&created1, &new_path, &host);
        assert!(rename_result.is_ok());
        assert!(!PathBuf::from(&created1).exists());
        assert!(PathBuf::from(&new_path).exists());

        // Document in host updated
        let updated_path = doc_slot.lock().unwrap().path.clone().unwrap();
        assert_eq!(updated_path, fs::canonicalize(PathBuf::from(&new_path)).unwrap());
    }

    #[test]
    fn installed_fonts_are_sorted_unique_and_named() {
        let names = installed_font_families();
        assert!(names.windows(2).all(|pair| pair[0] < pair[1]));
        assert!(names.iter().all(|name| !name.trim().is_empty() && name == name.trim() && !name.starts_with('.')));
    }

    #[test]
    fn canonical_path_resolves_links_and_rejects_missing_paths() {
        let dir = tempfile::tempdir().unwrap();
        let real = fs::canonicalize(dir.path()).unwrap().join("real");
        fs::create_dir(&real).unwrap();
        fs::write(real.join("a.md"), b"x").unwrap();
        #[cfg(unix)]
        {
            let link = real.parent().unwrap().join("link");
            std::os::unix::fs::symlink(&real, &link).unwrap();
            let got = canonical_path(link.join("a.md").to_str().unwrap().to_string()).unwrap();
            assert_eq!(got, real.join("a.md").to_str().unwrap());
        }
        assert!(canonical_path(real.join("missing.md").to_str().unwrap().to_string()).is_err());
    }

    #[test]
    fn deleting_a_file_or_folder_detaches_open_documents() {
        let dir = tempfile::tempdir().unwrap();
        let folder = fs::canonicalize(dir.path()).unwrap().join("notes");
        fs::create_dir(&folder).unwrap();
        let inside = folder.join("a.md");
        let outside = folder.parent().unwrap().join("b.md");
        let host = Mutex::new(Documents::default());
        let ids: Vec<u64> = [&inside, &outside, &inside]
            .iter()
            .map(|path| {
                let id = host.lock().unwrap().create().unwrap();
                with_document(&host, Some(id), |doc| {
                    doc.path = Some((*path).clone());
                    doc.uncertain = true;
                    Ok(())
                })
                .unwrap();
                id
            })
            .collect();
        detach_deleted_documents(&host, &inside).unwrap();
        let state = |id| with_document(&host, Some(id), |doc| Ok((doc.path.clone(), doc.uncertain, doc.generation))).unwrap();
        assert_eq!(state(ids[0]).0, None);
        assert!(!state(ids[0]).1 && state(ids[0]).2 == 1);
        assert_eq!(state(ids[1]), (Some(outside.clone()), true, 0));
        assert_eq!(state(ids[2]).0, None);
        detach_deleted_documents(&host, &folder.parent().unwrap().join("notes")).unwrap();
        assert_eq!(state(ids[1]).0, Some(outside));
    }

    #[test]
    fn file_and_folder_deletion_and_closed_files_stack() {
        let dir = tempfile::tempdir().unwrap();
        let sub_dir = dir.path().join("subfolder");
        fs::create_dir(&sub_dir).unwrap();
        let file1 = sub_dir.join("file1.md");
        fs::write(&file1, b"content").unwrap();
        assert!(file1.exists());

        // Deleting file
        delete_path_on_disk(&file1).unwrap();
        assert!(!file1.exists());

        // Deleting folder
        let file2 = sub_dir.join("file2.md");
        fs::write(&file2, b"content2").unwrap();
        delete_path_on_disk(&sub_dir).unwrap();
        assert!(!sub_dir.exists());

        // Deleting root rejected
        assert!(delete_path_on_disk(Path::new("/")).is_err());
        assert!(delete_path_on_disk(Path::new("")).is_err());

        // Closed files tracking
        let recent_path = dir.path().join("recent.json");
        let store = recent::RecentStore::new(recent_path.clone());
        {
            let mut guard = store.state.lock().unwrap();
            guard.push_closed("/path/doc1.md");
            guard.push_closed("/path/doc2.md");
            assert_eq!(guard.closed_files.len(), 2);
            assert_eq!(guard.pop_closed(), Some("/path/doc2.md".to_string()));
            assert_eq!(guard.pop_closed(), Some("/path/doc1.md".to_string()));
            assert_eq!(guard.pop_closed(), None);
        }
    }

    #[test]
    fn initial_targets_registration_and_consumption() {
        let targets = Mutex::new(InitialTargets::default());
        {
            let mut guard = targets.lock().unwrap();
            guard.folders.insert("win-1".into(), "/projects/test".into());
            guard.files.insert("win-1".into(), "/projects/test/doc.md".into());
        }
        {
            let mut guard = targets.lock().unwrap();
            assert_eq!(guard.folders.remove("win-1"), Some("/projects/test".into()));
            assert_eq!(guard.folders.remove("win-1"), None);
            assert_eq!(guard.files.remove("win-1"), Some("/projects/test/doc.md".into()));
            assert_eq!(guard.files.remove("win-1"), None);
        }
    }
}

