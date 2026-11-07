const { readFileSync } = require('node:fs');
const { parseEnv } = require('node:util');
const { resolve } = require('node:path');
const config = process.argv[2];
if (!config) throw Error('Pass the private preview configuration file outside the repository');
Object.assign(process.env, parseEnv(readFileSync(resolve(config), 'utf8')));
require('ts-node/register');
require('./environment-preview.ts');
