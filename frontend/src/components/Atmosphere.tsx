/* Атмосферный слой: поднимающиеся угольки/искры на чистом CSS (без зависимостей).
   Декоративен, скрыт от скринридеров; не перехватывает клики. */

import type { CSSProperties } from 'react';

const EMBERS = Array.from({ length: 18 }, (_, i) => i);

// CSS-переменные в style требуют расширенного типа.
type EmberStyle = CSSProperties & Record<string, string | number>;

export function Atmosphere() {
  return (
    <div className="atmosphere" aria-hidden="true">
      {EMBERS.map((i) => {
        // Детерминированно «разбросанные» параметры — без Math.random.
        const style: EmberStyle = {
          left: `${(i * 53) % 100}%`,
          animationDelay: `${(i % 9) * 0.9}s`,
          animationDuration: `${7 + (i % 6)}s`,
          '--ember-drift': `${((i % 5) - 2) * 18}px`,
          '--ember-scale': `${0.6 + (i % 4) * 0.2}`,
        };
        return <span key={i} className="atmosphere__ember" style={style} />;
      })}
    </div>
  );
}
