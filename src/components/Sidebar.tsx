import type { AppState } from '../types';

interface Props {
  apps: AppState[];
  activeId: string;
  onSelect: (id: string) => void;
  onSettings: () => void;
}

function AppIcon({ app, active }: { app: AppState; active: boolean }) {
  const accent = app.accent || '#555';
  if (app.placeholder) {
    return (
      <div className="rail-icon rail-placeholder">
        <span>?</span>
      </div>
    );
  }
  return (
    <div
      className={`rail-icon ${active ? 'rail-active' : ''}`}
      style={
        active
          ? { boxShadow: `0 0 0 2px ${accent}, 0 4px 18px ${accent}66` }
          : undefined
      }
    >
      <span
        className="rail-letter"
        style={{ background: `linear-gradient(135deg, ${accent}, ${accent}88)` }}
      >
        {app.id === 'anime' ? 'ア' : 'Z'}
      </span>
    </div>
  );
}

export function Sidebar({ apps, activeId, onSelect, onSettings }: Props) {
  return (
    <aside className="rail">
      <div className="rail-brand">
        <span>Z</span>
      </div>
      <div className="rail-apps">
        {apps.map((app) => (
          <button
            key={app.id}
            className="rail-item"
            disabled={app.placeholder}
            onClick={() => onSelect(app.id)}
            title={app.placeholder ? 'Bientôt' : app.name}
          >
            <AppIcon app={app} active={app.id === activeId} />
            {(app.comingSoon || app.placeholder) && (
              <span className="rail-soon">BIENTÔT</span>
            )}
          </button>
        ))}
      </div>
      <div className="rail-bottom">
        <div className="rail-avatar" title="Profil">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4 0-8 2-8 5v2h16v-2c0-3-4-5-8-5Z" />
          </svg>
        </div>
        <button className="rail-settings" onClick={onSettings} title="Paramètres">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.4 13a7.6 7.6 0 0 0 .1-1 7.6 7.6 0 0 0-.1-1l2.1-1.6a.5.5 0 0 0 .1-.7l-2-3.4a.5.5 0 0 0-.6-.2l-2.5 1a7.6 7.6 0 0 0-1.7-1l-.4-2.6a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 0-.5.5l-.4 2.6a7.6 7.6 0 0 0-1.7 1l-2.5-1a.5.5 0 0 0-.6.2l-2 3.4a.5.5 0 0 0 .1.7L4.5 11a7.6 7.6 0 0 0-.1 1 7.6 7.6 0 0 0 .1 1l-2.1 1.6a.5.5 0 0 0-.1.7l2 3.4a.5.5 0 0 0 .6.2l2.5-1a7.6 7.6 0 0 0 1.7 1l.4 2.6a.5.5 0 0 0 .5.5h4a.5.5 0 0 0 .5-.5l.4-2.6a7.6 7.6 0 0 0 1.7-1l2.5 1a.5.5 0 0 0 .6-.2l2-3.4a.5.5 0 0 0-.1-.7ZM12 15.5A3.5 3.5 0 1 1 15.5 12 3.5 3.5 0 0 1 12 15.5Z" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
