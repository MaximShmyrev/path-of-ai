/* In-memory тестовый двойник ApiClient (для тестов UI и локального превью). */

import { ApiError } from './http';
import type {
  ApiClient,
  CompleteView,
  CreateHeroInput,
  EventView,
  HeroView,
  MapView,
  TopicView,
} from './types';

// Упрощённая кривая уровней для двойника (бэкенд считает точно).
function levelForXp(xp: number): number {
  if (xp >= 400) return 3;
  if (xp >= 100) return 2;
  return 1;
}

function sampleMap(level: number): MapView {
  return {
    level,
    regions: [
      {
        id: 'ml-foundations',
        title: 'Долина основ ML',
        unlock_level: 1,
        status: 'open',
        topics: [
          {
            id: 'supervised-basics',
            title: 'Обучение с учителем',
            status: 'available',
            prerequisites: [],
          },
          {
            id: 'model-evaluation',
            title: 'Оценка моделей',
            status: 'locked',
            prerequisites: ['supervised-basics'],
          },
        ],
      },
      {
        id: 'llm',
        title: 'Цитадель LLM',
        unlock_level: 2,
        status: level >= 2 ? 'open' : 'locked',
        topics: [
          {
            id: 'transformers',
            title: 'Трансформеры',
            status: 'locked',
            prerequisites: ['model-evaluation'],
          },
        ],
      },
    ],
  };
}

export class FakeApiClient implements ApiClient {
  private hero: HeroView | null = null;

  async createHero(input: CreateHeroInput): Promise<HeroView> {
    if (this.hero !== null) {
      throw new Error('Герой уже существует');
    }
    this.hero = {
      name: input.name,
      class_id: input.classId,
      avatar_ref: input.avatarRef ?? null,
      level: 1,
      total_xp: 0,
      xp_to_next_level: 100,
    };
    return this.hero;
  }

  async getHero(): Promise<HeroView | null> {
    return this.hero;
  }

  async getMap(): Promise<MapView> {
    return sampleMap(this.hero?.level ?? 1);
  }

  async getTopic(topicId: string): Promise<TopicView> {
    return {
      id: topicId,
      title: 'Обучение с учителем',
      status: 'available',
      quests: [
        {
          id: `${topicId}-theory`,
          title: 'Свиток теории',
          kind: 'theory',
          xp: 50,
          body: '## Урок\nОбучение с учителем учится по размеченным примерам.',
          quiz: [],
        },
        {
          id: `${topicId}-practice`,
          title: 'Испытание',
          kind: 'practice',
          xp: 150,
          body: '',
          quiz: [
            {
              prompt: 'Вопрос?',
              options: ['Да', 'Нет'],
              explanation: 'Потому что «Да» — верный ответ.',
            },
          ],
        },
      ],
    };
  }

  async completeQuest(
    _questId: string,
    answers?: number[],
  ): Promise<CompleteView> {
    // Эталон квиза — первый вариант (индекс 0). Иначе 422 (как у бэкенда).
    if (answers !== undefined && answers.some((value) => value !== 0)) {
      throw new ApiError(422, 'Неверные ответы на квиз');
    }
    if (this.hero === null) {
      await this.createHero({ name: 'Герой', classId: 'data-alchemist' });
    }
    const current = this.hero as HeroView;
    const oldLevel = current.level;
    const totalXp = current.total_xp + 150;
    const level = levelForXp(totalXp);
    this.hero = {
      ...current,
      total_xp: totalXp,
      level,
      xp_to_next_level: Math.max(0, (level === 1 ? 100 : 400) - totalXp),
    };
    return {
      gained_xp: 150,
      leveled_up: level > oldLevel,
      new_level: level,
      newly_unlocked_regions: level >= 2 ? ['llm'] : [],
      already_completed: false,
      hero: this.hero,
    };
  }

  async generateEvent(_locationId: string): Promise<EventView> {
    return { text: 'Туман рассеивается перед героем.', source: 'bank' };
  }
}
