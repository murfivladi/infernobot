use std::collections::HashMap;
use crate::bytecode::Istruzione;
use crate::valore::Valore;
use crate::stdlib::{chiama_nativa, valori_uguali};

struct Frame {
    istruzioni: Vec<Istruzione>,
    ip: usize,
    vars: HashMap<String, Valore>,
}

pub struct VM {
    stack: Vec<Valore>,
    globals: HashMap<String, Valore>,
    iteratori: Vec<(Vec<Valore>, usize)>, // (elementi, indice corrente)
}

impl VM {
    pub fn nuova() -> Self {
        let mut globals = HashMap::new();
        crate::stdlib::registra_native(&mut globals);
        VM { stack: Vec::new(), globals, iteratori: Vec::new() }
    }

    pub fn esegui(&mut self, istruzioni: &[Istruzione]) -> Result<Valore, String> {
        let mut vars: HashMap<String, Valore> = HashMap::new();
        self.esegui_frame(istruzioni, &mut vars)
    }

    fn esegui_frame(&mut self, istruzioni: &[Istruzione], vars: &mut HashMap<String, Valore>) -> Result<Valore, String> {
        let mut ip = 0;
        while ip < istruzioni.len() {
            match &istruzioni[ip].clone() {
                Istruzione::CaricaNumero(n) => self.stack.push(Valore::Numero(*n)),
                Istruzione::CaricaTesto(s) => self.stack.push(Valore::Testo(s.clone())),
                Istruzione::CaricaBool(b) => self.stack.push(Valore::Booleano(*b)),
                Istruzione::CaricaNullo => self.stack.push(Valore::Nullo),
                Istruzione::CaricaArray(n) => {
                    let n = *n;
                    let start = self.stack.len().saturating_sub(n);
                    let elementi: Vec<Valore> = self.stack.drain(start..).collect();
                    self.stack.push(Valore::Array(elementi));
                }
                Istruzione::CaricaDizionario(n) => {
                    let n = *n;
                    let start = self.stack.len().saturating_sub(n * 2);
                    let flat: Vec<Valore> = self.stack.drain(start..).collect();
                    let mut m = HashMap::new();
                    for chunk in flat.chunks(2) {
                        let k = format!("{}", chunk[0]);
                        m.insert(k, chunk[1].clone());
                    }
                    self.stack.push(Valore::Dizionario(m));
                }
                Istruzione::CaricaVar(nome) => {
                    let v = vars.get(nome)
                        .or_else(|| self.globals.get(nome))
                        .cloned()
                        .ok_or_else(|| format!("Variabile '{nome}' non definita"))?;
                    self.stack.push(v);
                }
                Istruzione::StoreVar(nome) => {
                    let v = self.pop()?;
                    vars.insert(nome.clone(), v.clone());
                    self.stack.push(v); // lascia il valore sullo stack (per assegnazione come espressione)
                }
                Istruzione::Pop => { self.pop()?; }
                Istruzione::Duplica => {
                    let v = self.stack.last().cloned().ok_or("Stack vuoto")?;
                    self.stack.push(v);
                }
                Istruzione::BinOp(op) => {
                    let r = self.pop()?;
                    let l = self.pop()?;
                    let res = self.binop(&l, op, &r)?;
                    self.stack.push(res);
                }
                Istruzione::UnOp(op) => {
                    let v = self.pop()?;
                    let res = match op.as_str() {
                        "!" => Valore::Booleano(!self.e_vero(&v)),
                        "-" => match v {
                            Valore::Numero(n) => Valore::Numero(-n),
                            _ => return Err("'-' richiede numero".to_string()),
                        },
                        _ => return Err(format!("UnOp sconosciuto: {op}")),
                    };
                    self.stack.push(res);
                }
                Istruzione::Salta(dest) => {
                    let dest = *dest;
                    if dest == usize::MAX { return Ok(Valore::Nullo); } // interrompi
                    if dest == usize::MAX - 1 { ip += 1; continue; }    // continua
                    ip = dest;
                    continue;
                }
                Istruzione::SaltaSeFalso(dest) => {
                    let dest = *dest;
                    let v = self.pop()?;
                    if !self.e_vero(&v) { ip = dest; continue; }
                }
                Istruzione::Ritorna => {
                    return Ok(self.pop().unwrap_or(Valore::Nullo));
                }
                Istruzione::Lancia => {
                    let v = self.pop()?;
                    return Err(format!("{v}"));
                }
                Istruzione::Chiama(n_args) => {
                    let n_args = *n_args;
                    let f = self.pop()?;
                    let start = self.stack.len().saturating_sub(n_args);
                    let args: Vec<Valore> = self.stack.drain(start..).collect();
                    let res = self.chiama_valore(f, args, istruzioni)?;
                    self.stack.push(res);
                }
                Istruzione::CaricaFunzione { nome, parametri, inizio, fine } => {
                    let f = Valore::Funzione {
                        parametri: parametri.clone(),
                        corpo: crate::valore::CorpoFunzione::Blocco(vec![]), // corpo nel bytecode
                        env: crate::valore::Env::nuovo(),
                    };
                    // Usiamo NativaFn con un nome speciale per funzioni bytecode
                    // In realtà memorizziamo inizio/fine nel dizionario globals
                    let chiave = format!("__fn_{}_{}", nome, inizio);
                    self.globals.insert(chiave.clone(), Valore::Numero(*inizio as f64));
                    self.globals.insert(format!("__fn_fine_{}", inizio), Valore::Numero(*fine as f64));
                    // Crea una funzione con parametri
                    let f2 = Valore::Funzione {
                        parametri: parametri.clone(),
                        corpo: crate::valore::CorpoFunzione::Blocco(vec![]),
                        env: {
                            let mut e = crate::valore::Env::nuovo();
                            e.set("__bytecode_inizio".to_string(), Valore::Numero(*inizio as f64));
                            e.set("__bytecode_fine".to_string(), Valore::Numero(*fine as f64));
                            e
                        },
                    };
                    self.stack.push(f2);
                    let _ = (nome, f);
                }
                Istruzione::GetCampo(campo) => {
                    let obj = self.pop()?;
                    let res = match &obj {
                        Valore::Array(v) if campo == "lunghezza" => Valore::Numero(v.len() as f64),
                        Valore::Testo(s) if campo == "lunghezza" => Valore::Numero(s.chars().count() as f64),
                        Valore::Dizionario(m) => m.get(campo).cloned()
                            .ok_or_else(|| format!("Campo '{campo}' non trovato"))?,
                        _ => return Err(format!("Campo '{campo}' non trovato")),
                    };
                    self.stack.push(res);
                }
                Istruzione::SetCampo(campo) => {
                    let valore = self.pop()?;
                    let mut obj = self.pop()?;
                    if let Valore::Dizionario(ref mut m) = obj {
                        m.insert(campo.clone(), valore);
                    } else {
                        return Err(format!("SetCampo su non-dizionario"));
                    }
                    self.stack.push(obj);
                }
                Istruzione::GetIndice => {
                    let idx = self.pop()?;
                    let obj = self.pop()?;
                    let res = match (obj, idx) {
                        (Valore::Array(v), Valore::Numero(i)) =>
                            v.get(i as usize).cloned().ok_or_else(|| format!("Indice {} fuori range", i as usize))?,
                        (Valore::Dizionario(m), Valore::Testo(k)) =>
                            m.get(&k).cloned().ok_or_else(|| format!("Chiave '{k}' non trovata"))?,
                        (Valore::Testo(s), Valore::Numero(i)) =>
                            s.chars().nth(i as usize).map(|c| Valore::Testo(c.to_string()))
                                .ok_or_else(|| format!("Indice {} fuori range", i as usize))?,
                        _ => return Err("GetIndice non valido".to_string()),
                    };
                    self.stack.push(res);
                }
                Istruzione::SetIndice => {
                    let idx = self.pop()?;
                    let mut obj = self.pop()?;
                    let valore = self.pop()?;
                    match (&mut obj, idx) {
                        (Valore::Array(v), Valore::Numero(i)) => {
                            let i = i as usize;
                            if i < v.len() { v[i] = valore; } else { return Err(format!("Indice {i} fuori range")); }
                        }
                        (Valore::Dizionario(m), Valore::Testo(k)) => { m.insert(k, valore); }
                        _ => return Err("SetIndice non valido".to_string()),
                    }
                    self.stack.push(obj);
                }
                Istruzione::IteraInizio => {
                    let v = self.pop()?;
                    let elementi: Vec<Valore> = match v {
                        Valore::Array(a) => a,
                        Valore::Dizionario(m) => m.keys().map(|k| Valore::Testo(k.clone())).collect(),
                        Valore::Testo(s) => s.chars().map(|c| Valore::Testo(c.to_string())).collect(),
                        _ => return Err("IteraInizio: non iterabile".to_string()),
                    };
                    self.iteratori.push((elementi, 0));
                }
                Istruzione::IteraAvanti(dest) => {
                    let dest = *dest;
                    if let Some((elementi, idx)) = self.iteratori.last_mut() {
                        if *idx >= elementi.len() {
                            ip = dest;
                            continue;
                        }
                        let elem = elementi[*idx].clone();
                        *idx += 1;
                        self.stack.push(elem);
                    } else {
                        return Err("IteraAvanti senza IteraInizio".to_string());
                    }
                }
                Istruzione::IteraFine => { self.iteratori.pop(); }
                Istruzione::Stampa(n) => {
                    let n = *n;
                    let start = self.stack.len().saturating_sub(n);
                    let vals: Vec<String> = self.stack.drain(start..).map(|v| format!("{v}")).collect();
                    println!("{}", vals.join(" "));
                    self.stack.push(Valore::Nullo);
                }
                Istruzione::Nop => {}
            }
            ip += 1;
        }
        Ok(self.stack.pop().unwrap_or(Valore::Nullo))
    }

    fn chiama_valore(&mut self, f: Valore, args: Vec<Valore>, istruzioni: &[Istruzione]) -> Result<Valore, String> {
        match f {
            Valore::NativaFn(nome) => chiama_nativa(&nome, args),
            Valore::Funzione { parametri, env, .. } => {
                // Controlla se è una funzione bytecode
                let inizio = env.get("__bytecode_inizio");
                let fine = env.get("__bytecode_fine");
                if let (Some(Valore::Numero(start)), Some(Valore::Numero(end))) = (inizio, fine) {
                    let start = start as usize;
                    let end = end as usize;
                    let mut child_vars: HashMap<String, Valore> = HashMap::new();
                    for (p, a) in parametri.iter().zip(args) {
                        child_vars.insert(p.clone(), a);
                    }
                    let sub_istr = &istruzioni[start..end];
                    self.esegui_frame(sub_istr, &mut child_vars)
                } else {
                    Err("Funzione bytecode senza indirizzo".to_string())
                }
            }
            _ => Err("Non è una funzione".to_string()),
        }
    }

    fn pop(&mut self) -> Result<Valore, String> {
        self.stack.pop().ok_or_else(|| "Stack underflow".to_string())
    }

    fn e_vero(&self, v: &Valore) -> bool {
        match v {
            Valore::Booleano(b) => *b,
            Valore::Nullo => false,
            Valore::Numero(n) => *n != 0.0,
            Valore::Testo(s) => !s.is_empty(),
            Valore::Array(a) => !a.is_empty(),
            _ => true,
        }
    }

    fn binop(&self, l: &Valore, op: &str, r: &Valore) -> Result<Valore, String> {
        match op {
            "+" => match (l, r) {
                (Valore::Numero(a), Valore::Numero(b)) => Ok(Valore::Numero(a + b)),
                (Valore::Testo(a), b) => Ok(Valore::Testo(format!("{a}{b}"))),
                (a, Valore::Testo(b)) => Ok(Valore::Testo(format!("{a}{b}"))),
                _ => Err(format!("'+' non supportato")),
            },
            "-" => num2(l, r, |a, b| a - b),
            "*" => num2(l, r, |a, b| a * b),
            "/" => {
                if let (Valore::Numero(a), Valore::Numero(b)) = (l, r) {
                    if *b == 0.0 { return Err("Divisione per zero".to_string()); }
                    Ok(Valore::Numero(a / b))
                } else { Err("'/' richiede numeri".to_string()) }
            }
            "%" => num2(l, r, |a, b| a % b),
            "==" => Ok(Valore::Booleano(valori_uguali(l, r))),
            "!=" => Ok(Valore::Booleano(!valori_uguali(l, r))),
            "<" => num_cmp(l, r, |a, b| a < b),
            ">" => num_cmp(l, r, |a, b| a > b),
            "<=" => num_cmp(l, r, |a, b| a <= b),
            ">=" => num_cmp(l, r, |a, b| a >= b),
            "&&" => Ok(Valore::Booleano(self.e_vero(l) && self.e_vero(r))),
            "||" => Ok(Valore::Booleano(self.e_vero(l) || self.e_vero(r))),
            _ => Err(format!("Operatore sconosciuto: {op}")),
        }
    }
}

fn num2(l: &Valore, r: &Valore, f: impl Fn(f64, f64) -> f64) -> Result<Valore, String> {
    match (l, r) {
        (Valore::Numero(a), Valore::Numero(b)) => Ok(Valore::Numero(f(*a, *b))),
        _ => Err("Operazione richiede numeri".to_string()),
    }
}

fn num_cmp(l: &Valore, r: &Valore, f: impl Fn(f64, f64) -> bool) -> Result<Valore, String> {
    match (l, r) {
        (Valore::Numero(a), Valore::Numero(b)) => Ok(Valore::Booleano(f(*a, *b))),
        (Valore::Testo(a), Valore::Testo(b)) => Ok(Valore::Booleano(f(0.0, if a < b { 1.0 } else { -1.0 }))),
        _ => Err("Confronto richiede numeri".to_string()),
    }
}
