// Feature: blog-columns, Property 1: Column creation round-trip
import { Test, TestingModule } from '@nestjs/testing';
import * as fc from 'fast-check';
import { ConflictException } from '@nestjs/common';
import { ColumnService } from '../column.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BlogCacheService } from '../../redis';
import { CacheKeyRegistry } from '../../redis/cache-key.registry';

/**
 * Property 1: Column creation round-trip
 * **Validates: Requirements 1.1, 2.1**
 *
 * For any valid column data (title 1-100 chars, slug unique, description <= 500 chars,
 * status in {draft, published}), creating a column and then reading it back by ID
 * should return an object with all fields matching the input.
 */
describe('ColumnService Property Tests', () => {
  let service: ColumnService;
  let prismaService: PrismaService;
  let cacheService: BlogCacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ColumnService,
        {
          provide: PrismaService,
          useValue: {
            column: {
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
            },
            columnArticle: {
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            article: {
              findUnique: jest.fn(),
            },
          },
        },
        {
          provide: BlogCacheService,
          useValue: {
            del: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<ColumnService>(ColumnService);
    prismaService = module.get<PrismaService>(PrismaService);
    cacheService = module.get<BlogCacheService>(BlogCacheService);
  });

  // Arbitrary: generate valid slug (lowercase alphanumeric + hyphens, 2-50 chars)
  const slugArb = fc
    .stringMatching(/^[a-z0-9][a-z0-9-]{0,48}[a-z0-9]$/)
    .filter((s) => !s.includes('--') && s.length >= 2 && s.length <= 50);

  // Arbitrary: generate valid title (1-100 chars, non-empty after trim)
  const titleArb = fc
    .string({ minLength: 1, maxLength: 100 })
    .filter((s) => s.trim().length > 0);

  // Arbitrary: generate optional description (max 500 chars)
  const descriptionArb = fc.option(fc.string({ maxLength: 500 }), {
    nil: undefined,
  });

  // Arbitrary: generate status
  const statusArb = fc.constantFrom('draft' as const, 'published' as const);

  // Arbitrary: generate sortOrder (non-negative integer, max 1000)
  const sortOrderArb = fc.nat({ max: 1000 });

  // Combined arbitrary for valid column creation input
  const columnInputArb = fc.record({
    title: titleArb,
    slug: slugArb,
    description: descriptionArb,
    status: statusArb,
    sortOrder: sortOrderArb,
  });

  // Feature: blog-columns, Property 1: Column creation round-trip
  // **Validates: Requirements 1.1, 2.1**
  describe('Property 1: Column creation round-trip', () => {
    it('should preserve all fields when creating and reading back a column', async () => {
      await fc.assert(
        fc.asyncProperty(columnInputArb, async (input) => {
          const now = new Date();
          const generatedId = `uuid-${Math.random().toString(36).slice(2)}`;

          const createdColumn = {
            id: generatedId,
            title: input.title,
            slug: input.slug,
            description: input.description ?? null,
            coverImage: null,
            sortOrder: input.sortOrder,
            status: input.status,
            createdAt: now,
            updatedAt: now,
          };

          // Mock: no slug conflict (first findUnique call for slug check)
          (prismaService.column.findUnique as jest.Mock).mockResolvedValueOnce(
            null,
          );

          // Mock: create returns the column
          (prismaService.column.create as jest.Mock).mockResolvedValueOnce(
            createdColumn,
          );

          // Mock: findOne reads back the column with articles (second findUnique call)
          (prismaService.column.findUnique as jest.Mock).mockResolvedValueOnce({
            ...createdColumn,
            articles: [],
          });

          // Act: create the column
          const createResult = await service.create({
            title: input.title,
            slug: input.slug,
            description: input.description,
            sortOrder: input.sortOrder,
            status: input.status,
          });

          // Act: read back by ID
          const readResult = await service.findOne(generatedId);

          // Assert: created response fields match input
          expect(createResult.title).toBe(input.title);
          expect(createResult.slug).toBe(input.slug);
          expect(createResult.description).toBe(input.description ?? null);
          expect(createResult.sortOrder).toBe(input.sortOrder);
          expect(createResult.status).toBe(input.status);
          expect(createResult.articleCount).toBe(0);

          // Assert: read-back response fields match input
          expect(readResult.title).toBe(input.title);
          expect(readResult.slug).toBe(input.slug);
          expect(readResult.description).toBe(input.description ?? null);
          expect(readResult.sortOrder).toBe(input.sortOrder);
          expect(readResult.status).toBe(input.status);
          expect(readResult.articles).toEqual([]);

          // Assert: IDs are consistent
          expect(createResult.id).toBe(generatedId);
          expect(readResult.id).toBe(generatedId);

          // Assert: timestamps are ISO strings
          expect(createResult.createdAt).toBe(now.toISOString());
          expect(createResult.updatedAt).toBe(now.toISOString());
          expect(readResult.createdAt).toBe(now.toISOString());
          expect(readResult.updatedAt).toBe(now.toISOString());
        }),
        { numRuns: 100 },
      );
    });
  });

  // Feature: blog-columns, Property 5: Pagination invariant
  // **Validates: Requirements 2.2**
  describe('Property 5: Pagination invariant', () => {
    it('should satisfy data.length ≤ limit, page matches, and total is correct for any valid pagination params', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }),
          fc.integer({ min: 1, max: 100 }),
          fc.integer({ min: 0, max: 500 }),
          async (page: number, limit: number, total: number) => {
            const skip = (page - 1) * limit;
            // Calculate how many items the DB would actually return
            const expectedDataLength = Math.max(0, Math.min(limit, total - skip));

            // Generate mock column records matching what Prisma would return
            const mockColumns = Array.from(
              { length: expectedDataLength },
              (_, i) => ({
                id: `col-${i}`,
                title: `Column ${i}`,
                slug: `column-${i}`,
                description: null,
                coverImage: null,
                sortOrder: i,
                status: 'published' as const,
                createdAt: new Date(),
                updatedAt: new Date(),
                _count: { articles: 0 },
              }),
            );

            // Mock PrismaService
            (prismaService.column.findMany as jest.Mock).mockResolvedValue(mockColumns);
            (prismaService.column.count as jest.Mock).mockResolvedValue(total);

            // Call findAll with the generated pagination params
            const result = await service.findAll({ page, limit });

            // Assert pagination invariants
            expect(result.data.length).toBeLessThanOrEqual(limit);
            expect(result.page).toBe(page);
            expect(result.total).toBe(total);
            expect(result.limit).toBe(limit);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // Feature: blog-columns, Property 6: Reorder preserves article set and applies new order
  // **Validates: Requirements 2.8**
  describe('Property 6: Reorder preserves article set and applies new order', () => {
    it('should preserve article set and assign sortOrder matching permutation index after reorder', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2, max: 10 }).chain((n) =>
            fc.tuple(
              fc.constant(n),
              fc.uniqueArray(fc.uuid(), { minLength: n, maxLength: n }),
            ),
          ),
          fc.uuid(),
          async ([n, articleIds], columnId) => {
            const columnSlug = `col-${columnId.slice(0, 8)}`;

            // Generate a random permutation of the article IDs
            const permutedIds = [...articleIds].sort(() => Math.random() - 0.5);

            // Existing articles in the column (with original sortOrder)
            const existingArticles = articleIds.map((aid, idx) => ({
              articleId: aid,
              sortOrder: idx,
            }));

            // Track update calls to verify sortOrder assignments
            const updateCalls: Array<{ columnId: string; articleId: string; sortOrder: number }> = [];

            // Mock: column exists
            (prismaService.column.findUnique as jest.Mock).mockResolvedValue({
              id: columnId,
              slug: columnSlug,
            });

            // Mock: columnArticle.findMany returns existing articles
            (prismaService as any).columnArticle = {
              ...(prismaService as any).columnArticle,
              findMany: jest.fn().mockResolvedValue(existingArticles),
              update: jest.fn().mockImplementation((args: any) => {
                updateCalls.push({
                  columnId: args.where.columnId_articleId.columnId,
                  articleId: args.where.columnId_articleId.articleId,
                  sortOrder: args.data.sortOrder,
                });
                return Promise.resolve({});
              }),
            };

            // Act: call reorderArticles with the permuted IDs
            await service.reorderArticles(columnId, { articleIds: permutedIds });

            // Assert: the set of article IDs is preserved (same elements, no additions/removals)
            const updatedArticleIds = new Set(updateCalls.map((c) => c.articleId));
            const originalArticleIds = new Set(articleIds);
            expect(updatedArticleIds).toEqual(originalArticleIds);

            // Assert: each update sets sortOrder = index of that articleId in the permuted array
            for (const call of updateCalls) {
              const expectedSortOrder = permutedIds.indexOf(call.articleId);
              expect(call.sortOrder).toBe(expectedSortOrder);
            }

            // Assert: exactly N updates were made (one per article)
            expect(updateCalls.length).toBe(n);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // Feature: blog-columns, Property 2: Column-Article uniqueness constraint
  // **Validates: Requirements 1.3**
  describe('Property 2: Column-Article uniqueness constraint', () => {
    it('should reject duplicate article addition with ConflictException and leave article list unchanged', async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), fc.uuid(), async (columnId, articleId) => {
          const columnSlug = `col-${columnId.slice(0, 8)}`;

          // Mock: column exists
          (prismaService.column.findUnique as jest.Mock).mockResolvedValue({
            id: columnId,
            slug: columnSlug,
          });

          // Mock: article exists (for addArticle's article check)
          (prismaService as any).article = {
            findUnique: jest.fn().mockResolvedValue({ id: articleId }),
          };

          // First call: no existing association → create succeeds
          (prismaService as any).columnArticle = {
            findUnique: jest.fn().mockResolvedValueOnce(null),
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({
              id: 'ca-1',
              columnId,
              articleId,
              sortOrder: 0,
            }),
          };

          // First addArticle call should succeed
          await service.addArticle(columnId, { articleId });

          // Verify create was called once
          expect((prismaService as any).columnArticle.create).toHaveBeenCalledTimes(1);

          // Second call: association already exists → ConflictException
          (prismaService as any).columnArticle.findUnique = jest
            .fn()
            .mockResolvedValue({
              id: 'ca-1',
              columnId,
              articleId,
              sortOrder: 0,
            });

          // Reset create mock to track second call
          (prismaService as any).columnArticle.create = jest.fn();

          let thrownError: Error | null = null;
          try {
            await service.addArticle(columnId, { articleId });
          } catch (error) {
            thrownError = error as Error;
          }

          // Verify ConflictException is thrown (409)
          expect(thrownError).toBeInstanceOf(ConflictException);
          expect(thrownError?.message).toBe('Article already in column');

          // Verify create was NOT called on the second attempt (list unchanged)
          expect((prismaService as any).columnArticle.create).not.toHaveBeenCalled();
        }),
        { numRuns: 100 },
      );
    });
  });

  // Feature: blog-columns, Property 11: Cache invalidation on column mutations
  // **Validates: Requirements 8.5, 8.6, 8.7**
  describe('Property 11: Cache invalidation on column mutations', () => {
    const mutationTypeArb = fc.constantFrom(
      'create' as const,
      'update' as const,
      'remove' as const,
      'addArticle' as const,
      'removeArticle' as const,
      'reorderArticles' as const,
      'invalidateCacheByArticleId' as const,
    );

    const slugArb = fc
      .stringMatching(/^[a-z0-9][a-z0-9-]{0,18}[a-z0-9]$/)
      .filter((s) => !s.includes('--') && s.length >= 2 && s.length <= 20);

    const titleArb = fc
      .string({ minLength: 1, maxLength: 50 })
      .filter((s) => s.trim().length > 0);

    it('should invalidate correct cache keys for any column mutation type', async () => {
      await fc.assert(
        fc.asyncProperty(
          mutationTypeArb,
          slugArb,
          titleArb,
          fc.uuid(),
          fc.uuid(),
          async (mutationType, slug, title, columnId, articleId) => {
            // Reset cache mock before each iteration
            (cacheService.del as jest.Mock).mockClear();

            const now = new Date();

            // Setup common mocks for all mutation types
            (prismaService.column.findUnique as jest.Mock).mockReset();

            switch (mutationType) {
              case 'create': {
                (prismaService.column.findUnique as jest.Mock).mockResolvedValueOnce(null);
                (prismaService.column.create as jest.Mock).mockResolvedValueOnce({
                  id: columnId,
                  title,
                  slug,
                  description: null,
                  coverImage: null,
                  sortOrder: 0,
                  status: 'draft',
                  createdAt: now,
                  updatedAt: now,
                });

                await service.create({ title, slug });

                // create should invalidate PUBLIC_COLUMNS
                expect(cacheService.del).toHaveBeenCalledWith(
                  CacheKeyRegistry.PUBLIC_COLUMNS,
                );
                break;
              }

              case 'update': {
                (prismaService.column.findUnique as jest.Mock).mockResolvedValueOnce({
                  id: columnId,
                  slug,
                  _count: { articles: 0 },
                });
                (prismaService.column.update as jest.Mock) = jest.fn().mockResolvedValueOnce({
                  id: columnId,
                  title,
                  slug,
                  description: null,
                  coverImage: null,
                  sortOrder: 0,
                  status: 'published',
                  createdAt: now,
                  updatedAt: now,
                });

                await service.update(columnId, { title });

                // update should invalidate PUBLIC_COLUMNS + publicColumnDetail(slug)
                expect(cacheService.del).toHaveBeenCalledWith(
                  CacheKeyRegistry.PUBLIC_COLUMNS,
                );
                expect(cacheService.del).toHaveBeenCalledWith(
                  CacheKeyRegistry.publicColumnDetail(slug),
                );
                break;
              }

              case 'remove': {
                (prismaService.column.findUnique as jest.Mock).mockResolvedValueOnce({
                  id: columnId,
                  slug,
                });
                (prismaService.column.delete as jest.Mock) = jest.fn().mockResolvedValueOnce({
                  id: columnId,
                });

                await service.remove(columnId);

                // remove should invalidate PUBLIC_COLUMNS + publicColumnDetail(slug)
                expect(cacheService.del).toHaveBeenCalledWith(
                  CacheKeyRegistry.PUBLIC_COLUMNS,
                );
                expect(cacheService.del).toHaveBeenCalledWith(
                  CacheKeyRegistry.publicColumnDetail(slug),
                );
                break;
              }

              case 'addArticle': {
                (prismaService.column.findUnique as jest.Mock).mockResolvedValueOnce({
                  id: columnId,
                  slug,
                });
                (prismaService as any).article = {
                  findUnique: jest.fn().mockResolvedValue({ id: articleId }),
                };
                (prismaService as any).columnArticle = {
                  findUnique: jest.fn().mockResolvedValue(null),
                  findFirst: jest.fn().mockResolvedValue(null),
                  create: jest.fn().mockResolvedValue({
                    id: 'ca-new',
                    columnId,
                    articleId,
                    sortOrder: 0,
                  }),
                };

                await service.addArticle(columnId, { articleId });

                // addArticle should invalidate PUBLIC_COLUMNS + publicColumnDetail(slug)
                expect(cacheService.del).toHaveBeenCalledWith(
                  CacheKeyRegistry.PUBLIC_COLUMNS,
                );
                expect(cacheService.del).toHaveBeenCalledWith(
                  CacheKeyRegistry.publicColumnDetail(slug),
                );
                break;
              }

              case 'removeArticle': {
                (prismaService.column.findUnique as jest.Mock).mockResolvedValueOnce({
                  id: columnId,
                  slug,
                });
                (prismaService as any).columnArticle = {
                  findUnique: jest.fn().mockResolvedValue({
                    id: 'ca-existing',
                    columnId,
                    articleId,
                    sortOrder: 0,
                  }),
                  delete: jest.fn().mockResolvedValue({}),
                };

                await service.removeArticle(columnId, articleId);

                // removeArticle should invalidate PUBLIC_COLUMNS + publicColumnDetail(slug)
                expect(cacheService.del).toHaveBeenCalledWith(
                  CacheKeyRegistry.PUBLIC_COLUMNS,
                );
                expect(cacheService.del).toHaveBeenCalledWith(
                  CacheKeyRegistry.publicColumnDetail(slug),
                );
                break;
              }

              case 'reorderArticles': {
                const articleId2 = `art-${articleId.slice(0, 8)}`;
                (prismaService.column.findUnique as jest.Mock).mockResolvedValueOnce({
                  id: columnId,
                  slug,
                });
                (prismaService as any).columnArticle = {
                  findMany: jest.fn().mockResolvedValue([
                    { articleId },
                    { articleId: articleId2 },
                  ]),
                  update: jest.fn().mockResolvedValue({}),
                };

                await service.reorderArticles(columnId, {
                  articleIds: [articleId2, articleId],
                });

                // reorderArticles should invalidate PUBLIC_COLUMNS + publicColumnDetail(slug)
                expect(cacheService.del).toHaveBeenCalledWith(
                  CacheKeyRegistry.PUBLIC_COLUMNS,
                );
                expect(cacheService.del).toHaveBeenCalledWith(
                  CacheKeyRegistry.publicColumnDetail(slug),
                );
                break;
              }

              case 'invalidateCacheByArticleId': {
                const slug2 = `${slug}-2`.slice(0, 20);
                (prismaService as any).columnArticle = {
                  ...(prismaService as any).columnArticle,
                  findMany: jest.fn().mockResolvedValue([
                    { column: { slug } },
                    { column: { slug: slug2 } },
                  ]),
                };

                await service.invalidateCacheByArticleId(articleId);

                // invalidateCacheByArticleId should invalidate PUBLIC_COLUMNS + all related column detail caches
                expect(cacheService.del).toHaveBeenCalledWith(
                  CacheKeyRegistry.PUBLIC_COLUMNS,
                );
                expect(cacheService.del).toHaveBeenCalledWith(
                  CacheKeyRegistry.publicColumnDetail(slug),
                );
                expect(cacheService.del).toHaveBeenCalledWith(
                  CacheKeyRegistry.publicColumnDetail(slug2),
                );
                break;
              }
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
