# Plans Directory

AI agents store planning documents here before implementing tasks.

---

## File Naming

```
{task-slug}.{agent-name}.plan.md
```

| Part | Rule | Examples |
|------|------|---------|
| `task-slug` | kebab-case, describes the task | `add-crm-compose` `fix-worker-routing` `migrate-identity-schema` |
| `agent-name` | your agent identifier, lowercase | `claude` `codex` `opencode` `gemini` |

**Full examples:**
```
add-crm-compose.claude.plan.md
migrate-auth-module.codex.plan.md
refactor-core-entity.opencode.plan.md
fix-worker-job-routing.claude.plan.md
```

---

## When to create a plan

- Task spans 3+ files
- Task involves architectural decisions
- Task was interrupted and needs resuming
- Task has risks or multiple valid approaches
- You want to confirm approach with the user before coding

---

## Plan format

```markdown
# Plan: {Task Name}

Agent: {agent-name}
Status: drafting | in-progress | done | abandoned

## Goal
One sentence.

## Approach
Numbered steps.

## Files to change
- path/to/file.ts — what changes

## Risks
What could go wrong.

## Notes
Anything else.
```

---

## Rules

1. **Plan before code** — write here first, then implement
2. **One plan per task** — don't combine unrelated tasks in one file
3. **Update status** — change `Status:` as work progresses
4. **Delete when done** — remove completed or abandoned plans; don't let them go stale
5. **No code in plans** — pseudocode OK, full implementations belong in source files
