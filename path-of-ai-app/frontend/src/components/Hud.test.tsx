import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FakeApiClient } from '../api/fake';
import { GameProvider } from '../game/store';
import { ru } from '../i18n/ru';
import { Hud } from './Hud';

describe('Hud', () => {
  it('без героя показывает нейтральное состояние', () => {
    render(
      <GameProvider api={new FakeApiClient()}>
        <Hud />
      </GameProvider>,
    );
    expect(screen.getByText(ru.hud.idle)).toBeInTheDocument();
  });

  it('с героем показывает имя, уровень и две сферы (опыт и познание)', async () => {
    const api = new FakeApiClient();
    await api.createHero({ name: 'Мерлин', classId: 'model-mage' });
    render(
      <GameProvider api={api}>
        <Hud />
      </GameProvider>,
    );
    expect(await screen.findByText('Мерлин')).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(`${ru.map.level}\\s*1`)),
    ).toBeInTheDocument();
    expect(screen.getByRole('meter', { name: ru.hud.xp })).toBeInTheDocument();
    expect(
      screen.getByRole('meter', { name: ru.hud.lore }),
    ).toBeInTheDocument();
  });
});
