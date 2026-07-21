# Ideas for DC 17 and beyond

What if we manipulate the url?

That's the button to "Show All" premium jobs where I'd be the top applicant. I am concerned that there might be some kind of time sensitive element in it. Otherwise, it would be nice if the extension could just go there instead of me selecting this manually.
https://www.linkedin.com/jobs/search-results/?keywords=Software+Engineer&origin=JobSearchOrigin_QUALIFICATION_LANDING&originToLandingJobPostings=4443011974%2C4443029579%2C4438701013&geoId=90000091&lipi=urn%3Ali%3Apage%3Ad_flagship3_job_home%3BkS966LC1TyOxLgho9hDc2g%3D%3D

I copied the same button a few minutes later:
https://www.linkedin.com/jobs/search-results/?keywords=Software+Engineer&origin=JobSearchOrigin_QUALIFICATION_LANDING&originToLandingJobPostings=4443011974%2C4438701013%2C4443056056&geoId=90000091&lipi=urn%3Ali%3Apage%3Ad_flagship3_job_home%3BX5IKrregSGSoMUwi1jqCJA%3D%3D



Current first page of my search (should be the first 25 postings)
https://www.linkedin.com/jobs/search-results/?currentJobId=4443011974&showHowYouFit=HOW_YOU_FIT&keywords=Software%20Engineer&origin=QUALIFICATION_LANDING&referralSearchId=vSr6UZ63j6QHI37i96tqYA%3D%3D&originToLandingJobPostings=4443011974%2C4443029579%2C4438701013&geoId=90000091&f_TPR=r86400

Current second page of my search (should be the next 25 postings)
https://www.linkedin.com/jobs/search-results/?currentJobId=4443036331&showHowYouFit=HOW_YOU_FIT&keywords=Software%20Engineer&origin=QUALIFICATION_LANDING&referralSearchId=vSr6UZ63j6QHI37i96tqYA%3D%3D&start=25&geoId=90000091&f_TPR=r86400

My thought is first to have AI analyze both urls.
See if we can make this easier.

Idea 1: Next button in extension.
Scenario: What if there are no recent job postings that fit the critera? Or what if i know I've seen them already? Under the current system, i go down the list in linkedin and hit the Next (or the number indicating the next page).
What if there is an button in the extension that will do that for me?

Idea 2: Timeframe
Right now that 86400 probably means we are searching for postings in the last 24 hours. I don't think this would work, but what if we could just look at postings in the last 2 hours?
I've tried this manually. I think LinkedIn blocks that kind of granularity

Idea 3: Extension immediately goes to the first page of my search
Save myself time instead of going to linkedin and then pressing the button to get to the first page of the search

Idea 4: Extension selects the button to go to first page of search
If the extension can't go directly to the first page, maybe it can select the button from my linkedin home page

---

## Opus comment

*Author: Claude (Opus 4.8), 2026-07-21. Analysis only — no implementation. Grounded in the current extension (`manifest.json` permissions `activeTab`/`scripting`/`storage`; popup-driven self-contained `chrome.scripting.executeScript` injection; the client-side recent-postings age filter shipped in DC13–DC16) and the earlier feasibility note in `Fable_first-select.md`.*

### What the URLs actually contain

Decoding the four URLs, the query parameters fall into two groups — a small set that **determines the results**, and a larger set that is **tracking/context** and can be dropped without changing what LinkedIn returns.

| Parameter | Example value | Meaning | Needed to reproduce the search? |
|---|---|---|---|
| `keywords` | `Software Engineer` | Search terms | **Yes** |
| `geoId` | `90000091` | LinkedIn geographic-region identifier | **Yes** (preserve verbatim) |
| `f_TPR` | `r86400` | "Time posted range" = `r` + seconds. `86400` = last 24h | **Yes** — this is the time filter |
| `start` | `25` | Pagination offset (page 2 = 25, page 3 = 50, …) | Only for paging; omit = page 1 |
| `currentJobId` | `4443011974` | Which card's detail is open in the right pane | No — LinkedIn picks the first card if absent |
| `origin` | `QUALIFICATION_LANDING` | How you arrived at the search | No (analytics/context) |
| `originToLandingJobPostings` | `4443011974,4443029579,4438701013` | A rotating "recommended right now" job-ID set | No (see below) |
| `referralSearchId` | `vSr6UZ63…` | Search-session tracking id | No |
| `lipi` | `urn:li:page:…;kS966LC1…` | Per-page-view instance/tracking token | No |
| `showHowYouFit` | `HOW_YOU_FIT` | Right-pane "how you fit" panel toggle | No |

**On your time-sensitivity concern (the "Show All" button):** comparing the two copies you took minutes apart, only two things changed — `originToLandingJobPostings` rotated (`4443029579` dropped, `4443056056` added; two IDs stayed) and `lipi` changed. That tells us the button's URL carries a **live-refreshing set of recommended postings plus a per-view tracking token**. Nothing there looks like an expiring auth/security token — the link doesn't "go stale" in the sense of breaking; it just reflects a snapshot of what LinkedIn was featuring at that instant. So the time-sensitivity is in the *content it points at*, not in a token you have to race. More importantly: **you don't need that button's surface at all.** The standard search results (your URL 3 / URL 4 form) are fully reconstructable from just `keywords` + `geoId` + `f_TPR`, so the extension can build a clean search URL itself rather than depending on the rotating "Show All" link.

### Idea-by-idea verdict

**Idea 1 — "Next" button in the extension: Feasible, low risk. Recommended.**
Paging is just `start` in increments of 25 (page 2 = `start=25`, page 3 = `start=50`, …). The cleanest implementation fits your existing architecture exactly: inject a small self-contained function that reads `window.location`, adds/increments `start` by 25 (preserving every other param), and sets `window.location.href`. No manifest or permission change — you already have `scripting` + `activeTab`. This is more reliable than clicking LinkedIn's own pagination control (no dependency on LinkedIn's DOM/class names, unlike the click-a-card risk documented in `Fable_first-select.md`). Caveats: LinkedIn caps results at roughly 1000 (~40 pages) and will show an empty list past the end — the button should stop or wrap gracefully; and since the recent-postings scan runs on popup open, the natural flow is "click Next → reopen popup to rescan the new page."

**Idea 2 — Tighter timeframe (2 hours): Partly achievable, but you may already have what you need.**
`f_TPR=r7200` is 2 hours and `r3600` is 1 hour — the parameter takes arbitrary seconds. The reason it felt "blocked" manually is that LinkedIn's *dropdown UI* only offers 24h / week / month; the URL parameter is a separate lever the UI doesn't expose. Whether LinkedIn fully **honors** an arbitrary sub-24h value or **snaps** it to its nearest supported bucket is the one thing I genuinely can't confirm without hitting a live page — it should be tested empirically (load `…&f_TPR=r7200`, compare the result count against `r86400`). The key point, though: **your extension already filters to 2h/1h/<1h client-side (DC14–DC16), so your correctness doesn't depend on this.** Tightening `f_TPR` would only shrink the raw result set the extension scans and reduce how many "Next" pages contain anything fresh — a performance/UX win, not a requirement. If LinkedIn ignores or snaps the value, there's no harm: you fall back to 24h + the existing client-side filter. Recommendation: test it; adopt `r7200` if honored; keep the client-side filter as the source of truth regardless.

**Idea 3 — Extension jumps straight to the first page of your search: Feasible, lowest risk, highest value. Strongly recommended.**
Build the canonical search URL from the three parameters that matter and drop all the tracking cruft:
```
https://www.linkedin.com/jobs/search-results/?keywords=Software+Engineer&geoId=90000091&f_TPR=r86400
```
(omit `start` for page 1). Store `keywords`, `geoId`, and the `f_TPR` window in the extension's options (`storage`), so you configure your search once and the extension can navigate there on demand — either by injecting `window.location.href = <builtUrl>` on the active LinkedIn tab, or by opening it in a tab. This is the single most useful of the four ideas and needs no new permissions.

**Idea 4 — Extension clicks the home-page button as a fallback: Works, but likely unnecessary and strictly more fragile.**
Because Idea 3 reconstructs the search URL directly and reliably, you shouldn't need to fall back to clicking LinkedIn's home-page button. Clicking it depends on LinkedIn's DOM (the same class of moderate risk called out for synthetic card-clicks in `Fable_first-select.md`) and lands you on the `QUALIFICATION_LANDING` surface with its rotating recommendations rather than your clean, time-filtered search. Keep this only as a genuine last resort, and treat it as a downgrade from Idea 3, not an equal alternative.

### Suggested sequencing for a DC17 cycle

1. **Idea 3 first** (navigate to a stored search URL) — foundational, lowest risk, immediately useful, and it establishes the "extension writes `window.location`" mechanic.
2. **Idea 1 next** (Next button) — reuses the exact same mechanic (`start += 25`).
3. **Idea 2 as a quick experiment** alongside them — a one-off live test of `f_TPR=r7200`/`r3600` to decide whether to narrow the stored window; costs almost nothing and the client-side filter backstops any result.
4. **Idea 4 only if** a live test ever shows Idea 3's constructed URL doesn't reproduce your intended results.

One implementation reminder from DC13, which `Fable_first-select.md` also stresses: every injected function must stay **fully self-contained** — `executeScript({ func })` serializes only that function's body, so any URL-building helper has to live inside the injected function and be covered by the existing `new Function(...)` injection-isolation test.

## Edward Comment

DC 17: Idea 3
DC 18: Idea 1

## Edward comment after DC 17
DC 17 was mostly successful, but it took me to a generic page
https://www.linkedin.com/jobs/search-results/?currentJobId=4442297213&keywords=Software%20Engineer&geoId=90000091&f_TPR=r86400

Is just a page with keywords and the 24 hour limit. But it looks like it is not the PREMIUM page like that.

The premium one looks like this:
https://www.linkedin.com/jobs/search-results/?currentJobId=4443011974&showHowYouFit=HOW_YOU_FIT&keywords=Software%20Engineer&origin=QUALIFICATION_LANDING&referralSearchId=WrpjhhVHZRUEhCSp%2BuALaQ%3D%3D&originToLandingJobPostings=4443011974%2C4443023474%2C4438701013&geoId=90000091&f_TPR=r86400

And is actually different. I don't know how much better it is, but it might be better. I should be able to go to both.

So the new DC 18 will be Idea 3 but the way I wanted it in the beginning. "Open Premium Job Search" and it will filter by the 24 hour limit.

We'll push idea 1 to DC 19.


## Edward comment after DC 18
DC 18 is what I originally wanted, but I see a value in having both DC 17 and DC 18 options

