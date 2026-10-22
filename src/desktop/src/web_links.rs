use tauri::Url;

const LIMIT: usize = 8192;

pub fn validate(window: &str, source: &str) -> Result<String, String> {
    if window != "main" {
        return Err("Only the document window can open a web link.".into());
    }
    let scheme = source.split_once("://").map(|(scheme, _)| scheme);
    if !scheme.is_some_and(|scheme| {
        scheme.eq_ignore_ascii_case("http") || scheme.eq_ignore_ascii_case("https")
    }) || source.chars().any(char::is_control)
        || source.ends_with(' ')
        || source.len() > LIMIT
    {
        return Err("Use an absolute HTTP or HTTPS web link without controls.".into());
    }
    let url = Url::parse(source).map_err(|_| "The web link is invalid.")?;
    if !matches!(url.scheme(), "http" | "https")
        || url.host_str().is_none()
        || !url.username().is_empty()
        || url.password().is_some()
        || url.as_str().len() > LIMIT
    {
        return Err("Use a bounded web link with a host and no credentials.".into());
    }
    Ok(url.into())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn matches_the_shared_frontend_url_cases() {
        let cases: Vec<(String, Option<String>)> =
            serde_json::from_str(include_str!("../../../tests/web/web-link-cases.json")).unwrap();
        for (source, expected) in cases {
            assert_eq!(validate("main", &source).ok(), expected, "{source:?}");
        }
    }

    #[test]
    fn rejects_other_windows() {
        assert!(validate("other", "https://example.com").is_err());
    }

    #[test]
    fn bounds_original_and_normalized_utf8_bytes() {
        let prefix = "https://example.com/";
        let exact = format!("{prefix}{}", "a".repeat(LIMIT - prefix.len()));
        assert_eq!(validate("main", &exact).unwrap().len(), LIMIT);
        assert!(validate("main", &(exact + "a")).is_err());
        let expanded = format!("{prefix}{}", "日".repeat(1000));
        assert!(expanded.len() < LIMIT);
        assert!(validate("main", &expanded).is_err());
    }
}
