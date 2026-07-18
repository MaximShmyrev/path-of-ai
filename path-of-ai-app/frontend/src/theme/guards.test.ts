/* Мета-тесты визуального критерия (SPEC §8). Читаем исходники напрямую через fs.

   Политика по растру (уточнена при переходе на Diablo II UI): растровые
   текстуры хрома (пергамент, камень HUD, фон карты) разрешены, но подключаются
   ТОЛЬКО через манифест/резолвер (resolveAsset → assetManifest.json) и
   CSS-переменные --tex-*, а не литералом в .ts/.tsx/.css. Поэтому тест ниже
   по-прежнему запрещает хардкод растровых расширений в исходниках — это ловит
   случайные `url(foo.webp)` / `import 'x.png'`, оставляя легальным
   манифест-driven путь (manifest.json в выборку walk() не попадает). */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const SRC = join(process.cwd(), 'src');

function walk(dir: string): string[] {
  const result: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...walk(full));
    } else if (/\.(ts|tsx|css)$/.test(entry.name)) {
      result.push(full);
    }
  }
  return result;
}

const files = walk(SRC).map(
  (path) => [path, readFileSync(path, 'utf8')] as const,
);

const isTest = (path: string) => /\.test\.(ts|tsx)$/.test(path);
const isTokens = (path: string) => path.endsWith('tokens.css');

describe('Визуальные гварды', () => {
  it('нет хардкод-hex цветов вне tokens.css', () => {
    const offenders = files
      .filter(([path]) => !isTokens(path) && !isTest(path))
      .filter(([, content]) => /#[0-9a-fA-F]{3,8}\b/.test(content))
      .map(([path]) => path);
    expect(offenders).toEqual([]);
  });

  it('нет растровых ассетов в хроме (только SVG/CSS)', () => {
    const offenders = files
      .filter(([path]) => !isTest(path))
      .filter(([, content]) => /\.(png|jpe?g|gif|webp)\b/i.test(content))
      .map(([path]) => path);
    expect(offenders).toEqual([]);
  });

  it('палитра и токены определены в tokens.css', () => {
    const tokens = files.find(([path]) => isTokens(path))?.[1] ?? '';
    expect(tokens).toContain('--color-gold');
    expect(tokens).toContain('--font-heading');
  });
});
