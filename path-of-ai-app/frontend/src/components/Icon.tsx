/* Семантическая обёртка над Game Icons (react-icons/gi, CC-BY-3.0 — см. CREDITS.md).
   Иконки — SVG (красятся currentColor/токенами), масштабируемы, не растр (гвард OK). */

import type { IconType } from 'react-icons';
import {
  GiAnvil,
  GiArchiveRegister,
  GiBookshelf,
  GiBrain,
  GiBrainstorm,
  GiChest,
  GiCog,
  GiCompass,
  GiCrossedSwords,
  GiDeathSkull,
  GiEyeTarget,
  GiFamilyTree,
  GiHelmet,
  GiLaurelsTrophy,
  GiOpenBook,
  GiPathDistance,
  GiRobotGolem,
  GiScrollQuill,
  GiScrollUnfurled,
  GiSpellBook,
  GiSwapBag,
  GiToolbox,
  GiTreasureMap,
  GiTwoCoins,
  GiUpgrade,
} from 'react-icons/gi';

/** id → конкретная иконка. Падение на GiCog для неизвестных. */
const ICONS: Record<string, IconType> = {
  // квесты
  'quest-theory': GiScrollUnfurled,
  'quest-practice': GiAnvil,
  'quest-boss': GiDeathSkull,
  // регионы / компетенции
  'region-ml-foundations': GiBrain,
  'region-llm': GiSpellBook,
  'region-rag': GiBookshelf,
  'region-agents': GiRobotGolem,
  // темы (узлы дерева навыков)
  'topic-attention': GiEyeTarget,
  'topic-prompt': GiScrollQuill,
  'topic-tools': GiToolbox,
  'topic-planning': GiPathDistance,
  'topic-vectors': GiCompass,
  'topic-archive': GiArchiveRegister,
  'topic-default': GiCog,
  // навигация HUD
  'nav-character': GiHelmet,
  'nav-inventory': GiSwapBag,
  'nav-skills': GiFamilyTree,
  'nav-map': GiTreasureMap,
  // прочее
  xp: GiUpgrade,
  gold: GiTwoCoins,
  mastery: GiLaurelsTrophy,
  artifact: GiScrollQuill,
  competency: GiBrainstorm,
  combat: GiCrossedSwords,
  lesson: GiOpenBook,
  chest: GiChest,
};

type IconProps = {
  name: string;
  size?: number;
  title?: string;
  className?: string;
};

export function Icon({ name, size = 24, title, className }: IconProps) {
  const Cmp = ICONS[name] ?? GiCog;
  if (title !== undefined) {
    return (
      <Cmp size={size} className={className} role="img" aria-label={title} />
    );
  }
  return <Cmp size={size} className={className} aria-hidden />;
}
