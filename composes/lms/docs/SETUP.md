# LMS Setup Guide

This guide walks you through setting up the Learning Management System (LMS) compose module.

## Prerequisites

### Runtime Requirements

| Requirement    | Version | Notes                                        |
| -------------- | ------- | -------------------------------------------- |
| **Bun**        | 1.0.25+ | Primary runtime (not Node.js)                |
| **PostgreSQL** | 15+     | Primary database (Neon recommended)          |
| **Redis**      | 7+      | Required for queues, websockets, and caching |

### Required Accounts

| Service                                   | Purpose            | Required For                 |
| ----------------------------------------- | ------------------ | ---------------------------- |
| **Stripe** or **Razorpay**                | Payment processing | Paid courses                 |
| **Zoom** or **Google Meet**               | Live sessions      | Cohort-based/live courses    |
| **AWS S3** or **Cloudflare R2**           | Media storage      | Course content, certificates |
| **Email Provider** (SMTP/Resend/SendGrid) | Notifications      | All deployments              |

### Optional Accounts

| Service                 | Purpose           |
| ----------------------- | ----------------- |
| **Twilio** or **MSG91** | SMS notifications |
| **CDN**                 | Asset delivery    |

---

## Installation Steps

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd project

# Install dependencies with Bun
bun install

# Verify installation
bun --version
```

### 2. Database Setup

```bash
# Create PostgreSQL database
createdb lms_dev

# Or using psql
psql -U postgres -c "CREATE DATABASE lms_dev;"

# Run migrations
bun run db:migrate

# Generate migration files (if needed)
bun run db:generate

# Seed initial data (roles, categories, templates, ledger accounts)
bun run db:seed
```

The seed process creates:

- **5 default roles**: lms-admin, content-reviewer, instructor, learner, org-admin
- **6 course categories**: Technology, Design, Business, Science, Personal Development, Language
- **1 workflow template**: Course Review workflow
- **17 notification templates**: Enrollment, session, certificate, etc.
- **5 ledger accounts**: Revenue, Refunds, Tax, Receivable, Deferred Revenue

### 3. Environment Configuration

Create a `.env` file in `apps/server/`:

```env
# ===========================================
# Server Configuration
# ===========================================
PORT=3000
NODE_ENV=development
APP_VERSION=0.1.0

# ===========================================
# Database (PostgreSQL)
# ===========================================
# Neon connection string (recommended)
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require

# Local PostgreSQL
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lms_dev

# ===========================================
# Redis (Queues, Websockets, Caching)
# ===========================================
REDIS_URL=redis://localhost:6379
# For production with auth:
# REDIS_URL=redis://:password@host:6379/0

# ===========================================
# Authentication
# ===========================================
JWT_SECRET=changeme_min_32_characters_long
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_EXPIRES_IN=30d

# ===========================================
# Storage Configuration
# ===========================================
# Provider: local | s3 | gcs | r2
STORAGE_PROVIDER=s3
STORAGE_LOCAL_PATH=./uploads

# S3 Configuration
S3_BUCKET=your-lms-bucket
S3_REGION=us-east-1
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key

# Cloudflare R2 (alternative to S3)
# STORAGE_PROVIDER=r2
# S3_BUCKET=your-r2-bucket
# S3_REGION=auto
# S3_ACCESS_KEY=your-r2-access-key
# S3_SECRET_KEY=your-r2-secret-key
# R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com

# CDN (optional, for faster asset delivery)
CDN_BASE_URL=https://cdn.yourdomain.com

# ===========================================
# Payment Gateway (Choose one)
# ===========================================
# Stripe (recommended for global)
PAYMENT_PROVIDER=stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Razorpay (recommended for India)
# PAYMENT_PROVIDER=razorpay
# RAZORPAY_KEY_ID=rzp_test_xxx
# RAZORPAY_KEY_SECRET=xxx
# RAZORPAY_WEBHOOK_SECRET=xxx

# ===========================================
# Video Meeting (Choose one)
# ===========================================
# Zoom
VIDEO_PROVIDER=zoom
ZOOM_API_KEY=your-zoom-api-key
ZOOM_API_SECRET=your-zoom-api-secret
ZOOM_WEBHOOK_SECRET=your-webhook-secret-token

# Google Meet (limited features)
# VIDEO_PROVIDER=google-meet
# GOOGLE_MEET_API_KEY=xxx
# GOOGLE_MEET_API_SECRET=xxx

# ===========================================
# Email Configuration
# ===========================================
# Provider: console | smtp | resend | sendgrid
EMAIL_PROVIDER=console

# SMTP
# EMAIL_PROVIDER=smtp
# SMTP_HOST=smtp.example.com
# SMTP_PORT=587
# SMTP_USER=your-smtp-user
# SMTP_PASS=your-smtp-password
# SMTP_FROM=noreply@yourdomain.com

# Resend
# EMAIL_PROVIDER=resend
# RESEND_API_KEY=re_xxx
# EMAIL_FROM=noreply@yourdomain.com

# SendGrid
# EMAIL_PROVIDER=sendgrid
# SENDGRID_API_KEY=SG.xxx
# EMAIL_FROM=noreply@yourdomain.com

# ===========================================
# SMS Notifications (Optional)
# ===========================================
# Provider: console | twilio | msg91
SMS_PROVIDER=console

# Twilio
# SMS_PROVIDER=twilio
# TWILIO_ACCOUNT_SID=ACxxx
# TWILIO_AUTH_TOKEN=xxx
# TWILIO_FROM=+1234567890

# MSG91 (India)
# SMS_PROVIDER=msg91
# MSG91_AUTH_KEY=xxx
# MSG91_SENDER_ID=LMSAPP

# ===========================================
# LMS Module Configuration
# ===========================================
# Feature flags
LMS_ENABLE_CERTIFICATES=true
LMS_ENABLE_COHORTS=true
LMS_ENABLE_LIVE_SESSIONS=true
LMS_ENABLE_QUIZZES=true
LMS_ENABLE_PEER_REVIEW=false

# Default settings
LMS_COMPLETION_THRESHOLD=80
LMS_REFUND_WINDOW_DAYS=14
LMS_INACTIVITY_NUDGE_DAYS=7
LMS_SESSION_REMINDER_MINUTES=1440,30
LMS_MAX_QUIZ_ATTEMPTS=3
LMS_CERTIFICATE_EXPIRY_DAYS=0
```

### 4. Module Configuration

The LMS compose depends on the following modules (auto-configured):

```typescript
// Module dependencies
const modules = [
  "identity", // User management, roles, permissions
  "catalog", // Course catalog, categories
  "ledger", // Payments, accounting
  "workflow", // Course review workflow
  "scheduling", // Live sessions, cohorts
  "document", // Media assets, certificates
  "notification", // Emails, push notifications
  "analytics", // Learning analytics
];

// Custom module configuration
const moduleConfig = {
  catalog: {
    itemLabel: "Course",
    enableVariants: false,
    enablePriceLists: true,
    enableSearch: true,
  },
  scheduling: {
    resourceLabel: "Instructor",
    slotLabel: "Live Session",
    enableRecurring: true,
  },
  ledger: {
    baseCurrency: "USD",
    supportedCurrencies: ["USD", "EUR", "INR", "GBP"],
  },
  workflow: {
    processLabel: "Course Review",
  },
};
```

### 5. Integration Setup

#### Stripe Setup

1. **Create Stripe Account**
   - Go to [stripe.com](https://stripe.com) and create an account
   - Complete business verification

2. **Get API Keys**
   - Navigate to Developers → API Keys
   - Copy `Publishable key` and `Secret key`
   - Use test keys for development

3. **Configure Webhooks**
   - Go to Developers → Webhooks
   - Add endpoint: `https://yourdomain.com/api/webhooks/stripe`
   - Select events:
     - `checkout.session.completed`
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `charge.refunded`
   - Copy the `Signing secret` as `STRIPE_WEBHOOK_SECRET`

#### Razorpay Setup (India)

1. **Create Razorpay Account**
   - Go to [razorpay.com](https://razorpay.com) and create an account
   - Complete KYC verification

2. **Get API Keys**
   - Navigate to Settings → API Keys
   - Generate new key pair
   - Copy `Key ID` and `Key Secret`

3. **Configure Webhooks**
   - Go to Settings → Webhooks
   - Add endpoint: `https://yourdomain.com/api/webhooks/razorpay`
   - Select events: `payment.authorized`, `payment.failed`, `refund.created`
   - Copy webhook secret

#### Zoom Setup

1. **Create Zoom App**
   - Go to [marketplace.zoom.us](https://marketplace.zoom.us)
   - Create a Server-to-Server OAuth app
   - Or create a JWT app (legacy, being deprecated)

2. **Get Credentials**
   - Copy `Account ID`, `Client ID`, and `Client Secret`
   - For JWT: Copy `API Key` and `API Secret`

3. **Configure Webhooks**
   - In your app settings, enable Event Subscriptions
   - Add endpoint: `https://yourdomain.com/api/webhooks/zoom`
   - Select events:
     - `meeting.started`
     - `meeting.ended`
     - `recording.completed`

4. **Enable Cloud Recording** (optional)
   - In Zoom account settings, enable cloud recording

#### Storage Setup (S3/R2)

**AWS S3:**

```bash
# Create S3 bucket
aws s3 mb s3://your-lms-bucket

# Configure CORS
aws s3api put-bucket-cors --bucket your-lms-bucket --cors-configuration file://cors.json
```

```json
// cors.json
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedOrigins": ["https://yourdomain.com"],
      "ExposeHeaders": ["ETag"]
    }
  ]
}
```

**Cloudflare R2:**

1. Create R2 bucket in Cloudflare dashboard
2. Generate API token with R2 read/write permissions
3. Configure public access or custom domain for CDN

---

## Running the Application

### Development

```bash
# Start all services
bun run dev

# Start server only
bun run dev:server

# Start worker process
bun run dev:worker

# Start with hot reload
bun --hot run apps/server/src/index.ts
```

### Production

```bash
# Build for production
bun run build

# Start production server
NODE_ENV=production bun run start

# Start worker process (separate instance)
NODE_ENV=production bun run start:worker
```

### Worker Process

The LMS uses scheduled jobs for:

| Job                            | Schedule          | Purpose                               |
| ------------------------------ | ----------------- | ------------------------------------- |
| `session-reminders-1-day`      | Every hour        | Send reminders 24h before sessions    |
| `session-reminders-30-min`     | Every 5 min       | Send reminders 30 min before sessions |
| `enrollment-expiry-check`      | Daily at midnight | Check for expired enrollments         |
| `enrollment-expiry-warning`    | Daily             | Send expiry warnings                  |
| `assignment-due-reminders`     | Daily             | Remind about due assignments          |
| `learner-inactivity-nudge`     | Daily             | Nudge inactive learners               |
| `cohort-activation`            | Hourly            | Activate scheduled cohorts            |
| `certificate-expiry-reminder`  | Daily             | Warn about expiring certificates      |
| `analytics-snapshot`           | Daily at 1 AM     | Generate analytics snapshots          |
| `deferred-revenue-recognition` | Monthly           | Revenue recognition accounting        |

---

## Verification

### Health Checks

```bash
# Server health
curl http://localhost:3000/health

# Database connection
curl http://localhost:3000/health/db

# Redis connection
curl http://localhost:3000/health/redis

# All services
curl http://localhost:3000/health/all
```

### Test Endpoints

```bash
# List courses (public)
curl http://localhost:3000/api/lms/courses

# Get course by slug
curl http://localhost:3000/api/lms/courses/slug/intro-to-typescript

# Verify certificate
curl http://localhost:3000/api/lms/certificates/verify/ABC123

# Search courses
curl "http://localhost:3000/api/lms/courses/search?q=typescript"
```

### Verify Webhooks

```bash
# Stripe webhook test
stripe trigger payment_intent.succeeded

# Or manually test
curl -X POST http://localhost:3000/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: whsec_xxx" \
  -d '{"type": "checkout.session.completed", "data": {}}'
```

---

## Troubleshooting

### Common Issues

#### Database Connection Failed

```
Error: Connection refused (port 5432)
```

**Solution:**

```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432

# For Neon/remote databases, verify DATABASE_URL
echo $DATABASE_URL

# Check SSL mode for Neon
# Add ?sslmode=require to DATABASE_URL
```

#### Redis Connection Failed

```
Error: ECONNREFUSED 127.0.0.1:6379
```

**Solution:**

```bash
# Start Redis locally
redis-server

# Or check Redis status
redis-cli ping

# For remote Redis, verify REDIS_URL
```

#### JWT Secret Too Short

```
Error: JWT secret must be at least 32 characters
```

**Solution:**

```bash
# Generate a secure secret
openssl rand -base64 32

# Update .env
JWT_SECRET=<generated-secret>
```

#### Stripe Webhook Verification Failed

```
Error: Invalid webhook signature
```

**Solution:**

1. Verify `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard
2. Ensure raw body is passed to webhook handler
3. Check Content-Type header is `application/json`

#### Zoom JWT Token Invalid

```
Error: Invalid access token
```

**Solution:**

1. Verify API Key and Secret are correct
2. Check token hasn't expired (tokens valid for 1 hour)
3. Ensure using Server-to-Server OAuth (JWT deprecated)

#### Migration Fails

```
Error: relation "lms_courses" already exists
```

**Solution:**

```bash
# Check migration status
bun run db:status

# Reset migrations (development only!)
bun run db:reset

# Push schema directly (development)
bun run db:push
```

#### Storage Upload Fails

```
Error: Access Denied (S3)
```

**Solution:**

1. Verify S3 credentials have correct permissions
2. Check bucket exists and region is correct
3. Ensure IAM policy allows s3:PutObject

---

## Production Deployment

### Environment Variables

Ensure these are set in production:

```env
NODE_ENV=production
DATABASE_URL=<production-postgres-url>
REDIS_URL=<production-redis-url>
JWT_SECRET=<secure-32+-char-secret>

# Use production/live API keys
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### Scaling Considerations

| Component          | Scaling Strategy                        |
| ------------------ | --------------------------------------- |
| **API Server**     | Horizontal scaling behind load balancer |
| **Worker Process** | Multiple instances for job processing   |
| **Redis**          | Use Redis Cluster for high availability |
| **PostgreSQL**     | Use connection pooling (PgBouncer)      |
| **Storage**        | Use CDN for media assets                |

### Recommended Infrastructure

```yaml
# Minimum Production Setup
API Servers: 2 instances (2 CPU, 4GB RAM each)
Worker Processes: 2 instances (1 CPU, 2GB RAM each)
PostgreSQL: Managed (Neon, RDS) - db.t3.medium
Redis: Managed (Upstash, ElastiCache) - 1GB
Storage: S3 with CloudFront CDN
```

### Monitoring Setup

```bash
# Health check endpoint
GET /health

# Metrics endpoint (if enabled)
GET /metrics

# Log aggregation
# Configure Winston/Pino to output JSON logs
# Forward to Datadog, CloudWatch, or similar
```

### Security Checklist

- [ ] JWT_SECRET is 32+ characters
- [ ] Database uses SSL (`?sslmode=require`)
- [ ] Redis requires authentication
- [ ] API keys are production/live keys
- [ ] Webhook secrets are configured
- [ ] CORS is restricted to your domain
- [ ] Rate limiting is enabled
- [ ] File upload size limits are set

---

## Next Steps

1. Create an organization and admin user
2. Set up instructor accounts
3. Create course categories
4. Build your first course
5. Configure notification templates (if customizing)
6. Test the enrollment and payment flow
7. Set up monitoring and alerts

For API documentation, see the OpenAPI spec at `/api/docs` when running the server.
