use std::{
    fs,
    io::{Cursor, Read, Write},
    path::Path,
};

pub const BYTE_LIMIT: usize = 64 * 1024 * 1024;
const PIXEL_LIMIT: u64 = 32 * 1024 * 1024;
const EDGE_LIMIT: u32 = 16384;

fn validate(bytes: &[u8]) -> Result<(), String> {
    if bytes.len() > BYTE_LIMIT {
        return Err("PNG exceeds the 64 MiB limit.".into());
    }
    if bytes.len() < 33 || &bytes[..8] != b"\x89PNG\r\n\x1a\n" || &bytes[12..16] != b"IHDR" {
        return Err("Invalid PNG header.".into());
    }
    let width = u32::from_be_bytes(bytes[16..20].try_into().unwrap());
    let height = u32::from_be_bytes(bytes[20..24].try_into().unwrap());
    if width == 0
        || height == 0
        || width > EDGE_LIMIT
        || height > EDGE_LIMIT
        || u64::from(width) * u64::from(height) > PIXEL_LIMIT
    {
        return Err("PNG dimensions exceed the export limit.".into());
    }
    let mut decoder = png::Decoder::new(Cursor::new(bytes));
    decoder.set_limits(png::Limits {
        bytes: 128 * 1024 * 1024,
    });
    let mut reader = decoder
        .read_info()
        .map_err(|e| format!("Invalid PNG: {e}"))?;
    if reader.info().animation_control.is_some() {
        return Err("Use a still PNG image.".into());
    }
    let size = reader
        .output_buffer_size()
        .ok_or("PNG dimensions exceed the export limit.")?;
    if size > 128 * 1024 * 1024 {
        return Err("PNG decoded size exceeds the export limit.".into());
    }
    reader
        .next_frame(&mut vec![0; size])
        .map_err(|e| format!("Invalid PNG pixels: {e}"))?;
    reader
        .finish()
        .map_err(|e| format!("Invalid PNG end: {e}"))?;
    Ok(())
}

pub fn save(path: &Path, bytes: &[u8]) -> Result<(), String> {
    save_with(
        path,
        bytes,
        |pending| pending.write_all(bytes).map_err(|e| e.to_string()),
        |parent, path| {
            #[cfg(unix)]
            fs::File::open(parent)
                .and_then(|directory| directory.sync_all())
                .map_err(|e| e.to_string())?;
            #[cfg(not(unix))]
            let _ = parent;
            let mut observed = Vec::new();
            let mut options = fs::OpenOptions::new();
            options.read(true);
            #[cfg(unix)]
            {
                use std::os::unix::fs::OpenOptionsExt;
                options.custom_flags(libc::O_NONBLOCK | libc::O_NOFOLLOW);
            }
            let observed_file = options.open(path).map_err(|e| e.to_string())?;
            if !observed_file
                .metadata()
                .map_err(|e| e.to_string())?
                .is_file()
            {
                return Err("The exported file is no longer regular.".into());
            }
            observed_file
                .take((BYTE_LIMIT + 1) as u64)
                .read_to_end(&mut observed)
                .map_err(|e| e.to_string())?;
            if observed != bytes {
                return Err("The exported file changed during confirmation.".into());
            }
            Ok(())
        },
    )
}

fn save_with(
    path: &Path,
    bytes: &[u8],
    write: impl FnOnce(&mut fs::File) -> Result<(), String>,
    confirm: impl FnOnce(&Path, &Path) -> Result<(), String>,
) -> Result<(), String> {
    validate(bytes)?;
    if !path.is_absolute()
        || !path
            .extension()
            .is_some_and(|value| value.eq_ignore_ascii_case("png"))
    {
        return Err("Select an absolute path with a .png extension.".into());
    }
    let parent = path
        .parent()
        .ok_or("The destination has no parent folder.")?;
    if path.symlink_metadata().is_ok() {
        return Err("The destination exists. Select a new file name.".into());
    }
    let mut pending = tempfile::NamedTempFile::new_in(parent).map_err(|e| e.to_string())?;
    write(pending.as_file_mut())?;
    pending.as_file().sync_all().map_err(|e| e.to_string())?;
    pending
        .persist_noclobber(path)
        .map_err(|e| format!("Cannot publish PNG. Select a new file name: {e}"))?;
    confirm(parent, path).map_err(|e| format!("PNG was published, but confirmation failed. Check the exported file before retrying: {e}"))
}

#[cfg(test)]
mod tests {
    use super::*;
    fn image() -> Vec<u8> {
        let mut result = Vec::new();
        {
            let mut encoder = png::Encoder::new(&mut result, 2, 1);
            encoder.set_color(png::ColorType::Rgba);
            encoder
                .write_header()
                .unwrap()
                .write_image_data(&[0, 0, 0, 255, 255, 255, 255, 255])
                .unwrap();
        }
        result
    }
    #[test]
    fn validates_pixels_and_limits_before_writing() {
        let bytes = image();
        validate(&bytes).unwrap();
        assert!(validate(b"not a PNG").is_err());
        for at in [16, 32, bytes.len() - 1] {
            let mut broken = bytes.clone();
            broken[at] ^= 255;
            assert!(validate(&broken).is_err());
        }
        let mut large = bytes.clone();
        large[16..20].copy_from_slice(&16385u32.to_be_bytes());
        assert!(validate(&large).unwrap_err().contains("dimensions"));
        large[16..20].copy_from_slice(&16384u32.to_be_bytes());
        large[20..24].copy_from_slice(&16384u32.to_be_bytes());
        assert!(validate(&large).unwrap_err().contains("dimensions"));
        assert!(validate(&vec![0; BYTE_LIMIT + 1])
            .unwrap_err()
            .contains("64 MiB"));
    }
    #[test]
    fn publishes_exact_png_and_keeps_existing_and_source_files() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("image.png");
        let bytes = image();
        save(&path, &bytes).unwrap();
        assert_eq!(fs::read(&path).unwrap(), bytes);
        assert!(save(&path, &bytes).unwrap_err().contains("exists"));
        let source = dir.path().join("writing.md");
        fs::write(&source, "Exact Markdown\r\n").unwrap();
        assert!(save(&source, &bytes).is_err());
        assert_eq!(fs::read_to_string(&source).unwrap(), "Exact Markdown\r\n");
        assert!(save(Path::new("relative.png"), &bytes).is_err());
    }
    #[test]
    fn partial_write_and_publication_race_keep_destinations_and_remove_temporary_files() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("image.png");
        let bytes = image();
        assert!(save_with(
            &path,
            &bytes,
            |file| {
                file.write_all(&bytes[..8]).unwrap();
                Err("write failed".into())
            },
            |_, _| Ok(())
        )
        .is_err());
        assert!(!path.exists());
        assert_eq!(fs::read_dir(dir.path()).unwrap().count(), 0);
        assert!(save_with(
            &path,
            &bytes,
            |file| {
                file.write_all(&bytes).unwrap();
                fs::write(&path, "other writer").unwrap();
                Ok(())
            },
            |_, _| Ok(())
        )
        .is_err());
        assert_eq!(fs::read_to_string(&path).unwrap(), "other writer");
        assert_eq!(fs::read_dir(dir.path()).unwrap().count(), 1);
    }
    #[test]
    fn confirmation_failure_reports_published_file() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("image.png");
        let bytes = image();
        let error = save_with(
            &path,
            &bytes,
            |file| file.write_all(&bytes).map_err(|e| e.to_string()),
            |_, _| Err("confirmation failed".into()),
        )
        .unwrap_err();
        assert!(error.contains("was published"));
        assert_eq!(fs::read(&path).unwrap(), bytes);
    }
}
