import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import type { AppState, InstalledApp, InstallProgress } from './types';

export function getAppsState(): Promise<AppState[]> {
  return invoke<AppState[]>('get_apps_state');
}

export function downloadAndInstall(appId: string): Promise<InstalledApp> {
  return invoke<InstalledApp>('download_and_install', { appId });
}

export function launchApp(appId: string): Promise<void> {
  return invoke<void>('launch_app', { appId });
}

export function uninstallApp(appId: string): Promise<void> {
  return invoke<void>('uninstall_app', { appId });
}

export function onInstallProgress(cb: (p: InstallProgress) => void): Promise<UnlistenFn> {
  return listen<InstallProgress>('install-progress', (e) => cb(e.payload));
}
