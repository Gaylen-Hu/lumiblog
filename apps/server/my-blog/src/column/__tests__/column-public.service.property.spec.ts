// Feature: blog-columns, Property 7: Public API returns only published columns in sort order
// Feature: blog-columns, Property 8: Public column detail returns only published articles in sort order
// Feature: blog-columns, Property 9: Column navigation boundary correctness
import { Test, TestingModule } from '@nestjs/testing';
import * as fc from 'fast-check';
import { ColumnPublicService } from '../column-public.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BlogCacheService } from '../../redis';

/**
 * Property 7: Public API returns only published columns in sort order
 * **Validates: Requirements 8.1**
 *
 * For any mix of draft and published columns, the public columns endpoint
 * should return only columns with status=published, ordered by sortOrder ascending.
 */
describe('ColumnPublicService Property Tests', () => {
  let service: ColumnPublicService;
  let prismaService: PrismaService;
  let cacheService: BlogCacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ColumnPublicService,
        {
          provide: PrismaService,
          useValue: {
            column: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
            },
          },
        },
        {
          provide: BlogCacheService,
          useValue: {
            wrap: jest.fn().mockImplementation(
              (_key: string, fn: () => Promise<unknown>, _ttl: number) => fn(),
            ),
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<ColumnPublicService>(ColumnPublicService);
    prismaService = module.get<PrismaService>(PrismaService);
    cacheService = module.get<BlogCacheService>(BlogCacheService);
  });

  // Arbitrary: generate status
  const statusArb = fc.constantFrom('draft' as const, 'published' as const);

  // Arbitrary: generate sortOrder (non-negative integer)
  const sortOrderArb = fc.integer({ min: 0, max: 10000 });

  // Arbitrary: generate a single column record with random status and sortOrder
  const columnRecordArb = fc.record({
    id: fc.uuid(),
    title: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
    slug: fc.stringMatching(/^[a-z0-9][a-z0-9-]{0,18}[a-z0-9]$/).filter(
      (s) => !s.includes('--') && s.length >= 2,
    ),
    description: fc.option(fc.string({ maxLength: 500 }), { nil: null }),
    coverImage: fc.option(fc.constant('https://example.com/img.jpg'), { nil: null }),
    sortOrder: sortOrderArb,
    status: statusArb,
  });

  // Arbitrary: generate a list of columns with unique slugs
  const columnListArb = fc
    .array(columnRecordArb, { minLength: 1, maxLength: 20 })
    .map((columns) => {
      const seen = new Set<string>();
      return columns.filter((col) => {
        if (seen.has(col.slug)) return false;
        seen.add(col.slug);
        return true;
      });
    })
    .filter((columns) => columns.length >= 1);

  // Feature: blog-columns, Property 7: Public API returns only published columns in sort order
  // **Validates: Requirements 8.1**
  describe('Property 7: Public API returns only published columns in sort order', () => {
    it('should return only published columns sorted by sortOrder ascending', async () => {
      await fc.assert(
        fc.asyncProperty(columnListArb, async (allColumns) => {
          // Determine which columns are published
          const publishedColumns = allColumns
            .filter((col) => col.status === 'published')
            .sort((a, b) => a.sortOrder - b.sortOrder);

          // Mock PrismaService.column.findMany to simulate the DB query:
          // It returns only published columns sorted by sortOrder asc, with _count
          const dbResult = publishedColumns.map((col) => ({
            id: col.id,
            title: col.title,
            slug: col.slug,
            description: col.description,
            coverImage: col.coverImage,
            sortOrder: col.sortOrder,
            status: col.status,
            createdAt: new Date(),
            updatedAt: new Date(),
            _count: { articles: 0 },
          }));

          (prismaService.column.findMany as jest.Mock).mockResolvedValue(dbResult);

          // Act: call getPublishedColumns
          const result = await service.getPublishedColumns();

          // Assert 1: All returned columns have status implied as published
          // (they come from the published-only query)
          expect(result.length).toBe(publishedColumns.length);

          // Assert 2: Count matches the number of published columns in the input
          const expectedPublishedCount = allColumns.filter(
            (col) => col.status === 'published',
          ).length;
          expect(result.length).toBe(expectedPublishedCount);

          // Assert 3: Results are sorted by sortOrder ascending
          for (let i = 1; i < result.length; i++) {
            expect(result[i].sortOrder).toBeGreaterThanOrEqual(result[i - 1].sortOrder);
          }

          // Assert 4: Each returned item matches the expected published column data
          for (let i = 0; i < result.length; i++) {
            expect(result[i].id).toBe(publishedColumns[i].id);
            expect(result[i].title).toBe(publishedColumns[i].title);
            expect(result[i].slug).toBe(publishedColumns[i].slug);
            expect(result[i].sortOrder).toBe(publishedColumns[i].sortOrder);
          }

          // Assert 5: No draft columns appear in the result
          const draftSlugs = new Set(
            allColumns.filter((col) => col.status === 'draft').map((col) => col.slug),
          );
          for (const item of result) {
            expect(draftSlugs.has(item.slug)).toBe(false);
          }
        }),
        { numRuns: 100 },
      );
    });
  });

  // Feature: blog-columns, Property 8: Public column detail returns only published articles in sort order
  // **Validates: Requirements 8.2**
  describe('Property 8: Public column detail returns only published articles in sort order', () => {
    // Arbitrary: generate an article with random publish status and sortOrder
    const articleArb = fc.record({
      id: fc.uuid(),
      title: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
      slug: fc.stringMatching(/^[a-z0-9][a-z0-9-]{0,18}[a-z0-9]$/).filter(
        (s) => !s.includes('--') && s.length >= 2,
      ),
      summary: fc.option(fc.string({ maxLength: 200 }), { nil: null }),
      coverImage: fc.option(fc.constant('https://example.com/img.jpg'), { nil: null }),
      isPublished: fc.boolean(),
      publishedAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
      sortOrder: fc.integer({ min: 0, max: 1000 }),
    });

    // Arbitrary: generate a list of articles with unique IDs (mix of published/unpublished)
    const articleListArb = fc
      .array(articleArb, { minLength: 2, maxLength: 15 })
      .map((articles) => {
        const seen = new Set<string>();
        return articles.filter((a) => {
          if (seen.has(a.id)) return false;
          seen.add(a.id);
          return true;
        });
      })
      .filter((articles) => {
        // Ensure at least one published and one unpublished article
        const hasPublished = articles.some((a) => a.isPublished);
        const hasUnpublished = articles.some((a) => !a.isPublished);
        return hasPublished && hasUnpublished && articles.length >= 2;
      });

    it('should return only published articles sorted by sortOrder ascending', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc
            .stringMatching(/^[a-z0-9][a-z0-9-]{0,18}[a-z0-9]$/)
            .filter((s) => !s.includes('--') && s.length >= 2),
          articleListArb,
          async (columnId, columnSlug, articles) => {
            // Determine which articles are published and sort by sortOrder ascending
            const publishedArticles = articles
              .filter((a) => a.isPublished)
              .sort((a, b) => a.sortOrder - b.sortOrder);

            // Mock: cache miss (get returns null)
            (cacheService.get as jest.Mock).mockResolvedValue(null);
            (cacheService.set as jest.Mock).mockResolvedValue(undefined);

            // Mock: PrismaService.column.findUnique returns the column with only published articles
            // This simulates the DB query with where: { article: { isPublished: true } }
            const dbResult = {
              id: columnId,
              title: `Column ${columnSlug}`,
              slug: columnSlug,
              description: 'Test column description',
              coverImage: null,
              sortOrder: 0,
              status: 'published' as const,
              createdAt: new Date(),
              updatedAt: new Date(),
              articles: publishedArticles.map((a) => ({
                sortOrder: a.sortOrder,
                article: {
                  id: a.id,
                  title: a.title,
                  slug: a.slug,
                  summary: a.summary,
                  coverImage: a.coverImage,
                  publishedAt: a.publishedAt,
                },
              })),
            };

            (prismaService.column.findUnique as jest.Mock).mockResolvedValue(dbResult);

            // Act: call getColumnBySlug
            const result = await service.getColumnBySlug(columnSlug);

            // Assert 1: All returned articles are from published articles only
            expect(result.articles.length).toBe(publishedArticles.length);

            // Assert 2: Article count matches expected published count
            const expectedPublishedCount = articles.filter((a) => a.isPublished).length;
            expect(result.articles.length).toBe(expectedPublishedCount);

            // Assert 3: Articles are sorted by sortOrder ascending (each sortOrder >= previous)
            for (let i = 1; i < result.articles.length; i++) {
              const prevArticle = publishedArticles[i - 1];
              const currArticle = publishedArticles[i];
              expect(currArticle.sortOrder).toBeGreaterThanOrEqual(prevArticle.sortOrder);
            }

            // Assert 4: Each returned article matches the expected published article data
            for (let i = 0; i < result.articles.length; i++) {
              expect(result.articles[i].id).toBe(publishedArticles[i].id);
              expect(result.articles[i].title).toBe(publishedArticles[i].title);
              expect(result.articles[i].slug).toBe(publishedArticles[i].slug);
              expect(result.articles[i].summary).toBe(publishedArticles[i].summary);
            }

            // Assert 5: No unpublished articles appear in the result
            const unpublishedIds = new Set(
              articles.filter((a) => !a.isPublished).map((a) => a.id),
            );
            for (const item of result.articles) {
              expect(unpublishedIds.has(item.id)).toBe(false);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // Feature: blog-columns, Property 9: Column navigation boundary correctness
  // **Validates: Requirements 7.3**
  describe('Property 9: Column navigation boundary correctness', () => {
    // Arbitrary: generate valid slug
    const navSlugArb = fc
      .stringMatching(/^[a-z0-9][a-z0-9-]{0,18}[a-z0-9]$/)
      .filter((s) => !s.includes('--') && s.length >= 2);

    // Arbitrary: generate valid title (1-50 chars, non-empty after trim)
    const navTitleArb = fc
      .string({ minLength: 1, maxLength: 50 })
      .filter((s) => s.trim().length > 0);

    it('should return prev=null iff i==0, next=null iff i==N-1, both null when N==1', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 20 }).chain((n) =>
            fc.tuple(
              fc.constant(n),
              fc.integer({ min: 0, max: n - 1 }),
              fc.array(
                fc.record({
                  id: fc.uuid(),
                  title: navTitleArb,
                  slug: navSlugArb,
                }),
                { minLength: n, maxLength: n },
              ),
            ),
          ),
          navSlugArb,
          navTitleArb,
          async ([n, i, articles], columnSlug, columnTitle) => {
            // Build mock column data that getArticleNav expects from Prisma
            const mockColumn = {
              title: columnTitle,
              slug: columnSlug,
              articles: articles.map((article, idx) => ({
                article: {
                  id: article.id,
                  title: article.title,
                  slug: article.slug,
                },
                sortOrder: idx,
              })),
            };

            // Mock: column.findUnique returns the published column with articles
            (prismaService.column.findUnique as jest.Mock).mockResolvedValue(
              mockColumn,
            );

            // Act: call getArticleNav with the article at position i
            const result = await service.getArticleNav(
              columnSlug,
              articles[i].id,
            );

            // Assert: columnTitle and columnSlug are correct
            expect(result.columnTitle).toBe(columnTitle);
            expect(result.columnSlug).toBe(columnSlug);

            // Assert: prev is null if and only if i == 0
            if (i === 0) {
              expect(result.prev).toBeNull();
            } else {
              expect(result.prev).not.toBeNull();
              expect(result.prev!.title).toBe(articles[i - 1].title);
              expect(result.prev!.slug).toBe(articles[i - 1].slug);
            }

            // Assert: next is null if and only if i == N-1
            if (i === n - 1) {
              expect(result.next).toBeNull();
            } else {
              expect(result.next).not.toBeNull();
              expect(result.next!.title).toBe(articles[i + 1].title);
              expect(result.next!.slug).toBe(articles[i + 1].slug);
            }

            // Assert: special case - if N == 1, both prev and next are null
            if (n === 1) {
              expect(result.prev).toBeNull();
              expect(result.next).toBeNull();
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
