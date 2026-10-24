export type WordTiming = [startSeconds: number, endSeconds: number, word: string];

export interface FootageIntentV1 {
  query: string;
  keywords: string[];
  alternates?: string[];
  avoid?: string[];
  visualIntent?: string;
}

export interface PlanSegmentV1 {
  start: number;
  end: number;
  purpose: string;
  footage: FootageIntentV1;
}

export interface AssetFileRegionV1 {
  start: number;
  end: number;
  file: string;
  reason?: string;
}

export interface OverlayEventV1 {
  start: number;
  folder: string;
  durationSeconds?: number;
  parameters: Record<string, unknown>;
  purpose?: string;
  reason?: string;
}

export type AssetRecommendationCategoryV1 = "footage" | "theme" | "music" | "overlay";

export interface AssetRecommendationV1 {
  category: AssetRecommendationCategoryV1;
  start?: number;
  end?: number;
  reason: string;
  desiredCharacteristics: string;
  searchTerms: string[];
}

export interface CompactPlanV1 {
  schemaVersion: 1;
  title: string;
  transcript: WordTiming[];
  segments: PlanSegmentV1[];
  themes: AssetFileRegionV1[];
  music: AssetFileRegionV1[];
  overlays: OverlayEventV1[];
  assetRecommendations?: AssetRecommendationV1[];
  directorNotes?: string[];
}
