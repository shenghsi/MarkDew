use crate::{
    documents::{self, Documents},
    images,
};
use std::{
    fs,
    io::{Read, Write},
    path::{Path, PathBuf},
    sync::Mutex,
};

pub fn copy_for_document(
    host: &Mutex<Documents>,
    id: u64,
    generation: u64,
    path: &Path,
    bytes: &[u8],
) -> Result<String, String> {
    documents::with_document(host, Some(id), |doc| {
        if doc.generation != generation || doc.path.as_deref() != Some(path) {
            return Err("The document changed. Choose the image again.".into());
        }
        if doc.uncertain {
            return Err("Check the last save before copying an image.".into());
        }
        // The document lock stays held through publication. Registry lock order
        // remains unchanged; retirement cannot pass this lock during the copy.
        save(path, bytes)
    })
}

fn folder(path: &Path) -> Result<(PathBuf, String), String> {
    if !path.is_absolute() {
        return Err("Save the document before copying an image.".into());
    }
    let parent = path.parent().ok_or("The document has no parent folder.")?;
    let stem = path
        .file_stem()
        .and_then(|name| name.to_str())
        .filter(|name| !name.is_empty())
        .ok_or("Use a UTF-8 document file name.")?;
    Ok((parent.to_path_buf(), format!("{stem}.assets")))
}
fn extension(bytes: &[u8]) -> Result<&'static str, String> {
    if bytes.is_empty() || bytes.len() > crate::LIMIT {
        return Err("The image exceeds the 8 MiB limit.".into());
    }
    images::validate(bytes)
}
pub fn save(path: &Path, bytes: &[u8]) -> Result<String, String> {
    save_with(path, bytes, || Ok(()), || Ok(()))
}

#[cfg(test)]
mod tests {
    use super::*;
    const PNG: &[u8] = b"\x89PNG\r\n\x1a\nimage bytes";
    fn entries(folder: &Path) -> Vec<PathBuf> {
        fs::read_dir(folder)
            .unwrap()
            .map(|e| e.unwrap().path())
            .collect()
    }
    #[test]
    fn copies_exact_bytes_without_replacing_assets_or_document() {
        let root = tempfile::tempdir().unwrap();
        let path = root.path().join("图 #100%.md");
        fs::write(&path, b"source\r\n").unwrap();
        let first = save(&path, PNG).unwrap();
        let second = save(&path, PNG).unwrap();
        assert_ne!(first, second);
        assert!(first.starts_with("图 #100%.assets/image-"));
        assert_eq!(fs::read(root.path().join(first)).unwrap(), PNG);
        assert_eq!(fs::read(root.path().join(second)).unwrap(), PNG);
        assert_eq!(fs::read(path).unwrap(), b"source\r\n");
        assert_eq!(entries(&root.path().join("图 #100%.assets")).len(), 2);
    }
    #[test]
    fn svg_copy_retains_original_bytes_and_uses_svg_extension() {
        let root = tempfile::tempdir().unwrap();
        let path = root.path().join("doc.md");
        let svg = b"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 10 10\"><style>path{fill:red}</style><path d=\"M0 0h10v10z\"/></svg>";
        let destination = save(&path, svg).unwrap();
        assert!(destination.ends_with(".svg"));
        assert_eq!(fs::read(root.path().join(destination)).unwrap(), svg);
    }
    #[test]
    fn rejects_invalid_input_and_non_directory_asset_folder() {
        let root = tempfile::tempdir().unwrap();
        let path = root.path().join("doc.md");
        assert!(save(Path::new("doc.md"), PNG).is_err());
        assert!(save(&path, b"not an image").is_err());
        assert!(save(&path, &vec![0; crate::LIMIT + 1]).is_err());
        assert!(!root.path().join("doc.assets").exists());
        fs::write(root.path().join("doc.assets"), b"keep").unwrap();
        assert!(save(&path, PNG).is_err());
        assert_eq!(fs::read(root.path().join("doc.assets")).unwrap(), b"keep");
    }
    #[test]
    fn failures_before_and_after_publication_have_distinct_results() {
        let root = tempfile::tempdir().unwrap();
        let path = root.path().join("doc.md");
        assert!(save_with(&path, PNG, || Err("before".into()), || Ok(())).is_err());
        assert!(entries(&root.path().join("doc.assets")).is_empty());
        let error = save_with(&path, PNG, || Ok(()), || Err("confirmation".into())).unwrap_err();
        assert!(error.contains("copy is retained"));
        let files = entries(&root.path().join("doc.assets"));
        assert_eq!(files.len(), 1);
        assert_eq!(fs::read(&files[0]).unwrap(), PNG);
    }
    #[test]
    fn final_name_collision_keeps_existing_file() {
        let root = tempfile::tempdir().unwrap();
        let path = root.path().join("doc.md");
        let dir = root.path().join("doc.assets");
        assert!(save_with(
            &path,
            PNG,
            || {
                let pending = entries(&dir).pop().unwrap();
                let final_name = pending.file_name().unwrap().to_str().unwrap().replacen(
                    ".pending-",
                    "image-",
                    1,
                );
                fs::write(dir.join(final_name), b"keep").unwrap();
                Ok(())
            },
            || Ok(())
        )
        .is_err());
        let files = entries(&dir);
        assert_eq!(files.len(), 1);
        assert_eq!(fs::read(&files[0]).unwrap(), b"keep");
    }
    #[test]
    fn document_identity_generation_and_uncertainty_guard_the_copy() {
        let root = tempfile::tempdir().unwrap();
        let path = root.path().join("doc.md");
        let host = Mutex::new(Documents::default());
        documents::with_document(&host, Some(0), |doc| {
            doc.path = Some(path.clone());
            doc.baseline = b"baseline".to_vec();
            doc.generation = 3;
            Ok(())
        })
        .unwrap();
        assert!(copy_for_document(&host, 0, 2, &path, PNG).is_err());
        assert!(copy_for_document(&host, 0, 3, &root.path().join("other.md"), PNG).is_err());
        documents::with_document(&host, Some(0), |doc| {
            doc.uncertain = true;
            Ok(())
        })
        .unwrap();
        assert!(copy_for_document(&host, 0, 3, &path, PNG).is_err());
        assert!(!root.path().join("doc.assets").exists());
        documents::with_document(&host, Some(0), |doc| {
            doc.uncertain = false;
            Ok(())
        })
        .unwrap();
        copy_for_document(&host, 0, 3, &path, PNG).unwrap();
        documents::with_document(&host, Some(0), |doc| {
            assert_eq!(doc.baseline, b"baseline");
            assert_eq!(doc.generation, 3);
            Ok(())
        })
        .unwrap();
        host.lock().unwrap().retire(0).unwrap();
        assert!(copy_for_document(&host, 0, 3, &path, PNG).is_err());
    }
    #[cfg(unix)]
    #[test]
    fn replacement_folders_and_temporary_entries_are_not_used_or_removed() {
        use std::os::unix::fs::symlink;
        let root = tempfile::tempdir().unwrap();
        let path = root.path().join("doc.md");
        let dir = root.path().join("doc.assets");
        let moved = root.path().join("moved");
        assert!(save_with(
            &path,
            PNG,
            || {
                fs::rename(&dir, &moved).unwrap();
                fs::create_dir(&dir).unwrap();
                Ok(())
            },
            || Ok(())
        )
        .is_err());
        assert!(entries(&dir).is_empty());
        assert!(entries(&moved).is_empty());
        let mut replacement = PathBuf::new();
        assert!(save_with(
            &path,
            PNG,
            || {
                replacement = entries(&dir).pop().unwrap();
                fs::rename(&replacement, root.path().join("original-pending")).unwrap();
                fs::write(&replacement, b"keep").unwrap();
                Ok(())
            },
            || Ok(())
        )
        .is_err());
        assert_eq!(fs::read(&replacement).unwrap(), b"keep");
        let other = root.path().join("other.md");
        symlink(&moved, root.path().join("other.assets")).unwrap();
        assert!(save(&other, PNG).is_err());
        assert!(entries(&moved).is_empty());
    }
    #[cfg(unix)]
    #[test]
    fn folder_replacement_after_publication_retains_copy_in_held_directory() {
        let root = tempfile::tempdir().unwrap();
        let path = root.path().join("doc.md");
        let dir = root.path().join("doc.assets");
        let moved = root.path().join("moved");
        let error = save_with(
            &path,
            PNG,
            || Ok(()),
            || {
                fs::rename(&dir, &moved).unwrap();
                fs::create_dir(&dir).unwrap();
                Ok(())
            },
        )
        .unwrap_err();
        assert!(error.contains("copy is retained"));
        assert!(entries(&dir).is_empty());
        let files = entries(&moved);
        assert_eq!(files.len(), 1);
        assert_eq!(fs::read(&files[0]).unwrap(), PNG);
    }
}
fn save_with(
    path: &Path,
    bytes: &[u8],
    before: impl FnOnce() -> Result<(), String>,
    after: impl FnOnce() -> Result<(), String>,
) -> Result<String, String> {
    let ext = extension(bytes)?;
    let (parent, folder) = folder(path)?;
    platform::save(&parent, &folder, ext, bytes, before, after)
}

#[cfg(unix)]
mod platform {
    use super::*;
    use std::{
        ffi::CString,
        os::{
            fd::{AsRawFd, FromRawFd},
            unix::fs::MetadataExt,
        },
    };
    fn parent_open(path: &Path) -> Result<fs::File, String> {
        use std::os::unix::fs::OpenOptionsExt;
        fs::OpenOptions::new()
            .read(true)
            .custom_flags(libc::O_DIRECTORY | libc::O_NONBLOCK | libc::O_CLOEXEC)
            .open(path)
            .map_err(|e| e.to_string())
    }
    fn name(value: &str) -> Result<CString, String> {
        CString::new(value).map_err(|e| e.to_string())
    }
    fn open(dir: &fs::File, name: &CString, flags: i32) -> Result<fs::File, String> {
        let fd = unsafe {
            libc::openat(
                dir.as_raw_fd(),
                name.as_ptr(),
                flags | libc::O_CLOEXEC | libc::O_NOFOLLOW,
                0o600,
            )
        };
        if fd < 0 {
            return Err(std::io::Error::last_os_error().to_string());
        }
        Ok(unsafe { fs::File::from_raw_fd(fd) })
    }
    struct Pending<'a> {
        dir: &'a fs::File,
        name: CString,
        identity: fs::Metadata,
    }
    impl Pending<'_> {
        fn owned(&self) -> bool {
            open(self.dir, &self.name, libc::O_RDONLY | libc::O_NONBLOCK)
                .and_then(|file| file.metadata().map_err(|e| e.to_string()))
                .is_ok_and(|m| {
                    m.is_file() && m.dev() == self.identity.dev() && m.ino() == self.identity.ino()
                })
        }
    }
    fn create_pending(dir: &fs::File, name: CString) -> Result<(fs::File, Pending<'_>), String> {
        let file = open(dir, &name, libc::O_WRONLY | libc::O_CREAT | libc::O_EXCL)?;
        let identity = file.metadata().map_err(|e| e.to_string())?;
        Ok((
            file,
            Pending {
                dir,
                name,
                identity,
            },
        ))
    }
    impl Drop for Pending<'_> {
        fn drop(&mut self) {
            if self.owned() {
                unsafe {
                    libc::unlinkat(self.dir.as_raw_fd(), self.name.as_ptr(), 0);
                }
            }
        }
    }
    fn same_directory(left: &fs::File, right: &fs::File) -> Result<bool, String> {
        let a = left.metadata().map_err(|e| e.to_string())?;
        let b = right.metadata().map_err(|e| e.to_string())?;
        Ok(a.dev() == b.dev() && a.ino() == b.ino())
    }
    pub fn save(
        parent: &Path,
        folder: &str,
        ext: &str,
        bytes: &[u8],
        before: impl FnOnce() -> Result<(), String>,
        after: impl FnOnce() -> Result<(), String>,
    ) -> Result<String, String> {
        let parent_dir = parent_open(parent)?;
        let folder_name = name(folder)?;
        let created = unsafe { libc::mkdirat(parent_dir.as_raw_fd(), folder_name.as_ptr(), 0o700) };
        if created < 0
            && std::io::Error::last_os_error().kind() != std::io::ErrorKind::AlreadyExists
        {
            return Err(std::io::Error::last_os_error().to_string());
        }
        let dir = open(
            &parent_dir,
            &folder_name,
            libc::O_RDONLY | libc::O_DIRECTORY,
        )?;
        let current = || -> Result<(), String> {
            let observed_parent = parent_open(parent)?;
            let observed = open(
                &parent_dir,
                &folder_name,
                libc::O_RDONLY | libc::O_DIRECTORY,
            )?;
            if !same_directory(&parent_dir, &observed_parent)? || !same_directory(&dir, &observed)?
            {
                return Err("The image folder changed during the copy.".into());
            }
            Ok(())
        };
        let mut random = [0u8; 16];
        fs::File::open("/dev/urandom")
            .and_then(|mut f| f.read_exact(&mut random))
            .map_err(|e| e.to_string())?;
        let suffix = format!(
            "{}.{ext}",
            random
                .iter()
                .map(|b| format!("{b:02x}"))
                .collect::<String>()
        );
        let final_name = name(&format!("image-{suffix}"))?;
        let pending_name = name(&format!(".pending-{suffix}"))?;
        let (mut file, pending) = create_pending(&dir, pending_name)?;
        file.write_all(bytes).map_err(|e| e.to_string())?;
        file.sync_all().map_err(|e| e.to_string())?;
        before()?;
        current()?;
        if !pending.owned() {
            return Err("The temporary image changed during the copy.".into());
        }
        if unsafe {
            libc::linkat(
                dir.as_raw_fd(),
                pending.name.as_ptr(),
                dir.as_raw_fd(),
                final_name.as_ptr(),
                0,
            )
        } < 0
        {
            return Err(format!(
                "Cannot publish image without replacing a file: {}",
                std::io::Error::last_os_error()
            ));
        }
        // All later failures retain the asset and explicitly report uncertainty.
        let confirm = || -> Result<(), String> {
            after()?;
            current()?;
            let observed = open(&dir, &final_name, libc::O_RDONLY | libc::O_NONBLOCK)?;
            let identity = observed.metadata().map_err(|e| e.to_string())?;
            if !identity.is_file()
                || identity.dev() != pending.identity.dev()
                || identity.ino() != pending.identity.ino()
            {
                return Err("The copied image is no longer regular.".into());
            }
            let mut readback = Vec::new();
            observed
                .take((crate::LIMIT + 1) as u64)
                .read_to_end(&mut readback)
                .map_err(|e| e.to_string())?;
            if readback != bytes {
                return Err("The copied image changed during confirmation.".into());
            }
            drop(pending);
            dir.sync_all().map_err(|e| e.to_string())?;
            parent_dir.sync_all().map_err(|e| e.to_string())?;
            current()
        };
        confirm().map_err(|error| format!("Image was published in {folder}, but confirmation failed. The copy is retained; inspect the image folder before retrying: {error}"))?;
        Ok(format!("{folder}/image-{suffix}"))
    }
    #[cfg(test)]
    mod tests {
        use super::*;
        #[test]
        fn exclusive_open_failure_does_not_delete_an_existing_temporary_entry() {
            let root = tempfile::tempdir().unwrap();
            let path = root.path().join(".pending-existing");
            fs::write(&path, b"keep").unwrap();
            let dir = parent_open(root.path()).unwrap();
            assert!(create_pending(&dir, name(".pending-existing").unwrap()).is_err());
            assert_eq!(fs::read(path).unwrap(), b"keep");
        }
        #[test]
        fn parent_fifo_is_rejected_without_a_blocking_read() {
            use std::os::unix::ffi::OsStrExt;
            let root = tempfile::tempdir().unwrap();
            let fifo = root.path().join("fifo");
            let path = CString::new(fifo.as_os_str().as_bytes()).unwrap();
            assert_eq!(unsafe { libc::mkfifo(path.as_ptr(), 0o600) }, 0);
            assert!(parent_open(&fifo).is_err());
        }
    }
}

#[cfg(not(unix))]
mod platform {
    use super::*;
    fn regular_folder(path: &Path) -> Result<(), String> {
        let metadata = fs::symlink_metadata(path).map_err(|e| e.to_string())?;
        #[cfg(windows)]
        {
            use std::os::windows::fs::MetadataExt;
            if metadata.file_attributes() & 0x400 != 0 {
                return Err("Use an image folder without reparse points.".into());
            }
        }
        if !metadata.is_dir() || metadata.file_type().is_symlink() {
            return Err("Use a regular image folder, not a link.".into());
        }
        Ok(())
    }
    pub fn save(
        parent: &Path,
        folder: &str,
        ext: &str,
        bytes: &[u8],
        before: impl FnOnce() -> Result<(), String>,
        after: impl FnOnce() -> Result<(), String>,
    ) -> Result<String, String> {
        let directory = parent.join(folder);
        match fs::create_dir(&directory) {
            Ok(()) => {}
            Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => {}
            Err(error) => return Err(error.to_string()),
        }
        regular_folder(&directory)?;
        let mut pending = tempfile::Builder::new()
            .prefix(".pending-")
            .suffix(&format!(".{ext}"))
            .tempfile_in(&directory)
            .map_err(|e| e.to_string())?;
        let final_name = pending
            .path()
            .file_name()
            .and_then(|name| name.to_str())
            .ok_or("Invalid image name.")?
            .replacen(".pending-", "image-", 1);
        let destination = directory.join(&final_name);
        pending.write_all(bytes).map_err(|e| e.to_string())?;
        pending.as_file().sync_all().map_err(|e| e.to_string())?;
        before()?;
        regular_folder(&directory)?;
        pending
            .persist_noclobber(&destination)
            .map_err(|e| format!("Cannot publish image without replacing a file: {e}"))?;
        let confirm = || -> Result<(), String> {
            after()?;
            regular_folder(&directory)?;
            if crate::read(&destination)? != bytes {
                return Err("The copied image changed during confirmation.".into());
            }
            Ok(())
        };
        confirm().map_err(|error| format!("Image was published in {folder}, but confirmation failed. The copy is retained; inspect the image folder before retrying: {error}"))?;
        // Path checks cannot prevent every Windows folder replacement race.
        Ok(format!("{folder}/{final_name}"))
    }
}
