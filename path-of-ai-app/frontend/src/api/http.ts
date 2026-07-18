/* HTTP-реализация ApiClient (fetch). Базовый URL — из VITE_API_URL. */

import type {
  ApiClient,
  CompleteView,
  CreateHeroInput,
  EventView,
  HeroView,
  MapView,
  TopicView,
} from './types';

const BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  'http://localhost:8000';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!response.ok) {
    throw new ApiError(response.status, await safeDetail(response));
  }
  return (await response.json()) as T;
}

async function safeDetail(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: string };
    return body.detail ?? response.statusText;
  } catch {
    return response.statusText;
  }
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    detail: string,
  ) {
    super(detail);
    this.name = 'ApiError';
  }
}

export class HttpApiClient implements ApiClient {
  async createHero(input: CreateHeroInput): Promise<HeroView> {
    return request<HeroView>('/api/hero', {
      method: 'POST',
      body: JSON.stringify({
        name: input.name,
        class_id: input.classId,
        avatar_ref: input.avatarRef ?? null,
      }),
    });
  }

  async getHero(): Promise<HeroView | null> {
    try {
      return await request<HeroView>('/api/hero');
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async getMap(): Promise<MapView> {
    return request<MapView>('/api/map');
  }

  async getTopic(topicId: string): Promise<TopicView> {
    return request<TopicView>(`/api/topics/${topicId}`);
  }

  async completeQuest(
    questId: string,
    answers?: number[],
  ): Promise<CompleteView> {
    return request<CompleteView>(`/api/quests/${questId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ answers: answers ?? null }),
    });
  }

  async generateEvent(locationId: string): Promise<EventView> {
    return request<EventView>(`/api/locations/${locationId}/event`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }
}
