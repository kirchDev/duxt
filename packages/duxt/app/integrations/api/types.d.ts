declare global {
  /** Compatibility name for a request supplied to a code-sample generator. */
  type DuxtOpenApiRequest = DuxtRequest;
  interface DuxtConfig {
    /** Separate limits for derived examples and schema-tree rendering. */
    openapi?: { exampleDepth?: number; schemaDepth?: number };
  }
}
export {};
