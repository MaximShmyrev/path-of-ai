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
} as const;

// Порядок классов для выбора (id — без кириллицы, заголовки берутся из ru.classes).
export const CLASS_IDS = [
  'data-alchemist',
  'model-mage',
  'artifact-engineer',
] as const;
