# Bullseye — Local-First Screenshot & Video Capture Engine

Bullseye is a local-first web application for high-quality website screenshots and screen recordings built with Next.js (App Router), TypeScript, Playwright, Node 22 native SQLite, and local FFmpeg.

## Features

- **Screenshot Engine**: Viewport and full-page PNG capture with DPR control, CSS animation disabling, and custom wait stabilization.
- **Screen Recording Engine**: Playwright native WebM recording with duration, custom viewport, and EBML container validation.
- **FFmpeg Video Pipeline (Phase 11)**: Local WebM → MP4 conversion with quality presets, process cleanup, and original WebM preservation.
- **Action Engine**: Interactive browser step execution (clicks, typing, hover, scrolling, waiting) prior to or during capture.
- **Mockup Engine & Visual QA**: SVG vector composition, multi-format mockups, and pixel-by-pixel visual diffing.
- **Production Hardening (Phase 15.1)**: Bounded concurrency, process isolation, SQLite WAL mode, URL scheme validation, path security, and idempotent cancellation.

## System Dependencies

### FFmpeg (Optional, for MP4 Conversion)
For MP4 video conversion, Bullseye uses system FFmpeg or bundled `ffmpeg-static`:

```bash
# Ubuntu / Debian
sudo apt-get update && sudo apt-get install -y ffmpeg

# macOS
brew install ffmpeg
```

For complete FFmpeg details and licensing information, see [FFMPEG.md](./FFMPEG.md).
For production hardening details and security policies, see [HARDENING.md](./HARDENING.md).
For Linux ARM64 (aarch64) deployment and Oracle Cloud Ampere A1 verification, see [ARM64.md](./ARM64.md).

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   npx playwright install chromium
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Testing & Quality Assurance

- **Unit Tests**: `npm test`
- **Type Check**: `npm run typecheck`
- **Lint**: `npm run lint`
- **End-to-End Tests**: `npm run test:e2e`
- **ARM64 Smoke Test**: `npm run smoke:arm64`
- **Production Build**: `npm run build`
