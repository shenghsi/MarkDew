use serde::Serialize;
use std::{fs, path::Path};

const SCAN_LIMIT: usize = 2000;
#[derive(Serialize)]
pub struct Entry {
    name: String,
    path: String,
    directory: bool,
}
#[derive(Serialize)]
pub struct Listing {
    entries: Vec<Entry>,
    warnings: Vec<String>,
}

fn linked(metadata: &fs::Metadata) -> bool {
    if metadata.file_type().is_symlink() {
        return true;
    }
    #[cfg(windows)]
    {
        use std::os::windows::fs::MetadataExt;
        if metadata.file_attributes() & 0x400 != 0 {
            return true;
        }
    }
    false
}

pub fn list(path: &Path) -> Result<Listing, String> {
    if !path.is_absolute() {
        return Err("Choose an absolute folder path.".into());
    }
    let metadata = fs::symlink_metadata(path).map_err(|e| e.to_string())?;
    if !metadata.is_dir() || linked(&metadata) {
        return Err("Choose a regular folder without a link or reparse point.".into());
    }
    // ReadDir holds the enumeration handle. Path checks cannot prevent another
    // process from replacing a parent or entry before a later Open command.
    let reader = fs::read_dir(path).map_err(|e| e.to_string())?;
    let mut result = Listing {
        entries: vec![],
        warnings: vec![],
    };
    let mut skipped = false;
    for (count, entry) in reader.enumerate() {
        if count == SCAN_LIMIT {
            result
                .warnings
                .push("This folder has more than 2,000 entries. The list is incomplete.".into());
            break;
        }
        let entry = match entry {
            Ok(entry) => entry,
            Err(_) => {
                skipped = true;
                continue;
            }
        };
        let path = entry.path();
        let metadata = match fs::symlink_metadata(&path) {
            Ok(value) => value,
            Err(_) => {
                skipped = true;
                continue;
            }
        };
        if linked(&metadata) {
            continue;
        }
        let directory = metadata.is_dir();
        if !directory
            && (!metadata.is_file()
                || !path.extension().and_then(|e| e.to_str()).is_some_and(|e| {
                    ["md", "markdown", "txt"]
                        .iter()
                        .any(|suffix| e.eq_ignore_ascii_case(suffix))
                }))
        {
            continue;
        }
        let (Some(name), Some(path)) =
            (entry.file_name().to_str().map(str::to_owned), path.to_str())
        else {
            skipped = true;
            continue;
        };
        result.entries.push(Entry {
            name,
            path: path.to_owned(),
            directory,
        });
    }
    if skipped {
        result
            .warnings
            .push("Some entries could not be read or have unsupported filename encoding.".into());
    }
    result.entries.sort_by(|a, b| {
        b.directory
            .cmp(&a.directory)
            .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
            .then_with(|| a.name.cmp(&b.name))
    });
    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn lists_supported_files_and_folders_with_literal_unicode_paths() {
        let root = tempfile::tempdir().unwrap();
        fs::create_dir(root.path().join("日本語%20")).unwrap();
        for name in ["b.MD", "a.txt", "c.markdown", "image.png"] {
            fs::write(root.path().join(name), "").unwrap();
        }
        let result = list(root.path()).unwrap();
        assert_eq!(
            result
                .entries
                .iter()
                .map(|e| e.name.as_str())
                .collect::<Vec<_>>(),
            ["日本語%20", "a.txt", "b.MD", "c.markdown"]
        );
        assert_eq!(
            result.entries[0].path,
            root.path().join("日本語%20").to_str().unwrap()
        );
        assert!(result.warnings.is_empty());
        assert!(list(Path::new("relative")).is_err());
        assert!(list(&root.path().join("a.txt")).is_err());
        assert!(list(&root.path().join("missing")).is_err());
    }
    #[test]
    fn bounds_scanned_entries_even_when_files_are_not_markdown() {
        let root = tempfile::tempdir().unwrap();
        for i in 0..=SCAN_LIMIT {
            fs::write(root.path().join(format!("{i}.bin")), "").unwrap();
        }
        let result = list(root.path()).unwrap();
        assert!(result.entries.is_empty());
        assert!(result.warnings[0].contains("incomplete"));
    }
    #[cfg(unix)]
    #[test]
    fn rejects_link_roots_and_omits_link_entries() {
        use std::os::unix::fs::symlink;
        let root = tempfile::tempdir().unwrap();
        let real = root.path().join("real");
        fs::create_dir(&real).unwrap();
        fs::write(real.join("doc.md"), "").unwrap();
        symlink(&real, root.path().join("alias")).unwrap();
        symlink(real.join("doc.md"), root.path().join("alias.md")).unwrap();
        assert!(list(&root.path().join("alias")).is_err());
        assert_eq!(list(root.path()).unwrap().entries.len(), 1);
    }
}
