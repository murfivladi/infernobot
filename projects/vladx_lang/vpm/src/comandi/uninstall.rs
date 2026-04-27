use colored::*;
use std::fs;
use crate::manifest;

pub fn esegui(pacchetto: &str) {
    let dir = format!("vladx_modules/{pacchetto}");
    if fs::remove_dir_all(&dir).is_ok() {
        println!("{} {} rimosso da vladx_modules", "✓".green().bold(), pacchetto.cyan());
    } else {
        println!("{} Pacchetto '{}' non trovato in vladx_modules", "⚠".yellow(), pacchetto);
    }

    // rimuovi da vladx.json
    if let Ok(mut m) = manifest::carica() {
        if m.dipendenze.remove(pacchetto).is_some() {
            manifest::salva(&m).ok();
            println!("{} Rimosso da vladx.json", "✓".green());
        }
    }
}
