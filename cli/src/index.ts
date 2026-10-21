#!/usr/bin/env node

import { printVersionAndExit } from './version';

const args = process.argv.slice(2);
if (args.includes('--version')) {
  printVersionAndExit();
}
