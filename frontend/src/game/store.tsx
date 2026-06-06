/* Игровой стор: состояние экранов + действия поверх ApiClient (SPEC §4.4). */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react';

import type { ApiClient, HeroView, MapView } from '../api/types';

export type Screen = 'loading' | 'create' | 'map';

export type GameState = {
  screen: Screen;
  hero: HeroView | null;
  map: MapView | null;
  error: string | null;
  busy: boolean;
};

type Action =
  | { type: 'showCreate' }
  | { type: 'enterMap'; hero: HeroView; map: MapView }
  | { type: 'mapLoaded'; map: MapView }
  | { type: 'busy'; busy: boolean }
  | { type: 'error'; message: string };

const initialState: GameState = {
  screen: 'loading',
  hero: null,
  map: null,
  error: null,
  busy: false,
};

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'showCreate':
      return { ...state, screen: 'create' };
    case 'enterMap':
      return {
        ...state,
        screen: 'map',
        hero: action.hero,
        map: action.map,
        error: null,
      };
    case 'mapLoaded':
      return { ...state, map: action.map };
    case 'busy':
      return { ...state, busy: action.busy };
    case 'error':
      return { ...state, error: action.message };
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Неизвестная ошибка';
}

export type Game = {
  state: GameState;
  createHero: (name: string, classId: string) => Promise<void>;
  refreshMap: () => Promise<void>;
};

const GameContext = createContext<Game | null>(null);

type GameProviderProps = {
  api: ApiClient;
  children: ReactNode;
};

export function GameProvider({ api, children }: GameProviderProps) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const hero = await api.getHero();
        if (!active) return;
        if (hero === null) {
          dispatch({ type: 'showCreate' });
          return;
        }
        const map = await api.getMap();
        if (active) dispatch({ type: 'enterMap', hero, map });
      } catch (error) {
        if (active) dispatch({ type: 'error', message: errorMessage(error) });
      }
    })();
    return () => {
      active = false;
    };
  }, [api]);

  const createHero = useCallback(
    async (name: string, classId: string) => {
      dispatch({ type: 'busy', busy: true });
      try {
        const hero = await api.createHero({ name, classId });
        const map = await api.getMap();
        dispatch({ type: 'enterMap', hero, map });
      } catch (error) {
        dispatch({ type: 'error', message: errorMessage(error) });
      } finally {
        dispatch({ type: 'busy', busy: false });
      }
    },
    [api],
  );

  const refreshMap = useCallback(async () => {
    const map = await api.getMap();
    dispatch({ type: 'mapLoaded', map });
  }, [api]);

  const value = useMemo<Game>(
    () => ({ state, createHero, refreshMap }),
    [state, createHero, refreshMap],
  );
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): Game {
  const game = useContext(GameContext);
  if (game === null) {
    throw new Error('useGame должен использоваться внутри GameProvider');
  }
  return game;
}
