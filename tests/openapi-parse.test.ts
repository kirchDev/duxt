import { describe, expect, it } from 'vitest';
import {
  DUXT_OPENAPI_DEFAULT_TAG,
  DUXT_OPENAPI_WEBHOOKS_TAG,
  parseOpenApiDocument
} from '../openapi-parse';

/** The smallest document that is still a document. */
const minimal = `
openapi: 3.1.0
info: { title: Pets, version: '1.0.0' }
paths:
  /pets:
    get:
      responses:
        '200': { description: ok }
`;

const operation = (document: string) =>
  parseOpenApiDocument(document).tags![0]!.operations![0]!;

/** The first operation's parameters — a list, never the absence of one. */
const operationParameters = (document: string) =>
  operation(document).parameters ?? [];

describe('what it refuses to read', () => {
  it('names Swagger 2.0 rather than failing on a missing key', () => {
    expect(() => parseOpenApiDocument('swagger: "2.0"')).toThrow(
      /Swagger 2\.0/
    );
  });

  it('refuses a version it does not implement', () => {
    expect(() => parseOpenApiDocument('openapi: 4.0.0\ninfo: {}')).toThrow(
      /duxt reads 3\.0 and 3\.1/
    );
  });

  it('says the document is not YAML rather than throwing YAML at the reader', () => {
    expect(() => parseOpenApiDocument('\t- [unclosed')).toThrow(
      /neither JSON nor YAML/
    );
  });

  it('reads JSON, because YAML 1.2 is a superset of it', () => {
    const spec = parseOpenApiDocument(
      JSON.stringify({
        openapi: '3.0.3',
        info: { title: 'Pets', version: '1' },
        paths: {
          '/pets': { get: { responses: { '200': { description: 'ok' } } } }
        }
      })
    );

    expect(spec.dialect).toBe('3.0');
    expect(spec.info.title).toBe('Pets');
  });
});

describe('grouping into pages', () => {
  it('files an untagged operation under one group rather than dropping it', () => {
    const spec = parseOpenApiDocument(minimal);

    expect(spec.tags!.map((tag) => tag.name)).toEqual([
      DUXT_OPENAPI_DEFAULT_TAG
    ]);
  });

  it('takes the order and the descriptions from the document`s own tag list', () => {
    const spec = parseOpenApiDocument(`
openapi: 3.1.0
info: { title: Pets, version: '1' }
tags:
  - { name: Stores, description: Buying things. }
  - { name: Pets }
paths:
  /pets: { get: { tags: [Pets], responses: { '200': { description: ok } } } }
  /stores: { get: { tags: [Stores], responses: { '200': { description: ok } } } }
`);

    expect(spec.tags!.map((tag) => tag.name)).toEqual(['Stores', 'Pets']);
    expect(spec.tags![0]!.description).toBe('Buying things.');
  });

  it('drops a declared tag no operation uses', () => {
    const spec = parseOpenApiDocument(`
openapi: 3.1.0
info: { title: Pets, version: '1' }
tags: [{ name: Ghosts }]
paths:
  /pets: { get: { responses: { '200': { description: ok } } } }
`);

    expect(spec.tags!.map((tag) => tag.name)).not.toContain('Ghosts');
  });

  it('collects 3.1 webhooks into a group of their own', () => {
    const spec = parseOpenApiDocument(`
openapi: 3.1.0
info: { title: Pets, version: '1' }
webhooks:
  petStatus:
    post: { responses: { '200': { description: ok } } }
`);

    const webhooks = spec.tags!.find((tag) => tag.webhooks);

    expect(webhooks?.name).toBe(DUXT_OPENAPI_WEBHOOKS_TAG);
    expect(webhooks?.operations![0]).toMatchObject({
      kind: 'webhook',
      method: 'post',
      path: 'petStatus'
    });
  });
});

describe('parameters', () => {
  it('inherits the path item`s, and lets the operation`s own win', () => {
    const parameters = operationParameters(`
openapi: 3.1.0
info: { title: Pets, version: '1' }
paths:
  /pets/{id}:
    parameters:
      - { name: id, in: path, schema: { type: string } }
      - { name: trace, in: header, schema: { type: string } }
    get:
      parameters:
        - { name: id, in: path, description: The one from the operation, schema: { type: integer } }
      responses: { '200': { description: ok } }
`);

    // Two, not three: the operation's `id` REPLACES the path item's rather
    // than being listed beside it.
    expect(parameters).toHaveLength(2);
    expect(parameters.find((entry) => entry.name === 'id')?.description).toBe(
      'The one from the operation'
    );
  });

  it('keeps both members of a pair that share a name in different places', () => {
    // The contract the try-it client's compound key rests on: `(name, in)` is
    // what identifies a parameter, so these are two and the merge must not
    // treat the second as an override of the first.
    const parameters = operationParameters(`
openapi: 3.1.0
info: { title: Pets, version: '1' }
paths:
  /pets/{id}:
    parameters:
      - { name: id, in: path, schema: { type: string } }
    get:
      parameters:
        - { name: id, in: query, schema: { type: string } }
      responses: { '200': { description: ok } }
`);

    expect(parameters.map((entry) => entry.in).sort()).toEqual([
      'path',
      'query'
    ]);
  });

  it('marks a path parameter required whether or not the document said so', () => {
    const parameters = operationParameters(`
openapi: 3.1.0
info: { title: Pets, version: '1' }
paths:
  /pets/{id}:
    get:
      parameters: [{ name: id, in: path, schema: { type: string } }]
      responses: { '200': { description: ok } }
`);

    expect(parameters[0]!.required).toBe(true);
  });
});

describe('one spelling for two dialects', () => {
  it('turns 3.0`s `nullable` into a `null` in the type list', () => {
    const schema = operation(`
openapi: 3.0.3
info: { title: Pets, version: '1' }
paths:
  /pets:
    get:
      parameters: [{ name: q, in: query, schema: { type: string, nullable: true } }]
      responses: { '200': { description: ok } }
`).parameters![0]!.schema;

    expect(schema!.types).toEqual(['string', 'null']);
  });

  it('leaves `nullable` alone in a 3.1 document, where it means nothing', () => {
    const schema = operation(`
openapi: 3.1.0
info: { title: Pets, version: '1' }
paths:
  /pets:
    get:
      parameters: [{ name: q, in: query, schema: { type: string, nullable: true } }]
      responses: { '200': { description: ok } }
`).parameters![0]!.schema;

    expect(schema!.types).toEqual(['string']);
  });

  it('turns 3.0`s boolean exclusive bound into 3.1`s number', () => {
    const schema = operation(`
openapi: 3.0.3
info: { title: Pets, version: '1' }
paths:
  /pets:
    get:
      parameters:
        - name: n
          in: query
          schema: { type: integer, minimum: 0, exclusiveMinimum: true }
      responses: { '200': { description: ok } }
`).parameters![0]!.schema;

    expect(schema!.constraints).toEqual({ exclusiveMinimum: 0 });
  });

  it('promotes a singular `example` into the list every renderer reads', () => {
    const body = operation(`
openapi: 3.0.3
info: { title: Pets, version: '1' }
paths:
  /pets:
    post:
      requestBody:
        content:
          application/json:
            schema: { type: object }
            example: { name: Rex }
      responses: { '201': { description: ok } }
`).requestBody;

    expect(body!.content![0]!.examples).toEqual([
      { name: 'default', value: { name: 'Rex' } }
    ]);
  });
});

describe('references', () => {
  const circular = `
openapi: 3.1.0
info: { title: Pets, version: '1' }
paths:
  /pets:
    get:
      responses:
        '200':
          description: ok
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Pet' }
components:
  schemas:
    Pet:
      type: object
      properties:
        name: { type: string }
        friends: { type: array, items: { $ref: '#/components/schemas/Pet' } }
`;

  it('keeps the name it was followed through', () => {
    const schema = operation(circular).responses![0]!.content![0]!.schema;

    expect(schema).toMatchObject({ name: 'Pet', types: ['object'] });
  });

  it('cuts a cycle instead of expanding it until the stack gives out', () => {
    const schema = operation(circular).responses![0]!.content![0]!.schema;
    const friends = schema!.properties!.find(
      (entry) => entry.name === 'friends'
    );

    expect(friends!.schema.items).toMatchObject({
      name: 'Pet',
      circular: true
    });
  });

  it('reports a reference that leaves the document rather than following it', () => {
    const spec = parseOpenApiDocument(`
openapi: 3.1.0
info: { title: Pets, version: '1' }
paths:
  /pets:
    get:
      responses:
        '200':
          description: ok
          content:
            application/json:
              schema: { $ref: 'other.yaml#/components/schemas/Pet' }
`);

    expect(spec.warnings.join(' ')).toMatch(/points outside the document/);
    expect(
      spec.tags![0]!.operations![0]!.responses![0]!.content![0]!.schema
    ).toMatchObject({
      external: true,
      ref: 'other.yaml#/components/schemas/Pet'
    });
  });

  it('reports a reference that points at nothing', () => {
    const spec = parseOpenApiDocument(`
openapi: 3.1.0
info: { title: Pets, version: '1' }
paths:
  /pets:
    get:
      responses:
        '200':
          description: ok
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Missing' }
`);

    expect(spec.warnings.join(' ')).toMatch(/points at nothing/);
  });

  it('decodes an escaped pointer, so a path can be referenced', () => {
    const spec = parseOpenApiDocument(`
openapi: 3.1.0
info: { title: Pets, version: '1' }
paths:
  /pets:
    get:
      responses: { '200': { description: ok } }
  /animals:
    $ref: '#/paths/~1pets'
`);

    expect(
      spec.tags![0]!.operations!.map((entry) => entry.path).sort()
    ).toEqual(['/animals', '/pets']);
  });
});

describe('composition', () => {
  it('folds an `allOf` of objects into the schema that carries it', () => {
    const schema = operation(`
openapi: 3.1.0
info: { title: Pets, version: '1' }
paths:
  /pets:
    post:
      requestBody:
        content:
          application/json:
            schema: { $ref: '#/components/schemas/NewPet' }
      responses: { '201': { description: ok } }
components:
  schemas:
    Pet:
      type: object
      required: [id]
      properties: { id: { type: integer } }
    NewPet:
      allOf:
        - $ref: '#/components/schemas/Pet'
        - type: object
          required: [name]
          properties: { name: { type: string } }
`).requestBody!.content![0]!.schema;

    // One object with two properties, not a composition of two boxes: `$ref`
    // plus the fields this endpoint adds is the ordinary shape, and drawing it
    // as a composition is strictly harder to read.
    expect(schema!.allOf).toBeUndefined();
    expect(schema!.types).toEqual(['object']);
    expect(
      schema!.properties!.map((entry) => [entry.name, entry.required])
    ).toEqual([
      ['id', true],
      ['name', true]
    ]);
  });

  it('leaves an `allOf` branch it cannot fold as the composition it is', () => {
    const schema = operation(`
openapi: 3.1.0
info: { title: Pets, version: '1' }
paths:
  /pets:
    post:
      requestBody:
        content:
          application/json:
            schema:
              allOf:
                - type: object
                  properties: { id: { type: integer } }
                - oneOf:
                    - { type: string }
                    - { type: number }
      responses: { '201': { description: ok } }
`).requestBody!.content![0]!.schema;

    expect(schema!.properties!.map((entry) => entry.name)).toEqual(['id']);
    expect(schema!.allOf).toHaveLength(1);
    expect(schema!.allOf![0]!.oneOf).toHaveLength(2);
  });

  it('keeps `oneOf`, `anyOf`, `not` and the discriminator', () => {
    const schema = operation(`
openapi: 3.1.0
info: { title: Pets, version: '1' }
paths:
  /pets:
    post:
      requestBody:
        content:
          application/json:
            schema:
              oneOf: [{ type: string }, { type: number }]
              anyOf: [{ type: object }]
              not: { type: 'null' }
              discriminator:
                propertyName: kind
                mapping: { cat: '#/components/schemas/Cat' }
      responses: { '201': { description: ok } }
`).requestBody!.content![0]!.schema;

    expect(schema!.oneOf).toHaveLength(2);
    expect(schema!.anyOf).toHaveLength(1);
    expect(schema!.not!.types).toEqual(['null']);
    expect(schema!.discriminator).toEqual({
      propertyName: 'kind',
      mapping: { cat: '#/components/schemas/Cat' }
    });
  });
});

describe('security', () => {
  const document = `
openapi: 3.1.0
info: { title: Pets, version: '1' }
security:
  - apiKey: []
paths:
  /pets:
    get:
      responses: { '200': { description: ok } }
  /public:
    get:
      security: []
      responses: { '200': { description: ok } }
components:
  securitySchemes:
    apiKey: { type: apiKey, name: X-Api-Key, in: header }
    oauth:
      type: oauth2
      flows:
        authorizationCode:
          authorizationUrl: https://auth.test/authorize
          tokenUrl: https://auth.test/token
          scopes: { 'pets:read': Read pets }
`;

  it('resolves a requirement to the scheme it names', () => {
    const spec = parseOpenApiDocument(document);

    expect(spec.security![0]![0]).toMatchObject({
      key: 'apiKey',
      scheme: { type: 'apiKey', name: 'X-Api-Key', in: 'header' }
    });
    // No scopes, and the empty list is dropped rather than carried: this one
    // is an absence, unlike `security: []` two tests down.
    expect(spec.security![0]![0]!.scopes).toBeUndefined();
  });

  it('reads an oauth2 flow with its scopes', () => {
    const spec = parseOpenApiDocument(document);
    const oauth = spec.securitySchemes!.find((entry) => entry.key === 'oauth');

    expect(oauth!.flows![0]).toMatchObject({
      name: 'authorizationCode',
      tokenUrl: 'https://auth.test/token',
      scopes: [{ name: 'pets:read', description: 'Read pets' }]
    });
  });

  it('keeps an empty list, because it is how an endpoint opts out', () => {
    const spec = parseOpenApiDocument(document);
    const open = spec.tags![0]!.operations!.find(
      (entry) => entry.path === '/public'
    );

    // `[]` and `undefined` are opposite statements: one says "no
    // authentication", the other says "whatever the document says".
    expect(open!.security).toEqual([]);
    expect(
      spec.tags![0]!.operations!.find((entry) => entry.path === '/pets')!
        .security
    ).toBeUndefined();
  });
});

describe('responses, callbacks and links', () => {
  const spec = () =>
    parseOpenApiDocument(`
openapi: 3.1.0
info: { title: Pets, version: '1' }
paths:
  /pets:
    post:
      responses:
        default: { description: anything else }
        '4XX': { description: client error }
        '201':
          description: created
          headers:
            Location: { required: true, schema: { type: string } }
          links:
            GetPet: { operationId: getPet, description: The pet just created }
      callbacks:
        petCreated:
          '{$request.body#/callbackUrl}':
            post:
              responses: { '200': { description: ok } }
`);

  it('orders the statuses, wildcard after its range and `default` last', () => {
    expect(
      spec().tags![0]!.operations![0]!.responses!.map((entry) => entry.status)
    ).toEqual(['201', '4XX', 'default']);
  });

  it('reads response headers and links', () => {
    const created = spec().tags![0]!.operations![0]!.responses![0]!;

    expect(created.headers![0]).toMatchObject({
      name: 'Location',
      required: true
    });
    expect(created.links![0]).toMatchObject({
      name: 'GetPet',
      operationId: 'getPet'
    });
  });

  it('reads a callback down to the operations it sends', () => {
    const callback = spec().tags![0]!.operations![0]!.callbacks![0]!;

    expect(callback.name).toBe('petCreated');
    expect(callback.operations![0]).toMatchObject({
      expression: '{$request.body#/callbackUrl}',
      method: 'post'
    });
  });
});

describe('servers', () => {
  it('reads the variables a URL template needs', () => {
    const spec = parseOpenApiDocument(`
openapi: 3.1.0
info: { title: Pets, version: '1' }
servers:
  - url: https://api.test/{stage}
    variables:
      stage: { default: v1, enum: [v1, v2], description: The stage. }
paths:
  /pets: { get: { responses: { '200': { description: ok } } } }
`);

    expect(spec.servers![0]!.variables![0]).toEqual({
      name: 'stage',
      default: 'v1',
      enum: ['v1', 'v2'],
      description: 'The stage.'
    });
  });
});
