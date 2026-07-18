/* Производные read-модели для панелей персонажа — из данных карты (MapView).
   Без бэкенда: компетенции и артефакты считаются из статусов тем. */

import type { MapView } from '../api/types';

/** Короткие подписи регионов для радара/дерева. */
export const REGION_SHORT: Record<string, string> = {
  'ml-foundations': 'ML',
  llm: 'LLM',
  rag: 'RAG',
  agents: 'Агенты',
};

export function regionShort(id: string, fallback: string): string {
  return REGION_SHORT[id] ?? fallback;
}

/** Лор-имена земель (WORLD.md) для карты в стиле Средиземья. */
export const REGION_LORE: Record<string, string> = {
  'ml-foundations': 'Долина Первознания',
  llm: 'Цитадель Велеречья',
  rag: 'Свитколесье',
  agents: 'Железный Предел',
};

/** Позиции земель на карте (% от полотна), путь запад→восток. */
export const REGION_POS: Record<string, { x: number; y: number }> = {
  'ml-foundations': { x: 5, y: 12 },
  llm: { x: 33, y: 48 },
  rag: { x: 60, y: 13 },
  agents: { x: 78, y: 52 },
};

export function regionPos(id: string, index: number): { x: number; y: number } {
  return REGION_POS[id] ?? { x: 6 + index * 23, y: 28 };
}

export type Competency = {
  regionId: string;
  label: string;
  title: string;
  done: number;
  total: number;
  value: number; // 0..1
};

export function competencies(map: MapView): Competency[] {
  return map.regions.map((r) => {
    const total = r.topics.length;
    const done = r.topics.filter((t) => t.status === 'completed').length;
    return {
      regionId: r.id,
      label: regionShort(r.id, r.title),
      title: r.title,
      done,
      total,
      value: total > 0 ? done / total : 0,
    };
  });
}

export type Artifact = {
  id: string;
  title: string;
  regionId: string;
};

/** Трофеи за пройденные темы (артефакты инвентаря). */
export function artifacts(map: MapView): Artifact[] {
  return map.regions.flatMap((r) =>
    r.topics
      .filter((t) => t.status === 'completed')
      .map((t) => ({ id: t.id, title: t.title, regionId: r.id })),
  );
}
