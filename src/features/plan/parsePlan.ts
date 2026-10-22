import Ajv2020 from "ajv/dist/2020.js";
import type { ErrorObject } from "ajv";
import schema from "./schema-v1.json" with { type: "json" };
import type { CompactPlanV1 } from "./types";

export interface PlanValidationError {
  path: string;
  message: string;
  keyword?: string;
}

export type ParsePlanResult =
  | { ok: true; plan: CompactPlanV1 }
  | { ok: false; errors: PlanValidationError[] };

const ajv = new Ajv2020({ allErrors: true });
const validatePlan = ajv.compile<CompactPlanV1>(schema);

function toValidationError(error: ErrorObject): PlanValidationError {
  const params = error.params as Record<string, unknown>;
  const basePath = error.instancePath;
  const missingProperty = params.missingProperty;
  const path =
    error.keyword === "required" && typeof missingProperty === "string"
      ? `${basePath}/${missingProperty.replace(/~/g, "~0").replace(/\//g, "~1")}`
      : basePath || "/";

  const message =
    error.keyword === "required" && typeof missingProperty === "string"
      ? `Missing required property "${missingProperty}".`
      : error.message ?? "Value does not match the plan schema.";

  return { path, message, keyword: error.keyword };
}

function safeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error.";
}

export function parsePlan(jsonText: string): ParsePlanResult {
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
    if (validatePlan(parsed)) {
      return { ok: true, plan: parsed };
    }

    const errors = validatePlan.errors?.map(toValidationError) ?? [];
    return {
      ok: false,
      errors:
        errors.length > 0
          ? errors
          : [{ path: "/", message: "Plan does not match the V1 schema." }],
    };
  } catch (error) {
    return {
      ok: false,
      errors: [
        {
          path: "/",
          message: `Plan validation could not be completed: ${safeErrorMessage(error)}`,
          keyword: "validation",
        },
      ],
    };
  }
}
