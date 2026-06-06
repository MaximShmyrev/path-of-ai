/* Гвард UI-языка (SPEC §8): сцены не хардкодят текст — он только в ru.ts;
   значения ru.ts — на русском. */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { ru } from './ru';

const SRC = join(process.cwd(), 'src');
const SCENE_FILES = [
  'App.tsx',
  'scenes/CharacterCreation.tsx',
  'scenes/WorldMapScene.tsx',
  'scenes/LocationView.tsx',
  'scenes/QuestView.tsx',
  'scenes/EventDialog.tsx',
];

function leaves(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (value !== null && typeof value === 'object') {
    return Object.values(value).flatMap(leaves);
  }
  return [];
}

describe('UI-язык', () => {
  it('сцены не содержат хардкод-текста (только через ru.ts)', () => {
    const offenders = SCENE_FILES.filter((file) =>
      /[а-яА-Я]/.test(readFileSync(join(SRC, file), 'utf8')),
    );
    expect(offenders).toEqual([]);
  });

  it('значения словаря — на русском', () => {
    const nonRussian = leaves(ru).filter((text) => !/[а-яА-Я]/.test(text));
    expect(nonRussian).toEqual([]);
  });
});
