---
name: Still zod/v4 import
description: Correct zod import pattern for api-server (esbuild)
---

## Rule
Use `import { z } from "zod"` — NOT `import { z } from "zod/v4"`.
esbuild cannot resolve the `zod/v4` subpath import when bundling the api-server.
Adding zod as a direct dependency to api-server works correctly.
