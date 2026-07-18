/* Карта мира в стиле Средиземья: иллюстрированный континент, земли-регионы на
   позициях по лору (WORLD.md), Великий Тракт между ними, темы-локации. */

import { REGION_LORE, regionPos } from '../game/derive';
import { resolveAsset } from '../theme/assets';
import { LocationMarker } from './LocationMarker';

export type TopicNode = {
  id: string;
  title: string;
  status: 'available' | 'locked' | 'completed';
};

export type RegionView = {
  id: string;
  title: string;
  status: 'open' | 'locked';
  topics: TopicNode[];
};

type WorldMapProps = {
  regions: RegionView[];
  onEnterTopic?: (topicId: string) => void;
};

export function WorldMap({ regions, onEnterTopic }: WorldMapProps) {
  // Точки Великого Тракта (центры земель, % полотна) в порядке прохождения.
  const road = regions.map((region, i) => {
    const p = regionPos(region.id, i);
    return `${p.x + 9},${p.y + 8}`;
  });

  return (
    <div className="atlas">
      <div className="atlas__paper" aria-hidden="true" />
      {road.length > 1 && (
        <svg
          className="atlas__road"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <polyline className="atlas__road-line" points={road.join(' ')} />
        </svg>
      )}

      {regions.map((region, i) => {
        const pos = regionPos(region.id, i);
        const lore = REGION_LORE[region.id] ?? region.title;
        const art = resolveAsset(region.id);
        const style: React.CSSProperties = {
          left: `${pos.x}%`,
          top: `${pos.y}%`,
        };
        if (art !== undefined) {
          style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.82)), url(${art})`;
        }
        return (
          <section
            key={region.id}
            className="atlas__land"
            data-status={region.status}
            style={style}
          >
            <h3 className="atlas__land-name">{lore}</h3>
            {lore !== region.title && (
              <p className="atlas__land-sub">{region.title}</p>
            )}
            <ul className="atlas__nodes">
              {region.topics.map((topic) => (
                <li key={topic.id} className="atlas__node">
                  <button
                    type="button"
                    className="atlas__node-button"
                    disabled={
                      topic.status === 'locked' || onEnterTopic === undefined
                    }
                    onClick={() => onEnterTopic?.(topic.id)}
                  >
                    <LocationMarker status={topic.status} />
                    <span className="atlas__node-title">{topic.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
