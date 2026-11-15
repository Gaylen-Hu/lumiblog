import { Test } from '@nestjs/testing';
import { PublicService } from '../public.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SiteConfigService } from '../../site-config/site-config.service';
import { BlogCacheService } from '../../redis';

describe('read-only public article context for companion', () => {
  const published = {
    slug: 'sample',
    locale: 'zh-CN',
    title: '公开文章',
    content: '# 标题\n正文',
    isPublished: true,
  };
  const unpublished = { ...published, slug: 'private', isPublished: false };
  const rows = [published, unpublished];
  const findFirst = jest.fn(
    ({
      where,
    }: {
      where: { slug: string; isPublished: boolean; locale: { in: string[] } };
    }) => {
      const row = rows.find(
        (item) =>
          item.slug === where.slug &&
          item.isPublished === where.isPublished &&
          where.locale.in.includes(item.locale),
      );
      return Promise.resolve(
        row
          ? {
              slug: row.slug,
              locale: row.locale,
              title: row.title,
              content: row.content,
            }
          : null,
      );
    },
  );
  const update = jest.fn();
  let service: PublicService;
  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        PublicService,
        {
          provide: PrismaService,
          useValue: { article: { findFirst, update } },
        },
        { provide: SiteConfigService, useValue: {} },
        { provide: BlogCacheService, useValue: {} },
      ],
    }).compile();
    service = module.get(PublicService);
  });

  it('selects only grounding fields, normalizes locale, and never counts another page view', async () => {
    await expect(
      service.getArticleForCompanion('sample', 'zh'),
    ).resolves.toEqual({
      slug: 'sample',
      locale: 'zh',
      title: '公开文章',
      content: '# 标题\n正文',
    });
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        slug: 'sample',
        isPublished: true,
        locale: { in: ['zh', 'zh-CN'] },
      },
      select: { slug: true, title: true, locale: true, content: true },
    });
    expect(update).not.toHaveBeenCalled();
  });

  it('never resolves unpublished, missing, or another language through a fallback query', async () => {
    for (const [slug, locale] of [
      ['private', 'zh'],
      ['missing', 'zh'],
      ['sample', 'en'],
    ] as const) {
      await expect(
        service.getArticleForCompanion(slug, locale),
      ).resolves.toBeNull();
    }
    expect(findFirst).toHaveBeenCalledTimes(3);
    expect(update).not.toHaveBeenCalled();
  });
});
