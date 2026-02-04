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

  // Construct connection URL with connection_limit to prevent "too many clients"
  const sslMode = process.env.DB_SSL === 'false' ? 'disable' : 'require';
  const connLimit = process.env.DB_CONNECTION_LIMIT || '5';
  return `${dialect}://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}/${database}?sslmode=${sslMode}&connection_limit=${connLimit}`;
}

// Set DATABASE_URL in environment for Prisma (with connection pooling)
let databaseUrl = getDatabaseUrl();
if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('connection_limit')) {
  const sep = process.env.DATABASE_URL.includes('?') ? '&' : '?';
  databaseUrl = `${process.env.DATABASE_URL}${sep}connection_limit=${process.env.DB_CONNECTION_LIMIT || '5'}`;
} else if (!databaseUrl.includes('connection_limit')) {
  const sep = databaseUrl.includes('?') ? '&' : '?';
  databaseUrl = `${databaseUrl}${sep}connection_limit=${process.env.DB_CONNECTION_LIMIT || '5'}`;
}
process.env.DATABASE_URL = databaseUrl;

export const prisma = global.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Handle connection errors
prisma.$on('error' as never, (e: any) => {
  console.error('Prisma connection error:', e);
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

