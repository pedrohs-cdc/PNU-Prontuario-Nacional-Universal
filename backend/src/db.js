const { PGlite } = require('@electric-sql/pglite');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const isProd = process.env.NODE_ENV === 'production';

const db = isProd
  ? new PGlite()
  : new PGlite(path.join(__dirname, '..', '.pnu-db'));

const readyPromise = (async () => {
  try {
    await db.query('SELECT 1 FROM profissional LIMIT 1');
    console.log('[db] Banco já inicializado (modo dev com arquivo).');
    return;
  } catch {
    // Banco vazio — inicializa com schema + seed
  }
  console.log('[db] Inicializando banco de dados...');
  const schemaPath = path.join(__dirname, '../../db/schema.sql');
  const seedPath   = path.join(__dirname, '../../db/seed.sql');
  if (!fs.existsSync(schemaPath) || !fs.existsSync(seedPath)) {
    throw new Error('[db] schema.sql ou seed.sql não encontrado em db/');
  }
  await db.exec(fs.readFileSync(schemaPath, 'utf8'));
  await db.exec(fs.readFileSync(seedPath,   'utf8'));
  const senha = process.env.DEV_PASSWORD || 'pnu123';
  const hash  = await bcrypt.hash(senha, 10);
  await db.query('UPDATE profissional SET senha_hash = $1', [hash]);
  console.log(`[db] Banco pronto. Usuários de teste com senha "${senha}".`);
})();

async function query(text, params) {
  await readyPromise;
  const result = await db.query(text, params);
  return result.rows;
}

async function closePool() {
  await db.close();
}

module.exports = { pool: db, query, closePool, readyPromise };