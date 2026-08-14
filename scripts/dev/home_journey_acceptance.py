"""Real-browser acceptance for the cinematic home journey.

The server lifecycle is intentionally owned by the repository's approved
``with_server.py`` helper. This script only drives Chromium and writes evidence
to the directory supplied by the caller.

The file is intentionally one executable harness: the named suite methods
share one diagnostics, resource-boundary, and evidence-hash state. Keeping
those seams in a single lifecycle makes partial-failure evidence auditable.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import subprocess
import sys
import urllib.request
from pathlib import Path
from typing import Any

from PIL import Image, ImageChops, ImageDraw
from playwright.sync_api import Browser, BrowserContext, Page, sync_playwright


STORY_BEATS = (
    0.0,
    0.03,
    0.10,
    0.20,
    0.25,
    0.32,
    0.42,
    0.48,
    0.50,
    0.56,
    0.66,
    0.72,
    0.75,
    0.82,
    0.88,
    0.95,
    0.985,
    1.0,
)

FORMAL_STATES = (
    ("start", 0.0),
    ("anticipation", 0.10),
    ("quarter", 0.25),
    ("covered-swap", 0.32),
    ("three-quarter", 0.75),
    ("settle", 0.985),
    ("end", 1.0),
)

DESKTOP_VIEWPORT = {"width": 1440, "height": 900}
CINEMATIC_MARKERS = (
    b"WebGLRenderer",
    b"react-three-fiber",
    b"JourneyCanvas",
    b"ScrollTrigger",
    b"prepareWithSegments",
)
BROWSER_ARGS = (
    "--use-angle=swiftshader",
    "--disable-font-subpixel-positioning",
    "--disable-gpu-rasterization",
    "--disable-lcd-text",
    "--disable-oop-rasterization",
    "--disable-skia-runtime-opts",
    "--disable-zero-copy",
    "--enable-webgl",
    "--font-render-hinting=none",
    "--ignore-gpu-blocklist",
    "--no-proxy-server",
    "--proxy-bypass-list=<-loopback>",
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://127.0.0.1:9981")
    parser.add_argument("--evidence-dir", type=Path, required=True)
    return parser.parse_args()


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def scene_for(progress: float) -> str:
    if progress < 0.03:
        return "prologue"
    if progress < 0.245:
        return "scatter"
    if progress < 0.255:
        return "scatter-end"
    if progress < 0.495:
        return "gather"
    if progress < 0.505:
        return "gather-end"
    if progress < 0.745:
        return "open"
    if progress < 0.755:
        return "open-end"
    if progress < 0.95:
        return "gate"
    if progress < 0.995:
        return "gate-pass"
    return "epilogue"


class Acceptance:
    def __init__(self, base_url: str, evidence_dir: Path) -> None:
        self.base_url = base_url.rstrip("/")
        self.evidence_dir = evidence_dir
        self.failures: list[str] = []
        self.checks: list[dict[str, Any]] = []
        self.browser_errors: list[dict[str, str]] = []
        self.desktop_scripts: set[str] = set()
        self.mobile_scripts: set[str] = set()
        self.reduced_scripts: set[str] = set()
        self.frame_hashes: dict[str, dict[str, str | bool]] = {}

    def check(self, condition: bool, name: str, detail: str = "") -> None:
        record = {"name": name, "passed": bool(condition), "detail": detail}
        self.checks.append(record)
        if not condition:
            self.failures.append(f"{name}: {detail}".rstrip(": "))

    def wire_diagnostics(self, page: Page, label: str) -> None:
        def console_error(message: Any) -> None:
            if message.type == "error":
                self.browser_errors.append(
                    {"scope": label, "kind": "console", "message": message.text}
                )

        def page_error(error: Any) -> None:
            self.browser_errors.append(
                {"scope": label, "kind": "pageerror", "message": str(error)}
            )

        def request_failed(request: Any) -> None:
            failure = request.failure
            self.browser_errors.append(
                {
                    "scope": label,
                    "kind": "requestfailed",
                    "message": f"{request.url}: {failure}",
                }
            )

        def http_error(response: Any) -> None:
            if response.status < 400:
                return
            self.browser_errors.append(
                {
                    "scope": label,
                    "kind": f"http-{response.status}",
                    "message": response.url,
                }
            )

        page.on("console", console_error)
        page.on("pageerror", page_error)
        page.on("requestfailed", request_failed)
        page.on("response", http_error)

    def new_context(
        self,
        browser: Browser,
        *,
        viewport: dict[str, int],
        reduced_motion: str = "no-preference",
        mobile: bool = False,
    ) -> tuple[BrowserContext, Page]:
        context = browser.new_context(
            viewport=viewport,
            device_scale_factor=1,
            has_touch=mobile,
            is_mobile=mobile,
            locale="zh-CN",
        )
        page = context.new_page()
        page.emulate_media(reduced_motion=reduced_motion)
        return context, page

    def wait_for_cinematic(self, page: Page) -> None:
        page.locator(
            '[data-testid="home-journey"]'
            '[data-journey-mode="cinematic"]'
            '[data-journey-ready="true"]'
        ).wait_for(state="attached", timeout=45_000)
        page.locator('[data-testid="journey-canvas"] canvas').wait_for(
            state="visible", timeout=15_000
        )
        page.wait_for_timeout(350)

    def read_prologue_ambient(self, page: Page) -> dict[str, Any]:
        return page.evaluate(
            """() => {
                const glyphs = Array.from(
                    document.querySelectorAll('[data-idle-wave-glyph]'),
                ).map(element => {
                    const value = getComputedStyle(element)
                        .getPropertyValue('--journey-idle-y')
                    return Number.parseFloat(value) || 0
                })
                const cue = document.querySelector('[data-scroll-cue-breath]')
                const cueStyle = getComputedStyle(cue)
                return {
                    cueOpacity: Number(cueStyle.opacity),
                    cueTop: cue.getBoundingClientRect().top,
                    glyphs,
                    progress: Number(
                        document.querySelector('[data-testid="home-journey"]')
                            ?.dataset.journeyProgress,
                    ),
                }
            }"""
        )

    def check_pretext_contract(self, page: Page, label: str) -> None:
        metrics = page.locator("[data-pretext-role]").evaluate_all(
            """elements => {
                const groups = new Map()
                let maxCenterError = 0
                let maxFontSizeError = 0
                let maxNaturalGlyphWidthError = 0
                let maxWidthError = 0
                let fontWeightMatches = true
                let fontFamilyMatches = true

                const measureNaturalWidth = (text, style, letterSpacing) => {
                    const probe = document.createElement('span')
                    probe.textContent = text
                    Object.assign(probe.style, {
                        display: 'inline-block',
                        fontFamily: style.fontFamily,
                        fontSize: style.fontSize,
                        fontWeight: style.fontWeight,
                        left: '-10000px',
                        letterSpacing: `${letterSpacing}px`,
                        position: 'fixed',
                        visibility: 'hidden',
                        whiteSpace: 'pre',
                        width: 'max-content',
                    })
                    document.body.append(probe)
                    const width = probe.getBoundingClientRect().width
                    probe.remove()
                    return width
                }

                for (const element of elements) {
                    const rect = element.getBoundingClientRect()
                    const style = getComputedStyle(element)
                    const role = element.dataset.pretextRole
                    const char = element.dataset.pretextChar
                    const x = Number(element.dataset.pretextX)
                    const width = Number(element.dataset.pretextWidth)
                    const fontSize = Number(element.dataset.pretextFontSize)
                    const fontWeight = element.dataset.pretextFontWeight
                    const letterSpacing = Number(element.dataset.pretextLetterSpacing)
                    const lineWidth = Number(element.dataset.pretextLineWidth)
                    const center = rect.left + rect.width / 2
                    const centerError = Math.abs(center - (innerWidth / 2 + x))
                    const cssWidth = Number.parseFloat(style.width)
                    const fontSizeError = Math.abs(Number.parseFloat(style.fontSize) - fontSize)

                    maxCenterError = Math.max(maxCenterError, centerError)
                    maxFontSizeError = Math.max(maxFontSizeError, fontSizeError)
                    maxWidthError = Math.max(maxWidthError, Math.abs(cssWidth - width))
                    maxNaturalGlyphWidthError = Math.max(
                        maxNaturalGlyphWidthError,
                        Math.abs(measureNaturalWidth(char, style, 0) - width),
                    )
                    fontWeightMatches &&= style.fontWeight === fontWeight
                    fontFamilyMatches &&=
                        style.fontFamily.includes('Source Han Serif SC') &&
                        style.fontFamily.includes('Noto Serif SC') &&
                        style.fontFamily.includes('STSong') &&
                        style.fontFamily.includes('SimSun')

                    if (!groups.has(role)) groups.set(role, [])
                    groups.get(role).push({
                        center,
                        char,
                        fontFamily: style.fontFamily,
                        fontSize: style.fontSize,
                        fontWeight: style.fontWeight,
                        letterSpacing,
                        lineWidth,
                        width,
                        x,
                    })
                }

                let maxSpacingError = 0
                let maxLineWidthError = 0
                let maxNaturalLineWidthError = 0
                const counts = {}
                for (const [role, glyphs] of groups) {
                    glyphs.sort((a, b) => a.x - b.x)
                    counts[role] = glyphs.length
                    for (let index = 1; index < glyphs.length; index += 1) {
                        const previous = glyphs[index - 1]
                        const current = glyphs[index]
                        const expected =
                            previous.width / 2 +
                            current.width / 2 +
                            previous.letterSpacing
                        maxSpacingError = Math.max(
                            maxSpacingError,
                            Math.abs(current.center - previous.center - expected),
                        )
                    }
                    const start = Math.min(
                        ...glyphs.map(glyph => glyph.center - glyph.width / 2),
                    )
                    const end = Math.max(
                        ...glyphs.map(glyph => glyph.center + glyph.width / 2),
                    )
                    maxLineWidthError = Math.max(
                        maxLineWidthError,
                        Math.abs(end - start - glyphs[0].lineWidth),
                    )
                    const naturalLineWidth =
                        measureNaturalWidth(
                            glyphs.map(glyph => glyph.char).join(''),
                            glyphs[0],
                            glyphs[0].letterSpacing,
                        ) - glyphs[0].letterSpacing
                    maxNaturalLineWidthError = Math.max(
                        maxNaturalLineWidthError,
                        Math.abs(naturalLineWidth - glyphs[0].lineWidth),
                    )
                }

                return {
                    counts,
                    fontFamilyMatches,
                    fontWeightMatches,
                    maxCenterError,
                    maxFontSizeError,
                    maxLineWidthError,
                    maxNaturalGlyphWidthError,
                    maxNaturalLineWidthError,
                    maxSpacingError,
                    maxWidthError,
                    typesetter: document.querySelector('[data-testid="home-journey"]')
                        ?.dataset.journeyTypesetter,
                }
            }"""
        )
        counts = metrics["counts"]
        self.check(
            metrics["typesetter"] == "pretext",
            f"pretext-engine-{label}",
            str(metrics["typesetter"]),
        )
        self.check(
            all(counts.get(role, 0) > 0 for role in ("title", "motto", "floating", "narrative")),
            f"pretext-covers-all-live-type-{label}",
            json.dumps(counts, ensure_ascii=False),
        )
        for key, threshold in (
            ("maxCenterError", 1.0),
            ("maxFontSizeError", 0.05),
            ("maxWidthError", 0.05),
            ("maxSpacingError", 0.08),
            ("maxLineWidthError", 0.12),
            ("maxNaturalGlyphWidthError", 0.75),
            ("maxNaturalLineWidthError", 0.75),
        ):
            self.check(
                metrics[key] <= threshold,
                f"pretext-{key}-{label}",
                f"error={metrics[key]:.4f}px threshold={threshold:.2f}px",
            )
        self.check(
            metrics["fontFamilyMatches"],
            f"pretext-font-family-{label}",
        )
        self.check(
            metrics["fontWeightMatches"],
            f"pretext-font-weight-{label}",
        )

    def capture_story_frames(self, browser: Browser) -> list[Path]:
        frames_dir = self.evidence_dir / "desktop-storyboard"
        rerender_dir = self.evidence_dir / "determinism-rerender"
        frames_dir.mkdir(parents=True, exist_ok=True)
        rerender_dir.mkdir(parents=True, exist_ok=True)
        context, page = self.new_context(browser, viewport=DESKTOP_VIEWPORT)
        self.wire_diagnostics(page, "desktop-storyboard")

        def capture_script(response: Any) -> None:
            if response.request.resource_type == "script":
                self.desktop_scripts.add(response.url)

        page.on("response", capture_script)
        paths: list[Path] = []

        for progress in STORY_BEATS:
            frame = round(progress * 600)
            slug = f"frame-{frame:03d}-p{progress:.3f}"
            page.goto(
                f"{self.base_url}/?qa=1&progress={progress:.4f}",
                wait_until="networkidle",
                timeout=60_000,
            )
            self.wait_for_cinematic(page)

            journey = page.locator('[data-testid="home-journey"]')
            actual_progress = float(journey.get_attribute("data-journey-progress") or -1)
            actual_scene = journey.get_attribute("data-journey-scene")
            actual_duration = float(journey.get_attribute("data-journey-duration") or -1)
            self.check(
                math.isclose(actual_duration, 10.0, abs_tol=0.0001),
                f"timeline-duration-{frame:03d}",
                f"expected 10.0000, got {actual_duration:.4f}",
            )
            self.check(
                math.isclose(actual_progress, progress, abs_tol=0.0001),
                f"progress-{frame:03d}",
                f"expected {progress:.4f}, got {actual_progress:.4f}",
            )
            self.check(
                actual_scene == scene_for(progress),
                f"scene-{frame:03d}",
                f"expected {scene_for(progress)}, got {actual_scene}",
            )

            overflow = page.evaluate(
                "document.documentElement.scrollWidth - window.innerWidth"
            )
            self.check(
                overflow <= 1,
                f"desktop-overflow-{frame:03d}",
                f"overflow={overflow}px",
            )

            if frame == 0:
                self.check(
                    not page.locator('[data-testid="home-shell"]').is_visible(),
                    "start-does-not-leak-epilogue",
                )
                self.check(
                    page.locator('[data-title-glyph]').first.is_visible(),
                    "start-title-is-visible",
                )
                title_paint = page.locator(
                    '[data-title-glyph] [data-idle-wave-visual]'
                ).first.evaluate(
                    """element => {
                        const style = getComputedStyle(element)
                        return {
                            backgroundClip: style.backgroundClip,
                            backgroundImage: style.backgroundImage,
                            webkitBackgroundClip: style.webkitBackgroundClip,
                        }
                    }"""
                )
                self.check(
                    "gradient" in title_paint["backgroundImage"]
                    and "text"
                    in (
                        title_paint["backgroundClip"]
                        + title_paint["webkitBackgroundClip"]
                    ),
                    "start-title-has-gradient-paint",
                    json.dumps(title_paint),
                )
                self.check_pretext_contract(page, "1440")
                qa_ambient_before = self.read_prologue_ambient(page)

            if frame == 192:
                tile_opacities = page.locator('[data-motion-tile]').evaluate_all(
                    "tiles => tiles.map(tile => Number(getComputedStyle(tile).opacity))"
                )
                self.check(
                    len(tile_opacities) == 24 and min(tile_opacities) >= 0.99,
                    "covered-swap-is-fully-occluded",
                    f"minOpacity={min(tile_opacities):.4f}",
                )

            canvas = page.locator('[data-testid="journey-canvas"] canvas')
            page.screenshot(animations="disabled")
            page.wait_for_timeout(50)
            render_count_before = int(
                canvas.get_attribute("data-journey-render-count") or -1
            )
            self.check(
                canvas.get_attribute("data-journey-frameloop") == "demand",
                f"qa-demand-frameloop-{frame:03d}",
            )
            self.check(
                render_count_before >= 1,
                f"qa-target-rendered-{frame:03d}",
                f"renderCount={render_count_before}",
            )
            path_a = frames_dir / f"{slug}.png"
            path_b = rerender_dir / f"{slug}.png"
            bytes_a = page.screenshot(path=str(path_a), animations="disabled")
            page.wait_for_timeout(220)
            bytes_b = page.screenshot(path=str(path_b), animations="disabled")
            if frame == 0:
                qa_ambient_after = self.read_prologue_ambient(page)
                self.check(
                    qa_ambient_before == qa_ambient_after,
                    "qa-prologue-ambient-is-frozen",
                    f"{qa_ambient_before} -> {qa_ambient_after}",
                )
            hash_a = sha256_bytes(bytes_a)
            hash_b = sha256_bytes(bytes_b)
            render_count_after = int(
                canvas.get_attribute("data-journey-render-count") or -1
            )
            deterministic = hash_a == hash_b
            self.frame_hashes[slug] = {
                "first": hash_a,
                "second": hash_b,
                "deterministic": deterministic,
            }
            self.check(
                deterministic,
                f"determinism-{frame:03d}",
                (
                    f"sha256={hash_a}"
                    if deterministic
                    else f"{hash_a} != {hash_b}"
                ),
            )
            self.check(
                render_count_after == render_count_before,
                f"qa-idle-does-not-render-{frame:03d}",
                f"{render_count_before} -> {render_count_after}",
            )
            paths.append(path_a)

        home_shell = page.locator('[data-testid="home-shell"]')
        self.check(home_shell.is_visible(), "desktop-end-home-visible")
        self.check(
            page.locator("[data-home-destination]").count() == 4,
            "desktop-four-destinations",
        )
        self.check(
            page.locator('[data-home-destination="blog"]').get_attribute("href")
            == "/blog/",
            "desktop-blog-route",
        )
        self.check(
            page.locator('[role="link"][aria-disabled="true"]').count() == 3,
            "desktop-reserved-routes-disabled",
        )
        self.check(page.locator("main").count() == 1, "desktop-has-one-main")
        context.close()
        return paths

    def verify_independent_frame_determinism(self, browser: Browser) -> None:
        def render_root(
            renderer: Browser, directory: Path, scope: str
        ) -> dict[int, Path]:
            directory.mkdir(parents=True, exist_ok=True)
            context, page = self.new_context(renderer, viewport=DESKTOP_VIEWPORT)
            self.wire_diagnostics(page, scope)
            paths: dict[int, Path] = {}
            for label, progress in FORMAL_STATES:
                frame = round(progress * 600)
                page.goto(
                    f"{self.base_url}/?qa=1&progress={progress:.4f}",
                    wait_until="networkidle",
                    timeout=60_000,
                )
                self.wait_for_cinematic(page)
                page.screenshot(animations="disabled")
                page.wait_for_timeout(50)
                path = directory / f"frame-{frame:03d}-{label}.png"
                page.screenshot(path=str(path), animations="disabled")
                paths[frame] = path
            context.close()
            return paths

        primary_browser = browser.browser_type.launch(
            headless=True,
            args=BROWSER_ARGS,
        )
        try:
            primary = render_root(
                primary_browser,
                self.evidence_dir / "determinism-primary",
                "determinism-primary",
            )
        finally:
            primary_browser.close()

        independent_browser = browser.browser_type.launch(
            headless=True,
            args=BROWSER_ARGS,
        )
        try:
            independent = render_root(
                independent_browser,
                self.evidence_dir / "determinism-independent",
                "determinism-independent",
            )
        finally:
            independent_browser.close()

        for _label, progress in FORMAL_STATES:
            frame = round(progress * 600)
            source_bytes = primary[frame].read_bytes()
            rerender_bytes = independent[frame].read_bytes()
            source_image = Image.open(primary[frame]).convert("RGB")
            rerender_path = independent[frame]
            rerender_image = Image.open(rerender_path).convert("RGB")
            difference = ImageChops.difference(source_image, rerender_image)
            changed_pixels = sum(
                pixel != (0, 0, 0) for pixel in difference.getdata()
            )
            changed_ratio = changed_pixels / (source_image.width * source_image.height)
            max_channel_delta = max(
                maximum for _minimum, maximum in difference.getextrema()
            )
            deterministic = rerender_bytes == source_bytes
            self.check(
                deterministic,
                f"independent-determinism-{frame:03d}",
                (
                    f"sha256={sha256_bytes(source_bytes)}"
                    if deterministic
                    else (
                        f"changedPixels={changed_pixels} "
                        f"ratio={changed_ratio:.8f} "
                        f"maxChannelDelta={max_channel_delta}; "
                        f"{sha256_bytes(source_bytes)} != {sha256_bytes(rerender_bytes)}"
                    )
                ),
            )

    def exercise_scroll_and_controls(self, browser: Browser) -> None:
        output = self.evidence_dir / "interactions"
        output.mkdir(parents=True, exist_ok=True)
        context, page = self.new_context(browser, viewport=DESKTOP_VIEWPORT)
        self.wire_diagnostics(page, "desktop-interactions")
        page.goto(f"{self.base_url}/", wait_until="networkidle", timeout=60_000)
        self.wait_for_cinematic(page)
        journey = page.locator('[data-testid="home-journey"]')

        ambient_before = self.read_prologue_ambient(page)
        live_a = page.screenshot(
            path=str(output / "production-progress-zero-a.png"), animations="disabled"
        )
        page.wait_for_timeout(420)
        ambient_after = self.read_prologue_ambient(page)
        live_b = page.screenshot(
            path=str(output / "production-progress-zero-b.png"), animations="disabled"
        )
        self.check(
            live_a != live_b,
            "production-progress-zero-is-alive",
            (
                f"{sha256_bytes(live_a)} != {sha256_bytes(live_b)}"
                if live_a != live_b
                else f"unexpected identical sha256={sha256_bytes(live_a)}"
            ),
        )
        wave_delta = max(
            abs(after - before)
            for before, after in zip(
                ambient_before["glyphs"], ambient_after["glyphs"], strict=True
            )
        )
        cue_delta = max(
            abs(ambient_after["cueOpacity"] - ambient_before["cueOpacity"]),
            abs(ambient_after["cueTop"] - ambient_before["cueTop"]),
        )
        self.check(
            ambient_before["progress"] == 0 and ambient_after["progress"] == 0,
            "production-ambient-does-not-advance-story",
            f"{ambient_before['progress']} -> {ambient_after['progress']}",
        )
        self.check(
            wave_delta >= 0.2,
            "production-pretext-wave-is-alive",
            f"maxGlyphDelta={wave_delta:.4f}px",
        )
        self.check(
            cue_delta >= 0.02,
            "production-scroll-cue-breathes",
            (
                f"opacity={ambient_before['cueOpacity']:.4f}"
                f"->{ambient_after['cueOpacity']:.4f}; "
                f"top={ambient_before['cueTop']:.4f}"
                f"->{ambient_after['cueTop']:.4f}"
            ),
        )
        self.check(
            page.locator('[data-testid="journey-canvas"] canvas').get_attribute(
                "data-journey-frameloop"
            )
            == "always",
            "production-prologue-frameloop-is-live",
        )

        def scroll_to_progress(progress: float) -> float:
            page.evaluate(
                """progress => {
                    const root = document.querySelector('[data-testid="home-journey"]')
                    const range = root.offsetHeight - innerHeight
                    window.scrollTo(0, root.offsetTop + range * progress)
                }""",
                progress,
            )
            page.wait_for_timeout(2_200)
            return float(journey.get_attribute("data-journey-progress") or -1)

        snap_cases = (
            ("forward-below-40", 0.34, 0.25),
            ("forward-above-40", 0.36, 0.50),
            ("reverse-above-60", 0.41, 0.50),
            ("reverse-below-60", 0.39, 0.25),
        )
        for label, requested, expected in snap_cases:
            actual = scroll_to_progress(requested)
            self.check(
                math.isclose(actual, expected, abs_tol=0.005),
                f"snap-{label}",
                f"requested={requested:.2f} expected={expected:.2f} actual={actual:.4f}",
            )

        page.evaluate("window.scrollTo(0, document.documentElement.scrollHeight)")
        page.wait_for_timeout(1_700)
        end_progress = float(journey.get_attribute("data-journey-progress") or -1)
        self.check(
            end_progress >= 0.99,
            "forward-scroll-reaches-end",
            f"progress={end_progress:.4f}",
        )
        page.screenshot(path=str(output / "forward-end.png"), animations="disabled")

        page.evaluate("window.scrollTo(0, 0)")
        page.wait_for_timeout(1_700)
        replay_progress = float(journey.get_attribute("data-journey-progress") or -1)
        self.check(
            replay_progress <= 0.01,
            "reverse-scroll-replays",
            f"progress={replay_progress:.4f}",
        )
        page.screenshot(path=str(output / "reverse-replay.png"), animations="disabled")

        page.reload(wait_until="networkidle", timeout=60_000)
        self.wait_for_cinematic(page)
        page.get_by_test_id("journey-skip").click()
        page.wait_for_timeout(900)
        journey = page.locator('[data-testid="home-journey"]')
        skipped_progress = float(journey.get_attribute("data-journey-progress") or -1)
        self.check(
            skipped_progress >= 0.999,
            "skip-reaches-epilogue",
            f"progress={skipped_progress:.4f}",
        )
        self.check(
            page.locator('[data-testid="home-shell"]').is_visible(),
            "skip-shows-home",
        )
        page.screenshot(path=str(output / "skip-result.png"), animations="disabled")

        page.get_by_role("button", name="打开设置").click()
        self.check(
            page.get_by_role("dialog", name="显示与声音设置").is_visible(),
            "settings-opens",
        )
        page.keyboard.press("Escape")
        self.check(
            page.get_by_role("dialog", name="显示与声音设置").count() == 0,
            "settings-escape-closes",
        )

        audio_button = page.locator(
            '[data-rope-navigation] button[aria-pressed]'
        ).first
        audio_button.click()
        self.check(
            audio_button.get_attribute("aria-pressed") == "true",
            "audio-preference-toggles",
        )
        initial_theme = page.locator("html").get_attribute("data-theme")
        page.locator(
            '[data-rope-navigation] button[aria-label^="切换主题"]'
        ).click()
        next_theme = page.locator("html").get_attribute("data-theme")
        self.check(
            initial_theme == "paper" and next_theme == "mist",
            "theme-cycles-in-memory",
            f"{initial_theme} -> {next_theme}",
        )
        self.check(
            page.evaluate("localStorage.length") == 0,
            "preferences-do-not-persist",
        )
        context.close()

    def exercise_mobile_and_reduced(self, browser: Browser) -> None:
        output = self.evidence_dir / "responsive"
        output.mkdir(parents=True, exist_ok=True)

        context, page = self.new_context(
            browser,
            viewport={"width": 390, "height": 844},
            mobile=True,
        )
        self.wire_diagnostics(page, "mobile")

        def capture_script(response: Any) -> None:
            if response.request.resource_type == "script":
                self.mobile_scripts.add(response.url)

        page.on("response", capture_script)
        page.goto(f"{self.base_url}/", wait_until="networkidle", timeout=60_000)
        page.locator('[data-testid="mobile-home"]').wait_for(
            state="visible", timeout=30_000
        )
        self.check(page.locator("canvas").count() == 0, "mobile-has-no-canvas")
        self.check(page.locator("main").count() == 1, "mobile-has-one-main")
        self.check(
            page.locator("[data-home-destination]").count() == 4,
            "mobile-four-destinations",
        )
        self.check(
            page.locator('[data-home-destination="blog"]').get_attribute("href")
            == "/blog/",
            "mobile-blog-route",
        )
        mobile_overflow = page.evaluate(
            "document.documentElement.scrollWidth - window.innerWidth"
        )
        self.check(
            mobile_overflow <= 1,
            "mobile-no-horizontal-overflow",
            f"overflow={mobile_overflow}px",
        )
        page.screenshot(
            path=str(output / "mobile-390x844.png"),
            full_page=True,
            animations="disabled",
        )
        context.close()

        context, page = self.new_context(
            browser,
            viewport=DESKTOP_VIEWPORT,
            reduced_motion="reduce",
        )
        self.wire_diagnostics(page, "reduced-motion")

        def capture_reduced_script(response: Any) -> None:
            if response.request.resource_type == "script":
                self.reduced_scripts.add(response.url)

        page.on("response", capture_reduced_script)
        page.goto(f"{self.base_url}/", wait_until="networkidle", timeout=60_000)
        reduced = page.locator(
            '[data-testid="home-journey"][data-journey-mode="reduced"]'
        )
        reduced.wait_for(state="visible", timeout=30_000)
        self.check(page.locator("canvas").count() == 0, "reduced-has-no-canvas")
        self.check(page.locator("main").count() == 1, "reduced-has-one-main")
        self.check(
            reduced.get_attribute("data-journey-progress") == "1.0000",
            "reduced-resolves-to-end",
        )
        self.check(
            page.locator('[data-testid="home-shell"]').is_visible(),
            "reduced-home-visible",
        )
        page.screenshot(
            path=str(output / "reduced-motion-1440x900.png"),
            animations="disabled",
        )
        context.close()

        for width, height in ((390, 844), (320, 760)):
            context, page = self.new_context(
                browser,
                viewport={"width": width, "height": height},
                mobile=True,
                reduced_motion="reduce",
            )
            self.wire_diagnostics(page, f"mobile-reduced-{width}")
            page.on("response", capture_reduced_script)
            page.goto(f"{self.base_url}/", wait_until="networkidle", timeout=60_000)
            mobile_reduced = page.locator(
                '[data-testid="mobile-home"][data-journey-mode="mobile"]'
            )
            mobile_reduced.wait_for(state="visible", timeout=30_000)
            self.check(
                page.locator("canvas").count() == 0,
                f"mobile-reduced-{width}-has-no-canvas",
            )
            self.check(
                page.locator("main").count() == 1,
                f"mobile-reduced-{width}-has-one-main",
            )
            control_boxes = page.locator(
                '[data-rope-navigation] button'
            ).evaluate_all(
                "buttons => buttons.map(button => {"
                "const rect = button.getBoundingClientRect();"
                "return { width: rect.width, height: rect.height } })"
            )
            self.check(
                len(control_boxes) == 3
                and all(
                    box["width"] >= 44 and box["height"] >= 44
                    for box in control_boxes
                ),
                f"mobile-reduced-{width}-touch-targets",
                json.dumps(control_boxes),
            )
            page.screenshot(
                path=str(output / f"mobile-reduced-{width}x{height}.png"),
                full_page=True,
                animations="disabled",
            )
            context.close()

        for width, expected in (
            (1024, "cinematic"),
            (768, "cinematic"),
            (767, "mobile"),
            (320, "mobile"),
        ):
            context, page = self.new_context(
                browser,
                viewport={"width": width, "height": 760},
            )
            self.wire_diagnostics(page, f"breakpoint-{width}")
            page.goto(f"{self.base_url}/", wait_until="networkidle", timeout=60_000)
            selector = (
                '[data-testid="home-journey"][data-journey-mode="cinematic"]'
                if expected == "cinematic"
                else '[data-testid="mobile-home"][data-journey-mode="mobile"]'
            )
            if expected == "cinematic":
                self.wait_for_cinematic(page)
                self.check_pretext_contract(page, str(width))
            else:
                page.locator(selector).wait_for(state="attached", timeout=45_000)
            overflow = page.evaluate(
                "document.documentElement.scrollWidth - window.innerWidth"
            )
            self.check(
                overflow <= 1,
                f"breakpoint-{width}-no-overflow",
                f"overflow={overflow}px",
            )
            context.close()

        context, page = self.new_context(browser, viewport=DESKTOP_VIEWPORT)
        self.wire_diagnostics(page, "pretext-resize-sequence")
        page.goto(
            f"{self.base_url}/?qa=1&progress=0", wait_until="networkidle", timeout=60_000
        )
        for width in (1440, 768, 1024):
            page.set_viewport_size({"width": width, "height": 760})
            self.wait_for_cinematic(page)
            page.wait_for_timeout(450)
            self.check_pretext_contract(page, f"resize-{width}")
        journey = page.locator('[data-testid="home-journey"]')
        builds_before = int(
            journey.get_attribute("data-journey-timeline-builds") or 0
        )
        for width in range(1000, 1040, 2):
            page.set_viewport_size({"width": width, "height": 760})
        page.wait_for_timeout(650)
        builds_after = int(
            journey.get_attribute("data-journey-timeline-builds") or 0
        )
        self.check(
            builds_after - builds_before <= 2,
            "resize-storm-is-debounced",
            f"timelineBuilds={builds_before}->{builds_after}",
        )
        self.check(
            page.evaluate("window.innerWidth") == 1038,
            "resize-storm-final-width",
        )
        self.check_pretext_contract(page, "resize-storm-1038")
        context.close()

        context, page = self.new_context(
            browser, viewport={"width": 800, "height": 760}
        )
        self.wire_diagnostics(page, "cinematic-short-epilogue")
        page.goto(f"{self.base_url}/", wait_until="networkidle", timeout=60_000)
        self.wait_for_cinematic(page)
        page.evaluate("window.scrollTo(0, document.documentElement.scrollHeight)")
        page.wait_for_timeout(1_800)
        short_journey = page.locator('[data-testid="home-journey"]')
        self.check(
            float(short_journey.get_attribute("data-journey-progress") or -1)
            >= 0.99,
            "short-epilogue-reaches-end",
        )
        home_layer = page.locator("[data-home-shell-layer]")
        last_destination = page.locator("[data-home-destination]").last
        last_destination.evaluate(
            "element => element.scrollIntoView({ block: 'end', behavior: 'auto' })"
        )
        page.wait_for_timeout(150)
        reachability = home_layer.evaluate(
            """layer => {
                const card = layer.querySelector('[data-home-destination]:last-child')
                const rect = card.getBoundingClientRect()
                return {
                    cardBottom: rect.bottom,
                    cardTop: rect.top,
                    clientHeight: layer.clientHeight,
                    scrollHeight: layer.scrollHeight,
                    scrollTop: layer.scrollTop,
                }
            }"""
        )
        self.check(
            reachability["scrollHeight"] > reachability["clientHeight"]
            and reachability["scrollTop"] > 0
            and reachability["cardTop"] >= -1
            and reachability["cardBottom"] <= 761,
            "short-epilogue-last-card-reachable",
            json.dumps(reachability),
        )
        self.check(page.locator("main").count() == 1, "short-epilogue-has-one-main")
        canvas = page.locator('[data-testid="journey-canvas"] canvas')
        canvas.evaluate(
            """element => {
                element.dataset.journeyObserveRender = 'true'
                element.dataset.journeyRenderCount = '0'
            }"""
        )
        page.wait_for_timeout(350)
        self.check(
            canvas.get_attribute("data-journey-frameloop") == "demand",
            "epilogue-pauses-canvas",
        )
        epilogue_render_count = int(
            canvas.get_attribute("data-journey-render-count") or -1
        )
        page.wait_for_timeout(350)
        self.check(
            int(canvas.get_attribute("data-journey-render-count") or -1)
            == epilogue_render_count,
            "epilogue-render-loop-is-idle",
            f"renderCount={epilogue_render_count}",
        )
        page.screenshot(
            path=str(output / "cinematic-800x760-last-card.png"),
            animations="disabled",
        )
        page.set_viewport_size({"width": 800, "height": 740})
        page.wait_for_timeout(1_500)
        post_resize_render_count = int(
            canvas.get_attribute("data-journey-render-count") or -1
        )
        page.wait_for_timeout(700)
        post_resize_idle_count = int(
            canvas.get_attribute("data-journey-render-count") or -1
        )
        self.check(
            canvas.get_attribute("data-journey-frameloop") == "demand",
            "epilogue-resize-keeps-demand-frameloop",
        )
        self.check(
            post_resize_idle_count == post_resize_render_count,
            "epilogue-resize-does-not-restart-render-loop",
            f"renderCount={post_resize_render_count}->{post_resize_idle_count}",
        )
        home_layer.evaluate("layer => { layer.scrollTop = 0 }")
        page.mouse.move(400, 370)
        page.mouse.wheel(0, -900)
        page.wait_for_timeout(1_700)
        reverse_progress = float(
            short_journey.get_attribute("data-journey-progress") or -1
        )
        self.check(
            reverse_progress <= 0.755,
            "short-epilogue-wheel-chains-to-reverse",
            f"progress={reverse_progress:.4f}",
        )
        self.check(
            canvas.get_attribute("data-journey-frameloop") == "always",
            "reverse-resumes-canvas",
        )
        reverse_render_count = int(
            canvas.get_attribute("data-journey-render-count") or -1
        )
        page.wait_for_timeout(250)
        self.check(
            int(canvas.get_attribute("data-journey-render-count") or -1)
            > reverse_render_count,
            "reverse-restarts-render-loop",
            f"renderCount={reverse_render_count}",
        )
        context.close()

    def exercise_blog_route(self, browser: Browser) -> None:
        output = self.evidence_dir / "routes"
        output.mkdir(parents=True, exist_ok=True)
        context, page = self.new_context(browser, viewport=DESKTOP_VIEWPORT)
        self.wire_diagnostics(page, "blog-route")
        response = page.goto(
            f"{self.base_url}/blog/", wait_until="networkidle", timeout=60_000
        )
        self.check(response is not None and response.status == 200, "blog-http-200")
        self.check(page.get_by_role("heading", name="博客").is_visible(), "blog-heading")
        self.check(
            page.get_by_role("link", name="← 返回众妙之门").get_attribute("href")
            == "/",
            "blog-return-route",
        )
        page.screenshot(
            path=str(output / "blog-index-1440x900.png"), animations="disabled"
        )
        context.close()

        context, page = self.new_context(
            browser,
            viewport={"width": 390, "height": 844},
            mobile=True,
        )
        self.wire_diagnostics(page, "blog-link-navigation")
        page.goto(f"{self.base_url}/", wait_until="networkidle", timeout=60_000)
        page.locator('[data-testid="mobile-home"]').wait_for(
            state="visible", timeout=30_000
        )
        page.locator('[data-home-destination="blog"]').click()
        page.wait_for_url("**/blog/", timeout=30_000)
        self.check(
            page.get_by_role("heading", name="博客").is_visible(),
            "home-blog-link-navigates",
        )
        context.close()

    def verify_mobile_bundle_boundary(self) -> None:
        def contains_marker(url: str) -> bool:
            try:
                opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
                with opener.open(url, timeout=15) as response:
                    body = response.read()
            except Exception as error:  # pragma: no cover - diagnostic path
                self.browser_errors.append(
                    {
                        "scope": "bundle-boundary",
                        "kind": "fetch",
                        "message": f"{url}: {error}",
                    }
                )
                return False
            return any(marker in body for marker in CINEMATIC_MARKERS)

        desktop_3d = sorted(url for url in self.desktop_scripts if contains_marker(url))
        mobile_3d = sorted(url for url in self.mobile_scripts if contains_marker(url))
        reduced_3d = sorted(url for url in self.reduced_scripts if contains_marker(url))
        self.check(bool(desktop_3d), "desktop-loads-3d-chunk")
        self.check(
            not mobile_3d,
            "mobile-does-not-download-3d-chunk",
            ", ".join(mobile_3d),
        )
        self.check(
            not reduced_3d,
            "reduced-does-not-download-cinematic-chunk",
            ", ".join(reduced_3d),
        )
        self.check(
            bool(set(desktop_3d) - self.mobile_scripts),
            "desktop-3d-chunk-is-lazy",
        )
        self.bundle_boundary = {
            "desktop3dScripts": desktop_3d,
            "mobile3dScripts": mobile_3d,
            "reducedCinematicScripts": reduced_3d,
            "desktopScriptCount": len(self.desktop_scripts),
            "mobileScriptCount": len(self.mobile_scripts),
            "reducedScriptCount": len(self.reduced_scripts),
        }

    def make_contact_sheet(
        self,
        source_paths: list[Path],
        selected: tuple[tuple[str, float], ...],
        output: Path,
    ) -> None:
        by_frame = {
            int(path.name.split("-")[1]): path
            for path in source_paths
        }
        tiles: list[tuple[str, Image.Image]] = []
        for label, progress in selected:
            frame = round(progress * 600)
            image = Image.open(by_frame[frame]).convert("RGB")
            image.thumbnail((480, 300), Image.Resampling.LANCZOS)
            tiles.append((f"{label} / frame {frame:03d} / {progress:.3f}", image.copy()))

        columns = 4
        tile_width = 480
        label_height = 28
        tile_height = 300 + label_height
        rows = math.ceil(len(tiles) / columns)
        sheet = Image.new("RGB", (columns * tile_width, rows * tile_height), "#050813")
        draw = ImageDraw.Draw(sheet)
        for index, (label, image) in enumerate(tiles):
            x = (index % columns) * tile_width
            y = (index // columns) * tile_height
            sheet.paste(image, (x, y + label_height))
            draw.text((x + 10, y + 8), label, fill="#f0d589")
        sheet.save(output)

    def collect_source_identity(self) -> dict[str, Any]:
        candidates = [
            *Path("src").rglob("*"),
            Path("scripts/dev/home_journey_acceptance.py"),
            Path("package.json"),
            Path("pnpm-lock.yaml"),
            Path("docs/designs/home-journey-storyboard.md"),
            Path("docs/designs/architecture-overview.md"),
        ]
        files = sorted(
            {path for path in candidates if path.is_file()},
            key=lambda path: path.as_posix(),
        )
        hashes = {
            path.as_posix(): sha256_bytes(path.read_bytes()) for path in files
        }
        manifest_bytes = "\n".join(
            f"{path}\0{digest}" for path, digest in hashes.items()
        ).encode("utf-8")
        try:
            git_head = subprocess.check_output(
                ["git", "rev-parse", "HEAD"], text=True
            ).strip()
            git_status = subprocess.check_output(
                ["git", "status", "--short"], text=True
            ).strip()
            git_diff = subprocess.check_output(["git", "diff", "--binary"])
        except (OSError, subprocess.CalledProcessError) as error:
            git_head = "unavailable"
            git_status = str(error)
            git_diff = b""

        return {
            "gitHead": git_head,
            "gitStatus": git_status,
            "gitDiffSha256": sha256_bytes(git_diff),
            "manifestSha256": sha256_bytes(manifest_bytes),
            "files": hashes,
        }

    def write_report(self) -> None:
        self.check(
            not self.browser_errors,
            "browser-console-and-network-clean",
            json.dumps(self.browser_errors, ensure_ascii=False),
        )
        report = {
            "status": "pass" if not self.failures else "fail",
            "baseUrl": self.base_url,
            "checks": self.checks,
            "failures": self.failures,
            "browserErrors": self.browser_errors,
            "frameHashes": self.frame_hashes,
            "bundleBoundary": getattr(self, "bundle_boundary", {}),
            "sourceIdentity": self.collect_source_identity(),
        }
        report_path = self.evidence_dir / "acceptance-report.json"
        report_path.write_text(
            json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )

        checksums: dict[str, str] = {}
        for path in sorted(self.evidence_dir.rglob("*")):
            if path.is_file() and path.name != "checksums.json":
                checksums[path.relative_to(self.evidence_dir).as_posix()] = hashlib.sha256(
                    path.read_bytes()
                ).hexdigest()
        (self.evidence_dir / "checksums.json").write_text(
            json.dumps(checksums, indent=2) + "\n", encoding="utf-8"
        )


def main() -> int:
    args = parse_args()
    args.evidence_dir.mkdir(parents=True, exist_ok=True)
    acceptance = Acceptance(args.base_url, args.evidence_dir)

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            headless=True,
            args=BROWSER_ARGS,
        )
        storyboard_paths: list[Path] = []
        suites = (
            ("storyboard", lambda: storyboard_paths.extend(acceptance.capture_story_frames(browser))),
            (
                "independent-determinism",
                lambda: acceptance.verify_independent_frame_determinism(browser),
            ),
            ("interactions", lambda: acceptance.exercise_scroll_and_controls(browser)),
            ("responsive", lambda: acceptance.exercise_mobile_and_reduced(browser)),
            ("routes", lambda: acceptance.exercise_blog_route(browser)),
            ("bundle-boundary", acceptance.verify_mobile_bundle_boundary),
        )
        try:
            for label, suite in suites:
                try:
                    suite()
                except Exception as error:  # preserve all independent suite evidence
                    acceptance.failures.append(
                        f"{label} acceptance exception: {error}"
                    )

            if storyboard_paths:
                acceptance.make_contact_sheet(
                    storyboard_paths,
                    FORMAL_STATES,
                    args.evidence_dir / "formal-seven-frame-contact-sheet.png",
                )
                acceptance.make_contact_sheet(
                    storyboard_paths,
                    tuple((f"beat-{index:02d}", progress) for index, progress in enumerate(STORY_BEATS)),
                    args.evidence_dir / "storyboard-contact-sheet.png",
                )
        except Exception as error:  # preserve partial evidence for diagnosis
            acceptance.failures.append(f"acceptance runner exception: {error}")
        finally:
            browser.close()

    acceptance.write_report()
    print(
        json.dumps(
            {
                "status": "pass" if not acceptance.failures else "fail",
                "checks": len(acceptance.checks),
                "failures": acceptance.failures,
                "evidenceDir": str(args.evidence_dir),
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    return 0 if not acceptance.failures else 1


if __name__ == "__main__":
    sys.exit(main())
