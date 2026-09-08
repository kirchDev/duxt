import { describe, expect, it } from 'vitest';
import type { DuxtOpenApiSchema } from '../openapi-model';
import {
  openApiConstraints,
  openApiCurl,
  openApiExampleValue,
  openApiFillPath,
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
    expect(openApiFillPath('/pets/{id}', { id: 'a b' })).toBe('/pets/a%20b');
  });

  it('omits an empty query parameter, because absent is what was meant', () => {
    expect(
      openApiQueryString(operation.parameters, { limit: '10', empty: '' })
    ).toBe('?limit=10');
  });

  it('sends an empty one where the document asked for it', () => {
    expect(
      openApiQueryString(
        [{ name: 'flag', in: 'query', required: false, allowEmptyValue: true }],
        { flag: '' }
      )
    ).toBe('?flag=');
  });

  it('puts each parameter where its `in` says it goes', () => {
    const request = openApiRequest(
      operation,
      'https://api.test/',
      { id: '7', limit: '10', 'X-Trace': 'abc', session: 'xyz' },
      { Accept: 'application/json' }
    );

    // One separator between the server and the path, not two.
    expect(request.url).toBe('https://api.test/pets/7?limit=10');
    expect(request.headers).toEqual({
      Accept: 'application/json',
      'X-Trace': 'abc',
      Cookie: 'session=xyz'
    });
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
