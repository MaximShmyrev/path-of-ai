/* Нижняя HUD-панель в стиле Diablo II: каменная плита со сферами по краям,
   портретом героя, поясом героя и кнопками панелей (персонаж/инвентарь/навыки). */

import { useGame } from '../game/store';
import { ru } from '../i18n/ru';
import { resolveAsset } from '../theme/assets';
import { HeroPortrait } from './ArtSlots';
import { Icon } from './Icon';
import { Orb } from './Orb';

const NAV: { panel: 'character' | 'inventory' | 'skills'; icon: string }[] = [
  { panel: 'character', icon: 'nav-character' },
  { panel: 'inventory', icon: 'nav-inventory' },
  { panel: 'skills', icon: 'nav-skills' },
];

export function Hud() {
  const { state, openPanel } = useGame();
  const { hero, map } = state;

  const xpNow = hero?.total_xp ?? 0;
  const xpMax = hero ? hero.total_xp + hero.xp_to_next_level : 1;

  const topics = map?.regions.flatMap((r) => r.topics) ?? [];
  const done = topics.filter((t) => t.status === 'completed').length;
  const total = topics.length;

  const className = hero?.class_id;
  const classTitle =
    className !== undefined ? (ru.classes[className] ?? className) : null;
  const art = className !== undefined ? resolveAsset(className) : undefined;

  return (
    <footer className="hud" aria-label={ru.hud.label}>
      <Orb
        kind="health"
        current={xpNow}
        max={xpMax}
        label={ru.hud.xp}
        caption={`${xpNow} XP`}
      />

      <div className="hud__center">
        {hero && (
          <div className="hud__portrait">
            <HeroPortrait
              classId={className ?? 'hero'}
              size={56}
              {...(art !== undefined ? { src: art } : {})}
            />
          </div>
        )}
        <div className="hud__belt">
          {hero ? (
            <>
              <span className="hud__hero-name">{hero.name}</span>
              <span className="hud__hero-meta">
                {classTitle} · {ru.map.level} {hero.level}
              </span>
            </>
          ) : (
            <span className="hud__hero-meta">{ru.hud.idle}</span>
          )}
          {hero && (
            <nav className="hud__nav" aria-label={ru.hud.label}>
              {NAV.map(({ panel, icon }) => (
                <button
                  key={panel}
                  type="button"
                  className="hud__nav-button"
                  aria-label={ru.hud[panel]}
                  title={ru.hud[panel]}
                  onClick={() => openPanel(panel)}
                >
                  <Icon name={icon} size={22} />
                </button>
              ))}
            </nav>
          )}
        </div>
      </div>

      <Orb
        kind="mana"
        current={done}
        max={total}
        label={ru.hud.lore}
        caption={total > 0 ? `${done}/${total}` : '—'}
      />
    </footer>
  );
}
