require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');

const { authenticate } = require('./middlewares/authMiddleware');
const { requireRole } = require('./middlewares/roleMiddleware');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');
const { ROLES } = require('./utils/constants');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const contentRoutes = require('./routes/contentRoutes');
const approvalRoutes = require('./routes/approvalRoutes');
const publicRoutes = require('./routes/publicRoutes');
const approvalController = require('./controllers/approvalController');
const { spec: swaggerSpec } = require('./config/swagger');
const { pool } = require('./config/database');

// Refuse to boot without these — silent defaults in prod = security bug.
const REQUIRED_ENV = [
  'JWT_SECRET',
  'DB_HOST', 'DB_USER', 'DB_NAME',
  'AWS_REGION', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_S3_BUCKET',
];
const assertRequiredEnv = () => {
  const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(
      `[boot] FATAL: missing required env vars: ${missing.join(', ')}`,
    );
    process.exit(1);
  }
};
assertRequiredEnv();

const app = express();

// Trust the first proxy hop so req.ip / rate limiter see the real client IP.
app.set('trust proxy', 1);

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'Content Broadcasting API',
    swaggerOptions: { persistAuthorization: true },
  }),
);

// Legacy fallback only — new uploads go straight to S3 and never touch this dir.
// Kept so any old DB rows with /uploads/<file> paths still resolve.
app.use(
  '/uploads',
  express.static(path.resolve(__dirname, '..', 'uploads'), {
    dotfiles: 'deny',
    index: false,
  }),
);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again in 15 minutes.',
    data: null,
  },
});

const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
    data: null,
  },
});

app.get('/health', (req, res) =>
  res.json({
    success: true,
    message: 'OK',
    data: { uptime: process.uptime() },
  }),
);

app.use('/auth/login', loginLimiter);
app.use('/auth', authRoutes);

app.use('/users', userRoutes);

// Public router mounts on /content first so /content/live/:teacherId bypasses auth.
app.use('/content', publicLimiter, publicRoutes);
app.use('/content', contentRoutes);

app.use('/approval', approvalRoutes);

const analyticsRouter = express.Router();
analyticsRouter.use(authenticate, requireRole(ROLES.PRINCIPAL));
analyticsRouter.get('/subjects', approvalController.subjectAnalytics);
analyticsRouter.get('/teachers', approvalController.teacherAnalytics);
app.use('/analytics', analyticsRouter);

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = parseInt(process.env.PORT, 10) || 3000;

let server = null;

const start = () => {
  server = app.listen(PORT, () => {
    console.log(`[server] listening on http://localhost:${PORT}`);
    console.log(`[server] Swagger UI:  http://localhost:${PORT}/api-docs`);
  });
};

const shutdown = async (signal) => {
  console.log(`[server] ${signal} received — shutting down`);
  // Hard 10s deadline so a stuck pool drain doesn't block the orchestrator.
  const killer = setTimeout(() => {
    console.error('[server] graceful shutdown timed out — forcing exit');
    process.exit(1);
  }, 10000);
  killer.unref();

  try {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await pool.end();
    console.log('[server] clean exit');
    process.exit(0);
  } catch (err) {
    console.error('[server] error during shutdown:', err);
    process.exit(1);
  }
};

// Per Node docs: log + exit on these — process state is undefined; let the orchestrator restart us.
process.on('unhandledRejection', (reason) => {
  console.error('[fatal] unhandledRejection:', reason);
  shutdown('unhandledRejection');
});
process.on('uncaughtException', (err) => {
  console.error('[fatal] uncaughtException:', err);
  shutdown('uncaughtException');
});
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

if (require.main === module) {
  start();
}

module.exports = app;
