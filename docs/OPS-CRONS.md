# Ops — scheduled jobs (crons)

Yadegar has **two** machine-triggered endpoints that must run on a schedule.
They are plain authenticated HTTP POSTs, so any external scheduler works. We run
them on **cron-job.org** (one account, one job each). A Replit Scheduled
Deployment would work too — but pick ONE scheduler per endpoint, never both, or
the work double-runs.

Both endpoints live under `/api/cron/*` and are authenticated the same way:

- Header **`x-cron-secret`** must equal the server's **`CRON_SECRET`** env var.
- Missing/wrong secret → **401**. `CRON_SECRET` unset on the server → **503**.
- Method **POST**, no request body.

> In a scheduler's header field paste the **literal** secret string, NOT
> `$CRON_SECRET` (that only expands in a shell).

## The two jobs

| Job | URL | Cadence | What it does |
|-----|-----|---------|--------------|
| **Tagging cron** | `https://yadegarjournal.com/api/cron/tag-resurface-safety` | every ~15 min (drains a backlog) | Classifies untagged entries → `resurface_safety` + `theme`. Re-picks any row missing either tag, so a `PROMPT_VERSION` bump auto-re-tags. |
| **Delivery cron** | `https://yadegarjournal.com/api/cron/run-nudges` | daily | Sends due writing/memory nudges (by elapsed-time, not time-of-day) and delivers any Memory Capsules whose date has arrived. |

A successful run returns HTTP 200 with a JSON summary, e.g.
`{"considered":0,"writingSent":0,"memorySent":0,"memorySilent":0,"capsulesDelivered":0,"errors":0}`.
`considered:0` just means nobody was due at that instant — not an error.

## cron-job.org setup (per job)

**Common tab**
- URL: the `https://` URL above. Use **https**, not http — an http→https redirect
  counts as failure (redirect-as-success is off) and drops the POST + headers.
- Enable job: ON. Save responses in history: ON while verifying (shows the JSON).
- Schedule: tagging = *Every 15 minutes*; delivery = *Every day at* e.g. 08:00.

**Advanced tab**
- Time zone: `America/Los_Angeles` (so "every day at 08:00" = 8 AM PT).
- Request method: **POST**. Request body: **empty**.
- Timeout: 30 s (cron-job.org free max). See caveat below.
- Treat redirects as success: OFF.
- Headers → **+ ADD**: name `x-cron-secret`, value = the literal `CRON_SECRET`.

**Verify**: "Execute now" → expect 200 + the JSON summary. 401 = bad/missing
header; 503 = `CRON_SECRET` not set on the server.

### Timeout caveat (delivery cron)
`run-nudges` loops all due users and may run the engine (LLM calls) per user, so
as the user base grows a single call can exceed the 30 s timeout. The server
keeps finishing the work after the client disconnects, but cron-job.org will
record a timeout/failure. If timeouts start appearing, make `run-nudges` return
immediately and do sends in the background (queue/worker) rather than inline.

## Manual backfill (after a tagging change)
A `PROMPT_VERSION` bump or a new tag column leaves rows pending; the scheduled
tagging cron drains them automatically, but you can finish it immediately:

```bash
curl -X POST "https://yadegarjournal.com/api/cron/tag-resurface-safety?limit=500" \
  -H "x-cron-secret: <CRON_SECRET>"
```

Repeat until the response shows `considered:0`. Until themes are fully backfilled,
diversity rotation and the why-today tiebreak run at reduced strength (untagged
entries can't be theme-muted and don't contribute to `recentThemes`).
