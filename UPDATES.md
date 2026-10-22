# App updates

In Settings > General or Tools > About MarkDew, select Check for Updates.
When a new stable version is available, select Update and Restart. The app
downloads the package, checks its signature, installs it, and restarts.
Save all documents and close other MarkDew windows first.

MarkDew also checks for updates by itself when the desktop app starts, at most
once every 24 hours. When a new stable version exists, a notice shows the version
with an Update and Restart button. Select the button to confirm the install, or
close the notice to ignore it. Turn this check off with **Check for updates
automatically** in Settings > General. A failed or up-to-date check shows nothing.

Linux keeps the DEB package. The system password dialog authorizes installation.
MarkDew does not collect or store the password. Cancel keeps the app open.
The DEB depends on pkexec. A desktop polkit authentication agent must be running.
The internal terminal agent and terminal sudo are not used. Windows can also
require system administrator approval. macOS requires a writable app location.

Versions without the in-app updater need one manual upgrade to the first release
with this feature (v1.0.7). An installed
older build must be tested against a newer signed package on each supported
platform before native installation and restart acceptance can be claimed.

## Release setup

The public update key is in src/desktop/tauri.conf.json. The matching private key
is stored outside the repository at ~/.tauri/markdew-updater.key and in the
shenghsi/MarkDew repository secret TAURI_SIGNING_PRIVATE_KEY. Keep a secure backup
of this key. Do not replace it when you build a new release. Existing installations
trust this public key. The current key has no password; the optional
TAURI_SIGNING_PRIVATE_KEY_PASSWORD secret can remain unset.

The release workflow passes the secret to native package jobs. Its updater build
overlay enables signed artifacts. Ordinary portability jobs need no private key.
The collector checks package hashes, checkout identity, signatures, and signed
versions before it creates the draft. The release includes latest.json, signed
macOS app archives, and signatures for DEB and NSIS packages. Publication stays
manual. The latest endpoint selects stable releases. A beta update channel is not
configured. Update signatures do not supply Apple notarization or Windows
publisher certificates.
