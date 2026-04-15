#!/usr/bin/env node
/**
 * 博客发布工具 — 将 Markdown 文章发布到博客网站
 * 用法: node publish.js --file "文章.md" [--cover "封面.png"] [--publish]
 *
 * 特性：
 * - 封面图通过 OSS 直传（签名 → 上传 OSS → 记录）
 * - SEO 信息由 agent 在调用前生成，通过参数传入
 * - 零依赖，只用 Node.js 内置模块
 */

const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

const SCRIPT_DIR = __dirname;
const CONFIG_PATH = path.join(SCRIPT_DIR, "config.json");

// ─── 工具函数 ───

function loadConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
}

function getApiKey(config) {
  const envName = config.api_key_env || "BLOG_API_KEY";
  return process.env[envName] || config.api_key || "";
}

function request(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const mod = u.protocol === "https:" ? https : http;
    const req = mod.request(u, {
      method: opts.method || "GET",
      headers: opts.headers || {},
      timeout: 30000,
    }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const body = Buffer.concat(chunks).toString();
        if (res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 500)}`));
        } else {
          try { resolve(JSON.parse(body)); }
          catch { resolve(body); }
        }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("请求超时")); });
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

/**
 * 通过 FormData 上传文件到 OSS（Node.js 原生实现）
 */
function uploadToOss(host, formFields, filePath, fileBuffer) {
  return new Promise((resolve, reject) => {
    const boundary = "----OssBoundary" + Date.now().toString(36);
    const fileName = path.basename(filePath);
    const ext = path.extname(fileName).toLowerCase();
    const mimeMap = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif" };
    const mime = mimeMap[ext] || "application/octet-stream";

    const parts = [];
    for (const [k, v] of Object.entries(formFields)) {
      parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`);
    }
    const fileHeader = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: ${mime}\r\n\r\n`;
    const fileTail = `\r\n--${boundary}--\r\n`;

    const bodyParts = Buffer.concat([
      Buffer.from(parts.join("")),
      Buffer.from(fileHeader),
      fileBuffer,
      Buffer.from(fileTail),
    ]);

    const u = new URL(host);
    const mod = u.protocol === "https:" ? https : http;
    const req = mod.request(u, {
      method: "POST",
      headers: { "Content-Type": `multipart/form-data; boundary=${boundary}`, "Content-Length": bodyParts.length },
      timeout: 60000,
    }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const body = Buffer.concat(chunks).toString();
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(body);
        } else if (res.statusCode === 204) {
          resolve("");
        } else {
          reject(new Error(`OSS upload HTTP ${res.statusCode}: ${body.slice(0, 300)}`));
        }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("OSS 上传超时")); });
    req.write(bodyParts);
    req.end();
  });
}

// ─── 业务函数 ───

const MIME_MAP = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif" };

function parseMarkdown(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : path.basename(filePath, ".md");

  // 正文：跳过第一个 --- 分隔符之前的 frontmatter（如果有）
  const lines = content.split("\n");
  let bodyStart = 0;
  if (lines[0]?.trim() === "---") {
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === "---") { bodyStart = i + 1; break; }
    }
  }
  const body = bodyStart > 0 ? lines.slice(bodyStart).join("\n").trim() : content;

  // 摘要：取正文前 200 字（去掉 Markdown 标记）
  const clean = body.replace(/[#*_\[\]()!>|`~]/g, "").replace(/\n+/g, " ").trim();
  const summary = clean.length > 200 ? clean.slice(0, 200) + "..." : clean;

  // slug
  const slug = title
    .toLowerCase()
    .replace(/[\u4e00-\u9fff]/g, "")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    || `article-${Date.now()}`;

  return { title, content: body, summary, slug };
}

/**
 * OSS 直传封面图：获取签名 → 上传 OSS → 记录到后端
 */
async function uploadCoverViaOss(baseUrl, apiKey, imagePath) {
  const fileName = path.basename(imagePath);
  const ext = path.extname(fileName).toLowerCase();
  const mimeType = MIME_MAP[ext] || "application/octet-stream";
  const fileBuffer = fs.readFileSync(imagePath);
  const fileSize = fileBuffer.length;

  console.log(`🖼️  OSS 直传封面图: ${imagePath} (${(fileSize / 1024).toFixed(1)}KB)`);

  // 1. 获取 OSS 签名
  const signature = await request(`${baseUrl}/oss/signature`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ filename: fileName, mimeType, size: fileSize, category: "image", directory: "articles" }),
  });
  console.log(`  ✅ 签名获取成功: key=${signature.key}`);

  // 2. 构建表单字段并上传到 OSS
  const formFields = {
    key: signature.key,
    policy: signature.policy,
    OSSAccessKeyId: signature.accessKeyId,
    signature: signature.signature,
  };
  if (signature.callback) {
    formFields.callback = signature.callback;
    formFields["x:originalName"] = fileName;
  }

  await uploadToOss(signature.host, formFields, imagePath, fileBuffer);
  console.log(`  ✅ OSS 上传成功`);

  // 3. 无回调时，前端主动记录
  if (!signature.callback) {
    await request(`${baseUrl}/admin/media/oss-record`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        object: signature.key,
        originalName: fileName,
        mimeType,
        size: fileSize,
        url: signature.url,
        alt: "封面图",
      }),
    });
    console.log(`  ✅ 媒体记录已写入`);
  }

  console.log(`✅ 封面图地址: ${signature.url}`);
  return signature.url;
}

async function createArticle(baseUrl, apiKey, data) {
  return request(`${baseUrl}/admin/articles`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

async function publishArticle(baseUrl, apiKey, articleId) {
  return request(`${baseUrl}/admin/articles/${articleId}/publish`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

// ─── 主流程 ───

async function main() {
  const args = process.argv.slice(2);
  const getArg = (name) => { const i = args.indexOf(name); return i >= 0 && i + 1 < args.length ? args[i + 1] : ""; };
  const hasFlag = (name) => args.includes(name);

  const file = getArg("--file");
  const cover = getArg("--cover");
  const doPublish = !hasFlag("--no-publish"); // 默认发布，加 --no-publish 只创建草稿
  const category = getArg("--category");
  const tags = getArg("--tags");
  const seoTitle = getArg("--seo-title");
  const seoDescription = getArg("--seo-description");
  const summary = getArg("--summary");

  if (!file) { console.error("用法: node publish.js --file \"文章.md\" [--cover \"封面.png\"] [--no-publish] [--seo-title \"...\"] [--seo-description \"...\"] [--summary \"...\"]"); process.exit(1); }
  if (!fs.existsSync(file)) { console.error(`❌ 文件不存在: ${file}`); process.exit(1); }

  const config = loadConfig();
  const baseUrl = config.base_url.replace(/\/+$/, "");
  const apiKey = getApiKey(config);
  if (!apiKey) { console.error("❌ 未找到 API Key，请设置环境变量 BLOG_API_KEY"); process.exit(1); }

  console.log("🔑 API Key 已加载");

  // 上传封面（OSS 直传）
  let coverUrl = "";
  if (cover && fs.existsSync(cover)) {
    coverUrl = await uploadCoverViaOss(baseUrl, apiKey, cover);
  }

  // 解析文章
  console.log(`📄 解析文章: ${file}`);
  const article = parseMarkdown(file);

  // 组装数据 — 尽可能完整
  const articleData = {
    title: article.title,
    slug: article.slug,
    content: article.content,
    summary: summary || article.summary,
  };
  if (coverUrl) articleData.coverImage = coverUrl;
  if (seoTitle) articleData.seoTitle = seoTitle;
  if (seoDescription) articleData.seoDescription = seoDescription;
  if (category || config.default_category_id) articleData.categoryId = category || config.default_category_id;
  if (tags) articleData.tagIds = tags.split(",").map((t) => t.trim());

  // 创建草稿
  console.log("📝 创建文章草稿...");
  console.log(`  标题: ${articleData.title}`);
  console.log(`  slug: ${articleData.slug}`);
  console.log(`  摘要: ${(articleData.summary || "").slice(0, 60)}...`);
  if (articleData.seoTitle) console.log(`  SEO标题: ${articleData.seoTitle}`);
  if (articleData.seoDescription) console.log(`  SEO描述: ${articleData.seoDescription}`);

  const result = await createArticle(baseUrl, apiKey, articleData);
  const articleId = result.id || "";
  console.log(`✅ 草稿创建成功 | ID: ${articleId}`);

  // 发布
  if (doPublish) {
    console.log("🚀 发布文章...");
    await publishArticle(baseUrl, apiKey, articleId);
    console.log(`✅ 文章已发布 | ID: ${articleId}`);
  } else {
    console.log(`📋 草稿已创建，未发布 | ID: ${articleId}`);
  }

  // 输出结果 JSON
  const output = {
    success: true,
    article_id: articleId,
    title: article.title,
    slug: article.slug,
    published: doPublish,
    cover_url: coverUrl,
    seo_title: articleData.seoTitle || "",
    seo_description: articleData.seoDescription || "",
  };
  console.log(`\n📊 结果: ${JSON.stringify(output)}`);
}

main().catch((e) => { console.error(`❌ 发布失败: ${e.message}`); process.exit(1); });
