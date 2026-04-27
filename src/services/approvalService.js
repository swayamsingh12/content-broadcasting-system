const { pool } = require('../config/database');
const contentModel = require('../models/contentModel');
const { AppError } = require('../middlewares/errorHandler');
const { presignContent, presignContentList } = require('../utils/presignHelper');

const listAll = async ({ status, subject, teacherId, page, limit }) => {
  const { items, totalItems } = await contentModel.findAllForPrincipal({
    status: status || null,
    subject: subject || null,
    teacherId: teacherId || null,
    page,
    limit,
  });
  const totalPages = Math.ceil(totalItems / limit);
  return {
    items: await presignContentList(items),
    pagination: { currentPage: page, totalPages, totalItems, limit },
  };
};

// Approve does THREE writes (content, slot, schedule) — wrap in a transaction
// so partial state cannot leak out if any step throws.
const approve = async ({ contentId, principalId }) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const updateSql = `
      UPDATE content
      SET status = 'approved',
          approved_by = $1,
          approved_at = CURRENT_TIMESTAMP,
          rejection_reason = NULL
      WHERE id = $2 AND status = 'pending'
      RETURNING *
    `;
    const { rows } = await client.query(updateSql, [principalId, contentId]);
    if (rows.length === 0) {
      await client.query('ROLLBACK');
      // Disambiguate "missing" vs "wrong status" so the principal sees a useful message.
      const probe = await client.query(
        'SELECT status FROM content WHERE id = $1',
        [contentId],
      );
      if (probe.rows.length === 0) {
        throw new AppError('Content not found', 404);
      }
      throw new AppError(
        `Cannot approve content currently in '${probe.rows[0].status}' state`,
        400,
      );
    }
    const approvedContent = rows[0];

    const slotSql = `
      INSERT INTO content_slots (subject)
      VALUES ($1)
      ON CONFLICT (subject) DO UPDATE SET subject = EXCLUDED.subject
      RETURNING *
    `;
    const { rows: slotRows } = await client.query(slotSql, [
      approvedContent.subject,
    ]);
    const slot = slotRows[0];

    const scheduleSql = `
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
    await client.query(scheduleSql, [
      approvedContent.id,
      slot.id,
      approvedContent.rotation_duration,
    ]);

    await client.query('COMMIT');
    return presignContent(approvedContent);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
};

const reject = async ({ contentId, principalId, reason }) => {
  const updated = await contentModel.reject({
    contentId,
    approverId: principalId,
    reason: reason.trim(),
  });
  if (!updated) {
    const existing = await contentModel.findById(contentId);
    if (!existing) throw new AppError('Content not found', 404);
    throw new AppError(
      `Cannot reject content currently in '${existing.status}' state`,
      400,
    );
  }
  return presignContent(updated);
};

module.exports = { listAll, approve, reject };
