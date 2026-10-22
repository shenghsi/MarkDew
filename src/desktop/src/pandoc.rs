// Import and export through an installed Pandoc. MarkDew starts Pandoc as a separate program, with a fixed
// list of arguments and no shell, and never bundles it. The renderer supplies only a format name, paths,
// and optionally the path of the Pandoc program that the user chose in Settings.
use serde::Serialize;
use std::{
    ffi::OsString,
    fs,
    io::{Read, Write},
    path::{Path, PathBuf},
    process::{Command, Stdio},
    time::{Duration, Instant},
};

pub const INPUT_LIMIT: usize = 64 * 1024 * 1024;
const SOURCE_LIMIT: u64 = 256 * 1024 * 1024;
const TIMEOUT: Duration = Duration::from_secs(120);
const MESSAGE_LIMIT: usize = 2000;
// Markdown that MarkDew reads: GitHub tables and task lists, footnotes, $math$, and a YAML header.
const READER: &str = "gfm+tex_math_dollars+footnotes+yaml_metadata_block";
// Markdown that MarkDew can show: no raw HTML (so images stay ![](path)), and $math$ in dollars.
const WRITER: &str = "gfm-raw_html-tex_math_gfm+tex_math_dollars";
// A small style sheet for HTML export. "HTML (without styles)" leaves it out.
const STYLE: &str = "body{max-width:860px;margin:2em auto;padding:0 1em;font:16px/1.65 system-ui,sans-serif;color:#24272c}\
h1,h2{border-bottom:1px solid #d5dae0;padding-bottom:.25em}\
pre,code{font-family:ui-monospace,Menlo,Consolas,monospace;background:#f6f8fa;border-radius:4px}\
code{padding:.1em .3em}pre{padding:.8em;overflow:auto}pre code{padding:0}\
blockquote{margin:1em 0;padding:0 1em;color:#535d68;border-left:3px solid #d5dae0}\
table{border-collapse:collapse}th,td{border:1px solid #d5dae0;padding:.3em .7em}img{max-width:100%}";

// Pandoc drops raw HTML blocks in every format but HTML. This filter makes it read them as HTML, so tables
// (with merged cells), lists, and other blocks survive, and a <br> inside a table cell becomes a line break.
const HTML_FILTER: &str = r#"
function RawBlock(el)
  if el.format:match('html') then
    return pandoc.read(el.text, 'html').blocks
  end
end
function RawInline(el)
  if el.format:match('html') and el.text:match('^<[bB][rR]%s*/?>$') then
    return pandoc.LineBreak()
  end
end
"#;

#[derive(Debug, Serialize)]
pub struct Info {
    pub path: String,
    pub version: String,
}

fn program_names() -> &'static [&'static str] {
    if cfg!(windows) {
        &["pandoc.exe"]
    } else {
        &["pandoc"]
    }
}

fn common_folders() -> Vec<PathBuf> {
    let mut folders = vec![];
    if let Some(home) = std::env::var_os("HOME").or_else(|| std::env::var_os("USERPROFILE")) {
        let home = PathBuf::from(home);
        folders.push(home.join("bin"));
        folders.push(home.join(".local").join("bin"));
        folders.push(home.join(".cabal").join("bin"));
    }
    for folder in [
        "/usr/local/bin",
        "/usr/bin",
        "/opt/homebrew/bin",
        "/opt/local/bin",
        "/snap/bin",
    ] {
        folders.push(PathBuf::from(folder));
    }
    if cfg!(windows) {
        for variable in ["LOCALAPPDATA", "ProgramFiles", "ProgramFiles(x86)"] {
            if let Some(base) = std::env::var_os(variable) {
                folders.push(PathBuf::from(&base).join("Pandoc"));
                folders.push(PathBuf::from(&base).join("Programs").join("Pandoc"));
            }
        }
    }
    folders
}

// A desktop launcher often gives the app a shorter PATH than a terminal has, so common folders follow it.
pub fn find(configured: Option<&str>) -> Result<PathBuf, String> {
    if let Some(chosen) = configured.map(str::trim).filter(|text| !text.is_empty()) {
        let path = PathBuf::from(chosen);
        return if path.is_file() {
            Ok(path)
        } else {
            Err(format!("Pandoc was not found at {chosen}. Check the path in Settings, Export."))
        };
    }
    let mut folders: Vec<PathBuf> = std::env::var_os("PATH")
        .map(|paths| std::env::split_paths(&paths).collect())
        .unwrap_or_default();
    folders.extend(common_folders());
    for folder in folders {
        for name in program_names() {
            let candidate = folder.join(name);
            if candidate.is_file() {
                return Ok(candidate);
            }
        }
    }
    Err("Pandoc is not installed, or MarkDew cannot find it. Install Pandoc from pandoc.org, or enter its path in Settings, Export.".into())
}

fn clip(text: &str) -> String {
    let text = text.trim();
    if text.chars().count() <= MESSAGE_LIMIT {
        return text.to_string();
    }
    text.chars().take(MESSAGE_LIMIT).collect::<String>() + "…"
}

// Run Pandoc and wait for it. The input goes in through a pipe from a second thread, so a large input
// cannot block against a full output pipe. A run that takes too long is stopped.
fn run(program: &Path, args: &[OsString], input: Option<Vec<u8>>, cwd: Option<&Path>) -> Result<String, String> {
    let mut command = Command::new(program);
    command
        .args(args)
        .stdin(if input.is_some() { Stdio::piped() } else { Stdio::null() })
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    if let Some(cwd) = cwd {
        command.current_dir(cwd);
    }
    // Linux refuses to run a file that another thread still has open for writing (error 26). That ends in a
    // moment, so try again a few times.
    let mut child = {
        let mut attempt = 0;
        loop {
            match command.spawn() {
                Ok(child) => break child,
                Err(error) if error.raw_os_error() == Some(26) && attempt < 20 => {
                    attempt += 1;
                    std::thread::sleep(Duration::from_millis(25));
                }
                Err(error) => return Err(format!("Cannot start Pandoc: {error}")),
            }
        }
    };
    let writer = input.and_then(|bytes| {
        child.stdin.take().map(|mut pipe| {
            std::thread::spawn(move || {
                let _ = pipe.write_all(&bytes);
            })
        })
    });
    let mut stdout = child.stdout.take().unwrap();
    let mut stderr = child.stderr.take().unwrap();
    let out = std::thread::spawn(move || {
        let mut text = String::new();
        let _ = (&mut stdout).take(1 << 20).read_to_string(&mut text);
        text
    });
    let err = std::thread::spawn(move || {
        let mut text = String::new();
        let _ = (&mut stderr).take(1 << 20).read_to_string(&mut text);
        text
    });
    let started = Instant::now();
    let status = loop {
        match child.try_wait().map_err(|error| error.to_string())? {
            Some(status) => break status,
            None if started.elapsed() > TIMEOUT => {
                let _ = child.kill();
                let _ = child.wait();
                return Err("Pandoc took too long and was stopped.".into());
            }
            None => std::thread::sleep(Duration::from_millis(25)),
        }
    };
    if let Some(writer) = writer {
        let _ = writer.join();
    }
    let out = out.join().unwrap_or_default();
    let err = err.join().unwrap_or_default();
    if status.success() {
        Ok(out)
    } else {
        Err(format!("Pandoc failed. {}", clip(&err)))
    }
}

pub fn check(configured: Option<&str>) -> Result<Info, String> {
    let program = find(configured)?;
    let output = run(&program, &["--version".into()], None, None)?;
    let version = output
        .lines()
        .next()
        .unwrap_or("")
        .trim_start_matches("pandoc")
        .trim()
        .to_string();
    if version.is_empty() {
        return Err("This program did not answer like Pandoc.".into());
    }
    Ok(Info {
        path: program.to_string_lossy().into_owned(),
        version,
    })
}

// The Pandoc arguments for each export format, and whether it needs the style sheet.
fn export_arguments(format: &str) -> Option<(Vec<&'static str>, bool)> {
    Some(match format {
        "html" => (vec!["-t", "html5", "-s", "--mathml", "--embed-resources"], true),
        "html-plain" => (
            vec!["-t", "html5", "-s", "--mathml", "--embed-resources", "-V", "document-css=false"],
            false,
        ),
        "docx" => (vec!["-t", "docx"], false),
        "odt" => (vec!["-t", "odt"], false),
        "rtf" => (vec!["-t", "rtf", "-s"], false),
        "epub" => (vec!["-t", "epub3"], false),
        "latex" => (vec!["-t", "latex", "-s"], false),
        "mediawiki" => (vec!["-t", "mediawiki"], false),
        "rst" => (vec!["-t", "rst"], false),
        "textile" => (vec!["-t", "textile"], false),
        "opml" => (vec!["-t", "opml"], false),
        _ => return None,
    })
}

// The reader for each import format, and whether the reader may open other files named inside the input
// (LaTeX \input, reStructuredText include). Those run in Pandoc's sandbox. Zip-based formats keep their
// images, so they need to write the media folder and cannot use it.
fn import_reader(format: &str) -> Option<(&'static str, bool)> {
    Some(match format {
        "docx" => ("docx", false),
        "odt" => ("odt", false),
        "rtf" => ("rtf", false),
        "epub" => ("epub", false),
        "latex" => ("latex", true),
        "mediawiki" => ("mediawiki", true),
        "rst" => ("rst", true),
        "textile" => ("textile", true),
        "opml" => ("opml", true),
        "html" => ("html", true),
        _ => return None,
    })
}

pub fn format_for_extension(path: &Path) -> Option<&'static str> {
    Some(match path.extension()?.to_str()?.to_ascii_lowercase().as_str() {
        "docx" => "docx",
        "odt" => "odt",
        "rtf" => "rtf",
        "epub" => "epub",
        "tex" | "latex" => "latex",
        "wiki" | "mediawiki" => "mediawiki",
        "rst" => "rst",
        "textile" => "textile",
        "opml" => "opml",
        "html" | "htm" | "xhtml" => "html",
        _ => return None,
    })
}

fn absolute_file(text: &str, what: &str) -> Result<PathBuf, String> {
    let path = PathBuf::from(text);
    if !path.is_absolute() {
        return Err(format!("Use an absolute path for the {what}."));
    }
    Ok(path)
}

// Pandoc writes to a temporary file next to the target, which then replaces the target. A failed run
// leaves an existing target as it was.
fn publish(output: &Path, write: impl FnOnce(&Path) -> Result<(), String>) -> Result<(), String> {
    let parent = output.parent().filter(|folder| folder.is_dir()).ok_or("The folder for the output file does not exist.")?;
    let mut builder = tempfile::Builder::new();
    builder.prefix(".markdew-pandoc-");
    // The user's own file: the usual permissions of a new file (the umask applies), not the private mode of a temporary file.
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        builder.permissions(fs::Permissions::from_mode(0o666));
    }
    let pending = builder.tempfile_in(parent).map_err(|error| error.to_string())?;
    write(pending.path())?;
    pending.persist(output).map_err(|error| error.error.to_string())?;
    Ok(())
}

pub fn export(
    configured: Option<&str>,
    format: &str,
    markdown: String,
    title: &str,
    output: &str,
    base: Option<&str>,
) -> Result<String, String> {
    let (extra, styled) = export_arguments(format).ok_or("This export format is not available.")?;
    if markdown.len() > INPUT_LIMIT {
        return Err("The document is larger than the 64 MiB export limit.".into());
    }
    let output = absolute_file(output, "output file")?;
    let program = find(configured)?;
    let base = base.map(PathBuf::from).filter(|folder| folder.is_dir());
    let style = if styled {
        let file = tempfile::Builder::new().suffix(".css").tempfile().map_err(|error| error.to_string())?;
        fs::write(file.path(), STYLE).map_err(|error| error.to_string())?;
        Some(file)
    } else {
        None
    };
    // HTML keeps raw HTML as it is. Every other format reads it through the filter.
    let filter = if format.starts_with("html") {
        None
    } else {
        let file = tempfile::Builder::new().suffix(".lua").tempfile().map_err(|error| error.to_string())?;
        fs::write(file.path(), HTML_FILTER).map_err(|error| error.to_string())?;
        Some(file)
    };
    let parent = output.parent().map(Path::to_path_buf);
    let stem = output.file_stem().and_then(|name| name.to_str()).unwrap_or("document").to_string();
    publish(&output, |target| {
        let build = |with_filter: bool| {
            let mut args: Vec<OsString> = vec!["-f".into(), READER.into()];
            args.extend(extra.iter().map(|text| OsString::from(*text)));
            if let Some(style) = &style {
                args.push("--css".into());
                args.push(style.path().into());
            }
            if let (true, Some(filter)) = (with_filter, &filter) {
                args.push("--lua-filter".into());
                args.push(filter.path().into());
            }
            let page = if title.trim().is_empty() { "Document" } else { title.trim() };
            args.push("--metadata".into());
            args.push(format!("pagetitle={page}").into());
            if let Some(base) = &base {
                args.push(format!("--resource-path={}", base.display()).into());
            }
            // LaTeX cannot hold a picture inside the file, so Pandoc writes embedded pictures (such as drawn
            // diagrams) to <name>_media beside the output, and the file links to them by relative path.
            let folder = if format == "latex" && parent.is_some() {
                args.push(format!("--extract-media={stem}_media").into());
                parent.clone()
            } else {
                base.clone()
            };
            args.push("-o".into());
            args.push(target.into());
            (args, folder)
        };
        let (args, folder) = build(true);
        match run(&program, &args, Some(markdown.clone().into_bytes()), folder.as_deref()) {
            // A Pandoc built without Lua cannot read the filter. Export without it.
            Err(error) if filter.is_some() && error.to_lowercase().contains("lua") => {
                let (args, folder) = build(false);
                run(&program, &args, Some(markdown.into_bytes()), folder.as_deref())?;
                Ok(())
            }
            other => other.map(|_| ()),
        }
    })?;
    Ok(output.to_string_lossy().into_owned())
}

pub fn import(configured: Option<&str>, source: &str, output: &str) -> Result<String, String> {
    let source = absolute_file(source, "source file")?;
    let output = absolute_file(output, "output file")?;
    let format = format_for_extension(&source).ok_or("MarkDew cannot import this file type.")?;
    let (reader, sandbox) = import_reader(format).unwrap();
    let length = fs::metadata(&source).map_err(|error| error.to_string())?.len();
    if !source.is_file() || length > SOURCE_LIMIT {
        return Err("Choose a file smaller than 256 MiB.".into());
    }
    let program = find(configured)?;
    let folder = output.parent().filter(|folder| folder.is_dir()).ok_or("The folder for the output file does not exist.")?.to_path_buf();
    let stem = output.file_stem().and_then(|name| name.to_str()).filter(|name| !name.is_empty()).ok_or("Name the output file.")?;
    publish(&output, |target| {
        let mut args: Vec<OsString> = vec!["-f".into(), reader.into(), "-t".into(), WRITER.into(), "--wrap=none".into()];
        if sandbox {
            args.push("--sandbox".into());
        } else {
            // Images in the file go to <name>.assets/media, and the Markdown links to them by relative path.
            args.push(format!("--extract-media={stem}.assets").into());
        }
        args.push(source.as_os_str().into());
        args.push("-o".into());
        args.push(target.into());
        run(&program, &args, None, Some(&folder))?;
        Ok(())
    })?;
    Ok(output.to_string_lossy().into_owned())
}

#[tauri::command]
pub async fn pandoc_check(pandoc: Option<String>) -> Result<Info, String> {
    tauri::async_runtime::spawn_blocking(move || check(pandoc.as_deref()))
        .await
        .map_err(|error| error.to_string())?
}

#[tauri::command]
pub async fn pandoc_export(
    pandoc: Option<String>,
    format: String,
    markdown: String,
    title: String,
    output: String,
    base: Option<String>,
) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        export(pandoc.as_deref(), &format, markdown, &title, &output, base.as_deref())
    })
    .await
    .map_err(|error| error.to_string())?
}

#[tauri::command]
pub async fn pandoc_import(pandoc: Option<String>, source: String, output: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || import(pandoc.as_deref(), &source, &output))
        .await
        .map_err(|error| error.to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;

    fn installed() -> Option<String> {
        find(None).ok().map(|path| path.to_string_lossy().into_owned())
    }

    #[test]
    fn every_export_format_has_arguments_and_unknown_formats_are_refused() {
        for format in [
            "html", "html-plain", "docx", "odt", "rtf", "epub", "latex", "mediawiki", "rst", "textile", "opml",
        ] {
            assert!(export_arguments(format).is_some(), "{format}");
        }
        assert!(export_arguments("pdf").is_none());
        assert!(export_arguments("docx; rm -rf /").is_none());
        assert!(export_arguments("html").unwrap().1 && !export_arguments("html-plain").unwrap().1);
    }

    #[test]
    fn import_formats_follow_the_file_extension_and_risky_readers_use_the_sandbox() {
        for (name, format) in [
            ("a.DOCX", "docx"), ("a.odt", "odt"), ("a.rtf", "rtf"), ("a.epub", "epub"), ("a.tex", "latex"),
            ("a.wiki", "mediawiki"), ("a.rst", "rst"), ("a.textile", "textile"), ("a.opml", "opml"), ("a.htm", "html"),
        ] {
            assert_eq!(format_for_extension(Path::new(name)), Some(format), "{name}");
        }
        assert_eq!(format_for_extension(Path::new("a.md")), None);
        assert_eq!(format_for_extension(Path::new("noextension")), None);
        for sandboxed in ["latex", "rst", "mediawiki", "html"] {
            assert!(import_reader(sandboxed).unwrap().1, "{sandboxed}");
        }
        for open in ["docx", "odt", "epub", "rtf"] {
            assert!(!import_reader(open).unwrap().1, "{open}");
        }
    }

    #[test]
    fn a_chosen_path_must_exist_and_relative_paths_are_refused() {
        let dir = tempfile::tempdir().unwrap();
        let missing = dir.path().join("missing-pandoc");
        assert!(find(Some(missing.to_str().unwrap())).unwrap_err().contains("not found"));
        assert_eq!(find(Some(dir.path().join("x").to_str().unwrap())).is_err(), true);
        assert!(export(None, "docx", String::new(), "t", "relative.docx", None).unwrap_err().contains("absolute"));
        assert!(import(None, "relative.docx", "/tmp/a.md").unwrap_err().contains("absolute"));
        assert!(export(None, "pdf", String::new(), "t", "/tmp/a.pdf", None).is_err());
    }

    #[test]
    fn a_program_that_is_not_pandoc_is_reported() {
        let dir = tempfile::tempdir().unwrap();
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let fake = dir.path().join("pandoc");
            fs::write(&fake, "#!/bin/sh\nexit 0\n").unwrap();
            fs::set_permissions(&fake, fs::Permissions::from_mode(0o755)).unwrap();
            assert!(check(Some(fake.to_str().unwrap())).unwrap_err().contains("did not answer like Pandoc"));
            let failing = dir.path().join("failing");
            fs::write(&failing, "#!/bin/sh\necho 'bad input' >&2\nexit 3\n").unwrap();
            fs::set_permissions(&failing, fs::Permissions::from_mode(0o755)).unwrap();
            let target = dir.path().join("out.docx");
            fs::write(&target, b"keep").unwrap();
            let error = export(Some(failing.to_str().unwrap()), "docx", "x".into(), "t", target.to_str().unwrap(), None).unwrap_err();
            assert!(error.contains("bad input"), "{error}");
            // A failed run leaves the existing file as it was and no temporary file behind.
            assert_eq!(fs::read(&target).unwrap(), b"keep");
            assert_eq!(fs::read_dir(dir.path()).unwrap().filter(|entry| entry.as_ref().unwrap().file_name().to_string_lossy().starts_with(".markdew-pandoc-")).count(), 0);
        }
    }

    #[test]
    fn exports_and_imports_with_the_installed_pandoc() {
        let Some(pandoc) = installed() else { return };
        let dir = tempfile::tempdir().unwrap();
        let first = dir.path().join("mode.docx");
        export(Some(&pandoc), "docx", "x".into(), "t", first.to_str().unwrap(), None).unwrap();
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            assert_ne!(fs::metadata(&first).unwrap().permissions().mode() & 0o044, 0, "readable by the group or others, as a new file is");
        }
        let markdown = "---\ntitle: Demo\n---\n\n# Heading\n\nText with $x^2$ and a note[^1].\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n[^1]: Note.\n";
        for (format, extension) in [
            ("docx", "docx"), ("odt", "odt"), ("rtf", "rtf"), ("epub", "epub"), ("latex", "tex"), ("mediawiki", "wiki"),
            ("rst", "rst"), ("textile", "textile"), ("opml", "opml"), ("html", "html"), ("html-plain", "html"),
        ] {
            let output = dir.path().join(format!("{format}.{extension}"));
            let done = export(Some(&pandoc), format, markdown.into(), "Demo", output.to_str().unwrap(), Some(dir.path().to_str().unwrap()));
            assert_eq!(done.unwrap(), output.to_str().unwrap(), "{format}");
            assert!(fs::metadata(&output).unwrap().len() > 50, "{format}");
        }
        let styled = fs::read_to_string(dir.path().join("html.html")).unwrap();
        let plain = fs::read_to_string(dir.path().join("html-plain.html")).unwrap();
        assert!(styled.contains("max-width:860px") && !plain.contains("max-width:860px"));
        assert!(fs::read(dir.path().join("docx.docx")).unwrap().starts_with(b"PK"));
        // Import the Word file back into Markdown, and the HTML file.
        for source in ["docx.docx", "odt.odt", "html.html", "latex.tex", "rst.rst", "mediawiki.wiki", "opml.opml"] {
            let output = dir.path().join(format!("back-{source}.md"));
            import(Some(&pandoc), dir.path().join(source).to_str().unwrap(), output.to_str().unwrap()).unwrap_or_else(|error| panic!("{source}: {error}"));
            let text = fs::read_to_string(&output).unwrap();
            assert!(text.contains("Heading") || source.ends_with("opml"), "{source}: {text}");
        }
        let back = fs::read_to_string(dir.path().join("back-docx.docx.md")).unwrap();
        assert!(back.contains("$x^{2}$") && back.contains("| A") && back.contains("[^1]"), "{back}");
    }

    #[test]
    fn html_tables_and_line_breaks_survive_formats_that_cannot_hold_raw_html() {
        let Some(pandoc) = installed() else { return };
        let dir = tempfile::tempdir().unwrap();
        let markdown = "<table><thead><tr><th>Name</th><th colspan=\"2\">Values</th></tr></thead><tbody><tr><td rowspan=\"2\">Row <b>one</b></td><td>1</td><td>2</td></tr><tr><td>3</td><td>4<br>second line</td></tr></tbody></table>\n\n| A | B |\n|---|---|\n| x<br>y | z |\n";
        for (format, extension) in [("docx", "docx"), ("odt", "odt"), ("latex", "tex"), ("rst", "rst"), ("mediawiki", "wiki")] {
            let output = dir.path().join(format!("table.{extension}"));
            export(Some(&pandoc), format, markdown.into(), "T", output.to_str().unwrap(), None).unwrap();
            // Pandoc's ODT reader loses a header cell that spans columns, so ODT is only checked for success here.
            if format == "odt" {
                assert!(fs::metadata(&output).unwrap().len() > 5000);
                continue;
            }
            let text = if format == "docx" {
                run(Path::new(&pandoc), &["-f".into(), format.into(), "-t".into(), "plain".into(), output.as_os_str().into()], None, None).unwrap()
            } else {
                fs::read_to_string(&output).unwrap()
            };
            for word in ["Name", "Values", "second line"] {
                assert!(text.contains(word), "{format}: {word} is missing in\n{text}");
            }
            assert!(!text.contains("<table"), "{format}: raw HTML is left in\n{text}");
        }
        // HTML output keeps the table as HTML.
        let html = dir.path().join("table.html");
        export(Some(&pandoc), "html", markdown.into(), "T", html.to_str().unwrap(), None).unwrap();
        assert!(fs::read_to_string(&html).unwrap().contains("colspan=\"2\""));
    }

    #[test]
    fn latex_exports_embedded_pictures_beside_the_file() {
        let Some(pandoc) = installed() else { return };
        let dir = tempfile::tempdir().unwrap();
        let png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
        let markdown = format!("![Mermaid diagram](data:image/png;base64,{png})\n");
        for format in ["latex", "docx", "epub"] {
            let output = dir.path().join(format!("pic.{}", if format == "latex" { "tex" } else { format }));
            export(Some(&pandoc), format, markdown.clone(), "T", output.to_str().unwrap(), None).unwrap();
        }
        let tex = fs::read_to_string(dir.path().join("pic.tex")).unwrap();
        assert!(tex.contains("includegraphics") && tex.contains("pic_media/"), "{tex}");
        assert_eq!(fs::read_dir(dir.path().join("pic_media")).unwrap().count(), 1);
        assert!(fs::metadata(dir.path().join("pic.docx")).unwrap().len() > 8000);
    }

    #[test]
    fn an_import_keeps_images_beside_the_markdown_file() {
        let Some(pandoc) = installed() else { return };
        let dir = tempfile::tempdir().unwrap();
        let picture = dir.path().join("pic.png");
        let png: Vec<u8> = vec![
            0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0,
            0x1f, 0x15, 0xc4, 0x89, 0, 0, 0, 0x0d, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0xf8, 0xcf, 0xc0, 0xf0, 0x1f, 0, 5, 0, 1, 0xff,
            0x89, 0x99, 0x3d, 0x1d, 0, 0, 0, 0, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
        ];
        fs::write(&picture, png).unwrap();
        let docx = dir.path().join("with-image.docx");
        export(Some(&pandoc), "docx", "![pic](pic.png)\n".into(), "T", docx.to_str().unwrap(), Some(dir.path().to_str().unwrap())).unwrap();
        let out = dir.path().join("sub");
        fs::create_dir(&out).unwrap();
        let markdown = out.join("converted.md");
        import(Some(&pandoc), docx.to_str().unwrap(), markdown.to_str().unwrap()).unwrap();
        let text = fs::read_to_string(&markdown).unwrap();
        assert!(text.contains("![pic](converted.assets/media/"), "{text}");
        assert!(fs::read_dir(out.join("converted.assets").join("media")).unwrap().count() == 1);
    }
}
