// Read-only Git history for Compare. MarkDew starts the installed `git` program with a fixed list of
// arguments and no shell. It never changes a repository: no stage, no commit, no checkout.
use serde::Serialize;
use std::{
    io::Read,
    path::{Path, PathBuf},
    process::{Command, Stdio},
    time::{Duration, Instant},
};

const TIMEOUT: Duration = Duration::from_secs(20);
const OUTPUT_LIMIT: u64 = 16 * 1024 * 1024;
const HISTORY_LIMIT: &str = "200";

#[derive(Serialize)]
pub struct Commit {
    hash: String,
    short: String,
    author: String,
    date: String,
    subject: String,
    // The file name inside the repository at this commit. A rename changes it.
    name: String,
}

#[derive(Serialize)]
pub struct Info {
    // The folder is inside a repository and the file is known to Git.
    tracked: bool,
    // The file text differs from the last commit, or the file is new.
    changed: bool,
    // The staged copy differs from the last commit.
    staged: bool,
}

fn run(cwd: &Path, args: &[&str]) -> Result<String, String> {
    let mut command = Command::new("git");
    command
        .args(["-c", "core.quotepath=off", "--no-pager"])
        .args(args)
        .current_dir(cwd)
        .env("GIT_OPTIONAL_LOCKS", "0")
        .env("GIT_TERMINAL_PROMPT", "0")
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x0800_0000);
    }
    let mut child = command.spawn().map_err(|error| {
        if error.kind() == std::io::ErrorKind::NotFound {
            "Git is not installed, or MarkDew cannot find it. Install Git from git-scm.com.".to_string()
        } else {
            format!("Cannot start Git: {error}")
        }
    })?;
    let mut stdout = child.stdout.take().unwrap();
    let mut stderr = child.stderr.take().unwrap();
    let out = std::thread::spawn(move || {
        let mut bytes = Vec::new();
        let _ = (&mut stdout).take(OUTPUT_LIMIT).read_to_end(&mut bytes);
        bytes
    });
    let err = std::thread::spawn(move || {
        let mut bytes = Vec::new();
        let _ = (&mut stderr).take(64 * 1024).read_to_end(&mut bytes);
        bytes
    });
    let started = Instant::now();
    let status = loop {
        match child.try_wait().map_err(|error| error.to_string())? {
            Some(status) => break status,
            None if started.elapsed() > TIMEOUT => {
                let _ = child.kill();
                let _ = child.wait();
                return Err("Git took too long and was stopped.".into());
            }
            None => std::thread::sleep(Duration::from_millis(10)),
        }
    };
    let out = out.join().unwrap_or_default();
    let err = err.join().unwrap_or_default();
    if status.success() {
        String::from_utf8(out).map_err(|_| "The file is not valid UTF-8.".to_string())
    } else {
        let message = String::from_utf8_lossy(&err).trim().to_string();
        Err(if message.is_empty() { "Git failed.".into() } else { message })
    }
}

fn split(path: &Path) -> Result<(PathBuf, String), String> {
    if !path.is_absolute() {
        return Err("Choose an absolute file path.".into());
    }
    let folder = path.parent().ok_or("The file has no folder.")?.to_path_buf();
    let name = path
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or("The file name is not valid UTF-8.")?
        .to_string();
    Ok((folder, name))
}

pub fn info(path: &Path) -> Result<Info, String> {
    let (folder, name) = split(path)?;
    let none = Info { tracked: false, changed: false, staged: false };
    if !folder.is_dir() || run(&folder, &["rev-parse", "--is-inside-work-tree"]).is_err() {
        return Ok(none);
    }
    // A repository with no commit yet has no history to compare with.
    if run(&folder, &["rev-parse", "--verify", "--quiet", "HEAD"]).is_err() {
        return Ok(none);
    }
    let known = run(&folder, &["ls-files", "--error-unmatch", "--", &name]).is_ok();
    if !known {
        return Ok(none);
    }
    let changed = run(&folder, &["diff", "--quiet", "HEAD", "--", &name]).is_err();
    let staged = run(&folder, &["diff", "--cached", "--quiet", "--", &name]).is_err();
    Ok(Info { tracked: true, changed, staged })
}

pub fn history(path: &Path) -> Result<Vec<Commit>, String> {
    let (folder, name) = split(path)?;
    // The record starts with 0x1e. The line after the blank line is the file name at that commit.
    let text = run(
        &folder,
        &[
            "log",
            "--follow",
            "--name-only",
            "-n",
            HISTORY_LIMIT,
            "--format=%x1e%H%x1f%h%x1f%an%x1f%aI%x1f%s",
            "--",
            &name,
        ],
    )?;
    let mut commits = Vec::new();
    for record in text.split('\u{1e}').filter(|record| !record.trim().is_empty()) {
        let mut lines = record.lines();
        let head = lines.next().unwrap_or("");
        let fields: Vec<&str> = head.split('\u{1f}').collect();
        if fields.len() != 5 {
            continue;
        }
        let file = lines.map(str::trim).find(|line| !line.is_empty()).unwrap_or("");
        commits.push(Commit {
            hash: fields[0].into(),
            short: fields[1].into(),
            author: fields[2].into(),
            date: fields[3].into(),
            subject: fields[4].into(),
            name: file.into(),
        });
    }
    Ok(commits)
}

// `head`, `staged`, or a commit hash. A commit also needs the file name from `history`.
pub fn file_at(path: &Path, rev: &str, name: Option<&str>) -> Result<String, String> {
    let (folder, base) = split(path)?;
    let hash = !rev.is_empty() && rev.len() <= 64 && rev.bytes().all(|b| b.is_ascii_hexdigit());
    match (rev, hash) {
        ("head", _) => run(&folder, &["show", &format!("HEAD:./{base}")]),
        ("staged", _) => run(&folder, &["show", &format!(":./{base}")]),
        (_, true) => {
            let name = name.filter(|name| !name.is_empty()).unwrap_or(&base);
            let root = run(&folder, &["rev-parse", "--show-toplevel"])?;
            run(Path::new(root.trim()), &["show", &format!("{rev}:{name}")])
        }
        _ => Err("Choose HEAD, the staged copy, or a commit.".into()),
    }
    .map_err(|error| {
        if error.contains("exists on disk, but not in") || error.contains("does not exist") || error.contains("not in the index") {
            "This version does not have the file.".to_string()
        } else {
            error
        }
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn git(folder: &Path, args: &[&str]) {
        let status = Command::new("git")
            .args(["-c", "user.name=T", "-c", "user.email=t@example.com", "-c", "commit.gpgsign=false"])
            .args(args)
            .current_dir(folder)
            .status()
            .unwrap();
        assert!(status.success());
    }

    #[test]
    fn reads_history_head_and_staged() {
        let dir = tempfile::tempdir().unwrap();
        let folder = dir.path();
        let file = folder.join("a.md");
        git(folder, &["init", "-q"]);
        fs::write(&file, "one\n").unwrap();
        git(folder, &["add", "a.md"]);
        git(folder, &["commit", "-q", "-m", "first"]);
        fs::write(&file, "two\n").unwrap();
        git(folder, &["add", "a.md"]);
        fs::write(&file, "three\n").unwrap();

        let info = info(&file).unwrap();
        assert!(info.tracked && info.changed && info.staged);
        assert_eq!(file_at(&file, "head", None).unwrap(), "one\n");
        assert_eq!(file_at(&file, "staged", None).unwrap(), "two\n");
        let log = history(&file).unwrap();
        assert_eq!(log.len(), 1);
        assert_eq!(log[0].subject, "first");
        assert_eq!(file_at(&file, &log[0].hash, Some(&log[0].name)).unwrap(), "one\n");
        assert!(file_at(&file, "--output=x", None).is_err());
    }

    #[test]
    fn untracked_file_is_not_tracked() {
        let dir = tempfile::tempdir().unwrap();
        git(dir.path(), &["init", "-q"]);
        let file = dir.path().join("b.md");
        fs::write(&file, "x").unwrap();
        assert!(!info(&file).unwrap().tracked);
    }
}
