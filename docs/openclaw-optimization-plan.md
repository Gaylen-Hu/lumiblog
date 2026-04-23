# OpenClaw 三 Agent 飞书工作流优化方案

## 一、当前问题诊断

### 1.1 核心症状

| 问题 | 证据 | 严重程度 |
|------|------|----------|
| Cron 任务连续超时 | `每日文章抓取` consecutiveErrors: 7, `每日写作任务` consecutiveErrors: 6 | 🔴 致命 |
| 上下文 200k 容易爆 | 镜微已有 `context-overflow-prevention.md` 记录 | 🔴 致命 |
| 镜微 bot 400 错误 | delivery-queue/failed 中多条 400 错误 | 🔴 致命 |
| 工作流不稳定 | agent 间交接依赖 `sessions_send`，超时后链条断裂 | 🟡 严重 |
| 服务器性能差 | 低配服务器跑 3 agent + browser + 多插件 | 🟡 严重 |

### 1.2 根因分析

**上下文爆炸的原因：**
- 每个 agent 的 workspace 文件太多：IDENTITY.md + SOUL.md + HEARTBEAT.md + TOOLS.md + USER.md + AGENTS.md = 6 个系统文件
- 共享 workspace 有 19 个 skills（每个 skill 有 SKILL.md），全部加载到上下文
- HEARTBEAT.md 里嵌入了大量指令（飞书 chat_id、完整流程描述）
- Cron payload 里又重复写了一遍完整流程指令
- collaboration.json 定义了完整的协作协议，每次会话都加载
- agent.json 里的 system_prompt 和 IDENTITY.md/SOUL.md 内容高度重复

**工作流不稳定的原因：**
- Cron 任务 `每日写作任务` 的 payload 把整个流水线塞进一条消息，期望单次执行完成 选题→撰稿→审校→归档
- `sessions_send` 跨 agent 调用 timeoutSeconds=300（5分钟），写一篇文章远不够
- 定远的 cron 同时触发 2 篇文章，并行压力翻倍
- 没有重试机制，一环断全链断

**镜微 400 错误的原因：**
- 飞书 API 调用参数错误（可能是消息体过长、格式不对、或 token 过期）
- delivery-queue 重试 5 次后放弃，错误堆积

**服务器性能问题：**
- 启用了 browser（Playwright Chromium），即使 `enabled: false` 在 agent defaults 里，全局 browser 配置仍然 `enabled: true`
- 安装了 7 个插件（ddingtalk、wecom、yuanbao、weixin、lightclawbot、adp-openclaw、memory-tencentdb），但只用飞书
- qqbot 插件 enabled 但你说只用飞书
- memory-tdai 有向量数据库 vectors.db，持续占用内存

---

## 二、优化方案

### 2.1 精简插件和渠道（立即执行）

只保留飞书，关掉所有不用的东西：

```json
// openclaw.json → plugins.entries 修改为：
{
  "browser": { "enabled": false },
  "feishu": { "enabled": true },
  "minimax": { "enabled": true },
  "ddingtalk": { "enabled": false },
  "wecom": { "enabled": false },
  "openclaw-plugin-yuanbao": { "enabled": false },
  "openclaw-weixin": { "enabled": false },
  "lightclawbot": { "enabled": false },
  "adp-openclaw": { "enabled": false },
  "memory-tencentdb": { "enabled": false },
  "qqbot": { "enabled": false }
}
```

```json
// openclaw.json → channels 修改为：
{
  "feishu": {
    "enabled": true,
    "defaultAccount": "dingyuan",
    "accounts": {
      "dingyuan": {
        "appId": "cli_a952c58ad839dbdd",
        "appSecret": "gx5P1NFpOr70EvkW592fX82f00rdcBKt",
        "groupPolicy": "open",
        "requireMention": true
      },
      "heguang": {
        "appId": "cli_a95349c72bf85bd3",
        "appSecret": "ALz7rKLJmerITzSoDPOWrcSR2rqejuvr",
        "groupPolicy": "open",
        "requireMention": false
      },
      "jingwei": {
        "appId": "cli_a9523426d538dbcd",
        "appSecret": "InMxoNSnOl3TAckFRKYJMdRyfXDNlA5q",
        "groupPolicy": "open",
        "requireMention": false
      }
    },
    "domain": "feishu",
    "requireMention": true,
    "groupPolicy": "open"
  },
  "qqbot": { "enabled": false }
}
```

```json
// openclaw.json → browser 修改为：
{
  "enabled": false
}
```

**预估节省：** 关闭 Chromium 进程 + 5 个无用插件，内存释放约 200-500MB。

---

### 2.2 精简共享 Skills（立即执行）

当前共享 workspace 有 19 个 skills，大部分和写作工作流无关。只保留核心的：

**保留：**
- `github` — git 操作需要
- `humanizer-zh` — 写作去 AI 味
- `tavily-search` 或 `openclaw-tavily-search`（二选一）— 素材搜索

**删除或禁用：**
- `agent-browser` / `agent-browser-clawdbot` — browser 已关闭
- `find-skills` / `skillhub-preference` — 技能市场管理，不需要常驻
- `obsidian` — 不用 Obsidian
- `tencent-cos-skill` — 如果不用腾讯云 COS
- `tencent-docs` — 如果不用腾讯文档
- `tencent-meeting-skill` — 不需要
- `tencentcloud-lighthouse-skill` — 服务器管理偶尔用，不需要常驻
- `weather` — 写文章不需要天气
- `web-tools-guide` — 指南类，不需要常驻
- `wechat-article-search` / `wechat-toolkit` — 只用飞书
- `summarize` — agent 自己能总结
- `memory-hygiene` — 可以用 cron 替代

```bash
# 在服务器上执行，移动到备份目录
mkdir -p /root/.openclaw/workspace/skills-disabled
for skill in agent-browser agent-browser-clawdbot find-skills obsidian \
  skillhub-preference tencent-cos-skill tencent-docs tencent-meeting-skill \
  tencentcloud-lighthouse-skill weather web-tools-guide wechat-article-search \
  wechat-toolkit summarize memory-hygiene; do
  mv /root/.openclaw/workspace/skills/$skill /root/.openclaw/workspace/skills-disabled/ 2>/dev/null
done
```

**预估节省：** 每个 skill 的 SKILL.md 约 1-5k tokens，15 个 skills ≈ 15k-75k tokens 上下文释放。

---

### 2.3 合并精简 Agent 系统文件（关键优化）

当前每个 agent 有 6 个 workspace 文件，内容大量重复。合并为 2 个：

**之前（6 个文件）：**
```
IDENTITY.md  — 身份定义
SOUL.md      — 价值观和原则
HEARTBEAT.md — 每日任务
TOOLS.md     — 工具配置
USER.md      — 用户信息
AGENTS.md    — 协作信息
```

**之后（2 个文件）：**
```
IDENTITY.md  — 合并身份 + 价值观 + 协作规则（精简版）
HEARTBEAT.md — 精简版每日任务（只保留核心步骤）
```

#### 定远 IDENTITY.md（精简版示例）

```markdown
# 韩镇川（定远）— 选题总编

ENTJ。果断、结构化、拒绝平庸。只推有"技术增量"或"认知差"的选题。

## 职责
- 扫描 articles/ 素材库，输出选题 + 结构化大纲
- 大纲交给和光撰稿，和光完成后交镜微审校

## 飞书
- accountId: dingyuan
- 群 chat_id: oc_938ffd49adf891677c5db4db0bfa5cb6

## 选题标准
- 有技术增量，非入门科普
- 明确目标读者和价值主张
- 30 秒内说清楚为什么值得写

## 记忆
每次开始先读 memory/writing-review.md 最近 3 次复盘。
```

#### 定远 HEARTBEAT.md（精简版示例）

```markdown
# 每日任务

1. 扫描 articles/ 最近新增文章
2. 读 memory/writing-review.md 复盘
3. 输出 2 个选题 + 大纲
4. 飞书群通知 + sessions_send 交给和光

没有待办时回复 HEARTBEAT_OK
```

**对和光、镜微做同样的精简。**

**预估节省：** 每个 agent 从 ~3k tokens 系统文件降到 ~800 tokens，3 个 agent 共省 ~6k tokens。

---

### 2.4 重构 Cron 工作流（核心修复）

当前的 cron 设计有致命问题：一条 cron 消息试图驱动整个 3-agent 流水线，超时是必然的。

**原则：每个 agent 只管自己的一步，用事件驱动串联。**

#### 方案 A：拆分为独立 Cron（推荐）

```json
{
  "jobs": [
    {
      "id": "daily-topic",
      "agentId": "dingyuan",
      "name": "定远-每日选题",
      "enabled": true,
      "schedule": { "kind": "cron", "expr": "0 9 * * *", "tz": "Asia/Shanghai" },
      "sessionTarget": "isolated",
      "payload": {
        "kind": "agentTurn",
        "message": "执行每日选题：扫描 articles/ 最近文章，输出 2 个选题+大纲，通过 sessions_send 发给和光（agent:heguang:main）。飞书群汇报选题。"
      },
      "delivery": { "mode": "none" }
    },
    {
      "id": "daily-rss",
      "name": "每日RSS抓取",
      "enabled": true,
      "schedule": { "kind": "cron", "expr": "0 8 * * *", "tz": "Asia/Shanghai" },
      "sessionTarget": "isolated",
      "payload": {
        "kind": "agentTurn",
        "message": "cd /root/qqopenclawlgo/get11/ && python3 -u fetch_rss.py --days 1 --limit 5 --workers 10 --outdir /root/qqopenclawlgo/articles/ 然后 git add -A && git commit -m 'RSS $(date +%Y-%m-%d)' && git push"
      },
      "delivery": { "mode": "none" }
    }
  ]
}
```

**关键改动：**
- `sessionTarget: "isolated"` — 每次用新 session，避免上下文累积
- 定远只负责选题，不负责驱动整个流水线
- 和光收到 sessions_send 后自行执行撰稿，完成后自行 sessions_send 给镜微
- 每个 agent 的 HEARTBEAT.md 里写清楚收到消息后的处理流程

#### 方案 B：去掉 Cron 自动触发，改为手动/飞书触发

如果服务器性能实在不够，可以改为你在飞书群里 @定远 触发选题，然后流水线自动往下走。这样完全可控。

---

### 2.5 修复镜微 400 错误

400 错误大概率是飞书消息体问题。检查点：

1. **消息长度限制** — 飞书单条消息有长度限制（约 30k 字符），审校报告如果包含完整文章内容会超限
   - 修复：镜微的审校报告只发摘要，完整报告保存到文件

2. **飞书 App Token 过期** — 检查镜微的 appSecret 是否有效
   ```bash
   # 在服务器上测试镜微的飞书连接
   curl -X POST https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal \
     -H "Content-Type: application/json" \
     -d '{"app_id":"cli_a9523426d538dbcd","app_secret":"InMxoNSnOl3TAckFRKYJMdRyfXDNlA5q"}'
   ```

3. **消息格式错误** — 检查是否有特殊字符导致 JSON 解析失败

4. **清理 failed 队列** — 当前有 12 条失败消息堆积
   ```bash
   # 备份后清理
   cp -r /root/.openclaw/delivery-queue/failed /root/.openclaw/delivery-queue/failed-backup-$(date +%Y%m%d)
   rm /root/.openclaw/delivery-queue/failed/*.json
   ```

---

### 2.6 上下文管理策略

#### 2.6.1 Session 隔离

```json
// openclaw.json → session 修改为：
{
  "dmScope": "per-channel-peer",
  "compaction": {
    "mode": "safeguard",
    "maxTokens": 150000
  }
}
```

#### 2.6.2 Agent 级别 compaction

```json
// openclaw.json → agents.defaults 修改为：
{
  "workspace": "/root/.openclaw/workspace",
  "compaction": {
    "mode": "aggressive",
    "maxTokens": 120000
  },
  "sandbox": {
    "browser": { "enabled": false }
  },
  "model": {
    "primary": "minimax/MiniMax-M2.7"
  }
}
```

将 compaction 从 `safeguard` 改为 `aggressive`，在 120k 时就开始压缩，给 80k 的安全余量。

#### 2.6.3 Cron 任务强制 isolated session

所有 cron 任务的 `sessionTarget` 改为 `"isolated"`，每次执行用全新 session，彻底避免上下文累积。

---

### 2.7 模型优化（可选）

当前使用 `MiniMax-M2.7`，如果上下文压力大，可以考虑：

- 简单任务（RSS 抓取、格式化通知）用 `MiniMax-M2.7-highspeed` 或 `MiniMax-M2.5-highspeed`
- 只有写作任务用 M2.7

```json
// 定远可以用更快的模型（选题不需要最强写作能力）
{
  "id": "dingyuan",
  "model": { "primary": "minimax/MiniMax-M2.5" }
}
```

---

## 三、执行清单

### 第一步：立即止血（10 分钟）

- [ ] 关闭 qqbot 插件
- [ ] 关闭 browser
- [ ] 禁用 cron 任务（先停掉，改好再开）
- [ ] 清理 failed delivery queue

### 第二步：精简上下文（30 分钟）

- [ ] 移除 15 个不需要的共享 skills
- [ ] 精简 3 个 agent 的 workspace 文件（合并 6→2）
- [ ] 删除 agent.json 中与 IDENTITY.md 重复的 system_prompt

### 第三步：重构工作流（1 小时）

- [ ] 重写 cron jobs.json，拆分为独立任务
- [ ] 每个 cron 用 `sessionTarget: "isolated"`
- [ ] 修改 compaction 为 aggressive + 120k 阈值
- [ ] 测试定远选题 → 和光撰稿 → 镜微审校的完整链路

### 第四步：修复镜微 400（30 分钟）

- [ ] 测试镜微飞书 token 有效性
- [ ] 检查审校报告消息长度
- [ ] 限制飞书消息最大长度，超长部分截断或分段发送

### 第五步：监控（持续）

- [ ] 完善 context-monitor.sh，加入实际的 session 检查逻辑
- [ ] 添加 cron 监控：连续失败 3 次发飞书告警

---

## 四、优化前后对比

| 指标 | 优化前 | 优化后 |
|------|--------|--------|
| 插件数量 | 9 个（7 个无用） | 2 个（feishu + minimax） |
| 共享 Skills | 19 个 | 4 个 |
| Agent 系统文件 | 6 个/agent | 2 个/agent |
| 上下文基线占用 | ~80-100k tokens | ~20-30k tokens |
| Cron 超时率 | 100%（连续 6-7 次） | 预期 <10% |
| Browser 进程 | 常驻 Chromium | 关闭 |
| Compaction 阈值 | safeguard（被动） | aggressive @ 120k |
| Session 策略 | main（累积） | isolated（每次新建） |
