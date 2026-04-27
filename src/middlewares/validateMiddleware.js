const { error: errorResponse } = require('../utils/responseHelper');
const { validateUploadedFile } = require('../utils/schemas');

const SOURCES = ['body', 'query', 'params'];

const validate = (schema, source = 'body') => {
  if (!SOURCES.includes(source)) {
    throw new Error(`validate(): invalid source "${source}"`);
  }
  return (req, res, next) => {
    const data = req[source];
    // stripUnknown defends against mass-assignment via unexpected body keys.
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      convert: true,
      stripUnknown: true,
    });
    if (error) {
      const details = error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message.replace(/"/g, ''),
      }));
      return errorResponse(res, 400, 'Validation failed', details);
    }
    // Express 5 makes req.query a read-only getter; mutate in place if assignment fails.
    try {
      req[source] = value;
    } catch (_e) {
      Object.keys(req[source]).forEach((k) => delete req[source][k]);
      Object.assign(req[source], value);
    }
    return next();
  };
};

const validateFile = () => (req, res, next) => {
  const result = validateUploadedFile(req.file);
  if (result.error) {
    return errorResponse(res, 400, result.error);
  }
  return next();
};

module.exports = { validate, validateFile };
