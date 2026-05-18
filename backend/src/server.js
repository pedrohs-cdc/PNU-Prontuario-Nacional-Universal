// PNU — Prontuário Unificado | Backend (protótipo acadêmico).
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const { closePool } = require('./db');
const authRoutes = require('./routes/auth');
const pacienteRoutes = require('./routes/pacientes');
const { errorHandler } = require('./middleware/error');

const app = express();

app.use(cors());
app.use(express.json());

// Health check — útil no Render e em CI.
app.get('/health', (_req, res) =>
  res.json({ status: 'ok', projeto: 'PNU', env: process.env.NODE_ENV || 'development' })
);

app.use('/api/auth', authRoutes);
app.use('/api/pacientes', pacienteRoutes);

// Servir o build do frontend React (gerado por `npm run build` no /frontend).
// Em desenvolvimento o frontend roda no Vite (porta 5173) com proxy para a API;
// em produção o backend serve estes arquivos estáticos.
const FRONTEND_DIST = path.join(__dirname, '../../frontend/dist');
app.use(express.static(FRONTEND_DIST));

// SPA fallback: qualquer rota que não seja /api devolve o index.html do React.
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
});

// Handler de erro centralizado (deve ser o último middleware).
app.use(errorHandler);

const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
  console.log(`PNU backend | porta ${PORT} | env ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown: fecha HTTP server e pool do PG antes de sair.
process.on('SIGTERM', () => {
  server.close(async () => {
    await closePool();
    process.exit(0);
  });
});
