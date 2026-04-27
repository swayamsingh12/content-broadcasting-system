# Content Broadcasting System

A backend system for schools where teachers upload subject-based content (question papers, notices), the principal approves or rejects it, and students access the currently live content through a public API — rotating like a slideshow per subject.

---

## How It Works

```
Teacher uploads image ──→ Principal reviews ──→ Approved ──→ Goes live for students
         │                                         │
         │                                    Rejected (with reason)
         │                                         │
         └── status: pending                       └── never goes live
```

**Students** hit a public endpoint like `GET /content/live/:teacherId` and get whatever content is currently on air — content rotates per subject based on time duration.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js |
| Framework | Express.js |
| Database | PostgreSQL (raw parameterised SQL via `pg` — no ORM) |
| Authentication | JWT (`jsonwebtoken`) + `bcrypt` for password hashing |
| File Upload | `multer` (memoryStorage) → **AWS S3** for cloud storage |
| Validation | `joi` (body / query / params validation with field-level errors) |
| API Docs | Swagger UI at `/api-docs` (OpenAPI 3.0) |
| Security | `express-rate-limit`, `cors`, role-based access control |
| Logging | `morgan` |

---

## Folder Structure

```
content-broadcasting-system/
├── src/
│   ├── app.js                        # Express app wiring + graceful shutdown
│   ├── config/
│   │   ├── database.js               # PostgreSQL pool + query helper
│   │   ├── s3.js                     # AWS S3 client configuration
│   │   └── swagger.js                # OpenAPI 3.0 spec
│   ├── controllers/                  # Thin HTTP handlers
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── contentController.js
│   │   ├── approvalController.js
│   │   └── broadcastController.js
│   ├── routes/                       # Express routers + validation chains
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   ├── contentRoutes.js
│   │   ├── approvalRoutes.js
│   │   └── publicRoutes.js
│   ├── services/                     # Business logic layer
│   │   ├── authService.js
│   │   ├── contentService.js
│   │   ├── approvalService.js
│   │   ├── schedulingService.js      # Rotation algorithm
│   │   └── s3Service.js              # S3 upload / delete operations
│   ├── middlewares/
│   │   ├── authMiddleware.js         # JWT verification
│   │   ├── roleMiddleware.js         # Principal / Teacher gate
│   │   ├── uploadMiddleware.js       # Multer config (memoryStorage → S3)
│   │   ├── validateMiddleware.js     # Joi-driven validator factory
│   │   ├── rateLimiter.js            # Rate limiting rules
│   │   └── errorHandler.js           # Global error handler + asyncHandler
│   ├── models/                       # Raw SQL queries only
│   │   ├── userModel.js
│   │   ├── contentModel.js
│   │   ├── contentSlotModel.js
│   │   └── contentScheduleModel.js
│   └── utils/
│       ├── responseHelper.js         # Standard success / error envelope
│       ├── schemas.js                # Joi schemas (single source of truth)
│       └── constants.js              # Roles, statuses, file types, limits
├── db/
│   └── schema.sql                    # Run once to create all tables
├── .env                              # Secrets (DB, JWT, AWS — never committed)
├── .gitignore
├── README.md
├── architecture-notes.txt
└── package.json
```

**Design principle:** Routes declare validation → Controllers parse and respond (thin) → Services own business rules → Models own SQL. Each layer has a single responsibility.

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create the PostgreSQL database

```bash
createdb content_broadcasting
psql -d content_broadcasting -f db/schema.sql
```

To verify tables were created:

```bash
psql -d content_broadcasting -c "\dt"
```

You should see: `users`, `content`, `content_slots`, `content_schedules`.

### 3. Setup AWS S3

Files are stored in AWS S3 instead of the local filesystem. This ensures scalability, reliability, and CDN-ready delivery.

**Step 1:** Create an S3 bucket in AWS Console.

**Step 2:** Uncheck "Block all public access" on the bucket (students need to view files).

**Step 3:** Create an IAM user with `AmazonS3FullAccess` policy and generate access keys.

**Step 4:** Copy the Access Key ID and Secret Access Key — you'll need them for `.env`.

### 4. Configure environment variables

Create a `.env` file in the project root:

```env
# Server
PORT=3000
NODE_ENV=development

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=content_broadcasting
DB_USER=postgres
DB_PASSWORD=your_postgres_password

# JWT
JWT_SECRET=your_long_random_secret_string
JWT_EXPIRES_IN=24h

# File Upload
MAX_FILE_SIZE=10485760

# AWS S3
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=ap-south-1
AWS_BUCKET_NAME=your-bucket-name
```

### 5. Start the server

```bash
npm run dev    # with nodemon (auto-restarts on file changes)
# or
npm start      # production mode
```

Server starts at `http://localhost:3000`. Hit `GET /health` to confirm.

### 6. API Documentation

Once the server is running:

| Resource | URL |
|----------|-----|
| Swagger UI (interactive) | http://localhost:3000/api-docs |
| Raw OpenAPI 3.0 JSON | http://localhost:3000/api-docs.json |

Click the **Authorize** button in Swagger UI, paste your JWT token from `POST /auth/login`, and test any secured endpoint directly from the browser.

---

## File Upload Flow (AWS S3)

```
Teacher sends file via POST /content/upload
         │
         ▼
Multer (memoryStorage) holds file in RAM as buffer
         │
         ▼
s3Service.uploadFile() sends buffer to AWS S3
         │
         ▼
S3 returns public URL like:
https://bucket.s3.region.amazonaws.com/content/1714300000-image.jpg
         │
         ▼
file_url (public S3 URL) + file_key (S3 path) stored in database
         │
         ▼
Students access the file directly from S3 — our server is not involved
```

**Why S3 over local storage?**
- Files survive server crashes or redeployment
- Unlimited storage (local disk is limited)
- Faster delivery via AWS global infrastructure
- Our server doesn't waste bandwidth serving files
- Production-ready from day one

**On content rejection:** The file is automatically deleted from S3 to avoid orphaned storage costs.

---

## API Reference

### Auth (Public — no token needed)

#### `POST /auth/register`

```json
{
  "name": "Aanya Sharma",
  "email": "aanya@school.edu",
  "password": "secret123",
  "role": "teacher"
}
```

Response `201`:

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "id": "uuid",
    "name": "Aanya Sharma",
    "email": "aanya@school.edu",
    "role": "teacher",
    "created_at": "2026-04-26T12:00:00.000Z"
  }
}
```

Errors: `400` validation, `409` duplicate email.

#### `POST /auth/login`

```json
{
  "email": "aanya@school.edu",
  "password": "secret123"
}
```

Response `200`:

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { "id": "...", "name": "...", "email": "...", "role": "teacher" },
    "token": "<JWT>"
  }
}
```

Rate limited to **5 attempts / 15 min / IP**. Returns generic 401 for both unknown email and wrong password (prevents account enumeration).

---

### Users (Auth required)

#### `GET /users/profile`

Returns the logged-in user's profile. Requires `Authorization: Bearer <token>` header.

---

### Content — Teacher Only

#### `POST /content/upload`

`multipart/form-data` with `Authorization: Bearer <token>`:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `file` | image | yes | jpg/jpeg/png/gif, max 10MB |
| `title` | string | yes | max 255 characters |
| `subject` | string | yes | max 50 chars (auto lower-cased) |
| `description` | string | no | optional context |
| `start_time` | ISO 8601 | yes | when content goes live |
| `end_time` | ISO 8601 | yes | must be after start_time |
| `rotation_duration` | integer | no | minutes per rotation (default: 5) |

Response `201`: The created content row with `status: "pending"` and `file_url` pointing to S3.

#### `GET /content/my-content`

Lists the calling teacher's uploads. All query params optional:

```
GET /content/my-content?status=pending&subject=maths&page=1&limit=10
```

Response includes pagination:

```json
{
  "success": true,
  "message": "Content fetched",
  "data": [ ... ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 48,
    "limit": 10
  }
}
```

---

### Approval — Principal Only

#### `GET /approval/all`

View all content (joined with teacher name/email). Optional filters:

```
GET /approval/all?status=pending&subject=maths&teacher=<uuid>&page=1&limit=10
```

Unknown status or malformed teacher UUID returns empty list (200), not an error.

#### `GET /approval/pending`

Convenience alias for `?status=pending`.

#### `PUT /approval/:id/approve`

No body needed. Atomically: flips status to approved, creates subject slot if needed, inserts schedule entry at next rotation order.

Errors: `404` not found, `400` if not currently pending.

#### `PUT /approval/:id/reject`

```json
{
  "rejection_reason": "Image is unclear, please re-upload"
}
```

Rejection reason is mandatory. On rejection, the file is also **deleted from S3**.

---

### Analytics — Principal Only

#### `GET /analytics/subjects`

```json
{
  "success": true,
  "message": "Subject analytics",
  "data": {
    "mostActiveSubject": "maths",
    "perSubject": [
      { "subject": "maths", "total": 12, "approved": 8, "pending": 3, "rejected": 1 }
    ]
  }
}
```

#### `GET /analytics/teachers`

Per-teacher upload counts and approval rate (percentage of decided uploads that were approved).

---

### Public Broadcasting (No token needed)

#### `GET /content/live/:teacherId`

```
GET /content/live/:teacherId?subject=maths
```

Returns whatever is currently on air for that teacher — one entry per subject. The `file_url` in the response is a direct S3 link that students can open immediately.

**Always returns 200.** Unknown teacher, malformed UUID, or unknown subject:

```json
{
  "success": true,
  "message": "No content available",
  "data": []
}
```

Rate limited to **100 requests / 15 min / IP**.

---

## Scheduling / Rotation Logic

Each subject has its own independent rotation. Content rotates like a slideshow based on time — no cron jobs, no timers. The active content is calculated on every request using modular arithmetic.

**Worked example:**

Maths has 3 approved items, each with 5-minute rotation:

| Order | Content | Duration |
|-------|---------|----------|
| 1 | Algebra Paper | 5 min |
| 2 | Geometry Paper | 5 min |
| 3 | Calculus Paper | 5 min |

Total cycle = 15 minutes.

If the earliest `start_time` was 14:00 and a student hits the endpoint at 14:07:

```
elapsed  = 7 minutes
position = 7 % 15 = 7

Checking rotation order:
  Item 1: cumulative = 5  → is 7 < 5?  NO
  Item 2: cumulative = 10 → is 7 < 10? YES → Geometry Paper is on air
```

If 17 minutes had elapsed: `position = 17 % 15 = 2` → Algebra Paper is back on air (the cycle loops).

---

## Edge Cases Handled

| Scenario | Behavior |
|----------|----------|
| No approved content for teacher | Empty list, status 200 |
| start_time / end_time is NULL | Content never goes live |
| Current time outside [start_time, end_time] | Content skipped |
| Invalid teacher UUID | Empty list, 200 |
| Invalid subject filter | Empty list, 200 |
| Teacher tries to approve | 403 Forbidden |
| Principal tries to upload | 403 Forbidden |
| Rejected content | Never appears in live feed |
| Duplicate email registration | 409 Conflict |
| Bad file type (not jpg/png/gif) | 400 Bad Request |
| File exceeds 10MB | 400 Bad Request |
| Missing required fields | 400 with field-level error details |
| Content already approved/rejected | 400 "Content is already approved/rejected" |
| S3 upload failure | 500 "File upload failed" |

---

## Validation and Error Handling

**Joi** validates `body`, `query`, and `params` for every endpoint. Validation failures return `400` with field-level details:

```json
{
  "success": false,
  "message": "Validation failed",
  "data": [
    { "field": "email", "message": "email must be a valid email" },
    { "field": "password", "message": "password must be at least 6 characters long" }
  ]
}
```

The global error handler translates database errors (duplicate key → 409, foreign key violation → 400, invalid UUID → 400), JWT errors (→ 401), malformed JSON (→ 400), and oversize bodies (→ 413). Stack traces are logged server-side but never returned to clients.

Process-level handlers catch `unhandledRejection` / `uncaughtException` and trigger graceful shutdown (closes HTTP server, drains the pg pool, 10-second hard timeout).

---

## Response Format

Every endpoint returns a consistent envelope:

```json
{
  "success": true,
  "message": "...",
  "data": ...
}
```

Listing endpoints additionally include a `pagination` block.

---

## Rate Limiting

| Endpoint | Limit | Purpose |
|----------|-------|---------|
| `POST /auth/login` | 5 req / 15 min / IP | Prevent brute force |
| `GET /content/live/:teacherId` | 100 req / 15 min / IP | Protect public API |
| All other routes | 200 req / 15 min / IP | General abuse protection |

---

## Content Lifecycle

```
Teacher uploads → status: PENDING
                       │
          Principal reviews
          ┌────────────┴────────────┐
          ▼                         ▼
     APPROVED                   REJECTED
          │                    (reason stored,
          │                     file deleted from S3)
          ▼
  Live within [start_time, end_time]
  Rotates per subject automatically
```

---

## Security

- JWT tokens required for all protected routes
- Role-based access control (Principal vs Teacher permissions strictly separated)
- Passwords hashed with bcrypt (10 salt rounds)
- Parameterised SQL queries ($1, $2, $3) prevent SQL injection
- No sensitive data (password_hash) in API responses
- Rate limiting on login and public endpoints
- Joi validation strips unknown fields (mass-assignment protection)
- CORS enabled for cross-origin access

---

## Scalability Considerations

| Area | Current | Future Improvement |
|------|---------|-------------------|
| File Storage | AWS S3 | Add CloudFront CDN in front of S3 |
| Caching | None | Redis cache on /content/live with TTL = shortest rotation_duration |
| Database | Single instance | Read replicas for broadcasting queries |
| Server | Single process | Horizontal scaling (JWT is stateless — no sessions) |
| Processing | Synchronous | Message queues (Bull/Redis) for async tasks |
| Monitoring | morgan logs | APM tools (Datadog, New Relic) |