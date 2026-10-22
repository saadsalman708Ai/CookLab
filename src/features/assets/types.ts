export interface AssetInventoryEntryV1 {
  id: string;
  name: string;
  relativePath: string;
}

export interface AssetInventoryV1 {
  inventoryVersion: 1;
  notes?: string;
  themes: AssetInventoryEntryV1[];
  music: AssetInventoryEntryV1[];
}

export interface AssetInventoryValidationError {
  path: string;
  message: string;
  keyword?: string;
}

export type ParseAssetInventoryResult =
  | { ok: true; inventory: AssetInventoryV1 }
  | { ok: false; errors: AssetInventoryValidationError[] };

export interface PlanAssetReferenceError {
  path: string;
  assetId: string;
  message: string;
  keyword: "reference";
}
