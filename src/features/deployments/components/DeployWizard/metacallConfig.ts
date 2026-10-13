export interface McConfig {
  key: number;
  languageId: string;
  files: string[];
}

export function buildJson(languageId: string, files: string[]): string {
  return JSON.stringify({ language_id: languageId, path: '.', scripts: files }, null, 2);
}
