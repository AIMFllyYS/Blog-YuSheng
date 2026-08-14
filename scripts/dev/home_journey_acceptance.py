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
import sys
import urllib.request
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw
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
WEBGL_MARKERS = (b"WebGLRenderer", b"react-three-fiber", b"JourneyCanvas")


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

            if frame == 192:
                tile_opacities = page.locator('[data-motion-tile]').evaluate_all(
                    "tiles => tiles.map(tile => Number(getComputedStyle(tile).opacity))"
                )
                self.check(
                    len(tile_opacities) == 24 and min(tile_opacities) >= 0.99,
                    "covered-swap-is-fully-occluded",
                    f"minOpacity={min(tile_opacities):.4f}",
                )

            path_a = frames_dir / f"{slug}.png"
            path_b = rerender_dir / f"{slug}.png"
            bytes_a = page.screenshot(path=str(path_a), animations="disabled")
            page.wait_for_timeout(220)
            bytes_b = page.screenshot(path=str(path_b), animations="disabled")
            hash_a = sha256_bytes(bytes_a)
            hash_b = sha256_bytes(bytes_b)
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
        context.close()
        return paths

    def exercise_scroll_and_controls(self, browser: Browser) -> None:
        output = self.evidence_dir / "interactions"
        output.mkdir(parents=True, exist_ok=True)
        context, page = self.new_context(browser, viewport=DESKTOP_VIEWPORT)
        self.wire_diagnostics(page, "desktop-interactions")
        page.goto(f"{self.base_url}/", wait_until="networkidle", timeout=60_000)
        self.wait_for_cinematic(page)
        journey = page.locator('[data-testid="home-journey"]')

        page.evaluate(
            "window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * 0.30)"
        )
        page.wait_for_timeout(1_500)
        mid_progress = float(journey.get_attribute("data-journey-progress") or -1)
        self.check(
            0.15 <= mid_progress <= 0.55,
            "forward-scroll-progresses",
            f"progress={mid_progress:.4f}",
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
        page.goto(f"{self.base_url}/", wait_until="networkidle", timeout=60_000)
        reduced = page.locator(
            '[data-testid="home-journey"][data-journey-mode="reduced"]'
        )
        reduced.wait_for(state="visible", timeout=30_000)
        self.check(page.locator("canvas").count() == 0, "reduced-has-no-canvas")
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

        for width, expected in ((1024, "cinematic"), (768, "cinematic"), (767, "mobile"), (320, "mobile")):
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
            return any(marker in body for marker in WEBGL_MARKERS)

        desktop_3d = sorted(url for url in self.desktop_scripts if contains_marker(url))
        mobile_3d = sorted(url for url in self.mobile_scripts if contains_marker(url))
        self.check(bool(desktop_3d), "desktop-loads-3d-chunk")
        self.check(
            not mobile_3d,
            "mobile-does-not-download-3d-chunk",
            ", ".join(mobile_3d),
        )
        self.check(
            bool(set(desktop_3d) - self.mobile_scripts),
            "desktop-3d-chunk-is-lazy",
        )
        self.bundle_boundary = {
            "desktop3dScripts": desktop_3d,
            "mobile3dScripts": mobile_3d,
            "desktopScriptCount": len(self.desktop_scripts),
            "mobileScriptCount": len(self.mobile_scripts),
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
            args=(
                "--use-angle=swiftshader",
                "--enable-webgl",
                "--ignore-gpu-blocklist",
                "--no-proxy-server",
                "--proxy-bypass-list=<-loopback>",
            ),
        )
        storyboard_paths: list[Path] = []
        suites = (
            ("storyboard", lambda: storyboard_paths.extend(acceptance.capture_story_frames(browser))),
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
