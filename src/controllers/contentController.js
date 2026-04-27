const contentService = require('../services/contentService');
const { success } = require('../utils/responseHelper');
const { asyncHandler } = require('../middlewares/errorHandler');

const upload = asyncHandler(async (req, res) => {
  const created = await contentService.upload({
    teacherId: req.user.id,
    body: req.body,
    file: req.file,
  });
  return success(res, 201, 'Content uploaded successfully', created);
});

const myContent = asyncHandler(async (req, res) => {
  const { items, pagination } = await contentService.listForTeacher({
    teacherId: req.user.id,
    query: req.query,
  });
  return success(res, 200, 'Content fetched', items, { pagination });
});

module.exports = { upload, myContent };
