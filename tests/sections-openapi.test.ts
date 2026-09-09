import { parse as parseYaml } from 'yaml';
import { describe, expect, it, vi } from 'vitest';
import { DUXT_OPENAPI_LAYOUT, openapiSectionType } from '../sections-openapi';

const context = { label: 'API', prefix: '/api' };

const SPEC = `
openapi: 3.1.0
info:
  title: Pet Store
  version: 1.4.0
  description: |
    The store, described.

    A second paragraph.
servers:
  - url: https://api.test/v1
tags:
  - { name: Pets, description: Everything about pets. }
  - { name: Stores }
paths:
  /pets:
    get:
      operationId: listPets
      summary: List pets
      description: Returns every pet.
      tags: [Pets]
      responses: { '200': { description: ok } }
    post:
      summary: 'Create: a pet'
      tags: [Pets]
      responses: { '201': { description: created } }
  /stores/{id}:
    get:
      tags: [Stores]
      responses: { '200': { description: ok } }
`;

const parse = (artefact = SPEC) => openapiSectionType.parse(artefact, context);

/** The YAML block a page's MDC component carries, read back. */
function props(body: string): Record<string, unknown> {
  const block = /^:{3,}[a-z-]+\n---\n([\s\S]*?)\n---\n/m.exec(body);
  expect(block, 'the page carries an MDC component with props').toBeTruthy();

  return parseYaml(block![1]!) as Record<string, unknown>;
}

describe('the openapi type', () => {
  it('is per version, per locale, and owns a layout', () => {
    // The three policies the registry exists to make parameters, and all three
    // are the changelog's opposite — which is the point.
    expect(openapiSectionType.versioning).toBe('per-version');
    expect(openapiSectionType.localisation).toBe('per-locale');
    expect(openapiSectionType.layout).toBe(DUXT_OPENAPI_LAYOUT);
  });

  it('writes one page per operation, plus an index per tag', () => {
    expect(parse().map((page) => page.file)).toEqual([
      'index.md',
      '1.pets/index.md',
      '1.pets/1.listpets.md',
      '1.pets/2.post-pets.md',
      '2.stores/index.md',
      '2.stores/1.get-stores-id.md'
    ]);
  });

  it('names an operation by its operationId, which is what an SDK links to', () => {
    const page = parse().find((entry) => entry.file.endsWith('1.listpets.md'));

    expect(page).toBeTruthy();
  });

  it('falls back to the method and path where there is no operationId', () => {
    const page = parse().find((entry) =>
      entry.file.endsWith('1.get-stores-id.md')
    );

    expect(page).toBeTruthy();
  });

  it('gives every page a title a colon cannot break', () => {
    const created = parse().find((entry) =>
      entry.file.endsWith('2.post-pets.md')
    )!;

    // `Create: a pet` unquoted would end the YAML mapping on the colon —
    // the failure `tests/frontmatter-yaml.test.ts` exists over.
    expect(created.body).toContain('title: "Create: a pet"');
    expect(() =>
      parseYaml(/^---\n([\s\S]*?)\n---/.exec(created.body)![1]!)
    ).not.toThrow();
  });

  it('writes no heading, because the shell draws it from the title', () => {
    // The header a written page gets is the header these pages get: the title
    // is in the frontmatter, and `pages/[...slug].vue` draws the `<h1>` for
    // every generated page whose body opens on no heading of its own.
    for (const page of parse()) {
      expect(page.body).toContain('title: "');
      expect(page.body).not.toMatch(/^# .+$/m);
    }
  });

  it('leaves the prose as Markdown outside the component', () => {
    const listed = parse().find((entry) =>
      entry.file.endsWith('1.listpets.md')
    )!;

    // In the SLOT, not in the props: what the document wrote as CommonMark is
    // what the search indexes and `llms-full.txt` carries.
    expect(listed.body).toMatch(/---\nReturns every pet\.\n:{3,}$/m);
  });

  it('links a tag index at the operations under it', () => {
    const pets = parse().find((entry) => entry.file === '1.pets/index.md')!;

    expect(props(pets.body).operations).toMatchObject([
      { method: 'get', path: '/pets', to: '/api/pets/listpets' },
      { method: 'post', path: '/pets', to: '/api/pets/post-pets' }
    ]);
  });

  it('links the overview at every group', () => {
    const overview = parse().find((entry) => entry.file === 'index.md')!;

    expect(props(overview.body).groups).toMatchObject([
      { name: 'Pets', to: '/api/pets', operations: 2 },
      { name: 'Stores', to: '/api/stores', operations: 1 }
    ]);
  });

  it('hands the operation the servers and the security it actually has', () => {
    const listed = parse(`
openapi: 3.1.0
info: { title: Pets, version: '1' }
servers: [{ url: https://api.test }]
security: [{ apiKey: [] }]
paths:
  /pets:
    get:
      operationId: listPets
      servers: [{ url: https://pets.test }]
      responses: { '200': { description: ok } }
components:
  securitySchemes:
    apiKey: { type: apiKey, name: X-Api-Key, in: header }
`).find((entry) => entry.file.endsWith('listpets.md'))!;

    const carried = props(listed.body);

    // The operation's own servers REPLACE the document's — offering one the
    // endpoint is not served from is a try-it request that fails for a reason
    // nothing on the page explains.
    expect(carried.servers).toMatchObject([{ url: 'https://pets.test' }]);
    expect(carried.security).toMatchObject([[{ key: 'apiKey' }]]);
  });

  it('carries no `undefined` into the YAML the component reads', () => {
    for (const page of parse()) {
      expect(page.body).not.toContain('undefined');
    }
  });

  it('lengthens its own fence so a description cannot close it early', () => {
    const page = parse(`
openapi: 3.1.0
info: { title: Pets, version: '1' }
paths:
  /pets:
    get:
      operationId: listPets
      description: |
        Careful.

        :::callout
        Not a closing fence.
        :::
      responses: { '200': { description: ok } }
`).find((entry) => entry.file.endsWith('listpets.md'))!;

    expect(page.body).toContain('::::open-api-operation');
    // And the props are still readable, which is the failure this prevents.
    expect(props(page.body).operation).toMatchObject({ method: 'get' });
  });

  it('writes a plain-text summary, because a card is not prose', () => {
    const overview = parse(`
openapi: 3.1.0
info:
  title: Pets
  version: '1'
tags:
  - name: Pets
    description: The *shapes* are the point, see [the guide](https://example.org).
paths:
  /pets: { get: { tags: [Pets], responses: { '200': { description: ok } } } }
`).find((entry) => entry.file === 'index.md')!;

    // The description frontmatter and the group card both end up somewhere
    // that renders no Markdown — a meta tag, a search result, a card — so the
    // asterisks and the link syntax come out here rather than showing up as
    // punctuation there.
    expect(props(overview.body).groups).toMatchObject([
      { description: 'The shapes are the point, see the guide.' }
    ]);
  });

  it('says which document it could not read, rather than "nothing here"', () => {
    expect(() => parse('swagger: "2.0"')).toThrow(
      /could not read its OpenAPI document — this is a Swagger/
    );
  });

  it('produces nothing for a document with no operations at all', () => {
    // The scaffold turns "no pages" into the right severity for a local and a
    // remote artefact, so this type does not decide it a second time.
    expect(
      parse(`openapi: 3.1.0\ninfo: { title: Pets, version: '1' }`)
    ).toEqual([]);
  });
});

describe('what the document could not be read for', () => {
  const BROKEN = `
openapi: 3.1.0
info: { title: Pet Store, version: 1.0.0 }
tags: [{ name: Pets }]
paths:
  /pets:
    get:
      operationId: listPets
      tags: [Pets]
      responses:
        '200':
          description: ok
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Nope' }
`;

  it('hands an unresolvable reference to the report, not the console', () => {
    // A document is parsed while the config is loading, so a printed warning
    // about a dropped `$ref` has scrolled away before the dev server has
    // finished starting — and what it reports is content silently missing from
    // the reference.
    const warnings: string[] = [];
    const printed = vi.spyOn(console, 'warn').mockImplementation(() => {});

    openapiSectionType.parse(BROKEN, {
      ...context,
      options: {},
      warn: (message) => warnings.push(message)
    });

    expect(warnings).toEqual([
      'the reference "#/components/schemas/Nope" points at nothing in this document.'
    ]);
    expect(printed).not.toHaveBeenCalled();

    printed.mockRestore();
  });

  it('still parses when nothing is listening', () => {
    // `warn` is optional: a type is called with a bare context in a test, and
    // an artefact with a finding must not become an artefact that throws.
    expect(() =>
      openapiSectionType.parse(BROKEN, { ...context, options: {} })
    ).not.toThrow();
  });
});
