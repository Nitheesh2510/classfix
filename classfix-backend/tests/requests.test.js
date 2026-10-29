import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { get, post, reseed, startTestServer, stopTestServer, tokenFor } from './helpers.js';

before(startTestServer);
after(stopTestServer);
beforeEach(reseed);

describe('request listing and visibility', () => {
  it('scopes a student to their own reports', async () => {
    const student = await tokenFor('student');
    const { status, body } = await get('/api/requests?limit=200', student);

    assert.equal(status, 200);
    assert.ok(body.total > 0);
    const reporters = new Set(body.items.map((item) => item.reportedBy));
    assert.deepEqual([...reporters], ['usr-student-1']);
  });

  it('shows faculty and officials the whole queue', async () => {
    const faculty = await tokenFor('faculty');
    const student = await tokenFor('student');

    const all = await get('/api/requests?limit=200', faculty);
    const mine = await get('/api/requests?limit=200', student);

    assert.ok(all.body.total > mine.body.total, 'faculty should see more than one student');
  });

  it('cannot be widened by a client-supplied filter', async () => {
    const student = await tokenFor('student');
    // Asking for another student's requests still returns only your own.
    const { body } = await get('/api/requests?reportedBy=usr-student-2&limit=200', student);
    assert.equal(body.total, 0);
  });

  it('filters by status, category, priority and location', async () => {
    const faculty = await tokenFor('faculty');

    const closed = await get('/api/requests?status=closed&limit=200', faculty);
    assert.ok(closed.body.items.every((item) => item.status === 'closed'));

    const fans = await get('/api/requests?category=fans&limit=200', faculty);
    assert.ok(fans.body.items.every((item) => item.category === 'fans'));
    assert.ok(fans.body.items.length > 0);

    const urgent = await get('/api/requests?priority=urgent&limit=200', faculty);
    assert.ok(urgent.body.items.every((item) => item.priority === 'urgent'));

    const inBuilding = await get('/api/requests?buildingId=bld-science&limit=200', faculty);
    assert.ok(inBuilding.body.items.every((item) => item.location.buildingId === 'bld-science'));
    assert.ok(inBuilding.body.items.length > 0);
  });

  it('treats overdue as a derived filter', async () => {
    const faculty = await tokenFor('faculty');
    const { body } = await get('/api/requests?status=overdue&limit=200', faculty);

    assert.ok(body.items.length > 0, 'the seed data contains overdue requests');
    for (const item of body.items) {
      assert.equal(item.overdue, true);
      assert.ok(new Date(item.expectedCompletion) < new Date());
      assert.ok(!['closed', 'rejected', 'duplicate', 'awaiting_verification'].includes(item.status));
    }
  });

  it('searches by id, title and room number', async () => {
    const faculty = await tokenFor('faculty');

    const byId = await get('/api/requests?search=CF-1005', faculty);
    assert.equal(byId.body.items.length, 1);
    assert.equal(byId.body.items[0].id, 'CF-1005');

    const byWord = await get('/api/requests?search=projector', faculty);
    assert.ok(byWord.body.items.length > 0);

    const byRoom = await get('/api/requests?search=204', faculty);
    assert.ok(byRoom.body.items.some((item) => item.location.roomNumber === '204'));
  });

  it('rejects an unknown filter value instead of ignoring it', async () => {
    const faculty = await tokenFor('faculty');
    const { status } = await get('/api/requests?status=not-a-status', faculty);
    assert.equal(status, 400);
  });

  it('sorts and paginates', async () => {
    const faculty = await tokenFor('faculty');

    const newest = await get('/api/requests?sort=newest&limit=200', faculty);
    const dates = newest.body.items.map((item) => new Date(item.createdAt).getTime());
    assert.deepEqual(dates, [...dates].sort((a, b) => b - a), 'newest first');

    const oldest = await get('/api/requests?sort=oldest&limit=200', faculty);
    assert.notEqual(oldest.body.items[0].id, newest.body.items[0].id);

    const byPriority = await get('/api/requests?sort=priority&limit=200', faculty);
    const rank = { low: 1, medium: 2, high: 3, urgent: 4 };
    const ranks = byPriority.body.items.map((item) => rank[item.priority]);
    assert.deepEqual(ranks, [...ranks].sort((a, b) => b - a), 'highest priority first');

    const firstPage = await get('/api/requests?limit=5&page=1', faculty);
    const secondPage = await get('/api/requests?limit=5&page=2', faculty);
    assert.equal(firstPage.body.items.length, 5);
    assert.equal(firstPage.body.limit, 5);
    assert.ok(firstPage.body.pageCount > 1);
    assert.notEqual(firstPage.body.items[0].id, secondPage.body.items[0].id);
  });

  it('caps the page size so one call cannot pull the whole table', async () => {
    const faculty = await tokenFor('faculty');
    const { status } = await get('/api/requests?limit=5000', faculty);
    assert.equal(status, 400);
  });
});

describe('creating requests', () => {
  it('validates the payload', async () => {
    const student = await tokenFor('student');

    const empty = await post('/api/requests', {}, student);
    assert.equal(empty.status, 400);
    assert.ok(empty.body.error.details.length >= 4);

    const shortText = await post(
      '/api/requests',
      { title: 'Fan', description: 'Broken', roomId: 'rm-mb-203', category: 'fans', priority: 'low' },
      student,
    );
    assert.equal(shortText.status, 400);

    const badCategory = await post(
      '/api/requests',
      {
        title: 'A reasonable title here',
        description: 'A description long enough to pass validation.',
        roomId: 'rm-mb-203',
        category: 'teleporter',
        priority: 'low',
      },
      student,
    );
    assert.equal(badCategory.status, 400);
  });

  it('refuses a room that does not exist', async () => {
    const student = await tokenFor('student');
    const { status } = await post(
      '/api/requests',
      {
        title: 'Something is broken here',
        description: 'A description long enough to pass validation.',
        roomId: 'rm-does-not-exist',
        category: 'other',
        priority: 'low',
      },
      student,
    );
    assert.equal(status, 400);
  });

  it('issues sequential ids and an opening history entry', async () => {
    const student = await tokenFor('student');
    const payload = (n) => ({
      title: `Sequential request number ${n}`,
      description: 'A description long enough to pass validation.',
      roomId: 'rm-mb-203',
      category: 'other',
      priority: 'low',
    });

    const first = await post('/api/requests', payload(1), student);
    const second = await post('/api/requests', payload(2), student);

    const firstNumber = Number(first.body.request.id.split('-')[1]);
    const secondNumber = Number(second.body.request.id.split('-')[1]);
    assert.equal(secondNumber, firstNumber + 1);

    assert.equal(first.body.request.timeline.length, 1);
    assert.equal(first.body.request.timeline[0].action, 'Request submitted');
    assert.equal(first.body.request.timeline[0].statusAfter, 'submitted');
  });

  it('does not let an official raise a request', async () => {
    const official = await tokenFor('electrical');
    const { status } = await post(
      '/api/requests',
      {
        title: 'Official raising a request',
        description: 'A description long enough to pass validation.',
        roomId: 'rm-mb-203',
        category: 'other',
        priority: 'low',
      },
      official,
    );
    assert.equal(status, 403);
  });
});

describe('comments and upvotes', () => {
  it('adds a comment and rejects an empty one', async () => {
    const faculty = await tokenFor('faculty');

    const added = await post('/api/requests/CF-1012/comments', { body: 'Looking at this now.' }, faculty);
    assert.equal(added.status, 201);
    assert.ok(added.body.request.comments.some((c) => c.body === 'Looking at this now.'));

    const empty = await post('/api/requests/CF-1012/comments', { body: '   ' }, faculty);
    assert.equal(empty.status, 400);
  });

  it('toggles an upvote and counts each person once', async () => {
    const student = await tokenFor('student2');

    const first = await post('/api/requests/CF-1014/upvote', {}, student);
    assert.equal(first.status, 200);
    assert.equal(first.body.added, true);
    const afterFirst = first.body.request.upvotes.length;

    // Voting again removes it rather than adding a second vote.
    const second = await post('/api/requests/CF-1014/upvote', {}, student);
    assert.equal(second.body.added, false);
    assert.equal(second.body.request.upvotes.length, afterFirst - 1);

    const third = await post('/api/requests/CF-1014/upvote', {}, student);
    assert.equal(third.body.request.upvotes.length, afterFirst);
    assert.equal(
      new Set(third.body.request.upvotes).size,
      third.body.request.upvotes.length,
      'no duplicate voters',
    );
  });

  it('returns 404 for a request that does not exist', async () => {
    const faculty = await tokenFor('faculty');
    assert.equal((await get('/api/requests/CF-9999', faculty)).status, 404);
    assert.equal((await post('/api/requests/CF-9999/upvote', {}, faculty)).status, 404);
  });
});

describe('statistics', () => {
  it('reports counts that agree with the request list', async () => {
    const faculty = await tokenFor('faculty');

    const summary = await get('/api/stats/summary', faculty);
    const list = await get('/api/requests?limit=200', faculty);
    assert.equal(summary.body.total, list.body.total);

    const overdue = await get('/api/requests?status=overdue&limit=200', faculty);
    assert.equal(summary.body.overdue, overdue.body.total);

    const closed = await get('/api/requests?status=closed&limit=200', faculty);
    assert.equal(summary.body.closed, closed.body.total);

    // The rate is derived from those same two numbers.
    const expectedRate = (closed.body.total / list.body.total) * 100;
    assert.ok(Math.abs(summary.body.resolutionRate - expectedRate) < 0.001);
  });

  it('scopes statistics to the caller', async () => {
    const student = await tokenFor('student');
    const faculty = await tokenFor('faculty');

    const mine = await get('/api/stats/summary', student);
    const all = await get('/api/stats/summary', faculty);
    assert.ok(mine.body.total < all.body.total);
  });

  it('returns breakdowns whose totals match', async () => {
    const faculty = await tokenFor('faculty');
    const { body } = await get('/api/stats/breakdown', faculty);
    const summary = await get('/api/stats/summary', faculty);

    for (const key of ['byStatus', 'byCategory', 'byBuilding', 'byDepartment']) {
      const sum = body[key].reduce((total, row) => total + row.value, 0);
      assert.equal(sum, summary.body.total, `${key} should sum to the total`);
    }

    assert.equal(body.monthlyTrend.length, 6);
  });

  it('serves the dashboard payload', async () => {
    const official = await tokenFor('electrical');
    const { status, body } = await get('/api/stats/dashboard', official);

    assert.equal(status, 200);
    for (const key of ['summary', 'byStatus', 'overdue', 'recentActivity', 'monthlyTrend']) {
      assert.ok(key in body, `missing ${key}`);
    }
    assert.ok(body.recentActivity.length > 0);
  });
});
