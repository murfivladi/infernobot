/// Istruzioni bytecode della VM vladx
#[derive(Debug, Clone)]
pub enum Istruzione {
    // Stack
    CaricaNumero(f64),
    CaricaTesto(String),
    CaricaBool(bool),
    CaricaNullo,
    CaricaArray(usize),      // n elementi dallo stack
    CaricaDizionario(usize), // n coppie (chiave già come testo, valore) dallo stack

    // Variabili
    CaricaVar(String),
    StoreVar(String),

    // Operatori binari e unari
    BinOp(String),
    UnOp(String),

    // Controllo flusso
    Salta(usize),          // salta a indice assoluto
    SaltaSeFalso(usize),   // salta se TOS è falso
    Ritorna,
    Lancia,

    // Chiamate
    Chiama(usize),         // n argomenti
    CaricaFunzione {
        nome: String,
        parametri: Vec<String>,
        inizio: usize,     // indice della prima istruzione del corpo
        fine: usize,       // indice dopo l'ultima istruzione
    },

    // Accesso
    GetCampo(String),
    SetCampo(String),
    GetIndice,
    SetIndice,

    // Iterazione
    IteraInizio,           // prepara iteratore (TOS = array/dizionario/testo)
    IteraAvanti(usize),    // avanza iteratore; salta a fine se esaurito; push elemento
    IteraFine,

    // Misc
    Pop,
    Duplica,
    Stampa(usize),         // scrivi n valori
    Nop,
}

/// Chunk di bytecode
#[derive(Debug, Clone, Default)]
pub struct Chunk {
    pub istruzioni: Vec<Istruzione>,
    pub nome: String,
}

impl Chunk {
    pub fn nuovo(nome: &str) -> Self {
        Chunk { istruzioni: Vec::new(), nome: nome.to_string() }
    }

    pub fn emetti(&mut self, i: Istruzione) -> usize {
        self.istruzioni.push(i);
        self.istruzioni.len() - 1
    }

    /// Torna l'indice corrente (per patch di salti)
    pub fn posizione(&self) -> usize {
        self.istruzioni.len()
    }

    /// Aggiorna un'istruzione di salto con la destinazione corretta
    pub fn patcha_salto(&mut self, idx: usize, dest: usize) {
        match &mut self.istruzioni[idx] {
            Istruzione::Salta(d) | Istruzione::SaltaSeFalso(d) | Istruzione::IteraAvanti(d) => *d = dest,
            _ => {}
        }
    }
}
