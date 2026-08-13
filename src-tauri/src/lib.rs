mod apps;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            apps::get_apps_state,
            apps::download_and_install,
            apps::launch_app,
            apps::uninstall_app,
            apps::open_install_dir
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
