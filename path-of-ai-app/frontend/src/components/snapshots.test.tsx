/* Снапшот-тесты ключевых компонентов кита (визуальная регрессия, SPEC §8). */

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FakeApiClient } from '../api/fake';
import { GameProvider } from '../game/store';
import { HeroPortrait } from './ArtSlots';
import { Hud } from './Hud';
import { LevelUpOverlay } from './LevelUpOverlay';
import { LocationMarker } from './LocationMarker';
import { Orb } from './Orb';
import { QuestIcon } from './QuestIcon';
import { WorldMap, type RegionView } from './WorldMap';
import { XpBar } from './XpBar';

describe('Снапшоты кита', () => {
  it('XpBar', () => {
    const { container } = render(<XpBar current={40} max={100} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('QuestIcon (все виды)', () => {
    const { container } = render(
      <>
        <QuestIcon kind="theory" />
        <QuestIcon kind="practice" />
        <QuestIcon kind="boss" />
      </>,
    );
    expect(container).toMatchSnapshot();
  });

  it('LocationMarker (все статусы)', () => {
    const { container } = render(
      <>
        <LocationMarker status="available" />
        <LocationMarker status="locked" />
        <LocationMarker status="completed" />
      </>,
    );
    expect(container).toMatchSnapshot();
  });

  it('LevelUpOverlay', () => {
    const { container } = render(<LevelUpOverlay visible level={4} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('HeroPortrait placeholder', () => {
    const { container } = render(<HeroPortrait classId="model-mage" />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('Orb (health, частичный налив)', () => {
    const { container } = render(
      <Orb kind="health" current={30} max={100} label="Опыт" caption="30 XP" />,
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('Hud (idle, без героя)', () => {
    const { container } = render(
      <GameProvider api={new FakeApiClient()}>
        <Hud />
      </GameProvider>,
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('WorldMap', () => {
    const regions: RegionView[] = [
      {
        id: 'ml',
        title: 'Долина основ ML',
        status: 'open',
        topics: [{ id: 't1', title: 'Базис', status: 'available' }],
      },
    ];
    const { container } = render(<WorldMap regions={regions} />);
    expect(container.firstChild).toMatchSnapshot();
  });
});
