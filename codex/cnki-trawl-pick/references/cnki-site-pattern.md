# CNKI Site Pattern

Use this reference with a locally installed Codex `web-access` skill.

## Bridge

- Base URL: `http://localhost:3456`
- Use PowerShell `Invoke-WebRequest -UseBasicParsing`.
- Do not use Bash `curl` for this local bridge on this machine.
- Keep `/eval` bodies ASCII-only. Inject Chinese with `decodeURIComponent("%E4%...")`.

## Stable Search Pattern

Academic-journal subject search:

```text
https://kns.cnki.net/kns8s/defaultresult/index?crossids=YSTT4HG0&korder=SU&kw=<url-encoded-keywords>
```

Meaning:

- `crossids=YSTT4HG0`: academic journals.
- `korder=SU`: subject search.
- `kw=`: URL-encoded keyword string.

Prefer rebuilding this URL for keyword changes. Result-page search-box interactions have been unreliable.

Homepage fallback:

```javascript
(function(){
  var kw=decodeURIComponent("%E6%BC%94%E5%8C%96%E5%8D%9A%E5%BC%88");
  var inp=document.querySelector("#txt_SearchText");
  var set=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value").set;
  set.call(inp,kw);
  inp.dispatchEvent(new Event("input",{bubbles:true}));
  inp.focus();
  ["keydown","keypress","keyup"].forEach(function(t){
    inp.dispatchEvent(new KeyboardEvent(t,{key:"Enter",keyCode:13,which:13,bubbles:true}));
  });
  return "ok";
})()
```

## Source-Tier Facets

Source type is usually under:

```text
dt[groupid=LYBSM]
```

Known values:

- Peking University Core: `P01`
- CSSCI: `P0209`
- CSCD: `P0210`
- WJCI: `P12`
- AMI: `P13`
- EI: `P0202`
- SCI: `P0201`

Operational rule: click one checkbox, then wait for `#countPageDiv` to stabilize before clicking another. Multiple source-tier selections behave as an OR union.

Do not confuse source type with document-type chips. Document-type chip removal may not update hidden state reliably; use `crossids=YSTT4HG0` for academic journals instead.

## Candidate Extraction

Common result row selectors:

```text
.result-table-list tbody tr
td.name a
input.cbItem
#DFR
#countPageDiv
```

Example row extraction:

```javascript
(function(){
  var rows=[].slice.call(document.querySelectorAll(".result-table-list tbody tr")).slice(0,20).map(function(r){
    var tds=[].slice.call(r.querySelectorAll("td"));
    function tx(i){return((tds[i]&&(tds[i].innerText||tds[i].textContent))||"").replace(/\s+/g," ").trim();}
    var a=r.querySelector("td.name a");
    return {
      title:a?((a.innerText||a.textContent||"").replace(/\s+/g," ").trim()):tx(1),
      author:tx(2),
      source:tx(3),
      date:tx(4),
      database:tx(5),
      cite:tx(6),
      download:tx(7),
      href:a?a.href:""
    };
  });
  return JSON.stringify(rows);
})()
```

## BibTeX Export

For batch metadata:

1. Select rows with `.result-table-list tbody tr input.cbItem`.
2. Intercept `HTMLFormElement.prototype.submit` and force `target="_self"`.
3. Click `a[exporttype=BibTex]`.
4. Wait 6-8 seconds.
5. Extract the shortest visible container containing enough `@\w+\{` entries.

This is for screening and citation metadata. It does not replace full-text verification.

## PDF/CAJ Download

Use article detail page selectors:

```text
a#pdfDown
a#cajDown
```

Use bridge selector mode:

```powershell
Invoke-WebRequest -UseBasicParsing -Method Post `
  -Uri "http://localhost:3456/download?target=<detailId>&dir=<output-dir>&timeout=60000" `
  -Body "a#pdfDown"
```

Rules:

- Open a fresh detail page from the current result row.
- Confirm title with `document.title` or `.wx-tit`.
- Do not use `document.querySelector('h1')` for title verification.
- Do not navigate directly to `bar.cnki.net` download links.
- Check the downloaded file header: `%PDF`.

## Known Traps

- Long or expired CNKI detail URLs may fail with `431` or `chrome-error://chromewebdata/`; refresh by exact-title search and open the current result-row link.
- `/clickAt` on a background tab can use stale coordinates. `/download` already brings the tab to front internally.
- Year filters (`#txtStartYear`, `#txtEndYear`, `#btnFilterYear`) live inside a hidden modal (`#modalBox`, `display:none`) with no discoverable click path from the results page (verified 2026-07-01). Forcing the modal open and submitting it corrupted the search state (dropped the academic-journal scope, page showed "暂无数据") both alone and combined with a source-tier filter — the failure is not specific to combining with source-tier filters, do not attempt this control at all. Screen year/date from the result list instead, as already done in the Rank Candidates step.
- If total count remains below 10 after CSSCI, Peking University Core, CSCD, and EI plus a 5-year window, report low recall instead of lowering standards silently.
- If 50 results show almost no method fit, change keywords or broaden to a higher-level concept. Do not expand to 100 as a substitute for relevance.
