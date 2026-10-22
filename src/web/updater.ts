import { Channel, invoke, isTauri } from '@tauri-apps/api/core';

export interface Semver {
  major: number;
  minor: number;
  patch: number;
  beta: number | null;
}

export function parseSemver(version: string): Semver | null {
  const normalized = version.trim().replace(/^v/, '');
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-beta\.(\d+))?$/.exec(normalized);
  if (!match) return null;
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    beta: match[4] ? parseInt(match[4], 10) : null,
  };
}

export function compareSemver(a: string, b: string): number {
  const sa = parseSemver(a);
  const sb = parseSemver(b);
  if (!sa || !sb) throw new Error(`Invalid semver: ${!sa ? a : b}`);

  if (sa.major !== sb.major) return sa.major - sb.major;
  if (sa.minor !== sb.minor) return sa.minor - sb.minor;
  if (sa.patch !== sb.patch) return sa.patch - sb.patch;

  // If base versions are equal:
  // Stable release (no beta) is newer than prerelease with beta.
  if (sa.beta === null && sb.beta !== null) return 1;
  if (sa.beta !== null && sb.beta === null) return -1;
  if (sa.beta !== null && sb.beta !== null) return sa.beta - sb.beta;

  return 0;
}

export interface PlatformInfo {
  os: 'macos' | 'linux' | 'windows' | 'unknown';
  arch: 'arm64' | 'x64' | 'unknown';
}

export function detectPlatform(ua: string = typeof navigator !== 'undefined' ? navigator.userAgent : ''): PlatformInfo {
  const lower = ua.toLowerCase();
  let os: PlatformInfo['os'] = 'unknown';
  let arch: PlatformInfo['arch'] = 'unknown';

  if (lower.includes('macintosh') || lower.includes('mac os')) {
    os = 'macos';
  } else if (lower.includes('windows') || lower.includes('win32') || lower.includes('win64')) {
    os = 'windows';
  } else if (lower.includes('linux')) {
    os = 'linux';
  }

  // Detect architecture hints
  if (lower.includes('arm64') || lower.includes('aarch64')) {
    arch = 'arm64';
  } else if (lower.includes('x86_64') || lower.includes('x64') || lower.includes('win64') || lower.includes('amd64')) {
    arch = 'x64';
  } else if (os === 'macos') {
    // Apple Silicon is standard on modern macOS; if indeterminate, default to arm64
    arch = 'arm64';
  }

  return { os, arch };
}

export function getInstallerCommand(os: PlatformInfo['os']): string {
  if (os === 'windows') {
    return 'irm https://github.com/shenghsi/MarkDew/releases/latest/download/markdew-installer.ps1 | iex';
  }
  return 'curl --proto \'=https\' --tlsv1.2 -LsSf https://github.com/shenghsi/MarkDew/releases/latest/download/markdew-installer.sh | sh';
}

export interface ReleaseAsset {
  name: string;
  size: number;
  browser_download_url: string;
}

export interface GitHubRelease {
  tag_name: string;
  name: string;
  body?: string;
  html_url: string;
  published_at?: string;
  assets?: ReleaseAsset[];
}

export interface UpdateInfo {
  oneClick?: boolean;
  version: string;
  tagName: string;
  releaseName: string;
  releaseNotes: string;
  htmlUrl: string;
  downloadUrl?: string;
  installerCommand: string;
}

export interface UpdateProgress {
  stage: 'download' | 'install';
  downloaded?: number;
  total?: number;
}

type InstallGuard = (install: () => Promise<void>) => Promise<void>;
let installGuard: InstallGuard | undefined;
let installing = false;

export function registerUpdateGuard(guard: InstallGuard): void {
  installGuard = guard;
}

export async function installAppUpdate(onProgress: (progress: UpdateProgress) => void): Promise<void> {
  if (!isTauri() || !installGuard) throw new Error('Open the desktop app to install an update.');
  if (installing) throw new Error('An update is already in progress.');
  installing = true;
  try {
    await installGuard(async () => {
      const progress = new Channel<UpdateProgress>();
      progress.onmessage = onProgress;
      await invoke('install_app_update', { progress });
    });
  } finally { installing = false; }
}

export async function checkAppUpdates(currentVersion: string): Promise<UpdateCheckResult> {
  if (!isTauri()) return checkForUpdates(currentVersion);
  try { return await invoke<UpdateCheckResult>('check_app_update'); }
  catch (error) { return { status: 'error', message: String(error) }; }
}

export type UpdateCheckResult =
  | { status: 'update-available'; currentVersion: string; update: UpdateInfo }
  | { status: 'up-to-date'; currentVersion: string }
  | { status: 'error'; message: string };

export function findPlatformAsset(assets: ReleaseAsset[] | undefined, platform: PlatformInfo): ReleaseAsset | undefined {
  if (!assets || !assets.length) return undefined;

  let pattern: RegExp;
  if (platform.os === 'macos') {
    pattern = platform.arch === 'x64' ? /macos-x64\.dmg$/i : /macos-arm64\.dmg$/i;
  } else if (platform.os === 'linux') {
    pattern = /linux-x64\.deb$/i;
  } else if (platform.os === 'windows') {
    pattern = /windows-x64\.exe$/i;
  } else {
    return undefined;
  }

  return assets.find(a => pattern.test(a.name));
}

export async function checkForUpdates(
  currentVersion: string,
  options?: {
    endpoint?: string;
    fetchFn?: typeof fetch;
    platform?: PlatformInfo;
  }
): Promise<UpdateCheckResult> {
  const endpoint = options?.endpoint ?? 'https://api.github.com/repos/shenghsi/MarkDew/releases/latest';
  const fetcher = options?.fetchFn ?? fetch;
  const platform = options?.platform ?? detectPlatform();

  try {
    const response = await fetcher(endpoint, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      if (response.status === 403) {
        return {
          status: 'error',
          message: 'GitHub rate limit exceeded. Check your network or try again later.',
        };
      }
      return {
        status: 'error',
        message: `Failed to check for updates (HTTP ${response.status}).`,
      };
    }

    const release = (await response.json()) as GitHubRelease;
    const remoteVersion = release.tag_name ? release.tag_name.replace(/^v/, '') : '';

    if (!remoteVersion) {
      return {
        status: 'error',
        message: 'Invalid release record received from server.',
      };
    }

    const comparison = compareSemver(remoteVersion, currentVersion);
    if (comparison > 0) {
      const asset = findPlatformAsset(release.assets, platform);
      const downloadUrl = asset ? asset.browser_download_url : release.html_url;
      const installerCommand = getInstallerCommand(platform.os);

      return {
        status: 'update-available',
        currentVersion,
        update: {
          version: remoteVersion,
          tagName: release.tag_name,
          releaseName: release.name || `MarkDew ${release.tag_name}`,
          releaseNotes: release.body || '',
          htmlUrl: release.html_url,
          downloadUrl,
          installerCommand,
        },
      };
    }

    return {
      status: 'up-to-date',
      currentVersion,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      status: 'error',
      message: `Cannot check for updates: ${message}`,
    };
  }
}
