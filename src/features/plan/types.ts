export type WordTiming = [startSeconds: number, endSeconds: number, word: string];

export interface TranscriptV1 {
  words: WordTiming[];
}

export interface FootageIntentV1 {
  query: string;
  keywords: string[];
  alternates?: string[];
  avoid?: string[];
  shotIntent?: string;
}

export interface PlanSegmentV1 {
  id: string;
  start: number;
  end: number;
  purpose: string;
  footage: FootageIntentV1;
}

export interface AssetRegionV1 {
  start: number;
  end: number;
  assetId: string;
  purpose: string;
}

export interface OverlayEventV1 {
  id: string;
  start: number;
  durationSeconds?: number;
  templateId: string;
  purpose: string;
  parameters: Record<string, unknown>;
  audioAssetId?: string;
}

export type AssetRecommendationCategoryV1 =
  | "footage"
  | "theme"
  | "music"
  | "overlay"
  | "sfx"
  | "image";

export interface AssetRecommendationV1 {
  category: AssetRecommendationCategoryV1;
  start: number;
  end: number;
  purpose: string;
  desired: string;
  searchTerms: string[];
}

export interface CompactPlanV1 {
  schemaVersion: 1;
  title: string;
  niche: string;
  transcript: TranscriptV1;
  segments: PlanSegmentV1[];
  themeRegions?: AssetRegionV1[];
  musicRegions?: AssetRegionV1[];
  overlays?: OverlayEventV1[];
  assetRecommendations?: AssetRecommendationV1[];
  directorNotes?: string;
}
