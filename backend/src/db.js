const isProd = process.env.NODE_ENV === 'production';

let queryFn, closePoolFn, readyPromise;

if (isProd) {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  queryFn = async (text, params) => {
    const result = await pool.query(text, params);
    return result.rows;
  };
  closePoolFn = () => pool.end();
  readyPromise = pool.query('SELECT 1').then(() => {
    console.log('[db] Conectado ao PostgreSQL (producao).');
  });
} else {
  const { PGlite } = require('@electric-sql/pglite');
  const path = require('path');
  const fs = require('fs');
  const bcrypt = require('bcryptjs');
  const db = new PGlite(path.join(__dirname, '../.pnu-db'));
  readyPromise = (async () => {
    try {
      await db.query('SELECT 1 FROM profissional LIMIT 1');
      console.log('[db] Banco local ja inicializado.');
      return;
    } catch {}
    console.log('[db] Inicializando banco local...');
    const schemaPath = path.join(__dirname, '../../db/schema.sql');
    const seedPath = path.join(__dirname, '../../db/seed.sql');
    await db.exec(fs.readFileSync(schemaPath, 'utf8'));
    await db.exec(fs.readFileSync(seedPath, 'utf8'));
    const hash = await bcrypt.hash('pnu123', 10);
    await db.query('UPDATE profissional SET senha_hash = $1', [hash]);
    console.log('[db] Banco local pronto. Senha: pnu123');
  })();
  queryFn = async (text, params) => {
    await readyPromise;
    const result = await db.query(text, params);
    return result.rows;
  };
  closePoolFn = () => db.close();
}

module.exports = { query: queryFn, closePool: closePoolFn, readyPromise };