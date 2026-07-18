/* Дерево навыков: компетенции-узлы по колонкам-регионам, рёбра = пререквизиты.
   Статусы из карты (mastered/available/locked). Узлы кликабельны. */

import { Icon } from '../components/Icon';
import { regionShort } from '../game/derive';
import { useGame } from '../game/store';
import { ru } from '../i18n/ru';

const NODE_W = 150;
const NODE_H = 52;
const COL_GAP = 56;
const ROW_GAP = 26;
const PAD = 20;

type Node = {
  id: string;
  title: string;
  status: string;
  prerequisites: string[];
  regionId: string;
  x: number;
  y: number;
};

export function SkillTree() {
  const { state, enterTopic, closePanel } = useGame();
  const { map } = state;
  if (map === null) {
    return null;
  }

  // Раскладка: колонка = регион, строка = позиция темы внутри региона.
  const nodes: Node[] = [];
  map.regions.forEach((region, ci) => {
    region.topics.forEach((topic, ti) => {
      nodes.push({
        id: topic.id,
        title: topic.title,
        status: topic.status,
        prerequisites: topic.prerequisites,
        regionId: region.id,
        x: PAD + ci * (NODE_W + COL_GAP),
        y: PAD + 28 + ti * (NODE_H + ROW_GAP),
      });
    });
  });

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const maxRows = Math.max(...map.regions.map((r) => r.topics.length), 1);
  const width = PAD * 2 + map.regions.length * (NODE_W + COL_GAP) - COL_GAP;
  const height = PAD * 2 + 28 + maxRows * (NODE_H + ROW_GAP);

  const center = (n: Node) => [n.x + NODE_W / 2, n.y + NODE_H / 2];

  const onNode = (n: Node) => {
    if (n.status === 'locked') return;
    void enterTopic(n.id);
    closePanel();
  };

  return (
    <div className="skilltree" style={{ width, height }}>
      {/* колонки-регионы (подписи) */}
      {map.regions.map((region, ci) => (
        <div
          key={region.id}
          className="skilltree__col-title"
          style={{ left: PAD + ci * (NODE_W + COL_GAP), width: NODE_W }}
        >
          {regionShort(region.id, region.title)}
        </div>
      ))}

      {/* рёбра пререквизитов */}
      <svg className="skilltree__edges" width={width} height={height}>
        {nodes.flatMap((n) =>
          n.prerequisites.map((pid) => {
            const p = byId.get(pid);
            if (p === undefined) return null;
            const [x1, y1] = center(p);
            const [x2, y2] = center(n);
            return (
              <line
                key={`${pid}->${n.id}`}
                className="skilltree__edge"
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
              />
            );
          }),
        )}
      </svg>

      {/* узлы */}
      {nodes.map((n) => (
        <button
          key={n.id}
          type="button"
          className="skill-node"
          data-status={n.status}
          style={{ left: n.x, top: n.y, width: NODE_W, height: NODE_H }}
          disabled={n.status === 'locked'}
          onClick={() => onNode(n)}
          title={`${n.title} — ${ru.skillsPanel.statuses[n.status] ?? n.status}`}
        >
          <span className="skill-node__icon">
            <Icon name={`region-${n.regionId}`} size={24} />
          </span>
          <span className="skill-node__title">{n.title}</span>
        </button>
      ))}
    </div>
  );
}
