import { WorldMap } from '../components/WorldMap';
import { XpBar } from '../components/XpBar';
import { useGame } from '../game/store';
import { ru } from '../i18n/ru';

export function WorldMapScene() {
  const { state } = useGame();
  if (state.map === null || state.hero === null) {
    return <p>{ru.loading}</p>;
  }
  const { hero, map } = state;
  return (
    <section>
      <header>
        <h2>{ru.map.heading}</h2>
        <p>
          {ru.map.level} {hero.level}
        </p>
        <XpBar
          current={hero.total_xp}
          max={hero.total_xp + hero.xp_to_next_level}
        />
      </header>
      <WorldMap regions={map.regions} />
    </section>
  );
}
