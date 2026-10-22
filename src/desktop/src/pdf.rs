// Export → PDF writes the open print view to a PDF file with the WebView's own print engine, with no
// system dialog. The print style sheet applies as it does for Print…, so the pages are the same.
use std::{
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicBool, Ordering},
        mpsc::{self, RecvTimeoutError, Sender},
    },
    time::Duration,
};

type Reply = Sender<Result<(), String>>;

// A print that does not answer in ten minutes is lost. A later answer is dropped.
const TIMEOUT: Duration = Duration::from_secs(600);
// One print operation at a time: macOS allows one current operation per thread.
static BUSY: AtomicBool = AtomicBool::new(false);

struct Busy;
impl Busy {
    fn take() -> Result<Busy, String> {
        BUSY.compare_exchange(false, true, Ordering::AcqRel, Ordering::Acquire)
            .map(|_| Busy)
            .map_err(|_| "A PDF export is already running.".to_string())
    }
}
impl Drop for Busy {
    fn drop(&mut self) {
        BUSY.store(false, Ordering::Release);
    }
}

fn target(text: &str) -> Result<PathBuf, String> {
    let path = PathBuf::from(text);
    if !path.is_absolute() {
        return Err("Use an absolute path for the PDF file.".into());
    }
    if !path.extension().is_some_and(|extension| extension.eq_ignore_ascii_case("pdf")) {
        return Err("The PDF file name must end in .pdf.".into());
    }
    if !path.parent().is_some_and(Path::is_dir) {
        return Err("The folder for the PDF file does not exist.".into());
    }
    Ok(path)
}

#[tauri::command]
pub async fn export_pdf(window: tauri::WebviewWindow, path: String) -> Result<(), String> {
    let output = target(&path)?;
    let _busy = Busy::take()?;
    // The print engine writes the file itself, so the temporary file is closed first and only its name stays.
    // It has the .pdf suffix because some print back ends choose the format from it. A failed run removes it.
    let mut builder = tempfile::Builder::new();
    builder.prefix(".markdew-pdf-").suffix(".pdf");
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        builder.permissions(std::fs::Permissions::from_mode(0o666));
    }
    let pending = builder
        .tempfile_in(output.parent().unwrap())
        .map_err(|error| error.to_string())?
        .into_temp_path();
    let file = pending.to_path_buf();
    let (reply, result) = mpsc::channel();
    let start = reply.clone();
    window
        .with_webview(move |webview| {
            if let Err(error) = platform::print(webview, &file, reply) {
                let _ = start.send(Err(error));
            }
        })
        .map_err(|error| error.to_string())?;
    let result = tauri::async_runtime::spawn_blocking(move || result.recv_timeout(TIMEOUT))
        .await
        .map_err(|error| error.to_string())?;
    match result {
        Ok(Ok(())) => {}
        Ok(Err(error)) => return Err(error),
        Err(RecvTimeoutError::Timeout) => return Err("The PDF export timed out.".into()),
        Err(RecvTimeoutError::Disconnected) => return Err("The window closed before the PDF was written.".into()),
    }
    if std::fs::metadata(&pending).map(|data| data.len()).unwrap_or(0) == 0 {
        return Err("The print engine wrote no PDF.".into());
    }
    pending.persist(&output).map_err(|error| error.error.to_string())?;
    Ok(())
}

#[cfg(target_os = "macos")]
mod platform {
    use super::Reply;
    use objc2::{define_class, msg_send, rc::Retained, runtime::{Bool, NSObject, ProtocolObject}, sel, AllocAnyThread};
    use objc2_app_kit::{
        NSPrintInfo, NSPrintJobSavingURL, NSPrintOperation, NSPrintSaveJob, NSPrintingPaginationMode, NSWindow,
    };
    use objc2_foundation::{NSCopying, NSString, NSURL};
    use objc2_web_kit::WKWebView;
    use std::{ffi::c_void, path::Path};
    use tauri::webview::PlatformWebview;

    // 18 mm, the margin of the print style sheet, in points. WebKit leaves @page margins to the print info.
    const MARGIN: f64 = 18.0 / 25.4 * 72.0;

    define_class!(
        #[unsafe(super(NSObject))]
        #[name = "MarkDewPdfExportDelegate"]
        struct Delegate;

        impl Delegate {
            #[unsafe(method(printOperationDidRun:success:contextInfo:))]
            fn did_run(&self, _operation: &NSPrintOperation, success: Bool, context: *mut c_void) {
                // Safety: the context is the reply that print() boxed for this operation, and it comes back once.
                let reply = unsafe { Box::from_raw(context.cast::<Reply>()) };
                let _ = reply.send(if success.as_bool() { Ok(()) } else { Err("The print engine did not write the PDF.".into()) });
            }
        }
    );

    thread_local! {
        // The delegate lives as long as the app, so it outlives every operation that calls it.
        static DELEGATE: Retained<Delegate> = unsafe { msg_send![Delegate::alloc(), init] };
    }

    pub fn print(webview: PlatformWebview, file: &Path, reply: Reply) -> Result<(), String> {
        let file = file.to_str().ok_or("The PDF path is not valid text.")?;
        // Safety: Tauri gives the live WKWebView and NSWindow of this webview, on the main thread.
        unsafe {
            let view = &*webview.inner().cast::<WKWebView>();
            let window = &*webview.ns_window().cast::<NSWindow>();
            // A copy, so that the next Print… does not save to this file.
            let info: Retained<NSPrintInfo> = NSPrintInfo::sharedPrintInfo().copy();
            info.setJobDisposition(NSPrintSaveJob);
            let url = NSURL::fileURLWithPath(&NSString::from_str(file));
            info.dictionary().setObject_forKey(&url, ProtocolObject::from_ref(NSPrintJobSavingURL));
            info.setTopMargin(MARGIN);
            info.setBottomMargin(MARGIN);
            info.setLeftMargin(MARGIN);
            info.setRightMargin(MARGIN);
            info.setHorizontalPagination(NSPrintingPaginationMode::Fit);
            info.setVerticalPagination(NSPrintingPaginationMode::Automatic);
            info.setHorizontallyCentered(false);
            info.setVerticallyCentered(false);
            let operation = view.printOperationWithPrintInfo(&info);
            operation.setShowsPrintPanel(false);
            operation.setShowsProgressPanel(false);
            // A print view with no size prints blank pages.
            if let Some(printed) = operation.view() {
                if printed.frame().size.width == 0.0 {
                    printed.setFrame(view.frame());
                }
            }
            let context = Box::into_raw(Box::new(reply)).cast::<c_void>();
            DELEGATE.with(|delegate| {
                operation.runOperationModalForWindow_delegate_didRunSelector_contextInfo(
                    window,
                    Some(delegate),
                    Some(sel!(printOperationDidRun:success:contextInfo:)),
                    context,
                )
            });
        }
        Ok(())
    }
}

#[cfg(windows)]
mod platform {
    use super::Reply;
    use std::path::Path;
    use tauri::webview::PlatformWebview;
    use webview2_com::{
        Microsoft::Web::WebView2::Win32::{ICoreWebView2Environment6, ICoreWebView2_7},
        PrintToPdfCompletedHandler,
    };
    use windows::core::{Interface, HSTRING};

    pub fn print(webview: PlatformWebview, file: &Path, reply: Reply) -> Result<(), String> {
        let old = "Update the Microsoft Edge WebView2 Runtime to export PDF files.";
        // Safety: Tauri gives the live WebView2 controller and environment of this webview, on the UI thread.
        unsafe {
            let core = webview.controller().CoreWebView2().map_err(|error| error.to_string())?;
            let core: ICoreWebView2_7 = core.cast().map_err(|_| old)?;
            let environment: ICoreWebView2Environment6 = webview.environment().cast().map_err(|_| old)?;
            let settings = environment.CreatePrintSettings().map_err(|error| error.to_string())?;
            // Code blocks and keys have backgrounds. The margins come from the print style sheet (@page).
            settings.SetShouldPrintBackgrounds(true).map_err(|error| error.to_string())?;
            settings.SetShouldPrintHeaderAndFooter(false).map_err(|error| error.to_string())?;
            let handler = PrintToPdfCompletedHandler::create(Box::new(move |result, written| {
                let _ = reply.send(match result {
                    Err(error) => Err(error.to_string()),
                    Ok(()) if !written => Err("The print engine did not write the PDF.".into()),
                    Ok(()) => Ok(()),
                });
                Ok(())
            }));
            core.PrintToPdf(&HSTRING::from(file.as_os_str()), &settings, &handler)
                .map_err(|error| error.to_string())
        }
    }
}

#[cfg(target_os = "linux")]
mod platform {
    use super::Reply;
    use gtk::{glib, prelude::*};
    use std::{cell::RefCell, path::Path, rc::Rc};
    use tauri::webview::PlatformWebview;
    use webkit2gtk::{PrintOperation, PrintOperationExt};

    pub fn print(webview: PlatformWebview, file: &Path, reply: Reply) -> Result<(), String> {
        let uri = glib::filename_to_uri(file, None).map_err(|error| error.to_string())?;
        let settings = gtk::PrintSettings::new();
        // The file printer of GTK has a translated name. Without it, the job would go to the default printer.
        settings.set_printer(&glib::dgettext(Some("gtk30"), "Print to File"));
        settings.set(gtk::PRINT_SETTINGS_OUTPUT_URI, Some(&uri));
        settings.set(gtk::PRINT_SETTINGS_OUTPUT_FILE_FORMAT, Some("pdf"));
        let operation = PrintOperation::new(&webview.inner());
        operation.set_print_settings(&settings);
        // WebKit takes the margins from the page setup: the default paper with the 18 mm of the print style sheet.
        let setup = gtk::PageSetup::new();
        setup.set_paper_size_and_default_margins(&gtk::PaperSize::new(None));
        for set in [gtk::PageSetup::set_top_margin, gtk::PageSetup::set_bottom_margin, gtk::PageSetup::set_left_margin, gtk::PageSetup::set_right_margin] {
            set(&setup, 18.0, gtk::Unit::Mm);
        }
        operation.set_page_setup(&setup);
        // finished follows failed, so the first answer is kept.
        let reply = Rc::new(RefCell::new(Some(reply)));
        let failed = reply.clone();
        operation.connect_failed(move |_, error| {
            if let Some(reply) = failed.borrow_mut().take() {
                let _ = reply.send(Err(error.to_string()));
            }
        });
        operation.connect_finished(move |_| {
            if let Some(reply) = reply.borrow_mut().take() {
                let _ = reply.send(Ok(()));
            }
        });
        operation.print();
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_only_an_absolute_pdf_path_in_an_existing_folder() {
        let folder = tempfile::tempdir().unwrap();
        let good = folder.path().join("Doc.PDF");
        assert_eq!(target(good.to_str().unwrap()).unwrap(), good);
        assert!(target("Doc.pdf").is_err());
        assert!(target(folder.path().join("Doc.png").to_str().unwrap()).is_err());
        assert!(target(folder.path().join("missing/Doc.pdf").to_str().unwrap()).is_err());
    }

    #[test]
    fn allows_one_export_at_a_time() {
        let first = Busy::take().unwrap();
        assert!(Busy::take().is_err());
        drop(first);
        assert!(Busy::take().is_ok());
    }
}
