use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    fs,
    path::{Path, PathBuf},
    sync::Mutex,
};

pub const MAX_RECENT: usize = 15;

#[derive(Clone, Default, Serialize, Deserialize)]
pub struct RecentItems {
    #[serde(default)]
    pub files: Vec<String>,
    #[serde(default)]
    pub folders: Vec<String>,
    #[serde(default)]
    pub closed_files: Vec<String>,
}

#[allow(dead_code)]
pub type RecentFiles = RecentItems;

impl RecentItems {
    pub fn load(path: &Path) -> Self {
        if let Ok(data) = fs::read_to_string(path) {
            if let Ok(mut recent) = serde_json::from_str::<RecentItems>(&data) {
                if recent.folders.is_empty() {
                    let mut files = Vec::new();
                    let mut folders = Vec::new();
                    for p in recent.files {
                        if Path::new(&p).is_dir() {
                            folders.push(p);
                        } else {
                            files.push(p);
                        }
                    }
                    recent.files = files;
                    recent.folders = folders;
                }
                return recent;
            }
        }
        Self::default()
    }

    pub fn save(&self, path: &Path) -> Result<(), String> {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        let data = serde_json::to_string_pretty(self).map_err(|e| e.to_string())?;
        fs::write(path, data).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn add(&mut self, path: &str) {
        if Path::new(path).is_dir() {
            self.add_folder(path);
        } else {
            self.add_file(path);
        }
    }

    pub fn add_file(&mut self, file_path: &str) {
        if file_path.trim().is_empty() {
            return;
        }
        self.files.retain(|p| p != file_path);
        self.files.insert(0, file_path.to_string());
        if self.files.len() > MAX_RECENT {
            self.files.truncate(MAX_RECENT);
        }
    }

    pub fn add_folder(&mut self, folder_path: &str) {
        if folder_path.trim().is_empty() {
            return;
        }
        self.folders.retain(|p| p != folder_path);
        self.folders.insert(0, folder_path.to_string());
        if self.folders.len() > MAX_RECENT {
            self.folders.truncate(MAX_RECENT);
        }
    }

    pub fn push_closed(&mut self, file_path: &str) {
        if file_path.trim().is_empty() {
            return;
        }
        self.closed_files.retain(|p| p != file_path);
        self.closed_files.insert(0, file_path.to_string());
        if self.closed_files.len() > MAX_RECENT {
            self.closed_files.truncate(MAX_RECENT);
        }
    }

    pub fn pop_closed(&mut self) -> Option<String> {
        if self.closed_files.is_empty() {
            None
        } else {
            Some(self.closed_files.remove(0))
        }
    }

    pub fn remove_path(&mut self, path: &str) {
        self.files.retain(|p| p != path && !p.starts_with(path));
        self.folders.retain(|p| p != path && !p.starts_with(path));
        self.closed_files.retain(|p| p != path && !p.starts_with(path));
    }

    pub fn clear(&mut self) {
        self.files.clear();
        self.folders.clear();
        self.closed_files.clear();
    }
}

pub fn disambiguate_paths(paths: &[String]) -> Vec<(String, String)> {
    let home = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .ok();
    disambiguate_paths_with_home(paths, home.as_deref())
}

pub fn disambiguate_paths_with_home(paths: &[String], home: Option<&str>) -> Vec<(String, String)> {
    let mut counts: HashMap<String, usize> = HashMap::new();
    let base_names: Vec<String> = paths
        .iter()
        .map(|p| {
            let normalized = p.replace('\\', "/");
            let trimmed = normalized.trim_end_matches('/');
            Path::new(trimmed)
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or(trimmed)
                .to_string()
        })
        .collect();

    for name in &base_names {
        *counts.entry(name.clone()).or_insert(0) += 1;
    }

    let norm_home = home.map(|h| {
        h.replace('\\', "/")
            .trim_end_matches('/')
            .to_string()
    });

    paths
        .iter()
        .zip(base_names.iter())
        .map(|(path, base)| {
            if counts.get(base).copied().unwrap_or(0) > 1 {
                let norm_path = path.replace('\\', "/");
                let parent = Path::new(&norm_path).parent().unwrap_or_else(|| Path::new(""));
                let parent_str = parent.to_str().unwrap_or("");
                let rel_parent = if let Some(ref h) = norm_home {
                    let matches = if !h.is_empty() {
                        if parent_str.starts_with(h) {
                            true
                        } else if cfg!(windows) || h.contains(':') {
                            parent_str.to_lowercase().starts_with(&h.to_lowercase())
                        } else {
                            false
                        }
                    } else {
                        false
                    };

                    if matches {
                        parent_str[h.len()..].trim_start_matches('/')
                    } else {
                        parent_str.trim_start_matches('/')
                    }
                } else {
                    parent_str.trim_start_matches('/')
                };
                if rel_parent.is_empty() {
                    (path.clone(), base.clone())
                } else {
                    (path.clone(), format!("{base} \u{2014} {rel_parent}"))
                }
            } else {
                (path.clone(), base.clone())
            }
        })
        .collect()
}

pub struct RecentStore {
    pub file_path: PathBuf,
    pub state: Mutex<RecentItems>,
}

impl RecentStore {
    pub fn new(file_path: PathBuf) -> Self {
        let state = Mutex::new(RecentItems::load(&file_path));
        Self { file_path, state }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn recent_files_tracking_limits_and_persistence() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("recent.json");
        let mut store = RecentItems::load(&path);
        assert!(store.files.is_empty());
        assert!(store.folders.is_empty());

        store.add_file("/path/to/doc1.md");
        store.add_file("/path/to/doc2.md");
        store.add_file("/path/to/doc1.md"); // deduplicate and move to top

        assert_eq!(store.files.len(), 2);
        assert_eq!(store.files[0], "/path/to/doc1.md");
        assert_eq!(store.files[1], "/path/to/doc2.md");

        store.add_folder("/path/to/folder1");
        store.add_folder("/path/to/folder2");
        assert_eq!(store.folders.len(), 2);

        store.push_closed("/path/to/closed.md");
        assert_eq!(store.closed_files.len(), 1);
        assert_eq!(store.pop_closed(), Some("/path/to/closed.md".to_string()));
        assert!(store.closed_files.is_empty());

        store.save(&path).unwrap();

        let loaded = RecentItems::load(&path);
        assert_eq!(loaded.files, vec!["/path/to/doc1.md", "/path/to/doc2.md"]);
        assert_eq!(loaded.folders, vec!["/path/to/folder2", "/path/to/folder1"]);

        let mut limit_test = RecentItems::default();
        for i in 0..25 {
            limit_test.add_file(&format!("/path/file{i}.md"));
        }
        assert_eq!(limit_test.files.len(), MAX_RECENT);
        assert_eq!(limit_test.files[0], "/path/file24.md");

        limit_test.clear();
        assert!(limit_test.files.is_empty());
        assert!(limit_test.folders.is_empty());
        assert!(limit_test.closed_files.is_empty());
    }

    #[test]
    fn disambiguate_paths_with_em_dash_and_unique_handling() {
        let home = std::env::var("HOME")
            .or_else(|_| std::env::var("USERPROFILE"))
            .unwrap_or_else(|_| "/Users/testuser".to_string());
        let p1 = format!("{home}/projects/markview/README.md");
        let p2 = format!("{home}/projects/flint/README.md");
        let p3 = format!("{home}/projects/MarkDew/TARGET.md");
        let paths = vec![p1.clone(), p2.clone(), p3.clone()];

        let disambiguated = disambiguate_paths(&paths);
        assert_eq!(disambiguated.len(), 3);
        assert_eq!(disambiguated[0].1, "README.md \u{2014} projects/markview");
        assert_eq!(disambiguated[1].1, "README.md \u{2014} projects/flint");
        assert_eq!(disambiguated[2].1, "TARGET.md");
    }

    #[test]
    fn disambiguate_paths_with_explicit_home_and_windows_separators() {
        let home = r"C:\Users\testuser";
        let p1 = format!(r"{home}\projects\markview\README.md");
        let p2 = format!(r"{home}\projects\flint\README.md");
        let p3 = format!(r"{home}\projects\MarkDew\TARGET.md");
        let paths = vec![p1.clone(), p2.clone(), p3.clone()];

        let disambiguated = disambiguate_paths_with_home(&paths, Some(home));
        assert_eq!(disambiguated.len(), 3);
        assert_eq!(disambiguated[0].1, "README.md \u{2014} projects/markview");
        assert_eq!(disambiguated[1].1, "README.md \u{2014} projects/flint");
        assert_eq!(disambiguated[2].1, "TARGET.md");
    }

    #[test]
    fn backward_compatibility_with_legacy_json() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("legacy.json");
        let legacy_json = r#"{"files":["/path/to/doc.md"]}"#;
        fs::write(&path, legacy_json).unwrap();

        let loaded = RecentItems::load(&path);
        assert_eq!(loaded.files, vec!["/path/to/doc.md"]);
        assert!(loaded.folders.is_empty());
        assert!(loaded.closed_files.is_empty());
    }
}
