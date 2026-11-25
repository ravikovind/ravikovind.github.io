import pkg from "/tmp/node_modules/playwright-core/index.js";
const { chromium } = pkg;
import { execSync } from 'child_process';

const CHROMIUM = '/usr/bin/chromium';
const URL      = 'https://ravikovind.github.io';
const RAW_DIR  = '/root/reels/ravi-reel/assets/';
const OUT      = '/root/reels/ravi-reel/assets/ravi-final.mp4';
const MUSIC    = '/tmp/bg.wav';

// 9:16 viewport — no letterbox needed, native 1080x1920 recording
const browser = await chromium.launch({
  executablePath: CHROMIUM,
  args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu','--headless=new'],
});

const ctx = await browser.newContext({
  viewport: { width: 540, height: 960 },   // 9:16, mobile width, matches recordVideo
  deviceScaleFactor: 1,
  recordVideo: { dir: RAW_DIR, size: { width: 540, height: 960 } },
});

const page = await ctx.newPage();

await page.addInitScript(() => {
  localStorage.removeItem('ravikovind-motion');
});

console.log('Loading page…');
await page.goto(URL, { waitUntil: 'load', timeout: 60000 });

console.log('Waiting for tour prompt…');
await page.waitForSelector('#motion-prompt', { timeout: 15000 });
await page.waitForTimeout(600);

console.log('Starting tour…');
await page.locator('#motion-prompt button').first().click();
await page.waitForTimeout(2500);

// Scroll down slowly — 40 steps × 3s = 120s raw → 60s at 2x
console.log('Scrolling (this takes ~2 min)…');
const pageH = await page.evaluate(() => document.body.scrollHeight);
const STEPS = 40;
for (let i = 1; i <= STEPS; i++) {
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'smooth' }), Math.round((pageH / STEPS) * i));
  await page.waitForTimeout(3000);
}
// Scroll back to top
await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
await page.waitForTimeout(4000);

console.log('Closing browser…');
const video = await page.video();
await ctx.close();
await browser.close();

const rawPath = await video.path();
console.log('Raw video:', rawPath);

// Get raw duration to generate matching music
const dur = execSync(`ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${rawPath}"`).toString().trim();
const rawDur = parseFloat(dur);
const finalDur = Math.round(rawDur / 2);  // after 2x speed
console.log(`Raw: ${rawDur}s → 2x → ${finalDur}s`);

// Generate music for final duration
execSync(`python3 /data/data/com.termux/files/home/gen-music.py ${MUSIC} ${finalDur + 2}`, { stdio: 'inherit' });

// Encode: 2x speed + music + Android-compatible H.264 Baseline
// Source is already 1080x1920 — no scaling/padding needed
execSync(
  `ffmpeg -y -i "${rawPath}" -i "${MUSIC}" ` +
  `-filter_complex '[0:v]setpts=0.5*PTS,scale=1080:1920:flags=lanczos[v];[1:a]afade=t=out:st=${finalDur - 1.5}:d=1.5[a]' ` +
  `-map '[v]' -map '[a]' -t ${finalDur} ` +
  `-c:v libx264 -profile:v baseline -level:v 4.0 ` +
  `-pix_fmt yuv420p -crf 18 -preset fast ` +
  `-c:a aac -b:a 128k -movflags +faststart "${OUT}"`,
  { stdio: 'inherit' }
);

console.log('Done! →', OUT);
