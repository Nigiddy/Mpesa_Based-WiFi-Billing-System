// Prisma client singleton
// BOOT-2 FIX: Enable structured query logging in development so slow queries are
// visible, and document how to tune the connection pool via DATABASE_URL params.
//
// Connection pool size is controlled by the connection_limit URL parameter:
//   DATABASE_URL="mysql://user:pass@host:3306/db?connection_limit=20&pool_timeout=30"
//
// Prisma's default is min(cpuCount*2+1, 10) — on a single-core VPS this can be
// as low as 3, which causes "Too many connections" errors under concurrent callbacks.

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV !== 'production'
    ? [
        { emit: 'stdout', level: 'query' },
        { emit: 'stdout', level: 'warn' },
        { emit: 'stdout', level: 'error' },
      ]
    : [
        { emit: 'stdout', level: 'warn' },
        { emit: 'stdout', level: 'error' },
      ],
});

module.exports = prisma;
