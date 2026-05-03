/**
 * 微信公众号文章模板引擎
 * 将 Markdown 转换为带 Inline-CSS 的 HTML（高级杂志风格）
 */

// ============ 设计常量 ============

const COLORS = {
  title: '#1a1a1a',
  h2: '#333333',
  h3: '#444444',
  body: '#333333',
  caption: '#999999',
  quote: '#555555',
  quoteBorder: '#333333',
  quoteBg: '#f9f9f9',
  codeBg: '#f6f6f6',
  codeText: '#333333',
  divider: '#333333',
  borderLight: '#f0f0f0',
  footer: '#999999',
  bg: '#ffffff',
} as const;

const TYPOGRAPHY = {
  letterSpacing: '1.5px',
  lineHeight: '1.8',
  title: { fontSize: '22px', fontWeight: '500' },
  h2: { fontSize: '18px' },
  h3: { fontSize: '16px', fontWeight: '600' },
  body: { fontSize: '15px' },
  caption: { fontSize: '12px' },
  code: { fontFamily: 'Menlo, Monaco, monospace', fontSize: '13px' },
} as const;

const SPACING = {
  containerPadding: '40px 20px',
  paragraphBottom: '25px',
  h2Top: '50px',
  h2Bottom: '20px',
  h3Top: '30px',
  imgMargin: '30px 0',
  quoteMargin: '30px 0',
  quotePadding: '20px',
  codePadding: '15px',
  dividerMargin: '60px auto',
  footerTop: '60px',
} as const;

// ============ Inline CSS 样式 ============

const STYLES = {
  container: [
    `padding: ${SPACING.containerPadding}`,
    `background-color: ${COLORS.bg}`,
    `letter-spacing: ${TYPOGRAPHY.letterSpacing}`,
    `line-height: ${TYPOGRAPHY.lineHeight}`,
    `color: ${COLORS.body}`,
    `font-size: ${TYPOGRAPHY.body.fontSize}`,
    'font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
  ].join('; '),

  title: [
    `font-size: ${TYPOGRAPHY.title.fontSize}`,
    `color: ${COLORS.title}`,
    `font-weight: ${TYPOGRAPHY.title.fontWeight}`,
    'margin-bottom: 30px',
    'text-align: center',
    `letter-spacing: ${TYPOGRAPHY.letterSpacing}`,
    `line-height: ${TYPOGRAPHY.lineHeight}`,
  ].join('; '),

  h2: [
    `font-size: ${TYPOGRAPHY.h2.fontSize}`,
    `color: ${COLORS.h2}`,
    `margin-top: ${SPACING.h2Top}`,
    `margin-bottom: ${SPACING.h2Bottom}`,
    `border-bottom: 1px solid ${COLORS.borderLight}`,
    'padding-bottom: 10px',
    `letter-spacing: ${TYPOGRAPHY.letterSpacing}`,
    `line-height: ${TYPOGRAPHY.lineHeight}`,
  ].join('; '),

  h3: [
    `font-size: ${TYPOGRAPHY.h3.fontSize}`,
    `color: ${COLORS.h3}`,
    `font-weight: ${TYPOGRAPHY.h3.fontWeight}`,
    `margin-top: ${SPACING.h3Top}`,
    'margin-bottom: 15px',
    `letter-spacing: ${TYPOGRAPHY.letterSpacing}`,
  ].join('; '),

  p: [
    `margin-bottom: ${SPACING.paragraphBottom}`,
    'text-align: justify',
    `font-size: ${TYPOGRAPHY.body.fontSize}`,
    `line-height: ${TYPOGRAPHY.lineHeight}`,
    `color: ${COLORS.body}`,
  ].join('; '),

  blockquote: [
    `border-left: 2px solid ${COLORS.quoteBorder}`,
    `background: ${COLORS.quoteBg}`,
    `padding: ${SPACING.quotePadding}`,
    `color: ${COLORS.quote}`,
    'font-style: italic',
    `margin: ${SPACING.quoteMargin}`,
    `font-size: ${TYPOGRAPHY.body.fontSize}`,
    `line-height: ${TYPOGRAPHY.lineHeight}`,
  ].join('; '),

  pre: [
    `background: ${COLORS.codeBg}`,
    `padding: ${SPACING.codePadding}`,
    'border-radius: 0px',
    'overflow-x: auto',
    'margin: 25px 0',
  ].join('; '),

  code: [
    `font-family: ${TYPOGRAPHY.code.fontFamily}`,
    `font-size: ${TYPOGRAPHY.code.fontSize}`,
    `color: ${COLORS.codeText}`,
    `line-height: ${TYPOGRAPHY.lineHeight}`,
  ].join('; '),

  inlineCode: [
    `font-family: ${TYPOGRAPHY.code.fontFamily}`,
    `font-size: ${TYPOGRAPHY.code.fontSize}`,
    `background: ${COLORS.codeBg}`,
    'padding: 2px 6px',
    `color: ${COLORS.codeText}`,
  ].join('; '),

  figure: [
    `margin: ${SPACING.imgMargin}`,
    'text-align: center',
  ].join('; '),

  img: [
    'max-width: 100%',
    'height: auto',
    'display: block',
    'margin: 0 auto',
  ].join('; '),

  figcaption: [
    `font-size: ${TYPOGRAPHY.caption.fontSize}`,
    `color: ${COLORS.caption}`,
    'margin-top: 10px',
  ].join('; '),

  divider: [
    'width: 30px',
    'height: 1px',
    `background: ${COLORS.divider}`,
    `margin: ${SPACING.dividerMargin}`,
  ].join('; '),

  link: [
    `color: ${COLORS.h2}`,
    'text-decoration: none',
    'border-bottom: 1px solid #ccc',
    'padding-bottom: 1px',
  ].join('; '),

  li: [
    `margin-bottom: 12px`,
    `font-size: ${TYPOGRAPHY.body.fontSize}`,
    `line-height: ${TYPOGRAPHY.lineHeight}`,
    `color: ${COLORS.body}`,
  ].join('; '),

  footer: [
    `margin-top: ${SPACING.footerTop}`,
    'text-align: center',
  ].join('; '),

  footerDivider: [
    'width: 30px',
    'height: 1px',
    `background: ${COLORS.divider}`,
    'margin: 0 auto 20px',
  ].join('; '),

  footerText: [
    `font-size: ${TYPOGRAPHY.caption.fontSize}`,
    `color: ${COLORS.footer}`,
    'text-transform: uppercase',
    `letter-spacing: 2px`,
  ].join('; '),
} as const;

// ============ Markdown 解析 ============

/** H2 自动编号计数器 */
let h2Counter = 0;

function parseMarkdown(markdown: string): string {
  h2Counter = 0;
  let html = markdown;

  // 代码块 ```lang\ncode\n```
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (_match, _lang, code) => {
    const escaped = code.trim()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return `<pre style="${STYLES.pre}"><code style="${STYLES.code}">${escaped}</code></pre>`;
  });

  // 行内代码
  html = html.replace(/`([^`]+)`/g, (_match, code) => {
    const escaped = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return `<code style="${STYLES.inlineCode}">${escaped}</code>`;
  });

  // H3
  html = html.replace(/^###\s+(.+)$/gm, `<h3 style="${STYLES.h3}">$1</h3>`);

  // H2 — 自动编号 "01 / Title"
  html = html.replace(/^##\s+(.+)$/gm, (_match, title) => {
    h2Counter++;
    const num = String(h2Counter).padStart(2, '0');
    return `<h2 style="${STYLES.h2}">${num} / ${title}</h2>`;
  });

  // H1 — 作为文章标题
  html = html.replace(/^#\s+(.+)$/gm, `<h1 style="${STYLES.title}">$1</h1>`);

  // 引用块（支持多行）
  html = html.replace(/^(?:>\s+.+\n?)+/gm, (block) => {
    const content = block.replace(/^>\s+/gm, '').trim().replace(/\n/g, '<br/>');
    return `<blockquote style="${STYLES.blockquote}">${content}</blockquote>`;
  });

  // 粗体
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // 斜体
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // 图片 ![alt](url) → figure + figcaption
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt, url) => {
    const caption = alt ? `<span style="${STYLES.figcaption}">${alt}</span>` : '';
    return `<figure style="${STYLES.figure}"><img src="${url}" alt="${alt}" style="${STYLES.img}" />${caption}</figure>`;
  });

  // 链接
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g,
    `<a href="$2" style="${STYLES.link}">$1</a>`);

  // 分割线 --- → 装饰性分隔符
  html = html.replace(/^---$/gm, `<div style="${STYLES.divider}"></div>`);

  // 无序列表
  html = html.replace(/^-\s+(.+)$/gm, `<li style="${STYLES.li}">$1</li>`);

  // 有序列表
  html = html.replace(/^\d+\.\s+(.+)$/gm, `<li style="${STYLES.li}">$1</li>`);

  // 段落：非标签、非空行
  html = html.replace(/^(?!<[a-z/]|$|\s*$)(.+)$/gm, (match) => {
    if (match.trim()) {
      return `<p style="${STYLES.p}">${match}</p>`;
    }
    return match;
  });

  // 清理多余空行
  html = html.replace(/\n{3,}/g, '\n\n');

  return html;
}

// ============ 模板引擎 ============

export interface TemplateOptions {
  title?: string;
  author?: string;
  date?: string;
  showFooter?: boolean;
  footerBrand?: string;
}

export class TemplateEngine {
  /**
   * 将 Markdown 转换为微信公众号文章 HTML
   */
  static render(markdown: string, options?: TemplateOptions): string {
    const {
      title,
      author,
      date = new Date().toISOString().split('T')[0],
      showFooter = true,
      footerBrand = 'New Universe',
    } = options ?? {};

    let html = '';

    // 标题
    if (title) {
      html += `<h1 style="${STYLES.title}">${title}</h1>`;
    }

    // 作者信息
    if (author) {
      html += `<p style="text-align: center; font-size: ${TYPOGRAPHY.caption.fontSize}; color: ${COLORS.caption}; margin-bottom: 40px;">${author}</p>`;
    }

    // Markdown 正文
    html += parseMarkdown(markdown);

    // 签名页脚
    if (showFooter) {
      html += this.renderFooter(footerBrand, date);
    }

    return `<div style="${STYLES.container}">${html}</div>`;
  }

  /**
   * "Signature" 页脚
   */
  private static renderFooter(brand: string, date: string): string {
    return [
      `<div style="${STYLES.footer}">`,
      `  <div style="${STYLES.footerDivider}"></div>`,
      `  <p style="${STYLES.footerText}">Designed by ${brand} | ${date}</p>`,
      `</div>`,
    ].join('');
  }

  /**
   * 仅转换 Markdown → HTML（不带容器包裹）
   */
  static markdownToHtml(markdown: string): string {
    return parseMarkdown(markdown);
  }

  /** 暴露样式常量供外部使用 */
  static get styles() { return STYLES; }
  static get colors() { return COLORS; }
  static get typography() { return TYPOGRAPHY; }
}
