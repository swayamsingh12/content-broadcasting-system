const { query } = require('../config/database');

// Project columns explicitly so password_hash never leaks unless the function name says it should.
const PUBLIC_COLUMNS = 'id, name, email, role, created_at';

const findByEmail = async (email) => {
  const sql = `
    SELECT id, name, email, password_hash, role, created_at
    FROM users
    WHERE email = $1
    LIMIT 1
  `;
  const { rows } = await query(sql, [email]);
  return rows[0] || null;
};

const findById = async (id) => {
  const sql = `SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = $1 LIMIT 1`;
  const { rows } = await query(sql, [id]);
  return rows[0] || null;
};

const create = async ({ name, email, passwordHash, role }) => {
  const sql = `
    INSERT INTO users (name, email, password_hash, role)
    VALUES ($1, $2, $3, $4)
    RETURNING ${PUBLIC_COLUMNS}
  `;
  const { rows } = await query(sql, [name, email, passwordHash, role]);
  return rows[0];
};

module.exports = { findByEmail, findById, create };
