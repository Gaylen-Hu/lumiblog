import type { Request, Response } from 'express';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export type CompanionEnvironment = Record<string, string>;
export interface CompanionArticleRequest {
  slug: string;
  locale: 'zh' | 'en';
}
export interface CompanionArticle extends CompanionArticleRequest {
  title: string;
  content: string;
}
export type CompanionArticleResolver = (
  request: CompanionArticleRequest,
) => Promise<CompanionArticle | null>;
export type CompanionHandler = ((
  request: Request,
  response: Response,
) => Promise<boolean>) & {
  ready: Promise<void>;
  close(): Promise<void>;
};

export type CompanionEngineFactory = (
  env: CompanionEnvironment,
  apiPrefix: string,
  resolveArticle?: CompanionArticleResolver,
) => Promise<CompanionHandler>;

interface EngineModule {
  createAgentHandler(options: {
    env: CompanionEnvironment;
    apiPrefix: string;
    resolveArticle?: CompanionArticleResolver;
  }): CompanionHandler;
}

// This is a local, versioned part of the Nest application, copied into dist by
// nest-cli.json. No HTTP sidecar, pet checkout or _artifacts path is required.
export const loadCompanionEngine: CompanionEngineFactory = async (
  env,
  apiPrefix,
  resolveArticle,
) => {
  const filename = pathToFileURL(
    join(__dirname, 'runtime', 'agent-handler.mjs'),
  ).href;
  const engine = (await import(filename)) as EngineModule;
  return engine.createAgentHandler({ env, apiPrefix, resolveArticle });
};
