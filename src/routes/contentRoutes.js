const express = require('express');
const contentController = require('../controllers/contentController');
const { authenticate } = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/roleMiddleware');
const { uploadSingle } = require('../middlewares/uploadMiddleware');
const { validate, validateFile } = require('../middlewares/validateMiddleware');
const { uploadBody, myContentQuery } = require('../utils/schemas');
const { ROLES } = require('../utils/constants');

const router = express.Router();

// Order matters: multer parses multipart, then file + body are validated.
router.post(
  '/upload',
  authenticate,
  requireRole(ROLES.TEACHER),
  uploadSingle('file'),
  validateFile(),
  validate(uploadBody, 'body'),
  contentController.upload,
);

router.get(
  '/my-content',
  authenticate,
  requireRole(ROLES.TEACHER),
  validate(myContentQuery, 'query'),
  contentController.myContent,
);

module.exports = router;
