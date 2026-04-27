const schedulingService = require('../services/schedulingService');
const { success } = require('../utils/responseHelper');
const { asyncHandler } = require('../middlewares/errorHandler');

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const live = asyncHandler(async (req, res) => {
  const { teacherId } = req.params;
  const subject = req.query.subject ? String(req.query.subject).trim() : null;

  // Per spec: invalid teacher UUID returns 200 + empty data, never 4xx.
  if (!teacherId || !UUID_RE.test(teacherId)) {
    return success(res, 200, 'No content available', []);
  }

  const items = await schedulingService.getLiveContentForTeacher({
    teacherId,
    subject,
  });

  if (items.length === 0) {
    return success(res, 200, 'No content available', []);
  }
  return success(res, 200, 'Live content', items);
});

module.exports = { live };
