import { Test, TestingModule } from '@nestjs/testing';
import { PublicService } from '../public.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SiteConfigService } from '../../site-config/site-config.service';
import { BlogCacheService } from '../../redis';
import * as fc from 'fast-check';

/**
 * Feature: blog-column-display, Property 2: Article detail columns filtering invariant
 *
 * For any article detail response, the `columns` array SHALL contain exactly the set of
 * published columns associated with that article (ordered by `sortOrder` ascending),
 * and SHALL be an empty array when no published columns are associated.
 *
 * **Validates: Requirements 2.1, 2.2, 2.3**
 */

// ─── Arbitraries ────────────────────────────────────────────────────

/** Generate a random column association with random status and sortOrder */
const columnAssociationArb = fc.record({
  id: fc.uuid(),
  columnId: fc.uuid(),
  articleId: fc.uuid(),
  sortOrder: fc.integer({ min: 0, max: 100 }),
  column: fc.record({
    id: fc.uuid(),
    title: fc.string({ minLength: 1, maxLength: 50 }),
    slug: fc.stringMatching(/^[a-z][a-z0-9-]{0,19}$/),
    sortOrder: fc.integer({ min: 0, max: 1000 }),
    status: fc.constantFrom('published', 'draft'),
  }),
});

/** Generate 0-5 column associations for an article */
const columnsArb = fc.array(columnAssociationArb, { minLength: 0, maxLength: 5 });

// ─── Test suite ─────────────────────────────────────────────────────

describe('Feature: blog-column-display, Property 2: Article detail columns filtering invariant', () => {
  let service: PublicService;
  let prisma: {
    article: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      count: jest.Mock;
      update: jest.Mock;
    };
    category: { findMany: jest.Mock };
    tag: { findMany: jest.Mock };
    project: { findMany: jest.Mock; count: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      article: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        update: jest.fn().mockResolvedValue({}),
      },
      category: { findMany: jest.fn().mockResolvedValue([]) },
      tag: { findMany: jest.fn().mockResolvedValue([]) },
      project: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };

    const siteConfigService = { getConfig: jest.fn() };
    const blogCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      wrap: jest.fn().mockImplementation((_key: string, fn: () => Promise<unknown>) => fn()),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicService,
        { provide: PrismaService, useValue: prisma },
        { provide: SiteConfigService, useValue: siteConfigService },
        { provide: BlogCacheService, useValue: blogCacheService },
      ],
    }).compile();

    service = module.get<PublicService>(PublicService);
  });

  it('columns array contains exactly published columns ordered by sortOrder ascending, empty when none published', async () => {
    await fc.assert(
      fc.asyncProperty(columnsArb, async (columns) => {
        // Arrange — build a mock article with the generated column associations
        const now = new Date();
        const mockArticle = {
          id: 'test-article-id',
          title: '测试文章',
          slug: 'test-article',
          summary: '摘要',
          content: '文章内容',
          coverImage: null,
          isPublished: true,
          publishedAt: now,
          seoTitle: null,
          seoDescription: null,
          categoryId: null,
          viewCount: 0,
          createdAt: now,
          updatedAt: now,
          locale: null,
          translationGroupId: null,
          category: null,
          tags: [],
          columns,
        };

        // Mock findFirst: first call returns the article, next two return null (prev/next nav)
        prisma.article.findFirst
          .mockResolvedValueOnce(mockArticle)
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(null);
        prisma.article.update.mockResolvedValue(mockArticle);

        // Act
        const result = await service.getArticleBySlug('test-article');

        // Assert — compute expected columns
        const expectedColumns = columns
          .filter((ca) => ca.column.status === 'published')
          .sort((a, b) => a.column.sortOrder - b.column.sortOrder)
          .map((ca) => ({
            id: ca.column.id,
            title: ca.column.title,
            slug: ca.column.slug,
          }));

        // Property: columns array matches exactly the published columns in sortOrder order
        expect(result.columns).toHaveLength(expectedColumns.length);
        result.columns.forEach((col, i) => {
          expect(col.id).toBe(expectedColumns[i].id);
          expect(col.title).toBe(expectedColumns[i].title);
          expect(col.slug).toBe(expectedColumns[i].slug);
        });

        // Property: when no published columns, array is empty
        const hasPublished = columns.some((ca) => ca.column.status === 'published');
        if (!hasPublished) {
          expect(result.columns).toEqual([]);
        }
      }),
      { numRuns: 100 },
    );
  });
});
