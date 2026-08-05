const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const clientSource = fs.readFileSync(
  path.join(__dirname, 'pinkertons-api.js'),
  'utf8',
);

function response(body, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    async json() {
      return body;
    },
  };
}

function loadClient(fetchStub) {
  const window = {};
  vm.runInNewContext(clientSource, {
    Error,
    Set,
    TypeError,
    URLSearchParams,
    fetch: fetchStub,
    window,
  });
  return window.fetchPinkertonActivities;
}

test('loads every activities page in offset order', async () => {
  const requests = [];
  const pages = new Map([
    [0, [{ id: 1 }, { id: 2 }]],
    [2, [{ id: 3 }, { id: 4 }]],
    [4, [{ id: 5 }]],
  ]);
  const fetchActivities = loadClient(async (input) => {
    const url = new URL(input);
    requests.push(url);
    return response(pages.get(Number(url.searchParams.get('offset'))));
  });

  const activities = await fetchActivities({ pageSize: 2 });

  assert.deepEqual(Array.from(activities, ({ id }) => id), [1, 2, 3, 4, 5]);
  assert.deepEqual(
    requests.map(url => url.searchParams.get('offset')),
    ['0', '2', '4'],
  );
  assert.ok(requests.every(url => url.searchParams.get('limit') === '2'));
});

test('applies a location filter to every page', async () => {
  const requests = [];
  const fetchActivities = loadClient(async (input, init) => {
    requests.push({ url: new URL(input), init });
    return response(requests.length === 1 ? [{ id: 1 }] : []);
  });
  const signal = AbortSignal.timeout(1_000);

  await fetchActivities({ locationId: 17, pageSize: 1, signal });

  assert.equal(requests.length, 2);
  assert.ok(requests.every(({ url }) => url.searchParams.get('location_id') === '17'));
  assert.ok(requests.every(({ init }) => init.signal === signal));
});

test('rejects invalid page sizes before requesting data', async () => {
  let requestCount = 0;
  const fetchActivities = loadClient(async () => {
    requestCount += 1;
    return response([]);
  });

  await assert.rejects(fetchActivities({ pageSize: 0 }), {
    name: 'TypeError',
    message: 'pageSize must be a positive integer',
  });
  assert.equal(requestCount, 0);
});

test('rejects malformed or duplicate API rows', async (t) => {
  await t.test('non-array response', async () => {
    const fetchActivities = loadClient(async () => response({ id: 1 }));
    await assert.rejects(fetchActivities(), /non-array response/);
  });

  await t.test('missing activity ID', async () => {
    const fetchActivities = loadClient(async () => response([{}]));
    await assert.rejects(fetchActivities(), /activity without an ID/);
  });

  await t.test('duplicate activity ID across pages', async () => {
    let page = 0;
    const fetchActivities = loadClient(async () => {
      page += 1;
      return response(page === 1 ? [{ id: 1 }] : [{ id: 1 }]);
    });
    await assert.rejects(
      fetchActivities({ pageSize: 1 }),
      /pagination returned a duplicate activity/,
    );
  });
});

test('reports HTTP errors without parsing their bodies', async () => {
  const fetchActivities = loadClient(async () => response(null, {
    ok: false,
    status: 503,
  }));

  await assert.rejects(fetchActivities(), /HTTP 503/);
});

test('map uses the shared paginated loader', () => {
  const mapTemplate = fs.readFileSync(
    path.join(__dirname, '../../layouts/_default/map.html'),
    'utf8',
  );

  assert.match(mapTemplate, /window\.fetchPinkertonActivities\(\)/);
  assert.doesNotMatch(
    mapTemplate,
    /fetch\(['"]https:\/\/data\.chnm\.org\/pinkertons\/activities/,
  );
});
