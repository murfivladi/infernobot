use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct Manifest {
    pub nome: String,
    pub versione: String,
    pub descrizione: Option<String>,
    pub autore: Option<String>,
    pub licenza: Option<String>,
    pub principale: Option<String>,
    #[serde(default)]
    pub dipendenze: HashMap<String, String>,
    #[serde(default)]
    pub script: HashMap<String, String>,
}

pub fn manifest_path() -> PathBuf {
    PathBuf::from("vladx.json")
}

pub fn carica() -> Result<Manifest, String> {
    let path = manifest_path();
    if !path.exists() {
        return Err("vladx.json non trovato. Esegui 'vpm init' prima.".to_string());
    }
    let s = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&s).map_err(|e| format!("vladx.json non valido: {e}"))
}

pub fn salva(manifest: &Manifest) -> Result<(), String> {
    let s = serde_json::to_string_pretty(manifest).map_err(|e| e.to_string())?;
    fs::write(manifest_path(), s).map_err(|e| e.to_string())
}
