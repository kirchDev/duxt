import { describe, expect, it } from 'vitest';
import type { DuxtOpenApiSchema } from '../openapi-model';
import {
  openApiConstraints,
  openApiCurl,
  openApiExampleValue,
  openApiFillPath,
  openApiParameterKey,
  openApiQueryString,
  openApiRequest,
  openApiServerUrl,
  openApiStatusKind,
  openApiTypeLabel
} from '../app/utils/openapi';

const schema = (over: Partial<DuxtOpenApiSchema> = {}): DuxtOpenApiSchema =>
  over as DuxtOpenApiSchema;

describe('openApiTypeLabel', () => {
  it('writes an array as what it holds', () => {
    expect(
      openApiTypeLabel(
        schema({ types: ['array'], items: schema({ types: ['string'] }) })
      )
    ).toBe('array<string>');
  });

  it('writes 3.1`s null in the type list as the union it is', () => {
    expect(openApiTypeLabel(schema({ types: ['string', 'null'] }))).toBe(
      'string | null'
    );
  });

  it('infers `object` from the properties where the document named no type', () => {
    expect(
      openApiTypeLabel(
        schema({
          properties: [{ name: 'id', required: true, schema: schema() }]
        })
      )
    ).toBe('object');
  });

  it('says `any` rather than nothing at all', () => {
    expect(openApiTypeLabel()).toBe('any');
    expect(openApiTypeLabel(schema())).toBe('any');
  });
});

describe('openApiExampleValue', () => {
  it('prefers what the document wrote over anything derived', () => {
    expect(
      openApiExampleValue(schema({ types: ['string'], examples: ['Rex'] }))
    ).toBe('Rex');
    expect(
      openApiExampleValue(schema({ types: ['string'], default: 'Fido' }))
    ).toBe('Fido');
    expect(
      openApiExampleValue(schema({ types: ['string'], enum: ['a', 'b'] }))
    ).toBe('a');
  });

  it('builds an object out of its properties', () => {
    expect(
      openApiExampleValue(
        schema({
          types: ['object'],
          properties: [
            {
              name: 'id',
              required: true,
              schema: schema({ types: ['integer'] })
            },
            {
              name: 'name',
              required: true,
              schema: schema({ types: ['string'] })
            }
          ]
        })
      )
    ).toEqual({ id: 0, name: 'string' });
  });

  it('leaves a read-only field out of the body a reader would send', () => {
    expect(
      openApiExampleValue(
        schema({
          types: ['object'],
          properties: [
            {
              name: 'id',
              required: true,
              schema: schema({ types: ['integer'], readOnly: true })
            },
            {
              name: 'name',
              required: true,
              schema: schema({ types: ['string'] })
            }
          ]
        })
      )
    ).toEqual({ name: 'string' });
  });

  it('stops at a schema the parser cut as circular', () => {
    // `Pet.friends: Pet[]` is the ordinary shape of a schema; deriving through
    // it is a stack overflow in the browser.
    expect(
      openApiExampleValue(schema({ name: 'Pet', circular: true }))
    ).toBeNull();
  });

  it('answers a bounded number with one the schema would accept', () => {
    // Zero is the obvious placeholder and the one a `status: 400..599` field
    // rejects, so the example a reader sends fails before it reaches anything.
    expect(
      openApiExampleValue(
        schema({
          types: ['integer'],
          constraints: { minimum: 400, maximum: 599 }
        })
      )
    ).toBe(400);
    expect(openApiExampleValue(schema({ types: ['integer'] }))).toBe(0);
  });

  it('answers a format with something shaped like it', () => {
    expect(
      openApiExampleValue(schema({ types: ['string'], format: 'date' }))
    ).toBe('2026-01-01');
    expect(
      openApiExampleValue(schema({ types: ['string'], format: 'uuid' }))
    ).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe('the request a reader is about to send', () => {
  const operation = {
    method: 'get',
    path: '/pets/{id}',
    parameters: [
      { name: 'id', in: 'path' as const, required: true },
      { name: 'limit', in: 'query' as const, required: false },
      { name: 'empty', in: 'query' as const, required: false },
      { name: 'X-Trace', in: 'header' as const, required: false },
      { name: 'session', in: 'cookie' as const, required: false }
    ]
  };

  it('fills a server template from its own defaults', () => {
    expect(
      openApiServerUrl({
        url: 'https://api.test/{stage}',
        variables: [{ name: 'stage', default: 'v1' }]
      })
    ).toBe('https://api.test/v1');
  });

  it('lets the reader override a server variable', () => {
    expect(
      openApiServerUrl(
        {
          url: 'https://api.test/{stage}',
          variables: [{ name: 'stage', default: 'v1' }]
        },
        { stage: 'v2' }
      )
    ).toBe('https://api.test/v2');
  });

  it('leaves an unanswered path parameter visible rather than blank', () => {
    expect(openApiFillPath('/pets/{id}')).toBe('/pets/{id}');
    expect(openApiFillPath('/pets/{id}', { 'path-id': 'a b' })).toBe(
      '/pets/a%20b'
    );
  });

  it('never fills a path template from a parameter of another location', () => {
    // A `{id}` template can only ever be the PATH parameter called `id`; a
    // query parameter sharing the name is a different parameter, and putting
    // its value in the URL's path sends the request somewhere else entirely.
    expect(openApiFillPath('/pets/{id}', { 'query-id': '7' })).toBe(
      '/pets/{id}'
    );
  });

  it('omits an empty query parameter, because absent is what was meant', () => {
    expect(
      openApiQueryString(operation.parameters, {
        'query-limit': '10',
        'query-empty': ''
      })
    ).toBe('?limit=10');
  });

  it('sends an empty one where the document asked for it', () => {
    expect(
      openApiQueryString(
        [{ name: 'flag', in: 'query', required: false, allowEmptyValue: true }],
        { 'query-flag': '' }
      )
    ).toBe('?flag=');
  });

  it('puts each parameter where its `in` says it goes', () => {
    const request = openApiRequest(
      operation,
      'https://api.test/',
      {
        'path-id': '7',
        'query-limit': '10',
        'header-X-Trace': 'abc'
      },
      { Accept: 'application/json' }
    );

    // One separator between the server and the path, not two.
    expect(request.url).toBe('https://api.test/pets/7?limit=10');
    expect(request.headers).toEqual({
      Accept: 'application/json',
      'X-Trace': 'abc'
    });
  });

  it('keeps two parameters that share a name in different places apart', () => {
    // OpenAPI identifies a parameter by `(name, in)`, so a document may declare
    // `id` in the path AND `id` in the query. Keyed on the name alone, one box
    // answered for both and the query value landed in the path.
    const request = openApiRequest(
      {
        method: 'get',
        path: '/pets/{id}',
        parameters: [
          { name: 'id', in: 'path', required: true },
          { name: 'id', in: 'query', required: false },
          { name: 'id', in: 'header', required: false }
        ]
      },
      'https://api.test',
      { 'path-id': '7', 'query-id': '9', 'header-id': '11' }
    );

    expect(request.url).toBe('https://api.test/pets/7?id=9');
    expect(request.headers).toEqual({ id: '11' });
  });

  it('never writes a cookie into a header the browser will not send', () => {
    // `Cookie` is a forbidden header name for `fetch`: the browser drops it
    // silently. Building it produced a request that lacked the credential
    // while the `curl` sample rendered from this same object showed it there.
    const request = openApiRequest(operation, 'https://api.test', {
      'cookie-session': 'xyz'
    });

    expect(request.headers).toEqual({});
    expect(openApiCurl(request)).not.toContain('Cookie');
  });

  it('writes a curl a shell cannot be talked out of', () => {
    const curl = openApiCurl({
      method: 'POST',
      url: "https://api.test/pets?q=it's",
      headers: { 'X-Key': "a'b" },
      body: '{"name":"Rex"}'
    });

    expect(curl).toContain(`'https://api.test/pets?q=it'\\''s'`);
    expect(curl).toContain(`'X-Key: a'\\''b'`);
  });
});

describe('openApiParameterKey', () => {
  it('tells two parameters that share a name in different places apart', () => {
    // OpenAPI identifies a parameter by the pair, so `id` in the path and `id`
    // in the query are two parameters and must be two boxes.
    expect(openApiParameterKey({ name: 'id', in: 'path' })).not.toBe(
      openApiParameterKey({ name: 'id', in: 'query' })
    );
  });

  it('cannot be talked into a collision by a name that looks like a location', () => {
    expect(openApiParameterKey({ name: 'x', in: 'header' })).not.toBe(
      openApiParameterKey({ name: 'header-x', in: 'query' })
    );
  });
});

describe('openApiStatusKind', () => {
  it('reads the family off the first digit, and `default` off nothing', () => {
    expect(openApiStatusKind('201')).toBe('success');
    expect(openApiStatusKind('4XX')).toBe('client');
    expect(openApiStatusKind('503')).toBe('server');
    expect(openApiStatusKind('default')).toBe('default');
  });
});

describe('openApiConstraints', () => {
  it('hands back keys the interface translates, never English', () => {
    expect(
      openApiConstraints(schema({ constraints: { minimum: 1, pattern: '^a' } }))
    ).toEqual([
      { key: 'minimum', value: '1' },
      { key: 'pattern', value: '^a' }
    ]);
  });

  it('is empty where the schema constrains nothing', () => {
    expect(openApiConstraints(schema())).toEqual([]);
  });
});
