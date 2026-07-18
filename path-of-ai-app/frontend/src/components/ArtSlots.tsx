/* Слоты под рисованные арты. Без src показывают векторный плейсхолдер; реальные
   изображения подключаются в E9 (AssetGenerator / Flux). */

type HeroPortraitProps = {
  classId: string;
  src?: string;
  size?: number;
};

export function HeroPortrait({ classId, src, size = 160 }: HeroPortraitProps) {
  const label = `Портрет: ${classId}`;
  if (src !== undefined) {
    return (
      <img
        className="art-placeholder"
        src={src}
        alt={label}
        width={size}
        height={size}
      />
    );
  }
  return (
    <svg
      className="art-placeholder"
      role="img"
      aria-label={label}
      width={size}
      height={size}
      viewBox="0 0 100 100"
    >
      <title>{label}</title>
      <circle cx="50" cy="38" r="18" fill="var(--color-frame-light)" />
      <path
        d="M22 86c0-16 12-26 28-26s28 10 28 26z"
        fill="var(--color-frame)"
      />
    </svg>
  );
}

type LocationArtProps = {
  title: string;
  src?: string;
  size?: number;
};

export function LocationArt({ title, src, size = 200 }: LocationArtProps) {
  const label = `Локация: ${title}`;
  if (src !== undefined) {
    return (
      <img
        className="art-placeholder"
        src={src}
        alt={label}
        width={size}
        height={size}
      />
    );
  }
  return (
    <svg
      className="art-placeholder"
      role="img"
      aria-label={label}
      width={size}
      height={size}
      viewBox="0 0 100 100"
    >
      <title>{label}</title>
      <path d="M10 80l25-45 20 30 12-18 23 33z" fill="var(--color-frame)" />
      <circle cx="74" cy="26" r="9" fill="var(--color-gold)" />
    </svg>
  );
}
