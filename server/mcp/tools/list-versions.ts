import {
  duxtDocVersions,
  duxtLocaleSetup,
  duxtMcpEvent,
  duxtSources
} from '../../utils/mcp-docs';

/**
 * Which editions of this documentation exist, and which one to read.
 *
 * The first call an agent should make, and the one that was missing: a site
 * publishing `/app`, `/app/v1` and four languages answered `list_pages` with
 * every page of every one of them, and nothing said which was current. A
 * reader has a version switcher for this; a model had to infer it from paths.
 *
 * What it hands back is the PREFIX — the same string a browser takes — because
 * that is also the whole of the scope `list_pages` and `search_docs` accept.
 * No opaque identifier, no repository/version/locale tuple to reassemble.
 */
export default defineMcpTool({
  name: 'list_versions',
  title: 'List documentation versions',
  description:
    'Every version of this documentation: the URL prefix that scopes it, its ' +
    'label, lifecycle status, the languages it is published in and whether it ' +
    'is the default. Pass a prefix to `list_pages` or `search_docs`.',
  annotations: { readOnlyHint: true },

  // NO PARAMETERS, AND THAT IS DELIBERATE. A tool without an `inputSchema` is
  // called with ONE argument — the SDK hands the handler `extra` rather than
  // `(args, extra)` — so a handler that names its parameters has to know which
  // arity it is on. Nothing here needs either of them: the request comes from
  // `duxtMcpEvent()`, which is where it always had to come from.
  async handler() {
    const setup = duxtLocaleSetup(duxtMcpEvent());
    const versions = duxtDocVersions(duxtSources(), setup);

    // A site whose every source is a generated section publishes no version to
    // choose between. Saying so beats an empty block an agent reads as a fault.
    if (!versions.length)
      return {
        content: [
          {
            type: 'text',
            text:
              'This site publishes no versioned documentation. ' +
              'Call `list_pages` without a prefix.'
          }
        ]
      };

    const listing = versions
      .map((version) => {
        // The lifecycle and the default role are different questions, and a
        // list where three entries look alike says nothing about which of them
        // is still safe to read.
        const roles = [version.status, version.isDefault && 'default'].filter(
          Boolean
        );
        const lines = [
          `- ${version.prefix} — ${version.label} (${roles.join(', ')})`
        ];

        if (version.locales.length)
          lines.push(
            `  locales: ${version.locales
              .map((locale) => `${locale.code} → ${locale.prefix}`)
              .join(', ')}`
          );

        const origin = [
          version.repository,
          version.ref && `${version.refKind ?? 'ref'} ${version.ref}`,
          version.path
        ].filter(Boolean);
        if (origin.length) lines.push(`  source: ${origin.join(', ')}`);

        return lines.join('\n');
      })
      .join('\n');

    return { content: [{ type: 'text', text: listing }] };
  }
});
