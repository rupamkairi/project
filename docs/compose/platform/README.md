# Platform Compose

The Platform Compose provides a comprehensive dashboard for managing platform-level resources including authentication, user management, role management, notifications, and settings.

## Login Credentials

The platform is seeded with a demo admin user:

- **Email**: `admin@platform.local`
- **Password**: `admin123`

This user has the `platform-admin` role with full system access.

## Features

### 1. Authentication

The platform provides JWT-based authentication with the following endpoints:

| Feature | Description                          |
| ------- | ------------------------------------ |
| Login   | Authenticate with email and password |
| Logout  | Invalidate the current session       |
| Me      | Get current authenticated user info  |
| Refresh | Refresh an expired token             |

### 2. User Management

Full CRUD operations for platform users:

- List users with pagination and search
- Create new users
- Update user details (name, avatar)
- Suspend/Activate users
- Delete (soft delete) users
- Manage user sessions

### 3. Role Management

Role-based access control:

- List roles with pagination
- Create custom roles
- Update role details and permissions
- Delete roles (non-system roles only)
- Assign/revoke roles to users

### 4. Notifications

Notification template and trigger management:

- List notification templates
- Create custom templates
- Update template content
- Delete templates (non-system only)
- Manage triggers
- View notification logs

### 5. Settings

Platform-wide configuration:

- List all platform settings
- Update settings by key

## API Endpoints

All API endpoints are prefixed with `/platform`.

### Authentication

```
POST /platform/auth/login
POST /platform/auth/logout
GET  /platform/auth/me
POST /platform/auth/refresh
```

**Login Request:**

```bash
curl -X POST http://localhost:3000/platform/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@platform.local", "password": "admin123"}'
```

**Response:**

```json
{
  "token": "eyJhbGc...",
  "actor": {
    "id": "actor_platform_admin",
    "email": "admin@platform.local",
    "firstName": "Platform",
    "lastName": "Admin"
  }
}
```

### Users

```
GET    /platform/users              # List users (paginated)
GET    /platform/users/:id          # Get user by ID
POST   /platform/users              # Create user
PATCH  /platform/users/:id          # Update user
POST   /platform/users/:id/suspend   # Suspend user
POST   /platform/users/:id/activate # Activate user
DELETE /platform/users/:id           # Delete user
GET    /platform/users/:id/sessions  # List user sessions
DELETE /platform/users/:id/sessions/:sessionId  # Revoke session
```

**List Users:**

```bash
curl -X GET "http://localhost:3000/platform/users?page=1&limit=20" \
  -H "Authorization: Bearer <token>"
```

**Response:**

```json
{
  "data": [
    {
      "id": "actor_platform_admin",
      "email": "admin@platform.local",
      "firstName": "Platform",
      "lastName": "Admin",
      "status": "active",
      "type": "human",
      "createdAt": "2026-03-16T09:52:15.550Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

### Roles

```
GET    /platform/roles              # List roles (paginated)
GET    /platform/roles/:id          # Get role by ID with members
POST   /platform/roles              # Create role
PATCH  /platform/roles/:id          # Update role
DELETE /platform/roles/:id          # Delete role
POST   /platform/roles/:id/assign   # Assign role to users
POST   /platform/roles/:id/revoke   # Revoke role from users
```

**List Roles:**

```bash
curl -X GET "http://localhost:3000/platform/roles" \
  -H "Authorization: Bearer <token>"
```

**Response:**

```json
{
  "data": [
    {
      "id": "plt_role_platform-admin",
      "name": "platform-admin",
      "description": "Platform Administrator - Full system access",
      "permissions": ["*:*"],
      "isDefault": false,
      "isSystem": true,
      "createdAt": "2026-03-16T09:52:15.550Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 3,
    "totalPages": 1
  }
}
```

### Notifications

```
GET    /platform/notifications/templates        # List templates
GET    /platform/notifications/templates/:id    # Get template
POST   /platform/notifications/templates        # Create template
PUT    /platform/notifications/templates/:id    # Update template
DELETE /platform/notifications/templates/:id   # Delete template
GET    /platform/notifications/triggers         # List triggers
POST   /platform/notifications/triggers         # Create trigger
DELETE /platform/notifications/triggers/:id     # Delete trigger
GET    /platform/notifications/logs             # List notification logs
```

### Settings

```
GET    /platform/settings           # List all settings
PATCH  /platform/settings/:key       # Update a setting
```

**Get Settings:**

```bash
curl -X GET "http://localhost:3000/platform/settings" \
  -H "Authorization: Bearer <token>"
```

**Response:**

```json
{
  "platform.name": { "value": "Platform" },
  "platform.logo": { "value": "" },
  "auth.allowSelfRegistration": { "value": false },
  "auth.requireEmailVerification": { "value": true },
  "auth.sessionTTLSeconds": { "value": 28800 },
  "auth.maxSessionsPerActor": { "value": 3 },
  "auth.passwordPolicy.minLength": { "value": 8 },
  "notification.defaultChannel": { "value": "email" },
  "notification.supportedChannels": { "value": ["email", "in_app"] }
}
```

## Web UI Routes

The platform web compose provides the following routes:

| Route                      | Description                          |
| -------------------------- | ------------------------------------ |
| `/login`                   | Login page                           |
| `/dashboard`               | Main dashboard with navigation cards |
| `/dashboard/users`         | User management interface            |
| `/dashboard/roles`         | Role management interface            |
| `/dashboard/notifications` | Notification templates and triggers  |

## How to Test Each Feature

### 1. Authentication

1. Start the server: `cd apps/server && bun run dev`
2. Start the web app: `cd apps/web && bun run dev`
3. Navigate to `/login`
4. Login with: `admin@platform.local` / `admin123`
5. You should be redirected to `/dashboard`

### 2. User Management

1. After logging in, navigate to `/dashboard/users`
2. View the list of users
3. Click "Create User" to add a new user
4. Test updating a user by clicking edit
5. Test suspending/activating a user
6. Test deleting a user

### 3. Role Management

1. Navigate to `/dashboard/roles`
2. View the list of roles (platform-admin, platform-ops, platform-viewer)
3. Click "Create Role" to add a new custom role
4. Test updating a role's permissions
5. Test assigning a role to a user
6. Test revoking a role

### 4. Notifications

1. Navigate to `/dashboard/notifications`
2. View the list of notification templates
3. Create a new template
4. Test updating a template
5. View triggers (if any)
6. View notification logs

### 5. Settings

1. Using the API, query `/platform/settings`
2. Update a setting: `PATCH /platform/settings/auth.sessionTTLSeconds`
3. Query again to verify the change

```bash
# Update session TTL
curl -X PATCH "http://localhost:3000/platform/settings/auth.sessionTTLSeconds" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"value": 7200}'
```

## Database Schema

The platform compose uses the following tables:

- `plt_settings` - Platform-wide configuration key-value store
- `plt_compose_config` - Compose deployment configuration
- `plt_organization_settings` - Organization-specific platform settings

## Seeded Data

On first run, the following data is seeded:

- Default organization: "Platform" (org_platform_default)
- Platform settings (9 settings)
- Notification templates (6 system templates)
- Platform roles (3 roles: platform-admin, platform-ops, platform-viewer)
- Admin actor with platform-admin role
