// OpenAPI 3.0 spec — mounted at /api-docs by app.js via swagger-ui-express.
const okEnvelope = (dataSchema, message = 'OK') => ({
  type: 'object',
  required: ['success', 'message', 'data'],
  properties: {
    success: { type: 'boolean', example: true },
    message: { type: 'string', example: message },
    data: dataSchema,
  },
});

const errorEnvelope = (msg) => ({
  type: 'object',
  required: ['success', 'message'],
  properties: {
    success: { type: 'boolean', example: false },
    message: { type: 'string', example: msg },
    data: {
      nullable: true,
      description:
        'Optional payload. For validation failures, an array of { field, message }.',
    },
  },
});

const paginationSchema = {
  type: 'object',
  properties: {
    currentPage: { type: 'integer', example: 1 },
    totalPages: { type: 'integer', example: 5 },
    totalItems: { type: 'integer', example: 48 },
    limit: { type: 'integer', example: 10 },
  },
};

const userSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string', example: 'Aanya Sharma' },
    email: { type: 'string', format: 'email', example: 'aanya@school.edu' },
    role: { type: 'string', enum: ['principal', 'teacher'] },
    created_at: { type: 'string', format: 'date-time' },
  },
};

const contentSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    title: { type: 'string' },
    description: { type: 'string', nullable: true },
    subject: { type: 'string' },
    file_url: { type: 'string' },
    file_type: { type: 'string', enum: ['jpg', 'jpeg', 'png', 'gif'] },
    file_size: { type: 'integer' },
    uploaded_by: { type: 'string', format: 'uuid' },
    status: {
      type: 'string',
      enum: ['pending', 'approved', 'rejected'],
    },
    rejection_reason: { type: 'string', nullable: true },
    approved_by: { type: 'string', format: 'uuid', nullable: true },
    approved_at: { type: 'string', format: 'date-time', nullable: true },
    start_time: { type: 'string', format: 'date-time' },
    end_time: { type: 'string', format: 'date-time' },
    rotation_duration: { type: 'integer', example: 5 },
    created_at: { type: 'string', format: 'date-time' },
  },
};

const liveContentSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    title: { type: 'string' },
    description: { type: 'string', nullable: true },
    subject: { type: 'string' },
    file_url: { type: 'string' },
    file_type: { type: 'string' },
    rotation_duration: { type: 'integer' },
    start_time: { type: 'string', format: 'date-time' },
    end_time: { type: 'string', format: 'date-time' },
  },
};

// Common responses
const responses = {
  ValidationError: {
    description: 'Validation failed',
    content: {
      'application/json': {
        schema: errorEnvelope('Validation failed'),
        example: {
          success: false,
          message: 'Validation failed',
          data: [{ field: 'email', message: 'email must be a valid email' }],
        },
      },
    },
  },
  Unauthorized: {
    description: 'Missing or invalid token',
    content: {
      'application/json': {
        schema: errorEnvelope('Invalid or expired token'),
      },
    },
  },
  Forbidden: {
    description: 'Caller does not have the required role',
    content: {
      'application/json': {
        schema: errorEnvelope('Forbidden'),
      },
    },
  },
  NotFound: {
    description: 'Resource not found',
    content: {
      'application/json': {
        schema: errorEnvelope('Not found'),
      },
    },
  },
  Conflict: {
    description: 'Resource already exists',
    content: {
      'application/json': {
        schema: errorEnvelope('Resource already exists'),
      },
    },
  },
  TooManyRequests: {
    description: 'Rate limit exceeded',
    content: {
      'application/json': {
        schema: errorEnvelope('Too many requests'),
      },
    },
  },
};

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'Content Broadcasting System API',
    version: '1.0.0',
    description:
      'Backend service that lets teachers upload subject content, principals approve it, and students view a rotating live feed via public endpoints.\n\n' +
      '**Auth**: most endpoints require a Bearer JWT obtained from `POST /auth/login`. ' +
      'Click the `Authorize` button (top-right) and paste the token to try secured endpoints from this UI.',
  },
  servers: [{ url: 'http://localhost:3000', description: 'Local dev' }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      User: userSchema,
      Content: contentSchema,
      LiveContent: liveContentSchema,
      Pagination: paginationSchema,
    },
    responses,
  },
  tags: [
    { name: 'Health' },
    { name: 'Auth' },
    { name: 'Users' },
    { name: 'Content (Teacher)' },
    { name: 'Approval (Principal)' },
    { name: 'Analytics (Principal)' },
    { name: 'Public Broadcast' },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Liveness probe',
        responses: {
          200: {
            description: 'OK',
            content: {
              'application/json': {
                schema: okEnvelope({
                  type: 'object',
                  properties: { uptime: { type: 'number' } },
                }),
              },
            },
          },
        },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password', 'role'],
                properties: {
                  name: { type: 'string', example: 'Aanya Sharma' },
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 6, format: 'password' },
                  role: { type: 'string', enum: ['principal', 'teacher'] },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Created',
            content: {
              'application/json': {
                schema: okEnvelope({ $ref: '#/components/schemas/User' }),
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          409: { $ref: '#/components/responses/Conflict' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login (rate-limited: 5/15min/IP)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', format: 'password' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Logged in',
            content: {
              'application/json': {
                schema: okEnvelope({
                  type: 'object',
                  properties: {
                    user: { $ref: '#/components/schemas/User' },
                    token: { type: 'string', description: 'JWT' },
                  },
                }),
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
          429: { $ref: '#/components/responses/TooManyRequests' },
        },
      },
    },
    '/users/profile': {
      get: {
        tags: ['Users'],
        summary: 'Get the logged-in user profile',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Profile',
            content: {
              'application/json': {
                schema: okEnvelope({ $ref: '#/components/schemas/User' }),
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/content/upload': {
      post: {
        tags: ['Content (Teacher)'],
        summary: 'Upload content (teacher only)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file', 'title', 'subject', 'start_time', 'end_time'],
                properties: {
                  file: {
                    type: 'string',
                    format: 'binary',
                    description: 'jpg / jpeg / png / gif, ≤ 10MB',
                  },
                  title: { type: 'string', maxLength: 255 },
                  subject: { type: 'string', maxLength: 50 },
                  description: { type: 'string', maxLength: 5000 },
                  start_time: { type: 'string', format: 'date-time' },
                  end_time: { type: 'string', format: 'date-time' },
                  rotation_duration: {
                    type: 'integer',
                    minimum: 1,
                    default: 5,
                    description: 'Minutes per rotation slot.',
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Created',
            content: {
              'application/json': {
                schema: okEnvelope({ $ref: '#/components/schemas/Content' }),
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/content/my-content': {
      get: {
        tags: ['Content (Teacher)'],
        summary: 'List the logged-in teacher\'s content',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'status',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['pending', 'approved', 'rejected'],
            },
          },
          { name: 'subject', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1 } },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100 },
          },
        ],
        responses: {
          200: {
            description: 'List',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    okEnvelope({
                      type: 'array',
                      items: { $ref: '#/components/schemas/Content' },
                    }),
                    {
                      type: 'object',
                      properties: {
                        pagination: { $ref: '#/components/schemas/Pagination' },
                      },
                    },
                  ],
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/content/live/{teacherId}': {
      get: {
        tags: ['Public Broadcast'],
        summary:
          'Currently-live content for a teacher (no auth, rate-limited 100/15min/IP)',
        parameters: [
          {
            name: 'teacherId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description:
              'Teacher UUID. Invalid / unknown UUIDs return 200 with empty data, never 4xx.',
          },
          {
            name: 'subject',
            in: 'query',
            schema: { type: 'string' },
            description: 'Optional subject filter.',
          },
        ],
        responses: {
          200: {
            description:
              'List of currently-active content (one per subject) or empty when nothing is live.',
            content: {
              'application/json': {
                schema: okEnvelope({
                  type: 'array',
                  items: { $ref: '#/components/schemas/LiveContent' },
                }),
              },
            },
          },
          429: { $ref: '#/components/responses/TooManyRequests' },
        },
      },
    },
    '/approval/all': {
      get: {
        tags: ['Approval (Principal)'],
        summary: 'List all content (with filters)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'status',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['pending', 'approved', 'rejected'],
            },
          },
          { name: 'subject', in: 'query', schema: { type: 'string' } },
          {
            name: 'teacher',
            in: 'query',
            schema: { type: 'string', format: 'uuid' },
            description: 'Filter by uploading teacher UUID.',
          },
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1 } },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100 },
          },
        ],
        responses: {
          200: {
            description: 'List',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    okEnvelope({
                      type: 'array',
                      items: { $ref: '#/components/schemas/Content' },
                    }),
                    {
                      type: 'object',
                      properties: {
                        pagination: { $ref: '#/components/schemas/Pagination' },
                      },
                    },
                  ],
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/approval/pending': {
      get: {
        tags: ['Approval (Principal)'],
        summary: 'List only pending content',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'subject', in: 'query', schema: { type: 'string' } },
          {
            name: 'teacher',
            in: 'query',
            schema: { type: 'string', format: 'uuid' },
          },
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1 } },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100 },
          },
        ],
        responses: {
          200: {
            description: 'Pending list',
            content: {
              'application/json': {
                schema: okEnvelope({
                  type: 'array',
                  items: { $ref: '#/components/schemas/Content' },
                }),
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/approval/{id}/approve': {
      put: {
        tags: ['Approval (Principal)'],
        summary: 'Approve a pending content row',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          200: {
            description: 'Approved',
            content: {
              'application/json': {
                schema: okEnvelope({ $ref: '#/components/schemas/Content' }),
              },
            },
          },
          400: {
            description: 'Validation error or content not in pending state',
            content: {
              'application/json': { schema: errorEnvelope('Bad request') },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/approval/{id}/reject': {
      put: {
        tags: ['Approval (Principal)'],
        summary: 'Reject a pending content row',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['rejection_reason'],
                properties: {
                  rejection_reason: { type: 'string', maxLength: 1000 },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Rejected',
            content: {
              'application/json': {
                schema: okEnvelope({ $ref: '#/components/schemas/Content' }),
              },
            },
          },
          400: { $ref: '#/components/responses/ValidationError' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/analytics/subjects': {
      get: {
        tags: ['Analytics (Principal)'],
        summary: 'Subject-level rollups',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Subject analytics',
            content: {
              'application/json': {
                schema: okEnvelope({
                  type: 'object',
                  properties: {
                    mostActiveSubject: { type: 'string', nullable: true },
                    perSubject: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          subject: { type: 'string' },
                          total: { type: 'integer' },
                          pending: { type: 'integer' },
                          approved: { type: 'integer' },
                          rejected: { type: 'integer' },
                        },
                      },
                    },
                  },
                }),
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/analytics/teachers': {
      get: {
        tags: ['Analytics (Principal)'],
        summary: 'Per-teacher upload counts and approval rate',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Teacher analytics',
            content: {
              'application/json': {
                schema: okEnvelope({
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', format: 'uuid' },
                      name: { type: 'string' },
                      email: { type: 'string', format: 'email' },
                      total_uploads: { type: 'integer' },
                      approved: { type: 'integer' },
                      rejected: { type: 'integer' },
                      pending: { type: 'integer' },
                      approval_rate_pct: {
                        type: 'number',
                        nullable: true,
                        description: 'approved / (approved + rejected) * 100',
                      },
                    },
                  },
                }),
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
  },
};

module.exports = { spec };
