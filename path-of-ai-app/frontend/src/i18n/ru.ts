/* Единственный источник пользовательских строк (UI на русском, SPEC §8).
   Спец-термины ИИ латиницей допускаются. */

export const ru = {
  appTitle: 'Путь ИИ',
  loading: 'Загрузка…',
  create: {
    heading: 'Создание героя',
    nameLabel: 'Имя героя',
    namePlaceholder: 'Назовите героя',
    classLabel: 'Класс',
    submit: 'Начать путь',
    nameRequired: 'Введите имя героя',
  },
  classes: {
    'data-alchemist': 'Алхимик данных',
    'model-mage': 'Маг моделей',
    'artifact-engineer': 'Инженер артефактов',
  } as Record<string, string>,
  map: {
    heading: 'Карта мира',
    level: 'Уровень',
  },
  hud: {
    label: 'Панель героя',
    xp: 'Опыт',
    lore: 'Познание мира',
    idle: 'Безымянный странник',
    character: 'Персонаж',
    inventory: 'Инвентарь',
    skills: 'Навыки',
    close: 'Закрыть',
  },
  location: {
    back: 'Назад к карте',
    event: 'Вызвать событие',
    quests: 'Задания',
  },
  quest: {
    answer: 'Ответить',
    study: 'Изучить',
    wrong: 'Неверный ответ, попробуйте снова',
    done: 'Пройдено',
  },
  levelup: {
    dismiss: 'Продолжить',
  },
  event: {
    title: 'Событие',
    close: 'Закрыть',
  },
  character: {
    title: 'Лист персонажа',
    forces: 'Силы персонажа',
    competencies: 'Компетенции',
  },
  inventoryPanel: {
    title: 'Инвентарь',
    empty: 'Инвентарь пуст. Проходите темы, чтобы добыть трофеи.',
    trophy: 'Трофей за освоенную тему',
  },
  skillsPanel: {
    title: 'Дерево навыков',
    statuses: {
      completed: 'Освоено',
      available: 'Доступно',
      locked: 'Закрыто',
    } as Record<string, string>,
  },
} as const;

// Порядок классов для выбора (id — без кириллицы, заголовки берутся из ru.classes).
export const CLASS_IDS = [
  'data-alchemist',
  'model-mage',
  'artifact-engineer',
] as const;
