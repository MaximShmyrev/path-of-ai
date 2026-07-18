import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FakeApiClient } from '../api/fake';
import { GameProvider } from '../game/store';
import { AppShell } from './AppShell';

function renderShell() {
  return render(
    <GameProvider api={new FakeApiClient()}>
      <AppShell>
        <p>содержимое сцены</p>
      </AppShell>
    </GameProvider>,
  );
}

describe('AppShell', () => {
  it('рендерит вложенный контент сцены', () => {
    renderShell();
    expect(screen.getByText('содержимое сцены')).toBeInTheDocument();
  });

  it('даёт кнопку перехода в полноэкранный режим', () => {
    renderShell();
    expect(
      screen.getByRole('button', { name: /весь экран/i }),
    ).toBeInTheDocument();
  });

  it('содержит нижнюю HUD-панель', () => {
    renderShell();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });
});
