use std::collections::HashMap;
use std::fmt;
use crate::parser::Stmt;

#[derive(Debug, Clone)]
pub enum Valore {
    Numero(f64),
    Testo(String),
    Booleano(bool),
    Nullo,
    Array(Vec<Valore>),
    Dizionario(HashMap<String, Valore>),
    Funzione {
        parametri: Vec<String>,
        corpo: CorpoFunzione,
        env: Env,
    },
    NativaFn(String),
}

#[derive(Debug, Clone)]
pub enum CorpoFunzione {
    Blocco(Vec<Stmt>),
    Espressione(Box<crate::parser::Expr>),
}

impl fmt::Display for Valore {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            Valore::Numero(n) => {
                if n.fract() == 0.0 && n.abs() < 1e15 { write!(f, "{}", *n as i64) }
                else { write!(f, "{n}") }
            }
            Valore::Testo(s) => write!(f, "{s}"),
            Valore::Booleano(b) => write!(f, "{}", if *b { "vero" } else { "falso" }),
            Valore::Nullo => write!(f, "nullo"),
            Valore::Array(v) => {
                let s: Vec<String> = v.iter().map(|x| format!("{x}")).collect();
                write!(f, "[{}]", s.join(", "))
            }
            Valore::Dizionario(m) => {
                let s: Vec<String> = m.iter().map(|(k, v)| format!("{k}: {v}")).collect();
                write!(f, "{{{}}}", s.join(", "))
            }
            Valore::Funzione { parametri, .. } => write!(f, "<funzione({})>", parametri.join(", ")),
            Valore::NativaFn(n) => write!(f, "<nativa:{n}>"),
        }
    }
}

#[derive(Debug, Clone)]
pub struct Env {
    pub vars: HashMap<String, Valore>,
    pub parent: Option<Box<Env>>,
}

impl Env {
    pub fn nuovo() -> Self {
        Env { vars: HashMap::new(), parent: None }
    }

    pub fn figlio(parent: Env) -> Self {
        Env { vars: HashMap::new(), parent: Some(Box::new(parent)) }
    }

    pub fn get(&self, nome: &str) -> Option<Valore> {
        if let Some(v) = self.vars.get(nome) {
            Some(v.clone())
        } else if let Some(p) = &self.parent {
            p.get(nome)
        } else {
            None
        }
    }

    pub fn set(&mut self, nome: String, valore: Valore) {
        self.vars.insert(nome, valore);
    }

    pub fn assegna(&mut self, nome: &str, valore: Valore) -> bool {
        if self.vars.contains_key(nome) {
            self.vars.insert(nome.to_string(), valore);
            true
        } else if let Some(p) = &mut self.parent {
            p.assegna(nome, valore)
        } else {
            false
        }
    }
}

pub enum Segnale {
    Ritorna(Valore),
    Interrompi,
    Continua,
    Errore(String),
}
