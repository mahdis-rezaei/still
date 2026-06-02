import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import path from "node:path";
import { existsSync } from "node:fs";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// Behind Replit's proxy — trust the first hop so req.ip is the real client IP
// (needed for per-IP rate limiting) and secure cookies work.
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
// Reflect the request origin and allow credentials so the session cookie
// flows in both same-origin (production) and proxied-dev setups.
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// In production, this single service also serves the built frontend (the SPA),
// so one deployment serves both the app and /api. The static build location can
// vary with the deploy's working directory, so probe the likely spots (or set
// STATIC_DIR explicitly). In dev this is skipped — Vite serves the frontend.
function resolveStaticDir(): string | null {
  const candidates = [
    process.env.STATIC_DIR,
    path.resolve(process.cwd(), "artifacts/still/dist/public"),
    path.resolve(process.cwd(), "../still/dist/public"),
    path.resolve(process.cwd(), "dist/public"),
  ].filter(Boolean) as string[];
  return candidates.find((p) => existsSync(path.join(p, "index.html"))) ?? null;
}

if (process.env.NODE_ENV === "production") {
  const staticDir = resolveStaticDir();
  if (staticDir) {
    app.use(express.static(staticDir));
    // SPA fallback: any non-/api GET serves index.html so client-side routes
    // (e.g. /library, /settings/privacy) work on refresh / direct load.
    app.use((req, res, next) => {
      if (req.method !== "GET" || req.path.startsWith("/api")) return next();
      res.sendFile(path.join(staticDir, "index.html"));
    });
    logger.info({ staticDir }, "Serving built frontend");
  } else {
    logger.warn(
      "NODE_ENV=production but no built frontend found (set STATIC_DIR or build @workspace/still)",
    );
  }
}

export default app;
