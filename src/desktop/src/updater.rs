use std::{
    collections::HashSet,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Condvar, Mutex,
    },
    time::{Duration, Instant},
};
use tauri::{ipc::Channel, Emitter, Manager};
use tauri_plugin_updater::{Update, UpdaterExt};

// Window creation holds this lock until the new window exists. An update keeps
// the flag set until installation fails or the process restarts.
pub static INSTALLING: Mutex<bool> = Mutex::new(false);
pub static RESTART_READY: AtomicBool = AtomicBool::new(false);
pub type Pending = Mutex<Option<Update>>;

const UPDATE_PREPARE_EVENT: &str = "markdew-update-prepare";
const UPDATE_RELEASE_EVENT: &str = "markdew-update-release";
const PREPARE_TIMEOUT: Duration = Duration::from_secs(15);

#[derive(Default)]
pub struct PrepareCoordinator {
    next_token: u64,
    active: Option<ActivePrepare>,
}

struct ActivePrepare {
    token: u64,
    pending: HashSet<String>,
    error: Option<String>,
    signal: Arc<(Mutex<bool>, Condvar)>,
}

impl PrepareCoordinator {
    pub fn begin(&mut self, peers: &[String]) -> (u64, Arc<(Mutex<bool>, Condvar)>) {
        self.next_token += 1;
        let token = self.next_token;
        let done = peers.is_empty();
        let signal = Arc::new((Mutex::new(done), Condvar::new()));
        if !done {
            self.active = Some(ActivePrepare {
                token,
                pending: peers.iter().cloned().collect(),
                error: None,
                signal: signal.clone(),
            });
        } else {
            self.active = None;
        }
        (token, signal)
    }

    pub fn resolve(&mut self, token: u64, label: &str, ok: bool, error: Option<String>) {
        let Some(active) = self.active.as_mut() else {
            return;
        };
        if active.token != token || !active.pending.remove(label) {
            return;
        }
        if !ok && active.error.is_none() {
            active.error = Some(
                error.unwrap_or_else(|| {
                    "Another MarkDew window could not prepare for the update.".into()
                }),
            );
        }
        if active.error.is_some() || active.pending.is_empty() {
            Self::notify(&active.signal);
        }
    }

    pub fn window_closed(&mut self, label: &str) {
        let Some(active) = self.active.as_mut() else {
            return;
        };
        if active.pending.remove(label) && active.pending.is_empty() {
            Self::notify(&active.signal);
        }
    }

    pub fn outcome(&self, token: u64) -> Result<(), String> {
        let Some(active) = self.active.as_ref() else {
            return Ok(());
        };
        if active.token != token {
            return Ok(());
        }
        if let Some(error) = &active.error {
            return Err(error.clone());
        }
        if !active.pending.is_empty() {
            return Err("Another MarkDew window did not respond in time. Try again.".into());
        }
        Ok(())
    }

    pub fn cancel(&mut self, token: u64) {
        if self.active.as_ref().is_some_and(|a| a.token == token) {
            if let Some(active) = self.active.take() {
                Self::notify(&active.signal);
            }
        }
    }

    fn notify(signal: &(Mutex<bool>, Condvar)) {
        if let Ok(mut done) = signal.0.lock() {
            *done = true;
            signal.1.notify_all();
        }
    }
}

struct InstallLease {
    app: Option<tauri::AppHandle>,
    token: u64,
    peers: Vec<String>,
}

impl Drop for InstallLease {
    fn drop(&mut self) {
        if let Some(app) = &self.app {
            if let Some(coord) = app.try_state::<Mutex<PrepareCoordinator>>() {
                if let Ok(mut guard) = coord.lock() {
                    guard.cancel(self.token);
                }
            }
            for peer in &self.peers {
                let _ = app.emit_to(peer, UPDATE_RELEASE_EVENT, self.token);
            }
        }
        if let Ok(mut installing) = INSTALLING.lock() {
            *installing = false;
        }
    }
}

pub fn window_closed(app: &tauri::AppHandle, label: &str) {
    if let Some(coord) = app.try_state::<Mutex<PrepareCoordinator>>() {
        if let Ok(mut guard) = coord.lock() {
            guard.window_closed(label);
        }
    }
}

#[tauri::command]
pub fn resolve_update_prepare(
    window: tauri::WebviewWindow,
    coordinator: tauri::State<'_, Mutex<PrepareCoordinator>>,
    token: u64,
    ok: bool,
    error: Option<String>,
) -> Result<(), String> {
    coordinator
        .lock()
        .map_err(|e| e.to_string())?
        .resolve(token, window.label(), ok, error);
    Ok(())
}

#[tauri::command]
pub async fn check_app_update(app: tauri::AppHandle) -> Result<serde_json::Value, String> {
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
    let caller = window.label().to_string();
    let (lease, peers, token, signal) = {
        let mut installing = INSTALLING.lock().map_err(|e| e.to_string())?;
        if *installing {
            return Err("An update is already in progress.".into());
        }
        let peers: Vec<String> = app
            .webview_windows()
            .keys()
            .filter(|label| *label != &caller)
            .cloned()
            .collect();
        let (token, signal) = app
            .state::<Mutex<PrepareCoordinator>>()
            .lock()
            .map_err(|e| e.to_string())?
            .begin(&peers);
        *installing = true;
        let lease = InstallLease {
            app: Some(app.clone()),
            token,
            peers: peers.clone(),
        };
        (lease, peers, token, signal)
    };
    let update = app
        .state::<Pending>()
        .lock()
        .map_err(|e| e.to_string())?
        .clone()
        .ok_or("Check for updates before you install an update.")?;
    if !peers.is_empty() {
        for peer in &peers {
            if app.get_webview_window(peer).is_none() {
                app.state::<Mutex<PrepareCoordinator>>()
                    .lock()
                    .map_err(|e| e.to_string())?
                    .window_closed(peer);
                continue;
            }
            if app.emit_to(peer, UPDATE_PREPARE_EVENT, token).is_err() {
                return Err("Cannot contact another MarkDew window to prepare for the update.".into());
            }
        }
        tauri::async_runtime::spawn_blocking(move || {
            let (lock, cvar) = &*signal;
            let Ok(mut done) = lock.lock() else { return };
            let deadline = Instant::now() + PREPARE_TIMEOUT;
            while !*done {
                let remaining = deadline.saturating_duration_since(Instant::now());
                if remaining.is_zero() {
                    break;
                }
                match cvar.wait_timeout(done, remaining) {
                    Ok((guard, result)) => {
                        done = guard;
                        if result.timed_out() {
                            break;
                        }
                    }
                    Err(_) => break,
                }
            }
        })
        .await
        .map_err(|e| e.to_string())?;
        app.state::<Mutex<PrepareCoordinator>>()
            .lock()
            .map_err(|e| e.to_string())?
            .outcome(token)?;
    }
    let mut downloaded = 0_u64;
    let bytes = update.download(|length, total| {
        downloaded += length as u64;
        let _ = progress.send(serde_json::json!({"stage": "download", "downloaded": downloaded, "total": total}));
    }, || {}).await.map_err(|e| e.to_string())?;
    // All open renderers have locked input and confirmed every recovery checkpoint.
    // Recheck host Save uncertainty immediately before any installer can exit.
    if app
        .state::<Mutex<crate::Documents>>()
        .lock()
        .map_err(|e| e.to_string())?
        .uncertain()?
    {
        return Err("Check the last save before you install the update.".into());
    }
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
    fn coordinator_succeeds_when_all_peers_approve_or_close() {
        let mut coord = PrepareCoordinator::default();
        let peers = vec!["window-1".to_string(), "window-2".to_string()];
        let (token, signal) = coord.begin(&peers);
        assert!(!*signal.0.lock().unwrap());

        coord.resolve(token, "window-1", true, None);
        assert!(!*signal.0.lock().unwrap());

        coord.window_closed("window-2");
        assert!(*signal.0.lock().unwrap());
        assert!(coord.outcome(token).is_ok());
    }

    #[test]
    fn coordinator_surfaces_peer_rejection_and_ignores_stale_tokens() {
        let mut coord = PrepareCoordinator::default();
        let peers = vec!["window-1".to_string(), "window-2".to_string()];
        let (token, signal) = coord.begin(&peers);

        coord.resolve(token + 1, "window-1", false, Some("stale".into()));
        assert!(!*signal.0.lock().unwrap());

        coord.resolve(token, "window-1", false, Some("Save all documents.".into()));
        assert!(*signal.0.lock().unwrap());
        assert_eq!(coord.outcome(token).unwrap_err(), "Save all documents.");
    }

    #[test]
    fn coordinator_reports_unresponsive_peer_and_handles_no_peers() {
        let mut coord = PrepareCoordinator::default();
        let (empty_token, empty_signal) = coord.begin(&[]);
        assert!(*empty_signal.0.lock().unwrap());
        assert!(coord.outcome(empty_token).is_ok());

        let (token, signal) = coord.begin(&["window-1".to_string()]);
        assert!(!*signal.0.lock().unwrap());
        assert!(coord.outcome(token).is_err());

        coord.cancel(token);
        assert!(*signal.0.lock().unwrap());
    }

    #[test]
    fn install_failure_releases_window_gate() {
        *INSTALLING.lock().unwrap() = true;
        {
            let _lease = InstallLease {
                app: None,
                token: 0,
                peers: Vec::new(),
            };
        }
        assert!(!*INSTALLING.lock().unwrap());
    }
}
