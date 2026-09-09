import { describe, expect, it } from 'vitest';
import {
  duxtDefaultRequestSamples,
  duxtRequestSamples,
  openApiAxios,
  openApiCurl,
  openApiFetch,
  openApiGo,
  openApiGuzzle,
  openApiHttpx,
  openApiLaravelHttp,
  openApiOfetch,
  openApiPhpCurl,
  openApiRequests,
  openApiUrllib,
  openApiUseFetch,
  resolveRequestSamples
} from '../app/utils/request-samples';

const post: DuxtOpenApiRequest = {
  method: 'POST',
  url: 'https://api.test/pets',
  headers: { 'Content-Type': 'application/json', 'X-Key': 'abc' },
  body: '{\n  "name": "Rex",\n  "tags": ["good"]\n}'
};

const get: DuxtOpenApiRequest = {
  method: 'GET',
  url: 'https://api.test/pets?limit=10',
  headers: {}
};

/**
 * The generators, checked for the two things that make a sample worth copying:
 * it says what the reader asked for, and it is what somebody would have written
 * by hand.
 *
 * The second is why these are not snapshots. A snapshot passes a `-X POST` nobody
 * would type and a body escaped into one unreadable line, as long as it passes it
 * consistently.
 */
describe('curl', () => {
  it('leaves out the method curl already implies', () => {
    // `-d` makes it a POST and a bare curl is a GET, so spelling either out is
    // the mark of a generated command rather than a typed one.
    expect(openApiCurl(post)).not.toContain('-X');
    expect(openApiCurl(get)).not.toContain('-X');
    expect(openApiCurl({ ...post, method: 'DELETE' })).toContain('-X DELETE');
    expect(openApiCurl({ ...get, method: 'PUT' })).toContain('-X PUT');
  });

  it('keeps the body readable across lines', () => {
    expect(openApiCurl(post)).toContain('"name": "Rex"');
  });

  it('quotes what a shell would otherwise read', () => {
    const curl = openApiCurl({
      method: 'PUT',
      url: "https://api.test/pets?q=it's",
      headers: { 'X-Key': "a'b" }
    });

    expect(curl).toContain(`'https://api.test/pets?q=it'\\''s'`);
    expect(curl).toContain(`'X-Key: a'\\''b'`);
  });
});

describe('the JavaScript clients', () => {
  it('writes a JSON body as the data it is', () => {
    // `JSON.stringify(request.body)` used to emit the body as an escaped string
    // literal — one long line of `\\"name\\"`, which nobody would write.
    expect(openApiFetch(post)).toContain('body: JSON.stringify({');
    expect(openApiFetch(post)).toContain("name: 'Rex'");
    expect(openApiFetch(post)).not.toContain('\\"');
  });

  it('hands ofetch and useFetch the object itself', () => {
    // ofetch serialises an object body and sets the header on its own.
    expect(openApiOfetch(post)).toContain('body: {');
    expect(openApiOfetch(post)).not.toContain('JSON.stringify');
    expect(openApiUseFetch(post)).toContain('const { data } = await useFetch(');
  });

  it('omits the method for a GET', () => {
    expect(openApiFetch(get)).not.toContain('method');
    expect(openApiFetch(get)).toBe(
      "await fetch('https://api.test/pets?limit=10');"
    );
  });

  it('uses axios in the form that does not change per method', () => {
    expect(openApiAxios(post)).toContain("method: 'post'");
    expect(openApiAxios(post)).toContain('data: {');
  });

  /**
   * A short list of scalars stays on its line. `tags: ['good']` over three lines
   * is the clearest tell that a snippet was generated rather than typed.
   */
  it('keeps a short list inline and breaks a structured one', () => {
    const sample = openApiFetch({
      ...post,
      body: '{"tags":["a","b"],"owner":{"id":7},"items":[{"id":1}]}'
    });

    expect(sample).toContain("tags: ['a', 'b']");
    expect(sample).toContain('owner: {');
    expect(sample).toContain('items: [\n');
  });

  it('quotes a key that is not a bare identifier', () => {
    expect(openApiFetch(post)).toContain("'Content-Type': 'application/json'");
    expect(openApiFetch(post)).toContain('  headers: {');
  });
});

describe('the Python clients', () => {
  it('calls the verb by name and passes json=', () => {
    const sample = openApiRequests(post);

    expect(sample).toContain('import requests');
    expect(sample).toContain('requests.post(');
    expect(sample).toContain('json={');
    expect(sample).toContain('"name": "Rex"');
  });

  it('falls back to the generic form for a verb it has no method for', () => {
    expect(openApiRequests({ ...get, method: 'OPTIONS' })).toContain(
      'requests.request(\n    "OPTIONS"'
    );
  });

  it('gives httpx the same shape', () => {
    expect(openApiHttpx(post)).toContain('import httpx');
    expect(openApiHttpx(post)).toContain('httpx.post(');
  });

  it('encodes the body for urllib and imports json only when it needs to', () => {
    expect(openApiUrllib(post)).toContain('data=json.dumps(');
    expect(openApiUrllib(post)).toContain('.encode()');
    expect(openApiUrllib(post)).toContain('import json');
    expect(openApiUrllib(get)).not.toContain('import json');
  });

  /** Python's own spellings, which JSON does not share. */
  it('writes python literals, not JSON', () => {
    const sample = openApiRequests({
      ...post,
      body: '{"on": true, "off": false, "none": null}'
    });

    expect(sample).toContain('"on": True');
    expect(sample).toContain('"off": False');
    expect(sample).toContain('"none": None');
  });
});

describe('go', () => {
  it('keeps the error branches that make it compile', () => {
    const sample = openApiGo(post);

    expect(sample).toContain(
      'req, err := http.NewRequest("POST", "https://api.test/pets", body)'
    );
    expect(sample).toContain('if err != nil {');
    expect(sample).toContain('req.Header.Set("X-Key", "abc")');
    expect(sample).toContain('resp, err := http.DefaultClient.Do(req)');
  });

  it('passes nil where there is no body', () => {
    expect(openApiGo(get)).toContain('nil)');
    expect(openApiGo(get)).not.toContain('strings.NewReader');
  });

  /** A backtick in the body would otherwise close the raw string literal. */
  it('survives a backtick in the body', () => {
    expect(openApiGo({ ...post, body: 'a`b' })).toContain('` + "`" + `');
  });
});

describe('the PHP clients', () => {
  it('gives guzzle the json option', () => {
    const sample = openApiGuzzle(post);

    expect(sample).toContain('$client = new \\GuzzleHttp\\Client();');
    expect(sample).toContain(
      "$client->request('POST', 'https://api.test/pets'"
    );
    expect(sample).toContain("'json' => [");
    expect(sample).toContain("'name' => 'Rex'");
  });

  it('drops the options array where there is nothing to put in it', () => {
    expect(openApiGuzzle(get)).toBe(
      "$client = new \\GuzzleHttp\\Client();\n\n$client->request('GET', 'https://api.test/pets?limit=10');"
    );
  });

  it('uses the laravel facade the way laravel reads', () => {
    const sample = openApiLaravelHttp(post);

    expect(sample).toContain('Http::withHeaders([');
    expect(sample).toContain("->post('https://api.test/pets'");
    expect(sample).not.toContain('Guzzle');
  });

  it('sets the method explicitly for the curl extension', () => {
    const sample = openApiPhpCurl(post);

    expect(sample).toContain("CURLOPT_CUSTOMREQUEST => 'POST'");
    expect(sample).toContain('CURLOPT_HTTPHEADER => [');
    expect(sample).toContain("'X-Key: abc'");
    expect(sample).toContain('CURLOPT_RETURNTRANSFER => true');
  });
});

describe('the registry', () => {
  it('gives every sample a unique id', () => {
    const ids = duxtRequestSamples.map((sample) => sample.id);

    expect(ids).toHaveLength(new Set(ids).size);
  });

  /**
   * The ids are the cookie's values, so renaming one silently resets every
   * reader's choice. Asserted by name to make that a decision rather than a
   * side effect.
   */
  it('keeps the shipped ids', () => {
    expect(duxtRequestSamples.map((sample) => sample.id)).toEqual([
      'curl',
      'fetch',
      'ofetch',
      'use-fetch',
      'axios',
      'python-requests',
      'python-httpx',
      'python-urllib',
      'go',
      'php-guzzle',
      'php-laravel',
      'php-curl'
    ]);
  });

  it('defaults to seven of the twelve', () => {
    expect(duxtDefaultRequestSamples).toHaveLength(7);

    const shipped = new Set(duxtRequestSamples.map((sample) => sample.id));
    for (const id of duxtDefaultRequestSamples) {
      expect(shipped, id).toContain(id);
    }
  });

  it('names a grammar for every sample', () => {
    for (const sample of duxtRequestSamples) {
      expect(sample.language, sample.id).toBeTruthy();
      expect(sample.group, sample.id).toBeTruthy();
    }
  });
});

describe('resolveRequestSamples', () => {
  it('takes the default seven when nothing is configured', () => {
    expect(resolveRequestSamples().map((sample) => sample.id)).toEqual(
      duxtDefaultRequestSamples
    );
  });

  it('replaces rather than extends, and keeps the written order', () => {
    const resolved = resolveRequestSamples(['php-guzzle', 'curl']);

    expect(resolved.map((sample) => sample.id)).toEqual(['php-guzzle', 'curl']);
  });

  it("takes a site's own generator inline", () => {
    const own: DuxtRequestSample = {
      id: 'ruby',
      group: 'Ruby',
      label: 'Net::HTTP',
      language: 'ruby',
      generate: () => 'Net::HTTP.get(uri)'
    };

    const resolved = resolveRequestSamples(['curl', own]);

    expect(resolved.map((sample) => sample.id)).toEqual(['curl', 'ruby']);
    expect(resolved[1]!.generate(get)).toBe('Net::HTTP.get(uri)');
  });

  it('lets a site replace a shipped sample by reusing its id', () => {
    const resolved = resolveRequestSamples([
      {
        id: 'curl',
        group: 'curl',
        label: 'curl',
        language: 'bash',
        generate: () => 'curl --mine'
      }
    ]);

    expect(resolved).toHaveLength(1);
    expect(resolved[0]!.generate(get)).toBe('curl --mine');
  });

  it('drops an id nothing ships', () => {
    expect(resolveRequestSamples(['curl', 'nope'])).toHaveLength(1);
  });
});
