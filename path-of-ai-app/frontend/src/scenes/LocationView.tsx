import { Button } from '../components/Button';
import { LevelUpOverlay } from '../components/LevelUpOverlay';
import { WindowFrame } from '../components/WindowFrame';
import { useGame } from '../game/store';
import { ru } from '../i18n/ru';
import { EventDialog } from './EventDialog';
import { QuestView } from './QuestView';

export function LocationView() {
  const { state, leaveTopic, requestEvent, dismissLevelUp } = useGame();
  if (state.topic === null) {
    return null;
  }
  const topic = state.topic;
  return (
    <WindowFrame title={topic.title}>
      <div>
        <Button onClick={leaveTopic}>{ru.location.back}</Button>
        <Button onClick={() => void requestEvent(topic.id)}>
          {ru.location.event}
        </Button>
      </div>
      <h3>{ru.location.quests}</h3>
      {topic.quests.map((quest) => (
        <QuestView key={quest.id} topicId={topic.id} quest={quest} />
      ))}
      <EventDialog />
      {state.levelUpLevel !== null && (
        <div>
          <LevelUpOverlay visible level={state.levelUpLevel} />
          <Button onClick={dismissLevelUp}>{ru.levelup.dismiss}</Button>
        </div>
      )}
    </WindowFrame>
  );
}
