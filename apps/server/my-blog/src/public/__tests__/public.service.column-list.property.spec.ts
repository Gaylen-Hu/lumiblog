/**
 * Feature: blog-column-display, Property 1: Article list column selection invariant
 *
 * For any article with associated columns, the `column` field in the list API response
 * SHALL be the published column with the minimum `sortOrder` value; if no published
 * columns are associated, the field SHALL be `null`.
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
 */
import { Test, TestingModule } from '@nestjs/testing';
import { PublicService } from '../public.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SiteConfigService } from '../../site-config/site-config.service';
import { BlogCacheService } from '../../redis';
import * as fc from 'fast-check';

// ─── Arbitrary: Column association generator ────────────────────────

interface MockColumnAssociation {
  id: string;
  columnId: string;
  articleId: string;
  sortOrder: number;
  column: {
    id: string;
    title: string;
    slug: string;
    sortOrder: number;
    status: string;
  };
}

const columnAssociationArb = (articleId: string): fc.Arbitrary<MockColumnAssociation[]> =>
  fc
    .array(
      fc.record({
        id: fc.uuid(),
        columnId: fc.uuid(),
        sortOrder: fc.integer({ min: 0, max: 1000 }),
        status: fc.constantFrom('published', 'draft'),
        title: fc.string({ minLength: 1, maxLength: 50 }),
        slug: fc.stringMatching(/^[a-z][a-z0-9-]{0,19}$/),
      }),
      { minLength: 0, maxLength: 5 },
    )
    .map((cols) =>
      cols.map((col) => ({
        id: col.id,
        columnId: col.columnId,
        articleId,
        sortOrder: col.sortOrder,
        column: {
          id: col.columnId,
          title: col.title,
          slug: col.slug,
          sortOrder: col.sortOrder,
          status: col.status,
        },
      })),
    );

// ─── Test suite ─────────────────────────────────────────────────────

describe('Feature: blog-column-display, Property 1: Article list column selection invariant', () => {
  let service: PublicService;
  let prisma: {
    article: {
      findMany: jest.Mock;
      count: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      article: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicService,
        { provide: PrismaService, useValue: prisma },
        { provide: SiteConfigService, useValue: { getConfig: jest.fn() } },
        { provide: BlogCacheService, useValue: { get: jest.fn(), set: jest.fn(), del: jest.fn(), wrap: jest.fn() } },
      ],
    }).compile();

    service = module.get<PublicService>(PublicService);
  });

  it('column field is the published column with minimum sortOrder, or null if none published', async () => {
    await fc.assert(
      fc.asyncProperty(
        columnAssociationArb('article-1'),
        async (columns) => {
          // Arrange: build a mock article with the generated column associations
          const now = new Date();
          const mockArticle = {
            id: 'article-1',
            title: '测试文章',
            slug: 'test-article',
            summary: '摘要',
            content: '内容',
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

          prisma.article.findMany.mockResolvedValue([mockArticle]);
          prisma.article.count.mockResolvedValue(1);

          // Act: call getArticles which internally calls toArticleListItem
          const result = await service.getArticles({ page: 1, pageSize: 10 });
          const item = result.data[0];

          // Determine expected column
          const publishedColumns = columns
            .filter((ca) => ca.column.status === 'published')
            .sort((a, b) => a.column.sortOrder - b.column.sortOrder);

          if (publishedColumns.length === 0) {
            // No published columns → column should be null
            expect(item.column).toBeNull();
          } else {
            // Should be the published column with minimum sortOrder
            const expected = publishedColumns[0].column;
            expect(item.column).not.toBeNull();
            expect(item.column!.id).toBe(expected.id);
            expect(item.column!.title).toBe(expected.title);
            expect(item.column!.slug).toBe(expected.slug);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
