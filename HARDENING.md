# Bullseye Production Hardening & Safety Specification (Phase 15.1)

## Overview

Bullseye Phase 15.1 introduces comprehensive production hardening, resource safety controls, process isolation, database WAL mode reliability, and filesystem security.

---

## Key Hardening Policies & Mechanisms

### 1. Security & URL Safety
- **Protocol Restriction**: Bullseye strictly allows `http://` and `https://` target URLs. Schemes such as `file://`, `data:`, `javascript:`, `chrome:`, `about:`, and `ftp://` are rejected to prevent local filesystem reads or browser context exploitation.
- **Path Traversal Protection**: Output directories and generated filenames are sanitized via `getSecureOutputPath` in `src/capture/path-utils.ts`, enforcing strict confinement within the application process root directory (`public/captures` or process `cwd`). Relative path components (`..`, `.`) in filenames are stripped.

### 2. Subprocess Isolation & FFmpeg Pipeline
- **Direct Spawning**: All external subprocesses (including FFmpeg) are executed via direct `spawn`/`execFile` argument arrays without shell interpolation (`shell: false`), preventing shell and command injection vulnerabilities.
- **Binary Resolution**: FFmpeg path resolution dynamically evaluates `process.env.FFMPEG_PATH`, system `ffmpeg`, and bundled `ffmpeg-static` in `node_modules` (`src/utils/ffmpeg.ts`).
- **Resource Bounds**:
  - `stderr` output buffer capped at 100KB to prevent memory exhaustion.
  - Hard upper timeout enforced (default 60s, max 300s).
  - Two-stage termination (`SIGTERM` followed by fallback `SIGKILL` after 2s) ensures no orphaned FFmpeg processes remain alive upon timeout or cancellation.
  - Partial or corrupted output files are deleted immediately if conversion is aborted or fails.

### 3. Process & Browser Concurrency
- **Bounded In-Process Concurrency**: `CaptureController` enforces an in-process semaphore queue with a default concurrency bound of 4 active job execution slots (configurable up to 10 via `MAX_CONCURRENT_JOBS`).
- **SQLite Concurrency & WAL Mode**: SQLite database connection (`src/db/index.ts`) initializes `PRAGMA journal_mode = WAL;` and `PRAGMA busy_timeout = 5000;` to prevent `database is locked` contention during concurrent read/write operations.

### 4. Lifecycle & Resource Limits
- **Resource Defaults & Upper Bounds**:
  - Viewport Width: Max 7680px (8K)
  - Viewport Height: Max 4320px (8K)
  - Device Scale Factor (DPR): Max 4.0
  - Navigation/Capture Timeout: Max 120,000ms (2 mins)
  - Recording Duration: Max 300,000ms (5 mins)
  - Body / Payload Limit: Max 10MB
- **Guaranteed Browser Cleanup**: Playwright browser contexts and pages are managed with strict `try ... finally` semantics, guaranteeing page and context teardown regardless of capture success, failure, timeout, or cancellation.

### 5. Idempotent Cancellation
- Jobs can be safely cancelled at any stage of execution (navigation, stabilization, page actions, video recording, FFmpeg conversion).
- Cancelled jobs update status to `'cancelled'`, clean up temporary files and incomplete outputs, and preserve valid completed assets.

### 6. API Route & Runtime Hardening
- All REST API endpoints under `/api/` perform runtime JSON body parsing, parameter sanitization, standard HTTP status code mapping (400 Bad Request, 404 Not Found, 405 Method Not Allowed, 500 Server Error), and internal error detail sanitization.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP port for Next.js application |
| `HEADLESS` | `true` | Set `false` for headed browser debugging |
| `MAX_CONCURRENT_JOBS` | `4` | Maximum simultaneous capture execution slots (1–10) |
| `BULLSEYE_DB_PATH` | `./data/bullseye.db` | Custom path to local SQLite database |
| `FFMPEG_PATH` | (Auto-detected) | Optional explicit path to FFmpeg executable |
