"""Capture the real browser scene at every 60fps timeline sample.

Usage: python scripts/dev/home-journey-dense-qa.py --base-url http://localhost:9983
The QA sequence is deterministic seeking, NOT a real-time frame-rate benchmark.
"""
import argparse
import hashlib
import io
import json
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageStat
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--base-url', default='http://localhost:9983')
parser.add_argument('--out', default='.tmp/home-dense')
parser.add_argument('--step', type=int, default=1)
args = parser.parse_args()
if args.step < 1:
    parser.error('--step must be positive')
repo = Path(__file__).resolve().parents[2]
destination = (repo / args.out).resolve()
if not destination.is_relative_to(repo / '.tmp'):
    parser.error('QA artifacts must remain in this repository’s .tmp directory')
destination.mkdir(parents=True, exist_ok=True)

SEEK = """async (progress) => {
  const root = document.querySelector('[data-testid="home-journey"]');
  root.dispatchEvent(new CustomEvent('journey:qa-seek', {detail: progress}));
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const canvas = root.querySelector('canvas');
  const line = root.querySelector('[data-gate-line]');
  return {progress: root.dataset.journeyProgress, scene: root.dataset.journeyScene,
    duration: root.dataset.journeyDuration, renderCount: canvas.dataset.journeyRenderCount,
    mode: canvas.dataset.journeyFrameloop, gateOpacity: getComputedStyle(line).opacity,
    gateVisibility: getComputedStyle(line).visibility};
}"""

rows = []
errors = []
reverse = []
previous = None
reverse_frames = [600, 588, 570, 528, 492, 450, 396, 336, 300, 282, 252, 192, 150, 120, 72, 60, 0]
poses = {}
POSE = """() => Array.from(document.querySelectorAll('[data-title-glyph], [data-motto-glyph], [data-title-fragment], [data-open-glyph], [data-narrative-glyph], [data-gate-line]')).map(node => {
 // Hidden ancestors legitimately retain transforms until their next reveal;
 // compare the rendered pose, not inactive future/past tweens.
 for(let current=node; current && current instanceof HTMLElement; current=current.parentElement) {
   const state=getComputedStyle(current);
   if(state.visibility==='hidden' || state.display==='none' || Number(state.opacity)<0.001) return ['hidden'];
 }
 const style=getComputedStyle(node); const rect=node.getBoundingClientRect();
 return [style.transform,style.opacity,style.clipPath,style.visibility,rect.x,rect.y,rect.width,rect.height];
})"""
with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 900}, device_scale_factor=1)
    page.route('https://fontsapi.zeoseven.com/**', lambda route: route.abort())
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(args.base_url + '/?qa=1&progress=0', wait_until='domcontentloaded')
    page.wait_for_selector('[data-journey-ready="true"]')
    page.wait_for_function('Number(document.querySelector("canvas")?.dataset.journeyRenderCount) > 0')
    # Hide only development chrome in screenshots, never scene content.
    page.add_style_tag(content='nextjs-portal { display: none !important; }')
    samples = sorted(set(range(0, 601, args.step)) | {600})
    for frame in samples:
        state = page.evaluate(SEEK, frame / 600)
        if frame in reverse_frames:
            poses[frame] = page.evaluate(POSE)
        path = destination / f'frame-{frame:04d}.png'
        png = page.screenshot(path=str(path))
        with Image.open(io.BytesIO(png)) as original:
            small = original.convert('RGB').resize((144, 90))
        delta = 0 if previous is None else sum(ImageStat.Stat(ImageChops.difference(small, previous)).mean) / 3
        row = {'frame': frame, **state, 'sha256': hashlib.sha256(png).hexdigest(), 'pixelDelta': round(delta, 4)}
        rows.append(row)
        previous = small
        if frame % 60 == 0:
            print(f'DENSE {frame}/600 scene={state["scene"]} delta={delta:.3f}', flush=True)
    # Seek backwards across every chapter boundary and compare the exact pixels.
    for frame in reverse_frames:
        if frame not in samples:
            continue
        page.evaluate(SEEK, frame / 600)
        pose_equal = poses[frame] == page.evaluate(POSE)
        png = page.screenshot()
        expected = next(row['sha256'] for row in rows if row['frame'] == frame)
        actual = hashlib.sha256(png).hexdigest()
        with Image.open(destination / f'frame-{frame:04d}.png') as forward_image, Image.open(io.BytesIO(png)) as backward_image:
            difference = ImageChops.difference(forward_image.convert('RGB'), backward_image.convert('RGB'))
            mean_delta = sum(ImageStat.Stat(difference).mean) / 3
        reverse.append({'frame': frame, 'identical': expected == actual, 'poseIdentical': pose_equal, 'meanPixelDelta': round(mean_delta, 6)})
        if expected != actual:
            (destination / f'reverse-{frame:04d}.png').write_bytes(png)
    browser.close()

report = {'fps': 60, 'durationSeconds': 10, 'viewport': [1440, 900], 'font': 'system fallback (CDN blocked for repeatability)', 'samples': rows, 'reverse': reverse, 'pageErrors': errors}
(destination / 'manifest.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
for group in range(5):
    targets = [row['frame'] for row in rows if group * 120 <= row['frame'] <= min(600, (group + 1) * 120) and row['frame'] % 5 == 0]
    sheet = Image.new('RGB', (1440, 5 * 173), '#0b1222')
    draw = ImageDraw.Draw(sheet)
    for index, frame in enumerate(targets[:30]):
        with Image.open(destination / f'frame-{frame:04d}.png') as shot:
            thumb = shot.convert('RGB').resize((240, 150))
        x, y = (index % 6) * 240, (index // 6) * 173
        sheet.paste(thumb, (x, y))
        draw.text((x + 8, y + 153), f'{frame:03d}  {frame / 60:.3f}s', fill='#d6b664')
    sheet.save(destination / f'contact-{group + 1}.jpg', quality=92)
print(json.dumps({'frames': len(rows), 'reverseIdentical': sum(row['identical'] for row in reverse), 'reverseSamples': len(reverse), 'pageErrors': errors, 'largestChanges': sorted(rows, key=lambda row: row['pixelDelta'], reverse=True)[:8]}, ensure_ascii=False), flush=True)
if errors or any(not row['poseIdentical'] for row in reverse):
    raise SystemExit('FAIL: a page error or forward/reverse motion-state mismatch occurred')
