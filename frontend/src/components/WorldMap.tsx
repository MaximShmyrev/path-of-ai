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
  return (
    <div className="world-map">
      {regions.map((region) => {
        const art = resolveAsset(region.id);
        const style = art
          ? {
              backgroundImage: `linear-gradient(var(--color-scrim), var(--color-scrim)), url(${art})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : undefined;
        return (
          <section
            key={region.id}
            className="world-map__region"
            data-status={region.status}
            style={style}
          >
            <h3 className="world-map__region-title">{region.title}</h3>
            <ul className="world-map__nodes">
              {region.topics.map((topic) => (
                <li key={topic.id} className="world-map__node">
                  <button
                    type="button"
                    className="world-map__node-button"
                    disabled={
                      topic.status === 'locked' || onEnterTopic === undefined
                    }
                    onClick={() => onEnterTopic?.(topic.id)}
                  >
                    <LocationMarker status={topic.status} />
                    <span className="world-map__node-title">{topic.title}</span>
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
