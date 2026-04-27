const approvalService = require('../services/approvalService');
const { query: dbQuery } = require('../config/database');
const { success } = require('../utils/responseHelper');
const { CONTENT_STATUS } = require('../utils/constants');
const { asyncHandler } = require('../middlewares/errorHandler');

const listAll = asyncHandler(async (req, res) => {
  const { status, subject, teacher, page, limit } = req.query;
  const { items, pagination } = await approvalService.listAll({
    status: status || null,
    subject: subject || null,
    teacherId: teacher || null,
    page,
    limit,
  });
  return success(res, 200, 'Content fetched', items, { pagination });
});

const listPending = asyncHandler(async (req, res) => {
  const { subject, teacher, page, limit } = req.query;
  const { items, pagination } = await approvalService.listAll({
    status: CONTENT_STATUS.PENDING,
    subject: subject || null,
    teacherId: teacher || null,
    page,
    limit,
  });
  return success(res, 200, 'Pending content fetched', items, { pagination });
});

const approve = asyncHandler(async (req, res) => {
  const updated = await approvalService.approve({
    contentId: req.params.id,
    principalId: req.user.id,
  });
  return success(res, 200, 'Content approved', updated);
});

const reject = asyncHandler(async (req, res) => {
  const updated = await approvalService.reject({
    contentId: req.params.id,
    principalId: req.user.id,
    reason: req.body.rejection_reason,
  });
  return success(res, 200, 'Content rejected', updated);
});

const subjectAnalytics = asyncHandler(async (req, res) => {
  const perSubject = await dbQuery(`
    SELECT subject,
           COUNT(*)::int                                       AS total,
           COUNT(*) FILTER (WHERE status = 'pending')::int     AS pending,
           COUNT(*) FILTER (WHERE status = 'approved')::int    AS approved,
           COUNT(*) FILTER (WHERE status = 'rejected')::int    AS rejected
    FROM content
    GROUP BY subject
    ORDER BY approved DESC, total DESC
  `);

  const mostActive =
    perSubject.rows.length > 0 && perSubject.rows[0].approved > 0
      ? perSubject.rows[0].subject
      : null;

  return success(res, 200, 'Subject analytics', {
    mostActiveSubject: mostActive,
    perSubject: perSubject.rows,
  });
});

// approval_rate excludes pending so the rate reflects decisions actually made.
const teacherAnalytics = asyncHandler(async (req, res) => {
  const { rows } = await dbQuery(`
    SELECT u.id,
           u.name,
           u.email,
           COUNT(c.id)::int                                          AS total_uploads,
           COUNT(c.id) FILTER (WHERE c.status = 'approved')::int     AS approved,
           COUNT(c.id) FILTER (WHERE c.status = 'rejected')::int     AS rejected,
           COUNT(c.id) FILTER (WHERE c.status = 'pending')::int      AS pending,
           CASE
             WHEN COUNT(c.id) FILTER (WHERE c.status IN ('approved','rejected')) = 0
               THEN NULL
             ELSE ROUND(
                    COUNT(c.id) FILTER (WHERE c.status = 'approved')::numeric
                    / COUNT(c.id) FILTER (WHERE c.status IN ('approved','rejected')) * 100,
                    2)
           END                                                       AS approval_rate_pct
    FROM users u
    LEFT JOIN content c ON c.uploaded_by = u.id
    WHERE u.role = 'teacher'
    GROUP BY u.id, u.name, u.email
    ORDER BY total_uploads DESC, u.name ASC
  `);
  return success(res, 200, 'Teacher analytics', rows);
});

module.exports = {
  listAll,
  listPending,
  approve,
  reject,
  subjectAnalytics,
  teacherAnalytics,
};
