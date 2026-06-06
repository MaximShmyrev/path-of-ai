import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { FakeApiClient } from '../api/fake';
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
});
