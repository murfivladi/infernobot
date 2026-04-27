use std::collections::HashMap;
use std::path::Path;
use crate::parser::{Expr, Stmt, LambdaCorpo, SegmentoInterpolato};
use crate::valore::{Valore, Env, Segnale, CorpoFunzione};
use crate::stdlib::{chiama_nativa, valori_uguali};

pub struct Interprete {
    pub env: Env,
    pub dir_base: Option<std::path::PathBuf>,
}

impl Interprete {
    pub fn nuovo() -> Self {
        let mut env = Env::nuovo();
        crate::stdlib::registra_native(&mut env.vars);
        Interprete { env, dir_base: None }
    }

    pub fn esegui(&mut self, stmts: &[Stmt]) -> Result<Valore, String> {
        let mut env = std::mem::replace(&mut self.env, Env::nuovo());
        let result = self.esegui_stmts(stmts, &mut env);
        self.env = env;
        match result? {
            (v, None) => Ok(v),
            (_, Some(Segnale::Ritorna(v))) => Ok(v),
            (_, Some(Segnale::Errore(e))) => Err(e),
            _ => Ok(Valore::Nullo),
        }
    }

    pub fn esegui_stmts(&self, stmts: &[Stmt], env: &mut Env) -> Result<(Valore, Option<Segnale>), String> {
        let mut ultimo = Valore::Nullo;
        for stmt in stmts {
            match self.esegui_stmt(stmt, env)? {
                (_, Some(s)) => return Ok((Valore::Nullo, Some(s))),
                (v, None) => ultimo = v,
            }
        }
        Ok((ultimo, None))
    }

    fn esegui_stmt(&self, stmt: &Stmt, env: &mut Env) -> Result<(Valore, Option<Segnale>), String> {
        match stmt {
            Stmt::Espressione(expr) => {
                let v = self.valuta(expr, env)?;
                Ok((v, None))
            }
            Stmt::Variabile { nome, valore } => {
                let v = self.valuta(valore, env)?;
                env.set(nome.clone(), v);
                Ok((Valore::Nullo, None))
            }
            Stmt::Funzione { nome, parametri, corpo } => {
                let f = Valore::Funzione {
                    parametri: parametri.clone(),
                    corpo: CorpoFunzione::Blocco(corpo.clone()),
                    env: env.clone(),
                };
                env.set(nome.clone(), f);
                // Aggiorna env catturato per ricorsione
                let f_clone = env.vars[nome].clone();
                if let Valore::Funzione { parametri: p, corpo: c, env: mut fe } = f_clone {
                    fe.set(nome.clone(), env.vars[nome].clone());
                    env.set(nome.clone(), Valore::Funzione { parametri: p, corpo: c, env: fe });
                }
                Ok((Valore::Nullo, None))
            }
            Stmt::Se { condizione, allora, altrimenti } => {
                let cond = self.valuta(condizione, env)?;
                if self.e_vero(&cond) {
                    let mut child = Env::figlio(env.clone());
                    self.esegui_stmts(allora, &mut child)
                } else if let Some(alt) = altrimenti {
                    let mut child = Env::figlio(env.clone());
                    self.esegui_stmts(alt, &mut child)
                } else {
                    Ok((Valore::Nullo, None))
                }
            }
            Stmt::Per { variabile, da, a, corpo } => {
                let da_v = self.valuta(da, env)?;
                let a_v = self.valuta(a, env)?;
                let (da_n, a_n) = match (&da_v, &a_v) {
                    (Valore::Numero(d), Valore::Numero(a)) => (*d as i64, *a as i64),
                    _ => return Err("'per' richiede numeri".to_string()),
                };
                for i in da_n..=a_n {
                    let mut child = Env::figlio(env.clone());
                    child.set(variabile.clone(), Valore::Numero(i as f64));
                    match self.esegui_stmts(corpo, &mut child)? {
                        (_, Some(Segnale::Ritorna(v))) => return Ok((Valore::Nullo, Some(Segnale::Ritorna(v)))),
                        (_, Some(Segnale::Interrompi)) => break,
                        (_, Some(Segnale::Continua)) => continue,
                        (_, Some(Segnale::Errore(e))) => return Ok((Valore::Nullo, Some(Segnale::Errore(e)))),
                        _ => {}
                    }
                }
                Ok((Valore::Nullo, None))
            }
            Stmt::PerIn { variabile, iterabile, corpo } => {
                let iter_v = self.valuta(iterabile, env)?;
                let elementi: Vec<Valore> = match iter_v {
                    Valore::Array(v) => v,
                    Valore::Dizionario(m) => m.keys().map(|k| Valore::Testo(k.clone())).collect(),
                    Valore::Testo(s) => s.chars().map(|c| Valore::Testo(c.to_string())).collect(),
                    _ => return Err("'per in' richiede array, dizionario o testo".to_string()),
                };
                for elem in elementi {
                    let mut child = Env::figlio(env.clone());
                    child.set(variabile.clone(), elem);
                    match self.esegui_stmts(corpo, &mut child)? {
                        (_, Some(Segnale::Ritorna(v))) => return Ok((Valore::Nullo, Some(Segnale::Ritorna(v)))),
                        (_, Some(Segnale::Interrompi)) => break,
                        (_, Some(Segnale::Continua)) => continue,
                        (_, Some(Segnale::Errore(e))) => return Ok((Valore::Nullo, Some(Segnale::Errore(e)))),
                        _ => {}
                    }
                }
                Ok((Valore::Nullo, None))
            }
            Stmt::Finche { condizione, corpo } => {
                loop {
                    let cond = self.valuta(condizione, env)?;
                    if !self.e_vero(&cond) { break; }
                    let mut child = Env::figlio(env.clone());
                    match self.esegui_stmts(corpo, &mut child)? {
                        (_, Some(Segnale::Ritorna(v))) => return Ok((Valore::Nullo, Some(Segnale::Ritorna(v)))),
                        (_, Some(Segnale::Interrompi)) => break,
                        (_, Some(Segnale::Continua)) => continue,
                        (_, Some(Segnale::Errore(e))) => return Ok((Valore::Nullo, Some(Segnale::Errore(e)))),
                        _ => {}
                    }
                }
                Ok((Valore::Nullo, None))
            }
            Stmt::Ritorna(expr) => {
                let v = match expr {
                    Some(e) => self.valuta(e, env)?,
                    None => Valore::Nullo,
                };
                Ok((Valore::Nullo, Some(Segnale::Ritorna(v))))
            }
            Stmt::Lancia(expr) => {
                let v = self.valuta(expr, env)?;
                Ok((Valore::Nullo, Some(Segnale::Errore(format!("{v}")))))
            }
            Stmt::Prova { corpo, variabile_errore, cattura } => {
                let mut child = Env::figlio(env.clone());
                match self.esegui_stmts(corpo, &mut child)? {
                    (v, None) => Ok((v, None)),
                    (_, Some(Segnale::Errore(e))) => {
                        let mut catch_env = Env::figlio(env.clone());
                        if let Some(var) = variabile_errore {
                            catch_env.set(var.clone(), Valore::Testo(e));
                        }
                        self.esegui_stmts(cattura, &mut catch_env)
                    }
                    other => Ok(other),
                }
            }
            Stmt::Interrompi => Ok((Valore::Nullo, Some(Segnale::Interrompi))),
            Stmt::Continua => Ok((Valore::Nullo, Some(Segnale::Continua))),
            Stmt::Importa { nome, da } => {
                self.esegui_importa(nome, da.as_deref(), env)?;
                Ok((Valore::Nullo, None))
            }
        }
    }

    fn esegui_importa(&self, nome: &str, da: Option<&str>, env: &mut Env) -> Result<(), String> {
        // 1. Prova moduli stdlib built-in
        let chiave = da.unwrap_or(nome);
        if da.is_none() {
            if let Some(modulo) = crate::stdlib::carica_modulo(nome) {
                env.set(nome.to_string(), modulo);
                return Ok(());
            }
        }

        // 2. Carica da file .vlx
        let percorso = if let Some(base) = &self.dir_base {
            let p = base.join(chiave);
            if p.exists() { p }
            else {
                let p2 = base.join(format!("{chiave}.vlx"));
                if p2.exists() { p2 } else { std::path::PathBuf::from(chiave) }
            }
        } else {
            let p = Path::new(chiave);
            if p.exists() { p.to_path_buf() }
            else { Path::new(&format!("{chiave}.vlx")).to_path_buf() }
        };

        let sorgente = std::fs::read_to_string(&percorso)
            .map_err(|_| format!("Impossibile importare '{}': modulo non trovato", chiave))?;

        let mut lex = crate::lexer::Lexer::new(&sorgente);
        let tokens = lex.tokenizza()?;
        let mut parser = crate::parser::Parser::new(tokens);
        let ast = parser.parse()?;

        let mut modulo_interp = Interprete::nuovo();
        modulo_interp.dir_base = percorso.parent().map(|p| p.to_path_buf());
        modulo_interp.esegui(&ast)?;

        let esportati: HashMap<String, Valore> = modulo_interp.env.vars.clone();
        env.set(nome.to_string(), Valore::Dizionario(esportati));
        Ok(())
    }

    pub fn valuta(&self, expr: &Expr, env: &mut Env) -> Result<Valore, String> {
        match expr {
            Expr::Numero(n) => Ok(Valore::Numero(*n)),
            Expr::Testo(s) => Ok(Valore::Testo(s.clone())),
            Expr::TestoInterpolato(segmenti) => {
                let mut risultato = String::new();
                for seg in segmenti {
                    match seg {
                        SegmentoInterpolato::Testo(t) => risultato.push_str(t),
                        SegmentoInterpolato::Espressione(e) => {
                            let v = self.valuta(e, env)?;
                            risultato.push_str(&format!("{v}"));
                        }
                    }
                }
                Ok(Valore::Testo(risultato))
            }
            Expr::Booleano(b) => Ok(Valore::Booleano(*b)),
            Expr::Nullo => Ok(Valore::Nullo),
            Expr::Array(elementi) => {
                let v: Result<Vec<_>, _> = elementi.iter().map(|e| self.valuta(e, env)).collect();
                Ok(Valore::Array(v?))
            }
            Expr::Dizionario(coppie) => {
                let mut m = HashMap::new();
                for (k, v) in coppie {
                    let chiave = match self.valuta(k, env)? {
                        Valore::Testo(s) => s,
                        Valore::Numero(n) => format!("{n}"),
                        other => format!("{other}"),
                    };
                    let valore = self.valuta(v, env)?;
                    m.insert(chiave, valore);
                }
                Ok(Valore::Dizionario(m))
            }
            Expr::Identificatore(nome) => {
                env.get(nome).ok_or_else(|| format!("Variabile '{nome}' non definita"))
            }
            Expr::Assegnazione { target, valore } => {
                let v = self.valuta(valore, env)?;
                self.assegna_target(target, v.clone(), env)?;
                Ok(v)
            }
            Expr::AssegnazioneComposta { target, op, valore } => {
                let corrente = self.valuta(target, env)?;
                let delta = self.valuta(valore, env)?;
                let nuovo = self.binop(&corrente, &op[..op.len()-1], &delta)?;
                self.assegna_target(target, nuovo.clone(), env)?;
                Ok(nuovo)
            }
            Expr::Incremento { target, op } => {
                let corrente = self.valuta(target, env)?;
                let nuovo = match &corrente {
                    Valore::Numero(n) => Valore::Numero(if op == "++" { n + 1.0 } else { n - 1.0 }),
                    _ => return Err("++ / -- richiedono un numero".to_string()),
                };
                self.assegna_target(target, nuovo, env)?;
                Ok(corrente)
            }
            Expr::BinOp { sinistra, op, destra } => {
                let l = self.valuta(sinistra, env)?;
                let r = self.valuta(destra, env)?;
                self.binop(&l, op, &r)
            }
            Expr::UnOp { op, operando } => {
                let v = self.valuta(operando, env)?;
                match op.as_str() {
                    "!" => Ok(Valore::Booleano(!self.e_vero(&v))),
                    "-" => match v {
                        Valore::Numero(n) => Ok(Valore::Numero(-n)),
                        _ => Err("'-' richiede un numero".to_string()),
                    },
                    _ => Err(format!("Operatore unario sconosciuto: {op}")),
                }
            }
            Expr::Chiamata { funzione, argomenti } => {
                let f = self.valuta(funzione, env)?;
                let args: Result<Vec<_>, _> = argomenti.iter().map(|a| self.valuta(a, env)).collect();
                let args = args?;
                self.chiama(f, args, env)
            }
            Expr::Accesso { oggetto, campo } => {
                let obj = self.valuta(oggetto, env)?;
                match obj {
                    Valore::Array(ref v) if campo == "lunghezza" => Ok(Valore::Numero(v.len() as f64)),
                    Valore::Testo(ref s) if campo == "lunghezza" => Ok(Valore::Numero(s.chars().count() as f64)),
                    Valore::Dizionario(ref m) => {
                        m.get(campo).cloned().ok_or_else(|| format!("Campo '{campo}' non trovato"))
                    }
                    _ => Err(format!("Campo '{campo}' non trovato su {}", obj)),
                }
            }
            Expr::Indice { oggetto, indice } => {
                let obj = self.valuta(oggetto, env)?;
                let idx = self.valuta(indice, env)?;
                match (obj, idx) {
                    (Valore::Array(v), Valore::Numero(i)) => {
                        let i = i as usize;
                        v.get(i).cloned().ok_or_else(|| format!("Indice {i} fuori range"))
                    }
                    (Valore::Testo(s), Valore::Numero(i)) => {
                        let i = i as usize;
                        s.chars().nth(i)
                            .map(|c| Valore::Testo(c.to_string()))
                            .ok_or_else(|| format!("Indice {i} fuori range"))
                    }
                    (Valore::Dizionario(m), Valore::Testo(k)) => {
                        m.get(&k).cloned().ok_or_else(|| format!("Chiave '{k}' non trovata"))
                    }
                    _ => Err("Indice non valido".to_string()),
                }
            }
            Expr::Lambda { parametri, corpo } => {
                Ok(Valore::Funzione {
                    parametri: parametri.clone(),
                    corpo: match corpo {
                        LambdaCorpo::Blocco(stmts) => CorpoFunzione::Blocco(stmts.clone()),
                        LambdaCorpo::Espressione(e) => CorpoFunzione::Espressione(e.clone()),
                    },
                    env: env.clone(),
                })
            }
        }
    }

    fn assegna_target(&self, target: &Expr, valore: Valore, env: &mut Env) -> Result<(), String> {
        match target {
            Expr::Identificatore(nome) => {
                if !env.assegna(nome, valore) {
                    return Err(format!("Variabile '{nome}' non dichiarata (usa 'variabile')"));
                }
                Ok(())
            }
            Expr::Indice { oggetto, indice } => {
                let idx = self.valuta(indice, env)?;
                match oggetto.as_ref() {
                    Expr::Identificatore(nome) => {
                        let mut obj = env.get(nome).ok_or_else(|| format!("'{nome}' non definita"))?;
                        match (&mut obj, idx) {
                            (Valore::Array(v), Valore::Numero(i)) => {
                                let i = i as usize;
                                if i < v.len() { v[i] = valore; }
                                else { return Err(format!("Indice {i} fuori range")); }
                            }
                            (Valore::Dizionario(m), Valore::Testo(k)) => { m.insert(k, valore); }
                            _ => return Err("Assegnazione indice non valida".to_string()),
                        }
                        env.assegna(nome, obj);
                        Ok(())
                    }
                    _ => Err("Assegnazione indice complessa non supportata".to_string()),
                }
            }
            Expr::Accesso { oggetto, campo } => {
                if let Expr::Identificatore(nome) = oggetto.as_ref() {
                    let mut obj = env.get(nome).ok_or_else(|| format!("'{nome}' non definita"))?;
                    if let Valore::Dizionario(ref mut m) = obj {
                        m.insert(campo.clone(), valore);
                        env.assegna(nome, obj);
                        Ok(())
                    } else {
                        Err(format!("'{nome}' non è un dizionario"))
                    }
                } else {
                    Err("Assegnazione campo complessa non supportata".to_string())
                }
            }
            _ => Err("Target di assegnazione non valido".to_string()),
        }
    }

    pub fn chiama(&self, f: Valore, args: Vec<Valore>, caller_env: &Env) -> Result<Valore, String> {
        match f {
            Valore::NativaFn(ref nome) => {
                // arr.filtra/mappa/riduci richiedono callback
                match nome.as_str() {
                    "arr.filtra" => return self.arr_filtra(args, caller_env),
                    "arr.mappa" => return self.arr_mappa(args, caller_env),
                    "arr.riduci" => return self.arr_riduci(args, caller_env),
                    _ => {}
                }
                chiama_nativa(nome, args)
            }
            Valore::Funzione { parametri, corpo, env: captured_env } => {
                if args.len() != parametri.len() {
                    return Err(format!("Attesi {} argomenti, trovati {}", parametri.len(), args.len()));
                }
                let mut base = caller_env.clone();
                for (k, v) in &captured_env.vars {
                    if !base.vars.contains_key(k) {
                        base.set(k.clone(), v.clone());
                    }
                }
                let mut child = Env::figlio(base);
                for (p, a) in parametri.iter().zip(args) {
                    child.set(p.clone(), a);
                }
                match corpo {
                    CorpoFunzione::Blocco(stmts) => {
                        match self.esegui_stmts(&stmts, &mut child)? {
                            (v, None) => Ok(v),
                            (_, Some(Segnale::Ritorna(v))) => Ok(v),
                            (_, Some(Segnale::Errore(e))) => Err(e),
                            _ => Ok(Valore::Nullo),
                        }
                    }
                    CorpoFunzione::Espressione(expr) => self.valuta(&expr, &mut child),
                }
            }
            _ => Err("Non è una funzione".to_string()),
        }
    }

    fn arr_filtra(&self, args: Vec<Valore>, env: &Env) -> Result<Valore, String> {
        match (args.first(), args.get(1)) {
            (Some(Valore::Array(v)), Some(f)) => {
                let f = f.clone();
                let v = v.clone();
                let mut risultato = Vec::new();
                for elem in v {
                    let r = self.chiama(f.clone(), vec![elem.clone()], env)?;
                    if self.e_vero(&r) { risultato.push(elem); }
                }
                Ok(Valore::Array(risultato))
            }
            _ => Err("arr.filtra(array, fn)".to_string()),
        }
    }

    fn arr_mappa(&self, args: Vec<Valore>, env: &Env) -> Result<Valore, String> {
        match (args.first(), args.get(1)) {
            (Some(Valore::Array(v)), Some(f)) => {
                let f = f.clone();
                let v = v.clone();
                let risultato: Result<Vec<_>, _> = v.into_iter()
                    .map(|elem| self.chiama(f.clone(), vec![elem], env))
                    .collect();
                Ok(Valore::Array(risultato?))
            }
            _ => Err("arr.mappa(array, fn)".to_string()),
        }
    }

    fn arr_riduci(&self, args: Vec<Valore>, env: &Env) -> Result<Valore, String> {
        match (args.first(), args.get(1), args.get(2)) {
            (Some(Valore::Array(v)), Some(f), acc_init) => {
                let f = f.clone();
                let v = v.clone();
                let mut acc = acc_init.cloned().unwrap_or(Valore::Nullo);
                for elem in v {
                    acc = self.chiama(f.clone(), vec![acc, elem], env)?;
                }
                Ok(acc)
            }
            _ => Err("arr.riduci(array, fn, iniziale)".to_string()),
        }
    }

    pub fn binop(&self, l: &Valore, op: &str, r: &Valore) -> Result<Valore, String> {
        match op {
            "+" => match (l, r) {
                (Valore::Numero(a), Valore::Numero(b)) => Ok(Valore::Numero(a + b)),
                (Valore::Testo(a), Valore::Testo(b)) => Ok(Valore::Testo(format!("{a}{b}"))),
                (Valore::Testo(a), b) => Ok(Valore::Testo(format!("{a}{b}"))),
                (a, Valore::Testo(b)) => Ok(Valore::Testo(format!("{a}{b}"))),
                (Valore::Array(a), Valore::Array(b)) => {
                    let mut v = a.clone(); v.extend(b.clone()); Ok(Valore::Array(v))
                }
                _ => Err(format!("'+' non supportato tra {l} e {r}")),
            },
            "-" => self.num_op(l, r, "-"),
            "*" => self.num_op(l, r, "*"),
            "/" => {
                if let (Valore::Numero(a), Valore::Numero(b)) = (l, r) {
                    if *b == 0.0 { return Err("Divisione per zero".to_string()); }
                    Ok(Valore::Numero(a / b))
                } else { Err("'/' richiede numeri".to_string()) }
            }
            "%" => self.num_op(l, r, "%"),
            "==" => Ok(Valore::Booleano(valori_uguali(l, r))),
            "!=" => Ok(Valore::Booleano(!valori_uguali(l, r))),
            "<" => self.confronto(l, r, "<"),
            ">" => self.confronto(l, r, ">"),
            "<=" => self.confronto(l, r, "<="),
            ">=" => self.confronto(l, r, ">="),
            "&&" => Ok(Valore::Booleano(self.e_vero(l) && self.e_vero(r))),
            "||" => Ok(Valore::Booleano(self.e_vero(l) || self.e_vero(r))),
            _ => Err(format!("Operatore sconosciuto: {op}")),
        }
    }

    fn num_op(&self, l: &Valore, r: &Valore, op: &str) -> Result<Valore, String> {
        match (l, r) {
            (Valore::Numero(a), Valore::Numero(b)) => Ok(Valore::Numero(match op {
                "-" => a - b, "*" => a * b, "%" => a % b, _ => unreachable!(),
            })),
            _ => Err(format!("'{op}' richiede numeri")),
        }
    }

    fn confronto(&self, l: &Valore, r: &Valore, op: &str) -> Result<Valore, String> {
        match (l, r) {
            (Valore::Numero(a), Valore::Numero(b)) => Ok(Valore::Booleano(match op {
                "<" => a < b, ">" => a > b, "<=" => a <= b, ">=" => a >= b, _ => unreachable!(),
            })),
            (Valore::Testo(a), Valore::Testo(b)) => Ok(Valore::Booleano(match op {
                "<" => a < b, ">" => a > b, "<=" => a <= b, ">=" => a >= b, _ => unreachable!(),
            })),
            _ => Err(format!("'{op}' richiede numeri o testi")),
        }
    }

    pub fn e_vero(&self, v: &Valore) -> bool {
        match v {
            Valore::Booleano(b) => *b,
            Valore::Nullo => false,
            Valore::Numero(n) => *n != 0.0,
            Valore::Testo(s) => !s.is_empty(),
            Valore::Array(a) => !a.is_empty(),
            _ => true,
        }
    }
}
