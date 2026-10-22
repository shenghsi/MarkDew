Signed macOS release jobs explicitly build app and dmg. A dmg-only build deletes
the temporary app and does not create the updater archive. The unpublished
v1.0.6 tag records that failed packaging attempt; v1.0.7 is the corrected release.

Release builds now add signed updater artifacts: macOS app.tar.gz archives,
DEB and NSIS signatures, and latest.json with all four native targets. Collection
verifies each package and trusted version comment against the pinned public key,
as well as manifest hashes and checkout. The complete release has eighteen files.
Only release builds enable createUpdaterArtifacts; ordinary portability builds
need no signing secret. The reusable workflow receives the private key through
GitHub Actions secrets. The private key stays outside the repository. Stable
latest routing selects stable releases; beta manifests use their signed base
package version and are not a separate beta update channel. Existing installed
versions need one manual upgrade to get the in-app updater. Publication remains
manual. An installed-old-to-new acceptance check remains open on each platform.

# Package release

A pushed vVERSION or vVERSION-beta.N tag starts the release workflow. Its base version
must match npm, the npm lock, Cargo, and Tauri. HEAD and the tag's commit must
match the recorded checkout. All frontend and native checks must succeed
before a draft release can be created. A package build is not native input,
installation, Save, or recovery acceptance.

The release contains macOS ARM64 and X64 DMG disk images, Linux X64 DEB, and Windows X64
NSIS. macOS uses verified ad-hoc signing with no Developer ID or notarization.
Windows and Linux have no publisher certificate. Each package has a manifest
with checkout, architecture, signing status, size, and SHA-256. The release also includes
unversioned markdew-installer.sh and markdew-installer.ps1 scripts for automated install.
Release collection produces eighteen files: four installer packages, four manifests,
two macOS update archives, four update signatures, latest.json, two installer scripts,
and SHA256SUMS. Collection rejects missing, duplicate, changed, linked, unexpected, or wrong-checkout artifacts.

Release names include the tag and architecture. Only the last job can write
release data. An existing release is never replaced. Creation starts with an
incomplete draft notice; successful upload replaces it with the release notes.
Stable releases use RELEASE.md and draft state without the prerelease flag.
Beta releases use BETA_RELEASE.md and draft state with the prerelease flag.
Remote tag, draft/prerelease state, asset names, sizes, upload state, and available
digest values must agree before final notes replace the incomplete notice.
Failure leaves that draft unpublished. The workflow never publishes a release,
changes source record, baseline, or recovery, or installs an app.
