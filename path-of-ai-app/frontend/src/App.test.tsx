import { render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';

import { App } from './App';
import { FakeApiClient } from './api/fake';
import { GameProvider } from './game/store';
import { ru } from './i18n/ru';

function renderApp(): ReactElement {
  return (
    <GameProvider api={new FakeApiClient()}>
      <App />
    </GameProvider>
  );
}

describe('App', () => {
  it('показывает название игры «Путь ИИ»', () => {
    render(renderApp());
    expect(
      screen.getByRole('heading', { name: ru.appTitle }),
    ).toBeInTheDocument();
  });

  it('без героя ведёт на создание персонажа', async () => {
    render(renderApp());
    expect(await screen.findByText(ru.create.heading)).toBeInTheDocument();
  });
});
