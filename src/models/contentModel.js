const { query } = require('../config/database');

const insert = async ({
  title,
  description,
  subject,
  fileUrl,
  fileType,
  fileSize,
  uploadedBy,
  startTime,
  endTime,
  rotationDuration,
}) => {
  const sql = `
    INSERT INTO content
      (title, description, subject, file_url, file_type, file_size,
       uploaded_by, start_time, end_time, rotation_duration)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
  `;
  const params = [
    title,
    description || null,
    subject,
    fileUrl,
    fileType,
    fileSize,
    uploadedBy,
    startTime,
    endTime,
    rotationDuration,
  ];
  const { rows } = await query(sql, params);
  return rows[0];
};

const findById = async (id) => {
  const { rows } = await query('SELECT * FROM content WHERE id = $1', [id]);
  return rows[0] || null;
};

const findByTeacher = async ({
  teacherId,
  status,
  subject,
  page,
  limit,
}) => {
  const where = ['uploaded_by = $1'];
  const params = [teacherId];

  if (status) {
    params.push(status);
    where.push(`status = $${params.length}`);
  }
  if (subject) {
    params.push(subject);
    where.push(`LOWER(subject) = LOWER($${params.length})`);
  }

  const whereClause = where.join(' AND ');

  const countSql = `SELECT COUNT(*)::int AS total FROM content WHERE ${whereClause}`;
  const { rows: countRows } = await query(countSql, params);
  const totalItems = countRows[0].total;

  const offset = (page - 1) * limit;
  const listSql = `
    SELECT *
    FROM content
    WHERE ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;
  const { rows: items } = await query(listSql, [...params, limit, offset]);

  return { items, totalItems };
};

const findAllForPrincipal = async ({
  status,
  subject,
  teacherId,
  page,
  limit,
}) => {
  const where = [];
  const params = [];

  if (status) {
    params.push(status);
    where.push(`c.status = $${params.length}`);
  }
  if (subject) {
    params.push(subject);
    where.push(`LOWER(c.subject) = LOWER($${params.length})`);
  }
  if (teacherId) {
    params.push(teacherId);
    where.push(`c.uploaded_by = $${params.length}`);
  }
  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const countSql = `SELECT COUNT(*)::int AS total FROM content c ${whereClause}`;
  const { rows: countRows } = await query(countSql, params);
  const totalItems = countRows[0].total;

  const offset = (page - 1) * limit;
  const listSql = `
    SELECT c.*,
           u.name  AS teacher_name,
           u.email AS teacher_email
    FROM content c
    JOIN users u ON u.id = c.uploaded_by
    ${whereClause}
    ORDER BY c.created_at DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;
  const { rows: items } = await query(listSql, [...params, limit, offset]);

  return { items, totalItems };
};

// WHERE status = 'pending' enforces the one-way lifecycle.
const approve = async ({ contentId, approverId }) => {
  const sql = `
    UPDATE content
    SET status = 'approved',
        approved_by = $1,
        approved_at = CURRENT_TIMESTAMP,
        rejection_reason = NULL
    WHERE id = $2 AND status = 'pending'
    RETURNING *
  `;
  const { rows } = await query(sql, [approverId, contentId]);
  return rows[0] || null;
};

const reject = async ({ contentId, approverId, reason }) => {
  const sql = `
    UPDATE content
    SET status = 'rejected',
        approved_by = $1,
        approved_at = CURRENT_TIMESTAMP,
        rejection_reason = $2
    WHERE id = $3 AND status = 'pending'
    RETURNING *
  `;
  const { rows } = await query(sql, [approverId, reason, contentId]);
  return rows[0] || null;
};

const findLiveCandidates = async ({ teacherId, subject }) => {
  const params = [teacherId];
  let subjectFilter = '';
  if (subject) {
    params.push(subject);
    subjectFilter = `AND LOWER(subject) = LOWER($${params.length})`;
  }

  const sql = `
    SELECT *
    FROM content
    WHERE uploaded_by = $1
      AND status = 'approved'
      AND start_time IS NOT NULL
      AND end_time   IS NOT NULL
      AND start_time <= CURRENT_TIMESTAMP
      AND end_time   >= CURRENT_TIMESTAMP
      ${subjectFilter}
    ORDER BY subject ASC, created_at ASC
  `;
  const { rows } = await query(sql, params);
  return rows;
};

module.exports = {
  insert,
  findById,
  findByTeacher,
  findAllForPrincipal,
  approve,
  reject,
  findLiveCandidates,
};
