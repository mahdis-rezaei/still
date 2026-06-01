---
name: Still zod/v4 import
description: Correct zod import pattern for api-server (esbuild)
---

## Rule
Use `import { z } from "zod"` — NOT `import { z } from "zod/v4"`.
esbuild cannot resolve the `zod/v4` subpath import when bundling the api-server.
Adding zod as a direct dependency to api-server works correctly.

## drizzle-zod insert schemas in lib/db
The catalog zod is v3.25 but drizzle-zod 0.8.x's `createInsertSchema` emits a
v4-style `ZodObject` that does NOT satisfy the v3 `ZodType` constraint, so
`z.infer<typeof createInsertSchema(...)>` fails `typecheck:libs` (TS2344).
**Fix:** for `@workspace/db` schema files, skip `createInsertSchema` entirely and
derive types from the table: `type X = typeof xTable.$inferSelect` /
`$inferInsert`. The server validates with generated `@workspace/api-zod` schemas
anyway, so drizzle-zod buys nothing here.
