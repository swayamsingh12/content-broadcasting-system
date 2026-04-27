const ROLES = Object.freeze({
  PRINCIPAL: 'principal',
  TEACHER: 'teacher',
});

const CONTENT_STATUS = Object.freeze({
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
});

const ALLOWED_FILE_TYPES = Object.freeze(['jpg', 'jpeg', 'png', 'gif']);
const ALLOWED_MIME_TYPES = Object.freeze([
  'image/jpeg',
  'image/png',
  'image/gif',
]);

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const DEFAULT_ROTATION_DURATION_MIN = 5;

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

module.exports = {
  ROLES,
  CONTENT_STATUS,
  ALLOWED_FILE_TYPES,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  DEFAULT_ROTATION_DURATION_MIN,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
};
