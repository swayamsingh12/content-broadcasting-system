const { query } = require('../config/database');

// ON CONFLICT keeps this safe under concurrent approvals of the same subject.
const findOrCreate = async (subject) => {
  const sql = `
    INSERT INTO content_slots (subject)
    VALUES ($1)
    ON CONFLICT (subject) DO UPDATE SET subject = EXCLUDED.subject
    RETURNING *
  `;
  const { rows } = await query(sql, [subject]);
  return rows[0];
};

const findBySubject = async (subject) => {
  const { rows } = await query(
    'SELECT * FROM content_slots WHERE subject = $1 LIMIT 1',
    [subject],
  );
  return rows[0] || null;
};

module.exports = { findOrCreate, findBySubject };
