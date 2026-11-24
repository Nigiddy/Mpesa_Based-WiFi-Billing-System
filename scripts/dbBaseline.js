/**
 * scripts/dbBaseline.js
 *
 * Inspects the existing host MySQL database and captures baseline metrics
 * prior to Docker migration using direct MySQL driver.
 */
'use strict';

require('dotenv').config();
const mysql = require('mysql2/promise');

async function main() {
  let host = process.env.DB_HOST || '127.0.0.1';
  let user = process.env.DB_USER || 'wifiadmin';
  let password = process.env.DB_PASSWORD || 'KibaruaniDB';
  let database = process.env.DB_NAME || 'wifi_billing';
  let port = parseInt(process.env.DB_PORT || '3306', 10);

  // If DATABASE_URL is set, parse credentials directly from it
  if (process.env.DATABASE_URL) {
    try {
      const parsed = new URL(process.env.DATABASE_URL);
      user = decodeURIComponent(parsed.username || user);
      password = decodeURIComponent(parsed.password || password);
      host = parsed.hostname || host;
      port = parseInt(parsed.port || String(port), 10);
      database = (parsed.pathname || '').replace(/^\//, '') || database;
    } catch (_) {}
  }

  // Fallback to KibaruaniDB if password is still placeholder
  if (password === 'your_secure_password') {
    password = 'KibaruaniDB';
  }

  console.log(`🔍 Connecting to MySQL database at ${host}:${port}/${database} as user '${user}'...`);

  let connection;
  try {
    connection = await mysql.createConnection({
      host: host === 'localhost' ? '127.0.0.1' : host,
      port,
      user,
      password,
      database,
    });
    console.log('✅ Connected successfully to existing MySQL database.');

    // 1. Fetch SystemSettings
    const [settingsRows] = await connection.execute('SELECT * FROM SystemSettings WHERE id = 1');
    const settings = settingsRows[0] || null;
    console.log('\n⚙️  SystemSettings singleton:');
    console.log(`   Network Name:     ${settings?.networkName ?? 'N/A'}`);
    console.log(`   Maintenance Mode: ${settings?.maintenanceMode ? 'ENABLED ⚠️' : 'DISABLED'}`);

    // 2. Fetch row counts for all tables
    const tables = [
      'admin',
      'auditlog',
      'payment',
      'paymentstatusupdate',
      'session',
      'supportrequest',
      'user',
      'voucher',
      'voucherredemption',
      'SystemSettings',
      '_prisma_migrations',
    ];

    console.log('\n📊 Baseline Table Row Counts:');
    const counts = {};
    for (const table of tables) {
      try {
        const [rows] = await connection.execute(`SELECT COUNT(*) as cnt FROM \`${table}\``);
        counts[table] = rows[0].cnt;
      } catch (err) {
        counts[table] = `ERROR: ${err.message}`;
      }
    }
    console.table(counts);

    // 3. Fetch applied Prisma migrations
    console.log('\n📜 Applied Prisma Migrations:');
    try {
      const [migrations] = await connection.execute(
        'SELECT id, migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at ASC'
      );
      migrations.forEach((m, idx) => {
        console.log(`   [${idx + 1}] ${m.migration_name} (Finished: ${m.finished_at})`);
      });
    } catch (mErr) {
      console.warn('⚠️  Could not read _prisma_migrations:', mErr.message);
    }

    console.log('\n✅ Baseline inspection complete.');
  } catch (err) {
    console.error('❌ Database baseline inspection failed:', err.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

main();
