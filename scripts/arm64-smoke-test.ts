import os from 'os';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { checkFFmpegAvailability } from '@/utils/ffmpeg';
import { captureController } from '@/capture/controller';
import { mockupService } from '@/mockup/service';
import { visualQAService } from '@/visual-qa/service';

async function runArm64SmokeTest() {
  console.log('====================================================');
  console.log('  BULLSEYE ARM64 / ARCHITECTURE SMOKE TEST SUITE    ');
  console.log('====================================================\n');

  // 1. Diagnostics & Environment Report
  console.log('--- 1. SYSTEM & ENVIRONMENT DIAGNOSTICS ---');
  const osType = os.type();
  const osRelease = os.release();
  const arch = process.arch;
  const platform = process.platform;
  console.log(`OS Type / Release: ${osType} ${osRelease}`);
  console.log(`Platform / Arch : ${platform} / ${arch}`);
  console.log(`Node.js Version  : ${process.version}`);

  let npmVersion = 'N/A';
  try {
    npmVersion = execSync('npm -v', { encoding: 'utf8' }).trim();
  } catch {}
  console.log(`npm Version     : ${npmVersion}`);

  let dockerVersion = 'N/A';
  try {
    dockerVersion = execSync('docker --version', { encoding: 'utf8' }).trim();
  } catch {}
  console.log(`Docker Version  : ${dockerVersion}`);

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pkg = require('../package.json');
  let gitCommit = 'N/A';
  try {
    gitCommit = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {}
  console.log(`Bullseye Version: ${pkg.version} (Commit: ${gitCommit})`);

  let playwrightVersion = 'N/A';
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    playwrightVersion = require('playwright/package.json').version;
  } catch {}
  console.log(`Playwright Ver  : ${playwrightVersion}`);

  // Chromium Launch Check
  console.log('\n--- 2. CHROMIUM & BROWSER LAUNCH CHECK ---');
  let chromiumOk = false;
  let chromiumVersion = 'N/A';
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { chromium } = require('playwright');
    const browser = await chromium.launch({ headless: true });
    chromiumVersion = browser.version();
    await browser.close();
    chromiumOk = true;
    console.log(`[PASS] Chromium launched successfully (Version: ${chromiumVersion})`);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[FAIL] Chromium launch failed: ${errorMsg}`);
  }

  // FFmpeg Check
  console.log('\n--- 3. FFMPEG CHECK ---');
  let ffmpegOk = false;
  let ffmpegVersion = 'N/A';
  try {
    const res = await checkFFmpegAvailability(true);
    if (res.available) {
      ffmpegOk = true;
      ffmpegVersion = res.version || 'unknown';
      console.log(`[PASS] FFmpeg available at '${res.path}' (Version: ${ffmpegVersion})`);
    } else {
      console.error(`[FAIL] FFmpeg check returned unavailable: ${res.error}`);
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[FAIL] FFmpeg check failed: ${errorMsg}`);
  }

  // SQLite Check
  console.log('\n--- 4. SQLITE CHECK ---');
  let sqliteOk = false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { DatabaseSync } = require('node:sqlite');
    const testDbPath = path.join(os.tmpdir(), `test_bullseye_sqlite_${Date.now()}.db`);
    const db = new DatabaseSync(testDbPath);
    db.exec('CREATE TABLE test (id INTEGER PRIMARY KEY, val TEXT);');
    db.exec("INSERT INTO test (val) VALUES ('arm64_ok');");
    const row = db.prepare('SELECT val FROM test WHERE id = 1').get() as { val: string } | undefined;
    db.close();
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    if (row && row.val === 'arm64_ok') {
      sqliteOk = true;
      console.log('[PASS] Native node:sqlite database read/write verified');
    } else {
      console.error('[FAIL] SQLite read/write output unexpected');
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[FAIL] SQLite check failed: ${errorMsg}`);
  }

  // Sharp Check
  console.log('\n--- 5. SHARP / LIBVIPS CHECK ---');
  let sharpOk = false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sharp = require('sharp');
    const versions = sharp.versions;
    console.log(`Sharp Version  : ${versions.sharp || 'N/A'}`);
    console.log(`libvips Version: ${versions.vips || 'N/A'}`);

    // Create a simple 100x100 PNG buffer
    const buf = await sharp({
      create: { width: 100, height: 100, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 1 } }
    }).png().toBuffer();

    if (buf && buf.length > 0) {
      sharpOk = true;
      console.log('[PASS] Sharp image creation and PNG encoding verified');
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[FAIL] Sharp check failed: ${errorMsg}`);
  }

  // 6. Bullseye Functional Smoke Tests
  console.log('\n--- 6. BULLSEYE WORKFLOW SMOKE TESTS ---');

  // Start local HTTP test server
  const testServerPort = 45678;
  const testServer = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: sans-serif; background: #1e293b; color: white; padding: 40px; }
            button { background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 4px; }
          </style>
        </head>
        <body>
          <h1 id="title">Bullseye ARM64 Smoke Test Page</h1>
          <button id="btn" onclick="document.getElementById('title').innerText = 'Clicked!'">Click Me</button>
        </body>
      </html>
    `);
  });

  await new Promise<void>((resolve) => {
    testServer.listen(testServerPort, '127.0.0.1', () => resolve());
  });
  const testUrl = `http://127.0.0.1:${testServerPort}`;

  let screenshotOk = false;
  let recordingOk = false;
  let mp4Ok = false;
  let mockupOk = false;
  let visualQaOk = false;

  try {
    // Smoke Test: Screenshot
    console.log('\n  [A] Testing Screenshot Engine...');
    const ssResult = await captureController.executeJob({
      url: testUrl,
      type: 'screenshot',
      viewport: { width: 800, height: 600 },
      screenshotOptions: { mode: 'viewport' }
    });
    function resolveAssetPath(p: string): string {
      if (path.isAbsolute(p)) return p;
      return path.join(process.cwd(), 'public', p.replace(/^\//, ''));
    }

    if (ssResult.status === 'completed' && ssResult.outputPaths.screenshot) {
      const ssPath = resolveAssetPath(ssResult.outputPaths.screenshot);
      if (fs.existsSync(ssPath) && fs.statSync(ssPath).size > 0) {
        screenshotOk = true;
        console.log(`  [PASS] Screenshot captured successfully (${fs.statSync(ssPath).size} bytes at ${ssPath})`);
      } else {
        console.error(`  [FAIL] Screenshot output file missing at ${ssPath}`);
      }
    } else {
      console.error(`  [FAIL] Screenshot job failed: ${ssResult.errors?.join('; ')}`);
    }

    // Smoke Test: Recording & FFmpeg MP4
    console.log('\n  [B] Testing Recording Engine & FFmpeg MP4 Conversion...');
    const recResult = await captureController.executeJob({
      url: testUrl,
      type: 'recording',
      recordingOptions: {
        durationMs: 2000,
        convertToMp4: true,
        advancedRecordingOptions: {
          cursorEnabled: true,
          clickIndicatorEnabled: true
        }
      },
      actions: [
        { type: 'mouse_move', x: 100, y: 100, durationMs: 200 },
        { type: 'click', x: 100, y: 100, durationMs: 100 }
      ]
    });

    if (recResult.status === 'completed') {
      if (recResult.outputPaths.recording) {
        const webmPath = resolveAssetPath(recResult.outputPaths.recording);
        if (fs.existsSync(webmPath) && fs.statSync(webmPath).size > 0) {
          recordingOk = true;
          console.log(`  [PASS] WebM recording created successfully (${fs.statSync(webmPath).size} bytes at ${webmPath})`);
        } else {
          console.error(`  [FAIL] WebM file missing at ${webmPath}`);
        }
      }
      if (recResult.outputPaths.mp4) {
        const mp4Path = resolveAssetPath(recResult.outputPaths.mp4);
        if (fs.existsSync(mp4Path) && fs.statSync(mp4Path).size > 0) {
          mp4Ok = true;
          console.log(`  [PASS] MP4 video converted successfully (${fs.statSync(mp4Path).size} bytes at ${mp4Path})`);
        } else {
          console.error(`  [FAIL] MP4 file missing at ${mp4Path}`);
        }
      }
    } else {
      console.error(`  [FAIL] Recording / MP4 job failed: ${recResult.errors?.join('; ')}`);
    }

    // Smoke Test: Mockup Engine
    console.log('\n  [C] Testing Mockup Engine...');
    if (screenshotOk && ssResult.outputPaths.screenshot) {
      const mockupRes = await mockupService.generateMockup({
        sourceAssetPath: ssResult.outputPaths.screenshot,
        type: 'browser',
        visualOptions: { deviceColor: 'dark' }
      });
      if (mockupRes && mockupRes.generatedAsset && mockupRes.generatedAsset.webPath) {
        const mPath = resolveAssetPath(mockupRes.generatedAsset.safePath || mockupRes.generatedAsset.webPath);
        if (fs.existsSync(mPath) && fs.statSync(mPath).size > 0) {
          mockupOk = true;
          console.log(`  [PASS] Mockup generated successfully (${fs.statSync(mPath).size} bytes at ${mPath})`);
        } else {
          console.error(`  [FAIL] Mockup file missing at ${mPath}`);
        }
      } else {
        console.error('  [FAIL] Mockup generation returned unexpected structure:', mockupRes);
      }
    } else {
      console.log('  [SKIP] Mockup test skipped because screenshot test failed');
    }

    // Smoke Test: Visual QA
    console.log('\n  [D] Testing Visual QA Engine...');
    if (screenshotOk && ssResult.outputPaths.screenshot) {
      const vqaRes = await visualQAService.compare({
        baselineAssetPath: ssResult.outputPaths.screenshot,
        currentAssetPath: ssResult.outputPaths.screenshot,
        pixelTolerance: 5,
        thresholdPercent: 0.1
      });
      if (vqaRes && vqaRes.metrics && vqaRes.metrics.changedPercentage === 0 && vqaRes.outcome === 'pass') {
        visualQaOk = true;
        console.log(`  [PASS] Visual QA comparison verified (changedPercentage: ${vqaRes.metrics.changedPercentage}%, outcome: ${vqaRes.outcome})`);
      } else {
        console.error(`  [FAIL] Visual QA result unexpected: changedPercentage=${vqaRes?.metrics?.changedPercentage}, outcome=${vqaRes?.outcome}`);
      }
    } else {
      console.log('  [SKIP] Visual QA test skipped because screenshot test failed');
    }

  } catch (err) {
    const errorMsg = err instanceof Error ? (err.stack || err.message) : String(err);
    console.error(`  [FAIL] Exception during workflow testing: ${errorMsg}`);
  } finally {
    testServer.close();
  }

  // Final Summary Report
  console.log('\n====================================================');
  console.log('               SMOKE TEST SUMMARY REPORT            ');
  console.log('====================================================');
  console.log(`Host Platform / Arch  : ${platform} / ${arch}`);
  console.log(`Chromium Availability : ${chromiumOk ? 'PASS' : 'FAIL'}`);
  console.log(`FFmpeg Availability   : ${ffmpegOk ? 'PASS' : 'FAIL'}`);
  console.log(`SQLite Native Module  : ${sqliteOk ? 'PASS' : 'FAIL'}`);
  console.log(`Sharp / libvips Module: ${sharpOk ? 'PASS' : 'FAIL'}`);
  console.log(`Screenshot Engine     : ${screenshotOk ? 'PASS' : 'FAIL'}`);
  console.log(`Recording Engine      : ${recordingOk ? 'PASS' : 'FAIL'}`);
  console.log(`FFmpeg MP4 Conversion : ${mp4Ok ? 'PASS' : 'FAIL'}`);
  console.log(`Mockup Engine         : ${mockupOk ? 'PASS' : 'FAIL'}`);
  console.log(`Visual QA Engine      : ${visualQaOk ? 'PASS' : 'FAIL'}`);
  console.log('====================================================');

  const allPassed = chromiumOk && ffmpegOk && sqliteOk && sharpOk && screenshotOk && recordingOk && mp4Ok && mockupOk && visualQaOk;
  if (allPassed) {
    console.log('\n>>> ALL BULLSEYE SMOKE TESTS PASSED SUCCESSFULLY! <<<\n');
    process.exit(0);
  } else {
    console.error('\n>>> SOME SMOKE TESTS FAILED! SEE LOGS ABOVE. <<<\n');
    process.exit(1);
  }
}

runArm64SmokeTest().catch((err) => {
  console.error('Fatal error in smoke test suite:', err);
  process.exit(1);
});
