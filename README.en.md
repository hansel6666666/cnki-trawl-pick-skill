# CNKI Trawl Pick Skill

[中文](./README.md)

An AI agent skill for CNKI (China National Knowledge Infrastructure) literature search, screening, authorized download, and full-text relevance verification. This repository ships two versions: Codex and Claude Code.

## What Problem This Solves

CNKI's page state, login permissions, download entry points, result filtering, and human verification are all fairly sensitive. When graduate students search for literature manually, common issues include:

- Keywords keep changing, and the results page/filter state becomes messy.
- Source-tier filters, year windows, and download-count sorting require repetitive clicking, which is slow and error-prone.
- High download counts do not mean the method fits, and a matching title does not mean the full text is actually usable.
- Opening detail pages in bulk, confirming the PDF/CAJ download entry, and verifying that files actually downloaded takes a lot of time and effort.
- Sloppy automated operations tend to trigger more verification challenges, ending up slower than doing it manually.

This skill's goal is not to bypass CNKI, but to standardize the manual workflow of "graduate student searching CNKI for literature": through a local browser CDP bridge, on the premise that the user is already logged in with legitimate download rights, it favors stable URLs, real page clicks, and explicit STOP rules — reducing repetitive labor, cutting down on mistaken or wasted attempts, and letting you focus your energy back on judging the papers themselves.

## Prerequisites

A working browser/CDP access method is required; without it, this skill cannot function on its own.

Minimum requirements:

- A local Chrome or compatible browser is already logged into CNKI.
- The current account or institution has access/download rights to the target literature.
- A working `web-access`/CDP bridge is installed and running.
- The CDP bridge supports at least `/targets`, `/new`, `/eval`, `/download`, `/close` endpoints.

The Codex version defaults to working alongside the local `web-access` skill. You can point to it via environment variables:

```powershell
$env:CODEX_HOME = "$env:USERPROFILE\.codex"
$env:WEB_ACCESS_ROOT = "$env:CODEX_HOME\skills\web-access"
$env:CDP_BRIDGE = "http://127.0.0.1:3456"
```

Detection:

```powershell
node ".\codex\cnki-trawl-pick\scripts\detect.mjs"
node ".\codex\cnki-trawl-pick\scripts\detect.mjs" --bridge
```

## Compliance Boundaries

This repository does not include and does not provide:

- CNKI accounts, cookies, browser profiles, or institutional credentials.
- Already-downloaded CNKI paper PDFs/CAJs.
- Captcha-cracking, permission-bypass, paywall-bypass, or anti-scraping evasion code.
- Any capability to circumvent CNKI's access controls.

Step 0 is always checking the login status in the top-right corner. If the user is not logged in, has no institutional authorization, has no full-text download permission, or the page shows a human-verification challenge, the workflow must STOP and let the user complete login, authorization, or verification in their own browser.

## Two Versions

```text
codex/cnki-trawl-pick/
  SKILL.md
  agents/openai.yaml
  references/
  scripts/

claude/cnki-trawl-pick/
  SKILL.md
```

- Codex version: includes OpenAI/Codex skill metadata, CNKI page-pattern references, and a read-only detection script.
- Claude Code version: keeps the same CNKI literature search and precision-screening SOP, adapted to the Claude skill file structure.

## Installation

Clone or download this repository first, then copy the version you need into your local skills directory.

Codex:

```powershell
Copy-Item -Recurse ".\codex\cnki-trawl-pick" "$env:CODEX_HOME\skills\cnki-trawl-pick"
```

If `CODEX_HOME` is not set, copy it to whichever skills directory Codex actually reads on your machine.

Claude Code:

```powershell
Copy-Item -Recurse ".\claude\cnki-trawl-pick" "$env:USERPROFILE\.claude\skills\cnki-trawl-pick"
```

## Standard Workflow

### Step 0: Define The Search Boundary

Clarify, based on the advisor's or project's requirements:

- Topic keywords, e.g. "new energy power battery," "power battery recycling."
- Method keywords, e.g. "three-party evolutionary game," "evolutionary game," "closed-loop supply chain game."
- Year window, e.g. "recent 3 years," "2026 to present," "2020-2026."
- Source tier, e.g. CSSCI, Peking University Core, CSCD, EI.
- Whether PDFs/CAJs need to be downloaded, or only a candidate list is needed.

### Step 1: Login And Permission Check

Open the CNKI homepage or a results page and check the login status in the top-right corner. You must confirm the user is logged in and that the current account or institution has download rights to the target literature. If there is no permission, stop — do not continue with search or download attempts that will not pay off.

### Step 2: Search By URL First

Prefer constructing a CNKI results-page URL over repeatedly typing into the results-page search box. Defaults to the academic journal scope:

```text
https://kns.cnki.net/kns8s/defaultresult/index?crossids=YSTT4HG0&korder=SU&kw=<encoded-keywords>
```

This reduces unstable GUI operations and makes the search conditions more reproducible.

### Step 3: Progressive Source-Tier Filtering

Filter step by step according to the required paper tier:

1. CSSCI.
2. Peking University Core.
3. CSCD.
4. EI or other discipline-relevant sources.

After clicking each source-tier filter, wait for the result count to stabilize before moving to the next step. Do not click repeatedly while an AJAX refresh is in progress.

### Step 4: Download-Count Ranking And Candidate Screening

Sort by download count descending by default, and use citation count as a cross-check. Candidate screening looks beyond download count alone, also considering:

- Whether the year fits the requirement.
- Whether the source tier meets the advisor's requirement.
- Whether the title and abstract are actually close to the topic.
- Whether the method is plausibly comparable.
- Whether the scenario matches — power battery, recycling, closed-loop supply chain, or the specified research object.

### Step 5: Download From The Detail Page

CNKI downloads must go through the individual article's detail page. The workflow first confirms the detail-page title, then uses the in-page download button:

- Prefer `a#pdfDown`.
- Only try `a#cajDown` when PDF is unavailable and the user allows it.
- Do not navigate directly to CNKI's raw download links.
- After downloading, check whether the PDF file header is `%PDF`.

### Step 6: Full-Text Verification

Downloading does not mean usable. You must read the core model/method sections — which sections these are depends on the paper's methodology; for example, an evolutionary-game paper typically has model construction, actor setup, replicator dynamics equations, equilibrium analysis, and simulation — to confirm:

- Whether this is actually the method the user needs, not just keyword-adjacent.
- If the topic genuinely calls for a three-party evolutionary game, whether the "third party" is a real endogenous decision-making actor, not an exogenous parameter.
- Whether the variables, actors, and scenario can transfer to the user's topic.
- Whether the author's conclusions or limitations indicate the paper cannot serve as a primary reference.

### Step 7: Output Report

The final output should include:

- The list of downloaded literature.
- Source, year, download count, citation count.
- PDF path and file-verification result.
- Fit judgment: primary reference, supporting reference, background material, or reject.
- Why it fits or does not fit.

## Highlights

- URL-first: reduces search-box failures, misfires, and non-reproducible results.
- Controllable source tier: adapts to different advisor requirements for CSSCI, Peking University Core, CSCD, EI.
- Best-effort year matching: CNKI's year-filter control is unreliable in practice (testing showed it can corrupt the search state), so the workflow screens years from the candidate list instead of fighting the UI year filter.
- Screen before download: avoids downloading a pile of similarly-titled but method-mismatched papers.
- Verify after download: requires reading the key method sections of the full text, avoiding "picking papers by title alone."
- Explicit STOP rules: stops instead of forcing through when login, permission, captcha, or download failures hit the retry cap.
- Two versions: supports both Codex and Claude Code.

## Usage Examples

```text
Use cnki-trawl-pick to search CNKI for papers about "power battery recycling" and "three-party evolutionary game," limit to 2026-present, sort by downloads, download authorized PDFs, and verify method fit.
```

```text
Use cnki-trawl-pick to find recent CSSCI or Peking University Core papers related to "new energy power battery" and "evolutionary game," then classify them as primary reference, supporting reference, or background only.
```

## Limitations

- It depends on a working local browser/CDP bridge.
- It does not replace CNKI access rights.
- It does not bypass captcha or login.
- It does not guarantee that CNKI has enough papers for a very narrow year/topic/source-tier combination.
- It should stop and ask whether to broaden the search when strict conditions produce too few candidates.

## License

This repository does not use a permissive open-source license such as MIT/Apache. Viewing, cloning, and downloading for personal learning/evaluation purposes is allowed by default; **modification, redistribution, or use in another published project/product requires the author's prior written consent.** See [LICENSE](./LICENSE) for the full terms.
