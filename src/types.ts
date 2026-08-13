export interface InstalledApp {
  version: string;
  exePath: string;
  installDir: string;
}

export interface ReleaseInfo {
  version: string;
  notes: string;
  publishedAt: string;
  assetName: string;
  assetUrl: string;
  assetSize: number;
}

export interface AppState {
  id: string;
  name: string;
  eyebrow: string;
  tagline: string;
  repo?: string | null;
  setupAsset?: string | null;
  exeName?: string | null;
  dirName?: string | null;
  accent?: string | null;
  comingSoon: boolean;
  placeholder: boolean;
  installed: InstalledApp | null;
  latest: ReleaseInfo | null;
  error: string | null;
}

export interface InstallProgress {
  appId: string;
  phase: 'download' | 'install' | 'done' | 'error';
  received: number;
  total: number;
  bytesPerSec: number;
}

export type AppAction = 'install' | 'update' | 'launch' | 'soon';

/** Compare two semver-ish strings. Returns >0 if a > b. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d;
  }
  return 0;
}

export function appAction(app: AppState): AppAction {
  if (app.placeholder || app.comingSoon || (!app.latest && !app.installed)) return 'soon';
  if (!app.installed) return 'install';
  if (app.latest && compareVersions(app.latest.version, app.installed.version) > 0) return 'update';
  return 'launch';
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} Go`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${bytes} o`;
}
