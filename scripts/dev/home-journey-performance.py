"""Measure live homepage pacing on a specific local browser/GPU.

No video/screenshot capture runs during the measured period. Reported rAF
cadence is evidence for this browser/device, not a universal 60fps guarantee.
"""
import argparse
import json
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--base-url', default='http://localhost:9982')
parser.add_argument('--out', default='.tmp/home-performance.json')
parser.add_argument('--runs', type=int, default=3)
args = parser.parse_args()
if args.runs < 1 or args.runs > 5:
    parser.error('--runs must be between one and five')
repo = Path(__file__).resolve().parents[2]
destination = (repo / args.out).resolve()
if not destination.is_relative_to(repo / '.tmp'):
    parser.error('Performance evidence must stay in .tmp')
destination.parent.mkdir(parents=True, exist_ok=True)

SWEEP = """() => new Promise(resolve => {
 const rows=[]; let start=0, last=0;
 const root=document.querySelector('[data-testid="home-journey"]');
 const canvas=root.querySelector('canvas');
 const gl=canvas.getContext('webgl2');
 const extension=gl.getExtension('WEBGL_debug_renderer_info');
 const renderer=extension?gl.getParameter(extension.UNMASKED_RENDERER_WEBGL):'not exposed';
 const range=root.offsetHeight-innerHeight;
 const tick=time=>{
   if(!start)start=time;
   const progress=Math.min(1,(time-start)/10000);
   if(last)rows.push({ms:time-last,scene:root.dataset.journeyScene});
   last=time;
   window.scrollTo({top:range*progress,behavior:'instant'});
   if(progress<1)return requestAnimationFrame(tick);
   const values=rows.map(row=>row.ms), sorted=[...values].sort((a,b)=>a-b);
   resolve({fps:1000/(values.reduce((a,b)=>a+b,0)/values.length),
     frames:rows.length,medianMs:sorted[Math.floor(sorted.length*.5)],
     p95Ms:sorted[Math.floor(sorted.length*.95)],p99Ms:sorted[Math.floor(sorted.length*.99)],
     over25ms:values.filter(x=>x>25).length,quality:canvas.dataset.journeyQuality,
     dpr:canvas.dataset.journeyDpr,renderer,slowFrames:rows.filter(row=>row.ms>25)});
 }; requestAnimationFrame(tick);
})"""

results=[]
with sync_playwright() as pw:
    browser=pw.chromium.launch(channel='chrome',headless=True,args=['--use-angle=d3d11','--enable-gpu'])
    for run in range(args.runs):
        context=browser.new_context(viewport={'width':1440,'height':900},device_scale_factor=1.5)
        page=context.new_page()
        page.route('https://fontsapi.zeoseven.com/**',lambda route:route.abort())
        page.goto(args.base_url+'/',wait_until='domcontentloaded')
        page.wait_for_selector('[data-journey-ready="true"]')
        page.wait_for_selector('canvas[data-journey-frameloop="always"]')
        page.wait_for_timeout(1200)
        result={'run':run+1,**page.evaluate(SWEEP)}
        results.append(result)
        print(json.dumps(result),flush=True)
        context.close()
    browser.close()
destination.write_text(json.dumps({'baseUrl':args.base_url,'viewport':[1440,900],'font':'supported system fallback; CDN blocked','durationSeconds':10,'runs':results},indent=2),encoding='utf-8')
