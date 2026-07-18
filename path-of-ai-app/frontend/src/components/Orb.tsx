/* Сфера HUD в стиле Diablo II: стеклянный шар с жидкостным наливом по проценту,
   бликом и бронзовым ободом. Используется для здоровья/маны (в нашей игре —
   опыт/энергия героя). */

type OrbProps = {
  kind: 'health' | 'mana';
  current: number;
  max: number;
  label: string;
  caption?: string;
};

export function Orb({ kind, current, max, label, caption }: OrbProps) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, current / max)) : 0;
  return (
    <div
      className="orb"
      data-kind={kind}
      role="meter"
      aria-label={label}
      aria-valuenow={current}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div className="orb__glass">
        <div className="orb__fill" style={{ height: `${ratio * 100}%` }} />
        <div className="orb__shine" />
      </div>
      <div className="orb__rim" />
      {caption !== undefined && <span className="orb__caption">{caption}</span>}
    </div>
  );
}
