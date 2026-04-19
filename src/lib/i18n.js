// Internationalization module for Phajot.
// Dictionary data lives in shared/i18n-data.js (pure data, no imports).
// DB override via translations table — see src/lib/translations.js.
import { i18nData as i18n } from '../../shared/i18n-data';
import { getDBMap } from './translations';

export { i18n }; // raw re-export for MonthlyWrapModal

export const t = (lang, key) => {
  const db = getDBMap();
  if (db && db[key]) {
    const row = db[key];
    if (row[lang]) return row[lang];
    if (row.en) return row.en;
  }
  return i18n[lang]?.[key] || i18n.en[key] || key;
};
