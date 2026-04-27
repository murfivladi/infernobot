const jwt = require('jsonwebtoken');

const SEGRETO = process.env.JWT_SECRET || (() => {
  console.warn('[ATTENZIONE] JWT_SECRET non impostato! Usa un segreto sicuro in produzione.');
  return 'vladx-segreto-cambiami';
})();

function creaToken(userId, username) {
  return jwt.sign({ sub: userId, username }, SEGRETO, { expiresIn: '30d' });
}

function verificaToken(token) {
  try {
    return jwt.verify(token, SEGRETO);
  } catch {
    return null;
  }
}

function middleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ errore: 'Token mancante' });
  }
  const claims = verificaToken(auth.slice(7));
  if (!claims) return res.status(401).json({ errore: 'Token non valido o scaduto' });
  req.utente = claims;
  next();
}

module.exports = { creaToken, verificaToken, middleware };
