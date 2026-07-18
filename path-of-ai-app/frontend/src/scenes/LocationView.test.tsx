import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { App } from '../App';
import { FakeApiClient } from '../api/fake';
import { GameProvider } from '../game/store';
import { ru } from '../i18n/ru';

let api: FakeApiClient;

async function startOnMap() {
  api = new FakeApiClient();
  await api.createHero({ name: 'Артур', classId: 'model-mage' });
  render(
    <GameProvider api={api}>
      <App />
    </GameProvider>,
  );
  await screen.findByRole('heading', { name: ru.map.heading });
}

async function enterStartTopic() {
  await userEvent.click(
    screen.getByRole('button', { name: /Обучение с учителем/ }),
  );
  await screen.findByRole('heading', { name: 'Обучение с учителем' });
}

describe('Игровой цикл в локации', () => {
  beforeEach(startOnMap);

  it('§7.5 ui: заблокированная локация недоступна для входа', () => {
    expect(
      screen.getByRole('button', { name: /Оценка моделей/ }),
    ).toBeDisabled();
  });

  it('§7.3 ui: верный ответ начисляет XP и §7.4 ui: показывает level-up', async () => {
    await enterStartTopic();
    await userEvent.click(screen.getAllByRole('radio')[0]!);
    await userEvent.click(
      screen.getByRole('button', { name: ru.quest.answer }),
    );

    // §7.4: оверлей повышения уровня (0→150 XP → уровень 2)
    const dialog = await screen.findByRole('dialog', {
      name: /Повышение уровня/,
    });
    // «Уровень 2» теперь есть и в HUD — проверяем именно внутри оверлея.
    expect(within(dialog).getByText(/Уровень 2/)).toBeInTheDocument();
  });

  it('§7.3 ui: неверный ответ показывает ошибку, без перехода', async () => {
    await enterStartTopic();
    await userEvent.click(screen.getAllByRole('radio')[1]!);
    await userEvent.click(
      screen.getByRole('button', { name: ru.quest.answer }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(ru.quest.wrong);
  });

  it('§7.7 ui: кнопка события показывает сюжетный текст', async () => {
    await enterStartTopic();
    await userEvent.click(
      screen.getByRole('button', { name: ru.location.event }),
    );
    const dialog = await screen.findByRole('dialog', { name: ru.event.title });
    expect(dialog).toHaveTextContent(/Туман рассеивается/);
  });

  it('возврат на карту работает', async () => {
    await enterStartTopic();
    await userEvent.click(
      screen.getByRole('button', { name: ru.location.back }),
    );
    expect(
      await screen.findByRole('heading', { name: ru.map.heading }),
    ).toBeInTheDocument();
  });
});
