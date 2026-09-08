# Bullseye FFmpeg Video Processing Pipeline

## Overview

Bullseye Phase 11 integrates **FFmpeg** as a local system dependency for converting Playwright WebM screen recordings into high-quality H.264 MP4 videos.

The video processing pipeline operates entirely locally:
```
Playwright Headless Browser
   ↓
WebM Screen Recording
   ↓
FFmpeg (Local Child Process)
   ↓
MP4 Video Output (H.264 / AAC)
```

---

## Capabilities & Architecture

- **Local System Dependency**: Bullseye detects system FFmpeg via `ffmpeg -version` (`src/utils/ffmpeg.ts`).
- **Capability API**: Exposed via `GET /api/ffmpeg`.
- **Separate Output Asset**: WebM recordings are preserved by default; MP4 is generated as an additional asset (`/captures/recording-xxx.mp4`).
- **Safe Child Process Management**: Executed using `child_process.spawn('ffmpeg', ...)`, bounded by timeout timers, process signals (`SIGTERM` / `SIGKILL`), and cancellation token monitoring.
- **Cleanup On Failure**: Incomplete or corrupt MP4 files are deleted immediately if conversion fails or is cancelled.
- **Path Security**: All output paths are sanitized using `getSecureOutputPath` to prevent path traversal vulnerabilities.

---

## Licensing Information

FFmpeg is licensed under the **LGPL v2.1+** by default, but specific builds compiled with non-free or GPL-only components (such as `--enable-gpl` or `--enable-libx264`) fall under the **GNU General Public License (GPL) v2+** or **GPL v3+**.

### Verified System Build Environment
- **FFmpeg Version**: `6.1.1-3ubuntu5`
- **Compiler**: gcc 13 (Ubuntu 13.2.0-23ubuntu3)
- **Configuration Flags**: `--enable-gpl`, `--enable-libx264`, `--enable-libx265`, `--enable-shared`
- **Effective License for this Build**: **GNU General Public License (GPL v2 or later)** due to `--enable-gpl` and `libx264`.

### Compliance Guidelines for Distribution
1. **Local System Binary Execution**: Bullseye invokes FFmpeg strictly as an external, unbundled child process via CLI (`spawn('ffmpeg', ...)`). Bullseye does not link against FFmpeg C/C++ libraries.
2. **Dynamic Dependency**: Users install FFmpeg on their local machine. Bullseye does not redistribute proprietary binaries.
3. **Open Source Compatibility**: Bullseye's source code and FFmpeg integration respect the GPL/LGPL terms when interacting with system FFmpeg.

---

## System Installation Requirements

To use MP4 conversion in Bullseye, ensure `ffmpeg` is available in your system `PATH`:

- **Ubuntu / Debian**:
  ```bash
  sudo apt-get update && sudo apt-get install -y ffmpeg
  ```
- **macOS (Homebrew)**:
  ```bash
  brew install ffmpeg
  ```
- **Windows (Chocolatey / Scoop)**:
  ```cmd
  choco install ffmpeg
  ```
