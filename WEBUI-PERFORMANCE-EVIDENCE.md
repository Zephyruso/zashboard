# WebUI Performance Evidence

Date: 2026-06-06

## Scope

- Preserve the current WebUI layout and mobile bottom dock/tab behavior.
- Improve mobile Proxies scroll smoothness and expanded panel consistency.
- Reduce startup/network noise during scroll verification.
- Keep evidence local because `C:\Users\15493\Documents\Codex\2026-05-23\goal` is not present in the current environment.

## Current Changes Covered

- Mobile Proxies expanded cards now hold a tokenized page-scroll lock instead of writing a shared boolean directly.
- The mobile expanded panel listens to `window.visualViewport`, `resize`, `orientationchange`, and visual viewport scroll while open, then recomputes its transform and height through the existing rAF path.
- Expanded panel max-height now reserves space from `dockTop` instead of relying on a fixed bottom constant.
- UI update checks are delayed and then scheduled through idle time, with low-power and hidden-page skips.
- Scroll verification injects settings that suppress unrelated update/IP/connection checks during app-browser sampling.

## Dock Invariants Rechecked

- Fixture dock size: `320 x 52`.
- Fixture dock buttons: `60 x 44`.
- Light dock background: `color(srgb 1 1 1 / 0.72)`.
- Dark dock background: `rgba(28, 28, 30, 0.32)`.
- Expanded mobile proxy mode hides the dock hit surface.
- Normal bottom content remains reachable without dock interception.

## Verification Matrix

- `node --check scripts\verify-scroll-smoothness.mjs`: pass.
- `npx eslint scripts\verify-scroll-smoothness.mjs src\components\proxies\ProxyGroupForMobile.vue src\composables\paddingViews.ts src\composables\proxies.ts`: pass.
- `npm run build`: pass.
- `npm run verify:scroll-smoothness:app-browser`: pass.
- `npm run verify:scroll-smoothness:provider-app-browser`: pass.
- `npm run verify:mobile-dock:fixture-browser`: pass.

## Performance Notes

- Normal Proxies page scroll stayed within the verifier budget. The latest run saw one headless RAF tail sample at `50ms`, with no new resources, long tasks, or layout changes.
- Provider-grouped expanded nested scroll passed. The latest run saw headless RAF tail samples up to `83.3ms`, with no new resources, long tasks, or layout changes.
- Mobile expanded nested scroll passed and kept dock hit targets hidden.
- Low-power verification from the previous iteration passed after rerun, with dock blur reduced to `blur(0px) saturate(1.5)`.

## Remaining Follow-ups

- Mock or disable realtime WebSocket routes in app-browser verification to further reduce local request noise.
- Cache provider-name lookup for provider-grouped Proxies to reduce repeated work when expanding mobile groups.
- Consider a dedicated viewport-change browser check that actively resizes the mobile viewport while a proxy group is expanded.
