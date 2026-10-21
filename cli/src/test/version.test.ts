import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { test } from 'node:test';

const entry = join(__dirname, '..', 'index.js');

test('--version prints the package version and exits 0', () => {
  const result = spawnSync(process.execPath, [entry, '--version'], { encoding: 'utf8' });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout.trim(), /^v\d+\.\d+\.\d+$/);
});
