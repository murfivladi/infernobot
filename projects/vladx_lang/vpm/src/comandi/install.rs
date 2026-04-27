use colored::*;
use std::fs;
use crate::{config, manifest, registry::RegistryClient};

pub fn esegui(pacchetto: Option<String>) {
    let cfg = config::carica();
    let client = RegistryClient::nuovo(cfg.registry.clone(), cfg.token.clone());

    match pacchetto {
        None => {
            // installa tutte le dipendenze da vladx.json
            match manifest::carica() {
                Err(e) => { eprintln!("{} {}", "✗".red(), e); return; }
                Ok(m) => {
                    if m.dipendenze.is_empty() {
                        println!("{}", "Nessuna dipendenza da installare.".dimmed());
                        return;
                    }
                    println!("{} Installazione dipendenze...\n", "📦".cyan());
                    for (nome, versione) in &m.dipendenze {
                        installa_pacchetto(&client, nome, Some(versione.as_str()));
                    }
                }
            }
        }
        Some(spec) => {
            let (nome, versione) = parse_spec(&spec);
            installa_pacchetto(&client, &nome, versione.as_deref());

            // aggiorna vladx.json se esiste
            if let Ok(mut m) = manifest::carica() {
                let ver = versione.unwrap_or_else(|| "latest".to_string());
                m.dipendenze.insert(nome, ver);
                manifest::salva(&m).ok();
            }
        }
    }
}

fn installa_pacchetto(client: &RegistryClient, nome: &str, versione: Option<&str>) {
    print!("  {} {}... ", "↓".cyan(), nome.bold());
    std::io::Write::flush(&mut std::io::stdout()).ok();

    match client.info_pacchetto(nome, versione) {
        Err(e) => println!("{} {}", "✗".red(), e),
        Ok(info) => {
            // crea vladx_modules/<nome>
            let dir = format!("vladx_modules/{}", info.nome);
            fs::create_dir_all(&dir).ok();

            // scarica se c'è url
            if let Some(url) = &info.url_download {
                match scarica_e_installa(url, &dir) {
                    Ok(_) => {}
                    Err(e) => { println!("{} {}", "✗".red(), e); return; }
                }
            }

            // installa dipendenze transitive
            if let Some(deps) = &info.dipendenze {
                for (dep_nome, dep_ver) in deps {
                    installa_pacchetto(client, dep_nome, Some(dep_ver.as_str()));
                }
            }

            println!("{} v{}", "✓".green(), info.versione.yellow());
        }
    }
}

fn scarica_e_installa(url: &str, dir: &str) -> Result<(), String> {
    let resp = reqwest::blocking::get(url)
        .map_err(|e| format!("Download fallito: {e}"))?;
    let bytes = resp.bytes().map_err(|e| e.to_string())?;

    // estrai tar.gz nella directory
    let cursor = std::io::Cursor::new(bytes);
    let dec = flate2::read::GzDecoder::new(cursor);
    let mut archive = tar::Archive::new(dec);
    archive.unpack(dir).map_err(|e| format!("Estrazione fallita: {e}"))?;
    Ok(())
}

fn parse_spec(spec: &str) -> (String, Option<String>) {
    if let Some((nome, ver)) = spec.split_once('@') {
        (nome.to_string(), Some(ver.to_string()))
    } else {
        (spec.to_string(), None)
    }
}

/// Usato da update.rs per reinstallare un singolo pacchetto
pub fn installa_singolo(client: &RegistryClient, nome: &str, versione: Option<&str>) {
    installa_pacchetto(client, nome, versione);
}
