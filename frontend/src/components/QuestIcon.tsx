type QuestKind = 'theory' | 'practice' | 'boss';

const LABELS: Record<QuestKind, string> = {
  theory: 'Свиток теории',
  practice: 'Практическое испытание',
  boss: 'Босс',
};

const COLORS: Record<QuestKind, string> = {
  theory: 'var(--color-gold)',
  practice: 'var(--color-frame-light)',
  boss: 'var(--color-blood)',
};

// Простые векторные пиктограммы: свиток / наковальня / череп.
const PATHS: Record<QuestKind, string> = {
  theory: 'M5 3h14v18l-3-2-3 2-3-2-2 2V3z',
  practice: 'M3 14h18l-2 5H5l-2-5zm4-9h6l3 4H4l3-4z',
  boss: 'M12 2a8 8 0 0 0-5 14v4h10v-4a8 8 0 0 0-5-14zM9 12a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm6 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z',
};

type QuestIconProps = {
  kind: QuestKind;
  size?: number;
};

export function QuestIcon({ kind, size = 24 }: QuestIconProps) {
  return (
    <svg
      role="img"
      aria-label={LABELS[kind]}
      width={size}
      height={size}
      viewBox="0 0 24 24"
    >
      <title>{LABELS[kind]}</title>
      <path d={PATHS[kind]} fill={COLORS[kind]} />
    </svg>
  );
}
