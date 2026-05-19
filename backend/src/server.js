require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const { closePool, readyPromise } = require('./db');
const authRoutes     = require('./routes/auth');
const pacienteRoutes = require('./routes/pacientes');
const { errorHandler } = require('./middleware/error');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) =>
  res.json({ status: 'ok', projeto: 'PNU', env: process.env.NODE_ENV || 'development' })
);

app.use('/api/auth',      authRoutes);
app.use('/api/pacientes', pacienteRoutes);

const FRONTEND_DIST = path.join(__dirname, '../../frontend/dist');
app.use(express.static(FRONTEND_DIST));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
});

app.use(errorHandler);

const PORT = process.env.PORT || 3001;

readyPromise
  .then(() => {
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`PNU backend | porta ${PORT} | env ${process.env.NODE_ENV || 'development'}`);
    });
    process.on('SIGTERM', () => {
      server.close(async () => {
        await closePool();
        process.exit(0);
      });
    });
  })
  .catch((err) => {
    console.error('[db] Falha crítica na inicialização do banco:', err);
    process.exit(1);
  });