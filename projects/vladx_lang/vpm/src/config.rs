use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct Config {
    pub registry: String,
    pub token: Option<String>,
    pub utente: Option<String>,
}

pub fn config_path() -> PathBuf {
    dirs::home_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join(".vpm")
        .join("config.json")
}

pub fn carica() -> Config {
    let path = config_path();
    if path.exists() {
        let s = fs::read_to_string(&path).unwrap_or_default();
        serde_json::from_str(&s).unwrap_or_else(|_| Config {
            registry: "https://registry.vladx.dev".to_string(),
            ..Default::default()
        })
    } else {
        Config {
            registry: "https://registry.vladx.dev".to_string(),
            ..Default::default()
        }
    }
}

pub fn salva(config: &Config) {
    let path = config_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).ok();
    }
    let s = serde_json::to_string_pretty(config).unwrap();
    fs::write(&path, s).unwrap_or_else(|e| eprintln!("Errore salvataggio config: {e}"));
}
