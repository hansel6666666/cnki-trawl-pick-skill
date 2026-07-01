---
name: cnki-trawl-pick
description: 知网 CNKI 文献撒网精筛流程。用于按主题或方法检索 CNKI 文献，递进筛选 CSSCI、北大核心、CSCD、EI 等来源类别，评估候选论文，借助本机已有 Chrome CDP/web-access 桥下载合法授权范围内的 PDF/CAJ，并从全文核验方法和场景相关性，而不是只依赖标题、摘要、引用量或下载量。
---

# CNKI Trawl Pick

Use this skill when the user needs high-precision CNKI literature harvesting: search broadly enough to find useful papers, narrow by source tier and evidence, download only plausible candidates, then verify full text before recommending use.

This skill is a workflow layer over an existing browser/CDP web-access skill. It does not provide browser infrastructure, credentials, account access, captcha solving, or authorization bypass.

## Guardrails

- Use only with the user's lawful CNKI login or institutional authorization.
- Do not bypass captcha, paywalls, permission checks, rate limits, or access controls.
- Do not modify browser, proxy, extension, or system network configuration.
- Stop if CNKI is not logged in, if full text permission is unavailable, or if verification/captcha blocks access.
- Prefer URL navigation over fragile GUI search-box interactions.
- Open and close only task-created tabs; do not close user tabs.
- Apply a 3-try cap to unstable filters, page turns, or downloads.

## Dependencies

Require an existing web-access/CDP bridge with endpoints equivalent to:

```text
/targets
/new?url=<encoded-url>
/eval?target=<target-id>
/download?target=<target-id>&dir=<output-dir>&timeout=60000
/close?target=<target-id>
```

Use the local `web-access` skill's API reference and CNKI site-pattern reference when available. Do not hard-code a specific user profile path.

## Workflow

### 1. Define The Search Boundary

Clarify:

- Topic keywords.
- Method keywords.
- Scenario keywords.
- Required source tier.
- Year window.
- Output folder and whether to download PDF/CAJ or only list candidates.

If the keyword intersection is too narrow, broaden to the nearest higher-level concept instead of silently lowering the quality or year requirement.

### 2. Verify CNKI Login

Open CNKI homepage or an existing CNKI results page and confirm that the user is logged in or institutionally authorized. If login or permission is absent, stop and ask the user to complete login in their browser.

### 3. Search By URL First

Prefer academic-journal subject search URLs:

```text
https://kns.cnki.net/kns8s/defaultresult/index?crossids=YSTT4HG0&korder=SU&kw=<encoded-keywords>
```

Meaning:

- `crossids=YSTT4HG0`: academic journals.
- `korder=SU`: subject search.
- `kw=`: URL-encoded keywords.

Avoid retyping keywords into the result-page search box. Prior runs found it unreliable. If JavaScript injection is needed, keep eval bodies ASCII-only and inject Chinese with `decodeURIComponent`.

### 4. Apply Source-Tier Filters

Use source type facets under `LYBSM` only after the academic-journal results page loads.

Common values:

- 北大核心: `P01`
- CSSCI: `P0209`
- CSCD: `P0210`
- EI: `P0202`
- SCI: `P0201`
- WJCI: `P12`
- AMI: `P13`

Default sequence:

1. CSSCI.
2. Add 北大核心 if recall is too low.
3. Add CSCD if still too low.
4. Add EI only when appropriate.

After each checkbox click, wait for the result count to stabilize before touching the next filter.

### 5. Rank Candidates

Sort by downloads descending by default and use citations as a cross-check. Screen by:

- Year/date fit.
- Source tier.
- Download/citation strength.
- Title and abstract relevance.
- Whether the method and scenario look comparable to the user's objective.

High downloads or a matching title are not proof of method fit.

### 6. Download Only Plausible Full Texts

CNKI full-text download should go through an article detail page:

- Confirm the detail title with `document.title` or `.wx-tit`.
- Prefer selector download with `a#pdfDown`.
- Fall back to `a#cajDown` only when PDF is unavailable and CAJ is acceptable.
- Do not navigate directly to `bar.cnki.net` download URLs.
- Verify downloaded PDFs by checking the first bytes equal `%PDF`.

### 7. Verify Full Text

Read the model/method sections before recommending a paper. Confirm:

- The paper actually uses a comparable method.
- The actors, variables, scenario, and assumptions match closely enough.
- The third party is endogenous if the user needs a true three-party evolutionary game, not merely an exogenous parameter.
- The conclusion or limitations do not rule out the intended use.

### 8. Report

For each downloaded or rejected candidate, report:

- Title, authors, source, year, source tier if captured.
- Downloads/citations if captured.
- Download path and file validation result.
- Fit judgment: primary reference, supporting reference, background only, or reject.
- Short reason tied to method and scenario fit.

