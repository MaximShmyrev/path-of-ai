type LevelUpOverlayProps = {
  visible: boolean;
  level: number;
};

export function LevelUpOverlay({ visible, level }: LevelUpOverlayProps) {
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
      </div>
    </div>
  );
}
