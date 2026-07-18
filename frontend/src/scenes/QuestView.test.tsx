import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import type { QuestView as QuestData } from '../api/types';
import { FakeApiClient } from '../api/fake';
import { GameProvider } from '../game/store';
import { ru } from '../i18n/ru';
import { QuestView } from './QuestView';

function renderQuest(quest: QuestData) {
  return render(
    <GameProvider api={new FakeApiClient()}>
      <QuestView topicId="t" quest={quest} />
    </GameProvider>,
  );
}

const practice: QuestData = {
  id: 'q-practice',
  title: 'Испытание',
  kind: 'practice',
  xp: 100,
  body: '',
  quiz: [
    {
      prompt: 'Вопрос?',
      options: ['Да', 'Нет'],
      explanation: 'Разбор: «Да» — верный ответ.',
    },
  ],
};

describe('QuestView', () => {
  it('показывает разбор только после ответа (SPEC §7.10)', async () => {
    renderQuest(practice);
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('radio')[0]!);
    await userEvent.click(
      screen.getByRole('button', { name: ru.quest.answer }),
    );
    expect(await screen.findByRole('note')).toHaveTextContent(
      /Разбор: «Да» — верный ответ/,
    );
  });

  it('для теории показывает урок и кнопку «Изучить»', () => {
    const theory: QuestData = {
      id: 'q-theory',
      title: 'Свиток',
      kind: 'theory',
      xp: 50,
      body: '## Урок\n\nСодержание урока.',
      quiz: [],
    };
    renderQuest(theory);
    expect(screen.getByLabelText('Урок')).toBeInTheDocument();
    expect(screen.getByText('Содержание урока.')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: ru.quest.study }),
    ).toBeInTheDocument();
  });
});
