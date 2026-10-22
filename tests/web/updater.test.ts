import { describe, it, expect } from 'vitest';
import {
  parseSemver,
  compareSemver,
  detectPlatform,
  getInstallerCommand,
  findPlatformAsset,
  checkForUpdates,
  ReleaseAsset,
} from '../../src/web/updater';

describe('updater - semver parsing and comparison', () => {
  it('parses valid semver and beta versions', () => {
    expect(parseSemver('1.0.1')).toEqual({ major: 1, minor: 0, patch: 1, beta: null });
    expect(parseSemver('v1.0.1')).toEqual({ major: 1, minor: 0, patch: 1, beta: null });
    expect(parseSemver('v1.0.1-beta.2')).toEqual({ major: 1, minor: 0, patch: 1, beta: 2 });
    expect(parseSemver('2.15.3-beta.10')).toEqual({ major: 2, minor: 15, patch: 3, beta: 10 });
    expect(parseSemver('invalid')).toBeNull();
    expect(parseSemver('')).toBeNull();
  });

  it('correctly compares semantic versions', () => {
    expect(compareSemver('1.0.2', '1.0.1')).toBeGreaterThan(0);
    expect(compareSemver('1.1.0', '1.0.9')).toBeGreaterThan(0);
    expect(compareSemver('2.0.0', '1.99.99')).toBeGreaterThan(0);
    expect(compareSemver('1.0.1', '1.0.1')).toBe(0);
    expect(compareSemver('1.0.0', '1.0.1')).toBeLessThan(0);

    // Beta versions
    expect(compareSemver('1.0.1', '1.0.1-beta.1')).toBeGreaterThan(0); // Stable is newer than beta
    expect(compareSemver('1.0.1-beta.2', '1.0.1-beta.1')).toBeGreaterThan(0);
    expect(compareSemver('1.0.1-beta.1', '1.0.1-beta.2')).toBeLessThan(0);
  });
});

describe('updater - platform and asset resolution', () => {
  it('detects platform from user agent', () => {
    const macArm = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';
    expect(detectPlatform(macArm).os).toBe('macos');

    const winX64 = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
    const detectedWin = detectPlatform(winX64);
    expect(detectedWin.os).toBe('windows');
    expect(detectedWin.arch).toBe('x64');

    const linuxX64 = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36';
    const detectedLinux = detectPlatform(linuxX64);
    expect(detectedLinux.os).toBe('linux');
    expect(detectedLinux.arch).toBe('x64');
  });

  it('provides matching installer commands for platforms', () => {
    expect(getInstallerCommand('macos')).toContain('curl');
    expect(getInstallerCommand('macos')).toContain('markdew-installer.sh');
    expect(getInstallerCommand('linux')).toContain('curl');
    expect(getInstallerCommand('windows')).toContain('irm');
    expect(getInstallerCommand('windows')).toContain('markdew-installer.ps1');
  });

  it('locates matching platform assets', () => {
    const assets: ReleaseAsset[] = [
      { name: 'MarkDew-v1.0.2-macos-arm64.dmg', size: 1000, browser_download_url: 'https://download/macos-arm64.dmg' },
      { name: 'MarkDew-v1.0.2-macos-x64.dmg', size: 1000, browser_download_url: 'https://download/macos-x64.dmg' },
      { name: 'MarkDew-v1.0.2-linux-x64.deb', size: 1000, browser_download_url: 'https://download/linux-x64.deb' },
      { name: 'MarkDew-v1.0.2-windows-x64.exe', size: 1000, browser_download_url: 'https://download/windows-x64.exe' },
    ];

    expect(findPlatformAsset(assets, { os: 'macos', arch: 'arm64' })?.name).toBe('MarkDew-v1.0.2-macos-arm64.dmg');
    expect(findPlatformAsset(assets, { os: 'macos', arch: 'x64' })?.name).toBe('MarkDew-v1.0.2-macos-x64.dmg');
    expect(findPlatformAsset(assets, { os: 'linux', arch: 'x64' })?.name).toBe('MarkDew-v1.0.2-linux-x64.deb');
    expect(findPlatformAsset(assets, { os: 'windows', arch: 'x64' })?.name).toBe('MarkDew-v1.0.2-windows-x64.exe');
  });
});

describe('updater - checkForUpdates API', () => {
  it('reports update-available when a newer release exists', async () => {
    const mockRelease = {
      tag_name: 'v1.0.2',
      name: 'MarkDew v1.0.2',
      body: 'Bug fixes and performance improvements.',
      html_url: 'https://github.com/shenghsi/MarkDew/releases/tag/v1.0.2',
      assets: [
        {
          name: 'MarkDew-v1.0.2-macos-arm64.dmg',
          size: 5000000,
          browser_download_url: 'https://download/MarkDew-v1.0.2-macos-arm64.dmg',
        },
      ],
    };

    const mockFetch = async () =>
      new Response(JSON.stringify(mockRelease), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

    const result = await checkForUpdates('1.0.1', {
      fetchFn: mockFetch as unknown as typeof fetch,
      platform: { os: 'macos', arch: 'arm64' },
    });

    expect(result.status).toBe('update-available');
    if (result.status === 'update-available') {
      expect(result.update.version).toBe('1.0.2');
      expect(result.update.downloadUrl).toBe('https://download/MarkDew-v1.0.2-macos-arm64.dmg');
      expect(result.update.installerCommand).toContain('markdew-installer.sh');
    }
  });

  it('reports up-to-date when versions match', async () => {
    const mockRelease = {
      tag_name: 'v1.0.1',
      name: 'MarkDew v1.0.1',
      html_url: 'https://github.com/shenghsi/MarkDew/releases/tag/v1.0.1',
    };

    const mockFetch = async () =>
      new Response(JSON.stringify(mockRelease), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

    const result = await checkForUpdates('1.0.1', {
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    expect(result.status).toBe('up-to-date');
  });

  it('handles rate-limiting (HTTP 403) gracefully', async () => {
    const mockFetch = async () =>
      new Response('Rate limited', {
        status: 403,
      });

    const result = await checkForUpdates('1.0.1', {
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.message).toContain('rate limit');
    }
  });
});
