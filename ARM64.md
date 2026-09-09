# Bullseye ARM64 Deployment & Compatibility Guide

This document provides concise instructions for deploying and verifying Bullseye on Linux ARM64 (`aarch64`) environments, such as Oracle Cloud Infrastructure (OCI) Ampere A1 Always Free VMs.

---

## Target Environment & Specifications

- **Architectures**: `linux/arm64` (`aarch64`) and `linux/amd64` (`x86_64`)
- **Target Allocation**: Oracle Cloud Infrastructure (OCI) Ampere A1 Always Free (2 OCPUs, 12 GB RAM)
- **Recommended Host OS**: Ubuntu 22.04 LTS / 24.04 LTS ARM64 or Debian 12 ARM64
- **Container Runtime**: Docker 20.10+ / Docker Engine with Buildx

---

## Native Architecture Audit & Dependencies

Bullseye operates 100% locally with zero cloud or SaaS lock-in. All dependencies have been audited and verified for Linux ARM64 compatibility:

| Component | Technology | ARM64 Status | Execution Mechanism |
|---|---|---|---|
| Runtime | Node.js v22 LTS | Supported | Multi-arch official Node base image |
| Database | Node 22 native `node:sqlite` | Supported | Native C++ binding compiled into Node binary |
| Image Processing | Sharp (`sharp` v0.35+) | Supported | `@img/sharp-linux-arm64` prebuilt libvips binaries |
| Browser Engine | Playwright Chromium v1.50+ | Supported | Playwright ARM64 Chromium / Chrome Headless Shell |
| Video Conversion | Local FFmpeg | Supported | System `ffmpeg` package via apt / `ffmpeg-static` |

---

## Docker Deployment

### 1. Build Multi-Arch Docker Image

To build the Docker image locally or directly on an ARM64 VM:

```bash
# Direct build on ARM64 host
docker build -t bullseye:latest .

# Multi-architecture cross-build via Docker Buildx
docker buildx build --platform linux/arm64 -t bullseye:arm64 .
```

### 2. Run Bullseye Container

Ensure local persistent storage directories exist, then launch the container:

```bash
mkdir -p data public/captures

docker run -d \
  --name bullseye \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/public/captures:/app/public/captures \
  --restart unless-stopped \
  bullseye:latest
```

### 3. Required Ports & Volume Mounts

- **Port**: `3000` (Next.js web dashboard and REST API)
- **Volumes**:
  - `/app/data` — Local SQLite database persistence (`bullseye.db`)
  - `/app/public/captures` — Media output storage (PNG screenshots, WebM recordings, MP4 conversions, mockups, Visual QA diffs)

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Application HTTP listening port |
| `HOSTNAME` | `0.0.0.0` | Network binding interface |
| `HEADLESS` | `true` | Run Chromium in headless mode |
| `MAX_CONCURRENT_JOBS` | `4` | Concurrency limit tuned for 2 OCPU / 12 GB RAM |
| `BULLSEYE_DB_PATH` | `/app/data/bullseye.db` | Local SQLite database file path |
| `FFMPEG_PATH` | Auto-detected | Optional explicit path to system `ffmpeg` binary |

---

## Automated Verification & Smoke Testing

To verify all Bullseye subsystems (Chromium launch, FFmpeg MP4 conversion, SQLite, Sharp image processing, Screenshot Engine, Phase 14 Advanced Recording with choreography, Mockups, and Visual QA) on an ARM64 server:

```bash
# Run the automated ARM64 smoke test suite
npm run smoke:arm64
```

### Health Check Endpoint

```bash
curl http://localhost:3000/api/health
```

Sample JSON response:
```json
{
  "status": "healthy",
  "version": "0.1.0",
  "timestamp": "2026-09-09T14:21:36.000Z"
}
```
