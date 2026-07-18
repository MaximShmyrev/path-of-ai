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

import { ApiError } from '../api/http';
import type {
  ApiClient,
  EventView,
  HeroView,
  MapView,
  TopicView,
} from '../api/types';

export type Screen = 'loading' | 'create' | 'map' | 'location';

/** Оверлей-панель персонажа (как C/I в Diablo). */
export type Panel = 'character' | 'inventory' | 'skills' | null;

export type GameState = {
  screen: Screen;
  panel: Panel;
  hero: HeroView | null;
  map: MapView | null;
  topic: TopicView | null;
  levelUpLevel: number | null;
  event: EventView | null;
  questError: string | null;
  error: string | null;
  busy: boolean;
};

type Action =
  | { type: 'showCreate' }
  | { type: 'enterMap'; hero: HeroView; map: MapView }
  | { type: 'mapLoaded'; map: MapView }
  | { type: 'enterLocation'; topic: TopicView }
  | { type: 'leaveLocation' }
  | {
      type: 'questResult';
      hero: HeroView;
      map: MapView;
      topic: TopicView;
      level: number | null;
    }
  | { type: 'questError'; message: string }
  | { type: 'clearQuestError' }
  | { type: 'dismissLevelUp' }
  | { type: 'event'; event: EventView }
  | { type: 'dismissEvent' }
  | { type: 'busy'; busy: boolean }
  | { type: 'openPanel'; panel: Exclude<Panel, null> }
  | { type: 'closePanel' }
  | { type: 'error'; message: string };

const initialState: GameState = {
  screen: 'loading',
  panel: null,
  hero: null,
  map: null,
  topic: null,
  levelUpLevel: null,
  event: null,
  questError: null,
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
        topic: null,
        error: null,
      };
    case 'mapLoaded':
      return { ...state, map: action.map };
    case 'enterLocation':
      return {
        ...state,
        screen: 'location',
        topic: action.topic,
        questError: null,
      };
    case 'leaveLocation':
      return { ...state, screen: 'map', topic: null, event: null };
    case 'questResult':
      return {
        ...state,
        hero: action.hero,
        map: action.map,
        topic: action.topic,
        levelUpLevel: action.level,
        questError: null,
      };
    case 'questError':
      return { ...state, questError: action.message };
    case 'clearQuestError':
      return { ...state, questError: null };
    case 'dismissLevelUp':
      return { ...state, levelUpLevel: null };
    case 'event':
      return { ...state, event: action.event };
    case 'dismissEvent':
      return { ...state, event: null };
    case 'busy':
      return { ...state, busy: action.busy };
    case 'openPanel':
      return { ...state, panel: action.panel };
    case 'closePanel':
      return { ...state, panel: null };
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
  enterTopic: (topicId: string) => Promise<void>;
  leaveTopic: () => void;
  submitQuest: (
    topicId: string,
    questId: string,
    answers?: number[],
  ) => Promise<void>;
  dismissLevelUp: () => void;
  requestEvent: (locationId: string) => Promise<void>;
  dismissEvent: () => void;
  openPanel: (panel: Exclude<Panel, null>) => void;
  closePanel: () => void;
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

  const enterTopic = useCallback(
    async (topicId: string) => {
      try {
        const topic = await api.getTopic(topicId);
        dispatch({ type: 'enterLocation', topic });
      } catch (error) {
        if (error instanceof ApiError && error.status === 423) {
          dispatch({ type: 'error', message: 'Локация заблокирована' });
        } else {
          dispatch({ type: 'error', message: errorMessage(error) });
        }
      }
    },
    [api],
  );

  const leaveTopic = useCallback(() => {
    dispatch({ type: 'leaveLocation' });
  }, []);

  const submitQuest = useCallback(
    async (topicId: string, questId: string, answers?: number[]) => {
      dispatch({ type: 'clearQuestError' });
      try {
        const result = await api.completeQuest(questId, answers);
        const [map, topic] = await Promise.all([
          api.getMap(),
          api.getTopic(topicId),
        ]);
        dispatch({
          type: 'questResult',
          hero: result.hero,
          map,
          topic,
          level: result.leveled_up ? result.new_level : null,
        });
      } catch (error) {
        if (error instanceof ApiError && error.status === 422) {
          dispatch({ type: 'questError', message: 'Неверный ответ' });
        } else {
          dispatch({ type: 'error', message: errorMessage(error) });
        }
      }
    },
    [api],
  );

  const dismissLevelUp = useCallback(() => {
    dispatch({ type: 'dismissLevelUp' });
  }, []);

  const requestEvent = useCallback(
    async (locationId: string) => {
      try {
        const event = await api.generateEvent(locationId);
        dispatch({ type: 'event', event });
      } catch (error) {
        if (!(error instanceof ApiError && error.status === 404)) {
          dispatch({ type: 'error', message: errorMessage(error) });
        }
      }
    },
    [api],
  );

  const dismissEvent = useCallback(() => {
    dispatch({ type: 'dismissEvent' });
  }, []);

  const openPanel = useCallback((panel: Exclude<Panel, null>) => {
    dispatch({ type: 'openPanel', panel });
  }, []);

  const closePanel = useCallback(() => {
    dispatch({ type: 'closePanel' });
  }, []);

  const value = useMemo<Game>(
    () => ({
      state,
      createHero,
      refreshMap,
      enterTopic,
      leaveTopic,
      submitQuest,
      dismissLevelUp,
      requestEvent,
      dismissEvent,
      openPanel,
      closePanel,
    }),
    [
      state,
      createHero,
      refreshMap,
      enterTopic,
      leaveTopic,
      submitQuest,
      dismissLevelUp,
      requestEvent,
      dismissEvent,
      openPanel,
      closePanel,
    ],
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
