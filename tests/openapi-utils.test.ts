import { describe, expect, it } from 'vitest';
import type { DuxtOpenApiSchema } from '../openapi-model';
import {
  openApiConstraints,
  openApiBodyForm,
  openApiBodyKeys,
  openApiBodyProblems,
  openApiBodyJson,
  openApiBodyValues,
  openApiExampleValue,
  openApiField,
  openApiFillPath,
  openApiParameterKey,
  openApiQueryString,
  openApiRequest,
  openApiServerUrl,
  openApiStatusKind,
  openApiTypeLabel
} from '../app/utils/openapi';
import { openApiCurl } from '../app/utils/request-samples';

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
      openApiExampleValue(
        schema({ types: ['string'], examples: ['Rex'] }),
        'request'
      )
    ).toBe('Rex');
    expect(
      openApiExampleValue(
        schema({ types: ['string'], default: 'Fido' }),
        'request'
      )
    ).toBe('Fido');
    expect(
      openApiExampleValue(
        schema({ types: ['string'], enum: ['a', 'b'] }),
        'request'
      )
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
        }),
        'request'
      )
    ).toEqual({ name: 'string' });
  });

  it('stops at a schema the parser cut as circular', () => {
    // `Pet.friends: Pet[]` is the ordinary shape of a schema; deriving through
    // it is a stack overflow in the browser.
    expect(
      openApiExampleValue(schema({ name: 'Pet', circular: true }), 'request')
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
        }),
        'request'
      )
    ).toBe(400);
    expect(openApiExampleValue(schema({ types: ['integer'] }), 'request')).toBe(
      0
    );
  });

  it('answers a format with something shaped like it', () => {
    expect(
      openApiExampleValue(
        schema({ types: ['string'], format: 'date' }),
        'request'
      )
    ).toBe('2026-01-01');
    expect(
      openApiExampleValue(
        schema({ types: ['string'], format: 'uuid' }),
        'request'
      )
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

describe('openApiField', () => {
  it('makes an integer a number box with the document`s own range', () => {
    expect(
      openApiField({
        types: ['integer'],
        constraints: { minimum: 1, maximum: 100 }
      })
    ).toEqual({
      control: 'number',
      attrs: { type: 'number', step: '1', min: '1', max: '100' }
    });
  });

  it('lets a plain number take a decimal', () => {
    // `step="1"` on a `number` is the browser rejecting `0.5` on a field the
    // document never said was whole.
    expect(openApiField({ types: ['number'] }).attrs.step).toBe('any');
  });

  it('takes the step from multipleOf where the document names one', () => {
    expect(
      openApiField({ types: ['integer'], constraints: { multipleOf: 10 } })
        .attrs.step
    ).toBe('10');
  });

  it('offers a list where the document names the whole set', () => {
    const field = openApiField({ types: ['string'], enum: ['asc', 'desc'] });

    expect(field.control).toBe('select');
    expect(field.options).toEqual(['asc', 'desc']);
  });

  it('reads an enum of numbers as the strings the request carries', () => {
    // The value goes on the wire as text whatever the schema called it.
    expect(
      openApiField({ types: ['integer'], enum: [10, 20] }).options
    ).toEqual(['10', '20']);
  });

  it('gives a boolean the only two values it has', () => {
    expect(openApiField({ types: ['boolean'] }).options).toEqual([
      'true',
      'false'
    ]);
  });

  it('leaves anything else a text box', () => {
    expect(openApiField({ types: ['string'] }).control).toBe('text');
    expect(openApiField(undefined).control).toBe('text');
  });
});

describe('openApiBodyForm', () => {
  const flat: DuxtOpenApiSchema = {
    types: ['object'],
    properties: [
      { name: 'name', required: true, schema: { types: ['string'] } },
      {
        name: 'size',
        required: false,
        schema: { types: ['integer'], constraints: { minimum: 1 } }
      },
      { name: 'active', required: false, schema: { types: ['boolean'] } }
    ]
  };

  it('draws a flat object as one box per property', () => {
    const form = openApiBodyForm(flat);

    expect(form.expressible).toBe(true);
    expect(form.expressible && form.fields.map((entry) => entry.name)).toEqual([
      'name',
      'size',
      'active'
    ]);
    expect(form.expressible && form.fields[1]!.field.control).toBe('number');
  });

  it('allows a nullable scalar, because that is still one value', () => {
    // 3.0's `nullable` reaches the model as a second entry in `types`.
    const form = openApiBodyForm({
      types: ['object'],
      properties: [
        { name: 'note', required: false, schema: { types: ['string', 'null'] } }
      ]
    });

    expect(form.expressible).toBe(true);
  });

  it('refuses what a form cannot say, and says which', () => {
    // Every one of these would otherwise be a form that quietly sends
    // something other than what the reader typed.
    expect(openApiBodyForm({ types: ['array'] })).toEqual({
      expressible: false,
      reason: 'not-object'
    });
    expect(openApiBodyForm({ types: ['object'], circular: true })).toEqual({
      expressible: false,
      reason: 'unresolved'
    });
    expect(
      openApiBodyForm({ types: ['object'], oneOf: [{ types: ['object'] }] })
    ).toEqual({ expressible: false, reason: 'variants' });
    expect(
      openApiBodyForm({
        types: ['object'],
        properties: [
          { name: 'meta', required: false, schema: { types: ['object'] } }
        ]
      })
    ).toEqual({ expressible: false, reason: 'nested' });
    expect(
      openApiBodyForm({
        types: ['object'],
        additionalProperties: { types: ['string'] },
        properties: [
          { name: 'a', required: false, schema: { types: ['string'] } }
        ]
      })
    ).toEqual({ expressible: false, reason: 'dynamic' });
    expect(openApiBodyForm({ types: ['object'] })).toEqual({
      expressible: false,
      reason: 'empty'
    });
  });

  it('round-trips a body through the form without changing its types', () => {
    const form = openApiBodyForm(flat);
    const fields = form.expressible ? form.fields : [];

    const values = openApiBodyValues(
      fields,
      '{"name":"a","size":3,"active":true}'
    );
    expect(values).toEqual({ name: 'a', size: '3', active: 'true' });

    // The box holds text; what goes on the wire is what the schema called for.
    expect(JSON.parse(openApiBodyJson(fields, values))).toEqual({
      name: 'a',
      size: 3,
      active: true
    });
  });

  it('reads a reference the build DID follow', () => {
    // The parser keeps `ref` beside the name and the properties it resolved,
    // so treating `ref` as "unresolved" refused every body that is a named
    // component — which is very nearly all of them, and was the bug.
    const resolved: DuxtOpenApiSchema = {
      name: 'WidgetPatch',
      ref: '#/components/schemas/WidgetPatch',
      types: ['object'],
      properties: [
        { name: 'name', required: false, schema: { types: ['string'] } }
      ]
    };

    expect(openApiBodyForm(resolved).expressible).toBe(true);
    expect(openApiBodyKeys(resolved).map((key) => key.name)).toEqual(['name']);
  });

  it('draws a form for an untyped property rather than refusing the lot', () => {
    // One `any` beside five strings used to cost the whole form. It is an
    // unconstrained value, which is a text box — and JSON is one click away.
    const form = openApiBodyForm({
      types: ['object'],
      properties: [
        { name: 'name', required: true, schema: { types: ['string'] } },
        { name: 'parent', required: false, schema: {} }
      ]
    });

    expect(form.expressible).toBe(true);
    expect(form.expressible && form.fields[1]!.field.control).toBe('text');
  });

  it('still refuses an untyped property that is plainly a shape', () => {
    expect(
      openApiBodyForm({
        types: ['object'],
        properties: [
          {
            name: 'meta',
            required: false,
            schema: { properties: [] as never, items: { types: ['string'] } }
          }
        ]
      })
    ).toEqual({ expressible: false, reason: 'nested' });
  });

  it('keeps a key the form does not own when a box is edited', () => {
    // A reader typed `colour` in the JSON view; touching a box must not
    // silently delete it.
    const form = openApiBodyForm(flat);
    const fields = form.expressible ? form.fields : [];

    const json = openApiBodyJson(
      fields,
      { name: 'b', size: '3', active: '' },
      '{"name":"a","colour":"red"}'
    );

    expect(JSON.parse(json)).toEqual({ name: 'b', colour: 'red', size: 3 });
  });

  it('leaves an empty optional box out, and keeps a required one', () => {
    const form = openApiBodyForm(flat);
    const fields = form.expressible ? form.fields : [];

    expect(
      JSON.parse(openApiBodyJson(fields, { name: '', size: '', active: '' }))
    ).toEqual({ name: '' });
  });

  it('opens on empty boxes when the text is not an object at all', () => {
    const form = openApiBodyForm(flat);
    const fields = form.expressible ? form.fields : [];

    expect(openApiBodyValues(fields, 'not json')).toEqual({
      name: '',
      size: '',
      active: ''
    });
  });
});

describe('openApiBodyKeys', () => {
  it('offers a nested property the form would have refused', () => {
    // Wider than `openApiBodyForm` on purpose: completion has no obligation to
    // draw a box, so a nested object is still a key worth offering.
    const keys = openApiBodyKeys({
      types: ['object'],
      properties: [
        { name: 'name', required: true, schema: { types: ['string'] } },
        { name: 'address', required: false, schema: { types: ['object'] } },
        {
          name: 'op',
          required: false,
          schema: { types: ['string'], enum: ['add', 'remove'] }
        }
      ]
    });

    expect(keys.map((key) => key.name)).toEqual(['name', 'address', 'op']);
    expect(keys[0]!.required).toBe(true);
    expect(keys[2]!.enum).toEqual(['add', 'remove']);
  });

  it('offers nothing where the top level is not a fixed set of keys', () => {
    expect(openApiBodyKeys({ types: ['array'] })).toEqual([]);
    expect(openApiBodyKeys({ oneOf: [{ types: ['object'] }] })).toEqual([]);
    expect(openApiBodyKeys({ types: ['object'], circular: true })).toEqual([]);
    expect(openApiBodyKeys(undefined)).toEqual([]);
  });
});

describe('openApiBodyProblems', () => {
  const keys = openApiBodyKeys({
    types: ['object'],
    properties: [
      { name: 'name', required: true, schema: { types: ['string'] } },
      { name: 'size', required: false, schema: { types: ['integer'] } }
    ]
  });

  it('marks a key the document does not describe, where it is', () => {
    const json = '{"name": "a", "colour": "red"}';
    const [problem] = openApiBodyProblems(json, keys);

    expect(problem?.severity).toBe('warning');
    expect(json.slice(problem!.from, problem!.to)).toBe('"colour"');
  });

  it('looks at the top level only, never inside a nested object', () => {
    // `"colour"` belongs to `meta`, and what `meta` may hold is not this
    // schema's business. Only `meta` itself is a key this document did not
    // describe.
    const json = '{"name": "a", "meta": {"colour": "red"}}';

    const warnings = openApiBodyProblems(json, keys).filter(
      (problem) => problem.severity === 'warning'
    );

    expect(
      warnings.map((problem) => json.slice(problem.from, problem.to))
    ).toEqual(['"meta"']);
  });

  it('reports a required key that is absent as an error', () => {
    const [problem] = openApiBodyProblems('{"size": 2}', keys);

    expect(problem?.severity).toBe('error');
    expect(problem?.message).toContain('name');
  });

  it('says nothing while the text does not parse', () => {
    // The editor's own JSON linter is already on that, and a second opinion on
    // a document with a missing brace is noise.
    expect(openApiBodyProblems('{"name": ', keys)).toEqual([]);
    expect(openApiBodyProblems('{}', [])).toEqual([]);
  });
});

/**
 * `readOnly` is a statement about DIRECTION, and everything here is a request.
 *
 * The fixture that found this declares `required: [id, name, kind]` with
 * `id: readOnly`, which is the ordinary way to describe a field the server
 * assigns. OpenAPI says the requirement then applies to the response only — and
 * before this the editor prefilled a body without `id`, correctly, and then
 * underlined it as missing.
 */
describe('a read-only property in a request', () => {
  const widget = schema({
    types: ['object'],
    properties: [
      {
        name: 'id',
        required: true,
        schema: { types: ['string'], readOnly: true }
      },
      { name: 'name', required: true, schema: { types: ['string'] } }
    ]
  } as Partial<DuxtOpenApiSchema>);

  it('is not required by the body linter', () => {
    const keys = openApiBodyKeys(widget);

    expect(keys.map((key) => key.name)).toEqual(['id', 'name']);
    expect(keys.find((key) => key.name === 'id')?.required).toBe(false);
    expect(keys.find((key) => key.name === 'name')?.required).toBe(true);
  });

  /** Reported as missing is exactly what the default body left out. */
  it('is not reported as missing', () => {
    const problems = openApiBodyProblems(
      '{ "name": "A widget" }',
      openApiBodyKeys(widget)
    );

    expect(problems).toEqual([]);
  });

  /** It stays a known key, so typing it is not a warning either. */
  it('is still described by the document', () => {
    const problems = openApiBodyProblems(
      '{ "id": "x", "name": "A widget" }',
      openApiBodyKeys(widget)
    );

    expect(problems).toEqual([]);
  });

  it('gets no box in the form', () => {
    const form = openApiBodyForm(widget);

    expect(form.expressible).toBe(true);
    expect(form.expressible && form.fields.map((field) => field.name)).toEqual([
      'name'
    ]);
  });

  /**
   * Dropped BEFORE the shape checks, not after: a read-only object property
   * must not cost the whole form its verdict over a field no request carries.
   */
  it('does not make the form give up as nested', () => {
    const form = openApiBodyForm(
      schema({
        types: ['object'],
        properties: [
          {
            name: 'meta',
            required: false,
            schema: { types: ['object'], readOnly: true }
          },
          { name: 'name', required: true, schema: { types: ['string'] } }
        ]
      } as Partial<DuxtOpenApiSchema>)
    );

    expect(form.expressible).toBe(true);
  });

  /** A body of nothing but read-only fields has no form to draw. */
  it('leaves an all-read-only body with no form', () => {
    const form = openApiBodyForm(
      schema({
        types: ['object'],
        properties: [
          {
            name: 'id',
            required: true,
            schema: { types: ['string'], readOnly: true }
          }
        ]
      } as Partial<DuxtOpenApiSchema>)
    );

    expect(form.expressible).toBe(false);
    expect(form.expressible === false && form.reason).toBe('empty');
  });
});

/**
 * The direction, which the example deriver had no word for.
 *
 * `readOnly` belongs to responses and `writeOnly` to requests, and one function
 * used to guess: it dropped read-only fields at the top level, whichever way the
 * body was travelling. `DuxtOpenApiMedia` draws both the request body and every
 * response through it, so a response example arrived without the `id` and
 * `createdAt` a response is mostly about.
 */
describe('openApiExampleValue — direction', () => {
  const widget = schema({
    types: ['object'],
    properties: [
      {
        name: 'id',
        required: true,
        schema: schema({ types: ['string'], readOnly: true })
      },
      {
        name: 'secret',
        required: false,
        schema: schema({ types: ['string'], writeOnly: true })
      },
      { name: 'name', required: true, schema: schema({ types: ['string'] }) }
    ]
  } as Partial<DuxtOpenApiSchema>);

  it('leaves the server-assigned field out of a request', () => {
    expect(openApiExampleValue(widget, 'request')).toEqual({
      secret: 'string',
      name: 'string'
    });
  });

  it('leaves the write-only field out of a response', () => {
    expect(openApiExampleValue(widget, 'response')).toEqual({
      id: 'string',
      name: 'string'
    });
  });

  /** The old guard held at the top level only, so a nested one slipped past. */
  it('applies at every depth, not only the top one', () => {
    const nested = schema({
      types: ['object'],
      properties: [{ name: 'child', required: false, schema: widget }]
    } as Partial<DuxtOpenApiSchema>);

    expect(openApiExampleValue(nested, 'request')).toEqual({
      child: { secret: 'string', name: 'string' }
    });
  });

  /** Through an array's items, and through `allOf`, for the same reason. */
  it('applies through items and allOf', () => {
    expect(
      openApiExampleValue(
        schema({
          types: ['array'],
          items: widget
        } as Partial<DuxtOpenApiSchema>),
        'response'
      )
    ).toEqual([{ id: 'string', name: 'string' }]);

    expect(
      openApiExampleValue(
        schema({ allOf: [widget] } as Partial<DuxtOpenApiSchema>),
        'request'
      )
    ).toEqual({ secret: 'string', name: 'string' });
  });
});
