const { Pool } = require('pg');
require('dotenv').config();

// Managed Postgres (Render, Heroku, Supabase) requires SSL. Set DB_SSL=true in those envs.
const ssl =
  process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'content_broadcasting',
  max: parseInt(process.env.DB_POOL_MAX, 10) || 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl,
});

pool.on('error', (err) => {
  console.error('[db] unexpected pool error:', err.message);
});

const query = (text, params) => pool.query(text, params);

module.exports = { pool, query };
