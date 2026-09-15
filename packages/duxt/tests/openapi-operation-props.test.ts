import { describe, expect, it } from 'vitest';
import { openApiOperationProps } from '../app/utils/openapi';

/**
 * The one place the landing page couples to a shape somebody else produces:
 * Content's minimal AST, where an element is `[tag, props, ...children]`, and
 * `sections-openapi` writes the operation as the props of one MDC component in
 * a generated page's body.
 *
 * Tested rather than trusted, because the failure is silent — a band that draws
 * an empty box on a landing page, which nothing else would report.
 */
describe('openApiOperationProps', () => {
  const props = { operation: { method: 'post', path: '/widgets' } };

  it('finds the node at the top of a body', () => {
    expect(
      openApiOperationProps({
        type: 'minimal',
        value: [['open-api-operation', props]]
      })
    ).toEqual(props);
  });

  it('finds it nested under whatever the generator wrapped it in', () => {
    expect(
      openApiOperationProps({
        value: [
          ['p', {}, 'A paragraph'],
          ['div', {}, ['section', {}, ['open-api-operation', props]]]
        ]
      })
    ).toEqual(props);
  });

  it('takes a bare array as well as a body object', () => {
    expect(openApiOperationProps([['open-api-operation', props]])).toEqual(
      props
    );
  });

  it('parses MDC bound props, which is how the tree actually stores them', () => {
    // The real shape: `:operation="…"` keeps its colon and its value stays the
    // JSON string the Markdown carried. Handed on unparsed, every prop of the
    // client is undefined and the band draws an empty box.
    expect(
      openApiOperationProps({
        type: 'minimark',
        value: [
          [
            'open-api-operation',
            {
              ':operation': '{"method":"post","path":"/widgets"}',
              ':servers': '[{"url":"https://api.example.com"}]',
              title: 'Create a widget'
            }
          ]
        ]
      })
    ).toEqual({
      operation: { method: 'post', path: '/widgets' },
      servers: [{ url: 'https://api.example.com' }],
      title: 'Create a widget'
    });
  });

  it('keeps a bound value that is not JSON as the string it is', () => {
    expect(
      openApiOperationProps({
        value: [['open-api-operation', { ':operation': 'someExpression' }]]
      })
    ).toEqual({ operation: 'someExpression' });
  });

  it('returns undefined for a page that carries no operation', () => {
    expect(
      openApiOperationProps({ value: [['p', {}, 'Just prose']] })
    ).toBeUndefined();
  });

  it('returns undefined rather than throwing on nothing at all', () => {
    // A mistyped path resolves to no page, and a landing page must not 500
    // because one band pointed somewhere that does not exist.
    expect(openApiOperationProps(undefined)).toBeUndefined();
    expect(openApiOperationProps(null)).toBeUndefined();
    expect(openApiOperationProps({ value: 'not an array' })).toBeUndefined();
  });

  it('ignores a node whose props are missing', () => {
    expect(
      openApiOperationProps({ value: [['open-api-operation']] })
    ).toBeUndefined();
  });
});
