import type { CompactPlanV1 } from "./types";

export interface PlanSemanticError {
  path: string;
  message: string;
  keyword: "semantic";
}

export function validatePlanSemantics(plan: CompactPlanV1): PlanSemanticError[] {
  const errors: PlanSemanticError[] = [];
  const words = plan.transcript.words;
  const segments = plan.segments;

  for (let index = 0; index < words.length; index += 1) {
    const [startSeconds, endSeconds] = words[index];

    if (endSeconds <= startSeconds) {
      errors.push({
        path: `/transcript/words/${index}`,
        message: `Word interval end (${endSeconds}) must be greater than its start (${startSeconds}).`,
        keyword: "semantic",
      });
    }

    if (index > 0 && startSeconds < words[index - 1][0]) {
      errors.push({
        path: `/transcript/words/${index}`,
        message: `Word start (${startSeconds}) is earlier than the preceding word start (${words[index - 1][0]}). Keep transcript words in chronological order.`,
        keyword: "semantic",
      });
    }
  }

  let segmentIntervalsHavePositiveLength = true;

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];

    if (segment.end <= segment.start) {
      errors.push({
        path: `/segments/${index}/end`,
        message: `Segment end (${segment.end}) must be greater than its start (${segment.start}).`,
        keyword: "semantic",
      });
      segmentIntervalsHavePositiveLength = false;
    }

    if (index > 0 && segment.start < segments[index - 1].start) {
      errors.push({
        path: `/segments/${index}/start`,
        message: `Segment starts at ${segment.start}, before the preceding segment starts at ${segments[index - 1].start}. Keep segments in chronological order.`,
        keyword: "semantic",
      });
    }
  }

  // Skip assignment diagnostics when zero- or negative-length ranges could
  // create cascading uncovered or multiply-covered word errors.
  if (segmentIntervalsHavePositiveLength) {
    for (let wordIndex = 0; wordIndex < words.length; wordIndex += 1) {
      const wordStart = words[wordIndex][0];
      const matchingSegmentIndexes: number[] = [];

      for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex += 1) {
        const segment = segments[segmentIndex];
        if (wordStart >= segment.start && wordStart < segment.end) {
          matchingSegmentIndexes.push(segmentIndex);
        }
      }

      if (matchingSegmentIndexes.length === 0) {
        errors.push({
          path: `/transcript/words/${wordIndex}`,
          message: `Word start (${wordStart}) is not covered by any segment. Segment intervals include their start and exclude their end.`,
          keyword: "semantic",
        });
      } else if (matchingSegmentIndexes.length > 1) {
        errors.push({
          path: `/transcript/words/${wordIndex}`,
          message: `Word start (${wordStart}) is covered by multiple segments: ${matchingSegmentIndexes.join(", ")}. Adjust the segment intervals so exactly one includes it.`,
          keyword: "semantic",
        });
      }
    }
  }

  return errors;
}
