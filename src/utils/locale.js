const fs = require('fs');
const path = require('path');

const locales = {};
const localesPath = path.join(__dirname, '../locales');

fs.readdirSync(localesPath).forEach(file => {
  if (file.endsWith('.json')) {
    locales[file.slice(0, -5)] = JSON.parse(fs.readFileSync(path.join(localesPath, file), 'utf8'));
  }
});

/**
 * Translate a key with optional interpolation.
 * Falls back to 'ru', then to the key itself.
 * @param {string} key
 * @param {string} [locale='ru']
 * @param {Record<string,string|number>} [params={}]
 */
function t(key, locale = 'ru', params = {}) {
  let text = locales[locale]?.[key] ?? locales.ru?.[key] ?? key;
  for (const [k, v] of Object.entries(params)) {
    text = text.replaceAll(`{${k}}`, String(v));
  }
  return text;
}

module.exports = { t, locales };
