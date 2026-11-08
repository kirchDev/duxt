/**
 * Public URL identities take precedence over optional spelling preferences.
 * Locale segments use their configured spelling (for example `de-DE`), and
 * generated provider pages retain identifiers such as `workflow_states`.
 * The suggested lowercase/dash replacements would point at different routes.
 * Response, fragment, accessibility and other correctness checks stay active.
 */
export const linkCheckerSkipInspections = [
  'no-uppercase-chars',
  'no-underscores'
];
