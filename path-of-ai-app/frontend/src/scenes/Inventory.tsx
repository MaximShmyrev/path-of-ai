/* Инвентарь: сетка артефактов (трофеи за освоенные темы) + пустые слоты. */

import { Icon } from '../components/Icon';
import { artifacts } from '../game/derive';
import { useGame } from '../game/store';
import { ru } from '../i18n/ru';

const MIN_SLOTS = 20;

export function Inventory() {
  const { state } = useGame();
  const { map } = state;
  const items = map !== null ? artifacts(map) : [];
  const emptyCount = Math.max(0, MIN_SLOTS - items.length);

  return (
    <div className="inventory">
      {items.length === 0 && (
        <p className="inventory__empty">{ru.inventoryPanel.empty}</p>
      )}
      <div className="inventory__grid">
        {items.map((item) => (
          <div
            key={item.id}
            className="inv-slot inv-slot--filled"
            title={`${item.title} — ${ru.inventoryPanel.trophy}`}
          >
            <Icon name="mastery" size={30} />
            <span className="inv-slot__label">{item.title}</span>
          </div>
        ))}
        {Array.from({ length: emptyCount }, (_, i) => (
          <div key={`empty-${i}`} className="inv-slot" aria-hidden="true" />
        ))}
      </div>
    </div>
  );
}
