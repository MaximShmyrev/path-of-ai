import { ru } from '../i18n/ru';
import { Button } from './Button';

type LevelUpOverlayProps = {
  visible: boolean;
  level: number;
  onDismiss?: () => void;
};

export function LevelUpOverlay({
  visible,
  level,
  onDismiss,
}: LevelUpOverlayProps) {
  if (!visible) {
    return null;
  }
  return (
    <div
      className="levelup-overlay"
      role="dialog"
      aria-label="Повышение уровня"
    >
      <div className="levelup-overlay__card">
        <h2>Новый уровень!</h2>
        <p>Уровень {level}</p>
        {onDismiss !== undefined && (
          <Button onClick={onDismiss}>{ru.levelup.dismiss}</Button>
        )}
      </div>
    </div>
  );
}
