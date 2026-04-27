const { query } = require('../config/database');

// Compute next_order inside the INSERT to avoid a SELECT MAX → INSERT race under parallel approvals.
const insertForSlot = async ({ contentId, slotId, duration }) => {
  const sql = `
    INSERT INTO content_schedules (content_id, slot_id, rotation_order, duration)
    VALUES (
      $1,
      $2,
      COALESCE(
        (SELECT MAX(rotation_order) + 1 FROM content_schedules WHERE slot_id = $2),
        1
      ),
      $3
    )
    RETURNING *
  `;
  const { rows } = await query(sql, [contentId, slotId, duration]);
  return rows[0];
};

const findBySlot = async (slotId) => {
  const sql = `
    SELECT * FROM content_schedules
    WHERE slot_id = $1
    ORDER BY rotation_order ASC
  `;
  const { rows } = await query(sql, [slotId]);
  return rows;
};

module.exports = { insertForSlot, findBySlot };
