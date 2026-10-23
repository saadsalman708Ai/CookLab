use serde::{Deserialize, Serialize};
use std::fs::{self, OpenOptions};
use std::io::{self, Write};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use tauri::{AppHandle, Manager};

const SETTINGS_FILE: &str = "asset-folders.json";
static TEMP_FILE_SEQUENCE: AtomicU64 = AtomicU64::new(0);

#[derive(Clone, Debug, Default, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AssetFolderSettings {
    pub footage: String,
    pub images: String,
    pub fonts: String,
    pub captions: String,
    pub music: String,
    pub overlay_templates: String,
    pub overlay_sfx: String,
    pub themes: String,
}

fn settings_path(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_config_dir()
        .map(|directory| directory.join(SETTINGS_FILE))
        .map_err(|error| format!("Could not locate CookLab's configuration directory: {error}"))
}

fn read_settings(path: &Path) -> Result<AssetFolderSettings, String> {
    match fs::read_to_string(path) {
        Ok(contents) => serde_json::from_str(&contents)
            .map_err(|error| format!("Asset folder settings are invalid: {error}")),
        Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(AssetFolderSettings::default()),
        Err(error) => Err(format!("Could not read asset folder settings: {error}")),
    }
}

fn temporary_path(path: &Path) -> PathBuf {
    let sequence = TEMP_FILE_SEQUENCE.fetch_add(1, Ordering::Relaxed);
    path.with_file_name(format!(
        "{SETTINGS_FILE}.{}.{}.tmp",
        std::process::id(),
        sequence
    ))
}

#[cfg(windows)]
fn replace_settings_file(source: &Path, destination: &Path) -> io::Result<()> {
    use std::os::windows::ffi::OsStrExt;

    #[link(name = "Kernel32")]
    unsafe extern "system" {
        fn MoveFileExW(existing_name: *const u16, new_name: *const u16, flags: u32) -> i32;
    }

    const MOVEFILE_REPLACE_EXISTING: u32 = 0x1;
    const MOVEFILE_WRITE_THROUGH: u32 = 0x8;
    let source: Vec<u16> = source.as_os_str().encode_wide().chain(Some(0)).collect();
    let destination: Vec<u16> = destination
        .as_os_str()
        .encode_wide()
        .chain(Some(0))
        .collect();

    // The temporary file is in the same directory, so the replacement stays on one volume.
    let succeeded = unsafe {
        MoveFileExW(
            source.as_ptr(),
            destination.as_ptr(),
            MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH,
        )
    };
    if succeeded == 0 {
        Err(io::Error::last_os_error())
    } else {
        Ok(())
    }
}

#[cfg(not(windows))]
fn replace_settings_file(source: &Path, destination: &Path) -> io::Result<()> {
    fs::rename(source, destination)
}

fn write_settings(path: &Path, settings: &AssetFolderSettings) -> Result<(), String> {
    let parent = path
        .parent()
        .ok_or_else(|| "Could not determine the settings directory.".to_string())?;
    fs::create_dir_all(parent)
        .map_err(|error| format!("Could not create CookLab's configuration directory: {error}"))?;

    let contents = serde_json::to_vec_pretty(settings)
        .map_err(|error| format!("Could not encode asset folder settings: {error}"))?;
    let temporary = temporary_path(path);
    let mut file = OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&temporary)
        .map_err(|error| format!("Could not create a temporary settings file: {error}"))?;
    if let Err(error) = file.write_all(&contents).and_then(|()| file.sync_all()) {
        drop(file);
        let _ = fs::remove_file(&temporary);
        return Err(format!(
            "Could not write asset folder settings safely: {error}"
        ));
    }
    drop(file);

    if let Err(error) = replace_settings_file(&temporary, path) {
        let _ = fs::remove_file(&temporary);
        return Err(format!(
            "Could not replace saved asset folder settings: {error}"
        ));
    }

    Ok(())
}

#[tauri::command]
pub fn load_asset_folder_settings(app: AppHandle) -> Result<AssetFolderSettings, String> {
    let path = settings_path(&app)?;
    fs::create_dir_all(
        path.parent()
            .ok_or_else(|| "Could not determine the settings directory.".to_string())?,
    )
    .map_err(|error| format!("Could not create CookLab's configuration directory: {error}"))?;
    read_settings(&path)
}

#[tauri::command]
pub fn save_asset_folder_settings(
    app: AppHandle,
    settings: AssetFolderSettings,
) -> Result<AssetFolderSettings, String> {
    let path = settings_path(&app)?;
    write_settings(&path, &settings)?;
    Ok(settings)
}

#[cfg(test)]
mod tests {
    use super::{AssetFolderSettings, read_settings, write_settings};
    use std::fs;
    use std::path::PathBuf;
    use std::sync::atomic::{AtomicU64, Ordering};

    static TEST_SEQUENCE: AtomicU64 = AtomicU64::new(0);

    fn test_settings_path() -> PathBuf {
        let sequence = TEST_SEQUENCE.fetch_add(1, Ordering::Relaxed);
        std::env::temp_dir().join(format!(
            "cooklab-settings-test-{}-{sequence}.json",
            std::process::id()
        ))
    }

    #[test]
    fn missing_file_uses_empty_defaults() {
        let path = test_settings_path();
        assert_eq!(
            read_settings(&path).unwrap(),
            AssetFolderSettings::default()
        );
    }

    #[test]
    fn save_and_load_preserve_all_categories() {
        let path = test_settings_path();
        let settings = AssetFolderSettings {
            footage: "C:\\media\\footage".into(),
            images: "C:\\media\\images".into(),
            fonts: "C:\\media\\fonts".into(),
            captions: "C:\\media\\captions".into(),
            music: "C:\\media\\music".into(),
            overlay_templates: "C:\\media\\overlay".into(),
            overlay_sfx: "C:\\media\\sfx".into(),
            themes: "C:\\media\\themes".into(),
        };

        write_settings(&path, &settings).unwrap();
        assert_eq!(read_settings(&path).unwrap(), settings);
        fs::remove_file(path).unwrap();
    }

    #[test]
    fn malformed_or_incomplete_json_is_rejected() {
        let path = test_settings_path();
        fs::write(&path, r#"{"footage": 4}"#).unwrap();
        assert!(read_settings(&path).is_err());
        fs::remove_file(path).unwrap();
    }
}
