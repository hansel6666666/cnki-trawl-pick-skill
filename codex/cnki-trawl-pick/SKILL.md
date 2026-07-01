---
name: cnki-trawl-pick
description: CNKI literature trawling and precision paper selection workflow. Use when Codex needs to search CNKI/China National Knowledge Infrastructure by topic or method, apply CSSCI/Peking University Core/CSCD/EI source-tier filters, evaluate candidate papers, download PDF/CAJ files through the local Chrome CDP bridge, and verify method or scenario relevance from full text instead of relying only on title, abstract, citations, or download counts.
---

# CNKI Trawl Pick

Use this skill for high-precision CNKI literature harvesting: search broadly enough to find useful papers, narrow by source tier and evidence, download only plausible candidates, then verify the full text before recommending use.

This skill is a Codex-native workflow layer over an existing `web-access` CDP bridge. It does not implement browser infrastructure. For CNKI DOM details and CDP endpoint behavior, read `references/cnki-site-pattern.md` and, when needed, the `web-access` skill's `references/cdp-api.md` in the local Codex skills directory.

## Guardrails

- Treat the task as evidence collection, not keyword scraping.
- Do not modify system, browser, proxy, extension, VS Code, or `web-access` configuration.
- Use the existing `http://localhost:3456` CDP bridge through PowerShell `Invoke-WebRequest -UseBasicParsing`.
- Open and close only tabs created for the task. Do not close user tabs.
- Stop if CNKI is not logged in or full-text permission is unavailable; ask the user to log in through Chrome.
- Do not downgrade quality targets silently. If source tier, year window, or topic fit is too narrow, report the blocker and ask whether to broaden.
- Apply the 3-try cap to unstable UI filters or downloads. After three same-class failures, stop and report evidence.

## Quick Detect

Run the local read-only detector before live CNKI work:

```powershell
node "<path-to-skill>\scripts\detect.mjs"
```

Optional live bridge check, still read-only:

```powershell
node "<path-to-skill>\scripts\detect.mjs" --bridge
```

The detector must not start the proxy, open CNKI, download files, or change configuration. If it reports that the bridge is unavailable, verify `web-access` separately before continuing.

## Workflow

### 1. Prepare Evidence Boundary

Clarify:

- Topic or method keywords.
- Scenario keywords.
- Required source tier: CSSCI, Peking University Core, CSCD, EI, or a combination.
- Year window. Default to recent 3 years; broaden to 5 years only when needed.
- Output folder and whether PDFs, BibTeX, or only a candidate list are required.

If keywords are uncertain, ask before searching. Method and scenario often need a combined query, such as method term plus application domain. If results are too sparse, broaden to the nearest higher-level concept instead of piling on synonyms.

### 2. Verify CDP And Login

Use the Codex `web-access` bridge:

```powershell
node "<CODEX_HOME>\skills\web-access\scripts\check-deps.mjs"
```

Require `proxy: ready`. Then open `https://www.cnki.net/` or use an existing CNKI tab to confirm login and institution status. If not logged in, stop.

### 3. Search By URL First

Prefer URL navigation over GUI search whenever possible:

```text
https://kns.cnki.net/kns8s/defaultresult/index?crossids=YSTT4HG0&korder=SU&kw=<encoded-keyword>
```

Use `crossids=YSTT4HG0` for academic journals and `korder=SU` for subject search. Change keywords by rebuilding `kw=` and navigating again. Avoid typing into the result-page search box; prior runs found it unreliable.

Use homepage `#txt_SearchText` only when URL search fails or a fresh site-generated result URL is needed. Inject Chinese through `decodeURIComponent("%XX...")`; keep `/eval` bodies ASCII-only.

### 4. Apply Source-Tier Filters

Source type filters are not reliably URL-encoded. Use the `LYBSM` facet checkboxes only after the academic journal range is loaded.

Default sequence:

1. CSSCI.
2. Add Peking University Core if count is too low or topic fit is poor.
3. Add CSCD if still too low.
4. Add EI only when appropriate for the discipline and still too sparse.

After each checkbox click, wait for the result count to stabilize before touching the next checkbox. A stale count or disappearing checkbox usually means the AJAX refresh was not done, not that the filter failed.

### 5. Rank Candidates Before Download

Use the first page at 50 results when possible; expand to 100 only if needed. Sort by downloads descending by default, and use citation count as a cross-check.

Screen candidates by:

- Source tier and journal quality.
- Year/date fit.
- Download and citation strength.
- Title and abstract relevance.
- Whether the method and scenario look comparable to the user objective.

Do not treat high downloads, high citations, or a matching title as proof of method fit.

### 6. Download Only Plausible Full Texts

CNKI PDF/CAJ download must go through an article detail page:

- Verify the detail title with `document.title` or `.wx-tit`; do not rely on `h1`.
- Use `/download` selector mode with `a#pdfDown` or `a#cajDown`.
- Do not top-level navigate to `bar.cnki.net` direct download links.
- Verify PDF files by checking the first bytes equal `%PDF`.

### 7. Full-Text Verification

Read the core model or method sections before recommending the paper. Verify:

- The method is actually comparable, not just keyword-adjacent.
- The actors, variables, scenario, and assumptions match the user's use case closely enough.
- The conclusion or limitations do not explicitly rule out the intended use.

Typical failure: a paper title or abstract includes "third party", but the full model is only a two-party game and the third party is an exogenous parameter.

### 8. Report

Report each downloaded or rejected candidate with:

- Title, authors, journal/source, year, source tier.
- Downloads/citations when captured.
- PDF path and header verification.
- Fit judgment: primary reference, supporting reference, background only, or reject.
- Short reason tied to method and scenario fit.

## When To Load Detailed Reference

Read `references/cnki-site-pattern.md` before live CNKI work, when selectors fail, when downloads fail, or when deciding whether to broaden filters. The reference contains URL patterns, facet codes, selectors, and known traps.
