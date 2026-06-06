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
- Provider-grouped Proxies reuse the shared `providerNameByProxy` computed map from the proxy store instead of rebuilding the provider lookup in every grouped component instance.
- App-browser verification now actively checks the expanded mobile panel after viewport events and a real CDP compact-height resize from `390 x 844` to `390 x 700`, then restores the original viewport.
- The mock verification backend now accepts quiet WebSocket upgrades for `/connections`, `/logs`, `/memory`, and `/traffic`, preventing realtime reconnect noise during scroll sampling.
- `renderProxies` now uses a lazy cached latency getter inside each derived state instead of building a full latency map before filtering, sorting, and counting.
- `VirtualProxyNodeGrid` now renders from precomputed visible row slices instead of calling a template helper that slices row nodes during render.
- Mobile `ProxyGroupForMobile` now delays full sorted `renderProxies` output until expanded content is displayed, while keeping the title count derived from the filtered list.
- Mobile `ProxyGroupForMobile` now derives its transition watchdog from the active panel's computed transition duration/delay, so expanded content state still settles when `transitionend` is skipped or CSS timing changes.
- Scroll verification now records scrollTop before/after positions for long frame samples, making provider-expanded RAF tails easier to distinguish from DOM/resource/layout churn.
- Expanded mobile proxy mode now marks the hidden dock as `inert` and `aria-hidden`, so it is removed from sequential keyboard focus and the accessibility tree while the expanded panel owns the interaction.
- App-browser verification now checks expanded dock semantics directly: hit surface hidden, programmatic focus rejected, Tab traversal stays in the panel, and the `Main navigation` landmark is absent from the accessibility tree only while expanded.
- App-browser verification now closes the expanded panel after the expanded screenshot and checks that the dock restores `aria-hidden`, `inert`, pointer events, opacity, focusability, and the `Main navigation` accessibility landmark.

## Dock Invariants Rechecked

- Fixture dock size: `320 x 52`.
- Fixture dock buttons: `60 x 44`.
- Light dock background: `color(srgb 1 1 1 / 0.72)`.
- Dark dock background: `rgba(28, 28, 30, 0.32)`.
- Expanded mobile proxy mode hides the dock hit surface.
- Normal bottom content remains reachable without dock interception.

## Verification Matrix

- `node --check scripts\verify-scroll-smoothness.mjs`: pass.
- `npx vue-tsc --build --force`: pass.
- `npx eslint scripts\verify-scroll-smoothness.mjs src\views\HomePage.vue src\components\proxies\ProxyGroupForMobile.vue src\components\proxies\ProxyGroup.vue src\composables\renderProxies.ts`: pass.
- `npm run build`: pass.
- `npm run verify:scroll-smoothness:app-browser`: pass.
- `npm run verify:scroll-smoothness:provider-app-browser`: pass.
- `npm run verify:mobile-dock:fixture-browser`: pass.

## Performance Notes

- Normal Proxies page scroll stayed within the verifier budget. The latest app-browser run saw `p95: 16.7ms`, `max: 50.1ms`; the single tail sample happened after reaching the end (`remainingAfter: 0`) and was uncoupled from resources, long tasks, or layout changes.
- Mobile expanded nested scroll passed and kept dock hit targets hidden. The latest app-browser run saw `p95: 33.4ms`, `max: 33.4ms`, with no long samples, new resources, long tasks, or layout changes.
- Provider-grouped expanded nested scroll passed. The latest provider app run saw `p95: 33.4ms`, `max: 33.4ms`, with no long samples, new resources, long tasks, or layout changes.
- Expanded panel resize checks passed for both normal and provider-grouped mobile panels. In compact height, nested scroll height changed from `432px` to `360px`, remained scrollable, stayed above the dock, and restored to `432px`.
- Expanded dock accessibility checks passed for normal and provider-grouped expanded panels. Dock DOM reported `ariaHidden: true`, `inert: true`, no dock entries appeared during 12 Tab steps, and `navigationNodes` was empty in the accessibility tree.
- Expanded dock restore checks passed for normal and provider-grouped expanded panels. After closing, dock DOM reported `ariaHidden: ""`, `inert: false`, `pointerEvents: auto`, opacity above `0.98`, focus returned to `Proxies`, and `Main navigation` reappeared in the accessibility tree.
- Provider-grouped expanded stability sampling passed across `10` consecutive verifier runs. The worst `p95` was `33.4ms`, worst single frame was `50.1ms`, and the `4` total long samples were uncoupled from layout changes, long tasks, and new resources; dock restore checks stayed green in every run.
- WebSocket realtime routes no longer appear as repeated ordinary HTTP request noise in the latest app-browser `servedRequests`.
- Lazy latency lookup keeps `proxiesCount` accurate while avoiding unconditional latency reads before default filter/sort paths need them.
- Virtual grid row preparation remains limited to visible virtual rows and keeps active-row lookup on the cached node-index map.
- Mobile collapsed cards avoid full render-list sorting/filter output during page scrolling; expanded normal and provider-grouped panels still render the expected `12` nodes in the browser checks.
- Low-power verification from the previous iteration passed after rerun, with dock blur reduced to `blur(0px) saturate(1.5)`.

## Remaining Follow-ups

- Consider adding a landscape-orientation-specific expanded-panel pass after deciding the expected dock semantics for landscape mobile layouts.
- Keep watching provider-grouped expanded scroll in headless runs; occasional `50ms` RAF tail samples are currently allowed only when uncoupled from resources, layout changes, and long tasks.
