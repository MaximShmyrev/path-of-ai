/* Типы ответов API (зеркало backend DTO, SPEC §6). */

export type TopicStatus = 'available' | 'locked' | 'completed';
export type RegionStatus = 'open' | 'locked';
export type QuestKind = 'theory' | 'practice' | 'boss';

export type HeroView = {
  name: string;
  class_id: string;
  avatar_ref: string | null;
  level: number;
  total_xp: number;
  xp_to_next_level: number;
};

export type MapTopic = {
  id: string;
  title: string;
  status: TopicStatus;
};

export type MapRegion = {
  id: string;
  title: string;
  unlock_level: number;
  status: RegionStatus;
  topics: MapTopic[];
};

export type MapView = {
  level: number;
  regions: MapRegion[];
};

export type QuizQuestionView = {
  prompt: string;
  options: string[];
};

export type QuestView = {
  id: string;
  title: string;
  kind: QuestKind;
  xp: number;
  quiz: QuizQuestionView[];
};

export type TopicView = {
  id: string;
  title: string;
  status: TopicStatus;
  quests: QuestView[];
};

export type CompleteView = {
  gained_xp: number;
  leveled_up: boolean;
  new_level: number;
  newly_unlocked_regions: string[];
  already_completed: boolean;
  hero: HeroView;
};

export type EventView = {
  text: string;
  source: 'glm' | 'bank';
};

export type CreateHeroInput = {
  name: string;
  classId: string;
  avatarRef?: string;
};

export interface ApiClient {
  createHero(input: CreateHeroInput): Promise<HeroView>;
  getHero(): Promise<HeroView | null>;
  getMap(): Promise<MapView>;
  getTopic(topicId: string): Promise<TopicView>;
  completeQuest(questId: string, answers?: number[]): Promise<CompleteView>;
  generateEvent(locationId: string): Promise<EventView>;
}
