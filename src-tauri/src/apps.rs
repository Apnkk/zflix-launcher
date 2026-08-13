use std::collections::HashMap;
use std::io::Write;
use std::path::PathBuf;
use std::time::Instant;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager};

const EMBEDDED_MANIFEST: &str = include_str!("../manifest.json");
/// Optional remote override so new apps can be added without shipping a new launcher.
const REMOTE_MANIFEST_URL: Option<&str> = None;

// ---------- Types ----------

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AppDef {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub eyebrow: String,
    #[serde(default)]
    pub tagline: String,
    #[serde(default)]
    pub repo: Option<String>,
    #[serde(default)]
    pub setup_asset: Option<String>,
    #[serde(default)]
    pub exe_name: Option<String>,
    #[serde(default)]
    pub dir_name: Option<String>,
    #[serde(default)]
    pub accent: Option<String>,
    #[serde(default)]
    pub coming_soon: bool,
    #[serde(default)]
    pub placeholder: bool,
}

#[derive(Deserialize)]
struct Manifest {
    apps: Vec<AppDef>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct InstalledApp {
    pub version: String,
    pub exe_path: String,
    pub install_dir: String,
}

#[derive(Serialize, Deserialize, Default)]
struct InstalledRegistry {
    apps: HashMap<String, InstalledApp>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ReleaseInfo {
    pub version: String,
    pub notes: String,
    pub published_at: String,
    pub asset_name: String,
    pub asset_url: String,
    pub asset_size: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppState {
    #[serde(flatten)]
    pub def: AppDef,
    pub installed: Option<InstalledApp>,
    pub latest: Option<ReleaseInfo>,
    pub error: Option<String>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ProgressPayload {
    app_id: String,
    phase: String,
    received: u64,
    total: u64,
    bytes_per_sec: u64,
}

// ---------- Helpers ----------

fn http_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .user_agent("zflix-launcher")
        .build()
        .map_err(|e| e.to_string())
}

async fn load_manifest() -> Vec<AppDef> {
    if let Some(url) = REMOTE_MANIFEST_URL {
        if let Ok(client) = http_client() {
            if let Ok(resp) = client
                .get(url)
                .timeout(std::time::Duration::from_secs(5))
                .send()
                .await
            {
                if let Ok(m) = resp.json::<Manifest>().await {
                    return m.apps;
                }
            }
        }
    }
    serde_json::from_str::<Manifest>(EMBEDDED_MANIFEST)
        .expect("embedded manifest invalid")
        .apps
}

fn registry_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("installed.json"))
}

fn read_registry(app: &AppHandle) -> Result<InstalledRegistry, String> {
    let path = registry_path(app)?;
    if !path.exists() {
        return Ok(InstalledRegistry::default());
    }
    let raw = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    Ok(serde_json::from_str(&raw).unwrap_or_default())
}

fn write_registry(app: &AppHandle, reg: &InstalledRegistry) -> Result<(), String> {
    let path = registry_path(app)?;
    let raw = serde_json::to_string_pretty(reg).map_err(|e| e.to_string())?;
    std::fs::write(&path, raw).map_err(|e| e.to_string())
}

async fn fetch_latest_release(def: &AppDef) -> Result<ReleaseInfo, String> {
    let repo = def.repo.as_deref().ok_or("pas de repo configuré")?;
    let url = format!("https://api.github.com/repos/{repo}/releases/latest");
    let client = http_client()?;
    let resp = client
        .get(&url)
        .header("Accept", "application/vnd.github+json")
        .timeout(std::time::Duration::from_secs(10))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !resp.status().is_success() {
        return Err(format!("GitHub {}", resp.status()));
    }
    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;

    let tag = json["tag_name"].as_str().unwrap_or("");
    let version = tag.trim_start_matches('v').to_string();
    let notes = json["body"].as_str().unwrap_or("").to_string();
    let published_at = json["published_at"].as_str().unwrap_or("").to_string();

    let assets = json["assets"].as_array().cloned().unwrap_or_default();
    let wanted = def.setup_asset.as_deref().unwrap_or("Setup");
    let pick = assets
        .iter()
        .find(|a| {
            let name = a["name"].as_str().unwrap_or("");
            name.ends_with(".exe") && name.contains(wanted)
        })
        .or_else(|| {
            assets
                .iter()
                .find(|a| a["name"].as_str().unwrap_or("").ends_with(".exe"))
        })
        .ok_or("aucun installeur .exe dans la release")?;

    Ok(ReleaseInfo {
        version,
        notes,
        published_at,
        asset_name: pick["name"].as_str().unwrap_or("setup.exe").to_string(),
        asset_url: pick["browser_download_url"]
            .as_str()
            .ok_or("asset sans URL")?
            .to_string(),
        asset_size: pick["size"].as_u64().unwrap_or(0),
    })
}

/// electron-builder per-user NSIS installs under %LocalAppData%\Programs\<dir>.
fn locate_installed_exe(def: &AppDef) -> Option<(PathBuf, PathBuf)> {
    let programs = dirs_programs_dir()?;
    let exe_name = def.exe_name.as_deref()?;

    let mut candidates: Vec<PathBuf> = Vec::new();
    if let Some(dir_name) = def.dir_name.as_deref() {
        candidates.push(programs.join(dir_name));
    }
    if let Ok(entries) = std::fs::read_dir(&programs) {
        for entry in entries.flatten() {
            let p = entry.path();
            if p.is_dir() {
                candidates.push(p);
            }
        }
    }
    for dir in candidates {
        let exe = dir.join(exe_name);
        if exe.exists() {
            return Some((dir, exe));
        }
    }
    None
}

fn dirs_programs_dir() -> Option<PathBuf> {
    std::env::var("LOCALAPPDATA")
        .ok()
        .map(|p| PathBuf::from(p).join("Programs"))
}

fn emit_progress(app: &AppHandle, payload: ProgressPayload) {
    let _ = app.emit("install-progress", payload);
}

// ---------- Commands ----------

#[tauri::command]
pub async fn get_apps_state(app: AppHandle) -> Result<Vec<AppState>, String> {
    let defs = load_manifest().await;
    let registry = read_registry(&app)?;

    let mut states = Vec::with_capacity(defs.len());
    for def in defs {
        if def.placeholder {
            states.push(AppState {
                def,
                installed: None,
                latest: None,
                error: None,
            });
            continue;
        }
        let mut installed = registry.apps.get(&def.id).cloned();
        // Drop stale registry entries if the app was removed manually.
        if let Some(inst) = &installed {
            if !PathBuf::from(&inst.exe_path).exists() {
                installed = None;
            }
        }
        let (latest, error) = if def.repo.is_some() {
            match fetch_latest_release(&def).await {
                Ok(r) => (Some(r), None),
                Err(e) => (None, Some(e)),
            }
        } else {
            (None, None)
        };
        states.push(AppState {
            def,
            installed,
            latest,
            error,
        });
    }
    Ok(states)
}

#[tauri::command]
pub async fn download_and_install(app: AppHandle, app_id: String) -> Result<InstalledApp, String> {
    let defs = load_manifest().await;
    let def = defs
        .into_iter()
        .find(|d| d.id == app_id)
        .ok_or("app inconnue")?;
    let release = fetch_latest_release(&def).await?;

    // 1. Download with progress events
    let client = http_client()?;
    let resp = client
        .get(&release.asset_url)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !resp.status().is_success() {
        return Err(format!("téléchargement échoué: {}", resp.status()));
    }
    let total = resp.content_length().unwrap_or(release.asset_size);
    let tmp_path = std::env::temp_dir().join(format!("zflix-launcher-{}", release.asset_name));
    let mut file = std::fs::File::create(&tmp_path).map_err(|e| e.to_string())?;

    let mut received: u64 = 0;
    let mut last_emit = Instant::now();
    let mut last_bytes: u64 = 0;
    let mut stream = resp.bytes_stream();
    use futures_util::StreamExt;
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| e.to_string())?;
        file.write_all(&chunk).map_err(|e| e.to_string())?;
        received += chunk.len() as u64;
        let elapsed = last_emit.elapsed();
        if elapsed.as_millis() >= 150 {
            let bps = ((received - last_bytes) as f64 / elapsed.as_secs_f64()) as u64;
            emit_progress(
                &app,
                ProgressPayload {
                    app_id: app_id.clone(),
                    phase: "download".into(),
                    received,
                    total,
                    bytes_per_sec: bps,
                },
            );
            last_emit = Instant::now();
            last_bytes = received;
        }
    }
    drop(file);

    // 2. Silent NSIS install
    emit_progress(
        &app,
        ProgressPayload {
            app_id: app_id.clone(),
            phase: "install".into(),
            received: total,
            total,
            bytes_per_sec: 0,
        },
    );
    let status = run_silent_installer(&tmp_path)?;
    let _ = std::fs::remove_file(&tmp_path);
    if !status.success() {
        return Err(format!(
            "installeur terminé avec le code {}",
            status.code().unwrap_or(-1)
        ));
    }

    // 3. Locate installed exe and persist version
    let (install_dir, exe_path) =
        locate_installed_exe(&def).ok_or("installé, mais exécutable introuvable")?;
    let installed = InstalledApp {
        version: release.version.clone(),
        exe_path: exe_path.to_string_lossy().to_string(),
        install_dir: install_dir.to_string_lossy().to_string(),
    };
    let mut registry = read_registry(&app)?;
    registry.apps.insert(app_id.clone(), installed.clone());
    write_registry(&app, &registry)?;

    emit_progress(
        &app,
        ProgressPayload {
            app_id,
            phase: "done".into(),
            received: total,
            total,
            bytes_per_sec: 0,
        },
    );
    Ok(installed)
}

fn run_silent_installer(path: &PathBuf) -> Result<std::process::ExitStatus, String> {
    let mut cmd = std::process::Command::new(path);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.raw_arg("/S");
    }
    #[cfg(not(windows))]
    {
        cmd.arg("/S");
    }
    let mut child = cmd.spawn().map_err(|e| e.to_string())?;
    child.wait().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn launch_app(app: AppHandle, app_id: String) -> Result<(), String> {
    let registry = read_registry(&app)?;
    let installed = registry.apps.get(&app_id).ok_or("app non installée")?;
    let exe = PathBuf::from(&installed.exe_path);
    if !exe.exists() {
        return Err("exécutable introuvable — réinstalle l'application".into());
    }
    std::process::Command::new(&exe)
        .current_dir(&installed.install_dir)
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn uninstall_app(app: AppHandle, app_id: String) -> Result<(), String> {
    let registry = read_registry(&app)?;
    let installed = registry
        .apps
        .get(&app_id)
        .cloned()
        .ok_or("app non installée")?;

    let dir = PathBuf::from(&installed.install_dir);
    let uninstaller = std::fs::read_dir(&dir)
        .map_err(|e| e.to_string())?
        .flatten()
        .map(|e| e.path())
        .find(|p| {
            p.file_name()
                .and_then(|n| n.to_str())
                .map(|n| n.to_lowercase().starts_with("uninstall") && n.ends_with(".exe"))
                .unwrap_or(false)
        });

    if let Some(uninstaller) = uninstaller {
        let status = run_silent_installer(&uninstaller)?;
        if !status.success() {
            return Err(format!(
                "désinstalleur terminé avec le code {}",
                status.code().unwrap_or(-1)
            ));
        }
    } else {
        // No NSIS uninstaller found: remove the folder directly.
        std::fs::remove_dir_all(&dir).map_err(|e| e.to_string())?;
    }

    let mut registry = read_registry(&app)?;
    registry.apps.remove(&app_id);
    write_registry(&app, &registry)?;
    Ok(())
}
