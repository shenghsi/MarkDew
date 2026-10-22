use std::sync::{
    atomic::{AtomicBool, Ordering},
    Mutex,
};
use tauri::{ipc::Channel, Manager};
use tauri_plugin_updater::{Update, UpdaterExt};

// Window creation holds this lock until the new window exists. An update keeps
// the flag set until installation fails or the process restarts.
pub static INSTALLING: Mutex<bool> = Mutex::new(false);
pub static RESTART_READY: AtomicBool = AtomicBool::new(false);
pub type Pending = Mutex<Option<Update>>;

struct InstallLease;
impl Drop for InstallLease {
    fn drop(&mut self) {
        if let Ok(mut installing) = INSTALLING.lock() {
            *installing = false;
        }
    }
}

fn single_main(app: &tauri::AppHandle, label: &str) -> Result<(), String> {
    validate_window(label, app.webview_windows().len())
}

fn validate_window(label: &str, count: usize) -> Result<(), String> {
    if label != "main" || count != 1 {
        return Err("Close the other MarkDew windows before you install an update.".into());
    }
    Ok(())
}

#[tauri::command]
pub async fn check_app_update(
    app: tauri::AppHandle,
    window: tauri::WebviewWindow,
) -> Result<serde_json::Value, String> {
    single_main(&app, window.label())?;
    if *INSTALLING.lock().map_err(|e| e.to_string())? {
        return Err("An update is already in progress.".into());
    }
    let update = app
        .updater_builder()
        .timeout(std::time::Duration::from_secs(120))
        .build()
        .map_err(|e| e.to_string())?
        .check()
        .await
        .map_err(|e| e.to_string())?;
    let result = match &update {
        Some(update) => serde_json::json!({
            "status": "update-available", "currentVersion": update.current_version,
            "update": { "version": update.version, "tagName": format!("v{}", update.version),
                "releaseName": format!("MarkDew {}", update.version),
                "releaseNotes": update.body.clone().unwrap_or_default(),
                "htmlUrl": "https://github.com/shenghsi/MarkDew/releases/latest",
                "installerCommand": "", "oneClick": true }
        }),
        None => {
            serde_json::json!({"status": "up-to-date", "currentVersion": app.package_info().version.to_string()})
        }
    };
    *app.state::<Pending>().lock().map_err(|e| e.to_string())? = update;
    Ok(result)
}

#[tauri::command]
pub async fn install_app_update(
    app: tauri::AppHandle,
    window: tauri::WebviewWindow,
    progress: Channel<serde_json::Value>,
) -> Result<(), String> {
    let lease = {
        let mut installing = INSTALLING.lock().map_err(|e| e.to_string())?;
        if *installing {
            return Err("An update is already in progress.".into());
        }
        single_main(&app, window.label())?;
        *installing = true;
        InstallLease
    };
    let update = app
        .state::<Pending>()
        .lock()
        .map_err(|e| e.to_string())?
        .clone()
        .ok_or("Check for updates before you install an update.")?;
    let mut downloaded = 0_u64;
    let bytes = update.download(|length, total| {
        downloaded += length as u64;
        let _ = progress.send(serde_json::json!({"stage": "download", "downloaded": downloaded, "total": total}));
    }, || {}).await.map_err(|e| e.to_string())?;
    // The renderer has locked input and confirmed every recovery checkpoint.
    // Recheck host Save uncertainty immediately before any installer can exit.
    if app
        .state::<Mutex<crate::Documents>>()
        .lock()
        .map_err(|e| e.to_string())?
        .uncertain()?
    {
        return Err("Check the last save before you install the update.".into());
    }
    single_main(&app, window.label())?;
    let _ = progress.send(serde_json::json!({"stage": "install"}));
    tauri::async_runtime::spawn_blocking(move || -> Result<(), String> {
        let _lease = lease;
        install(&update, &bytes)?;
        RESTART_READY.store(true, Ordering::SeqCst);
        app.restart();
    })
    .await
    .map_err(|e| e.to_string())?
}

#[cfg(not(target_os = "linux"))]
fn install(update: &Update, bytes: &[u8]) -> Result<(), String> {
    update.install(bytes).map_err(|e| e.to_string())
}

#[cfg(target_os = "linux")]
fn install(_update: &Update, bytes: &[u8]) -> Result<(), String> {
    // download() has already verified the package signature. Use only the
    // system authentication dialog. Cancellation must not start another prompt
    // or fall back to terminal sudo or app-owned password collection.
    let folder = tempfile::tempdir().map_err(|e| e.to_string())?;
    let package = folder.path().join("markdew-update.deb");
    std::fs::write(&package, bytes).map_err(|e| e.to_string())?;
    let status = std::process::Command::new("/usr/bin/pkexec")
        .arg("--disable-internal-agent")
        .arg("/usr/bin/dpkg").arg("--install").arg(&package)
        .stdin(std::process::Stdio::null())
        .status().map_err(|_| "Cannot open the system password dialog. Install pkexec and enable a system authentication agent.".to_string())?;
    if !status.success() {
        return Err(
            "The update was cancelled or could not be installed. MarkDew will stay open.".into(),
        );
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn update_requires_exactly_one_main_window() {
        assert!(validate_window("main", 1).is_ok());
        assert!(validate_window("main", 0).is_err());
        assert!(validate_window("main", 2).is_err());
        assert!(validate_window("window-1", 1).is_err());
    }

    #[test]
    fn install_failure_releases_window_gate() {
        *INSTALLING.lock().unwrap() = true;
        {
            let _lease = InstallLease;
        }
        assert!(!*INSTALLING.lock().unwrap());
    }
}
