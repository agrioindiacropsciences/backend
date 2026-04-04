import 'dotenv/config';
process.env.TZ = 'Asia/Kolkata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { prisma } from './lib/prisma';

import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { apiRouter } from './routes';

const app = express();
console.log('--- ADMIN LOGIN SYNC: OPTIMIZING DB CONNECTION POOL ---');
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static('public'));

// Security middleware
app.use(helmet());

// CORS configuration
const corsOrigins = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'];
const isDevelopment = process.env.NODE_ENV !== 'production';

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    // In development, allow all localhost origins
    if (isDevelopment && origin.includes('localhost')) {
      return callback(null, true);
    }

    // Check if origin is in allowed list
    if (corsOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Allow all origins for now (can restrict in production)
    return callback(null, true);
  },
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use(rateLimiter);

// Health check endpoint
app.get('/health', async (_req, res) => {
  let dbStatus = 'disconnected';
  let canConnect = false;

  try {
    // Quick probe to check database health
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
    canConnect = true;
  } catch (error) {
    console.error('🔴 Health Check DB Fail:', error);
    dbStatus = `error: ${error instanceof Error ? error.message : 'Unknown'}`;
  }

  const status = canConnect ? 200 : 503;
  
  res.status(status).json({
    success: canConnect,
    status: canConnect ? 'HEALTHY' : 'UNHEALTHY',
    database: dbStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: '1.0.1',
  });
});

// API routes
app.get('/api/debug-sync-check', (req, res) => res.json({ status: 'RELOADED_V3', time: new Date().toISOString() }));
app.use('/api/v1', apiRouter);

// 404 handler
app.use((req, res) => {
  console.log(`[404] Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found',
    },
  });
});

// Global error handler
app.use(errorHandler);

// Start server - bind to 0.0.0.0 for Railway/Docker compatibility
const HOST = '0.0.0.0';
app.listen(Number(PORT), HOST, () => {
  console.log(`🌾 Agrio India API Server running on ${HOST}:${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

export default app;

