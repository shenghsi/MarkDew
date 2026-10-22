use serde::Serialize;
use std::{ffi::OsString, path::Path};

pub const EVENT: &str = "markdew-open-request";
const LIMIT: usize = 16;

#[derive(Clone, Default, Serialize)]
pub struct Batch {
    pub paths: Vec<String>,
    pub warnings: Vec<String>,
}

#[derive(Default)]
pub struct Queue(Batch);

impl Queue {
    fn warning(&mut self, message: &str) {
        if self.0.warnings.len() < LIMIT && !self.0.warnings.iter().any(|old| old == message) {
            self.0.warnings.push(message.into());
        }
    }

    pub fn path(&mut self, path: &Path) {
        let Some(text) = path.to_str() else {
            self.warning("Cannot open a filename with unsupported text encoding.");
            return;
        };
        let extension = path.extension().and_then(|value| value.to_str());
        if !path.is_absolute()
            || text.len() > 8192
            || text.contains('\0')
            || !extension.is_some_and(|ext| {
                ["md", "markdown", "txt"]
                    .iter()
                    .any(|known| ext.eq_ignore_ascii_case(known))
            })
        {
            self.warning("Open one Markdown or text file with a valid native path.");
            return;
        }
        if self.0.paths.iter().any(|old| old == text) {
            return;
        }
        if self.0.paths.len() == LIMIT {
            self.warning(
                "Only the first sixteen pending files can open. Repeat Open for the rest.",
            );
            return;
        }
        self.0.paths.push(text.into());
    }

    pub fn url(&mut self, url: &tauri::Url) {
        if url.scheme() != "file"
            || !url.username().is_empty()
            || url.password().is_some()
            || url.query().is_some()
            || url.fragment().is_some()
            || url.as_str().len() > 8192
        {
            self.warning("Only file URLs can open documents.");
            return;
        }
        match url.to_file_path() {
            Ok(path) => self.path(&path),
            Err(_) => self.warning("Cannot convert this file URL to a native path."),
        }
    }

    pub fn urls(&mut self, urls: &[tauri::Url]) {
        for url in urls.iter().take(LIMIT) {
            self.url(url);
        }
        if urls.len() > LIMIT {
            self.warning(
                "Only the first sixteen requested files can open. Repeat Open for the rest.",
            );
        }
    }

    pub fn arguments(&mut self, arguments: impl IntoIterator<Item = OsString>, cwd: Option<&Path>) {
        for (at, argument) in arguments.into_iter().take(LIMIT + 1).enumerate() {
            if at == LIMIT {
                self.warning(
                    "Only the first sixteen launch arguments can open. Repeat Open for the rest.",
                );
                break;
            }
            if let Some(text) = argument.to_str().filter(|text| text.starts_with("file:")) {
                match tauri::Url::parse(text) {
                    Ok(url) => self.url(&url),
                    Err(_) => self.warning("Cannot read this file URL."),
                }
            } else {
                let path = Path::new(&argument);
                if path.is_absolute() {
                    self.path(path);
                } else if argument
                    .to_str()
                    .is_some_and(|text| tauri::Url::parse(text).is_ok())
                {
                    self.warning("Only file URLs can open documents.");
                } else if let Some(cwd) = cwd {
                    self.path(&cwd.join(path));
                } else {
                    self.warning("Cannot resolve a relative launch path. Use Open.");
                }
            }
        }
    }

    pub fn take(&mut self, caller: &str) -> Result<Batch, String> {
        if caller != "main" {
            return Err("Open requests belong to the main window.".into());
        }
        Ok(std::mem::take(&mut self.0))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn launch_paths_keep_literal_spelling_and_drain_once() {
        let cwd = std::env::current_dir().unwrap();
        let mut queue = Queue::default();
        queue.arguments(
            ["日本語 %23#.MD", "日本語 %23#.MD", "image.png"].map(OsString::from),
            Some(&cwd),
        );
        assert!(queue.take("other").is_err());
        let batch = queue.take("main").unwrap();
        assert_eq!(batch.paths, [cwd.join("日本語 %23#.MD").to_str().unwrap()]);
        assert_eq!(batch.warnings.len(), 1);
        assert!(queue.take("main").unwrap().paths.is_empty());
    }

    #[test]
    fn file_urls_decode_once_and_other_urls_do_not_open() {
        let path = std::env::current_dir().unwrap().join("日本語 %23#.md");
        let url = tauri::Url::from_file_path(&path).unwrap();
        let mut queue = Queue::default();
        queue.url(&url);
        queue.url(&tauri::Url::parse("https://example.com/file.md").unwrap());
        let mut fragment = url.clone();
        fragment.set_fragment(Some("heading"));
        queue.url(&fragment);
        queue.arguments(
            [OsString::from("https://example.com/launch.md")],
            Some(&std::env::current_dir().unwrap()),
        );
        let batch = queue.take("main").unwrap();
        assert_eq!(batch.paths, [path.to_str().unwrap()]);
        assert_eq!(batch.warnings.len(), 1);
    }

    #[test]
    fn pending_paths_and_arguments_are_bounded() {
        let cwd = std::env::current_dir().unwrap();
        let mut queue = Queue::default();
        queue.arguments(
            (0..100).map(|at| OsString::from(format!("{at}.md"))),
            Some(&cwd),
        );
        queue.path(&cwd.join("later.md"));
        let batch = queue.take("main").unwrap();
        assert_eq!(batch.paths.len(), LIMIT);
        assert_eq!(batch.warnings.len(), 2);
        queue.arguments([OsString::from("relative.md")], None);
        assert!(queue.take("main").unwrap().paths.is_empty());
    }
}
