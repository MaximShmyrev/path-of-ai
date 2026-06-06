import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from '../App';
import { FakeApiClient } from '../api/fake';
import { GameProvider } from '../game/store';
import { ru } from '../i18n/ru';

async function renderWithHero() {
  const api = new FakeApiClient();
  await api.createHero({ name: 'Мерлин', classId: 'model-mage' });
  render(
    <GameProvider api={api}>
      <App />
    </GameProvider>,
  );
  await screen.findByRole('heading', { name: ru.map.heading });
}

describe('WorldMapScene (§7.2 ui)', () => {
  it('показывает регионы карты', async () => {
    await renderWithHero();
    expect(screen.getByText('Долина основ ML')).toBeInTheDocument();
    expect(screen.getByText('Цитадель LLM')).toBeInTheDocument();
  });

  it('показывает уровень героя и прогресс', async () => {
    await renderWithHero();
    expect(
      screen.getByText(new RegExp(`${ru.map.level}\\s*1`)),
    ).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('рисует маркеры локаций', async () => {
    await renderWithHero();
    // 3 локации в sampleMap → маркеры со статусами
    expect(screen.getAllByRole('img').length).toBeGreaterThanOrEqual(3);
  });
});
