# SEO TDK 优化记录

记录文章的标题（Title）/ 描述（Description）/ 关键词（Keywords）优化历史，方便追踪改动和复盘效果。

优化方法见 skill：`.kiro/skills/blog-tdk/SKILL.md`

## 约束速查

| 字段 | 后端字段 | 中文 | 英文 |
|------|---------|------|------|
| 标题 | `seoTitle` | 25-30 字 | 50-60 字符 |
| 描述 | `seoDescription` | 75-80 字 | 150-160 字符 |
| 关键词 | `keywords` | 文章级无独立字段，共用站点默认（Google 已忽略，无影响） |

---

## 优化记录

### 2026-06-01 · agent-memory-architecture-2026

- **URL**：`/en/posts/agent-memory-architecture-2026`（英文版为主，1177 次展示）
- **触发原因**：784 次展示 / 0 点击，典型"有展示无点击"
- **根因**：标题 87 字符被截断；标题和描述都缺少 Search Console 真实查询词 `episodic semantic procedural`、`memory systems`

| 字段 | 改前 | 改后 |
|------|------|------|
| seoTitle | `Agent Memory: The Architecture Decision Defining AI Systems in 2026 \| New Universe Blog`（87 字符，截断） | `AI Agent Memory Architecture 2026: Episodic to Procedural`（57 字符） |
| seoDescription | `Why context overflow breaks AI agents in production, and the four-tier memory architecture that's actually working in 2026.`（122 字符，无真实查询词） | `AI agents forget mid-task when their memory architecture breaks. Learn the four tiers (working, episodic, semantic, procedural) behind production-ready AI agents in 2026, and why context overflow is really an architecture problem.`（158 字符） |

- **核心动作**：标题压到 57 字符 + 植入真实查询词，描述改痛点开头并补全四层记忆词
- **效果观察**：待填（建议 2-4 周后回填 CTR 变化）

### 2026-06-01 · 2026 程序员就业真相

- **URL**：`/zh/posts/2026-cheng-xu-yuan-jiu-ye-zhen-xiang-gang-wei-zai-zhang-dan-ni-de-gang-wei-ke-neng-zai-xiao-shi`
- **触发原因**：新文章发布即优化（非补救）
- **根因**：标题约 44 字超长、描述约 105 字超长，SERP 后半段截断；描述开头浪费在数据源罗列

| 字段 | 改前 | 改后 |
|------|------|------|
| seoTitle | `2026程序员就业真相：岗位+14%但入门级暴跌40%，AI时代开发者生存指南 \| 新宇宙博客`（约 44 字，截断） | `2026程序员就业真相：岗位涨14%，入门级暴跌40%`（24 字） |
| seoDescription | `基于Indeed、BLS、Stanford等权威数据源，深度分析2026年软件开发者就业市场的结构性分化…`（约 105 字，截断，数据源开头） | `岗位涨14%，年轻程序员却在失业。2026软件开发就业正在结构性分化：入门级暴跌40%，AI接管了培训新人的基础任务。本文用20+数据源拆解程序员角色之变，附90天技能升级清单。`（79 字） |

- **核心动作**：标题砍掉超长副标题和品牌后缀保留双数字反差，描述改"岗位涨但年轻人失业"痛点开头
- **效果观察**：待填

---

## 复盘清单（每次优化后做）

1. 改完去 Google Search Console → URL 检查 → 「请求编入索引」加速重新抓取
2. 记录改前 TDK（本文件已存档，可回滚）
3. 2-4 周后回填该文章的展示量 / 点击量 / CTR 变化
4. 若 CTR 不升反降，回滚到改前版本对照
