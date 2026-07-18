/* Полноэкранный игровой каркас (D2-стиль): фон-сцена, виньетка, атмосферные
   угольки, прокручиваемая область контента, нижняя HUD-панель, оверлей-панели
   персонажа (как C/I в Diablo) и кнопка полноэкранного режима. */

import { useCallback, useEffect, useState, type ReactNode } from 'react';

import { useGame } from '../game/store';
import { ru } from '../i18n/ru';
import { CharacterSheet } from '../scenes/CharacterSheet';
import { Inventory } from '../scenes/Inventory';
import { SkillTree } from '../scenes/SkillTree';
import { Atmosphere } from './Atmosphere';
import { Hud } from './Hud';

type AppShellProps = {
  children: ReactNode;
};

const PANEL_TITLE: Record<string, string> = {
  character: ru.character.title,
  inventory: ru.inventoryPanel.title,
  skills: ru.skillsPanel.title,
};

const HOTKEYS: Record<string, 'character' | 'inventory' | 'skills'> = {
  c: 'character',
  i: 'inventory',
  k: 'skills',
};

function useFullscreen(): [boolean, () => void] {
  const [active, setActive] = useState(false);
  useEffect(() => {
    const onChange = () => setActive(document.fullscreenElement !== null);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);
  const toggle = useCallback(() => {
    if (document.fullscreenElement === null) {
      void document.documentElement.requestFullscreen?.();
    } else {
      void document.exitFullscreen?.();
    }
  }, []);
  return [active, toggle];
}

export function AppShell({ children }: AppShellProps) {
  const [fullscreen, toggleFullscreen] = useFullscreen();
  const { state, openPanel, closePanel } = useGame();
  const hasHero = state.hero !== null;

  useEffect(() => {
    if (!hasHero) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'Escape') {
        closePanel();
        return;
      }
      const panel = HOTKEYS[e.key.toLowerCase()];
      if (panel !== undefined) {
        e.preventDefault();
        openPanel(panel);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hasHero, openPanel, closePanel]);

  return (
    <div className="app-shell">
      <Atmosphere />
      <div className="app-shell__vignette" />
      <button
        type="button"
        className="fullscreen-toggle"
        onClick={toggleFullscreen}
        aria-label={
          fullscreen ? 'Выйти из полноэкранного режима' : 'На весь экран'
        }
        aria-pressed={fullscreen}
      >
        <FullscreenIcon active={fullscreen} />
      </button>
      <div className="app-shell__content">
        <div className="app-shell__stage">{children}</div>
      </div>
      <Hud />

      {state.panel !== null && (
        <div
          className="panel-overlay"
          role="dialog"
          aria-label={PANEL_TITLE[state.panel]}
        >
          <div className="panel-overlay__scrim" onClick={closePanel} />
          <div className="panel-frame">
            <header className="panel-frame__head">
              <h2>{PANEL_TITLE[state.panel]}</h2>
              <button
                type="button"
                className="panel-frame__close"
                onClick={closePanel}
                aria-label={ru.hud.close}
              >
                ✕
              </button>
            </header>
            <div className="panel-frame__body">
              {state.panel === 'character' && <CharacterSheet />}
              {state.panel === 'inventory' && <Inventory />}
              {state.panel === 'skills' && <SkillTree />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FullscreenIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      {active ? (
        <path
          d="M9 4v3a2 2 0 0 1-2 2H4M20 9h-3a2 2 0 0 1-2-2V4M4 15h3a2 2 0 0 1 2 2v3M15 20v-3a2 2 0 0 1 2-2h3"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      ) : (
        <path
          d="M4 9V6a2 2 0 0 1 2-2h3M20 9V6a2 2 0 0 0-2-2h-3M4 15v3a2 2 0 0 0 2 2h3M20 15v3a2 2 0 0 1-2 2h-3"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}
