import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import pinoHttp from 'pino-http';
import { logger } from './logger';
import { supabaseAuthBridge } from './middleware/supabaseAuth';

// Routes
import authRouter from './routes/auth';
import portfoliosRouter from './routes/portfolios';
import holdingsRouter from './routes/holdings';
import goalsRouter from './routes/goals';
import analysisRouter from './routes/analysis';
import reportsRouter from './routes/reports';
import stocksRouter from './routes/stocks';
import butterflyRouter from './routes/butterfly';
import copilotRouter from './routes/copilot';

const app = express();

// ============================================================
// Security middleware
// ============================================================
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
    },
  },
}));

const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:5173').split(',');
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
}));

app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ============================================================
// Request logging (no sensitive data)
// ============================================================
app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/api/health' } }));

// ============================================================
// Rate limiting
// ============================================================
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later.' },
  skip: () => process.env.NODE_ENV === 'test',
});

app.use('/api', globalLimiter);

// ============================================================
// Session (Persistent PostgreSQL Store)
// ============================================================
const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret && process.env.NODE_ENV === 'production') {
  throw new Error('SESSION_SECRET environment variable must be set in production');
}

const PgSession = connectPgSimple(session);
const sessionStore = process.env.DATABASE_URL
  ? new PgSession({
      conString: process.env.DATABASE_URL,
      tableName: 'session',
      createTableIfMissing: true,
    })
  : undefined;

app.use(session({
  store: sessionStore,
  secret: sessionSecret ?? 'dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days persistent login
  },
  name: 'shocklens.sid',
}));

// Supabase bearer sessions are validated and mapped to the existing Prisma user model.
app.use('/api', supabaseAuthBridge);

// ============================================================
// Routes
// ============================================================
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

app.use('/api/auth', authLimiter, authRouter);
app.use('/api/portfolios', portfoliosRouter);
app.use('/api/holdings', holdingsRouter);
app.use('/api/goals', goalsRouter);
app.use('/api/analysis', analysisRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/stocks', stocksRouter);
app.use('/api/butterfly', butterflyRouter);
app.use('/api/copilot', copilotRouter);

// ============================================================
// Error handling
// ============================================================
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof Error) {
    logger.error({ err: err.message }, 'Unhandled error');
    const status = (err as NodeJS.ErrnoException & { status?: number }).status ?? 500;
    res.status(status).json({
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    });
  } else {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default app;
