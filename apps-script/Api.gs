/**
 * Api.gs – Schnittstelle für die Trainingslog-iPhone-App
 *
 * Als EIGENE Datei neben deinem bestehenden Code.gs anlegen (Dateien → + → Script → „Api“).
 * Dein vorhandener Code (z. B. für den Button) bleibt unverändert.
 * Alle internen Namen beginnen mit TLAPI_, damit nichts mit deinem Code kollidiert.
 * Global sichtbar sind nur: doGet, doPost, setupKey.
 * Mobility-Routine: eigene Zeilen mit Workout „Mobility“, Spalte J „Gemacht“ = ✓.
 *
 * Einrichtung (Details in der Anleitung):
 *  1. Funktion „setupKey“ einmal ausführen, Schlüssel aus dem Ausführungsprotokoll kopieren.
 *  2. Bereitstellen → Neue Bereitstellung → Web-App, Ausführen als: Ich, Zugriff: Jeder.
 *
 * Gibt es für Datum + Workout + Übung schon eine Zeile, wird sie aktualisiert,
 * sonst unten angehängt. Mehrfaches Senden erzeugt keine Duplikate.
 */

const TLAPI_LOG_SHEET = 'Trainingslog';
const TLAPI_PLAN_SHEET = 'Trainingsplan';
const TLAPI_FIRST_ROW = 4; // Zeilen 1–3 sind Titel und Kopfzeile
const TLAPI_MOB_WORKOUT = 'Mobility';          // Mobility-Zeilen: Spalte B
const TLAPI_MOB_EX = 'Mobility-Routine';       // Spalte C; Spalte J (Gemacht) = ✓

/** Einmal ausführen: erzeugt den geheimen App-Schlüssel (erneut ausführen = neuer Schlüssel). */
function setupKey() {
  const key = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, 8);
  PropertiesService.getScriptProperties().setProperty('TLAPI_KEY', key);
  Logger.log('Dein App-Schlüssel: ' + key);
}

function doGet(e) {
  return TLAPI_handle_((e && e.parameter) || {}, false);
}

function doPost(e) {
  let body;
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return TLAPI_json_({ ok: false, error: 'bad_request', message: 'Ungültige Anfrage' });
  }
  return TLAPI_handle_(body, true);
}

function TLAPI_handle_(p, isPost) {
  try {
    const key = PropertiesService.getScriptProperties().getProperty('TLAPI_KEY');
    if (!key) return TLAPI_json_({ ok: false, error: 'no_key' });
    if (String(p.key || '') !== key) return TLAPI_json_({ ok: false, error: 'unauthorized' });

    if (p.action === 'ping') return TLAPI_json_({ ok: true });
    if (p.action === 'load') return TLAPI_json_(TLAPI_load_());
    if (p.action === 'save' && isPost) return TLAPI_json_(TLAPI_save_(p));
    if (p.action === 'mobility' && isPost) return TLAPI_json_(TLAPI_mobility_(p));
    return TLAPI_json_({ ok: false, error: 'bad_request', message: 'Unbekannte Aktion' });
  } catch (err) {
    return TLAPI_json_({ ok: false, error: 'server', message: String((err && err.message) || err) });
  }
}

function TLAPI_load_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tz = ss.getSpreadsheetTimeZone();
  const sh = ss.getSheetByName(TLAPI_LOG_SHEET);
  if (!sh) throw new Error('Blatt „' + TLAPI_LOG_SHEET + '“ nicht gefunden');

  const last = TLAPI_lastRow_(sh);
  const rows = last >= TLAPI_FIRST_ROW
    ? sh.getRange(TLAPI_FIRST_ROW, 1, last - TLAPI_FIRST_ROW + 1, 10).getValues()
    : [];

  const log = [];
  const mob = []; // Tage, an denen die Mobility-Routine gemacht wurde
  rows.forEach(function (r) {
    const date = TLAPI_toISO_(r[0], tz);
    const ex = String(r[2] || '').trim();
    if (!date || !ex) return;
    if (String(r[1] || '').trim() === TLAPI_MOB_WORKOUT) {
      if (TLAPI_done_(r[9]) && mob.indexOf(date) < 0) mob.push(date);
      return;
    }
    log.push({
      date: date,
      workout: String(r[1] || '').trim(),
      ex: ex,
      sets: [[TLAPI_num_(r[3]), TLAPI_num_(r[4])], [TLAPI_num_(r[5]), TLAPI_num_(r[6])], [TLAPI_num_(r[7]), TLAPI_num_(r[8])]]
    });
  });

  const planSheet = ss.getSheetByName(TLAPI_PLAN_SHEET);
  const plan = planSheet
    ? planSheet.getRange(1, 1, Math.min(planSheet.getMaxRows(), 100), 6).getDisplayValues()
    : [];

  return { ok: true, log: log, plan: plan, mob: mob };
}

function TLAPI_save_(p) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(p.date || '')) || !p.workout || !Array.isArray(p.entries)) {
    return { ok: false, error: 'bad_request', message: 'Datum, Workout oder Übungen fehlen' };
  }
  const workout = String(p.workout).trim();

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const tz = ss.getSpreadsheetTimeZone();
    const sh = ss.getSheetByName(TLAPI_LOG_SHEET);
    const last = TLAPI_lastRow_(sh);

    // Index vorhandener Zeilen: Datum|Workout|Übung → Zeilennummer
    const index = {};
    if (last >= TLAPI_FIRST_ROW) {
      sh.getRange(TLAPI_FIRST_ROW, 1, last - TLAPI_FIRST_ROW + 1, 3).getValues().forEach(function (r, i) {
        const d = TLAPI_toISO_(r[0], tz);
        if (d) index[d + '|' + String(r[1] || '').trim() + '|' + String(r[2] || '').trim()] = TLAPI_FIRST_ROW + i;
      });
    }

    const serial = TLAPI_serial_(p.date);
    let next = last + 1;
    let updated = 0, appended = 0;

    p.entries.forEach(function (en) {
      const ex = String((en && en.ex) || '').trim();
      if (!ex) return;
      const sets = Array.isArray(en.sets) ? en.sets.slice(0, 3) : [];
      while (sets.length < 3) sets.push([null, null]);

      const vals = [serial, workout, ex];
      sets.forEach(function (s) {
        vals.push(TLAPI_cell_(s && s[0]));
        vals.push(TLAPI_cell_(s && s[1]));
      });

      const k = p.date + '|' + workout + '|' + ex;
      let row = index[k];
      if (row) {
        sh.getRange(row, 1, 1, 9).setValues([vals]);
        updated++;
      } else {
        row = next++;
        if (row > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), 200);
        if (row > TLAPI_FIRST_ROW) {
          sh.getRange(row - 1, 1, 1, 9).copyTo(sh.getRange(row, 1, 1, 9), SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
        }
        sh.getRange(row, 1, 1, 9).setValues([vals]);
        index[k] = row;
        appended++;
      }
      sh.getRange(row, 1).setNumberFormat('dd.mm.yyyy');
    });

    SpreadsheetApp.flush();
    return { ok: true, updated: updated, appended: appended };
  } finally {
    lock.releaseLock();
  }
}

/** Mobility-Routine für einen Tag als gemacht markieren oder zurücknehmen. */
function TLAPI_mobility_(p) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(p.date || ''))) {
    return { ok: false, error: 'bad_request', message: 'Datum fehlt' };
  }
  const done = p.done === true || p.done === 'true';

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const tz = ss.getSpreadsheetTimeZone();
    const sh = ss.getSheetByName(TLAPI_LOG_SHEET);
    const last = TLAPI_lastRow_(sh);

    let row = 0;
    if (last >= TLAPI_FIRST_ROW) {
      sh.getRange(TLAPI_FIRST_ROW, 1, last - TLAPI_FIRST_ROW + 1, 3).getValues().forEach(function (r, i) {
        if (TLAPI_toISO_(r[0], tz) === p.date && String(r[1] || '').trim() === TLAPI_MOB_WORKOUT) row = TLAPI_FIRST_ROW + i;
      });
    }

    if (row) {
      sh.getRange(row, 10).setValue(done ? '✓' : '');
    } else if (done) {
      row = last + 1;
      if (row > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), 200);
      if (row > TLAPI_FIRST_ROW) {
        sh.getRange(row - 1, 1, 1, 9).copyTo(sh.getRange(row, 1, 1, 9), SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
      }
      sh.getRange(row, 1, 1, 3).setValues([[TLAPI_serial_(p.date), TLAPI_MOB_WORKOUT, TLAPI_MOB_EX]]);
      sh.getRange(row, 1).setNumberFormat('dd.mm.yyyy');
      sh.getRange(row, 10).setValue('✓');
    }
    SpreadsheetApp.flush();
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

/* ---------- Helfer (nur für die App-Schnittstelle) ---------- */

function TLAPI_done_(v) {
  const s = String(v === null || v === undefined ? '' : v).trim().toLowerCase();
  return s === '✓' || s === 'x' || s === 'true' || s === '1' || s === 'ja';
}

function TLAPI_lastRow_(sh) {
  const n = sh.getLastRow();
  if (n < TLAPI_FIRST_ROW) return TLAPI_FIRST_ROW - 1;
  const col = sh.getRange(1, 1, n, 1).getValues();
  for (let i = n - 1; i >= TLAPI_FIRST_ROW - 1; i--) {
    if (col[i][0] !== '' && col[i][0] !== null) return i + 1;
  }
  return TLAPI_FIRST_ROW - 1;
}

function TLAPI_num_(v) {
  if (v === '' || v === null || v === undefined) return null;
  if (typeof v === 'number') return v;
  const x = Number(String(v).trim().replace(',', '.'));
  return isFinite(x) ? x : null;
}

function TLAPI_cell_(v) {
  if (v === null || v === undefined || v === '') return '';
  const x = Number(v);
  return isFinite(x) ? x : '';
}

function TLAPI_toISO_(v, tz) {
  if (v instanceof Date) return Utilities.formatDate(v, tz, 'yyyy-MM-dd');
  if (typeof v === 'number' && v > 0) {
    return Utilities.formatDate(new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400000), 'UTC', 'yyyy-MM-dd');
  }
  const s = String(v || '').trim();
  let m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? m[0] : null;
}

/** Datum als Tabellen-Seriennummer: unabhängig von Zeitzonen. */
function TLAPI_serial_(iso) {
  const p = iso.split('-').map(Number);
  return Math.round((Date.UTC(p[0], p[1] - 1, p[2]) - Date.UTC(1899, 11, 30)) / 86400000);
}

function TLAPI_json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
