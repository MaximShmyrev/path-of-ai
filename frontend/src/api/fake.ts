/* In-memory тестовый двойник ApiClient (для тестов UI и локального превью). */

import type {
  ApiClient,
  CompleteView,
  CreateHeroInput,
  EventView,
  HeroView,
  MapView,
  TopicView,
} from './types';

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
          },
          { id: 'model-evaluation', title: 'Оценка моделей', status: 'locked' },
        ],
      },
      {
        id: 'llm',
        title: 'Цитадель LLM',
        unlock_level: 2,
        status: level >= 2 ? 'open' : 'locked',
        topics: [
          { id: 'transformers', title: 'Трансформеры', status: 'locked' },
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
          id: `${topicId}-practice`,
          title: 'Испытание',
          kind: 'practice',
          xp: 150,
          quiz: [{ prompt: 'Вопрос?', options: ['Да', 'Нет'] }],
        },
      ],
    };
  }

  async completeQuest(
    _questId: string,
    _answers?: number[],
  ): Promise<CompleteView> {
    const hero =
      this.hero ?? (await this.createHero({ name: 'Герой', classId: 'x' }));
    return {
      gained_xp: 150,
      leveled_up: false,
      new_level: hero.level,
      newly_unlocked_regions: [],
      already_completed: false,
      hero,
    };
  }

  async generateEvent(_locationId: string): Promise<EventView> {
    return { text: 'Туман рассеивается перед героем.', source: 'bank' };
  }
}
