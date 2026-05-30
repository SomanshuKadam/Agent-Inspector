// ============================================================
// InfluenceScorer — Heuristic file influence scoring
// ============================================================
import { FileInfo, InfluenceResult, ProjectRule } from "../types";

export class InfluenceScorer {
  /**
   * Score files by their likely influence on AI interactions.
   *
   * Weighting:
   * - Recency of open (30%): more recent = higher
   * - Recency of edit (30%): more recent = higher
   * - Frequency of access (20%): more opens + edits = higher
   * - Rule mentions (20%): if the file is mentioned in project rules
   */
  scoreFiles(files: FileInfo[], rules: ProjectRule[]): InfluenceResult[] {
    if (files.length === 0) {
      return [];
    }

    const now = Date.now();
    const ruleTexts = rules
      .filter((r) => r.enabled)
      .map((r) => r.text.toLowerCase());

    // Calculate raw scores
    const scored = files.map((file) => {
      // Recency of open: exponential decay over 24 hours
      const openAge = (now - file.openedAt) / (1000 * 60 * 60); // hours
      const openRecency = Math.exp(-openAge / 24) * 30;

      // Recency of edit: exponential decay over 24 hours
      let editRecency = 0;
      if (file.lastEditedAt) {
        const editAge = (now - file.lastEditedAt) / (1000 * 60 * 60);
        editRecency = Math.exp(-editAge / 24) * 30;
      }

      // Frequency: log scale of access count
      const accessCount = file.openCount + file.editCount;
      const frequency = Math.min(20, Math.log2(accessCount + 1) * 10);

      // Rule mentions: check if filename appears in any rule
      const fileNameLower = file.name.toLowerCase();
      const filePathLower = file.path.toLowerCase();
      const ruleScore = ruleTexts.some(
        (rt) => rt.includes(fileNameLower) || rt.includes(filePathLower)
      )
        ? 20
        : 0;

      const totalScore = openRecency + editRecency + frequency + ruleScore;

      return {
        file,
        rawScore: totalScore,
      };
    });

    // Sort by score descending
    scored.sort((a, b) => b.rawScore - a.rawScore);

    // Normalize to percentages
    const totalRaw = scored.reduce((sum, s) => sum + s.rawScore, 0);

    return scored.map((s) => {
      const percentage =
        totalRaw > 0 ? Math.round((s.rawScore / totalRaw) * 100) : 0;

      let level: "high" | "medium" | "low";
      if (percentage >= 25) {
        level = "high";
      } else if (percentage >= 10) {
        level = "medium";
      } else {
        level = "low";
      }

      const factors: string[] = [];
      if (s.file.lastEditedAt) {
        factors.push("Recently edited");
      }
      if (s.file.openCount > 1) {
        factors.push("Frequently accessed");
      }
      const fileNameLower = s.file.name.toLowerCase();
      if (ruleTexts.some((rt) => rt.includes(fileNameLower))) {
        factors.push("Mentioned in rules");
      }
      if (s.file.openedAt > now - 1000 * 60 * 30) {
        factors.push("Recently opened");
      }

      return {
        fileName: s.file.name,
        filePath: s.file.path,
        percentage,
        level,
        factors,
      };
    });
  }
}
