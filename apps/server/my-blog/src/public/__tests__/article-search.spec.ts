import {
  rankedSearchSql,
  searchTerms,
  searchHighlight,
} from '../article-search';
import { PrismaClient, Prisma } from '@prisma/client';

describe('搜索查询与摘要', () => {
  it('中文关键词、顺序变化、中英文别名和英文纠错', () => {
    expect(searchTerms('隐式动画与显式动画')).toEqual(
      searchTerms('隐式动画 显式动画'),
    );
    expect(searchTerms('动画 Flutter').map((g) => g[0])).toEqual([
      '动画',
      'flutter',
    ]);
    expect(searchTerms('Fluter')[0]).toContain('flutter');
    expect(searchTerms('依赖注入')[0]).toContain('dependency injection');
    expect(
      searchTerms('TickerProviderStateMixin C++ next.js').map((g) => g[0]),
    ).toEqual(['tickerproviderstatemixin', 'c++', 'next.js']);
    expect(searchTerms('ReactNative')[0]).toEqual(['reactnative']);
  });
  it('拒绝空查询和超长查询，SQL 及通配符均作为值传递', () => {
    for (const q of [' ', '%', '的与和', 'a'.repeat(201)])
      expect(() => searchTerms(q)).toThrow();
    const sql = rankedSearchSql("Flutter ' OR 1=1", {
      locale: "zh-CN' OR true--",
    });
    expect(sql.sql).not.toContain("zh-CN' OR true--");
    expect(sql.values).toContain("zh-CN' OR true--");
    expect(rankedSearchSql('API_key').values).toContain('%api\\_key%');
  });
  it('摘要标出组合关键词并转义 HTML，不返回可执行标签', () => {
    const value = searchHighlight(
      '<script>alert(1)</script> Flutter 的动画',
      '动画 Flutter',
    );
    expect(value).toContain('<mark>Flutter</mark>');
    expect(value).toContain('<mark>动画</mark>');
    expect(value).toContain('&lt;script&gt;');
    expect(value).not.toContain('<script>');
    expect(searchHighlight(null, 'Flutter')).toBeNull();
  });
});

// CI owns a disposable PostgreSQL service. All fixtures are transaction-local TEMP tables.
const integration = process.env.SEARCH_INTEGRATION_URL
  ? describe
  : describe.skip;
integration('PostgreSQL 真实排序与过滤', () => {
  it('换序召回、完整标题优先、正文/标签命中、语言发布分类过滤和通配符转义', async () => {
    const url = new URL(process.env.SEARCH_INTEGRATION_URL!);
    if (!['localhost', '127.0.0.1'].includes(url.hostname))
      throw new Error('Only a disposable local PostgreSQL service is allowed');
    const client = new PrismaClient({
      datasources: { db: { url: url.toString() } },
    });
    try {
      await client.$transaction(
        async (tx) => {
          await tx.$executeRawUnsafe(
            'CREATE TEMP TABLE articles (id text, title text, summary text, content text, "isPublished" boolean, locale text, "categoryId" text, "publishedAt" timestamp) ON COMMIT DROP',
          );
          await tx.$executeRawUnsafe(
            'CREATE TEMP TABLE tags (id text, name text, slug text) ON COMMIT DROP',
          );
          await tx.$executeRawUnsafe(
            'CREATE TEMP TABLE article_tags ("articleId" text, "tagId" text) ON COMMIT DROP',
          );
          await tx.$executeRawUnsafe(
            'CREATE TEMP TABLE categories (id text, slug text) ON COMMIT DROP',
          );
          for (const row of [
            [
              'target',
              '隐式动画与显式动画',
              '动画教程',
              'Flutter AnimatedContainer TickerProviderStateMixin API_key',
            ],
            [
              'reference',
              '交错动画与物理动画',
              '',
              '上一篇：隐式动画与显式动画 Flutter',
            ],
            ['other', '别的文章', '', '没有相关内容'],
            ['draft', '隐式动画与显式动画', '', 'Flutter'],
            ['english', '隐式动画与显式动画', '', 'Flutter'],
          ])
            await tx.$executeRaw(
              Prisma.sql`INSERT INTO articles VALUES (${row[0]}, ${row[1]}, ${row[2]}, ${row[3]}, ${row[0] !== 'draft'}, ${row[0] === 'english' ? 'en-US' : 'zh-CN'}, 'tech', ${new Date(row[0] === 'reference' ? '2026-11-06' : '2026-01-01')})`,
            );
          await tx.$executeRaw`INSERT INTO categories VALUES ('tech','technology')`;
          await tx.$executeRaw`INSERT INTO tags VALUES ('tag','依赖注入','di')`;
          await tx.$executeRaw`INSERT INTO article_tags VALUES ('other','tag')`;
          const find = async (
            q: string,
            filters = { locale: 'zh-CN' } as {
              locale?: string;
              tag?: string;
              category?: string;
            },
          ) =>
            (
              await tx.$queryRaw<{ id: string }[]>(rankedSearchSql(q, filters))
            ).map((row) => row.id);
          expect(await find('隐式动画与显式动画')).toEqual([
            'target',
            'reference',
          ]);
          expect(await find('隐式动画 显式动画')).toEqual([
            'target',
            'reference',
          ]);
          expect(await find('Flutter 动画')).toEqual(
            await find('动画 Flutter'),
          );
          expect(await find('Fluter')).toEqual(['reference', 'target']);
          expect(await find('TickerProviderStateMixin')).toEqual(['target']);
          expect(await find('dependency injection')).toEqual(['other']);
          expect(await find('API_key')).toEqual(['target']);
          expect(await find('Flutter', { locale: 'en-US' })).toEqual([
            'english',
          ]);
          expect(
            await find('Flutter', { locale: 'zh-CN', category: 'missing' }),
          ).toEqual([]);
          expect(await find('Flutter', { locale: 'zh-CN', tag: 'di' })).toEqual(
            [],
          );
        },
        { timeout: 20000 },
      );
    } finally {
      await client.$disconnect();
    }
  });
});
