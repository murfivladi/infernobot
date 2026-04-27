use std::collections::HashMap;
use crate::valore::Valore;

/// Registra solo le funzioni built-in sempre disponibili (no moduli)
pub fn registra_native(vars: &mut HashMap<String, Valore>) {
    for nome in &[
        "scrivi", "scrivil", "leggi", "lunghezza", "tipo", "numero", "testo", "intero",
        "leggi_file", "scrivi_file", "esiste_file", "cancella_file",
        "json_leggi", "json_scrivi",
        "ora_adesso", "data_adesso", "timestamp",
    ] {
        vars.insert(nome.to_string(), Valore::NativaFn(nome.to_string()));
    }
}

/// Carica un modulo stdlib per nome; restituisce il dizionario del modulo o None se sconosciuto
pub fn carica_modulo(nome: &str) -> Option<Valore> {
    match nome {
        "mat" => {
            let mut m = HashMap::new();
            for n in &["radice","potenza","assoluto","arrotonda","pavimento","soffitto","casuale","sen","cos","tan","pi","e"] {
                m.insert(n.to_string(), Valore::NativaFn(format!("mat.{n}")));
            }
            Some(Valore::Dizionario(m))
        }
        "str" => {
            let mut m = HashMap::new();
            for n in &["dividi","sostituisci","maiuscolo","minuscolo","contiene","inizia_con","finisce_con","taglia","ripeti","inverti","formato"] {
                m.insert(n.to_string(), Valore::NativaFn(format!("str.{n}")));
            }
            Some(Valore::Dizionario(m))
        }
        "arr" => {
            let mut m = HashMap::new();
            for n in &["spingi","togli","ordina","filtra","mappa","riduci","contiene","inverti","unisci","unico"] {
                m.insert(n.to_string(), Valore::NativaFn(format!("arr.{n}")));
            }
            Some(Valore::Dizionario(m))
        }
        _ => None,
    }
}

pub fn chiama_nativa(nome: &str, args: Vec<Valore>) -> Result<Valore, String> {
    match nome {
        "scrivi" => {
            let parts: Vec<String> = args.iter().map(|v| format!("{v}")).collect();
            println!("{}", parts.join(" "));
            Ok(Valore::Nullo)
        }
        "scrivil" => {
            let parts: Vec<String> = args.iter().map(|v| format!("{v}")).collect();
            print!("{}", parts.join(" "));
            use std::io::Write;
            std::io::stdout().flush().ok();
            Ok(Valore::Nullo)
        }
        "leggi" => {
            if let Some(prompt) = args.first() {
                print!("{prompt}");
                use std::io::Write;
                std::io::stdout().flush().ok();
            }
            let mut input = String::new();
            std::io::stdin().read_line(&mut input).map_err(|e| e.to_string())?;
            Ok(Valore::Testo(input.trim_end_matches('\n').trim_end_matches('\r').to_string()))
        }
        "lunghezza" => match args.first() {
            Some(Valore::Array(v)) => Ok(Valore::Numero(v.len() as f64)),
            Some(Valore::Testo(s)) => Ok(Valore::Numero(s.chars().count() as f64)),
            Some(Valore::Dizionario(m)) => Ok(Valore::Numero(m.len() as f64)),
            _ => Err("lunghezza() richiede array, testo o dizionario".to_string()),
        },
        "tipo" => {
            let t = match args.first() {
                Some(Valore::Numero(_)) => "numero",
                Some(Valore::Testo(_)) => "testo",
                Some(Valore::Booleano(_)) => "booleano",
                Some(Valore::Nullo) => "nullo",
                Some(Valore::Array(_)) => "array",
                Some(Valore::Dizionario(_)) => "dizionario",
                Some(Valore::Funzione { .. }) | Some(Valore::NativaFn(_)) => "funzione",
                None => "nullo",
            };
            Ok(Valore::Testo(t.to_string()))
        }
        "numero" => match args.first() {
            Some(Valore::Numero(n)) => Ok(Valore::Numero(*n)),
            Some(Valore::Testo(s)) => s.parse::<f64>()
                .map(Valore::Numero)
                .map_err(|_| format!("Impossibile convertire '{s}' in numero")),
            Some(Valore::Booleano(b)) => Ok(Valore::Numero(if *b { 1.0 } else { 0.0 })),
            _ => Err("numero() richiede un argomento".to_string()),
        },
        "testo" => match args.first() {
            Some(v) => Ok(Valore::Testo(format!("{v}"))),
            None => Err("testo() richiede un argomento".to_string()),
        },
        "intero" => match args.first() {
            Some(Valore::Numero(n)) => Ok(Valore::Numero(n.floor())),
            Some(Valore::Testo(s)) => s.parse::<f64>()
                .map(|n| Valore::Numero(n.floor()))
                .map_err(|_| format!("Impossibile convertire '{s}' in intero")),
            _ => Err("intero() richiede un numero".to_string()),
        },

        // File I/O
        "leggi_file" => match args.first() {
            Some(Valore::Testo(path)) => std::fs::read_to_string(path)
                .map(Valore::Testo)
                .map_err(|e| format!("leggi_file: {e}")),
            _ => Err("leggi_file(percorso)".to_string()),
        },
        "scrivi_file" => match (args.first(), args.get(1)) {
            (Some(Valore::Testo(path)), Some(Valore::Testo(contenuto))) => {
                std::fs::write(path, contenuto).map_err(|e| format!("scrivi_file: {e}"))?;
                Ok(Valore::Nullo)
            }
            _ => Err("scrivi_file(percorso, contenuto)".to_string()),
        },
        "esiste_file" => match args.first() {
            Some(Valore::Testo(path)) => Ok(Valore::Booleano(std::path::Path::new(path).exists())),
            _ => Err("esiste_file(percorso)".to_string()),
        },
        "cancella_file" => match args.first() {
            Some(Valore::Testo(path)) => {
                std::fs::remove_file(path).map_err(|e| format!("cancella_file: {e}"))?;
                Ok(Valore::Nullo)
            }
            _ => Err("cancella_file(percorso)".to_string()),
        },

        // JSON
        "json_leggi" => match args.first() {
            Some(Valore::Testo(s)) => {
                let v: serde_json::Value = serde_json::from_str(s)
                    .map_err(|e| format!("json_leggi: {e}"))?;
                Ok(json_a_valore(v))
            }
            _ => Err("json_leggi(testo)".to_string()),
        },
        "json_scrivi" => match args.first() {
            Some(v) => {
                let j = valore_a_json(v);
                Ok(Valore::Testo(serde_json::to_string(&j).unwrap_or_default()))
            }
            None => Err("json_scrivi(valore)".to_string()),
        },

        // Data e ora
        "timestamp" => {
            use std::time::{SystemTime, UNIX_EPOCH};
            let ts = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs();
            Ok(Valore::Numero(ts as f64))
        }
        "ora_adesso" => {
            let now = chrono::Local::now();
            Ok(Valore::Testo(now.format("%H:%M:%S").to_string()))
        }
        "data_adesso" => {
            let now = chrono::Local::now();
            Ok(Valore::Testo(now.format("%Y-%m-%d").to_string()))
        }

        // Matematica
        "mat.pi" => Ok(Valore::Numero(std::f64::consts::PI)),
        "mat.e" => Ok(Valore::Numero(std::f64::consts::E)),
        "mat.radice" => num1(&args, |n| n.sqrt()),
        "mat.assoluto" => num1(&args, |n| n.abs()),
        "mat.arrotonda" => num1(&args, |n| n.round()),
        "mat.pavimento" => num1(&args, |n| n.floor()),
        "mat.soffitto" => num1(&args, |n| n.ceil()),
        "mat.sen" => num1(&args, |n| n.sin()),
        "mat.cos" => num1(&args, |n| n.cos()),
        "mat.tan" => num1(&args, |n| n.tan()),
        "mat.potenza" => match (args.first(), args.get(1)) {
            (Some(Valore::Numero(b)), Some(Valore::Numero(e))) => Ok(Valore::Numero(b.powf(*e))),
            _ => Err("mat.potenza(base, esponente)".to_string()),
        },
        "mat.casuale" => Ok(Valore::Numero(rand::random::<f64>())),

        // Stringhe
        "str.maiuscolo" => str1(&args, |s| s.to_uppercase()),
        "str.minuscolo" => str1(&args, |s| s.to_lowercase()),
        "str.taglia" => str1(&args, |s| s.trim().to_string()),
        "str.inverti" => str1(&args, |s| s.chars().rev().collect()),
        "str.contiene" => match (args.first(), args.get(1)) {
            (Some(Valore::Testo(s)), Some(Valore::Testo(p))) => Ok(Valore::Booleano(s.contains(p.as_str()))),
            _ => Err("str.contiene(testo, pattern)".to_string()),
        },
        "str.inizia_con" => match (args.first(), args.get(1)) {
            (Some(Valore::Testo(s)), Some(Valore::Testo(p))) => Ok(Valore::Booleano(s.starts_with(p.as_str()))),
            _ => Err("str.inizia_con(testo, pattern)".to_string()),
        },
        "str.finisce_con" => match (args.first(), args.get(1)) {
            (Some(Valore::Testo(s)), Some(Valore::Testo(p))) => Ok(Valore::Booleano(s.ends_with(p.as_str()))),
            _ => Err("str.finisce_con(testo, pattern)".to_string()),
        },
        "str.sostituisci" => match (args.first(), args.get(1), args.get(2)) {
            (Some(Valore::Testo(s)), Some(Valore::Testo(da)), Some(Valore::Testo(a))) =>
                Ok(Valore::Testo(s.replace(da.as_str(), a.as_str()))),
            _ => Err("str.sostituisci(testo, da, a)".to_string()),
        },
        "str.dividi" => match (args.first(), args.get(1)) {
            (Some(Valore::Testo(s)), Some(Valore::Testo(sep))) => {
                let parti: Vec<Valore> = s.split(sep.as_str()).map(|p| Valore::Testo(p.to_string())).collect();
                Ok(Valore::Array(parti))
            }
            _ => Err("str.dividi(testo, separatore)".to_string()),
        },
        "str.ripeti" => match (args.first(), args.get(1)) {
            (Some(Valore::Testo(s)), Some(Valore::Numero(n))) => Ok(Valore::Testo(s.repeat(*n as usize))),
            _ => Err("str.ripeti(testo, n)".to_string()),
        },
        "str.formato" => match args.first() {
            Some(Valore::Testo(s)) => {
                let mut risultato = s.clone();
                for (i, arg) in args.iter().skip(1).enumerate() {
                    risultato = risultato.replacen("{}", &format!("{arg}"), 1);
                    risultato = risultato.replace(&format!("{{{i}}}"), &format!("{arg}"));
                }
                Ok(Valore::Testo(risultato))
            }
            _ => Err("str.formato(template, ...)".to_string()),
        },

        // Array
        "arr.spingi" => match (args.first(), args.get(1)) {
            (Some(Valore::Array(v)), Some(elem)) => {
                let mut v2 = v.clone();
                v2.push(elem.clone());
                Ok(Valore::Array(v2))
            }
            _ => Err("arr.spingi(array, elemento)".to_string()),
        },
        "arr.togli" => match args.first() {
            Some(Valore::Array(v)) if !v.is_empty() => {
                let mut v2 = v.clone();
                v2.pop();
                Ok(Valore::Array(v2))
            }
            _ => Err("arr.togli(array)".to_string()),
        },
        "arr.inverti" => match args.first() {
            Some(Valore::Array(v)) => {
                let mut v2 = v.clone();
                v2.reverse();
                Ok(Valore::Array(v2))
            }
            _ => Err("arr.inverti(array)".to_string()),
        },
        "arr.ordina" => match args.first() {
            Some(Valore::Array(v)) => {
                let mut v2 = v.clone();
                v2.sort_by(|a, b| {
                    match (a, b) {
                        (Valore::Numero(x), Valore::Numero(y)) => x.partial_cmp(y).unwrap_or(std::cmp::Ordering::Equal),
                        (Valore::Testo(x), Valore::Testo(y)) => x.cmp(y),
                        _ => std::cmp::Ordering::Equal,
                    }
                });
                Ok(Valore::Array(v2))
            }
            _ => Err("arr.ordina(array)".to_string()),
        },
        "arr.contiene" => match (args.first(), args.get(1)) {
            (Some(Valore::Array(v)), Some(elem)) => {
                Ok(Valore::Booleano(v.iter().any(|x| valori_uguali(x, elem))))
            }
            _ => Err("arr.contiene(array, elemento)".to_string()),
        },
        "arr.unisci" => match (args.first(), args.get(1)) {
            (Some(Valore::Array(a)), Some(Valore::Array(b))) => {
                let mut v = a.clone();
                v.extend(b.clone());
                Ok(Valore::Array(v))
            }
            _ => Err("arr.unisci(a, b)".to_string()),
        },
        "arr.unico" => match args.first() {
            Some(Valore::Array(v)) => {
                let mut visti: Vec<String> = Vec::new();
                let unici: Vec<Valore> = v.iter().filter(|x| {
                    let k = format!("{x}");
                    if visti.contains(&k) { false } else { visti.push(k); true }
                }).cloned().collect();
                Ok(Valore::Array(unici))
            }
            _ => Err("arr.unico(array)".to_string()),
        },
        // arr.filtra, arr.mappa, arr.riduci sono gestiti nell'interprete (richiedono callback)
        _ => Err(format!("Funzione nativa '{nome}' sconosciuta")),
    }
}

fn num1(args: &[Valore], f: impl Fn(f64) -> f64) -> Result<Valore, String> {
    match args.first() {
        Some(Valore::Numero(n)) => Ok(Valore::Numero(f(*n))),
        _ => Err("Atteso un numero".to_string()),
    }
}

fn str1(args: &[Valore], f: impl Fn(&str) -> String) -> Result<Valore, String> {
    match args.first() {
        Some(Valore::Testo(s)) => Ok(Valore::Testo(f(s))),
        _ => Err("Atteso un testo".to_string()),
    }
}

pub fn valori_uguali(a: &Valore, b: &Valore) -> bool {
    match (a, b) {
        (Valore::Numero(x), Valore::Numero(y)) => x == y,
        (Valore::Testo(x), Valore::Testo(y)) => x == y,
        (Valore::Booleano(x), Valore::Booleano(y)) => x == y,
        (Valore::Nullo, Valore::Nullo) => true,
        _ => false,
    }
}

fn json_a_valore(v: serde_json::Value) -> Valore {
    match v {
        serde_json::Value::Null => Valore::Nullo,
        serde_json::Value::Bool(b) => Valore::Booleano(b),
        serde_json::Value::Number(n) => Valore::Numero(n.as_f64().unwrap_or(0.0)),
        serde_json::Value::String(s) => Valore::Testo(s),
        serde_json::Value::Array(a) => Valore::Array(a.into_iter().map(json_a_valore).collect()),
        serde_json::Value::Object(o) => {
            let m = o.into_iter().map(|(k, v)| (k, json_a_valore(v))).collect();
            Valore::Dizionario(m)
        }
    }
}

fn valore_a_json(v: &Valore) -> serde_json::Value {
    match v {
        Valore::Nullo => serde_json::Value::Null,
        Valore::Booleano(b) => serde_json::Value::Bool(*b),
        Valore::Numero(n) => serde_json::json!(n),
        Valore::Testo(s) => serde_json::Value::String(s.clone()),
        Valore::Array(a) => serde_json::Value::Array(a.iter().map(valore_a_json).collect()),
        Valore::Dizionario(m) => {
            let obj: serde_json::Map<String, serde_json::Value> =
                m.iter().map(|(k, v)| (k.clone(), valore_a_json(v))).collect();
            serde_json::Value::Object(obj)
        }
        _ => serde_json::Value::Null,
    }
}
