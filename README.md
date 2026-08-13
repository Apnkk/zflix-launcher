# Z-Flix Launcher

Launcher desktop style HoYoPlay pour les applications Z-Flix (Movies, Animes). Construit avec Tauri 2 (Rust) + React + TypeScript.

## Fonctionnalités

- Installation, mise à jour et lancement des apps Z-Flix depuis leurs GitHub Releases.
- Téléchargement avec progression (vitesse, %) et installation NSIS silencieuse (`/S`).
- Notes de version (markdown des releases GitHub) dans l'onglet dédié.
- Self-update du launcher via `tauri-plugin-updater`.
- Slots « BIENTÔT » pour les apps à venir.

## Développement

```bash
npm install
npm run tauri dev
```

Prérequis : Rust (toolchain MSVC), Node 20+, WebView2 (préinstallé sur Windows 11).

## Build

```powershell
$env:TAURI_SIGNING_PRIVATE_KEY_PATH = "$env:USERPROFILE\.tauri\zflix-launcher.key"
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = "<mot de passe de la clé>"
npm run tauri build
```

Sorties dans `src-tauri/target/release/bundle/nsis/` :

- `Z-Flix Launcher_X.Y.Z_x64-setup.exe` — installeur NSIS
- `*-setup.exe.sig` + `latest.json` — artefacts updater (à joindre à la release GitHub)

## Clé de signature updater

- Privée : `%USERPROFILE%\.tauri\zflix-launcher.key`, protégée par mot de passe (ne jamais commiter, ne jamais perdre — sinon les mises à jour automatiques cassent).
- Publique : intégrée dans `src-tauri/tauri.conf.json` (`plugins.updater.pubkey`).

## Publier une mise à jour du launcher

1. Bump `version` dans `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml` et `package.json`.
2. `npm run tauri build` (avec la clé de signature).
3. Créer une release GitHub sur `Apnkk/zflix-launcher` avec le setup `.exe`, le `.sig` et `latest.json`.
4. Les launchers installés se mettent à jour via `https://github.com/Apnkk/zflix-launcher/releases/latest/download/latest.json`.

## Ajouter / modifier une app gérée

Éditer `src-tauri/manifest.json` :

```json
{
  "id": "anime",
  "name": "Z-Flix Animes",
  "repo": "Apnkk/z-flix-anime",
  "setupAsset": "Setup",
  "exeName": "Z-FLIX-ANIME.exe",
  "dirName": "Z-FLIX-ANIME",
  "accent": "#ff5c1a",
  "comingSoon": true
}
```

- `setupAsset` : sous-chaîne pour repérer l'installeur `.exe` dans la release.
- `exeName` / `dirName` : exécutable et dossier attendus sous `%LocalAppData%\Programs` (installeurs electron-builder per-user).
- `comingSoon: true` : affiché « BIENTÔT », installation désactivée.
- Une constante `REMOTE_MANIFEST_URL` dans `src-tauri/src/apps.rs` permet plus tard de servir ce manifest à distance sans re-livrer le launcher.

Retirer `comingSoon` d'Animes dès que le build séparé `z-flix-anime` publie sa première release.
