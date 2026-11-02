// Paste into Extensions > Apps Script in the new spreadsheet.
// Script Properties: SUGGESTIONS_WEBHOOK_SECRET = a new random secret (32+ characters).
const SPREADSHEET_ID = '1ONK0DZdlQOWWJeK-mU2VB2LcoSqchSZr06McTjz7hOc';
function doPost(e) {
 const reply = value => ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
 let lock;
 try {
  const body = JSON.parse(e.postData.contents);
  const secret = PropertiesService.getScriptProperties().getProperty('SUGGESTIONS_WEBHOOK_SECRET');
  if (!secret || secret.length < 32 || body.secret !== secret) return reply({ok:false});
  const phone = String(body.phone || '');
  if (!/^0[35789]\d{8}$/.test(phone)) return reply({ok:false});
  const wish = typeof body.wish === 'string' ? body.wish.trim() : '';
  if (!wish || wish.length > 1000 || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.requestId || '')) return reply({ok:false});
  lock = LockService.getScriptLock(); lock.waitLock(20000);
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Mong muốn');
  if (!sheet) return reply({ok:false});
  const last = sheet.getLastRow();
  if (last > 1 && sheet.getRange(2,3,last-1,1).createTextFinder(body.requestId).matchEntireCell(true).findNext()) return reply({ok:true});
  // Plain text format and leading apostrophe prevent user input becoming a formula.
  const safe = /^[=+\-@]/.test(wish) ? "'" + wish : wish;
  const row = last + 1;
  sheet.getRange(row,2).setNumberFormat('@');
  sheet.getRange(row,4).setNumberFormat('@');
  sheet.getRange(row,1,1,4).setValues([[Utilities.formatDate(new Date(),'Asia/Ho_Chi_Minh','yyyy-MM-dd HH:mm:ss'),safe,body.requestId,phone]]);
  sheet.getRange(row,2).setWrap(true);
  SpreadsheetApp.flush();
  return reply({ok:true});
 } catch (_) { return reply({ok:false}); }
 finally { if (lock && lock.hasLock()) lock.releaseLock(); }
}
