import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { getVersion } from '@tauri-apps/api/app';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

interface Props {
  onClose: () => void;
}

export function SettingsModal({ onClose }: Props) {
  const [version, setVersion] = useState('');
  const [updateMsg, setUpdateMsg] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    void getVersion().then(setVersion);
  }, []);

  const checkUpdate = async () => {
    setChecking(true);
    setUpdateMsg(null);
    try {
      const update = await check();
      if (update) {
        setUpdateMsg(`Mise à jour ${update.version} trouvée, téléchargement…`);
        await update.downloadAndInstall();
        await relaunch();
      } else {
        setUpdateMsg('Le launcher est à jour.');
      }
    } catch (e) {
      setUpdateMsg(`Vérification impossible : ${String(e)}`);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <motion.div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.18 }}
      >
        <h2>Paramètres</h2>
        <div className="settings-row">
          <span>Version du launcher</span>
          <strong>{version || '…'}</strong>
        </div>
        <div className="settings-row">
          <span>Mises à jour du launcher</span>
          <button className="btn-ghost" disabled={checking} onClick={() => void checkUpdate()}>
            {checking ? 'Vérification…' : 'Vérifier'}
          </button>
        </div>
        {updateMsg && <p className="settings-msg">{updateMsg}</p>}
        <button className="btn-ghost modal-close" onClick={onClose}>
          Fermer
        </button>
      </motion.div>
    </div>
  );
}
