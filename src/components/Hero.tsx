import { AnimatePresence, motion } from 'framer-motion';
import type { AppState, InstallProgress } from '../types';
import { appAction, formatBytes } from '../types';
import { Markdown } from '../markdown';

interface Props {
  app: AppState;
  tab: 'overview' | 'notes';
  onTab: (t: 'overview' | 'notes') => void;
  progress: InstallProgress | null;
  busy: boolean;
  onPrimary: () => void;
  onUninstall: () => void;
}

const ACTION_LABEL: Record<string, string> = {
  install: 'INSTALLER',
  update: 'METTRE À JOUR',
  launch: 'LANCER',
  soon: 'BIENTÔT',
};

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5.14v13.72a1 1 0 0 0 1.52.85l11-6.86a1 1 0 0 0 0-1.7l-11-6.86A1 1 0 0 0 8 5.14Z" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3a1 1 0 0 1 1 1v9.59l3.3-3.3a1 1 0 1 1 1.4 1.42l-5 5a1 1 0 0 1-1.4 0l-5-5a1 1 0 1 1 1.4-1.42l3.3 3.3V4a1 1 0 0 1 1-1Zm-7 15a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H6a1 1 0 0 1-1-1Z" />
    </svg>
  );
}

function ProgressButton({ app, progress }: { app: AppState; progress: InstallProgress }) {
  const pct = progress.total > 0 ? Math.min(100, (progress.received / progress.total) * 100) : 0;
  const label =
    progress.phase === 'install'
      ? 'Installation…'
      : `${pct.toFixed(0)} %  ·  ${formatBytes(progress.bytesPerSec)}/s`;
  return (
    <div className="btn-primary btn-progress" style={{ ['--accent' as string]: app.accent || '#e50914' }}>
      <div className="btn-progress-fill" style={{ width: `${progress.phase === 'install' ? 100 : pct}%` }} />
      <span className="btn-progress-label">{label}</span>
    </div>
  );
}

export function Hero({ app, tab, onTab, progress, busy, onPrimary, onUninstall }: Props) {
  const action = appAction(app);
  const accent = app.accent || '#e50914';
  const installing = progress !== null && progress.phase !== 'done' && progress.phase !== 'error';

  return (
    <main className={`hero hero-${app.id}`}>
      <div className="hero-art" aria-hidden />
      <div className="hero-shade" aria-hidden />

      <nav className="hero-tabs" data-tauri-drag-region>
        <div className="tabs-pill">
          <button className={tab === 'overview' ? 'tab tab-on' : 'tab'} onClick={() => onTab('overview')}>
            Aperçu
          </button>
          <button className={tab === 'notes' ? 'tab tab-on' : 'tab'} onClick={() => onTab('notes')}>
            Notes de version
          </button>
        </div>
      </nav>

      <AnimatePresence mode="wait">
        {tab === 'overview' ? (
          <motion.section
            key={`ov-${app.id}`}
            className="hero-content"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            <div className="hero-id">
              <div
                className="hero-mark"
                style={{
                  background:
                    app.id === 'anime'
                      ? `linear-gradient(135deg, ${accent}, ${accent}66)`
                      : 'rgba(255,255,255,0.06)',
                }}
              >
                {app.id === 'anime' ? (
                  'ア'
                ) : (
                  <img src="/logo.png" alt="" draggable={false} />
                )}
              </div>
              <div>
                {app.eyebrow && (
                  <div className="hero-eyebrow" style={{ color: accent }}>
                    {app.eyebrow}
                  </div>
                )}
                <h1 className="hero-title">{app.name}</h1>
              </div>
            </div>

            <p className="hero-tagline">{app.tagline}</p>

            <div className="hero-actions">
              {installing && progress ? (
                <ProgressButton app={app} progress={progress} />
              ) : (
                <button
                  className="btn-primary"
                  style={{ ['--accent' as string]: accent }}
                  disabled={action === 'soon' || busy}
                  onClick={onPrimary}
                >
                  {action === 'launch' ? <PlayIcon /> : action === 'soon' ? null : <DownloadIcon />}
                  {ACTION_LABEL[action]}
                </button>
              )}
              {app.installed && !installing && (
                <button className="btn-icon" title="Désinstaller" disabled={busy} onClick={onUninstall}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 3a1 1 0 0 0-1 1v1H4a1 1 0 0 0 0 2h16a1 1 0 1 0 0-2h-4V4a1 1 0 0 0-1-1H9Zm-3 6h12l-.9 11.1A2 2 0 0 1 15.1 22H8.9a2 2 0 0 1-2-1.9L6 9Z" />
                  </svg>
                </button>
              )}
            </div>

            <div className="hero-meta">
              <span className="platforms">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-label="Windows">
                  <path d="M3 5.5 10.5 4.4v7.1H3V5.5ZM3 18.5v-6h7.5v7.1L3 18.5ZM11.5 4.2 21 3v8.5h-9.5V4.2ZM21 12.5V21l-9.5-1.2v-7.3H21Z" />
                </svg>
              </span>
              {app.installed ? (
                <span>
                  Version {app.installed.version}
                  {app.latest && appAction(app) === 'update' ? (
                    <em> — {app.latest.version} disponible</em>
                  ) : (
                    <em> — à jour</em>
                  )}
                </span>
              ) : app.latest ? (
                <span>
                  Version {app.latest.version}
                  {app.latest.assetSize > 0 && <em> — {formatBytes(app.latest.assetSize)}</em>}
                </span>
              ) : (
                <span>{app.comingSoon ? 'Disponible prochainement' : app.error ? 'Version indisponible' : '…'}</span>
              )}
            </div>
          </motion.section>
        ) : (
          <motion.section
            key={`notes-${app.id}`}
            className="notes-panel"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            <div className="notes-card">
              {app.latest ? (
                <>
                  <div className="notes-head">
                    <h2>Version {app.latest.version}</h2>
                    {app.latest.publishedAt && (
                      <span>
                        {new Date(app.latest.publishedAt).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </span>
                    )}
                  </div>
                  <div className="notes-body">
                    {app.latest.notes.trim() ? (
                      <Markdown source={app.latest.notes} />
                    ) : (
                      <p>Pas de notes pour cette version.</p>
                    )}
                  </div>
                </>
              ) : (
                <p className="notes-empty">
                  {app.comingSoon ? 'Disponible prochainement.' : 'Aucune release trouvée.'}
                </p>
              )}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <footer className="hero-footer" data-tauri-drag-region>
        <span>Z-FLIX</span>
      </footer>
    </main>
  );
}
