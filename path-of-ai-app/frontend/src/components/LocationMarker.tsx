type LocationStatus = 'available' | 'locked' | 'completed';

const LABELS: Record<LocationStatus, string> = {
  available: 'Доступно',
  locked: 'Заблокировано',
  completed: 'Пройдено',
};

const COLORS: Record<LocationStatus, string> = {
  available: 'var(--color-available)',
  locked: 'var(--color-locked)',
  completed: 'var(--color-completed)',
};

type LocationMarkerProps = {
  status: LocationStatus;
  size?: number;
};

export function LocationMarker({ status, size = 28 }: LocationMarkerProps) {
  return (
    <svg
      role="img"
      aria-label={LABELS[status]}
      width={size}
      height={size}
      viewBox="0 0 24 24"
    >
      <title>{LABELS[status]}</title>
      <circle
        cx="12"
        cy="12"
        r="9"
        fill={COLORS[status]}
        stroke="var(--color-frame)"
        strokeWidth="2"
      />
      {status === 'completed' && (
        <path
          d="M8 12l3 3 5-6"
          fill="none"
          stroke="var(--color-ink)"
          strokeWidth="2"
        />
      )}
      {status === 'locked' && (
        <rect x="9" y="11" width="6" height="5" fill="var(--color-text-dim)" />
      )}
    </svg>
  );
}
