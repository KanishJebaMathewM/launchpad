import { describe, it, expect } from 'vitest';
import { buildJson } from '@/features/deployments/components/DeployWizard/metacallConfig';

describe('buildJson', () => {
  it('produces valid JSON that keeps file names with quotes, backslashes and control characters', () => {
    const files = ['src/say "hi".js', 'lib\\x.js', 'a\\b.js', 'dir\\new.js', 'tab\there.js'];
    const parsed = JSON.parse(buildJson('node', files));
    expect(parsed).toEqual({ language_id: 'node', path: '.', scripts: files });
  });

  it('keeps the existing 2-space layout', () => {
    expect(buildJson('py', ['main.py'])).toBe(
      '{\n  "language_id": "py",\n  "path": ".",\n  "scripts": [\n    "main.py"\n  ]\n}',
    );
  });

  it('renders an empty scripts array', () => {
    expect(buildJson('node', [])).toBe(
      '{\n  "language_id": "node",\n  "path": ".",\n  "scripts": []\n}',
    );
  });
});
