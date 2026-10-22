#!/bin/sh
set -eu

REPO="shenghsi/MarkDew"

cleanup() {
  if [ -n "${TMP_DIR:-}" ] && [ -d "${TMP_DIR:-}" ]; then
    if [ -n "${MOUNT_DIR:-}" ] && [ -d "${MOUNT_DIR:-}" ]; then
      hdiutil detach "${MOUNT_DIR}" -force >/dev/null 2>&1 || true
    fi
    rm -rf "${TMP_DIR}"
  fi
}

trap cleanup EXIT INT TERM

log_info() {
  printf "info: %s\n" "$1"
}

log_error() {
  printf "error: %s\n" "$1" >&2
}

resolve_tag() {
  # Avoid GitHub API rate limits by reading the redirect target from releases/latest.
  resolved=$(curl -fsSLI -o /dev/null -w "%{url_effective}" "https://github.com/${REPO}/releases/latest" 2>/dev/null || true)
  tag=$(printf "%s" "$resolved" | sed 's|.*/tag/||')
  if [ -z "$tag" ] || [ "$tag" = "$resolved" ]; then
    # Fallback to GitHub REST API if redirect inspection fails.
    tag=$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" 2>/dev/null | grep '"tag_name":' | head -n 1 | sed -E 's/.*"tag_name": *"([^"]+)".*/\1/' || true)
  fi
  if [ -z "$tag" ]; then
    log_error "Cannot resolve the latest MarkDew release tag."
    exit 1
  fi
  printf "%s" "$tag"
}

detect_target() {
  os_raw=$(uname -s)
  arch_raw=$(uname -m)

  case "$os_raw" in
    Darwin)
      case "$arch_raw" in
        arm64|aarch64)
          printf "macos-arm64.dmg"
          ;;
        x86_64|amd64)
          printf "macos-x64.dmg"
          ;;
        *)
          log_error "Unsupported macOS architecture: ${arch_raw}"
          exit 1
          ;;
      esac
      ;;
    Linux)
      case "$arch_raw" in
        x86_64|amd64)
          printf "linux-x64.deb"
          ;;
        *)
          log_error "Unsupported Linux architecture: ${arch_raw}"
          exit 1
          ;;
      esac
      ;;
    *)
      log_error "Unsupported operating system: ${os_raw}. For Windows, use markdew-installer.ps1."
      exit 1
      ;;
  esac
}

verify_sha256() {
  file_path="$1"
  file_name="$2"
  sums_path="$3"

  target_line=$(grep "  ${file_name}\$" "${sums_path}" || true)
  if [ -z "${target_line}" ]; then
    log_error "Verification record for ${file_name} was not found in SHA256SUMS."
    exit 1
  fi

  expected_hash=$(printf "%s" "${target_line}" | awk '{print $1}')

  if command -v shasum >/dev/null 2>&1; then
    actual_hash=$(shasum -a 256 "${file_path}" | awk '{print $1}')
  elif command -v sha256sum >/dev/null 2>&1; then
    actual_hash=$(sha256sum "${file_path}" | awk '{print $1}')
  else
    log_error "Neither shasum nor sha256sum is available on this system."
    exit 1
  fi

  if [ "${expected_hash}" != "${actual_hash}" ]; then
    log_error "SHA-256 hash mismatch for ${file_name}. Download is rejected."
    exit 1
  fi
}

install_macos() {
  dmg_path="$1"

  if pgrep -x MarkDew >/dev/null 2>&1; then
    log_error "MarkDew is currently running. Close MarkDew before you update."
    exit 1
  fi

  dest_dir="/Applications"
  if [ ! -w "${dest_dir}" ]; then
    dest_dir="${HOME}/Applications"
    mkdir -p "${dest_dir}"
  fi

  MOUNT_DIR="${TMP_DIR}/mount"
  mkdir -p "${MOUNT_DIR}"

  log_info "Mounting disk image..."
  hdiutil attach -nobrowse -readonly "${dmg_path}" -mountpoint "${MOUNT_DIR}" >/dev/null

  source_app="${MOUNT_DIR}/MarkDew.app"
  if [ ! -d "${source_app}" ]; then
    log_error "MarkDew.app not found in mounted disk image."
    exit 1
  fi

  target_app="${dest_dir}/MarkDew.app"
  log_info "Installing MarkDew to ${target_app}..."
  rm -rf "${target_app}"
  ditto "${source_app}" "${target_app}"

  hdiutil detach "${MOUNT_DIR}" -force >/dev/null 2>&1 || true
  MOUNT_DIR=""

  # Clear quarantine attribute for ad-hoc signed package
  xattr -cr "${target_app}" 2>/dev/null || true

  log_info "MarkDew installed successfully into ${dest_dir}."
  log_info "You can start MarkDew from ${target_app}."
}

install_linux() {
  deb_path="$1"

  log_info "Installing Debian package ${deb_path}..."
  if [ "$(id -u)" -eq 0 ]; then
    dpkg -i "${deb_path}" || apt-get install -f -y
  else
    if command -v sudo >/dev/null 2>&1; then
      sudo dpkg -i "${deb_path}" || sudo apt-get install -f -y
    else
      log_error "Root permissions are required to install Debian package. Run as root or install sudo."
      exit 1
    fi
  fi

  log_info "MarkDew installed successfully."
  log_info "You can start MarkDew with the 'markdew' command."
}

main() {
  target_suffix=$(detect_target)
  tag=$(resolve_tag)
  package_name="MarkDew-${tag}-${target_suffix}"

  TMP_DIR=$(mktemp -d 2>/dev/null || mktemp -d -t "markdew-install")
  package_file="${TMP_DIR}/${package_name}"
  sums_file="${TMP_DIR}/SHA256SUMS"

  base_url="https://github.com/${REPO}/releases/download/${tag}"
  package_url="${base_url}/${package_name}"
  sums_url="${base_url}/SHA256SUMS"

  log_info "Downloading MarkDew ${tag} (${package_name})..."
  curl -fsSL "${package_url}" -o "${package_file}"

  log_info "Downloading SHA256SUMS..."
  curl -fsSL "${sums_url}" -o "${sums_file}"

  log_info "Verifying SHA-256 digest..."
  verify_sha256 "${package_file}" "${package_name}" "${sums_file}"
  log_info "Digest verified successfully."

  case "$(uname -s)" in
    Darwin)
      install_macos "${package_file}"
      ;;
    Linux)
      install_linux "${package_file}"
      ;;
  esac
}

main "$@"
