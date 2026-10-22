import Ajv2020 from "ajv/dist/2020.js";
import type { ErrorObject } from "ajv";
import schema from "./inventory-v1.schema.json" with { type: "json" };
import type {
  AssetInventoryValidationError,
  AssetInventoryV1,
  ParseAssetInventoryResult,
} from "./types";

const ajv = new Ajv2020({ allErrors: true });
const validateInventory = ajv.compile<AssetInventoryV1>(schema);

function toValidationError(error: ErrorObject): AssetInventoryValidationError {
  const params = error.params as Record<string, unknown>;
  const missingProperty = params.missingProperty;
  const path =
    error.keyword === "required" && typeof missingProperty === "string"
      ? `${error.instancePath}/${missingProperty.replace(/~/g, "~0").replace(/\//g, "~1")}`
      : error.instancePath || "/";
  const message =
    error.keyword === "required" && typeof missingProperty === "string"
      ? `Missing required property "${missingProperty}".`
      : error.message ?? "Value does not match the asset inventory schema.";

  return { path, message, keyword: error.keyword };
}

function isSafeRelativePath(value: string): boolean {
  if (
    value.startsWith("/") ||
    /^[A-Za-z]:/.test(value) ||
    value.includes("\\") ||
    value.includes(":") ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    return false;
  }

  const parts = value.split("/");
  return parts.every((part) => part.length > 0 && part !== "." && part !== "..");
}

function validateInventorySemantics(
  inventory: AssetInventoryV1,
): AssetInventoryValidationError[] {
  const errors: AssetInventoryValidationError[] = [];
  const firstPathById = new Map<string, string>();

  for (const category of ["themes", "music"] as const) {
    inventory[category].forEach((asset, index) => {
      const basePath = `/${category}/${index}`;
      const firstPath = firstPathById.get(asset.id);

      if (firstPath) {
        errors.push({
          path: `${basePath}/id`,
          message: `Duplicate asset ID "${asset.id}"; it was first declared at ${firstPath}. Asset IDs are unique across the inventory.`,
          keyword: "duplicateId",
        });
      } else {
        firstPathById.set(asset.id, `${basePath}/id`);
      }

      if (!isSafeRelativePath(asset.relativePath)) {
        errors.push({
          path: `${basePath}/relativePath`,
          message:
            "Use a non-empty, slash-separated relative path without a root, colon, backslash, empty segment, '.' segment, or '..' segment.",
          keyword: "relativePath",
        });
      }
    });
  }

  return errors;
}

function safeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error.";
}

export function parseAssetInventory(jsonText: string): ParseAssetInventoryResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    return {
      ok: false,
      errors: [
        {
          path: "/",
          message: `Invalid JSON: ${safeErrorMessage(error)}`,
          keyword: "parse",
        },
      ],
    };
  }

  try {
    if (!validateInventory(parsed)) {
      const errors = validateInventory.errors?.map(toValidationError) ?? [];
      return {
        ok: false,
        errors:
          errors.length > 0
            ? errors
            : [{ path: "/", message: "Inventory does not match the V1 schema." }],
      };
    }

    const semanticErrors = validateInventorySemantics(parsed);
    return semanticErrors.length > 0
      ? { ok: false, errors: semanticErrors }
      : { ok: true, inventory: parsed };
  } catch (error) {
    return {
      ok: false,
      errors: [
        {
          path: "/",
          message: `Inventory validation could not be completed: ${safeErrorMessage(error)}`,
          keyword: "validation",
        },
      ],
    };
  }
}
