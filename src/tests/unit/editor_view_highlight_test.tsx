import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { EditorView } from '@/features/deployments/components/DeployWizard/EditorView';

function renderPreview(selectedFiles: string[]) {
  const { container } = render(
    <EditorView selectedFiles={selectedFiles} onDeselectFiles={() => {}} />,
  );
  const texts = (cls: string) =>
    [...container.querySelectorAll(`.${cls}`)].map(el => el.textContent ?? '');
  return { green: texts('text-green-600'), blue: texts('text-blue-600') };
}

describe('EditorView preview highlighting', () => {
  it('colours a whole file name that contains an escaped quote', () => {
    const { green } = renderPreview(['index.js', 'say "hi".js']);
    expect(green).toContain('    "say \\"hi\\".js"');
  });

  it('does not colour part of a file name as a key', () => {
    const { green, blue } = renderPreview(['index.js', 'a": b.js']);
    expect(blue).toEqual(['"language_id"', '"path"', '"scripts"']);
    expect(green).toContain('    "a\\": b.js"');
  });

  it('keeps ordinary keys and values coloured as before', () => {
    const { green, blue } = renderPreview(['index.js']);
    expect(blue).toEqual(['"language_id"', '"path"', '"scripts"']);
    expect(green).toEqual([': "node"', ': "."', '    "index.js"']);
  });
});
