use serde::{Deserialize, Serialize};
use colored::*;

#[derive(Debug, Serialize, Deserialize)]
pub struct InfoPacchetto {
    pub nome: String,
    pub versione: String,
    pub descrizione: Option<String>,
    pub autore: Option<String>,
    pub dipendenze: Option<std::collections::HashMap<String, String>>,
    pub url_download: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RisultatoRicerca {
    pub pacchetti: Vec<InfoPacchetto>,
}

pub struct RegistryClient {
    pub base_url: String,
    pub token: Option<String>,
}

impl RegistryClient {
    pub fn nuovo(base_url: String, token: Option<String>) -> Self {
        RegistryClient { base_url, token }
    }

    fn client(&self) -> reqwest::blocking::Client {
        reqwest::blocking::Client::new()
    }

    fn headers(&self) -> reqwest::header::HeaderMap {
        let mut h = reqwest::header::HeaderMap::new();
        if let Some(token) = &self.token {
            h.insert(
                reqwest::header::AUTHORIZATION,
                format!("Bearer {token}").parse().unwrap(),
            );
        }
        h
    }

    pub fn cerca(&self, query: &str) -> Result<Vec<InfoPacchetto>, String> {
        let url = format!("{}/search?q={}", self.base_url, query);
        let resp = self.client()
            .get(&url)
            .headers(self.headers())
            .send()
            .map_err(|e| format!("Errore connessione registry: {e}"))?;

        if !resp.status().is_success() {
            return Err(format!("Registry ha risposto: {}", resp.status()));
        }

        let risultato: RisultatoRicerca = resp.json()
            .map_err(|e| format!("Risposta non valida: {e}"))?;
        Ok(risultato.pacchetti)
    }

    pub fn info_pacchetto(&self, nome: &str, versione: Option<&str>) -> Result<InfoPacchetto, String> {
        let url = match versione {
            Some(v) => format!("{}/packages/{}/{}", self.base_url, nome, v),
            None => format!("{}/packages/{}/latest", self.base_url, nome),
        };
        let resp = self.client()
            .get(&url)
            .headers(self.headers())
            .send()
            .map_err(|e| format!("Errore connessione registry: {e}"))?;

        if resp.status().as_u16() == 404 {
            return Err(format!("Pacchetto '{nome}' non trovato nel registry"));
        }
        if !resp.status().is_success() {
            return Err(format!("Registry ha risposto: {}", resp.status()));
        }

        resp.json().map_err(|e| format!("Risposta non valida: {e}"))
    }

    pub fn pubblica(&self, manifest_json: &str, archivio: Vec<u8>) -> Result<(), String> {
        let url = format!("{}/publish", self.base_url);
        let form = reqwest::blocking::multipart::Form::new()
            .text("manifest", manifest_json.to_string())
            .part("archivio", reqwest::blocking::multipart::Part::bytes(archivio)
                .file_name("pacchetto.tar.gz")
                .mime_str("application/gzip").unwrap());

        let resp = self.client()
            .post(&url)
            .headers(self.headers())
            .multipart(form)
            .send()
            .map_err(|e| format!("Errore connessione registry: {e}"))?;

        if !resp.status().is_success() {
            let msg = resp.text().unwrap_or_default();
            return Err(format!("Pubblicazione fallita: {msg}"));
        }
        Ok(())
    }

    pub fn rimuovi_pubblicazione(&self, nome: &str, versione: &str) -> Result<(), String> {
        let url = format!("{}/packages/{}/{}", self.base_url, nome, versione);
        let resp = self.client()
            .delete(&url)
            .headers(self.headers())
            .send()
            .map_err(|e| format!("Errore connessione registry: {e}"))?;

        if !resp.status().is_success() {
            let msg = resp.text().unwrap_or_default();
            return Err(format!("Rimozione fallita: {msg}"));
        }
        Ok(())
    }

    pub fn login(&self, utente: &str, password: &str) -> Result<String, String> {
        let url = format!("{}/auth/login", self.base_url);
        let body = serde_json::json!({ "utente": utente, "password": password });
        let resp = self.client()
            .post(&url)
            .json(&body)
            .send()
            .map_err(|e| format!("Errore connessione registry: {e}"))?;

        if !resp.status().is_success() {
            return Err("Credenziali non valide".to_string());
        }

        let data: serde_json::Value = resp.json().map_err(|e| e.to_string())?;
        data["token"].as_str()
            .map(|s| s.to_string())
            .ok_or_else(|| "Token non ricevuto".to_string())
    }

    pub fn register(&self, utente: &str, email: &str, password: &str) -> Result<String, String> {
        let url = format!("{}/auth/register", self.base_url);
        let body = serde_json::json!({ "utente": utente, "email": email, "password": password });
        let resp = self.client()
            .post(&url)
            .json(&body)
            .send()
            .map_err(|e| format!("Errore connessione registry: {e}"))?;

        if !resp.status().is_success() {
            let msg = resp.text().unwrap_or_default();
            return Err(format!("Registrazione fallita: {msg}"));
        }

        let data: serde_json::Value = resp.json().map_err(|e| e.to_string())?;
        data["token"].as_str()
            .map(|s| s.to_string())
            .ok_or_else(|| "Token non ricevuto".to_string())
    }
}

pub fn stampa_pacchetto(info: &InfoPacchetto) {
    println!(
        "  {} {} {}",
        info.nome.cyan().bold(),
        format!("v{}", info.versione).yellow(),
        info.descrizione.as_deref().unwrap_or("").dimmed()
    );
    if let Some(autore) = &info.autore {
        println!("    {} {}", "autore:".dimmed(), autore);
    }
}
