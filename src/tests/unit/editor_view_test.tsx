import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { EditorView } from '@/features/deployments/components/DeployWizard/EditorView';
import type { McConfig } from '@/features/deployments/components/DeployWizard/metacallConfig';

function renderAndCapture(selectedFiles: string[]): McConfig[] {
  let configs: McConfig[] = [];
  render(
    <EditorView
      selectedFiles={selectedFiles}
      onDeselectFiles={() => {}}
      onConfigsChange={c => (configs = c)}
    />,
  );
  return configs;
}

describe('EditorView language grouping', () => {
  it('does not list non-script files as Node.js scripts', () => {
    const configs = renderAndCapture(['index.js', 'README.md', 'package.json', 'logo.png']);
    expect(configs).toEqual([{ key: -1, languageId: 'node', files: ['index.js'] }]);
  });

  it('groups script files by language', () => {
    const configs = renderAndCapture(['main.py', 'index.js', 'util.py']);
    expect(configs.map(c => [c.languageId, c.files])).toEqual([
      ['py', ['main.py', 'util.py']],
      ['node', ['index.js']],
    ]);
  });

  it('puts .tsx files in the TypeScript config', () => {
    const configs = renderAndCapture(['index.js', 'App.tsx', 'README.md']);
    expect(configs.map(c => [c.languageId, c.files])).toEqual([
      ['node', ['index.js']],
      ['ts', ['App.tsx']],
    ]);
  });

  it('falls back to one empty Node.js config when only non-script files are selected', () => {
    expect(renderAndCapture(['README.md', 'package.json'])).toEqual([
      { key: -1, languageId: 'node', files: [] },
    ]);
  });
});
