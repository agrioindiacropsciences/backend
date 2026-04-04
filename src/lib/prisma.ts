import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Build DATABASE_URL from individual environment variables
function getDatabaseUrl(): string {
  // If DATABASE_URL is explicitly set, use it
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  // Otherwise, construct from individual variables
  const dialect = process.env.DB_DIALECT || 'postgres';
  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT || '5432';
  const database = process.env.DB_NAME;
  const username = process.env.DB_USER;
  const password = process.env.DB_PASS;

  // Validate required fields
  if (!host || !database || !username || !password) {
    const missing = [];
    if (!host) missing.push('DB_HOST');
    if (!database) missing.push('DB_NAME');
    if (!username) missing.push('DB_USER');
    if (!password) missing.push('DB_PASS');

    throw new Error(
      `Missing required database configuration: ${missing.join(', ')}. ` +
      `Either set DATABASE_URL or set individual DB_* environment variables.`
    );
  }

  // Construct connection URL with connection_limit
  const sslMode = process.env.DB_SSL === 'false' ? 'disable' : 'require';
  const connLimit = process.env.DB_CONNECTION_LIMIT || '5';
  const poolTimeout = process.env.DB_POOL_TIMEOUT || '30';
  const connectTimeout = process.env.DB_CONNECT_TIMEOUT || '30';
  const socketTimeout = process.env.DB_SOCKET_TIMEOUT || '60';

  return `postgresql://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}/${database}?sslmode=${sslMode}&connection_limit=${connLimit}&pool_timeout=${poolTimeout}&connect_timeout=${connectTimeout}&socket_timeout=${socketTimeout}`;
}

// Set DATABASE_URL in environment for Prisma (with connection pooling)
let databaseUrl = getDatabaseUrl();

// Standardize postgres:// to postgresql:// if needed
if (databaseUrl.startsWith('postgres://')) {
  databaseUrl = databaseUrl.replace('postgres://', 'postgresql://');
}

// Stronger enforcement of connection limits
const limit = process.env.DB_CONNECTION_LIMIT || '3';
const poolTimeout = process.env.DB_POOL_TIMEOUT || '30';
const connectTimeout = process.env.DB_CONNECT_TIMEOUT || '30';

if (!databaseUrl.includes('connection_limit')) {
  const sep = databaseUrl.includes('?') ? '&' : '?';
  databaseUrl += `${sep}connection_limit=${limit}`;
} else {
  databaseUrl = databaseUrl.replace(/connection_limit=\d+/, `connection_limit=${limit}`);
}

if (!databaseUrl.includes('pool_timeout')) {
  const sep = databaseUrl.includes('?') ? '&' : '?';
  databaseUrl += `${sep}pool_timeout=${poolTimeout}`;
}

if (!databaseUrl.includes('connect_timeout')) {
  const sep = databaseUrl.includes('?') ? '&' : '?';
  databaseUrl += `${sep}connect_timeout=${connectTimeout}`;
}

process.env.DATABASE_URL = databaseUrl;

export const prisma = global.prisma || new PrismaClient({
  log: [
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
  ],
});

// Type assertion to handle Prisma's complex event types in development
const anyPrisma = prisma as any;

// Handle connection events
anyPrisma.$on('error', (e: any) => {
  console.error('🔴 Prisma Critical Error:', e.message || e);
});

anyPrisma.$on('warn', (e: any) => {
  console.warn('🟡 Prisma Warning:', e.message || e);
});

// Graceful shutdown
if (process.env.NODE_ENV === 'production') {
  const gracefulShutdown = async () => {
    await prisma.$disconnect();
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
}

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;

