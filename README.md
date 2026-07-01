# CNKI Trawl Pick Skill

[English](./README.en.md)

面向 CNKI/知网文献检索、筛选、授权下载与全文相关性核验的 AI Agent Skill。仓库同时提供 Codex 和 Claude Code 两个版本。

## 解决什么痛点

CNKI 的页面状态、登录权限、下载入口、结果筛选和人机验证都比较敏感。研究生自己手动找文献时，常见问题是：

- 关键词换来换去，结果页和筛选条件容易乱。
- 来源类别筛选、时间窗口、下载量排序需要重复点击，耗时且容易漏。
- 高下载量不等于方法贴合，标题像不等于全文真的可用。
- 批量打开详情页、确认 PDF/CAJ 下载入口、核验文件是否下载成功，会消耗大量时间和精力。
- 不规范的自动化操作容易触发更多验证，最后反而比手动更慢。

这个 skill 的目标不是绕过 CNKI，而是把“研究生查知网文献”的人工流程标准化：通过本机浏览器 CDP 桥接，在用户已经登录且有合法下载权限的前提下，尽量使用稳定 URL、真实页面点击和明确的 STOP 规则，减少重复劳动、降低误操作和无效尝试，让你把精力放回论文判断本身。

## 前置条件

必须先具备可用的浏览器/CDP 访问方式，否则这个 skill 不能独立工作。

最低要求：

- 本机 Chrome 或兼容浏览器已经登录 CNKI。
- 当前账号或机构对目标文献有访问/下载权限。
- 已安装并启动可用的 web-access/CDP bridge。
- CDP bridge 至少支持 `/targets`、`/new`、`/eval`、`/download`、`/close` 这类接口。

Codex 版默认配合本机 `web-access` skill 使用。你可以通过环境变量指定路径：

```powershell
$env:CODEX_HOME = "$env:USERPROFILE\.codex"
$env:WEB_ACCESS_ROOT = "$env:CODEX_HOME\skills\web-access"
$env:CDP_BRIDGE = "http://127.0.0.1:3456"
```

检测：

```powershell
node ".\codex\cnki-trawl-pick\scripts\detect.mjs"
node ".\codex\cnki-trawl-pick\scripts\detect.mjs" --bridge
```

## 合规边界

这个仓库不包含，也不提供：

- CNKI 账号、Cookie、浏览器 Profile 或机构凭证。
- 已下载的 CNKI 论文 PDF/CAJ。
- 验证码破解、权限绕过、付费墙绕过或反爬对抗代码。
- 任何规避 CNKI 访问控制的能力。

第 0 步永远是检查右上角登录状态。没有登录、没有机构权限、没有全文下载权限，或者页面出现需要用户处理的人机验证时，流程必须 STOP，由用户在浏览器里完成登录、授权或验证。

## 两个版本

```text
codex/cnki-trawl-pick/
  SKILL.md
  agents/openai.yaml
  references/
  scripts/

claude/cnki-trawl-pick/
  SKILL.md
```

- Codex 版：包含 OpenAI/Codex skill 元数据、CNKI 页面模式参考和只读检测脚本。
- Claude Code 版：保留同一套 CNKI 文献检索和精筛 SOP，适配 Claude skill 文件结构。

## 安装

先克隆或下载本仓库，然后复制对应版本到你的本地 skills 目录。

Codex:

```powershell
Copy-Item -Recurse ".\codex\cnki-trawl-pick" "$env:CODEX_HOME\skills\cnki-trawl-pick"
```

如果没有设置 `CODEX_HOME`，请复制到你本机 Codex 实际读取的 skills 目录。

Claude Code:

```powershell
Copy-Item -Recurse ".\claude\cnki-trawl-pick" "$env:USERPROFILE\.claude\skills\cnki-trawl-pick"
```

## 标准流程

### Step 0: 登录与权限检查

打开 CNKI 首页或结果页，查看右上角登录状态。必须确认用户已登录，且当前账号或机构具备目标文献下载权限。没有权限就停止，不继续做无效检索或下载尝试。

### Step 1: 确定检索边界

根据导师或课题要求明确：

- 主题关键词，例如“新能源动力电池”“动力电池回收”。
- 方法关键词，例如“三方演化博弈”“演化博弈”“闭环供应链博弈”。
- 时间窗口，例如“近三年”“2026 年至今”“2020-2026”。
- 来源层次，例如 CSSCI、北大核心、CSCD、EI。
- 是否需要下载 PDF/CAJ，还是只要候选清单。

### Step 2: URL 优先检索

优先构造 CNKI 结果页 URL，而不是反复在结果页搜索框里手动输入。默认使用学术期刊范围：

```text
https://kns.cnki.net/kns8s/defaultresult/index?crossids=YSTT4HG0&korder=SU&kw=<encoded-keywords>
```

这样能减少不稳定 GUI 操作，让检索条件更可复现。

### Step 3: 来源层次递进筛选

按论文层次要求逐步筛选：

1. CSSCI。
2. 北大核心。
3. CSCD。
4. EI 或其他学科相关来源。

每次点击一个来源筛选后，都要等待结果数量稳定，再进行下一步。不要在 AJAX 刷新中连续乱点。

### Step 4: 下载量排序与候选筛选

默认按下载量降序排序，用引用量做交叉参考。候选筛选不只看下载量，还要看：

- 年份是否符合要求。
- 来源层次是否符合导师要求。
- 标题和摘要是否真的贴近课题。
- 方法是否可能可比。
- 场景是否是动力电池、回收、闭环供应链或指定研究对象。

### Step 5: 详情页下载

CNKI 下载必须进入单篇详情页。流程会优先确认详情页标题，再使用页面内下载按钮：

- 优先 `a#pdfDown`。
- PDF 不可用且用户允许时，才尝试 `a#cajDown`。
- 不直接跳转 CNKI 下载直链。
- 下载后检查 PDF 文件头是否为 `%PDF`。

### Step 6: 全文核验

下载不等于可用。必须阅读模型构建、主体设置、复制动态方程、均衡分析、仿真和结论部分，确认：

- 是否真的是用户需要的方法。
- “三方”是否真的是内生决策主体，而不是外生参数。
- 变量、主体和场景是否能迁移到用户课题。
- 作者结论或局限是否说明该文不能作为主参考。

### Step 7: 输出报告

最终输出应包括：

- 下载文献清单。
- 来源、年份、下载量、引用量。
- PDF 路径和文件校验结果。
- 适配判断：主参考、辅助参考、背景材料或剔除。
- 为什么适合或不适合。

## 亮点

- URL 优先：减少结果页搜索框失效、误触发和不可复现问题。
- 来源层次可控：适配导师对 CSSCI、北大核心、CSCD、EI 的不同要求。
- 时间窗口可控：支持近三年、五年、指定年份到现在等要求。
- 下载前先筛：避免把一堆标题相似但方法不贴合的论文全部下载。
- 下载后核验：要求读全文关键方法部分，避免“标题党式选文献”。
- 明确 STOP 规则：登录、权限、验证码、下载失败达到重试上限时停止，不硬冲。
- 双版本：同时支持 Codex 和 Claude Code。

## 使用示例

```text
使用 cnki-trawl-pick 检索 CNKI 上关于"动力电池回收"和"三方演化博弈"的论文，限定 2026 年至今，按下载量排序，下载有权限的 PDF，并核验方法是否贴合。
```

```text
使用 cnki-trawl-pick 查找近期 CSSCI 或北大核心中与"新能源动力电池"和"演化博弈"相关的论文，并将其分类为主参考、辅助参考或背景材料。
```

## 局限性

- 依赖本机可用的浏览器/CDP 桥接，桥接不可用时无法独立工作。
- 不能替代 CNKI 的访问权限，没有权限就无法下载全文。
- 不会绕过验证码或登录，遇到即停止并交给用户处理。
- 不保证在非常窄的年份/主题/来源层次组合下，CNKI 一定有足够数量的论文。
- 严格条件下候选数量过少时，应停止并询问用户是否放宽条件，而不是静默降低标准。

## 许可 License

本仓库不使用 MIT/Apache 等开源许可证。默认允许查看、克隆、下载并用于个人学习/评估用途；**修改、二次分发或用于其他已发布的项目/产品，需事先获得作者书面同意**。完整条款见 [LICENSE](./LICENSE)。
