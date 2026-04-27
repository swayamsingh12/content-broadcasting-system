const Joi = require('joi');
const {
  ROLES,
  CONTENT_STATUS,
  ALLOWED_FILE_TYPES,
  MAX_FILE_SIZE_BYTES,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  DEFAULT_ROTATION_DURATION_MIN,
} = require('./constants');

// Match pg's UUID type — being stricter than the DB just causes confusing 400s.
const uuid = Joi.string()
  .guid()
  .messages({ 'string.guid': '{{#label}} must be a valid UUID' });

const email = Joi.string().email({ tlds: { allow: false } }).lowercase().trim();
const password = Joi.string().min(6).max(100);
const name = Joi.string().trim().min(1).max(100);
const role = Joi.string().valid(...Object.values(ROLES));
const status = Joi.string().valid(...Object.values(CONTENT_STATUS));
const subjectField = Joi.string().trim().min(1).max(50);

const registerBody = Joi.object({
  name: name.required(),
  email: email.required(),
  password: password.required(),
  role: role.required(),
}).required();

const loginBody = Joi.object({
  email: email.required(),
  password: Joi.string().required(),
}).required();

const uploadBody = Joi.object({
  title: Joi.string().trim().min(1).max(255).required(),
  subject: subjectField.required(),
  description: Joi.string().trim().max(5000).allow('').optional(),
  start_time: Joi.date().iso().required(),
  end_time: Joi.date().iso().greater(Joi.ref('start_time')).required().messages({
    'date.greater': 'end_time must be after start_time',
  }),
  rotation_duration: Joi.number()
    .integer()
    .min(1)
    .max(24 * 60)
    .default(DEFAULT_ROTATION_DURATION_MIN),
}).required();

const myContentQuery = Joi.object({
  status: status.optional(),
  subject: subjectField.optional(),
  page: Joi.number().integer().min(1).default(DEFAULT_PAGE),
  limit: Joi.number().integer().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
});

const approvalListQuery = Joi.object({
  status: status.optional(),
  subject: subjectField.optional(),
  // Empty string allowed so an unset Postman variable ("?teacher=") is treated as "no filter".
  teacher: uuid.optional().allow(''),
  page: Joi.number().integer().min(1).default(DEFAULT_PAGE),
  limit: Joi.number().integer().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
});

const approvalIdParams = Joi.object({
  id: uuid.required(),
}).required();

const rejectBody = Joi.object({
  rejection_reason: Joi.string().trim().min(1).max(1000).required(),
}).required();

// Spec: invalid teacher UUID returns 200 + empty data, not 400 — controller does the shape check.
const liveQuery = Joi.object({
  subject: subjectField.optional(),
});
const liveParams = Joi.object({
  teacherId: Joi.string().required(),
});

const validateUploadedFile = (file) => {
  if (!file) {
    return { error: 'File is required (form field: "file")' };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { error: 'File too large. Max allowed size is 10MB.' };
  }
  const ext = (file.originalname.split('.').pop() || '').toLowerCase();
  if (!ALLOWED_FILE_TYPES.includes(ext)) {
    return {
      error: `Invalid file type. Allowed: ${ALLOWED_FILE_TYPES.join(', ')}`,
    };
  }
  return { value: file };
};

module.exports = {
  registerBody,
  loginBody,
  uploadBody,
  myContentQuery,
  approvalListQuery,
  approvalIdParams,
  rejectBody,
  liveQuery,
  liveParams,
  validateUploadedFile,
};
