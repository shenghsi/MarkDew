use crate::documents::{with_document, Documents};
use serde::Serialize;
use std::{path::PathBuf, sync::Mutex};

#[derive(Serialize)]
pub struct Target {
    pub path: String,
    pub origin: Option<String>,
}

fn markdown(path: &std::path::Path) -> bool {
    path.extension()
        .and_then(|value| value.to_str())
        .is_some_and(|value| {
            ["md", "markdown", "txt"]
                .iter()
                .any(|extension| value.eq_ignore_ascii_case(extension))
        })
}

fn path(destination: &str, origin: Option<&PathBuf>) -> Result<PathBuf, String> {
    if destination.is_empty()
        || destination.len() > 8192
        || destination.contains(['?', '#'])
        || destination.chars().any(char::is_control)
    {
        return Err("Use a bounded local file path without a query or fragment.".into());
    }
    let bytes = destination.as_bytes();
    for index in 0..bytes.len() {
        if bytes[index] == b'%'
            && (index + 2 >= bytes.len()
                || !bytes[index + 1].is_ascii_hexdigit()
                || !bytes[index + 2].is_ascii_hexdigit())
        {
            return Err("The file link has an invalid percent escape.".into());
        }
    }
    let decoded = percent_encoding::percent_decode_str(destination)
        .decode_utf8()
        .map_err(|_| "Use a UTF-8 file link.")?;
    if decoded.chars().any(char::is_control) || decoded.starts_with("//") {
        return Err("Use a local file path without control characters.".into());
    }
    if let Some((prefix, tail)) = decoded.split_once(':') {
        let drive = cfg!(windows)
            && prefix.len() == 1
            && prefix.as_bytes()[0].is_ascii_alphabetic()
            && tail.starts_with(['/', '\\']);
        if !prefix.contains(['/', '\\']) && !drive {
            return Err("Use a local file path, not a URL.".into());
        }
    }
    let path = PathBuf::from(decoded.as_ref());
    if !markdown(&path) {
        return Err("Use a Markdown or text file link.".into());
    }
    if path.is_absolute() {
        return Ok(path);
    }
    // A Windows path must not become a relative filename on another platform.
    if decoded.starts_with("\\\\") || decoded.as_bytes().get(1) == Some(&b':') {
        return Err("Use a file path for this operating system.".into());
    }
    let parent = origin
        .and_then(|path| path.parent())
        .ok_or("Save the document before opening a relative file link.")?;
    Ok(parent.join(path))
}

pub fn resolve(
    host: &Mutex<Documents>,
    window: &str,
    id: u64,
    expected: &str,
    destination: &str,
) -> Result<Target, String> {
    if window != "main" {
        return Err("Open file links from the document window.".into());
    }
    let (origin, generation) = with_document(host, Some(id), |doc| {
        if doc
            .path
            .as_ref()
            .and_then(|path| path.to_str())
            .unwrap_or("")
            != expected
        {
            return Err("The document path changed. Repeat the file link.".into());
        }
        Ok((doc.path.clone(), doc.generation))
    })?;
    let path = path(destination, origin.as_ref())?
        .canonicalize()
        .map_err(|error| error.to_string())?;
    if !markdown(&path) || !path.is_file() {
        return Err("Use a regular Markdown or text file.".into());
    }
    let target = Target {
        path: path.to_str().ok_or("Use a UTF-8 file path.")?.into(),
        origin: origin
            .as_ref()
            .and_then(|path| path.canonicalize().ok())
            .and_then(|path| path.to_str().map(String::from)),
    };
    confirm(host, id, origin, generation, target)
}

fn confirm(
    host: &Mutex<Documents>,
    id: u64,
    origin: Option<PathBuf>,
    generation: u64,
    target: Target,
) -> Result<Target, String> {
    with_document(host, Some(id), |doc| {
        if doc.generation != generation || doc.path != origin {
            return Err("The document changed. Repeat the file link.".into());
        }
        Ok(target)
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn stale_origin_cannot_publish_a_resolved_target() {
        let host = Mutex::new(Documents::default());
        let origin = Some(PathBuf::from("origin.md"));
        with_document(&host, Some(0), |doc| {
            doc.path = origin.clone();
            Ok(())
        })
        .unwrap();
        let target = || Target {
            path: "target.md".into(),
            origin: None,
        };
        assert!(confirm(&host, 0, origin.clone(), 0, target()).is_ok());
        with_document(&host, Some(0), |doc| {
            doc.generation += 1;
            Ok(())
        })
        .unwrap();
        assert!(confirm(&host, 0, origin.clone(), 0, target()).is_err());
        with_document(&host, Some(0), |doc| {
            doc.path = Some(PathBuf::from("saved-as.md"));
            Ok(())
        })
        .unwrap();
        assert!(confirm(&host, 0, origin.clone(), 1, target()).is_err());
        host.lock().unwrap().retire(0).unwrap();
        assert!(confirm(&host, 0, origin, 1, target()).is_err());
    }
    #[cfg(unix)]
    #[test]
    fn aliases_resolve_to_the_target_and_check_its_extension() {
        let folder = tempfile::tempdir().unwrap();
        let origin = folder.path().join("origin.md");
        let file = folder.path().join("target.md");
        std::fs::write(&origin, "source").unwrap();
        std::fs::write(&file, "target").unwrap();
        std::os::unix::fs::symlink(&file, folder.path().join("alias.md")).unwrap();
        let host = Mutex::new(Documents::default());
        with_document(&host, Some(0), |doc| {
            doc.path = Some(origin.clone());
            Ok(())
        })
        .unwrap();
        assert_eq!(
            PathBuf::from(
                resolve(&host, "main", 0, origin.to_str().unwrap(), "alias.md")
                    .unwrap()
                    .path
            ),
            file.canonicalize().unwrap()
        );
        let other = folder.path().join("image.png");
        std::fs::write(&other, "text").unwrap();
        std::os::unix::fs::symlink(&other, folder.path().join("invalid.md")).unwrap();
        assert!(resolve(&host, "main", 0, origin.to_str().unwrap(), "invalid.md").is_err());
    }
    #[test]
    fn decoding_and_native_path_rules() {
        let folder = tempfile::tempdir().unwrap();
        let origin = folder.path().join("origin.md");
        assert_eq!(
            path("%E6%97%A5%20%2520%23.md", Some(&origin)).unwrap(),
            folder.path().join("日 %20#.md")
        );
        for bad in [
            "",
            "%",
            "%ff.md",
            "%00.md",
            "%0a.md",
            "x.md?query",
            "x.md#heading",
            "file:///x.md",
            "https://example.com/x.md",
            "//server/x.md",
            "x.png",
        ] {
            assert!(path(bad, Some(&origin)).is_err(), "{bad}");
        }
        assert!(path("x.md", None).is_err());
        #[cfg(windows)]
        {
            assert_eq!(
                path("C:%5Cnotes%5Ca.md", None).unwrap(),
                PathBuf::from("C:\\notes\\a.md")
            );
            assert_eq!(
                path("%5C%5Cserver%5Cshare%5Ca.md", None).unwrap(),
                PathBuf::from("\\\\server\\share\\a.md")
            );
        }
        #[cfg(not(windows))]
        assert!(path("C:%5Cnotes%5Ca.md", Some(&origin)).is_err());
    }
    #[test]
    fn resolution_preserves_origin_and_rejects_wrong_identity_and_non_files() {
        let folder = tempfile::tempdir().unwrap();
        let origin = folder.path().join("origin.md");
        let target = folder.path().join("日 %20#.md");
        std::fs::write(&origin, "original").unwrap();
        std::fs::write(&target, "target").unwrap();
        let host = Mutex::new(Documents::default());
        with_document(&host, Some(0), |doc| {
            doc.path = Some(origin.clone());
            doc.baseline = b"original".to_vec();
            Ok(())
        })
        .unwrap();
        let expected = origin.to_str().unwrap();
        let result = resolve(&host, "main", 0, expected, "%E6%97%A5%20%2520%23.md").unwrap();
        assert_eq!(PathBuf::from(result.path), target.canonicalize().unwrap());
        assert_eq!(
            PathBuf::from(result.origin.unwrap()),
            origin.canonicalize().unwrap()
        );
        assert!(resolve(&host, "other", 0, expected, "origin.md").is_err());
        assert!(resolve(&host, "main", 99, expected, "origin.md").is_err());
        assert!(resolve(&host, "main", 0, "wrong", "origin.md").is_err());
        std::fs::create_dir(folder.path().join("folder.md")).unwrap();
        assert!(resolve(&host, "main", 0, expected, "folder.md").is_err());
        assert!(resolve(&host, "main", 0, expected, "missing.md").is_err());
        with_document(&host, Some(0), |doc| {
            assert_eq!(doc.baseline, b"original");
            assert_eq!(doc.generation, 0);
            Ok(())
        })
        .unwrap();
    }
}
