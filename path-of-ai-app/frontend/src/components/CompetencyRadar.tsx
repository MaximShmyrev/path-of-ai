/* Радар «Силы персонажа» — компетенции по областям ИИ (SVG, без зависимостей).
   Каждая ось = регион; значение 0..1 = доля пройденных тем. */

export type RadarAxis = {
  label: string;
  value: number; // 0..1
};

type CompetencyRadarProps = {
  axes: RadarAxis[];
  size?: number;
};

export function CompetencyRadar({ axes, size = 240 }: CompetencyRadarProps) {
  const n = Math.max(axes.length, 3);
  const c = size / 2;
  const r = c - 34; // отступ под подписи
  const rings = [0.25, 0.5, 0.75, 1];

  const point = (i: number, radius: number) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [c + radius * Math.cos(angle), c + radius * Math.sin(angle)];
  };

  const polygon = (radiusOf: (i: number) => number) =>
    axes.map((_, i) => point(i, radiusOf(i)).join(',')).join(' ');

  return (
    <svg
      className="radar"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="Радар компетенций"
    >
      {/* кольца-сетка */}
      {rings.map((ring) => (
        <polygon
          key={ring}
          className="radar__ring"
          points={polygon(() => r * ring)}
          fill="none"
        />
      ))}
      {/* оси */}
      {axes.map((axis, i) => {
        const [x, y] = point(i, r);
        return (
          <line
            key={axis.label}
            className="radar__axis"
            x1={c}
            y1={c}
            x2={x}
            y2={y}
          />
        );
      })}
      {/* заполнение по значениям */}
      <polygon
        className="radar__value"
        points={polygon((i) => r * Math.min(1, Math.max(0, axes[i]!.value)))}
      />
      {/* узлы значений */}
      {axes.map((axis, i) => {
        const [x, y] = point(i, r * Math.min(1, Math.max(0, axis.value)));
        return (
          <circle
            key={axis.label}
            className="radar__node"
            cx={x}
            cy={y}
            r={3}
          />
        );
      })}
      {/* подписи осей */}
      {axes.map((axis, i) => {
        const [x, y] = point(i, r + 16);
        return (
          <text
            key={axis.label}
            className="radar__label"
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {axis.label}
          </text>
        );
      })}
    </svg>
  );
}
