/* Лист персонажа: портрет (Flux), имя/класс/уровень, XP и радар компетенций ИИ. */

import { HeroPortrait } from '../components/ArtSlots';
import { CompetencyRadar } from '../components/CompetencyRadar';
import { XpBar } from '../components/XpBar';
import { competencies } from '../game/derive';
import { useGame } from '../game/store';
import { ru } from '../i18n/ru';
import { resolveAsset } from '../theme/assets';

export function CharacterSheet() {
  const { state } = useGame();
  const { hero, map } = state;
  if (hero === null) {
    return null;
  }
  const art = resolveAsset(hero.class_id);
  const comps = map !== null ? competencies(map) : [];
  const axes = comps.map((c) => ({ label: c.label, value: c.value }));
  const classTitle = ru.classes[hero.class_id] ?? hero.class_id;

  return (
    <div className="sheet">
      <div className="sheet__header">
        <div className="sheet__portrait">
          <HeroPortrait
            classId={hero.class_id}
            size={132}
            {...(art !== undefined ? { src: art } : {})}
          />
        </div>
        <div className="sheet__id">
          <h2>{hero.name}</h2>
          <p className="sheet__class">
            {classTitle} · {ru.map.level} {hero.level}
          </p>
          <XpBar
            current={hero.total_xp}
            max={hero.total_xp + hero.xp_to_next_level}
          />
          <p className="sheet__xp">{hero.total_xp} XP</p>
        </div>
      </div>

      <h3>{ru.character.forces}</h3>
      <div className="sheet__radar">
        <CompetencyRadar axes={axes} />
        <ul className="sheet__comp-list">
          {comps.map((c) => (
            <li key={c.regionId} className="sheet__comp">
              <span className="sheet__comp-title">{c.title}</span>
              <span className="bar">
                <span
                  className="bar__fill"
                  style={{ width: `${Math.round(c.value * 100)}%` }}
                />
              </span>
              <span className="sheet__comp-num">
                {c.done}/{c.total}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
