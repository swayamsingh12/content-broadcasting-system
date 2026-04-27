const path = require('path');
const multer = require('multer');
const {
  MAX_FILE_SIZE_BYTES,
  ALLOWED_MIME_TYPES,
  ALLOWED_FILE_TYPES,
} = require('../utils/constants');
const { error } = require('../utils/responseHelper');

// memoryStorage so the service can stream the buffer to S3 — no disk IO.
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  const mimeOk = ALLOWED_MIME_TYPES.includes(file.mimetype);
  const extOk = ALLOWED_FILE_TYPES.includes(ext);
  if (!mimeOk || !extOk) {
    const err = new Error(
      `Invalid file type. Allowed: ${ALLOWED_FILE_TYPES.join(', ')}`,
    );
    err.status = 400;
    return cb(err);
  }
  return cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
});

const uploadSingle = (fieldName) => (req, res, next) => {
  upload.single(fieldName)(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return error(res, 400, 'File too large. Max allowed size is 10MB.');
      }
      return error(res, 400, `Upload error: ${err.message}`);
    }
    return error(res, err.status || 400, err.message || 'Upload failed');
  });
};

module.exports = { uploadSingle };
