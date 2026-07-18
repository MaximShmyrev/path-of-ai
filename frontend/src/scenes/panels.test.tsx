import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { App } from '../App';
import { FakeApiClient } from '../api/fake';
import { GameProvider } from '../game/store';
import { ru } from '../i18n/ru';

async function startOnMap() {
  const api = new FakeApiClient();
  await api.createHero({ name: 'Арагорн', classId: 'data-alchemist' });
  render(
    <GameProvider api={api}>
      <App />
    </GameProvider>,
  );
  await screen.findByRole('heading', { name: ru.map.heading });
}

describe('Панели персонажа (HUD-навигация)', () => {
  beforeEach(startOnMap);

  it('кнопка «Персонаж» открывает лист с радаром компетенций', async () => {
    await userEvent.click(
      screen.getByRole('button', { name: ru.hud.character }),
    );
    const dialog = await screen.findByRole('dialog', {
      name: ru.character.title,
    });
    expect(within(dialog).getByText('Арагорн')).toBeInTheDocument();
    expect(within(dialog).getByText(ru.character.forces)).toBeInTheDocument();
    expect(
      within(dialog).getByRole('img', { name: 'Радар компетенций' }),
    ).toBeInTheDocument();
  });

  it('кнопка «Инвентарь» открывает инвентарь', async () => {
    await userEvent.click(
      screen.getByRole('button', { name: ru.hud.inventory }),
    );
    expect(
      await screen.findByRole('dialog', { name: ru.inventoryPanel.title }),
    ).toBeInTheDocument();
  });

  it('кнопка «Навыки» открывает дерево с узлами тем', async () => {
    await userEvent.click(screen.getByRole('button', { name: ru.hud.skills }));
    const dialog = await screen.findByRole('dialog', {
      name: ru.skillsPanel.title,
    });
    expect(within(dialog).getByText('Обучение с учителем')).toBeInTheDocument();
  });

  it('крестик закрывает панель', async () => {
    await userEvent.click(
      screen.getByRole('button', { name: ru.hud.character }),
    );
    const dialog = await screen.findByRole('dialog', {
      name: ru.character.title,
    });
    await userEvent.click(
      within(dialog).getByRole('button', { name: ru.hud.close }),
    );
    expect(
      screen.queryByRole('dialog', { name: ru.character.title }),
    ).not.toBeInTheDocument();
  });
});
