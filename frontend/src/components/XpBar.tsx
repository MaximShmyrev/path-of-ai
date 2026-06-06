type XpBarProps = {
  current: number;
  max: number;
};

export function XpBar({ current, max }: XpBarProps) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, current / max)) : 0;
  return (
    <div
      className="xp-bar"
      role="progressbar"
      aria-label="Опыт"
      aria-valuenow={current}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div
        className="xp-bar__fill"
        style={{ width: `${ratio * 100}%`, background: 'var(--color-gold)' }}
      />
    </div>
  );
}
