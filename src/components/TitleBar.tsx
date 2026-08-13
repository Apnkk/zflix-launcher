import { getCurrentWindow } from '@tauri-apps/api/window';

export function TitleBar() {
  const win = getCurrentWindow();
  return (
    <div className="titlebar" data-tauri-drag-region>
      <div className="titlebar-controls">
        <button
          className="tb-btn"
          aria-label="Réduire"
          onClick={() => void win.minimize()}
        >
          <svg width="12" height="12" viewBox="0 0 12 12">
            <rect x="1" y="5.5" width="10" height="1" fill="currentColor" />
          </svg>
        </button>
        <button
          className="tb-btn tb-close"
          aria-label="Fermer"
          onClick={() => void win.close()}
        >
          <svg width="12" height="12" viewBox="0 0 12 12">
            <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
