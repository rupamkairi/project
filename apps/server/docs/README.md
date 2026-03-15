# ProjectX Server Documentation

## Quick Start

### Generate Documentation

```bash
# Navigate to server directory
cd apps/server

# Generate all documentation (TypeDoc + OpenAPI)
bun run docs:build

# Generate TypeDoc only (no server needed)
bun run docs:generate:skip-openapi

# Export OpenAPI spec (server must be running)
bun run docs:export-openapi
```

### View Documentation

Open `docs/generated/index.html` in your browser.

## What Gets Documented

### TypeDoc (Auto-Generated)

| Category | Location | Description |
|----------|----------|-------------|
| **Core** | `src/core/` | Primitives, errors, entities, events, CQRS, etc. |
| **Modules** | `src/modules/*/` | All module exports (commands, queries, events) |
| **Types** | All exports | TypeScript interfaces, types, classes |
| **Functions** | All exports | Exported functions with JSDoc |

### OpenAPI (Auto-Exported)

| Endpoint | Description |
|----------|-------------|
| `GET /swagger/openapi.json` | Full OpenAPI 3.0 spec |
| `GET /swagger` | Interactive Swagger UI |
| `GET /health` | Health check |
| `GET /modules` | Registered modules |
| `GET /core` | Core layer introspection |
| `GET /schemas` | Database schemas |

## JSDoc Examples

### Function Documentation

```typescript
/**
 * Creates a new user entity with validated data.
 * 
 * @param data - User creation data
 * @param data.email - User's email address (must be unique)
 * @param data.name - User's full name
 * @param data.role - User's role (default: "user")
 * 
 * @returns The created user entity
 * 
 * @throws {ValidationError} If email is invalid or already exists
 * @throws {AuthorizationError} If caller lacks permission
 * 
 * @example
 * ```typescript
 * const user = await createUser({
 *   email: "user@example.com",
 *   name: "John Doe"
 * });
 * ```
 * 
 * @category Module:Identity
 */
export async function createUser(data: CreateUserDto): Promise<User> {
  // implementation
}
```

### Class Documentation

```typescript
/**
 * Domain event for user registration.
 * 
 * Emitted when a new user successfully registers in the system.
 * Used for sending welcome emails and initializing user data.
 * 
 * @category Event
 */
export class UserRegisteredEvent extends DomainEvent {
  /**
   * The unique identifier of the registered user
   */
  readonly userId: string;
  
  /**
   * The email address of the registered user
   */
  readonly email: string;
}
```

### Interface Documentation

```typescript
/**
 * Monetary value with currency.
 * 
 * All amounts are stored as integers in the smallest currency unit
 * (e.g., cents, paise) to avoid floating-point precision issues.
 * 
 * @example
 * ```typescript
 * const price: Money = { amount: 999, currency: "USD" }; // $9.99
 * const total = moneyAdd(price, { amount: 100, currency: "USD" });
 * ```
 * 
 * @category Core
 */
export interface Money {
  /** Amount in smallest currency unit (integer) */
  amount: number;
  /** ISO 4217 currency code (e.g., "USD", "EUR", "INR") */
  currency: string;
}
```

## Automation

### Git Hook (Auto-Generate on Commit)

Documentation is automatically generated before each commit.

**Enable:**
```bash
cp .githooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

**Skip:** `git commit --no-verify`

### Cursor AI Integration

Cursor AI is configured to:
- ✅ Add JSDoc to new exports automatically
- ✅ Update docs when modifying existing code
- ✅ Use proper `@category` tags

**Trigger manually:** Ask Cursor to "update documentation for recent changes"

### KiloCode Integration

**Initialize Memory Bank:**
```bash
mkdir -p .kilocode/rules/memory-bank
# Create brief.md with project summary
# In KiloCode: "Architect mode: initialize memory bank"
```

**Update docs:** In KiloCode chat: "update memory bank"

## Configuration

### TypeDoc (`typedoc.json`)

```json
{
  "entryPoints": ["src/core/index.ts", "src/modules/*/index.ts"],
  "out": "docs/generated",
  "excludePrivate": true,
  "excludeInternal": true
}
```

### Scripts

| Command | Description |
|---------|-------------|
| `docs:build` | Generate all docs |
| `docs:generate` | Generate TypeDoc + OpenAPI |
| `docs:generate:skip-openapi` | Generate TypeDoc only |
| `docs:export-openapi` | Export OpenAPI spec only |

## Troubleshooting

### TypeDoc Errors

**"Module not found"**
```bash
# Ensure you're in apps/server directory
cd apps/server
bun run docs:build
```

**"No exported members"**
- Check that exports are in `src/core/index.ts` or `src/modules/*/index.ts`
- Verify `typedoc.json` entryPoints

### OpenAPI Export Fails

**"Failed to fetch"**
```bash
# Start the server first
bun run dev

# Then export in another terminal
bun run docs:export-openapi
```

### Git Hook Issues

**"Permission denied"**
```bash
chmod +x .git/hooks/pre-commit
```

**"Command not found: bun"**
```bash
# Add bun to PATH in the hook
# Edit .githooks/pre-commit and add:
export PATH="$HOME/.bun/bin:$PATH"
```

## File Structure

```
apps/server/
├── docs/
│   ├── generated/        ← Auto-generated HTML docs
│   │   ├── index.html
│   │   ├── modules/
│   │   └── assets/
│   └── api/
│       └── openapi.json  ← OpenAPI specification
├── scripts/
│   ├── generate-docs.ts  ← Main generation script
│   └── export-openapi.ts ← OpenAPI export script
├── .githooks/
│   └── pre-commit        ← Auto-generate on commit
├── .cursor/
│   └── rules/
│       └── docs.mdc      ← Cursor AI rules
├── typedoc.json          ← TypeDoc configuration
└── README.md             ← This file
```
