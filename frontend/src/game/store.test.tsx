import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { FakeApiClient } from '../api/fake';
import { ApiError } from '../api/http';
import { GameProvider, useGame } from './store';

function wrapper(api: FakeApiClient) {
  return ({ children }: { children: ReactNode }) => (
    <GameProvider api={api}>{children}</GameProvider>
  );
}

describe('gameStore', () => {
  it('без героя показывает экран создания', async () => {
    const { result } = renderHook(() => useGame(), {
      wrapper: wrapper(new FakeApiClient()),
    });
    await waitFor(() => expect(result.current.state.screen).toBe('create'));
  });

  it('создание героя переводит на карту', async () => {
    const { result } = renderHook(() => useGame(), {
      wrapper: wrapper(new FakeApiClient()),
    });
    await waitFor(() => expect(result.current.state.screen).toBe('create'));
    await act(async () => {
      await result.current.createHero('Артур', 'model-mage');
    });
    expect(result.current.state.screen).toBe('map');
    expect(result.current.state.hero?.name).toBe('Артур');
    expect(result.current.state.map).not.toBeNull();
  });

  it('существующий герой сразу открывает карту', async () => {
    const api = new FakeApiClient();
    await api.createHero({ name: 'Мерлин', classId: 'model-mage' });
    const { result } = renderHook(() => useGame(), { wrapper: wrapper(api) });
    await waitFor(() => expect(result.current.state.screen).toBe('map'));
    expect(result.current.state.hero?.name).toBe('Мерлин');
  });

  it('прохождение квеста: level-up и сброс оверлеев/событий', async () => {
    const api = new FakeApiClient();
    await api.createHero({ name: 'Артур', classId: 'model-mage' });
    const { result } = renderHook(() => useGame(), { wrapper: wrapper(api) });
    await waitFor(() => expect(result.current.state.screen).toBe('map'));

    await act(async () => {
      await result.current.enterTopic('supervised-basics');
    });
    const questId = result.current.state.topic!.quests[0]!.id;
    await act(async () => {
      await result.current.submitQuest('supervised-basics', questId, [0]);
    });
    expect(result.current.state.levelUpLevel).toBe(2);

    act(() => result.current.dismissLevelUp());
    expect(result.current.state.levelUpLevel).toBeNull();

    await act(async () => {
      await result.current.requestEvent('supervised-basics');
    });
    expect(result.current.state.event).not.toBeNull();
    act(() => result.current.dismissEvent());
    expect(result.current.state.event).toBeNull();

    await act(async () => {
      await result.current.refreshMap();
    });
    expect(result.current.state.map).not.toBeNull();
  });

  it('неверный ответ выставляет questError', async () => {
    const api = new FakeApiClient();
    await api.createHero({ name: 'Артур', classId: 'model-mage' });
    const { result } = renderHook(() => useGame(), { wrapper: wrapper(api) });
    await waitFor(() => expect(result.current.state.screen).toBe('map'));
    await act(async () => {
      await result.current.enterTopic('supervised-basics');
    });
    const questId = result.current.state.topic!.quests[0]!.id;
    await act(async () => {
      await result.current.submitQuest('supervised-basics', questId, [1]);
    });
    expect(result.current.state.questError).not.toBeNull();
  });

  it('сбой загрузки героя выставляет ошибку', async () => {
    class FailingApi extends FakeApiClient {
      override async getHero(): Promise<never> {
        throw new Error('сеть недоступна');
      }
    }
    const { result } = renderHook(() => useGame(), {
      wrapper: wrapper(new FailingApi()),
    });
    await waitFor(() => expect(result.current.state.error).not.toBeNull());
  });

  it('повторное создание героя выставляет ошибку', async () => {
    const api = new FakeApiClient();
    await api.createHero({ name: 'Первый', classId: 'model-mage' });
    const { result } = renderHook(() => useGame(), { wrapper: wrapper(api) });
    await waitFor(() => expect(result.current.state.screen).toBe('map'));
    await act(async () => {
      await result.current.createHero('Второй', 'model-mage');
    });
    expect(result.current.state.error).not.toBeNull();
  });

  it('вход в заблокированную локацию выставляет ошибку (423)', async () => {
    class LockedApi extends FakeApiClient {
      override async getTopic(): Promise<never> {
        throw new ApiError(423, 'locked');
      }
    }
    const api = new LockedApi();
    await api.createHero({ name: 'Артур', classId: 'model-mage' });
    const { result } = renderHook(() => useGame(), { wrapper: wrapper(api) });
    await waitFor(() => expect(result.current.state.screen).toBe('map'));
    await act(async () => {
      await result.current.enterTopic('transformers');
    });
    expect(result.current.state.error).toBe('Локация заблокирована');
  });

  it('сбой генерации события (не 404) выставляет ошибку', async () => {
    class EventFailApi extends FakeApiClient {
      override async generateEvent(): Promise<never> {
        throw new ApiError(500, 'сбой');
      }
    }
    const api = new EventFailApi();
    await api.createHero({ name: 'Артур', classId: 'model-mage' });
    const { result } = renderHook(() => useGame(), { wrapper: wrapper(api) });
    await waitFor(() => expect(result.current.state.screen).toBe('map'));
    await act(async () => {
      await result.current.requestEvent('supervised-basics');
    });
    expect(result.current.state.error).not.toBeNull();
  });

  it('сетевой сбой при входе в локацию (не 423) выставляет ошибку', async () => {
    class TopicFailApi extends FakeApiClient {
      override async getTopic(): Promise<never> {
        throw new Error('таймаут');
      }
    }
    const api = new TopicFailApi();
    await api.createHero({ name: 'Артур', classId: 'model-mage' });
    const { result } = renderHook(() => useGame(), { wrapper: wrapper(api) });
    await waitFor(() => expect(result.current.state.screen).toBe('map'));
    await act(async () => {
      await result.current.enterTopic('supervised-basics');
    });
    expect(result.current.state.error).not.toBeNull();
  });

  it('сетевой сбой при сдаче квеста (не 422) выставляет ошибку', async () => {
    class CompleteFailApi extends FakeApiClient {
      override async completeQuest(): Promise<never> {
        throw new Error('таймаут');
      }
    }
    const api = new CompleteFailApi();
    await api.createHero({ name: 'Артур', classId: 'model-mage' });
    const { result } = renderHook(() => useGame(), { wrapper: wrapper(api) });
    await waitFor(() => expect(result.current.state.screen).toBe('map'));
    await act(async () => {
      await result.current.submitQuest('supervised-basics', 'q', [0]);
    });
    expect(result.current.state.error).not.toBeNull();
  });
});
