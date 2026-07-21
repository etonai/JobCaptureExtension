# DevCycle 018: Open the Premium ("Top Applicant") LinkedIn Job Search

**Status:** Planning
**Start Date:** 2026-07-21
**Target Completion:** 2026-07-21
**Focus:** Add a second popup button, "Open Premium Job Search", that opens LinkedIn's `origin=QUALIFICATION_LANDING` premium/"top applicant" search surface filtered to the last 24 hours — alongside DC17's existing "Open Job Search" button, not replacing it.

---

## Goal

DC17 shipped "Open Job Search", which reproduces the plain keyword + `geoId` + 24-hour search. On live use that turned out to open LinkedIn's *generic* results surface, not the *premium* "Show All where I'd be the top applicant" surface the user actually starts from each day (`origin=QUALIFICATION_LANDING`, per `doc/ideas/DC17ideas.md`). The user does not want to undo DC17 — the generic shortcut is independently useful — but wants the premium surface too, as a **second button next to the first**, so both are available side by side and can be compared in real use. This cycle is Idea 3 done "the way I intended it": build and open the premium search URL, keeping the 24-hour time filter.

Comparing the two URLs the user captured, the distinguishing element of the premium surface is the `origin=QUALIFICATION_LANDING` parameter (the generic page the DC17 button produced carries no `origin` at all). The remaining premium-only parameters are either cosmetic (`showHowYouFit=HOW_YOU_FIT` opens the right-pane "how you fit" panel) or tracking/rotating and non-reproducible (`referralSearchId`, `originToLandingJobPostings`). The central open question this cycle must answer live is whether `origin=QUALIFICATION_LANDING` alone is enough to land on the premium surface, or whether LinkedIn also requires the rotating job-ID set the extension cannot fabricate.

## Desired Outcome

- The extension popup has a second action, "Open Premium Job Search", placed next to the existing "Open Job Search" button so both are usable side by side.
- The premium button opens LinkedIn's `origin=QUALIFICATION_LANDING` surface, filtered to the last 24 hours (`f_TPR=r86400`).
- The premium search reuses the *same* stored configuration as DC17 (keywords, `geoId`, timeframe) — no new options are introduced, because it is the same search on a different surface.
- DC17's "Open Job Search" button and all its behavior remain unchanged; both buttons coexist.
- The premium URL is built by a pure, unit-tested function, consistent with DC17's `searchUrlBuilder.js` and the project's `.test.mjs` discipline.
- The unconfigured guard (blank keywords or `geoId` routes to Options) applies to the premium button exactly as it does to the generic one.
- Live verification confirms which parameters are actually required to reach the premium surface, and the result is recorded in this document.

---

## Tasks

### Phase 1: Build the Premium Search URL

**Status:** Planning

- [ ] Add a pure builder for the premium surface (e.g. `buildPremiumJobSearchUrl(settings)` in `extension/shared/searchUrlBuilder.js`) that reuses the existing `jobSearchSettings` shape.
- [ ] Emit `keywords`, `geoId`, `f_TPR=r<timeframeSeconds>`, and the distinguishing `origin=QUALIFICATION_LANDING`. Optionally include the cosmetic `showHowYouFit=HOW_YOU_FIT` (see Technical Notes).
- [ ] Do **not** emit the rotating/tracking parameters the extension cannot legitimately fabricate: `originToLandingJobPostings`, `referralSearchId`, `lipi`, `currentJobId`.
- [ ] Preserve `geoId` verbatim and throw the same typed "not configured" error as the generic builder when keywords or `geoId` are blank.
- [ ] Add focused unit tests: presence of `origin=QUALIFICATION_LANDING`, the shared params (`keywords`, `geoId`, `f_TPR`), absence of the non-reproducible tracking params, verbatim `geoId`, and the blank-configuration error.

**Technical Notes:**

Likely files:

- `extension/shared/searchUrlBuilder.js` (extend)
- `extension/tests/searchUrlBuilder.test.mjs` (extend)

Keep `buildJobSearchUrl` (generic, DC17) untouched and add `buildPremiumJobSearchUrl` beside it so the two surfaces are explicit and independently testable. Both share validation via `isJobSearchConfigured`. `showHowYouFit=HOW_YOU_FIT` only opens the right-pane "how you fit" panel and is cosmetic; include it to more closely match the page the user sees, but it can be dropped with no functional loss. The essential difference from the generic URL is `origin=QUALIFICATION_LANDING`.

### Phase 2: Add the Second Popup Button

**Status:** Planning

- [ ] Add an "Open Premium Job Search" button to `extension/popup/popup.html`, positioned next to the existing "Open Job Search" button (side by side per the user's request).
- [ ] Wire it in `extension/popup/popup.js`: load the shared search settings, build the premium URL, and open it via `chrome.tabs.create({ url })` in a new tab, mirroring the existing `openJobSearch` handler.
- [ ] Apply the same unconfigured guard: blank keywords or `geoId` shows a status message and opens Options instead of navigating.
- [ ] Adjust popup layout/CSS so the two buttons sit side by side without truncating their labels at the popup's 380px width.
- [ ] Confirm no `manifest.json` permission change is required (same `chrome.tabs.create` approach as DC17).

**Technical Notes:**

Likely files:

- `extension/popup/popup.html`
- `extension/popup/popup.js`
- `extension/popup/popup.css`

Factor the shared open logic if it helps, but a second small handler (`openPremiumJobSearch`) that calls `buildPremiumJobSearchUrl` is fine and matches the existing style. The existing generic button is `#openJobSearchButton`; add `#openPremiumJobSearchButton`. For the side-by-side layout, wrap both buttons in a flex row; the longer "Open Premium Job Search" label may need a smaller font or wrapping — decide during implementation against the live popup.

### Phase 3: Verification and Documentation

**Status:** Planning

- [ ] Run `node --check` on all changed JavaScript and the URL-builder and persistence test suites; confirm no regressions.
- [ ] **Live verification (the crux):** confirm on a real browser whether `origin=QUALIFICATION_LANDING` (plus keywords/`geoId`/`f_TPR`) actually lands on the premium "top applicant" surface, or whether LinkedIn falls back to the generic surface without the rotating `originToLandingJobPostings` set.
- [ ] If the minimal URL does not reach the premium surface, record the finding and evaluate the fallback (Idea 4: click LinkedIn's home-page "Show All" button via a self-contained injected function), deferring it to a future cycle rather than expanding scope here.
- [ ] Verify both buttons work independently and that the generic DC17 button is unchanged.
- [ ] Update `extension/README.md` to document the second "Open Premium Job Search" action and how it differs from the generic one.
- [ ] Bump `extension/manifest.json` version (from `0.0.17.1` to `0.0.18.0`) for reload verification.
- [ ] Record chosen behaviors, the live-verification result, and any deferred fallback in the Completion Summary.

**Technical Notes:**

Likely verification commands:

```powershell
node --check extension\shared\searchUrlBuilder.js
node --check extension\popup\popup.js
node extension\tests\searchUrlBuilder.test.mjs
node extension\tests\persistence.test.mjs
```

As with DC17, automated tests can prove the URL is well-formed but cannot prove LinkedIn renders the premium surface for it. This cycle stays at `Work Complete` until the user approves `Verified`, and live confirmation of the premium surface is the specific check that gates it.

---

## Open Questions

1. **Is `origin=QUALIFICATION_LANDING` sufficient to reach the premium surface, or is the rotating `originToLandingJobPostings` set also required?**
   Recommendation: build the minimal premium URL (`origin=QUALIFICATION_LANDING` + shared params) and test it live first, because it is the only distinguishing parameter the extension can legitimately set. The extension cannot fabricate valid, fresh job IDs for `originToLandingJobPostings`, so if that set proves mandatory, pure URL construction cannot fully reproduce the premium surface — in that case, document the limitation and consider Idea 4 (clicking LinkedIn's own "Show All" button) as a separate future cycle.

2. **Should the premium search have its own configuration, or reuse DC17's?**
   Recommendation: **reuse** the existing `jobSearchSettings` (keywords, `geoId`, timeframe). It is the same search on a different surface, so a second config would only create drift and confusion.

3. **Side-by-side vs stacked buttons?**
   Recommendation: **side by side** in a flex row, per the user's explicit request, so the two shortcuts read as sibling options for direct comparison. Reassess only if the labels truncate unacceptably at the popup width.

4. **Include the cosmetic `showHowYouFit=HOW_YOU_FIT`?**
   Recommendation: include it — it matches the page the user sees and only opens the "how you fit" side panel — but treat it as optional; dropping it changes nothing functional.

---

## Notes and Risks

- **Primary risk:** the premium surface may depend on the rotating `originToLandingJobPostings` job-ID set, which the extension cannot generate. If live testing shows `origin=QUALIFICATION_LANDING` alone lands on the generic surface, pure URL construction is insufficient and the honest outcome is to record that and defer the DOM-click fallback (Idea 4) to a later cycle — not to fabricate job IDs.
- DC17 is intentionally **not** undone. Both "Open Job Search" (generic) and "Open Premium Job Search" (premium) ship together so the user can compare which is more useful in practice.
- Same mechanism as DC17: plain `chrome.tabs.create` navigation, not `chrome.scripting.executeScript` injection, so the DC13 self-contained-injection discipline does not apply and no new permissions are needed. (The Idea 4 fallback, if ever pursued, *would* reintroduce the injection discipline.)
- `referralSearchId` and `lipi` are per-session/per-view tracking tokens; they are neither reproducible nor needed and are deliberately omitted.
- The premium button reuses the unconfigured-guard and new-tab behavior established and verified in DC17.
- Idea 1 (the "Next" pagination button) is pushed to **DC19**, per the user's note in `DC17ideas.md`.

---

## Completion Summary

*Fill in when the cycle closes. Move this document to `doc/planning/completed/` afterward.*

**Completion Date:** [YYYY-MM-DD]
**Phases Completed:** [List or "All"]
**Work Deferred:** [What was not done and why, or "None"]

**Accomplishments:**
- [What was built or changed]

**Metrics:**
- Files modified: [N]
- [Other relevant measure]

**Lessons / Notes:**
[Anything worth remembering for future cycles.]
