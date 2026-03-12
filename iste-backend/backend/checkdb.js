const Database = require('better-sqlite3');
const path = require('path');

const db = new Database('./database.sqlite');

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('=== TABLOLAR ===');
console.table(tables);

db.close();