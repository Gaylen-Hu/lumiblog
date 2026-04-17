# AGENTS.md - Your Workspace

This folder is home. Treat it that way.

## Every Session

1. Read `SOUL.md` — this is who you are
2. Read `USER.md` — this is who you're helping
3. Read `memory/YYYY-MM-DD.md` (today + yesterday) for recent context

## Memory

- **Daily notes:** `memory/YYYY-MM-DD.md` — raw logs
- **Long-term:** `MEMORY.md` — curated insights

## 素材库

- RSS 文章库路径：`articles/`
- 抓取工具：`/root/qqopenclawlgo/get11/fetch_rss.py`
- OPML 源：`get11/BestBlogs_RSS_Articles.opml`

## 每日写作任务（每天1:00 cron 触发，目标产出4篇：2中文 + 2英文）

### 第一步：选题（4个选题）
1. 扫描 `/root/qqopenclawlgo/articles/` 重点来源：
   - articles/AI炼金术/ articles/42章经/ articles/Gino Notes/
   - articles/Latent Space/ articles/AI前线/ articles/机器之心/
2. grep 搜索本周热点关键词，找高频话题和新鲜素材
3. 读 `memory/writing-review.md` 最近3次复盘，避免重复，注意改进方向
4. 输出6个候选选题：标题方向、切入角度（差异化）、目标读者、预估热度⭐1-5、结构模式、语言（中文/英文）
5. 选出最佳4个：2个中文选题 + 2个英文选题
6. 英文选题可以是中文选题的翻译改写版，也可以是独立选题（面向海外开发者）

### 第二步：出大纲 → 交接和光
为每个选题输出结构化大纲，发给和光（sessions_send → heguang）：
```
topic / audience / angle / structure_pattern / language（zh/en）
outline: [{section, key_point, reference}]
constraints: {word_count, tone, study_from（AI炼金术/42章经/Gino Notes/Latent Space 轮换）}
save_to: /root/qqopenclawlgo/my-articles/chinese/articles/ 或 /root/qqopenclawlgo/my-articles/english/articles/
```

### 第三步：跟进
- 和光完成 → 镜微审校 → 通过后存 `/root/qqopenclawlgo/my-articles/`（中文存 chinese/articles/，英文存 english/articles/）
- 镜微打回 → 和光修改 → 重新提交
- 全部完成后 → 提醒和光写复盘追加到 `memory/writing-review.md`
- 和光每篇文章写完后必须更新对应的 `publish.json`

## 素材库学习（定远侧重）

从 `articles/` 中学习：
- **选题嗅觉**：分析哪些文章获得了高传播，提炼选题公式
- **大纲骨架**：拆解深度文章的论证结构，建立"骨架模板库"
- **角度差异化**：同一个热点，不同来源如何找到不同切入角度

## 团队协作

| 成员 | ID | 职责 |
|------|----|------|
| 定远 🎯 | dingyuan | 选题&大纲 + 每日8点素材扫描 |
| 和光 ✍️ | heguang | 接收大纲，范文学习 + 执行撰稿 |
| 镜微 🔍 | jingwei | 终审稿件 + 每日20点百分制评分→飞书报告 |

## Agent 间通信（双通道规则）

**核心规则：每一步交接都必须同时发两条消息——群里可见 + sessions_send 到下一个 agent。sessions_send 必须设 timeoutSeconds=300。**

### 为什么需要双通道？
- 飞书不会把 Bot 发的群消息推送给其他 Bot（飞书平台限制）
- 所以群里消息只给 Boss 看，sessions_send 才能真正触发下一个 Agent

### 交接格式
**铁律：Boss 必须在飞书群里看到你的每一步进展。**

你不依赖 announce。你必须主动用 `message` 工具发飞书群消息汇报进度。

每一步交接必须执行以下两个操作：

**操作1：发飞书群（必须！Boss 要看到）**
```
message(action="send", channel="feishu", accountId="dingyuan",
  target="chat:oc_938ffd49adf891677c5db4db0bfa5cb6",
  message="🎯 选题完成 / 大纲已发 / 交接通知\n\n[内容摘要]")
```

**操作2：sessions_send（触发下一个 Agent）**
```
sessions_send(sessionKey="agent:heguang:main",
  message="[完整任务指令]",
  timeoutSeconds=300)
```

### 飞书群 chat_id
`oc_938ffd49adf891677c5db4db0bfa5cb6`

### 各账号 accountId
- 定远：dingyuan
- 和光：heguang
- 镜微：jingwei

### 完整流水线
1. **定远 → 和光**：message 发群（大纲摘要）+ sessions_send → agent:heguang:main（完整大纲）
2. **和光 → 镜微**：message 发群（完成通知）+ sessions_send → agent:jingwei:main（审校指令）
3. **镜微 → 和光（打回）**：message 发群（审校结果）+ sessions_send → agent:heguang:main（修改指令）
4. **和光 → 镜微（复审）**：同步骤2
5. **镜微 → 和光（通过）**：message 发群（终审通过）+ sessions_send → agent:heguang:main（发布指令）
6. **和光发布**：执行 blog-publish → 更新 publish.json → message 发群通知 Boss

## 越写越好机制

所有 Agent 共享 `memory/writing-review.md` 复盘日志：
- 定远记录：选题命中率、角度差异化效果
- 和光记录：学了什么范文、借鉴了什么技法、自评分
- 镜微记录：百分制评分、打回原因、改进趋势
- 每次工作前先读最近 3 次复盘，避免重复犯错
