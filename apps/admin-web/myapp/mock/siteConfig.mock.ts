import { Request, Response } from 'express';

let siteConfig = {
  id: '1',
  title: 'NOVA - 探索技术与设计的前沿',
  description: '以极简主义的视角，探索技术、设计与人类潜能的前沿。',
  keywords: '技术,设计,博客,前端,后端',
  logo: null,
  favicon: null,
  icp: null,
  gongan: null,
  copyright: '© 2024 NOVA. All rights reserved.',
  analytics: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: new Date().toISOString(),
};

export default {
  'GET /api/site-config': (_req: Request, res: Response) => {
    res.json(siteConfig);
  },

  'PUT /api/site-config': (req: Request, res: Response) => {
    siteConfig = {
      ...siteConfig,
      ...req.body,
      updatedAt: new Date().toISOString(),
    };
    res.json(siteConfig);
  },
};
