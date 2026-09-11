import { parse as parseYaml } from 'yaml';
import { describe, expect, it } from 'vitest';
import { DUXT_BRUNO_LAYOUT, brunoSectionType } from '../sections-bruno';
import type { DuxtSectionOptions } from '../sections-resolve';
import { duxtSectionInput } from '../sections-resolve';

const FILES: Record<string, string> = {
  'bruno.json': '{"version":"1","name":"Shipments","type":"collection"}',
  'collection.bru': 'docs {\n  Everything the API does.\n}\n',
  'ping.bru':
    'meta {\n  name: Ping\n  seq: 1\n}\n\nget {\n  url: {{baseUrl}}/ping\n}\n',
  'shipments/folder.bru': 'meta {\n  name: Shipments\n  seq: 1\n}\n',
  'shipments/list.bru': `meta {
  name: List shipments
  type: http
  seq: 1
}

get {
  url: {{baseUrl}}/shipments?limit=10
  body: none
  auth: bearer
}

params:query {
  limit: 10
}

headers {
  Accept: application/json
}

docs {
  Every shipment, newest first.
}
`,
  'shipments/create.bru': `meta {
  name: Create a shipment
  seq: 2
}

post {
  url: {{baseUrl}}/shipments
  body: json
}

body:json {
  {
    "destination": "Berlin"
  }
}
`,
  'environments/prod.bru': 'vars {\n  TOKEN: hunter2\n}\n'
};

const context = (options: DuxtSectionOptions = {}) => ({
  label: 'Collection',
  collection: 'demo_collection',
  remote: false,
  prefix: '/demo/collection',
  options
});

const parse = (
  options: DuxtSectionOptions = {},
  files: Record<string, string> = FILES
) => brunoSectionType.parse(duxtSectionInput('api', files), context(options));

/** The YAML block a page's MDC component carries, read back. */
function props(body: string): Record<string, unknown> {
  const block = /^:{3,}[a-z-]+\n---\n([\s\S]*?)\n---\n/m.exec(body);
  expect(block, 'the page carries an MDC component with props').toBeTruthy();

  return parseYaml(block![1]!) as Record<string, unknown>;
}

const page = (pages: { file: string; body: string }[], file: string) =>
  pages.find((candidate) => candidate.file === file);

describe('the policies the registry asks every type for', () => {
  it('is per version and per locale, matching openapi', () => {
    // An API belongs to the release it describes, and a `.bru` file's `docs`
    // blocks are written prose — so a translated collection is a real artefact.
    expect(brunoSectionType.versioning).toBe('per-version');
    expect(brunoSectionType.localisation).toBe('per-locale');
  });

  it('reads a directory rather than a file', () => {
    expect(brunoSectionType.input).toBe('directory');
  });

  it('renders in the shared reference chrome', () => {
    // The whole point of a second API type: one rendering path, two parsers.
    expect(brunoSectionType.layout).toBe(DUXT_BRUNO_LAYOUT);
  });
});

describe('the pages a collection becomes', () => {
  it('makes a page per request, grouped by folder', () => {
    expect(parse().map((entry) => entry.file)).toEqual([
      'index.md',
      '1.shipments/index.md',
      '1.shipments/1.list-shipments.md',
      '1.shipments/2.create-a-shipment.md',
      '2.ping.md'
    ]);
  });

  it('titles a request page with its name and its method and path', () => {
    const request = page(parse(), '1.shipments/1.list-shipments.md')!;

    expect(request.body).toContain('title: "List shipments"');
    expect(request.body).toContain('GET');
  });

  it('writes the request docs outside the component, as CommonMark', () => {
    // The same rule `openapi` follows: prose written as prose, so Content
    // parses it, the search indexes it and `llms-full.txt` carries it.
    const request = page(parse(), '1.shipments/1.list-shipments.md')!;

    expect(request.body).toContain('Every shipment, newest first.');
    expect(props(request.body)).not.toHaveProperty('docs');
  });

  it('hands the component the method, the url, the headers and the body', () => {
    const create = props(
      page(parse(), '1.shipments/2.create-a-shipment.md')!.body
    );

    expect(create.request).toMatchObject({
      method: 'POST',
      url: '{{baseUrl}}/shipments',
      body: { type: 'json', language: 'json' }
    });
  });

  it('lists the folders and the loose requests on the overview', () => {
    const overview = props(page(parse(), 'index.md')!.body);

    expect(overview).toMatchObject({
      name: 'Shipments',
      version: '1',
      groups: [
        { name: 'Shipments', requests: 2, to: '/demo/collection/shipments' }
      ],
      requests: [{ name: 'Ping', to: '/demo/collection/ping' }]
    });
  });

  it('says how many environments it refused to publish', () => {
    // A reader has to know the collection expects one; the file is never read.
    const overview = props(page(parse(), 'index.md')!.body);

    expect(overview.environments).toBe(1);
    expect(
      parse()
        .map((entry) => entry.body)
        .join('')
    ).not.toContain('hunter2');
  });
});

describe('acquiring the collection', () => {
  it('offers the archive of this very version', () => {
    // Named for the collection, which is what the module emitting the file
    // names it too.
    expect(props(page(parse(), 'index.md')!.body).download).toBe(
      '/_duxt/bruno/demo_collection.zip'
    );
  });

  it('offers no archive for a remote collection', () => {
    // A remote checkout lands where only the collection that declared it can
    // see, so nothing outside can build the archive — and a link to a file that
    // is not there is worse than no link.
    const pages = brunoSectionType.parse(duxtSectionInput('api', FILES), {
      ...context(),
      remote: true
    });

    expect(props(page(pages, 'index.md')!.body)).not.toHaveProperty('download');
  });

  it('offers Fetch in Bruno only where a git url was declared', () => {
    expect(props(page(parse(), 'index.md')!.body)).not.toHaveProperty('fetch');

    const offered = parse({ fetch: 'https://github.com/acme/api.git' });

    expect(props(page(offered, 'index.md')!.body).fetch).toBe(
      'https://fetch.usebruno.com/?url=https%3A%2F%2Fgithub.com%2Facme%2Fapi.git'
    );
  });
});

describe('try-it, which is off until a site turns it on', () => {
  it('publishes a static page when no base url was declared', () => {
    const request = props(
      page(parse(), '1.shipments/1.list-shipments.md')!.body
    );

    expect(request).not.toHaveProperty('operation');
  });

  it('resolves the url against the declared public base', () => {
    const pages = parse({ tryIt: { baseUrl: 'https://api.test' } });
    const request = props(page(pages, '1.shipments/1.list-shipments.md')!.body);

    expect(request.servers).toEqual([{ url: 'https://api.test' }]);
    expect(request.operation).toMatchObject({
      method: 'GET',
      path: '/shipments'
    });
  });

  it('offers no client where the url holds a variable the site did not declare', () => {
    // A send button that cannot build a real URL is worse than none.
    const pages = parse(
      { tryIt: { baseUrl: 'https://api.test' } },
      {
        'bruno.json': '{"name":"X"}',
        'a.bru':
          'meta {\n  name: A\n}\n\nget {\n  url: {{baseUrl}}/{{tenant}}/x\n}\n'
      }
    );

    expect(props(page(pages, '1.a.md')!.body)).not.toHaveProperty('operation');
  });

  it('substitutes a variable the site declared a public value for', () => {
    const pages = parse(
      { tryIt: { baseUrl: 'https://api.test', variables: { tenant: 'acme' } } },
      {
        'bruno.json': '{"name":"X"}',
        'a.bru':
          'meta {\n  name: A\n}\n\nget {\n  url: {{baseUrl}}/{{tenant}}/x\n}\n'
      }
    );

    expect(props(page(pages, '1.a.md')!.body).operation).toMatchObject({
      path: '/acme/x'
    });
  });

  it('turns a bruno path parameter into a box the reader can edit', () => {
    const pages = parse(
      { tryIt: { baseUrl: 'https://api.test' } },
      {
        'bruno.json': '{"name":"X"}',
        'a.bru':
          'meta {\n  name: A\n}\n\nget {\n  url: {{baseUrl}}/users/:id\n}\n\nparams:path {\n  id: 42\n}\n'
      }
    );

    const request = props(page(pages, '1.a.md')!.body);

    expect(request.operation).toMatchObject({
      path: '/users/{id}',
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          examples: [{ name: 'default', value: '42' }]
        }
      ]
    });
  });

  it('never prefills a redacted header into the client', () => {
    // The one place a live credential is written in the open; the box is drawn
    // so the reader can supply their own, and it opens empty.
    const pages = parse(
      { tryIt: { baseUrl: 'https://api.test' } },
      {
        'bruno.json': '{"name":"X"}',
        'a.bru':
          'meta {\n  name: A\n}\n\nget {\n  url: {{baseUrl}}/x\n}\n\nheaders {\n  Authorization: Bearer sk-live-secret\n}\n'
      }
    );

    const body = page(pages, '1.a.md')!.body;

    expect(body).not.toContain('sk-live-secret');
    expect(
      (props(body).operation as Record<string, unknown>).parameters
    ).toEqual([{ name: 'Authorization', in: 'header', required: false }]);
  });
});

describe('what the type refuses to read', () => {
  it('carries no script and no test into a page', () => {
    const pages = parse(
      {},
      {
        'bruno.json': '{"name":"X"}',
        'a.bru':
          "meta {\n  name: A\n}\n\nget {\n  url: /x\n}\n\nscript:pre-request {\n  bru.setVar('k', 'hunter2');\n}\n\ntests {\n  test('t', () => {});\n}\n"
      }
    );

    const body = page(pages, '1.a.md')!.body;

    expect(body).not.toContain('hunter2');
    expect(props(body).request).toMatchObject({ script: true, tests: true });
  });

  it('reports what the parser could not read', () => {
    const warnings: string[] = [];

    brunoSectionType.parse(
      duxtSectionInput('api', {
        'bruno.json': '{"name":"X"}',
        'a.bru': 'meta {\n  name: A\n}\n'
      }),
      { ...context(), warn: (message) => warnings.push(message) }
    );

    expect(warnings).toContain(
      'the request "a.bru" names no HTTP method, so it was skipped.'
    );
  });
});
