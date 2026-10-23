#!/usr/bin/env node

import { createApp } from './server';
import { printVersionAndExit } from './version';

const DEFAULT_PORT = 9001;

const args = process.argv.slice(2);
if (args.includes('--version')) {
  printVersionAndExit();
}

createApp({ port: DEFAULT_PORT }).listen(DEFAULT_PORT, () => {
  console.log(`MetaCall Launchpad is running at http://localhost:${DEFAULT_PORT}`);
});
