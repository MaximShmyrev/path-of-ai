import { WorldMap } from '../components/WorldMap';
import { useGame } from '../game/store';
import { ru } from '../i18n/ru';

export function WorldMapScene() {
  const { state, enterTopic } = useGame();
  if (state.map === null || state.hero === null) {
    return <p className="banner">{ru.loading}</p>;
  }
  const { map } = state;
  return (
    <section className="world-scene">
      <header className="world-scene__header">
        <h2>{ru.map.heading}</h2>
      </header>
      <WorldMap
        regions={map.regions}
        onEnterTopic={(topicId) => void enterTopic(topicId)}
      />
    </section>
  );
}
