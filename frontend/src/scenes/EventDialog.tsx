import { Button } from '../components/Button';
import { useGame } from '../game/store';
import { ru } from '../i18n/ru';

export function EventDialog() {
  const { state, dismissEvent } = useGame();
  if (state.event === null) {
    return null;
  }
  return (
    <div className="levelup-overlay" role="dialog" aria-label={ru.event.title}>
      <div className="levelup-overlay__card">
        <p>{state.event.text}</p>
        <Button onClick={dismissEvent}>{ru.event.close}</Button>
      </div>
    </div>
  );
}
