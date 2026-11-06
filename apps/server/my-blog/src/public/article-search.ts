import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

// Small, reviewable technical dictionary. It is query expansion, not semantic search.
const aliases = [
  ['flutter'],
  ['react'],
  ['next.js', 'nextjs'],
  ['postgresql', 'postgres'],
  ['typescript'],
  ['javascript'],
  ['nestjs'],
  ['prisma'],
  ['docker'],
  ['隐式动画', 'implicit animation', 'implicit animations'],
  ['显式动画', 'explicit animation', 'explicit animations'],
  ['依赖注入', 'dependency injection'],
  ['向量检索', 'vector search'],
  ['上下文压缩', 'compaction'],
  ['垃圾回收', 'garbage collection'],
];
const dictionary = [
  ...aliases.flat(),
  '动画',
  '控件',
  '状态',
  '过渡',
  '性能',
  '内存',
  '路由',
  '组件',
  '如何',
  '怎么',
  '什么',
  '文章',
  '教程',
  '的',
  '与',
  '和',
  '了',
  '一个',
  '关于',
].sort((a, b) => b.length - a.length);
const ignored = new Set([
  '如何',
  '怎么',
  '什么',
  '的',
  '与',
  '和',
  '了',
  '一个',
  '关于',
]);
const segmenter = new Intl.Segmenter('zh-CN', { granularity: 'word' });
export const normalizeSearch = (value: string) =>
  value.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();

function oneEdit(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0,
    j = 0,
    edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length >= b.length) i++;
    if (b.length >= a.length) j++;
  }
  return edits + Number(i < a.length || j < b.length) === 1;
}

export function searchTerms(input: string): string[][] {
  const query = normalizeSearch(input);
  if (!query || query.length > 200)
    throw new BadRequestException('搜索内容须为 1–200 个字符');
  const tokens: string[] = [];
  let remaining = query;
  while (remaining) {
    if (/^[\s,，。?!？！:：;；()（）]+/u.test(remaining)) {
      remaining = remaining.replace(/^[\s,，。?!？！:：;；()（）]+/u, '');
      continue;
    }
    const known = dictionary.find(
      (word) =>
        remaining.startsWith(word) &&
        (!/[a-z0-9]$/.test(word) ||
          !/^[a-z0-9_.+#-]/.test(remaining.slice(word.length))),
    );
    if (known) {
      if (!ignored.has(known)) tokens.push(known);
      remaining = remaining.slice(known.length);
      continue;
    }
    const latin = remaining.match(/^[a-z0-9][a-z0-9_.+#-]*/)?.[0];
    const part =
      latin || [...segmenter.segment(remaining)][0]?.segment || remaining[0];
    if (/[\p{L}\p{N}]/u.test(part) && !ignored.has(part)) tokens.push(part);
    remaining = remaining.slice(part.length);
  }
  const unique = [...new Set(tokens)];
  if (!unique.length || unique.length > 16)
    throw new BadRequestException('请使用 1–16 个有效关键词');
  return unique.map((token) => {
    const direct = aliases.find((group) => group.includes(token));
    if (direct) return [...new Set([token, ...direct])];
    const candidates = /^[a-z]{4,}$/.test(token)
      ? aliases
          .flat()
          .filter((word) => /^[a-z]{4,}$/.test(word) && oneEdit(token, word))
      : [];
    return [...new Set([token, ...candidates])];
  });
}

function match(field: Prisma.Sql, term: string) {
  const escaped = term.replace(/[\\%_]/g, '\\$&');
  return Prisma.sql`COALESCE(${field}, '') ILIKE ${'%' + escaped + '%'} ESCAPE E'\\\\'`;
}
function tagMatch(term: string) {
  return Prisma.sql`EXISTS (SELECT 1 FROM article_tags at JOIN tags t ON t.id = at."tagId" WHERE at."articleId" = a.id AND ${match(Prisma.sql`t.name`, term)})`;
}

export function rankedSearchSql(
  input: string,
  filters: { locale?: string; category?: string; tag?: string } = {},
) {
  const groups = searchTerms(input);
  const fields = [
    [Prisma.sql`a.title`, 100],
    [Prisma.sql`a.summary`, 30],
    [Prisma.sql`a.content`, 5],
  ] as const;
  const conditions = groups.map(
    (group) =>
      Prisma.sql`(${Prisma.join(
        group.map(
          (term) =>
            Prisma.sql`(${Prisma.join([...fields.map(([field]) => match(field, term)), tagMatch(term)], ' OR ')})`,
        ),
        ' OR ',
      )})`,
  );
  const scores = groups.map(
    (group) =>
      Prisma.sql`GREATEST(${Prisma.join(group.map((term) => Prisma.sql`(${Prisma.join([...fields.map(([field, weight]) => Prisma.sql`CASE WHEN ${match(field, term)} THEN ${weight} ELSE 0 END`), Prisma.sql`CASE WHEN ${tagMatch(term)} THEN 50 ELSE 0 END`], ' + ')})`))})`,
  );
  return Prisma.sql`SELECT a.id FROM articles a WHERE a."isPublished" = true
    ${filters.locale ? Prisma.sql`AND a.locale = ${filters.locale}` : Prisma.empty}
    ${filters.category ? Prisma.sql`AND EXISTS (SELECT 1 FROM categories c WHERE c.id = a."categoryId" AND c.slug = ${filters.category})` : Prisma.empty}
    ${filters.tag ? Prisma.sql`AND EXISTS (SELECT 1 FROM article_tags at JOIN tags t ON t.id = at."tagId" WHERE at."articleId" = a.id AND t.slug = ${filters.tag})` : Prisma.empty}
    AND ${Prisma.join(conditions, ' AND ')}
    ORDER BY (CASE WHEN lower(a.title) = ${normalizeSearch(input)} THEN 10000 ELSE 0 END
      + CASE WHEN ${match(Prisma.sql`a.title`, normalizeSearch(input))} THEN 1000 ELSE 0 END
      + ${Prisma.join(scores, ' + ')}) DESC, a."publishedAt" DESC NULLS LAST, a.id ASC`;
}

export function searchHighlight(
  content: string | null,
  input: string,
): string | null {
  if (!content) return null;
  const terms = searchTerms(input)
    .flat()
    .sort((a, b) => b.length - a.length);
  const pattern = terms
    .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');
  const expression = new RegExp(pattern, 'giu');
  const first = expression.exec(content);
  if (!first) return null;
  const start = Math.max(0, first.index - 50),
    end = Math.min(content.length, first.index + first[0].length + 100);
  const excerpt = content.slice(start, end);
  const escape = (text: string) =>
    text.replace(
      /[&<>"']/g,
      (ch) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        })[ch]!,
    );
  let result = '',
    cursor = 0;
  for (const found of excerpt.matchAll(new RegExp(pattern, 'giu'))) {
    result +=
      escape(excerpt.slice(cursor, found.index)) +
      '<mark>' +
      escape(found[0]) +
      '</mark>';
    cursor = found.index + found[0].length;
  }
  return (
    (start ? '…' : '') +
    result +
    escape(excerpt.slice(cursor)) +
    (end < content.length ? '…' : '')
  );
}
