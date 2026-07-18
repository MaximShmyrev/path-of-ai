import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { App } from '../App';
import { FakeApiClient } from '../api/fake';
import { GameProvider } from '../game/store';
import { ru } from '../i18n/ru';

function renderApp(api: FakeApiClient) {
  render(
    <GameProvider api={api}>
      <App />
    </GameProvider>,
  );
}

describe('CharacterCreation (§7.1 ui)', () => {
  it('создание героя переводит на карту мира', async () => {
    renderApp(new FakeApiClient());
    await screen.findByText(ru.create.heading);

    await userEvent.type(screen.getByLabelText(ru.create.nameLabel), 'Артур');
    await userEvent.click(
      screen.getByRole('radio', { name: ru.classes['model-mage']! }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: ru.create.submit }),
    );

    expect(
      await screen.findByRole('heading', { name: ru.map.heading }),
    ).toBeInTheDocument();
  });

  it('пустое имя не отправляет форму', async () => {
    renderApp(new FakeApiClient());
    await screen.findByText(ru.create.heading);
    await userEvent.click(
      screen.getByRole('button', { name: ru.create.submit }),
    );
    expect(screen.getByRole('alert')).toHaveTextContent(ru.create.nameRequired);
    // остались на экране создания
    expect(screen.getByText(ru.create.heading)).toBeInTheDocument();
  });
});
