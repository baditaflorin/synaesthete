#!/usr/bin/env node
// Headless smoke test. Builds (if docs/ missing), serves it with Vite preview,
// boots a Chromium page, and asserts the overlay renders without console errors.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { setTimeout as wait } from 'node:timers/promises';
import { chromium } from 'playwright';

const ROOT = new URL('..', import.meta.url).pathname;
const PORT = 4173;
const BASE = '/synaesthete/';
const TARGET = `http://127.0.0.1:${PORT}${BASE}`;

async function probe(url) {
  try {
    const res = await fetch(url, { redirect: 'manual' });
    return res.status;
  } catch {
    return 0;
  }
}

async function main() {
  if (!existsSync(`${ROOT}/docs/index.html`)) {
    console.error('docs/index.html not found — run `npm run build` first.');
    process.exit(1);
  }

  const server = spawn(
    'npx',
    [
      'vite',
      'preview',
      '--host',
      '127.0.0.1',
      '--port',
      String(PORT),
      '--strictPort',
      '--outDir',
      'docs',
      '--base',
      BASE,
    ],
    {
      cwd: ROOT,
      stdio: ['ignore', 'inherit', 'inherit'],
      env: { ...process.env, FORCE_COLOR: '0' },
    },
  );

  const stop = () => {
    if (!server.killed) server.kill('SIGTERM');
  };
  process.on('exit', stop);
  process.on('SIGINT', () => {
    stop();
    process.exit(130);
  });

  // Poll until the server responds with a 200 specifically (avoids racing
  // before the build dir is mounted, when preview returns 404 fallbacks).
  const deadline = Date.now() + 20000;
  let ready = false;
  while (Date.now() < deadline) {
    const status = await probe(TARGET);
    if (status === 200) {
      ready = true;
      break;
    }
    await wait(200);
  }
  if (!ready) {
    stop();
    console.error('vite preview did not become reachable within 15s');
    process.exit(1);
  }

  let browser;
  let exitCode = 0;
  try {
    browser = await chromium.launch();
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`));

    console.log(`[smoke] navigating to ${TARGET}`);
    const resp = await page.goto(TARGET, { waitUntil: 'load', timeout: 15000 });
    if (!resp || !resp.ok()) {
      throw new Error(`page load failed: ${resp ? resp.status() : 'no response'}`);
    }

    await page.waitForSelector('#start-btn', { state: 'visible', timeout: 5000 });
    const title = await page.title();
    if (!/synaesthete/i.test(title)) {
      throw new Error(`unexpected title: "${title}"`);
    }

    const canvas = await page.$('#stage');
    if (!canvas) throw new Error('canvas #stage not found');

    // Wait for any post-mount errors.
    await wait(500);

    if (consoleErrors.length) {
      throw new Error(`console errors:\n${consoleErrors.join('\n')}`);
    }
    console.log(`[smoke] ok — title="${title}", overlay rendered, no console errors.`);
  } catch (err) {
    console.error(`[smoke] FAILED: ${err.message}`);
    exitCode = 1;
  } finally {
    if (browser) await browser.close().catch(() => undefined);
    stop();
  }
  process.exit(exitCode);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
