// ============================================================
// TokenEstimator — Character-based token count estimation
// ============================================================

/** Map of model names to context window sizes (in tokens). */
const MODEL_LIMITS: Record<string, number> = {
  "gpt-4": 128_000,
  "gpt-4-turbo": 128_000,
  "gpt-4o": 128_000,
  "claude-3": 200_000,
  "claude-3.5": 200_000,
  "gemini-pro": 1_000_000,
};

/** File extensions considered as code (higher token density). */
const CODE_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".java", ".py", ".go", ".rs",
  ".c", ".cpp", ".h", ".hpp", ".cs", ".rb", ".php", ".swift",
  ".kt", ".scala", ".sh", ".bash", ".zsh", ".ps1", ".sql",
  ".r", ".m", ".mm", ".dart", ".lua", ".pl", ".ex", ".exs",
  ".hs", ".elm", ".clj", ".erl", ".v", ".sv",
]);

export class TokenEstimator {
  /**
   * Estimate the number of tokens in a text string.
   * Code files use ~3 chars/token, prose uses ~4 chars/token.
   */
  estimateTokens(text: string, fileExtension: string): number {
    if (!text || text.length === 0) {
      return 0;
    }

    const ext = fileExtension.toLowerCase();
    const charsPerToken = CODE_EXTENSIONS.has(ext) ? 3 : 4;
    return Math.ceil(text.length / charsPerToken);
  }

  /**
   * Estimate tokens from file size in bytes (when content isn't loaded).
   * Assumes UTF-8 where most chars are 1 byte.
   */
  estimateTokensFromSize(sizeBytes: number, fileExtension: string): number {
    const ext = fileExtension.toLowerCase();
    const charsPerToken = CODE_EXTENSIONS.has(ext) ? 3 : 4;
    return Math.ceil(sizeBytes / charsPerToken);
  }

  /** Get the context window limit for a given model. */
  getModelLimit(model: string): number {
    return MODEL_LIMITS[model] ?? 128_000;
  }

  /** Get the context utilization percentage. */
  getUtilization(totalTokens: number, model: string): number {
    const limit = this.getModelLimit(model);
    if (limit === 0) {return 0;}
    return Math.min(100, Math.round((totalTokens / limit) * 100));
  }

  /** Get model display name. */
  getModelDisplayName(model: string): string {
    const names: Record<string, string> = {
      "gpt-4": "GPT-4 (128K)",
      "gpt-4-turbo": "GPT-4 Turbo (128K)",
      "gpt-4o": "GPT-4o (128K)",
      "claude-3": "Claude 3 (200K)",
      "claude-3.5": "Claude 3.5 (200K)",
      "gemini-pro": "Gemini Pro (1M)",
    };
    return names[model] ?? model;
  }
}
