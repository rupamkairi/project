# User Management Implementation Plan

## Overview

This plan outlines the implementation of comprehensive User Management features for the Platform compose, following the Core → Module → Compose architecture documented in the monorepo.

## Current State

### Server Side (`composes/platform/server/src/routes/`)
- ✅ `users.ts` - Basic user CRUD (list, get, create, update, suspend, activate, delete, sessions)
- ✅ `roles.ts` - Basic role CRUD (list, get, create, update, delete, assign, revoke)

### Web Side (`composes/platform/web/src/routes/`)
- ✅ `dashboard.users.tsx` - Basic users table with actions
- ⚠️ `dashboard.roles.tsx` - Placeholder (empty implementation)

### Issues to Address
1. Hardcoded `orgId = "org_platform_default"` - should use auth context
2. Missing User Invite functionality
3. Inconsistent UI - not using @projectx/ui components
4. Roles page has no actual functionality

---

## Implementation Plan

### Phase 1: User Invite Feature

#### 1.1 Server Side - Add Invite Routes
**File:** `composes/platform/server/src/routes/invites.ts`

New endpoints:
- `POST /invites` - Create invite
- `GET /invites` - List invites (with pagination, filters)
- `GET /invites/:id` - Get invite details
- `POST /invites/:id/resend` - Resend invite
- `DELETE /invites/:id` - Cancel invite

**Note:** Notifications will be implemented later, so invite creation will:
- Create invite record in database
- Generate invite token
- Return invite link (for now, copyable)

**Database Schema:** Extend existing identity schema or create platform-specific invite table.

#### 1.2 Client Side - Add Invite API Methods
**File:** `composes/platform/web/src/lib/api/platform.ts`

Add methods:
- `getInvites(params)` - List invites
- `getInvite(id)` - Get invite details
- `createInvite(data)` - Create new invite
- `resendInvite(id)` - Resend invite
- `deleteInvite(id)` - Cancel invite

#### 1.3 Web Side - Create Invite UI
**File:** `composes/platform/web/src/routes/dashboard.invites.tsx`

Features:
- List invites with status (pending, accepted, expired)
- Create invite modal/form
- Copy invite link
- Resend invite action
- Cancel invite action

---

### Phase 2: Enhance Roles Management

#### 2.1 Enhance Server Routes (if needed)
**File:** `composes/platform/server/src/routes/roles.ts`

Already has full CRUD. Verify:
- Role permissions editing
- Member management

#### 2.2 Create Full Roles UI
**File:** `composes/platform/web/src/routes/dashboard.roles.tsx`

Features:
- List roles with member counts
- Create role modal
- Edit role (name, description, permissions)
- Delete role (with confirmation)
- View role members
- Assign/revoke members

---

### Phase 3: Enhance Users Management

#### 3.1 Enhance Users UI
**File:** `composes/platform/web/src/routes/dashboard.users.tsx`

Improve with:
- Use @projectx/ui components (Button, Input, Card, Badge)
- Add "Add User" modal with form
- Add "Edit User" modal
- Better status badges with proper colors
- Search and filter improvements
- Confirmation dialogs for destructive actions

---

### Phase 4: Navigation & Route Integration

#### 4.1 Update Dashboard Layout
**File:** `composes/platform/web/src/routes/dashboard.layout.tsx`

Add nav items:
- Users → `/dashboard/users`
- Roles → `/dashboard/roles`
- Invites → `/dashboard/invites`

#### 4.2 Update Router
**File:** `composes/platform/web/src/routes/index.ts`

Ensure new routes are exported:
- `dashboardUsersRoute`
- `dashboardRolesRoute`
- `dashboardInvitesRoute`

---

## Technical Details

### Database Schema (for Invites)

```typescript
// Extend identity.ts or create in platform schema
export const invites = pgTable('invites', {
  ...baseColumns,
  email: text('email').notNull(),
  roleIds: jsonb('role_ids').notNull().default('[]'),
  invitedBy: text('invited_by').notNull(),
  token: text('token').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  status: inviteStatusEnum('status').notNull().default('pending'),
});
```

### API Response Types

All server routes should use proper TypeScript interfaces for type safety.

### Permissions Model

Roles have permissions array. Example permissions for user management:
- `users:read` - View users
- `users:write` - Create/update users
- `users:delete` - Delete users
- `roles:read` - View roles
- `roles:write` - Create/update roles
- `roles:delete` - Delete roles
- `invites:read` - View invites
- `invites:write` - Create/manage invites

---

## Files to Modify

### Server
1. `composes/platform/server/src/index.ts` - Import invites route
2. `composes/platform/server/src/routes/invites.ts` - New file

### Web
1. `composes/platform/web/src/lib/api/platform.ts` - Add invite API methods
2. `composes/platform/web/src/routes/dashboard.users.tsx` - Enhance UI
3. `composes/platform/web/src/routes/dashboard.roles.tsx` - Full implementation
4. `composes/platform/web/src/routes/dashboard.invites.tsx` - New file
5. `composes/platform/web/src/routes/dashboard.layout.tsx` - Add nav
6. `composes/platform/web/src/routes/index.ts` - Export routes

---

## UI Component Usage

Use @projectx/ui components for consistency:

```tsx
import { Button } from "@projectx/ui/components/ui/button";
import { Input } from "@projectx/ui/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@projectx/ui/components/ui/card";
import { Badge } from "@projectx/ui/components/ui/badge";
import { Label } from "@projectx/ui/components/ui/label";
import { Spinner } from "@projectx/ui/components/ui/spinner";
```

---

## Testing Considerations

1. Test all CRUD operations for users, roles, invites
2. Test edge cases (duplicate email, expired invites, etc.)
3. Test pagination and filtering
4. Test error handling

---

## Future Enhancements (Not in Scope)

- Email notifications for invites
- Role-based access control on routes
- Bulk operations (bulk invite, bulk assign role)
- User profile management
- Session management UI
- API key management UI
