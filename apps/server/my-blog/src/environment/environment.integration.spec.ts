import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import request from 'supertest';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EnvironmentConfigController, EnvironmentConfigService } from './environment-config';

const connection = process.env.ENVIRONMENT_INTEGRATION_URL;
const suite = connection ? describe : describe.skip;
suite('environment migration and HTTP configuration in disposable database', () => {
  let app: INestApplication;
  let db: PrismaClient, admin: PrismaClient;
  const schema = 'environment_test_' + Date.now();
  beforeAll(async () => {
    const url = new URL(connection!);
    if (!['localhost','127.0.0.1'].includes(url.hostname) || url.pathname !== '/environment_test') throw Error('Only the explicit disposable localhost environment_test database is permitted');
    admin = new PrismaClient({datasources:{db:{url:connection}}});
    await admin.$executeRawUnsafe('CREATE SCHEMA "'+schema+'"');
    url.searchParams.set('schema',schema);
    db = new PrismaClient({datasources:{db:{url:url.toString()}}});
    await db.$executeRawUnsafe(await readFile(resolve(__dirname,'../../prisma/migrations/20261105140000_environment_config/migration.sql'),'utf8'));
    // Authentication token verification belongs to auth tests. Here identity is injected,
    // while controller role authorization and persistence execute against real PostgreSQL.
    await db.$executeRawUnsafe('CREATE TABLE users (id TEXT PRIMARY KEY, role TEXT NOT NULL)');
    await db.$executeRawUnsafe("INSERT INTO users VALUES ('admin','ADMIN'),('editor','EDITOR')");
    const module = await Test.createTestingModule({
      controllers:[EnvironmentConfigController],
      providers:[EnvironmentConfigService,{provide:PrismaService,useValue:db}],
    }).overrideGuard(JwtAuthGuard).useValue({
      canActivate(context: {switchToHttp:()=>{getRequest:()=>{headers:Record<string,string>;user?:{userId:string}}}}) {
        const req=context.switchToHttp().getRequest();
        if(!req.headers['x-test-user']) return false;
        req.user={userId:req.headers['x-test-user']}; return true;
      },
    }).compile();
    app=module.createNestApplication();
    app.enableVersioning({type:VersioningType.URI});
    app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true}));
    await app.init();
  },30000);
  afterAll(async () => {
    await app?.close(); await db?.$disconnect();
    if(admin && /^environment_test_[0-9]+$/.test(schema)) {
      await admin.$executeRawUnsafe('DROP SCHEMA IF EXISTS "'+schema+'" CASCADE'); await admin.$disconnect();
    }
  });
  it('persists valid admin changes, increments revision, rejects editors and invalid input',async()=>{
    const endpoint='/v1/environment-config';
    const initial=await request(app.getHttpServer()).get(endpoint).set('x-test-user','admin').expect(200);
    expect(initial.body.city).toBe('杭州');
    const values={city:'上海',timezone:'Asia/Shanghai',latitude:31.23,longitude:121.47,preset:'rainy-night'};
    await request(app.getHttpServer()).patch(endpoint).set('x-test-user','editor').send(values).expect(403);
    await request(app.getHttpServer()).patch(endpoint).send(values).expect(403);
    await request(app.getHttpServer()).patch(endpoint).set('x-test-user','admin').send({...values,latitude:100}).expect(400);
    const first=await request(app.getHttpServer()).patch(endpoint).set('x-test-user','admin').send(values).expect(200);
    const second=await request(app.getHttpServer()).patch(endpoint).set('x-test-user','admin').send({...values,preset:'auto'}).expect(200);
    expect(second.body.revision).toBe(first.body.revision+1);
    expect(await db.environmentConfig.count()).toBe(1);
    expect(await db.environmentConfig.findUnique({where:{id:'default'}})).toMatchObject({...values,preset:'auto'});
    expect(await new EnvironmentConfigService(db as PrismaService).read()).toMatchObject({city:'上海',preset:'auto'});
  });
});
