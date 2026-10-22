import type { CompactPlanV1 } from "../plan/types";
import type {
  AssetInventoryV1,
  PlanAssetReferenceError,
} from "./types";

export function validatePlanAssetReferences(
  plan: CompactPlanV1,
  inventory: AssetInventoryV1,
): PlanAssetReferenceError[] {
  const errors: PlanAssetReferenceError[] = [];
  const themes = new Set(inventory.themes.map((asset) => asset.id));
  const music = new Set(inventory.music.map((asset) => asset.id));

  const validateRegions = (
    section: "themeRegions" | "musicRegions",
    expectedCategory: "theme" | "music",
    expectedIds: Set<string>,
    otherIds: Set<string>,
  ) => {
    for (const [index, region] of (plan[section] ?? []).entries()) {
      if (expectedIds.has(region.assetId)) continue;

      const wrongCategory = otherIds.has(region.assetId);
      errors.push({
        path: `/${section}/${index}/assetId`,
        assetId: region.assetId,
        message: wrongCategory
          ? `Asset ID "${region.assetId}" exists in the inventory as the wrong category; expected a ${expectedCategory} asset.`
          : `Asset ID "${region.assetId}" was not found in the ${expectedCategory} inventory.`,
        keyword: "reference",
      });
    }
  };

  validateRegions("themeRegions", "theme", themes, music);
  validateRegions("musicRegions", "music", music, themes);

  return errors;
}
