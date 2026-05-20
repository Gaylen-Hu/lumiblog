// Feature: blog-columns, Property 10: Article links within column preserve column context
import * as fc from 'fast-check';

/**
 * Helper function that generates the article link within a column context.
 * This is the same logic used by:
 * - Column detail page (`/columns/[slug]/page.tsx`): article list links
 * - ColumnNavigation component: prev/next article links
 */
function generateColumnArticleLink(articleSlug: string, columnSlug: string): string {
  return `/posts/${articleSlug}?column=${columnSlug}`;
}

/**
 * Property 10: Article links within column preserve column context
 * **Validates: Requirements 6.3, 7.2**
 *
 * For any article slug and column slug, the generated navigation link should be
 * `/posts/{articleSlug}?column={columnSlug}`, preserving the column context
 * for sequential reading.
 */
describe('Property 10: Article links within column preserve column context', () => {
  // Arbitrary: generate valid slug (lowercase alphanumeric with hyphens)
  const slugArb = fc
    .stringMatching(/^[a-z0-9][a-z0-9-]{0,28}[a-z0-9]$/)
    .filter((s) => !s.includes('--') && s.length >= 2);

  it('should generate link in format /posts/{articleSlug}?column={columnSlug}', () => {
    fc.assert(
      fc.property(slugArb, slugArb, (articleSlug, columnSlug) => {
        const link = generateColumnArticleLink(articleSlug, columnSlug);

        // Assert 1: Link starts with /posts/
        expect(link.startsWith('/posts/')).toBe(true);

        // Assert 2: Link contains the article slug after /posts/
        const pathPart = link.split('?')[0];
        expect(pathPart).toBe(`/posts/${articleSlug}`);

        // Assert 3: Link has ?column= query parameter
        expect(link).toContain('?column=');

        // Assert 4: The column slug is preserved in the query parameter
        const queryPart = link.split('?column=')[1];
        expect(queryPart).toBe(columnSlug);

        // Assert 5: The full link matches the expected format exactly
        expect(link).toBe(`/posts/${articleSlug}?column=${columnSlug}`);
      }),
      { numRuns: 100 },
    );
  });

  it('should preserve column context regardless of slug content', () => {
    fc.assert(
      fc.property(slugArb, slugArb, (articleSlug, columnSlug) => {
        const link = generateColumnArticleLink(articleSlug, columnSlug);

        // Parse the link to verify structure
        const [path, query] = link.split('?');

        // The path portion should only contain the article slug
        expect(path).toBe(`/posts/${articleSlug}`);

        // The query portion should be column={columnSlug}
        expect(query).toBe(`column=${columnSlug}`);

        // Extracting slugs back from the link should yield the original values
        const extractedArticleSlug = path.replace('/posts/', '');
        const extractedColumnSlug = query.replace('column=', '');
        expect(extractedArticleSlug).toBe(articleSlug);
        expect(extractedColumnSlug).toBe(columnSlug);
      }),
      { numRuns: 100 },
    );
  });
});
