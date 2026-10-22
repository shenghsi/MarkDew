use fs2::FileExt;
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    fs,
    io::{Read, Write},
    path::{Path, PathBuf},
};

const SOURCE_LIMIT: usize = 8 * 1024 * 1024;
const RECORD_LIMIT: u64 = (SOURCE_LIMIT * 6 + 8192) as u64;
const MAX_REVISION: u64 = 9_007_199_254_740_991;

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Snapshot {
    schema: u32,
    revision: u64,
    pub source: String,
    pub label: String,
}
#[derive(Serialize)]
pub struct Entry {
    pub id: String,
    pub label: String,
    pub bytes: usize,
}
#[derive(Serialize)]
pub struct Listing {
    pub session: String,
    pub revision: u64,
    pub entries: Vec<Entry>,
    pub warnings: Vec<String>,
}

pub struct Store {
    root: PathBuf,
    session: PathBuf,
    _lease: fs::File,
    revision: u64,
    confirmed_clear: Option<u64>,
}

// Each document owns one lease and revision stream. Renderer rotation publishes
// a complete replacement map only after every new lease has been allocated.
pub struct Documents {
    root: PathBuf,
    stores: HashMap<u64, Store>,
}
impl Documents {
    pub fn new(root: PathBuf) -> Result<Self, String> {
        let initial = Store::new(root.clone())?;
        Ok(Self {
            root,
            stores: HashMap::from([(0, initial)]),
        })
    }
    #[cfg(test)]
    pub fn start_renderer(&mut self) -> Result<Listing, String> {
        self.rotate_with(Store::new)?;
        self.listing(None)
    }
    pub fn start_renderer_for(&mut self, document: u64) -> Result<Listing, String> {
        let mut next = HashMap::new();
        for id in self.stores.keys().copied().chain(std::iter::once(document)) {
            if !next.contains_key(&id) {
                next.insert(id, Store::new(self.root.clone())?);
            }
        }
        self.stores = next;
        self.listing(Some(document))
    }
    pub fn start_documents(&mut self, ids: &[u64]) -> Result<Listing, String> {
        self.start_documents_with(ids, Store::new)
    }
    fn start_documents_with(
        &mut self,
        ids: &[u64],
        mut allocate: impl FnMut(PathBuf) -> Result<Store, String>,
    ) -> Result<Listing, String> {
        let first = *ids.first().ok_or("No live documents.")?;
        let mut next = HashMap::new();
        for id in ids {
            next.insert(*id, allocate(self.root.clone())?);
        }
        self.stores = next;
        self.listing(Some(first))
    }
    pub fn token(&self, document: u64) -> Result<(String, u64), String> {
        let store = self.store(Some(document))?;
        Ok((store.session_id(), store.revision))
    }
    #[cfg(test)]
    fn rotate_with(
        &mut self,
        mut allocate: impl FnMut(PathBuf) -> Result<Store, String>,
    ) -> Result<(), String> {
        let mut next = HashMap::new();
        for id in self.stores.keys() {
            next.insert(*id, allocate(self.root.clone())?);
        }
        self.stores = next;
        Ok(())
    }
    pub fn open(&mut self, document: u64) -> Result<Listing, String> {
        if !self.stores.contains_key(&document) {
            self.stores.insert(document, Store::new(self.root.clone())?);
        }
        self.listing(Some(document))
    }
    fn store(&self, document: Option<u64>) -> Result<&Store, String> {
        self.stores
            .get(&document.unwrap_or(0))
            .ok_or("No recovery session for this document.".into())
    }
    pub fn listing(&self, document: Option<u64>) -> Result<Listing, String> {
        self.store(document)?.listing()
    }
    pub fn copy(&self, document: Option<u64>, id: &str) -> Result<Snapshot, String> {
        self.store(document)?.copy(id)
    }
    pub fn discard(&self, document: Option<u64>, id: &str) -> Result<(), String> {
        self.store(document)?.discard(id)
    }
    pub fn discard_all(&self, document: Option<u64>) -> Result<(), String> {
        self.store(document)?.discard_all()
    }
    pub fn checkpoint(
        &mut self,
        document: Option<u64>,
        session: &str,
        revision: u64,
        source: String,
        label: String,
        dirty: bool,
    ) -> Result<(), String> {
        self.stores
            .get_mut(&document.unwrap_or(0))
            .ok_or("No recovery session for this document.")?
            .checkpoint_session(session, revision, source, label, dirty)
    }
    pub fn retire(&mut self, document: u64, session: &str, revision: u64) -> Result<(), String> {
        let store = self.store(Some(document))?;
        if store.session_id() != session || store.confirmed_clear != Some(revision) {
            return Err("Confirm recovery clear before you close this document.".into());
        }
        self.stores.remove(&document);
        Ok(())
    }
}

fn sync_directory(path: &Path) -> Result<(), String> {
    #[cfg(unix)]
    fs::File::open(path)
        .and_then(|file| file.sync_all())
        .map_err(|e| e.to_string())?;
    Ok(())
}
fn read_record(directory: &Path) -> Result<Snapshot, String> {
    let path = directory.join("snapshot.json");
    let metadata = fs::symlink_metadata(&path).map_err(|e| e.to_string())?;
    if !metadata.is_file() || metadata.len() > RECORD_LIMIT {
        return Err("Invalid recovery file.".into());
    }
    let mut options = fs::OpenOptions::new();
    options.read(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        options.custom_flags(libc::O_NONBLOCK | libc::O_NOFOLLOW);
    }
    let file = options.open(&path).map_err(|e| e.to_string())?;
    let before = file.metadata().map_err(|e| e.to_string())?;
    if !before.is_file() || before.len() > RECORD_LIMIT {
        return Err("Invalid opened recovery file.".into());
    }
    let mut bytes = Vec::new();
    (&file)
        .take(RECORD_LIMIT + 1)
        .read_to_end(&mut bytes)
        .map_err(|e| e.to_string())?;
    if bytes.len() as u64 > RECORD_LIMIT {
        return Err("Recovery file exceeds its size limit.".into());
    }
    let after = file.metadata().map_err(|e| e.to_string())?;
    if before.len() != after.len() || before.modified().ok() != after.modified().ok() {
        return Err("Recovery file changed during its read.".into());
    }
    #[cfg(unix)]
    {
        use std::os::unix::fs::MetadataExt;
        let current = fs::symlink_metadata(&path).map_err(|e| e.to_string())?;
        if current.dev() != after.dev() || current.ino() != after.ino() {
            return Err("Recovery file was replaced during its read.".into());
        }
    }
    let record: Snapshot = serde_json::from_slice(&bytes).map_err(|e| e.to_string())?;
    if record.schema != 1
        || record.revision == 0
        || record.revision > MAX_REVISION
        || record.source.len() > SOURCE_LIMIT
        || record.label.len() > 1024
    {
        return Err("Invalid recovery record.".into());
    }
    Ok(record)
}
fn valid_id(id: &str) -> bool {
    id.starts_with("session-")
        && id.len() <= 128
        && id.bytes().all(|c| c.is_ascii_alphanumeric() || c == b'-')
}
fn lease(directory: &Path) -> Result<Option<fs::File>, String> {
    if !fs::symlink_metadata(directory)
        .map_err(|e| e.to_string())?
        .is_dir()
    {
        return Err("Invalid recovery folder.".into());
    }
    let path = directory.join("lease");
    if !fs::symlink_metadata(&path)
        .map_err(|e| e.to_string())?
        .is_file()
    {
        return Err("Invalid recovery lease.".into());
    }
    let mut options = fs::OpenOptions::new();
    options.read(true).write(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        options.custom_flags(libc::O_NONBLOCK | libc::O_NOFOLLOW);
    }
    let file = options.open(path).map_err(|e| e.to_string())?;
    if !file.metadata().map_err(|e| e.to_string())?.is_file() {
        return Err("Invalid opened recovery lease.".into());
    }
    match file.try_lock_exclusive() {
        Ok(()) => Ok(Some(file)),
        Err(error) if error.raw_os_error() == fs2::lock_contended_error().raw_os_error() => {
            Ok(None)
        }
        Err(error) => Err(error.to_string()),
    }
}
impl Store {
    pub fn session_id(&self) -> String {
        self.session
            .file_name()
            .unwrap()
            .to_string_lossy()
            .into_owned()
    }
    #[cfg(test)]
    pub fn start_renderer(&mut self) -> Result<Listing, String> {
        // A renderer restart must not overwrite the copy left by its predecessor.
        let next = Self::new(self.root.clone())?;
        *self = next;
        self.listing()
    }
    pub fn new(root: PathBuf) -> Result<Self, String> {
        fs::create_dir_all(&root).map_err(|e| e.to_string())?;
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            fs::set_permissions(&root, fs::Permissions::from_mode(0o700))
                .map_err(|e| e.to_string())?;
        }
        let directory = tempfile::Builder::new()
            .prefix("session-")
            .tempdir_in(&root)
            .map_err(|e| e.to_string())?;
        let file = fs::OpenOptions::new()
            .read(true)
            .write(true)
            .create_new(true)
            .open(directory.path().join("lease"))
            .map_err(|e| e.to_string())?;
        file.try_lock_exclusive().map_err(|e| e.to_string())?;
        file.sync_all().map_err(|e| e.to_string())?;
        sync_directory(directory.path())?;
        let session = directory.keep();
        sync_directory(&root)?;
        Ok(Self {
            root,
            session,
            _lease: file,
            revision: 0,
            confirmed_clear: None,
        })
    }
    pub fn checkpoint(
        &mut self,
        revision: u64,
        source: String,
        label: String,
        dirty: bool,
    ) -> Result<(), String> {
        self.checkpoint_with(revision, source, label, dirty, |path| sync_directory(path))
    }
    pub fn checkpoint_session(
        &mut self,
        session: &str,
        revision: u64,
        source: String,
        label: String,
        dirty: bool,
    ) -> Result<(), String> {
        if session != self.session_id() {
            return Err("Stale recovery session.".into());
        }
        self.checkpoint(revision, source, label, dirty)
    }
    fn checkpoint_with(
        &mut self,
        revision: u64,
        source: String,
        label: String,
        dirty: bool,
        confirm: impl FnOnce(&Path) -> Result<(), String>,
    ) -> Result<(), String> {
        if revision <= self.revision || revision > MAX_REVISION {
            return Err("Stale recovery checkpoint.".into());
        }
        if source.len() > SOURCE_LIMIT || label.len() > 1024 {
            return Err("Recovery source or label exceeds its size limit.".into());
        }
        // Reserve the revision even if publication or its confirmation fails.
        self.revision = revision;
        self.confirmed_clear = None;
        let path = self.session.join("snapshot.json");
        if !dirty {
            match fs::remove_file(&path) {
                Ok(()) => (),
                Err(error) if error.kind() == std::io::ErrorKind::NotFound => (),
                Err(error) => return Err(error.to_string()),
            }
            confirm(&self.session)
                .map_err(|e| format!("Recovery clear completion is uncertain: {e}"))?;
            self.confirmed_clear = Some(revision);
            return Ok(());
        }
        let record = Snapshot {
            schema: 1,
            revision,
            source,
            label,
        };
        let bytes = serde_json::to_vec(&record).map_err(|e| e.to_string())?;
        let mut pending =
            tempfile::NamedTempFile::new_in(&self.session).map_err(|e| e.to_string())?;
        pending.write_all(&bytes).map_err(|e| e.to_string())?;
        pending.as_file().sync_all().map_err(|e| e.to_string())?;
        pending.persist(&path).map_err(|e| e.to_string())?;
        confirm(&self.session)
            .map_err(|e| format!("Recovery write completion is uncertain: {e}"))?;
        let actual = read_record(&self.session)
            .map_err(|e| format!("Recovery read completion is uncertain: {e}"))?;
        if actual.revision != revision
            || actual.source != record.source
            || actual.label != record.label
        {
            return Err(
                "Recovery completion is uncertain: file differs from the checkpoint.".into(),
            );
        }
        Ok(())
    }
    pub fn listing(&self) -> Result<Listing, String> {
        let mut result = Listing {
            session: self.session_id(),
            revision: self.revision,
            entries: vec![],
            warnings: vec![],
        };
        for (index, entry) in fs::read_dir(&self.root)
            .map_err(|e| e.to_string())?
            .enumerate()
        {
            if index >= 1000 {
                result
                    .warnings
                    .push("More recovery folders exist. Some copies are not shown.".into());
                break;
            }
            let entry = entry.map_err(|e| e.to_string())?;
            let id = entry.file_name().to_string_lossy().into_owned();
            if !valid_id(&id) {
                continue;
            }
            let directory = entry.path();
            if directory == self.session {
                continue;
            }
            let _other_lease = match lease(&directory) {
                Ok(Some(file)) => file,
                Ok(None) => continue,
                Err(_) => {
                    result.warnings.push(format!(
                        "Cannot check recovery session {id}. It has been kept."
                    ));
                    continue;
                }
            };
            if !directory.join("snapshot.json").exists() {
                continue;
            }
            match read_record(&directory) {
                Ok(record) => result.entries.push(Entry {
                    id,
                    label: record.label,
                    bytes: record.source.len(),
                }),
                Err(_) => result
                    .warnings
                    .push(format!("Cannot read recovery copy {id}. It has been kept.")),
            }
        }
        result.entries.sort_by(|a, b| a.id.cmp(&b.id));
        Ok(result)
    }
    pub fn copy(&self, id: &str) -> Result<Snapshot, String> {
        if !valid_id(id) {
            return Err("Invalid recovery identifier.".into());
        }
        let directory = self.root.join(id);
        let _other_lease = if directory == self.session {
            None
        } else {
            Some(lease(&directory)?.ok_or("Recovery session is active.")?)
        };
        read_record(&directory)
    }
    pub fn discard(&self, id: &str) -> Result<(), String> {
        if !valid_id(id) {
            return Err("Invalid recovery identifier.".into());
        }
        let directory = self.root.join(id);
        if directory == self.session {
            return Err("Cannot discard active recovery session.".into());
        }
        let _other_lease = lease(&directory)?.ok_or("Recovery session is active.")?;
        let snapshot = directory.join("snapshot.json");
        if snapshot.exists() {
            fs::remove_file(&snapshot).map_err(|e| e.to_string())?;
            sync_directory(&directory)?;
        }
        Ok(())
    }
    pub fn discard_all(&self) -> Result<(), String> {
        for entry in fs::read_dir(&self.root).map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            let id = entry.file_name().to_string_lossy().into_owned();
            if !valid_id(&id) {
                continue;
            }
            let directory = entry.path();
            if directory == self.session {
                continue;
            }
            if let Ok(Some(_other_lease)) = lease(&directory) {
                let snapshot = directory.join("snapshot.json");
                if snapshot.exists() {
                    let _ = fs::remove_file(&snapshot);
                    let _ = sync_directory(&directory);
                }
            }
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn live_set_startup_allocation_failure_keeps_old_sessions_and_copies() {
        let dir = tempfile::tempdir().unwrap();
        let mut documents = Documents::new(dir.path().to_path_buf()).unwrap();
        let token = documents.token(0).unwrap().0;
        documents
            .checkpoint(None, &token, 1, "old dirty source".into(), "".into(), true)
            .unwrap();
        let mut allocations = 0;
        assert!(documents
            .start_documents_with(&[1, 2], |root| {
                allocations += 1;
                if allocations == 2 {
                    Err("allocation failed".into())
                } else {
                    Store::new(root)
                }
            })
            .is_err());
        assert_eq!(documents.token(0).unwrap().0, token);
        assert!(documents.token(1).is_err());
        assert_eq!(
            documents.copy(None, &token).unwrap().source,
            "old dirty source"
        );
        let listing = documents.start_documents(&[1, 2]).unwrap();
        assert!(documents.token(0).is_err());
        assert!(documents.token(1).is_ok());
        assert!(documents.token(2).is_ok());
        assert!(listing.entries.iter().any(|entry| entry.id == token));
        assert_eq!(
            documents.copy(Some(1), &token).unwrap().source,
            "old dirty source"
        );
    }
    #[test]
    fn document_sessions_keep_revisions_and_clears_independent() {
        let directory = tempfile::tempdir().unwrap();
        let mut documents = Documents::new(directory.path().to_path_buf()).unwrap();
        let first = documents.listing(None).unwrap().session;
        let second = documents.open(7).unwrap().session;
        assert_ne!(first, second);
        assert_eq!(documents.open(7).unwrap().session, second);
        let source = "\u{feff}日本語😀\r\na\rb\n";
        documents
            .checkpoint(None, &first, 1, source.into(), "first".into(), true)
            .unwrap();
        documents
            .checkpoint(Some(7), &second, 1, "other".into(), "second".into(), true)
            .unwrap();
        assert!(documents.listing(None).unwrap().entries.is_empty());
        assert!(documents.copy(None, &second).is_err());
        assert!(documents
            .checkpoint(Some(7), &first, 2, "wrong".into(), "".into(), true)
            .is_err());
        documents
            .checkpoint(None, &first, 2, "".into(), "".into(), false)
            .unwrap();
        assert_eq!(documents.copy(Some(7), &second).unwrap().source, "other");
        assert!(documents.retire(7, &second, 1).is_err());
        assert!(documents.retire(0, &second, 2).is_err());
        assert!(documents.retire(0, &first, 1).is_err());
        documents.retire(0, &first, 2).unwrap();
        assert!(documents
            .checkpoint(None, &first, 3, "late".into(), "".into(), true)
            .is_err());
        assert!(documents.listing(None).is_err());
    }
    #[test]
    fn all_renderer_sessions_rotate_together_and_keep_old_copies() {
        let directory = tempfile::tempdir().unwrap();
        let mut documents = Documents::new(directory.path().to_path_buf()).unwrap();
        let first = documents.listing(None).unwrap().session;
        let second = documents.open(2).unwrap().session;
        documents
            .checkpoint(None, &first, 1, "first".into(), "".into(), true)
            .unwrap();
        documents
            .checkpoint(Some(2), &second, 1, "second".into(), "".into(), true)
            .unwrap();
        let listing = documents.start_renderer().unwrap();
        assert_ne!(listing.session, first);
        assert_ne!(documents.listing(Some(2)).unwrap().session, second);
        assert_eq!(listing.entries.len(), 2);
        assert_eq!(documents.copy(None, &first).unwrap().source, "first");
        assert_eq!(documents.copy(None, &second).unwrap().source, "second");
        for (id, session) in [(None, first), (Some(2), second)] {
            assert!(documents
                .checkpoint(id, &session, 2, "late".into(), "".into(), true)
                .is_err());
            assert!(documents
                .checkpoint(id, &session, 3, "".into(), "".into(), false)
                .is_err());
        }
    }
    #[test]
    fn partial_rotation_failure_retains_every_old_token_and_copy() {
        let directory = tempfile::tempdir().unwrap();
        let mut documents = Documents::new(directory.path().to_path_buf()).unwrap();
        let first = documents.listing(None).unwrap().session;
        let second = documents.open(3).unwrap().session;
        documents
            .checkpoint(None, &first, 1, "first".into(), "".into(), true)
            .unwrap();
        documents
            .checkpoint(Some(3), &second, 1, "second".into(), "".into(), true)
            .unwrap();
        let mut allocations = 0;
        assert!(documents
            .rotate_with(|root| {
                allocations += 1;
                if allocations == 2 {
                    return Err("allocation failed".into());
                }
                Store::new(root)
            })
            .is_err());
        assert_eq!(allocations, 2);
        assert_eq!(documents.listing(None).unwrap().session, first);
        assert_eq!(documents.listing(Some(3)).unwrap().session, second);
        assert!(documents.listing(None).unwrap().entries.is_empty());
        assert_eq!(documents.copy(None, &first).unwrap().source, "first");
        assert_eq!(documents.copy(Some(3), &second).unwrap().source, "second");
        documents
            .checkpoint(None, &first, 2, "next first".into(), "".into(), true)
            .unwrap();
        documents
            .checkpoint(Some(3), &second, 2, "next second".into(), "".into(), true)
            .unwrap();
    }
    #[test]
    fn failed_clear_or_later_write_invalidates_retirement_confirmation() {
        let directory = tempfile::tempdir().unwrap();
        let mut documents = Documents::new(directory.path().to_path_buf()).unwrap();
        let session = documents.listing(None).unwrap().session;
        documents
            .checkpoint(None, &session, 1, "".into(), "".into(), false)
            .unwrap();
        let store = documents.stores.get_mut(&0).unwrap();
        assert!(store
            .checkpoint_with(
                2,
                "".into(),
                "".into(),
                false,
                |_| Err("sync failed".into())
            )
            .is_err());
        assert!(documents.retire(0, &session, 1).is_err());
        assert!(documents.retire(0, &session, 2).is_err());
        documents
            .checkpoint(None, &session, 3, "".into(), "".into(), false)
            .unwrap();
        documents
            .checkpoint(None, &session, 4, "later input".into(), "".into(), true)
            .unwrap();
        assert!(documents.retire(0, &session, 3).is_err());
        assert_eq!(
            documents.copy(None, &session).unwrap().source,
            "later input"
        );
        documents
            .checkpoint(None, &session, 5, "".into(), "".into(), false)
            .unwrap();
        documents.retire(0, &session, 5).unwrap();
    }
    #[test]
    fn exact_snapshot_stale_write_and_clear() {
        let directory = tempfile::tempdir().unwrap();
        let mut store = Store::new(directory.path().to_path_buf()).unwrap();
        let source = "\u{feff}日本語😀\r\na\rb\n";
        store
            .checkpoint(1, source.into(), "Untitled".into(), true)
            .unwrap();
        let id = store.session_id();
        assert_eq!(store.copy(&id).unwrap().source, source);
        store.checkpoint(3, "".into(), "".into(), false).unwrap();
        assert!(store
            .checkpoint(2, "stale".into(), "".into(), true)
            .is_err());
        assert!(store.listing().unwrap().entries.is_empty());
        store.checkpoint(4, "new".into(), "".into(), true).unwrap();
        assert!(store.checkpoint(3, "".into(), "".into(), false).is_err());
        assert_eq!(store.copy(&id).unwrap().source, "new");
    }
    #[test]
    fn skip_active_sessions_then_restore_orphans_and_own_renderer_copy() {
        let directory = tempfile::tempdir().unwrap();
        let first = Store::new(directory.path().to_path_buf()).unwrap();
        let mut second = Store::new(directory.path().to_path_buf()).unwrap();
        second
            .checkpoint(1, "unsaved".into(), "file.md".into(), true)
            .unwrap();
        let id = second.session_id();
        assert!(first.listing().unwrap().entries.is_empty());
        assert!(first.copy(&id).is_err());
        assert_eq!(second.copy(&id).unwrap().source, "unsaved");
        drop(second);
        assert_eq!(first.listing().unwrap().entries.len(), 1);
        assert_eq!(first.copy(&id).unwrap().source, "unsaved");
        assert!(first.copy("../source.md").is_err());
    }
    #[test]
    fn publication_uncertainty_keeps_copy_and_reserves_revision() {
        let directory = tempfile::tempdir().unwrap();
        let mut store = Store::new(directory.path().to_path_buf()).unwrap();
        let error = store
            .checkpoint_with(1, "kept".into(), "".into(), true, |_| {
                Err("sync failed".into())
            })
            .unwrap_err();
        assert!(error.contains("uncertain"));
        assert_eq!(read_record(&store.session).unwrap().source, "kept");
        assert!(store.checkpoint(1, "old".into(), "".into(), true).is_err());
        store.checkpoint(2, "new".into(), "".into(), true).unwrap();
        assert_eq!(read_record(&store.session).unwrap().source, "new");
    }
    #[test]
    fn invalid_and_oversize_records_are_kept_without_restore() {
        let directory = tempfile::tempdir().unwrap();
        let mut store = Store::new(directory.path().to_path_buf()).unwrap();
        assert!(store
            .checkpoint(1, "a".repeat(SOURCE_LIMIT + 1), "".into(), true)
            .is_err());
        fs::write(store.session.join("snapshot.json"), b"{broken}").unwrap();
        let old = store.session.clone();
        let listing = store.start_renderer().unwrap();
        assert!(listing.entries.is_empty());
        assert_eq!(listing.warnings.len(), 1);
        assert!(old.join("snapshot.json").exists());
    }
    #[test]
    fn renderer_restart_keeps_previous_copy_and_rotates_identity() {
        let directory = tempfile::tempdir().unwrap();
        let mut store = Store::new(directory.path().to_path_buf()).unwrap();
        let id = store.session_id();
        store
            .checkpoint(10, "prior renderer".into(), "file.md".into(), true)
            .unwrap();
        let listing = store.start_renderer().unwrap();
        assert_ne!(listing.session, id);
        assert_eq!(listing.revision, 0);
        assert_eq!(listing.entries[0].id, id);
        assert!(store
            .checkpoint_session(&id, 11, "late old renderer".into(), "".into(), true)
            .is_err());
        store
            .checkpoint(1, "new renderer".into(), "".into(), true)
            .unwrap();
        assert_eq!(store.copy(&id).unwrap().source, "prior renderer");
    }
    #[test]
    fn clear_retry_confirms_directory_even_after_uncertain_removal() {
        let directory = tempfile::tempdir().unwrap();
        let mut store = Store::new(directory.path().to_path_buf()).unwrap();
        store
            .checkpoint(1, "source".into(), "".into(), true)
            .unwrap();
        assert!(store
            .checkpoint_with(
                2,
                "".into(),
                "".into(),
                false,
                |_| Err("sync failed".into())
            )
            .unwrap_err()
            .contains("uncertain"));
        assert!(!store.session.join("snapshot.json").exists());
        let called = std::cell::Cell::new(false);
        store
            .checkpoint_with(3, "".into(), "".into(), false, |_| {
                called.set(true);
                Ok(())
            })
            .unwrap();
        assert!(called.get());
    }
    #[test]
    fn renderer_restart_without_snapshot_invalidates_old_requests() {
        let directory = tempfile::tempdir().unwrap();
        let mut store = Store::new(directory.path().to_path_buf()).unwrap();
        let old = store.session_id();
        let current = store.start_renderer().unwrap().session;
        assert_ne!(old, current);
        store
            .checkpoint_session(&current, 1, "current".into(), "".into(), true)
            .unwrap();
        assert!(store
            .checkpoint_session(&old, 2, "old".into(), "".into(), true)
            .is_err());
        assert!(store
            .checkpoint_session(&old, 3, "".into(), "".into(), false)
            .is_err());
        assert_eq!(store.copy(&current).unwrap().source, "current");
    }
    #[test]
    fn unreadable_lease_warns_and_invalid_schema_utf8_and_sizes_cannot_restore() {
        let directory = tempfile::tempdir().unwrap();
        let first = Store::new(directory.path().to_path_buf()).unwrap();
        let mut second = Store::new(directory.path().to_path_buf()).unwrap();
        second
            .checkpoint(1, "kept".into(), "".into(), true)
            .unwrap();
        let id = second.session_id();
        let session = second.session.clone();
        drop(second);
        fs::remove_file(session.join("lease")).unwrap();
        let list = first.listing().unwrap();
        assert!(list.entries.is_empty());
        assert_eq!(list.warnings.len(), 1);
        assert!(first.copy(&id).is_err());
        assert!(session.join("snapshot.json").exists());
        for bytes in [
            b"\xff".as_slice(),
            br#"{"schema":2,"revision":1,"source":"x","label":""}"#.as_slice(),
            br#"{"schema":1,"revision":0,"source":"x","label":""}"#.as_slice(),
        ] {
            fs::write(first.session.join("snapshot.json"), bytes).unwrap();
            assert!(read_record(&first.session).is_err());
        }
        fs::File::create(first.session.join("snapshot.json"))
            .unwrap()
            .set_len(RECORD_LIMIT + 1)
            .unwrap();
        assert!(read_record(&first.session).is_err());
    }
    #[test]
    fn discarding_orphan_recovery_copies_removes_them_from_listing() {
        let directory = tempfile::tempdir().unwrap();
        let first = Store::new(directory.path().to_path_buf()).unwrap();
        let mut second = Store::new(directory.path().to_path_buf()).unwrap();
        second
            .checkpoint(1, "orphan text".into(), "file.md".into(), true)
            .unwrap();
        let second_id = second.session_id();
        drop(second);

        let list = first.listing().unwrap();
        assert_eq!(list.entries.len(), 1);
        assert_eq!(list.entries[0].id, second_id);

        assert!(first.discard(&first.session_id()).is_err());
        first.discard(&second_id).unwrap();

        let updated = first.listing().unwrap();
        assert!(updated.entries.is_empty());
        assert!(first.copy(&second_id).is_err());
    }
}
