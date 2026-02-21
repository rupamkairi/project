# LMS API Documentation

Version: 1.0.0  
Base URL: `/api/v1`

---

## Table of Contents

1. [Authentication](#authentication)
2. [Pagination](#pagination)
3. [Error Handling](#error-handling)
4. [Rate Limiting](#rate-limiting)
5. [Catalog Endpoints](#catalog-endpoints)
6. [Auth Endpoints](#auth-endpoints)
7. [Enrollment Endpoints](#enrollment-endpoints)
8. [Learning Endpoints](#learning-endpoints)
9. [Assignment/Submission Endpoints](#assignmentsubmission-endpoints)
10. [Certificate Endpoints](#certificate-endpoints)
11. [Instructor Endpoints](#instructor-endpoints)
12. [Admin Endpoints](#admin-endpoints)
13. [Webhook Endpoints](#webhook-endpoints)

---

## Authentication

### JWT Token Format

All authenticated requests require a Bearer token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

**Token Structure:**

```json
{
  "sub": "user_123",
  "org_id": "org_456",
  "roles": ["learner", "instructor"],
  "permissions": ["course:read", "enrollment:create"],
  "iat": 1700000000,
  "exp": 1700086400
}
```

**Token Claims:**

| Claim         | Type     | Description                 |
| ------------- | -------- | --------------------------- |
| `sub`         | string   | User ID                     |
| `org_id`      | string   | Organization ID             |
| `roles`       | string[] | User roles                  |
| `permissions` | string[] | Granted permissions         |
| `iat`         | number   | Issued at (Unix timestamp)  |
| `exp`         | number   | Expiration (Unix timestamp) |

### Permission Model

Permissions follow the pattern `resource:action`:

| Permission           | Description             |
| -------------------- | ----------------------- |
| `course:read`        | View course details     |
| `course:create`      | Create new courses      |
| `course:update`      | Update course content   |
| `course:publish`     | Publish/approve courses |
| `enrollment:read`    | View enrollment details |
| `enrollment:create`  | Create new enrollments  |
| `enrollment:cancel`  | Cancel enrollments      |
| `enrollment:manage`  | Manage all enrollments  |
| `module:read`        | View module content     |
| `module:create`      | Create course modules   |
| `module:update`      | Update module content   |
| `submission:create`  | Submit assignments      |
| `submission:grade`   | Grade submissions       |
| `certificate:read`   | View certificates       |
| `certificate:revoke` | Revoke certificates     |
| `analytics:read`     | View analytics data     |
| `cohort:read`        | View cohort details     |
| `cohort:create`      | Create cohorts          |
| `cohort:manage`      | Manage cohorts          |
| `session:create`     | Create live sessions    |
| `session:start`      | Start live sessions     |

**Wildcard Permission:**

The `*:*` permission grants full access to all resources.

### Role-Based Access

| Role               | Description        | Key Permissions                                          |
| ------------------ | ------------------ | -------------------------------------------------------- |
| `learner`          | Standard learner   | course:read, enrollment:create, submission:create        |
| `instructor`       | Course creator     | All learner + course:create, module:\*, submission:grade |
| `content-reviewer` | Content approver   | course:read, course:publish                              |
| `lms-admin`        | LMS administrator  | Full access (`*:*`)                                      |
| `org-admin`        | Organization admin | Full organization access                                 |

---

## Pagination

List endpoints support cursor-based pagination:

**Query Parameters:**

| Parameter | Type   | Default | Description               |
| --------- | ------ | ------- | ------------------------- |
| `page`    | number | 1       | Page number               |
| `limit`   | number | 20      | Items per page (max: 100) |

**Response Format:**

```json
{
  "data": [...],
  "total": 150,
  "page": 1,
  "limit": 20,
  "hasNext": true
}
```

---

## Error Handling

### Error Response Format

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

### HTTP Status Codes

| Code | Description                             |
| ---- | --------------------------------------- |
| 200  | Success                                 |
| 201  | Created                                 |
| 400  | Bad Request - Invalid input             |
| 401  | Unauthorized - Authentication required  |
| 403  | Forbidden - Insufficient permissions    |
| 404  | Not Found - Resource not found          |
| 409  | Conflict - Resource already exists      |
| 422  | Unprocessable Entity - Validation error |
| 429  | Too Many Requests - Rate limit exceeded |
| 500  | Internal Server Error                   |

### Error Codes

| Code                      | Description                         |
| ------------------------- | ----------------------------------- |
| `AUTH_REQUIRED`           | Authentication token required       |
| `INSUFFICIENT_ROLE`       | User lacks required role            |
| `INSUFFICIENT_PERMISSION` | User lacks required permission      |
| `NOT_RESOURCE_OWNER`      | User does not own the resource      |
| `COURSE_NOT_FOUND`        | Course does not exist               |
| `ENROLLMENT_NOT_FOUND`    | Enrollment does not exist           |
| `ALREADY_ENROLLED`        | User already enrolled in course     |
| `COHORT_FULL`             | Cohort has reached capacity         |
| `MAX_ATTEMPTS_EXCEEDED`   | Maximum submission attempts reached |
| `DEADLINE_PASSED`         | Submission deadline has passed      |
| `CERTIFICATE_REVOKED`     | Certificate has been revoked        |
| `VALIDATION_ERROR`        | Input validation failed             |

---

## Rate Limiting

| Endpoint Type           | Rate Limit           |
| ----------------------- | -------------------- |
| Public endpoints        | 100 requests/minute  |
| Authenticated endpoints | 300 requests/minute  |
| Webhook endpoints       | 1000 requests/minute |

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 295
X-RateLimit-Reset: 1700086400
```

---

## Catalog Endpoints

### GET /lms/courses

List published courses.

**Authentication:** Optional  
**Permissions:** None (public)

**Query Parameters:**

| Parameter      | Type     | Description                                                           |
| -------------- | -------- | --------------------------------------------------------------------- |
| `page`         | number   | Page number                                                           |
| `limit`        | number   | Items per page                                                        |
| `status`       | string   | Filter by status (admin only)                                         |
| `level`        | string   | Filter by level: `beginner`, `intermediate`, `advanced`, `all-levels` |
| `categoryId`   | string   | Filter by category                                                    |
| `instructorId` | string   | Filter by instructor                                                  |
| `tags`         | string[] | Filter by tags                                                        |
| `minPrice`     | number   | Minimum price filter                                                  |
| `maxPrice`     | number   | Maximum price filter                                                  |
| `search`       | string   | Search in title/description                                           |

**Response Schema:**

```json
{
  "data": [
    {
      "id": "course_123",
      "title": "Introduction to TypeScript",
      "slug": "intro-to-typescript",
      "description": "Learn TypeScript fundamentals",
      "instructorId": "user_456",
      "categoryId": "cat_789",
      "status": "published",
      "type": "self-paced",
      "level": "beginner",
      "language": "en",
      "durationHours": 10,
      "moduleCount": 12,
      "price": {
        "amount": 4900,
        "currency": "USD"
      },
      "compareAtPrice": {
        "amount": 9900,
        "currency": "USD"
      },
      "enrolledCount": 1250,
      "completedCount": 450,
      "rating": 4.7,
      "reviewCount": 320,
      "completionThreshold": 80,
      "tags": ["typescript", "javascript", "programming"],
      "publishedAt": 1700000000000
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 20,
  "hasNext": true
}
```

**Example Request:**

```bash
curl -X GET "https://api.example.com/api/v1/lms/courses?level=beginner&limit=10"
```

---

### GET /lms/courses/:slug

Get course details by slug.

**Authentication:** Optional  
**Permissions:** None (public)

**Path Parameters:**

| Parameter | Type   | Description |
| --------- | ------ | ----------- |
| `slug`    | string | Course slug |

**Response Schema:**

```json
{
  "id": "course_123",
  "title": "Introduction to TypeScript",
  "slug": "intro-to-typescript",
  "description": "Learn TypeScript fundamentals",
  "instructorId": "user_456",
  "categoryId": "cat_789",
  "status": "published",
  "type": "self-paced",
  "level": "beginner",
  "language": "en",
  "prerequisites": ["Basic JavaScript knowledge"],
  "durationHours": 10,
  "moduleCount": 12,
  "price": {
    "amount": 4900,
    "currency": "USD"
  },
  "compareAtPrice": {
    "amount": 9900,
    "currency": "USD"
  },
  "enrolledCount": 1250,
  "completedCount": 450,
  "rating": 4.7,
  "reviewCount": 320,
  "completionThreshold": 80,
  "tags": ["typescript", "javascript", "programming"],
  "thumbnailDocId": "doc_123",
  "previewVideoUrl": "https://cdn.example.com/preview.mp4",
  "syllabusDocId": "doc_456",
  "certificateTemplate": {
    "title": "Certificate of Completion",
    "body": "This certifies that {{learnerName}} has successfully completed {{courseTitle}}"
  },
  "publishedAt": 1700000000000
}
```

**Error Codes:**

| Code               | HTTP Status | Description                |
| ------------------ | ----------- | -------------------------- |
| `COURSE_NOT_FOUND` | 404         | Course with slug not found |

**Example Request:**

```bash
curl -X GET "https://api.example.com/api/v1/lms/courses/intro-to-typescript"
```

---

### GET /lms/categories

List course categories.

**Authentication:** Optional  
**Permissions:** None (public)

**Query Parameters:**

| Parameter         | Type    | Description                              |
| ----------------- | ------- | ---------------------------------------- |
| `parentId`        | string  | Filter by parent category                |
| `includeInactive` | boolean | Include inactive categories (admin only) |

**Response Schema:**

```json
[
  {
    "id": "cat_123",
    "name": "Programming",
    "slug": "programming",
    "description": "Programming courses",
    "parentId": null,
    "status": "active",
    "sortOrder": 1,
    "children": [
      {
        "id": "cat_456",
        "name": "JavaScript",
        "slug": "javascript",
        "parentId": "cat_123",
        "status": "active",
        "sortOrder": 1
      }
    ]
  }
]
```

**Example Request:**

```bash
curl -X GET "https://api.example.com/api/v1/lms/categories"
```

---

### GET /lms/search

Search courses.

**Authentication:** Optional  
**Permissions:** None (public)

**Query Parameters:**

| Parameter             | Type     | Description             |
| --------------------- | -------- | ----------------------- |
| `q`                   | string   | Search query (required) |
| `page`                | number   | Page number             |
| `limit`               | number   | Items per page          |
| `filters[level]`      | string   | Filter by level         |
| `filters[categoryId]` | string   | Filter by category      |
| `filters[minPrice]`   | number   | Minimum price           |
| `filters[maxPrice]`   | number   | Maximum price           |
| `filters[tags]`       | string[] | Filter by tags          |

**Response Schema:**

```json
{
  "data": [
    {
      "id": "course_123",
      "title": "Introduction to TypeScript",
      "slug": "intro-to-typescript",
      "description": "Learn TypeScript fundamentals",
      "level": "beginner",
      "price": {
        "amount": 4900,
        "currency": "USD"
      },
      "rating": 4.7,
      "enrolledCount": 1250
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 20,
  "hasNext": true
}
```

**Example Request:**

```bash
curl -X GET "https://api.example.com/api/v1/lms/search?q=typescript&filters[level]=beginner"
```

---

### GET /lms/courses/:id/modules

Get course modules (enrollment-gated).

**Authentication:** Required  
**Permissions:** `enrollment:read` (for full access)

**Path Parameters:**

| Parameter | Type   | Description |
| --------- | ------ | ----------- |
| `id`      | string | Course ID   |

**Query Parameters:**

| Parameter      | Type   | Description                           |
| -------------- | ------ | ------------------------------------- |
| `enrollmentId` | string | Enrollment ID for access verification |

**Response Schema:**

```json
[
  {
    "id": "module_123",
    "courseId": "course_456",
    "title": "Getting Started",
    "description": "Introduction to the course",
    "order": 0,
    "type": "video",
    "estimatedMinutes": 15,
    "isFree": true,
    "isPublished": true,
    "requiredPrevious": false
  },
  {
    "id": "module_124",
    "courseId": "course_456",
    "title": "Variables and Types",
    "description": "Understanding TypeScript types",
    "order": 1,
    "type": "video",
    "estimatedMinutes": 25,
    "isFree": false,
    "isPublished": true,
    "requiredPrevious": true
  }
]
```

**Notes:**

- Unenrolled users see only free modules (`isFree: true`)
- Enrolled users see all published modules
- Instructors and admins see all modules

**Example Request:**

```bash
curl -X GET "https://api.example.com/api/v1/lms/courses/course_123/modules" \
  -H "Authorization: Bearer <token>"
```

---

## Auth Endpoints

### POST /lms/auth/register

Register a new user account.

**Authentication:** None (public)  
**Permissions:** None

**Request Body:**

```json
{
  "email": "learner@example.com",
  "password": "SecureP@ss123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "learner"
}
```

**Request Schema:**

| Field       | Type   | Required | Description                                                |
| ----------- | ------ | -------- | ---------------------------------------------------------- |
| `email`     | string | Yes      | Valid email address                                        |
| `password`  | string | Yes      | Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special |
| `firstName` | string | Yes      | 1-50 characters                                            |
| `lastName`  | string | Yes      | 1-50 characters                                            |
| `role`      | string | No       | Default: `learner`                                         |

**Response Schema:**

```json
{
  "user": {
    "id": "user_123",
    "email": "learner@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "roles": ["learner"],
    "createdAt": 1700000000000
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Error Codes:**

| Code               | HTTP Status | Description              |
| ------------------ | ----------- | ------------------------ |
| `EMAIL_EXISTS`     | 409         | Email already registered |
| `VALIDATION_ERROR` | 422         | Invalid input data       |

**Example Request:**

```bash
curl -X POST "https://api.example.com/api/v1/lms/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "learner@example.com",
    "password": "SecureP@ss123",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

---

### POST /lms/auth/login

Authenticate user and receive token.

**Authentication:** None (public)  
**Permissions:** None

**Request Body:**

```json
{
  "email": "learner@example.com",
  "password": "SecureP@ss123"
}
```

**Response Schema:**

```json
{
  "user": {
    "id": "user_123",
    "email": "learner@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "roles": ["learner"],
    "permissions": ["course:read", "enrollment:create"]
  },
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "refresh_abc123...",
  "expiresIn": 86400
}
```

**Error Codes:**

| Code                  | HTTP Status | Description                |
| --------------------- | ----------- | -------------------------- |
| `INVALID_CREDENTIALS` | 401         | Invalid email or password  |
| `ACCOUNT_SUSPENDED`   | 403         | Account has been suspended |

**Example Request:**

```bash
curl -X POST "https://api.example.com/api/v1/lms/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "learner@example.com",
    "password": "SecureP@ss123"
  }'
```

---

### POST /lms/auth/logout

Invalidate current session.

**Authentication:** Required  
**Permissions:** None

**Request Body:** Empty

**Response Schema:**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Example Request:**

```bash
curl -X POST "https://api.example.com/api/v1/lms/auth/logout" \
  -H "Authorization: Bearer <token>"
```

---

### POST /lms/auth/forgot-password

Request password reset email.

**Authentication:** None (public)  
**Permissions:** None

**Request Body:**

```json
{
  "email": "learner@example.com"
}
```

**Response Schema:**

```json
{
  "success": true,
  "message": "If the email exists, a reset link has been sent"
}
```

**Example Request:**

```bash
curl -X POST "https://api.example.com/api/v1/lms/auth/forgot-password" \
  -H "Content-Type: application/json" \
  -d '{"email": "learner@example.com"}'
```

---

### POST /lms/auth/reset-password

Reset password using token.

**Authentication:** None (public)  
**Permissions:** None

**Request Body:**

```json
{
  "token": "reset_token_abc123",
  "password": "NewSecureP@ss456"
}
```

**Response Schema:**

```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

**Error Codes:**

| Code               | HTTP Status | Description                         |
| ------------------ | ----------- | ----------------------------------- |
| `INVALID_TOKEN`    | 400         | Reset token invalid or expired      |
| `VALIDATION_ERROR` | 422         | Password does not meet requirements |

**Example Request:**

```bash
curl -X POST "https://api.example.com/api/v1/lms/auth/reset-password" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "reset_token_abc123",
    "password": "NewSecureP@ss456"
  }'
```

---

## Enrollment Endpoints

### GET /lms/enrollments

List user's enrollments.

**Authentication:** Required  
**Permissions:** `enrollment:read`  
**Roles:** `learner`, `instructor`, `lms-admin`, `org-admin`

**Query Parameters:**

| Parameter  | Type   | Description      |
| ---------- | ------ | ---------------- |
| `page`     | number | Page number      |
| `limit`    | number | Items per page   |
| `status`   | string | Filter by status |
| `courseId` | string | Filter by course |

**Response Schema:**

```json
{
  "data": [
    {
      "id": "enrollment_123",
      "learnerId": "user_456",
      "courseId": "course_789",
      "cohortId": "cohort_abc",
      "status": "active",
      "paymentId": "pay_xyz",
      "couponCode": "SAVE20",
      "pricePaid": {
        "amount": 3920,
        "currency": "USD"
      },
      "completionPct": 45,
      "completedAt": null,
      "certificateId": null,
      "expiresAt": null,
      "lastAccessedAt": 1700000000000,
      "createdAt": 1699000000000
    }
  ],
  "total": 5,
  "page": 1,
  "limit": 20,
  "hasNext": false
}
```

**Example Request:**

```bash
curl -X GET "https://api.example.com/api/v1/lms/enrollments?status=active" \
  -H "Authorization: Bearer <token>"
```

---

### POST /lms/enrollments

Create a new enrollment.

**Authentication:** Required  
**Permissions:** `enrollment:create`  
**Roles:** `learner`, `instructor`, `lms-admin`, `org-admin`

**Request Body:**

```json
{
  "courseId": "course_123",
  "cohortId": "cohort_456",
  "pricePaid": {
    "amount": 4900,
    "currency": "USD"
  },
  "couponCode": "SAVE20",
  "paymentId": "pay_abc123"
}
```

**Request Schema:**

| Field        | Type   | Required | Description                             |
| ------------ | ------ | -------- | --------------------------------------- |
| `courseId`   | string | Yes      | Course ID to enroll in                  |
| `cohortId`   | string | No       | Cohort ID for cohort-based courses      |
| `pricePaid`  | Money  | No       | Amount paid (required for paid courses) |
| `couponCode` | string | No       | Discount coupon code                    |
| `paymentId`  | string | No       | Payment transaction ID                  |
| `status`     | string | No       | Override initial status (admin only)    |
| `expiresAt`  | number | No       | Enrollment expiration timestamp         |

**Response Schema:**

```json
{
  "id": "enrollment_123",
  "learnerId": "user_456",
  "courseId": "course_789",
  "cohortId": "cohort_abc",
  "status": "pending-payment",
  "pricePaid": {
    "amount": 4900,
    "currency": "USD"
  },
  "completionPct": 0,
  "createdAt": 1700000000000
}
```

**Error Codes:**

| Code                   | HTTP Status | Description                        |
| ---------------------- | ----------- | ---------------------------------- |
| `COURSE_NOT_FOUND`     | 404         | Course does not exist              |
| `ALREADY_ENROLLED`     | 409         | User already has active enrollment |
| `COHORT_FULL`          | 400         | Cohort has reached capacity        |
| `COURSE_NOT_PUBLISHED` | 400         | Course is not published            |

**Example Request:**

```bash
curl -X POST "https://api.example.com/api/v1/lms/enrollments" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "courseId": "course_123",
    "pricePaid": {"amount": 4900, "currency": "USD"},
    "paymentId": "pay_abc123"
  }'
```

---

### GET /lms/enrollments/:id

Get enrollment details.

**Authentication:** Required  
**Permissions:** `enrollment:read`  
**Roles:** `learner`, `instructor`, `lms-admin`, `org-admin`

**Path Parameters:**

| Parameter | Type   | Description   |
| --------- | ------ | ------------- |
| `id`      | string | Enrollment ID |

**Response Schema:**

```json
{
  "id": "enrollment_123",
  "learnerId": "user_456",
  "courseId": "course_789",
  "cohortId": "cohort_abc",
  "status": "active",
  "paymentId": "pay_xyz",
  "couponCode": "SAVE20",
  "pricePaid": {
    "amount": 3920,
    "currency": "USD"
  },
  "completionPct": 45,
  "completedAt": null,
  "certificateId": null,
  "expiresAt": null,
  "lastAccessedAt": 1700000000000,
  "course": {
    "title": "Introduction to TypeScript",
    "slug": "intro-to-typescript",
    "instructorId": "user_789"
  }
}
```

**Error Codes:**

| Code                   | HTTP Status | Description                   |
| ---------------------- | ----------- | ----------------------------- |
| `ENROLLMENT_NOT_FOUND` | 404         | Enrollment does not exist     |
| `NOT_RESOURCE_OWNER`   | 403         | Not enrollment owner or admin |

**Example Request:**

```bash
curl -X GET "https://api.example.com/api/v1/lms/enrollments/enrollment_123" \
  -H "Authorization: Bearer <token>"
```

---

### POST /lms/enrollments/:id/cancel

Cancel an enrollment.

**Authentication:** Required  
**Permissions:** `enrollment:cancel`  
**Roles:** `learner`, `instructor`, `lms-admin`, `org-admin`

**Path Parameters:**

| Parameter | Type   | Description   |
| --------- | ------ | ------------- |
| `id`      | string | Enrollment ID |

**Request Body:**

```json
{
  "reason": "Schedule conflict"
}
```

**Response Schema:**

```json
{
  "id": "enrollment_123",
  "status": "cancelled",
  "cancelledAt": 1700000000000
}
```

**Error Codes:**

| Code                      | HTTP Status | Description                        |
| ------------------------- | ----------- | ---------------------------------- |
| `ENROLLMENT_NOT_FOUND`    | 404         | Enrollment does not exist          |
| `CANNOT_CANCEL_COMPLETED` | 400         | Cannot cancel completed enrollment |
| `ALREADY_CANCELLED`       | 400         | Enrollment already cancelled       |

**Example Request:**

```bash
curl -X POST "https://api.example.com/api/v1/lms/enrollments/enrollment_123/cancel" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Schedule conflict"}'
```

---

### GET /lms/enrollments/:id/progress

Get detailed enrollment progress.

**Authentication:** Required  
**Permissions:** `enrollment:read`  
**Roles:** `learner`, `instructor`, `lms-admin`, `org-admin`

**Path Parameters:**

| Parameter | Type   | Description   |
| --------- | ------ | ------------- |
| `id`      | string | Enrollment ID |

**Response Schema:**

```json
{
  "enrollment": {
    "id": "enrollment_123",
    "status": "active",
    "completionPct": 45
  },
  "modules": [
    {
      "id": "module_123",
      "title": "Getting Started",
      "type": "video",
      "order": 0,
      "estimatedMinutes": 15,
      "progress": {
        "status": "completed",
        "progressPct": 100,
        "startedAt": 1699000000000,
        "completedAt": 1699001000000,
        "timeSpentSec": 900
      }
    },
    {
      "id": "module_124",
      "title": "Variables and Types",
      "type": "video",
      "order": 1,
      "estimatedMinutes": 25,
      "progress": {
        "status": "in-progress",
        "progressPct": 50,
        "startedAt": 1699001000000,
        "timeSpentSec": 750
      }
    },
    {
      "id": "module_125",
      "title": "Functions",
      "type": "video",
      "order": 2,
      "estimatedMinutes": 30,
      "progress": null
    }
  ],
  "overallProgress": 45
}
```

**Example Request:**

```bash
curl -X GET "https://api.example.com/api/v1/lms/enrollments/enrollment_123/progress" \
  -H "Authorization: Bearer <token>"
```

---

## Learning Endpoints

### GET /lms/learn/:courseSlug

Get learning interface data for a course.

**Authentication:** Required  
**Permissions:** None (enrollment required)  
**Roles:** `learner`, `instructor`, `lms-admin`, `org-admin`

**Path Parameters:**

| Parameter    | Type   | Description |
| ------------ | ------ | ----------- |
| `courseSlug` | string | Course slug |

**Response Schema:**

```json
{
  "course": {
    "id": "course_123",
    "title": "Introduction to TypeScript",
    "slug": "intro-to-typescript",
    "type": "self-paced",
    "completionThreshold": 80
  },
  "enrollment": {
    "id": "enrollment_456",
    "status": "active",
    "completionPct": 45
  },
  "modules": [
    {
      "id": "module_123",
      "title": "Getting Started",
      "type": "video",
      "order": 0,
      "estimatedMinutes": 15,
      "isFree": true
    }
  ]
}
```

**Example Request:**

```bash
curl -X GET "https://api.example.com/api/v1/lms/learn/intro-to-typescript" \
  -H "Authorization: Bearer <token>"
```

---

### GET /lms/learn/:courseSlug/modules/:id

Get module content for learning.

**Authentication:** Required  
**Permissions:** None (enrollment required)  
**Roles:** `learner`, `instructor`, `lms-admin`, `org-admin`

**Path Parameters:**

| Parameter    | Type   | Description |
| ------------ | ------ | ----------- |
| `courseSlug` | string | Course slug |
| `id`         | string | Module ID   |

**Response Schema:**

```json
{
  "module": {
    "id": "module_123",
    "courseId": "course_456",
    "title": "Getting Started",
    "description": "Introduction to the course",
    "type": "video",
    "contentRef": "video_abc123",
    "contentDocId": "doc_789",
    "estimatedMinutes": 15,
    "isFree": true
  },
  "progress": {
    "status": "in-progress",
    "progressPct": 30,
    "timeSpentSec": 270
  },
  "assignment": null
}
```

**Notes:**

- For `assignment` type modules, includes `assignment` object
- For `quiz` type modules, includes quiz questions (if not submitted)

**Example Request:**

```bash
curl -X GET "https://api.example.com/api/v1/lms/learn/intro-to-typescript/modules/module_123" \
  -H "Authorization: Bearer <token>"
```

---

### POST /lms/learn/:courseSlug/modules/:id/complete

Mark module as completed.

**Authentication:** Required  
**Permissions:** None  
**Roles:** `learner`, `instructor`, `lms-admin`, `org-admin`

**Path Parameters:**

| Parameter    | Type   | Description |
| ------------ | ------ | ----------- |
| `courseSlug` | string | Course slug |
| `id`         | string | Module ID   |

**Request Body:**

```json
{
  "enrollmentId": "enrollment_123",
  "quizScore": 85
}
```

**Request Schema:**

| Field          | Type   | Required | Description                   |
| -------------- | ------ | -------- | ----------------------------- |
| `enrollmentId` | string | Yes      | Enrollment ID                 |
| `quizScore`    | number | No       | Quiz score (for quiz modules) |

**Response Schema:**

```json
{
  "id": "progress_123",
  "enrollmentId": "enrollment_456",
  "moduleId": "module_789",
  "status": "completed",
  "progressPct": 100,
  "completedAt": 1700000000000,
  "quizScore": 85,
  "enrollmentCompletionPct": 55
}
```

**Example Request:**

```bash
curl -X POST "https://api.example.com/api/v1/lms/learn/intro-to-typescript/modules/module_123/complete" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"enrollmentId": "enrollment_123"}'
```

---

### POST /lms/learn/:courseSlug/modules/:id/progress

Update module progress (heartbeat).

**Authentication:** Required  
**Permissions:** None  
**Roles:** `learner`, `instructor`, `lms-admin`, `org-admin`

**Path Parameters:**

| Parameter    | Type   | Description |
| ------------ | ------ | ----------- |
| `courseSlug` | string | Course slug |
| `id`         | string | Module ID   |

**Request Body:**

```json
{
  "enrollmentId": "enrollment_123",
  "progressPct": 45,
  "timeSpentSec": 120
}
```

**Request Schema:**

| Field          | Type   | Required | Description                        |
| -------------- | ------ | -------- | ---------------------------------- |
| `enrollmentId` | string | Yes      | Enrollment ID                      |
| `progressPct`  | number | Yes      | Progress percentage (0-100)        |
| `timeSpentSec` | number | No       | Additional time spent (cumulative) |

**Response Schema:**

```json
{
  "id": "progress_123",
  "enrollmentId": "enrollment_456",
  "moduleId": "module_789",
  "status": "in-progress",
  "progressPct": 45,
  "timeSpentSec": 540
}
```

**Example Request:**

```bash
curl -X POST "https://api.example.com/api/v1/lms/learn/intro-to-typescript/modules/module_123/progress" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"enrollmentId": "enrollment_123", "progressPct": 45, "timeSpentSec": 120}'
```

---

## Assignment/Submission Endpoints

### GET /lms/assignments/:id

Get assignment details.

**Authentication:** Required  
**Permissions:** None (enrollment required)  
**Roles:** `learner`, `instructor`, `lms-admin`, `org-admin`

**Path Parameters:**

| Parameter | Type   | Description   |
| --------- | ------ | ------------- |
| `id`      | string | Assignment ID |

**Response Schema:**

```json
{
  "id": "assignment_123",
  "courseId": "course_456",
  "moduleId": "module_789",
  "title": "Build a TypeScript Project",
  "description": "Create a simple CLI application using TypeScript",
  "type": "project",
  "dueHoursAfterEnrollment": 168,
  "absoluteDueDate": null,
  "maxScore": 100,
  "passingScore": 60,
  "allowLateSubmission": true,
  "maxAttempts": 3
}
```

**Error Codes:**

| Code                   | HTTP Status | Description               |
| ---------------------- | ----------- | ------------------------- |
| `ASSIGNMENT_NOT_FOUND` | 404         | Assignment does not exist |

**Example Request:**

```bash
curl -X GET "https://api.example.com/api/v1/lms/assignments/assignment_123" \
  -H "Authorization: Bearer <token>"
```

---

### POST /lms/assignments/:id/submissions

Submit assignment.

**Authentication:** Required  
**Permissions:** `submission:create`  
**Roles:** `learner`, `instructor`, `lms-admin`, `org-admin`

**Path Parameters:**

| Parameter | Type   | Description   |
| --------- | ------ | ------------- |
| `id`      | string | Assignment ID |

**Request Body:**

```json
{
  "enrollmentId": "enrollment_123",
  "content": "My submission text or code...",
  "attachmentIds": ["doc_456", "doc_789"]
}
```

**Request Schema:**

| Field           | Type     | Required | Description             |
| --------------- | -------- | -------- | ----------------------- |
| `enrollmentId`  | string   | Yes      | Enrollment ID           |
| `content`       | string   | No       | Text submission content |
| `attachmentIds` | string[] | No       | Uploaded document IDs   |

**Response Schema:**

```json
{
  "id": "submission_123",
  "assignmentId": "assignment_456",
  "learnerId": "user_789",
  "enrollmentId": "enrollment_123",
  "attemptNumber": 1,
  "status": "submitted",
  "content": "My submission text or code...",
  "attachmentIds": ["doc_456", "doc_789"],
  "maxScore": 100,
  "submittedAt": 1700000000000
}
```

**Error Codes:**

| Code                    | HTTP Status | Description                |
| ----------------------- | ----------- | -------------------------- |
| `ASSIGNMENT_NOT_FOUND`  | 404         | Assignment does not exist  |
| `MAX_ATTEMPTS_EXCEEDED` | 400         | Maximum attempts reached   |
| `DEADLINE_PASSED`       | 400         | Submission deadline passed |
| `ENROLLMENT_NOT_ACTIVE` | 400         | Enrollment is not active   |

**Example Request:**

```bash
curl -X POST "https://api.example.com/api/v1/lms/assignments/assignment_123/submissions" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "enrollmentId": "enrollment_123",
    "content": "My project submission...",
    "attachmentIds": ["doc_456"]
  }'
```

---

### GET /lms/submissions/:id

Get submission details.

**Authentication:** Required  
**Permissions:** None (owner or instructor only)  
**Roles:** `learner`, `instructor`, `lms-admin`, `org-admin`

**Path Parameters:**

| Parameter | Type   | Description   |
| --------- | ------ | ------------- |
| `id`      | string | Submission ID |

**Response Schema:**

```json
{
  "id": "submission_123",
  "assignmentId": "assignment_456",
  "learnerId": "user_789",
  "enrollmentId": "enrollment_abc",
  "attemptNumber": 1,
  "status": "graded",
  "content": "My submission text or code...",
  "attachmentIds": ["doc_456", "doc_789"],
  "score": 85,
  "maxScore": 100,
  "feedback": "Great work! Minor improvements needed in error handling.",
  "gradedBy": "user_instructor",
  "gradedAt": 1700100000000,
  "submittedAt": 1700000000000
}
```

**Example Request:**

```bash
curl -X GET "https://api.example.com/api/v1/lms/submissions/submission_123" \
  -H "Authorization: Bearer <token>"
```

---

### POST /lms/submissions/:id/grade

Grade a submission (instructor only).

**Authentication:** Required  
**Permissions:** `submission:grade`  
**Roles:** `instructor`, `lms-admin`

**Path Parameters:**

| Parameter | Type   | Description   |
| --------- | ------ | ------------- |
| `id`      | string | Submission ID |

**Request Body:**

```json
{
  "score": 85,
  "feedback": "Great work! Minor improvements needed in error handling."
}
```

**Request Schema:**

| Field      | Type   | Required | Description           |
| ---------- | ------ | -------- | --------------------- |
| `score`    | number | Yes      | Score (0 to maxScore) |
| `feedback` | string | No       | Feedback comments     |

**Response Schema:**

```json
{
  "id": "submission_123",
  "status": "graded",
  "score": 85,
  "maxScore": 100,
  "feedback": "Great work! Minor improvements needed in error handling.",
  "gradedBy": "user_instructor",
  "gradedAt": 1700100000000,
  "passed": true
}
```

**Error Codes:**

| Code                   | HTTP Status | Description               |
| ---------------------- | ----------- | ------------------------- |
| `SUBMISSION_NOT_FOUND` | 404         | Submission does not exist |
| `ALREADY_GRADED`       | 400         | Submission already graded |
| `INVALID_SCORE`        | 400         | Score out of range        |

**Example Request:**

```bash
curl -X POST "https://api.example.com/api/v1/lms/submissions/submission_123/grade" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"score": 85, "feedback": "Great work!"}'
```

---

## Certificate Endpoints

### GET /lms/certificates

List user's certificates.

**Authentication:** Required  
**Permissions:** `certificate:read`  
**Roles:** `learner`, `instructor`, `lms-admin`, `org-admin`

**Query Parameters:**

| Parameter | Type   | Description    |
| --------- | ------ | -------------- |
| `page`    | number | Page number    |
| `limit`   | number | Items per page |

**Response Schema:**

```json
{
  "data": [
    {
      "id": "cert_123",
      "enrollmentId": "enrollment_456",
      "learnerId": "user_789",
      "courseId": "course_abc",
      "verificationCode": "CERT-ABC123-XYZ789",
      "issuedAt": 1700000000000,
      "expiresAt": null,
      "revoked": false,
      "course": {
        "title": "Introduction to TypeScript",
        "slug": "intro-to-typescript"
      }
    }
  ],
  "total": 3,
  "page": 1,
  "limit": 20,
  "hasNext": false
}
```

**Example Request:**

```bash
curl -X GET "https://api.example.com/api/v1/lms/certificates" \
  -H "Authorization: Bearer <token>"
```

---

### GET /lms/certificates/:id

Get certificate details.

**Authentication:** Required  
**Permissions:** `certificate:read`  
**Roles:** `learner`, `instructor`, `lms-admin`, `org-admin`

**Path Parameters:**

| Parameter | Type   | Description    |
| --------- | ------ | -------------- |
| `id`      | string | Certificate ID |

**Response Schema:**

```json
{
  "id": "cert_123",
  "enrollmentId": "enrollment_456",
  "learnerId": "user_789",
  "courseId": "course_abc",
  "verificationCode": "CERT-ABC123-XYZ789",
  "issuedAt": 1700000000000,
  "expiresAt": null,
  "revoked": false,
  "documentId": "doc_cert_123",
  "course": {
    "title": "Introduction to TypeScript",
    "slug": "intro-to-typescript",
    "instructorId": "user_instructor"
  },
  "learner": {
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

**Example Request:**

```bash
curl -X GET "https://api.example.com/api/v1/lms/certificates/cert_123" \
  -H "Authorization: Bearer <token>"
```

---

### GET /lms/certificates/:id/download

Download certificate PDF.

**Authentication:** Required  
**Permissions:** `certificate:read`  
**Roles:** `learner`, `instructor`, `lms-admin`, `org-admin`

**Path Parameters:**

| Parameter | Type   | Description    |
| --------- | ------ | -------------- |
| `id`      | string | Certificate ID |

**Response Schema:**

```json
{
  "downloadUrl": "https://cdn.example.com/certificates/cert_123.pdf",
  "filename": "certificate-intro-to-typescript.pdf"
}
```

**Error Codes:**

| Code                    | HTTP Status | Description                  |
| ----------------------- | ----------- | ---------------------------- |
| `CERTIFICATE_NOT_FOUND` | 404         | Certificate does not exist   |
| `CERTIFICATE_REVOKED`   | 400         | Certificate has been revoked |

**Example Request:**

```bash
curl -X GET "https://api.example.com/api/v1/lms/certificates/cert_123/download" \
  -H "Authorization: Bearer <token>"
```

---

### GET /lms/verify/:code

Public certificate verification.

**Authentication:** Optional  
**Permissions:** None (public)

**Path Parameters:**

| Parameter | Type   | Description       |
| --------- | ------ | ----------------- |
| `code`    | string | Verification code |

**Response Schema (Valid):**

```json
{
  "valid": true,
  "certificate": {
    "id": "cert_123",
    "verificationCode": "CERT-ABC123-XYZ789",
    "issuedAt": 1700000000000,
    "expiresAt": null
  },
  "course": {
    "title": "Introduction to TypeScript",
    "durationHours": 10,
    "level": "beginner"
  },
  "learner": {
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

**Response Schema (Invalid):**

```json
{
  "valid": false
}
```

**Example Request:**

```bash
curl -X GET "https://api.example.com/api/v1/lms/verify/CERT-ABC123-XYZ789"
```

---

## Instructor Endpoints

All instructor endpoints require `instructor` or `lms-admin` role.

### GET /lms/instructor/courses

List instructor's courses.

**Authentication:** Required  
**Permissions:** `course:read`  
**Roles:** `instructor`, `lms-admin`

**Query Parameters:**

| Parameter | Type   | Description      |
| --------- | ------ | ---------------- |
| `page`    | number | Page number      |
| `limit`   | number | Items per page   |
| `status`  | string | Filter by status |

**Response Schema:**

```json
{
  "data": [
    {
      "id": "course_123",
      "title": "Introduction to TypeScript",
      "slug": "intro-to-typescript",
      "status": "published",
      "type": "self-paced",
      "moduleCount": 12,
      "enrolledCount": 1250,
      "rating": 4.7,
      "publishedAt": 1700000000000
    }
  ],
  "total": 5,
  "page": 1,
  "limit": 20,
  "hasNext": false
}
```

---

### POST /lms/instructor/courses

Create a new course.

**Authentication:** Required  
**Permissions:** `course:create`  
**Roles:** `instructor`, `lms-admin`

**Request Body:**

```json
{
  "title": "Advanced TypeScript Patterns",
  "slug": "advanced-typescript-patterns",
  "description": "Master advanced TypeScript patterns and techniques",
  "categoryId": "cat_123",
  "type": "self-paced",
  "level": "advanced",
  "language": "en",
  "price": {
    "amount": 9900,
    "currency": "USD"
  },
  "compareAtPrice": {
    "amount": 14900,
    "currency": "USD"
  },
  "completionThreshold": 80,
  "tags": ["typescript", "advanced", "patterns"],
  "prerequisites": ["Basic TypeScript knowledge"],
  "durationHours": 15
}
```

**Response Schema:**

```json
{
  "id": "course_123",
  "title": "Advanced TypeScript Patterns",
  "slug": "advanced-typescript-patterns",
  "status": "draft",
  "instructorId": "user_456",
  "moduleCount": 0,
  "createdAt": 1700000000000
}
```

---

### GET /lms/instructor/courses/:id

Get course details for editing.

**Authentication:** Required  
**Permissions:** `course:read`  
**Roles:** `instructor`, `lms-admin`

---

### PATCH /lms/instructor/courses/:id

Update course details.

**Authentication:** Required  
**Permissions:** `course:update`  
**Roles:** `instructor`, `lms-admin`

**Request Body:**

```json
{
  "title": "Advanced TypeScript Patterns (2024)",
  "description": "Updated description...",
  "price": {
    "amount": 8900,
    "currency": "USD"
  }
}
```

---

### POST /lms/instructor/courses/:id/submit-review

Submit course for review.

**Authentication:** Required  
**Permissions:** None  
**Roles:** `instructor`, `lms-admin`

**Response Schema:**

```json
{
  "id": "course_123",
  "status": "under-review",
  "submittedAt": 1700000000000
}
```

**Error Codes:**

| Code         | HTTP Status | Description                          |
| ------------ | ----------- | ------------------------------------ |
| `NO_MODULES` | 400         | Course must have at least one module |
| `NO_PRICE`   | 400         | Course must have a price set         |
| `NOT_DRAFT`  | 400         | Course must be in draft status       |

---

### GET /lms/instructor/courses/:id/modules

List course modules for editing.

**Authentication:** Required  
**Permissions:** `module:read`  
**Roles:** `instructor`, `lms-admin`

---

### POST /lms/instructor/courses/:id/modules

Create a new module.

**Authentication:** Required  
**Permissions:** `module:create`  
**Roles:** `instructor`, `lms-admin`

**Request Body:**

```json
{
  "title": "Introduction to Generics",
  "description": "Understanding TypeScript generics",
  "type": "video",
  "contentRef": "video_abc123",
  "contentDocId": "doc_456",
  "estimatedMinutes": 25,
  "isFree": false,
  "requiredPrevious": true
}
```

---

### PATCH /lms/instructor/modules/:id

Update module details.

**Authentication:** Required  
**Permissions:** `module:update`  
**Roles:** `instructor`, `lms-admin`

---

### DELETE /lms/instructor/modules/:id

Delete a module.

**Authentication:** Required  
**Permissions:** `module:update`  
**Roles:** `instructor`, `lms-admin`

---

### GET /lms/instructor/courses/:id/enrollments

List course enrollments.

**Authentication:** Required  
**Permissions:** `enrollment:read`  
**Roles:** `instructor`, `lms-admin`

**Query Parameters:**

| Parameter | Type   | Description      |
| --------- | ------ | ---------------- |
| `page`    | number | Page number      |
| `limit`   | number | Items per page   |
| `status`  | string | Filter by status |

---

### GET /lms/instructor/courses/:id/analytics

Get course analytics.

**Authentication:** Required  
**Permissions:** `analytics:read`  
**Roles:** `instructor`, `lms-admin`

**Response Schema:**

```json
{
  "totalEnrollments": 1250,
  "activeEnrollments": 800,
  "completedEnrollments": 450,
  "averageCompletion": 65,
  "averageRating": 4.7,
  "reviewCount": 320,
  "revenue": {
    "amount": 6125000,
    "currency": "USD"
  }
}
```

---

### GET /lms/instructor/cohorts

List instructor's cohorts.

**Authentication:** Required  
**Permissions:** `cohort:read`  
**Roles:** `instructor`, `lms-admin`

---

### POST /lms/instructor/cohorts

Create a new cohort.

**Authentication:** Required  
**Permissions:** `cohort:create`  
**Roles:** `instructor`, `lms-admin`

**Request Body:**

```json
{
  "courseId": "course_123",
  "name": "March 2024 Cohort",
  "instructorId": "user_456",
  "startDate": 1709500800000,
  "endDate": 1712179200000,
  "capacity": 50,
  "timezone": "America/New_York"
}
```

---

### PATCH /lms/instructor/cohorts/:id

Update cohort details.

**Authentication:** Required  
**Permissions:** `cohort:manage`  
**Roles:** `instructor`, `lms-admin`

---

### POST /lms/instructor/cohorts/:id/sessions

Create a live session.

**Authentication:** Required  
**Permissions:** `session:create`  
**Roles:** `instructor`, `lms-admin`

**Request Body:**

```json
{
  "title": "Week 1: Introduction",
  "scheduledAt": 1709587200000,
  "durationMinutes": 90
}
```

---

### GET /lms/instructor/assignments/:id/submissions

List assignment submissions for grading.

**Authentication:** Required  
**Permissions:** `submission:grade`  
**Roles:** `instructor`, `lms-admin`

**Query Parameters:**

| Parameter | Type   | Description      |
| --------- | ------ | ---------------- |
| `page`    | number | Page number      |
| `limit`   | number | Items per page   |
| `status`  | string | Filter by status |

---

### POST /lms/instructor/submissions/:id/grade

Grade a submission.

**Authentication:** Required  
**Permissions:** `submission:grade`  
**Roles:** `instructor`, `lms-admin`

See [POST /lms/submissions/:id/grade](#post-lmssubmissionsidgrade) for details.

---

## Admin Endpoints

All admin endpoints require `lms-admin` role.

### GET /lms/admin/courses

List all courses (all statuses).

**Authentication:** Required  
**Permissions:** `course:read`  
**Roles:** `lms-admin`

**Query Parameters:**

| Parameter      | Type   | Description                 |
| -------------- | ------ | --------------------------- |
| `page`         | number | Page number                 |
| `limit`        | number | Items per page              |
| `status`       | string | Filter by status            |
| `instructorId` | string | Filter by instructor        |
| `search`       | string | Search in title/description |

---

### POST /lms/admin/courses/:id/approve

Approve a course for publication.

**Authentication:** Required  
**Permissions:** `course:publish`  
**Roles:** `lms-admin`, `content-reviewer`

**Response Schema:**

```json
{
  "id": "course_123",
  "status": "published",
  "publishedAt": 1700000000000
}
```

---

### POST /lms/admin/courses/:id/reject

Reject a course.

**Authentication:** Required  
**Permissions:** `course:publish`  
**Roles:** `lms-admin`, `content-reviewer`

**Request Body:**

```json
{
  "reason": "Course content needs improvement in the following areas..."
}
```

---

### GET /lms/admin/enrollments

List all enrollments.

**Authentication:** Required  
**Permissions:** `enrollment:manage`  
**Roles:** `lms-admin`

**Query Parameters:**

| Parameter   | Type   | Description       |
| ----------- | ------ | ----------------- |
| `page`      | number | Page number       |
| `limit`     | number | Items per page    |
| `courseId`  | string | Filter by course  |
| `learnerId` | string | Filter by learner |
| `status`    | string | Filter by status  |

---

### GET /lms/admin/learners

List all learners with statistics.

**Authentication:** Required  
**Permissions:** None  
**Roles:** `lms-admin`

**Query Parameters:**

| Parameter | Type   | Description          |
| --------- | ------ | -------------------- |
| `page`    | number | Page number          |
| `limit`   | number | Items per page       |
| `search`  | string | Search by name/email |

**Response Schema:**

```json
{
  "data": [
    {
      "learnerId": "user_123",
      "enrollmentCount": 5,
      "completedCount": 3,
      "totalSpent": {
        "amount": 24500,
        "currency": "USD"
      }
    }
  ],
  "total": 500,
  "page": 1,
  "limit": 20,
  "hasNext": true
}
```

---

### POST /lms/admin/learners/:id/suspend

Suspend a learner.

**Authentication:** Required  
**Permissions:** None  
**Roles:** `lms-admin`

**Response Schema:**

```json
{
  "learnerId": "user_123",
  "suspended": true,
  "suspendedAt": 1700000000000
}
```

---

### GET /lms/admin/certificates

List all certificates.

**Authentication:** Required  
**Permissions:** `certificate:read`  
**Roles:** `lms-admin`

---

### POST /lms/admin/certificates/:id/revoke

Revoke a certificate.

**Authentication:** Required  
**Permissions:** `certificate:revoke`  
**Roles:** `lms-admin`

**Request Body:**

```json
{
  "reason": "Academic integrity violation"
}
```

**Response Schema:**

```json
{
  "id": "cert_123",
  "revoked": true,
  "revokedReason": "Academic integrity violation",
  "revokedAt": 1700000000000
}
```

---

### GET /lms/admin/analytics/overview

Get overall LMS analytics.

**Authentication:** Required  
**Permissions:** `analytics:read`  
**Roles:** `lms-admin`

**Query Parameters:**

| Parameter   | Type   | Description         |
| ----------- | ------ | ------------------- |
| `startDate` | number | Start of date range |
| `endDate`   | number | End of date range   |

**Response Schema:**

```json
{
  "totalCourses": 50,
  "publishedCourses": 35,
  "totalEnrollments": 5000,
  "activeEnrollments": 3200,
  "completedEnrollments": 1800,
  "totalRevenue": {
    "amount": 24500000,
    "currency": "USD"
  },
  "certificatesIssued": 1500,
  "topCourses": [
    {
      "courseId": "course_123",
      "title": "Introduction to TypeScript",
      "enrollments": 1250
    }
  ]
}
```

---

### GET /lms/admin/analytics/revenue

Get revenue analytics.

**Authentication:** Required  
**Permissions:** `analytics:read`  
**Roles:** `lms-admin`

---

### GET /lms/admin/analytics/courses

Get course performance analytics.

**Authentication:** Required  
**Permissions:** `analytics:read`  
**Roles:** `lms-admin`

---

### GET /lms/admin/analytics/instructors

Get instructor performance analytics.

**Authentication:** Required  
**Permissions:** `analytics:read`  
**Roles:** `lms-admin`

---

### PATCH /lms/admin/settings

Update LMS settings.

**Authentication:** Required  
**Permissions:** None  
**Roles:** `lms-admin`

**Request Body:**

```json
{
  "features": {
    "enableCertificates": true,
    "enableCohorts": true,
    "enableLiveSessions": true,
    "enableQuizzes": true,
    "enablePeerReview": false
  },
  "defaults": {
    "completionThreshold": 80,
    "refundWindowDays": 14,
    "inactivityNudgeDays": 7,
    "maxQuizAttempts": 3
  }
}
```

---

## Webhook Endpoints

Webhook endpoints receive external service notifications. They are authenticated via webhook signatures, not JWT.

### POST /webhooks/payment

Handle payment provider webhooks (Stripe/Razorpay).

**Authentication:** Webhook signature verification  
**Permissions:** None

**Headers:**

| Header        | Description                              |
| ------------- | ---------------------------------------- |
| `X-Signature` | Webhook signature for verification       |
| `X-Provider`  | Payment provider: `stripe` or `razorpay` |

**Request Body (Stripe Example):**

```json
{
  "id": "evt_123",
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_abc123",
      "amount": 4900,
      "currency": "usd",
      "metadata": {
        "enrollmentId": "enrollment_123",
        "courseId": "course_456"
      }
    }
  }
}
```

**Response Schema:**

```json
{
  "received": true,
  "eventId": "evt_123"
}
```

**Handled Events:**

| Event                           | Action                            |
| ------------------------------- | --------------------------------- |
| `payment_intent.succeeded`      | Activate enrollment               |
| `payment_intent.payment_failed` | Notify learner                    |
| `charge.refunded`               | Process refund, cancel enrollment |

---

### POST /webhooks/zoom

Handle Zoom meeting webhooks.

**Authentication:** Webhook signature verification  
**Permissions:** None

**Headers:**

| Header                     | Description            |
| -------------------------- | ---------------------- |
| `X-Zoom-Signature`         | Zoom webhook signature |
| `X-Zoom-Request-Timestamp` | Request timestamp      |

**Request Body (Session Started):**

```json
{
  "event": "meeting.started",
  "payload": {
    "account_id": "abc123",
    "object": {
      "id": "123456789",
      "uuid": "meeting-uuid",
      "host_id": "host_123",
      "topic": "Week 1: Introduction",
      "start_time": "2024-01-15T10:00:00Z"
    }
  }
}
```

**Response Schema:**

```json
{
  "received": true
}
```

**Handled Events:**

| Event                 | Action                           |
| --------------------- | -------------------------------- |
| `meeting.started`     | Update session status to `live`  |
| `meeting.ended`       | Update session status to `ended` |
| `recording.completed` | Attach recording to session      |
| `meeting.deleted`     | Mark session as cancelled        |

---

## Data Types

### Money

```json
{
  "amount": 4900,
  "currency": "USD"
}
```

Amount is in the smallest currency unit (cents for USD).

### CourseStatus

| Value          | Description           |
| -------------- | --------------------- |
| `draft`        | Course in development |
| `under-review` | Submitted for review  |
| `published`    | Publicly available    |
| `archived`     | No longer available   |

### CourseType

| Value        | Description                |
| ------------ | -------------------------- |
| `self-paced` | Learn at own pace          |
| `cohort`     | Group-based with schedule  |
| `live-only`  | Only live sessions         |
| `hybrid`     | Mix of self-paced and live |

### CourseLevel

| Value          | Description                     |
| -------------- | ------------------------------- |
| `beginner`     | No prior knowledge required     |
| `intermediate` | Some experience required        |
| `advanced`     | Significant experience required |
| `all-levels`   | Suitable for all levels         |

### EnrollmentStatus

| Value             | Description             |
| ----------------- | ----------------------- |
| `pending-payment` | Awaiting payment        |
| `active`          | Currently enrolled      |
| `completed`       | Finished course         |
| `expired`         | Enrollment period ended |
| `cancelled`       | Cancelled by user/admin |
| `refunded`        | Payment refunded        |

### ModuleProgressStatus

| Value         | Description         |
| ------------- | ------------------- |
| `not-started` | Module not accessed |
| `in-progress` | Currently learning  |
| `completed`   | Module finished     |

### AssignmentType

| Value           | Description              |
| --------------- | ------------------------ |
| `quiz`          | Multiple choice quiz     |
| `file-upload`   | File submission          |
| `text-response` | Written response         |
| `peer-review`   | Peer-reviewed assignment |
| `project`       | Comprehensive project    |

### SubmissionStatus

| Value       | Description              |
| ----------- | ------------------------ |
| `submitted` | Awaiting review          |
| `grading`   | Being graded             |
| `graded`    | Grade assigned           |
| `returned`  | Returned for revision    |
| `late`      | Submitted after deadline |

### LiveSessionStatus

| Value       | Description           |
| ----------- | --------------------- |
| `scheduled` | Upcoming session      |
| `live`      | Currently in progress |
| `ended`     | Session completed     |
| `cancelled` | Session cancelled     |
| `recorded`  | Recording available   |

---

## Changelog

### v1.0.0 (2024-01-01)

- Initial API release
- Core catalog, enrollment, and learning endpoints
- Instructor and admin portals
- Certificate generation and verification
- Webhook integrations for payment and video conferencing
