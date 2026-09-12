import { describe, expect, it } from 'vitest';
import { parseBruFile, parseBrunoCollection } from '../bruno-parse';
import { duxtSectionInput } from '../sections-resolve';

/** A collection input over files in memory. */
const collection = (files: Record<string, string>) =>
  parseBrunoCollection(duxtSectionInput('api', files));

const BRUNO_JSON = JSON.stringify({
  version: '1',
  name: 'Shipments',
  type: 'collection'
});

const GET_USER = `meta {
  name: Get user
  type: http
  seq: 2
}

get {
  url: {{baseUrl}}/users/{{userId}}?verbose=true
  body: none
  auth: bearer
}

params:query {
  verbose: true
  ~trace: 1
}

params:path {
  userId: 42
}

headers {
  Accept: application/json
  Authorization: Bearer sk-live-not-a-placeholder
}

auth:bearer {
  token: sk-live-not-a-placeholder
}

docs {
  Returns **one** user.
}
`;

describe('parseBruFile', () => {
  it('reads the blocks a request is made of', () => {
    const request = parseBruFile('users/get-user.bru', GET_USER, []);

    expect(request).toMatchObject({
      name: 'Get user',
      file: 'users/get-user.bru',
      seq: 2,
      method: 'GET',
      url: '{{baseUrl}}/users/{{userId}}?verbose=true',
      kind: 'http',
      docs: 'Returns **one** user.'
    });
  });

  it('keeps a disabled entry and says it is disabled', () => {
    // `~` is how Bruno turns a parameter off without deleting it, and a
    // reference that dropped the line would show a request the file does not
    // describe.
    const request = parseBruFile('a.bru', GET_USER, []);

    expect(request!.params).toEqual([
      { name: 'verbose', value: 'true', in: 'query' },
      { name: 'trace', value: '1', in: 'query', disabled: true },
      { name: 'userId', value: '42', in: 'path' }
    ]);
  });

  it('withholds the value of a header that names a credential', () => {
    // The line survives — an endpoint wanting an `Authorization` header is
    // exactly what a reference has to say — and the live token does not.
    const request = parseBruFile('a.bru', GET_USER, []);

    expect(request!.headers).toEqual([
      { name: 'Accept', value: 'application/json' },
      { name: 'Authorization', value: '', redacted: true }
    ]);
  });

  it('keeps a credential header whose value is only a placeholder', () => {
    // `{{token}}` names a variable rather than carrying one, and redacting it
    // would hide which variable the reader has to set.
    const request = parseBruFile(
      'a.bru',
      `meta {\n  name: a\n}\n\nget {\n  url: /x\n}\n\nheaders {\n  Authorization: Bearer {{token}}\n}\n`,
      []
    );

    expect(request!.headers).toEqual([
      { name: 'Authorization', value: 'Bearer {{token}}' }
    ]);
  });

  it('withholds a credential whose value sits beside a placeholder', () => {
    // The rule is "nothing but placeholders", not "has a placeholder in it".
    // `Bearer sk-live-abc123 {{sig}}` is a live token with a variable next to
    // it, and a test that let the literal through would publish exactly the
    // half of the value that is the secret.
    const request = parseBruFile(
      'a.bru',
      `meta {\n  name: a\n}\n\nget {\n  url: /x\n}\n\nheaders {\n  Authorization: Bearer sk-live-abc123 {{sig}}\n}\n`,
      []
    );

    expect(request!.headers).toEqual([
      { name: 'Authorization', value: '', redacted: true }
    ]);
  });

  it('withholds a credential written as a query parameter', () => {
    // A credential takes different names as a parameter than as a header:
    // `api_key` and `access_token` are the two commonest spellings of all, and
    // neither of them is an `Authorization`.
    const request = parseBruFile(
      'a.bru',
      `meta {\n  name: a\n}\n\nget {\n  url: /x\n}\n\nparams:query {\n  api_key: sk-live-9fj2k3\n  access_token: at-42\n  q: shipments\n}\n`,
      []
    );

    expect(request!.params).toEqual([
      { name: 'api_key', value: '', redacted: true, in: 'query' },
      { name: 'access_token', value: '', redacted: true, in: 'query' },
      { name: 'q', value: 'shipments', in: 'query' }
    ]);
  });

  it('strips userinfo from the url, which no table would catch', () => {
    // `https://svc:hunter2@host` has no `params:query` counterpart at all, so
    // the url is the only place this is ever written and the only place it can
    // be taken out.
    const request = parseBruFile(
      'a.bru',
      `meta {\n  name: a\n}\n\nget {\n  url: https://svc:hunter2@api.example.com/v1/search\n}\n`,
      []
    );

    expect(request).toMatchObject({
      url: 'https://api.example.com/v1/search',
      urlRedacted: true
    });
    expect(JSON.stringify(request)).not.toContain('hunter2');
  });

  it('blanks a credential in the url and keeps the parameter name', () => {
    // Bruno mirrors a query parameter into the url line AND `params:query`, so
    // a value withheld in the table is published one line above it unless the
    // same rule runs over the url.
    const request = parseBruFile(
      'a.bru',
      `meta {\n  name: a\n}\n\nget {\n  url: {{baseUrl}}/search?api_key=sk-live-9fj2k3&q=x\n}\n\nparams:query {\n  api_key: sk-live-9fj2k3\n  q: x\n}\n`,
      []
    );

    expect(request!.url).toBe('{{baseUrl}}/search?api_key=&q=x');
    expect(request!.urlRedacted).toBe(true);
    expect(JSON.stringify(request)).not.toContain('sk-live-9fj2k3');
  });

  it('leaves a url whose credential is a placeholder alone', () => {
    // Same reason the header rule keeps `Bearer {{token}}`: the variable name
    // is the one thing the reader needs, and it carries no secret.
    const request = parseBruFile(
      'a.bru',
      `meta {\n  name: a\n}\n\nget {\n  url: {{baseUrl}}/search?api_key={{apiKey}}&q=x\n}\n`,
      []
    );

    expect(request!.url).toBe('{{baseUrl}}/search?api_key={{apiKey}}&q=x');
    expect(request!.urlRedacted).toBeUndefined();
  });

  it('takes the auth MODE and never the credential', () => {
    const request = parseBruFile('a.bru', GET_USER, []);

    expect(request!.auth).toEqual({ mode: 'bearer' });
    expect(JSON.stringify(request)).not.toContain('sk-live-not-a-placeholder');
  });

  it('reads a text body verbatim, dedented, with a fence language', () => {
    const request = parseBruFile(
      'a.bru',
      `meta {\n  name: a\n}\n\npost {\n  url: /x\n  body: json\n}\n\nbody:json {\n  {\n    "name": "a"\n  }\n}\n`,
      []
    );

    expect(request!.body).toEqual({
      type: 'json',
      language: 'json',
      text: '{\n  "name": "a"\n}'
    });
  });

  it('reads a form body as its fields', () => {
    const request = parseBruFile(
      'a.bru',
      `meta {\n  name: a\n}\n\npost {\n  url: /x\n  body: form-urlencoded\n}\n\nbody:form-urlencoded {\n  name: ada\n  ~role: admin\n}\n`,
      []
    );

    expect(request!.body).toEqual({
      type: 'form-urlencoded',
      entries: [
        { name: 'name', value: 'ada' },
        { name: 'role', value: 'admin', disabled: true }
      ]
    });
  });

  it('records that a request has scripts and tests, and carries neither', () => {
    // "Render, never execute" was the open question; the answer this type
    // implements is neither — the code is not published at all, and the page
    // says it exists so a reader knows the collection is more than the page.
    const source = `meta {\n  name: a\n}\n\nget {\n  url: /x\n}\n\nscript:pre-request {\n  bru.setVar('secret', 'hunter2');\n}\n\ntests {\n  test('ok', () => {});\n}\n`;

    const request = parseBruFile('a.bru', source, []);

    expect(request).toMatchObject({ script: true, tests: true });
    expect(JSON.stringify(request)).not.toContain('hunter2');
  });

  it('falls back to the file name when the file names itself nothing', () => {
    const request = parseBruFile(
      'users/2.get-user.bru',
      'get {\n  url: /x\n}\n',
      []
    );

    expect(request!.name).toBe('get-user');
  });

  it('warns and reads nothing from a file with no method block', () => {
    const warnings: string[] = [];

    expect(
      parseBruFile('a.bru', 'meta {\n  name: a\n}\n', warnings)
    ).toBeUndefined();
    expect(warnings).toEqual([
      'the request "a.bru" names no HTTP method, so it was skipped.'
    ]);
  });
});

describe('parseBrunoCollection', () => {
  it('reads the collection name out of bruno.json', () => {
    const parsed = collection({
      'bruno.json': BRUNO_JSON,
      'get-user.bru': GET_USER
    });

    expect(parsed.name).toBe('Shipments');
    expect(parsed.version).toBe('1');
  });

  it('groups requests by folder and orders both by seq', () => {
    const parsed = collection({
      'bruno.json': BRUNO_JSON,
      'users/folder.bru': 'meta {\n  name: Users\n  seq: 2\n}\n',
      'users/b.bru': 'meta {\n  name: B\n  seq: 2\n}\n\nget {\n  url: /b\n}\n',
      'users/a.bru': 'meta {\n  name: A\n  seq: 1\n}\n\nget {\n  url: /a\n}\n',
      'teams/folder.bru': 'meta {\n  name: Teams\n  seq: 1\n}\n'
    });

    expect(parsed.folders.map((folder) => folder.name)).toEqual([
      'Teams',
      'Users'
    ]);
    expect(parsed.folders[1]!.requests.map((request) => request.name)).toEqual([
      'A',
      'B'
    ]);
  });

  it('nests a folder inside a folder', () => {
    // Bruno's own shape, which OpenAPI has no counterpart for: tags are flat.
    const parsed = collection({
      'bruno.json': BRUNO_JSON,
      'users/folder.bru': 'meta {\n  name: Users\n}\n',
      'users/admin/folder.bru': 'meta {\n  name: Admin\n}\n',
      'users/admin/ban.bru':
        'meta {\n  name: Ban\n}\n\npost {\n  url: /ban\n}\n'
    });

    expect(parsed.folders[0]!.folders[0]).toMatchObject({
      name: 'Admin',
      dir: 'users/admin'
    });
    expect(parsed.folders[0]!.folders[0]!.requests).toHaveLength(1);
  });

  it('counts the environments and never reads one', () => {
    // They routinely hold hosts, tokens and keys — see `BRUNO_UNPUBLISHED`.
    const parsed = collection({
      'bruno.json': BRUNO_JSON,
      'get-user.bru': GET_USER,
      'environments/local.bru': 'vars {\n  TOKEN: hunter2\n}\n',
      'environments/prod.bru': 'vars {\n  TOKEN: hunter3\n}\n'
    });

    expect(parsed.environments).toBe(2);
    expect(JSON.stringify(parsed)).not.toContain('hunter2');
  });

  it('reads the collection-level headers and auth from collection.bru', () => {
    const parsed = collection({
      'bruno.json': BRUNO_JSON,
      'collection.bru':
        'headers {\n  Accept: application/json\n}\n\nauth {\n  mode: bearer\n}\n\ndocs {\n  The collection.\n}\n',
      'get-user.bru': GET_USER
    });

    expect(parsed.headers).toEqual([
      { name: 'Accept', value: 'application/json' }
    ]);
    expect(parsed.auth).toEqual({ mode: 'bearer' });
    expect(parsed.docs).toBe('The collection.');
  });

  it('ignores a file that is not part of the collection', () => {
    const parsed = collection({
      'bruno.json': BRUNO_JSON,
      'README.md': '# not a request',
      'get-user.bru': GET_USER
    });

    expect(parsed.requests).toHaveLength(1);
  });

  it('warns when the directory carries no bruno.json', () => {
    // Not fatal: a collection committed without its manifest still parses, and
    // the scaffold already fails a section that produced no pages at all.
    const parsed = collection({ 'get-user.bru': GET_USER });

    expect(parsed.warnings).toEqual([
      'the collection has no bruno.json, so it may not open in Bruno.'
    ]);
    expect(parsed.requests).toHaveLength(1);
  });
});
