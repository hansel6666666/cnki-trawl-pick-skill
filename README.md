# CNKI Trawl Pick Skill

Two AI-agent skill variants for CNKI literature trawling and precision paper selection:

- `codex/cnki-trawl-pick`: Codex skill format, including `agents/openai.yaml`, references, and a read-only detector script.
- `claude/cnki-trawl-pick`: Claude skill format with the same core workflow.

## What It Does

The skill helps an agent search CNKI by topic or method, apply source-tier filters such as CSSCI, Peking University Core, CSCD, or EI, rank candidate papers, download authorized full text through the user's existing browser/CDP bridge, and verify method or scenario relevance from the full text.

## Compliance Boundary

Use this only with the user's lawful CNKI login or institutional authorization.

This repository does not include CNKI credentials, cookies, browser profiles, downloaded papers, captcha solving, paywall bypass, or any access-control circumvention. The skill tells the agent to stop when login, permission, or verification blocks access.

## Install

Clone or download this repository first, then copy the matching skill folder into your local agent skills directory.

Codex:

```powershell
Copy-Item -Recurse ".\codex\cnki-trawl-pick" "$env:CODEX_HOME\skills\cnki-trawl-pick"
```

If `CODEX_HOME` is not set, use the local Codex skills directory for your installation.

Claude:

```powershell
Copy-Item -Recurse ".\claude\cnki-trawl-pick" "$env:USERPROFILE\.claude\skills\cnki-trawl-pick"
```

## Dependencies

The skill expects an existing browser-backed web-access/CDP bridge compatible with endpoints such as `/targets`, `/new`, `/eval`, `/download`, and `/close`.

For the Codex detector, optional environment variables:

```powershell
$env:CODEX_HOME = "$env:USERPROFILE\.codex"
$env:WEB_ACCESS_ROOT = "$env:CODEX_HOME\skills\web-access"
$env:CDP_BRIDGE = "http://127.0.0.1:3456"
```

Run:

```powershell
node ".\codex\cnki-trawl-pick\scripts\detect.mjs"
node ".\codex\cnki-trawl-pick\scripts\detect.mjs" --bridge
```

## Quick Start

Example requests after installation:

```text
Use cnki-trawl-pick to search CNKI for papers about "动力电池回收" and "演化博弈", then screen recent high-relevance papers.
```

```text
Use cnki-trawl-pick to find CSSCI or Peking University Core papers related to my topic, download authorized PDFs, and verify method fit from the full text.
```

## Repository Layout

```text
codex/cnki-trawl-pick/
  SKILL.md
  agents/openai.yaml
  references/
  scripts/

claude/cnki-trawl-pick/
  SKILL.md
```

## Limitations

- Requires the user's own CNKI login or institutional access.
- Does not solve captchas or bypass permissions.
- Does not include downloaded CNKI papers.
- Download behavior depends on the local browser/CDP bridge and CNKI page state.
