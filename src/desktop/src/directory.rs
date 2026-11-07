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

// With `all`, the list shows every regular file, not only md, markdown, and txt files.
pub fn list(path: &Path, all: bool) -> Result<Listing, String> {
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
                || (all && entry.file_name().to_str().is_some_and(system_clutter))
                || (!all && !supported(&path)))
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

const FILE_LIMIT: usize = 5000;
const DEPTH_LIMIT: usize = 12;
const SKIPPED_FOLDERS: [&str; 4] = ["node_modules", "target", "dist", "build"];

#[derive(Serialize)]
pub struct Files {
    paths: Vec<String>,
    incomplete: bool,
}

fn supported(path: &Path) -> bool {
    path.extension()
        .and_then(|e| e.to_str())
        .is_some_and(|e| ["md", "markdown", "txt"].iter().any(|suffix| e.eq_ignore_ascii_case(suffix)))
}

// Every Markdown or text file below a folder, for Open Quickly. Links, hidden folders, and build folders are
// skipped, and the scan stops at a file and a depth limit, so a huge tree cannot hang the app.
pub fn find_files(root: &Path) -> Result<Files, String> {
    if !root.is_absolute() {
        return Err("Choose an absolute folder path.".into());
    }
    let metadata = fs::symlink_metadata(root).map_err(|e| e.to_string())?;
    if !metadata.is_dir() || linked(&metadata) {
        return Err("Choose a regular folder without a link or reparse point.".into());
    }
    let mut result = Files { paths: vec![], incomplete: false };
    let mut pending = vec![(root.to_path_buf(), 0usize)];
    while let Some((folder, depth)) = pending.pop() {
        let Ok(reader) = fs::read_dir(&folder) else { continue };
        for entry in reader.flatten() {
            let path = entry.path();
            let Ok(metadata) = fs::symlink_metadata(&path) else { continue };
            if linked(&metadata) {
                continue;
            }
            let name = entry.file_name();
            let Some(name) = name.to_str() else { continue };
            if metadata.is_dir() {
                if depth + 1 > DEPTH_LIMIT {
                    result.incomplete = true;
                } else if !name.starts_with('.') && !SKIPPED_FOLDERS.contains(&name) {
                    pending.push((path, depth + 1));
                }
            } else if metadata.is_file() && supported(&path) {
                if result.paths.len() >= FILE_LIMIT {
                    result.incomplete = true;
                    pending.clear();
                    break;
                }
                if let Some(text) = path.to_str() {
                    result.paths.push(text.to_owned());
                }
            }
        }
    }
    result.paths.sort_by(|a, b| a.to_lowercase().cmp(&b.to_lowercase()).then_with(|| a.cmp(b)));
    Ok(result)
}

// System files that the all-files list does not show: Finder and Windows folder data,
// AppleDouble files on non-Mac disks, and Office lock files.
fn system_clutter(name: &str) -> bool {
    [".DS_Store", ".localized", "Thumbs.db", "desktop.ini"]
        .iter()
        .any(|n| name.eq_ignore_ascii_case(n))
        || name.starts_with("._")
        || name.starts_with("~$")
}

// Extensions whose default app runs code, starts a program, or follows a link to one.
// The lists are not complete, so the default-app route also refuses files with an execute bit.
// Common Windows programs are refused everywhere: a copied program must not run under Wine or a VM.
const PROGRAM_EXTENSIONS: &[&str] = &["bat", "cmd", "com", "exe", "jar", "lnk", "msi", "scr"];
#[cfg(unix)]
const PLATFORM_EXTENSIONS: &[&str] = &[
    "bash", "csh", "desktop", "ksh", "sh", "tcsh", "zsh",
    #[cfg(target_os = "macos")]
    "app",
    #[cfg(target_os = "macos")]
    "command",
    #[cfg(target_os = "macos")]
    "fileloc",
    #[cfg(target_os = "macos")]
    "inetloc",
    #[cfg(target_os = "macos")]
    "mobileconfig",
    #[cfg(target_os = "macos")]
    "mpkg",
    #[cfg(target_os = "macos")]
    "pkg",
    // Python Launcher can be the default app for Python files.
    #[cfg(target_os = "macos")]
    "py",
    #[cfg(target_os = "macos")]
    "pyw",
    #[cfg(target_os = "macos")]
    "shortcut",
    #[cfg(target_os = "macos")]
    "terminal",
    #[cfg(target_os = "macos")]
    "tool",
    #[cfg(target_os = "macos")]
    "webloc",
    #[cfg(target_os = "macos")]
    "workflow",
];
#[cfg(windows)]
const PLATFORM_EXTENSIONS: &[&str] = &[
    "appref-ms", "application", "chm", "cpl", "gadget", "hta", "inf", "js", "jse", "library-ms", "msc", "msp",
    "pif", "ps1", "ps1xml", "ps2", "psc1", "psm1", "reg", "scf", "search-ms", "settingcontent-ms", "url", "vb",
    "vbe", "vbs", "website", "ws", "wsc", "wsf", "wsh", "xll",
];
#[cfg(not(any(unix, windows)))]
const PLATFORM_EXTENSIONS: &[&str] = &[];

// Windows ignores trailing dots and spaces in a name, so "run.exe." opens as "run.exe".
// Check the extension as Windows reads it. A colon (an NTFS stream name) counts as a program.
fn program_name(name: &str) -> bool {
    let name = name.trim_end_matches(['.', ' ']);
    if name.contains(':') {
        return true;
    }
    name.rsplit_once('.')
        .is_some_and(|(_, ext)| {
            PROGRAM_EXTENSIONS.iter().chain(PLATFORM_EXTENSIONS).any(|p| ext.eq_ignore_ascii_case(p))
        })
}

#[cfg(unix)]
fn executable(metadata: &fs::Metadata) -> bool {
    use std::os::unix::fs::PermissionsExt;
    metadata.permissions().mode() & 0o111 != 0
}
#[cfg(not(unix))]
fn executable(_: &fs::Metadata) -> bool {
    false
}

#[derive(Debug, PartialEq)]
pub enum External {
    // The system default app can open the file.
    Open,
    // The file can start a program. Show it in the file manager and do not run it.
    Reveal,
}

// Checks a file before the system default app opens it. It must be an absolute regular file
// without a link or reparse point. A program is only shown in the file manager.
pub fn external_file(path: &Path) -> Result<External, String> {
    if !path.is_absolute() {
        return Err("Choose an absolute file path.".into());
    }
    let metadata = fs::symlink_metadata(path).map_err(|e| e.to_string())?;
    if !metadata.is_file() || linked(&metadata) {
        return Err("Choose a regular file without a link or reparse point.".into());
    }
    let name = path.file_name().and_then(|n| n.to_str()).ok_or("The file name has unsupported encoding.")?;
    if program_name(name) || executable(&metadata) {
        return Ok(External::Reveal);
    }
    Ok(External::Open)
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
        let result = list(root.path(), false).unwrap();
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
        assert!(list(Path::new("relative"), false).is_err());
        assert!(list(&root.path().join("a.txt"), false).is_err());
        assert!(list(&root.path().join("missing"), false).is_err());
    }
    #[test]
    fn lists_all_regular_files_when_asked() {
        let root = tempfile::tempdir().unwrap();
        fs::create_dir(root.path().join("folder")).unwrap();
        for name in ["b.md", "image.png", "notes", ".DS_Store", "._image.png", "~$report.docx", "Thumbs.db"] {
            fs::write(root.path().join(name), "").unwrap();
        }
        let names: Vec<_> = list(root.path(), true)
            .unwrap()
            .entries
            .into_iter()
            .map(|e| e.name)
            .collect();
        assert_eq!(names, ["folder", "b.md", "image.png", "notes"]);
    }
    #[test]
    fn checks_files_for_the_default_app() {
        let root = tempfile::tempdir().unwrap();
        fs::create_dir(root.path().join("folder")).unwrap();
        let programs: &[&str] = if cfg!(target_os = "macos") {
            &["run.EXE", "script.sh", "set.terminal", "go.webloc", "tool.py"]
        } else if cfg!(windows) {
            &["run.EXE", "page.hta", "go.url", "task.js"]
        } else {
            &["run.EXE", "script.sh", "app.desktop"]
        };
        for name in ["image.png", "report.PDF"].iter().chain(programs) {
            fs::write(root.path().join(name), "").unwrap();
        }
        assert_eq!(external_file(&root.path().join("image.png")), Ok(External::Open));
        assert_eq!(external_file(&root.path().join("report.PDF")), Ok(External::Open));
        for name in programs {
            assert_eq!(external_file(&root.path().join(name)), Ok(External::Reveal), "{name}");
        }
        assert!(external_file(&root.path().join("folder")).is_err());
        assert!(external_file(&root.path().join("missing")).is_err());
        assert!(external_file(Path::new("relative.png")).is_err());
    }
    #[test]
    fn reads_program_extensions_as_windows_does() {
        assert!(program_name("run.exe."));
        assert!(program_name("run.exe . "));
        assert!(program_name("notes.txt:hidden.exe"));
        assert!(program_name("Setup.MSI"));
        assert!(!program_name("photo.png"));
        assert!(!program_name("README"));
        assert!(!program_name("exe"));
    }
    #[cfg(unix)]
    #[test]
    fn treats_executable_files_as_programs() {
        use std::os::unix::fs::PermissionsExt;
        let root = tempfile::tempdir().unwrap();
        let file = root.path().join("configure");
        fs::write(&file, "").unwrap();
        assert_eq!(external_file(&file), Ok(External::Open));
        fs::set_permissions(&file, fs::Permissions::from_mode(0o755)).unwrap();
        assert_eq!(external_file(&file), Ok(External::Reveal));
    }
    #[test]
    fn bounds_scanned_entries_even_when_files_are_not_markdown() {
        let root = tempfile::tempdir().unwrap();
        for i in 0..=SCAN_LIMIT {
            fs::write(root.path().join(format!("{i}.bin")), "").unwrap();
        }
        let result = list(root.path(), false).unwrap();
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
        assert!(list(&root.path().join("alias"), false).is_err());
        assert_eq!(list(root.path(), false).unwrap().entries.len(), 1);
        assert_eq!(list(root.path(), true).unwrap().entries.len(), 1);
    }
    #[test]
    fn finds_supported_files_in_nested_folders_and_skips_hidden_linked_and_build_folders() {
        let root = tempfile::tempdir().unwrap();
        for folder in ["notes/deep", ".hidden", "node_modules", "target", "日本語"] {
            fs::create_dir_all(root.path().join(folder)).unwrap();
        }
        for file in ["top.md", "notes/b.TXT", "notes/deep/c.markdown", "日本語/d.md", ".hidden/x.md", "node_modules/y.md", "target/z.md", "notes/image.png"] {
            fs::write(root.path().join(file), "").unwrap();
        }
        #[cfg(unix)]
        {
            std::os::unix::fs::symlink(root.path().join("notes"), root.path().join("link")).unwrap();
            std::os::unix::fs::symlink(root.path().join("top.md"), root.path().join("alias.md")).unwrap();
        }
        let found = find_files(root.path()).unwrap();
        let names: Vec<_> = found
            .paths
            .iter()
            .map(|p| Path::new(p).strip_prefix(root.path()).unwrap().to_str().unwrap().replace('\\', "/"))
            .collect();
        assert_eq!(names, ["notes/b.TXT", "notes/deep/c.markdown", "top.md", "日本語/d.md"]);
        assert!(!found.incomplete);
        assert!(find_files(Path::new("relative")).is_err());
        assert!(find_files(&root.path().join("top.md")).is_err());
        assert!(find_files(&root.path().join("missing")).is_err());
    }
    #[test]
    fn stops_at_the_file_and_depth_limits() {
        let root = tempfile::tempdir().unwrap();
        for i in 0..=FILE_LIMIT {
            fs::write(root.path().join(format!("{i}.md")), "").unwrap();
        }
        let found = find_files(root.path()).unwrap();
        assert_eq!(found.paths.len(), FILE_LIMIT);
        assert!(found.incomplete);
        let deep = tempfile::tempdir().unwrap();
        let mut path = deep.path().to_path_buf();
        for i in 0..=DEPTH_LIMIT + 1 {
            path.push(format!("d{i}"));
        }
        fs::create_dir_all(&path).unwrap();
        fs::write(path.join("deep.md"), "").unwrap();
        let found = find_files(deep.path()).unwrap();
        assert!(found.paths.is_empty() && found.incomplete);
    }
}
