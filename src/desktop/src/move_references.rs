use serde::{Deserialize, Serialize};
use std::{fs, path::{Path, PathBuf}};

#[derive(Serialize)]
pub struct Source { pub path: String, pub source: String }
#[derive(Deserialize)]
pub struct Update { pub path: String, pub source: String, pub next: String }
#[derive(Default, Serialize)]
pub struct Outcome { pub files: Vec<Written>, pub warnings: Vec<String> }
#[derive(Serialize)]
pub struct Written { pub path: String, pub source: String, pub uncertain: bool }

fn linked(metadata: &fs::Metadata) -> bool {
    if metadata.file_type().is_symlink() { return true; }
    #[cfg(windows)] {
        use std::os::windows::fs::MetadataExt;
        if metadata.file_attributes() & 0x400 != 0 { return true; }
    }
    false
}
pub fn supported(path: &Path) -> bool {
    path.extension().and_then(|s| s.to_str()).is_some_and(|s| ["md", "markdown", "txt"].iter().any(|e| s.eq_ignore_ascii_case(e)))
}
// A bounded scan fails explicitly instead of moving with an incomplete set of references.
pub fn sources(root: &Path) -> Result<Vec<Source>, String> {
    let root = fs::canonicalize(root).map_err(|e| e.to_string())?;
    if !root.is_dir() { return Err("Choose a project folder before moving files.".into()); }
    let mut pending = vec![(root, 0)];
    let mut result = Vec::new();
    let mut bytes = 0usize;
    let mut entries = 0usize;
    while let Some((folder, depth)) = pending.pop() {
        if depth > 24 { return Err("The project is too deep to update all file links.".into()); }
        for entry in fs::read_dir(folder).map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            entries += 1;
            if entries > 50_000 { return Err("The project is too large to update all file links.".into()); }
            let path = entry.path();
            let metadata = fs::symlink_metadata(&path).map_err(|e| e.to_string())?;
            if linked(&metadata) { continue; }
            if metadata.is_dir() {
                if ![".git", "node_modules", "target", "dist", "build"].iter().any(|n| entry.file_name() == *n) { pending.push((path, depth + 1)); }
            } else if metadata.is_file() && supported(&path) {
                let source = String::from_utf8(crate::read(&path)?).map_err(|_| format!("Cannot update links in a file that is not UTF-8: {}", path.display()))?;
                bytes += source.len();
                if bytes > 32 * 1024 * 1024 || result.len() >= 5000 { return Err("The project is too large to update all file links.".into()); }
                result.push(Source { path: path.to_str().ok_or("Use UTF-8 file paths.")?.to_owned(), source });
            }
        }
    }
    Ok(result)
}
pub fn relocated(path: &Path, old: &Path, new: &Path) -> PathBuf {
    path.strip_prefix(old).map(|suffix| if suffix.as_os_str().is_empty() { new.to_path_buf() } else { new.join(suffix) }).unwrap_or_else(|_| path.to_path_buf())
}
