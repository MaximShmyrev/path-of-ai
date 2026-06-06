import { useState } from 'react';

import type { QuestView as QuestData } from '../api/types';
import { Button } from '../components/Button';
import { QuestIcon } from '../components/QuestIcon';
import { useGame } from '../game/store';
import { ru } from '../i18n/ru';

type QuestViewProps = {
  topicId: string;
  quest: QuestData;
};

export function QuestView({ topicId, quest }: QuestViewProps) {
  const { submitQuest, state } = useGame();
  const hasQuiz = quest.quiz.length > 0;
  const [answers, setAnswers] = useState<number[]>(() =>
    quest.quiz.map(() => -1),
  );

  const setAnswer = (questionIndex: number, optionIndex: number) => {
    setAnswers((prev) =>
      prev.map((value, index) =>
        index === questionIndex ? optionIndex : value,
      ),
    );
  };

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void submitQuest(topicId, quest.id, hasQuiz ? answers : undefined);
  };

  return (
    <form onSubmit={onSubmit} aria-label={quest.title}>
      <h3>
        <QuestIcon kind={quest.kind} /> {quest.title}
      </h3>
      {quest.quiz.map((question, questionIndex) => (
        <fieldset key={questionIndex}>
          <legend>{question.prompt}</legend>
          {question.options.map((option, optionIndex) => (
            <label key={optionIndex}>
              <input
                type="radio"
                name={`${quest.id}-${questionIndex}`}
                checked={answers[questionIndex] === optionIndex}
                onChange={() => setAnswer(questionIndex, optionIndex)}
              />
              {option}
            </label>
          ))}
        </fieldset>
      ))}
      <Button type="submit">
        {hasQuiz ? ru.quest.answer : ru.quest.study}
      </Button>
      {state.questError !== null && <p role="alert">{ru.quest.wrong}</p>}
    </form>
  );
}
