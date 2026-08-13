import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppState, InstallProgress } from './types';
import { appAction } from './types';
import { downloadAndInstall, getAppsState, launchApp, onInstallProgress, uninstallApp } from './api';
import { Sidebar } from './components/Sidebar';
import { Hero } from './components/Hero';
import { TitleBar } from './components/TitleBar';
import { SettingsModal } from './components/SettingsModal';
import './App.css';

export default function App() {
  const [apps, setApps] = useState<AppState[]>([]);
  const [activeId, setActiveId] = useState<string>('movies');
  const [tab, setTab] = useState<'overview' | 'notes'>('overview');
  const [progress, setProgress] = useState<Record<string, InstallProgress | null>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 5000);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const state = await getAppsState();
      setApps(state);
      setActiveId((cur) => (state.some((a) => a.id === cur) ? cur : state[0]?.id ?? ''));
    } catch (e) {
      showToast(`Chargement impossible : ${String(e)}`);
    }
  }, [showToast]);

  useEffect(() => {
    void refresh();
    const unlisten = onInstallProgress((p) => {
      setProgress((prev) => ({ ...prev, [p.appId]: p.phase === 'done' ? null : p }));
    });
    return () => {
      void unlisten.then((fn) => fn());
    };
  }, [refresh]);

  const active = apps.find((a) => a.id === activeId) ?? null;

  const handlePrimary = useCallback(async () => {
    if (!active) return;
    const action = appAction(active);
    if (action === 'soon') return;
    setBusy((b) => ({ ...b, [active.id]: true }));
    try {
      if (action === 'launch') {
        await launchApp(active.id);
      } else {
        await downloadAndInstall(active.id);
        await refresh();
      }
    } catch (e) {
      showToast(String(e));
      setProgress((prev) => ({ ...prev, [active.id]: null }));
    } finally {
      setBusy((b) => ({ ...b, [active.id]: false }));
    }
  }, [active, refresh, showToast]);

  const handleUninstall = useCallback(async () => {
    if (!active?.installed) return;
    if (!window.confirm(`Désinstaller ${active.name} ?`)) return;
    setBusy((b) => ({ ...b, [active.id]: true }));
    try {
      await uninstallApp(active.id);
      await refresh();
      showToast(`${active.name} désinstallé.`);
    } catch (e) {
      showToast(String(e));
    } finally {
      setBusy((b) => ({ ...b, [active.id]: false }));
    }
  }, [active, refresh, showToast]);

  return (
    <div className="shell">
      <TitleBar />
      <Sidebar
        apps={apps}
        activeId={activeId}
        onSelect={(id) => {
          setActiveId(id);
          setTab('overview');
        }}
        onSettings={() => setSettingsOpen(true)}
      />
      {active ? (
        <Hero
          app={active}
          tab={tab}
          onTab={setTab}
          progress={progress[active.id] ?? null}
          busy={busy[active.id] ?? false}
          onPrimary={() => void handlePrimary()}
          onUninstall={() => void handleUninstall()}
        />
      ) : (
        <main className="hero hero-loading">
          <img className="loading-mark" src="/logo.png" alt="Z-Flix" draggable={false} />
        </main>
      )}
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
