import { useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';

export function TitleBar() {
  const win = getCurrentWindow();
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void win.isMaximized().then(setMaximized);
    void win.onResized(() => {
      void win.isMaximized().then(setMaximized);
    }).then((fn) => {
      unlisten = fn;
    });
    return () => unlisten?.();
  }, [win]);

  const toggleMaximize = () => {
    void win.toggleMaximize().then(() => win.isMaximized().then(setMaximized));
  };

  return (
    <div className="titlebar" data-tauri-drag-region onDoubleClick={toggleMaximize}>
      <div className="titlebar-controls">
        <button className="tb-btn" aria-label="Réduire" onClick={() => void win.minimize()}>
          <svg width="12" height="12" viewBox="0 0 12 12">
            <rect x="1" y="5.5" width="10" height="1" fill="currentColor" />
          </svg>
        </button>
        <button className="tb-btn" aria-label={maximized ? 'Restaurer' : 'Agrandir'} onClick={toggleMaximize}>
          {maximized ? (
            <svg width="12" height="12" viewBox="0 0 12 12">
              <path
                d="M3.5 4.5h5v5h-5zM4.5 3.5h5.5v5.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.1"
              />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 12 12">
              <rect x="2" y="2" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1.1" />
            </svg>
          )}
        </button>
        <button className="tb-btn tb-close" aria-label="Fermer" onClick={() => void win.close()}>
          <svg width="12" height="12" viewBox="0 0 12 12">
            <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
