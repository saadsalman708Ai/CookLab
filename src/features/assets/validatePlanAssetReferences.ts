import type { CompactPlanV1 } from "../plan/types";
import type {
  AssetInventoryEntryV1,
  AssetInventoryV1,
  PlanAssetReferenceError,
} from "./types";

function isSafeFilename(filename: string): boolean {
  return (
    filename.length > 0 &&
    filename !== "." &&
    filename !== ".." &&
    !/[\\/:\u0000-\u001f\u007f]/.test(filename) &&
    !/^[A-Za-z]:/.test(filename)
  );
}

function isSafeInventoryPath(relativePath: string): boolean {
  if (
    relativePath.length === 0 ||
    relativePath.startsWith("/") ||
    relativePath.includes("\\") ||
    relativePath.includes(":") ||
    /[\u0000-\u001f\u007f]/.test(relativePath)
  ) {
    return false;
  }

  return relativePath.split("/").every((part) => part.length > 0 && part !== "." && part !== "..");
}

function matchingFiles(entries: AssetInventoryEntryV1[], filename: string): AssetInventoryEntryV1[] {
  return entries.filter((entry) => {
    if (!isSafeInventoryPath(entry.relativePath)) return false;
    const pathParts = entry.relativePath.split("/");
    return pathParts[pathParts.length - 1] === filename;
  });
}

export function validatePlanAssetReferences(
  plan: CompactPlanV1,
  inventory: AssetInventoryV1,
): PlanAssetReferenceError[] {
  const errors: PlanAssetReferenceError[] = [];

  const validateRegions = (
    section: "themes" | "music",
    expectedCategory: "theme" | "music",
    expectedEntries: AssetInventoryEntryV1[],
    otherEntries: AssetInventoryEntryV1[],
  ) => {
    for (const [index, region] of plan[section].entries()) {
      const path = `/${section}/${index}/file`;
      const filename = region.file;

      if (!isSafeFilename(filename)) {
        errors.push({
          path,
          filename,
          message: `Asset filename "${filename}" must be a single filename without path separators or traversal components.`,
          keyword: "reference",
        });
        continue;
      }

      const matches = matchingFiles(expectedEntries, filename);
      if (matches.length === 1) continue;
      if (matches.length > 1) {
        errors.push({
          path,
          filename,
          message: `Asset filename "${filename}" is ambiguous in the ${expectedCategory} inventory; it matches multiple files.`,
          keyword: "reference",
        });
        continue;
      }

      const existsInOtherCategory = matchingFiles(otherEntries, filename).length > 0;
      errors.push({
        path,
        filename,
        message: existsInOtherCategory
          ? `Asset filename "${filename}" exists in the inventory as the wrong category; expected a ${expectedCategory} asset.`
          : `Asset filename "${filename}" was not found in the ${expectedCategory} inventory.`,
        keyword: "reference",
      });
    }
  };

  validateRegions("themes", "theme", inventory.themes, inventory.music);
  validateRegions("music", "music", inventory.music, inventory.themes);

  return errors;
}
