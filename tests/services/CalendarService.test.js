const test = require('node:test');
const assert = require('node:assert/strict');

const { CalendarService } = require('../../src/services/CalendarService');

test('CalendarService filters, sorts, and shapes events', async () => {
  const now = new Date('2024-05-01T12:00:00Z');
  const withinWindow = new Date('2024-05-03T09:00:00Z');
  const outsideWindow = new Date('2024-06-01T09:00:00Z');
  const service = new CalendarService({
    ical: {
      async: {
        async fromURL(url) {
          assert.equal(url, 'https://example.com/calendar.ics');
          return {
            event1: {
              type: 'VEVENT',
              uid: 'event-1',
              summary: 'Soon event',
              location: 'HQ',
              start: withinWindow,
              end: new Date(withinWindow.getTime() + 60 * 60 * 1000),
            },
            event2: {
              type: 'VEVENT',
              uid: 'event-2',
              summary: 'Far event',
              start: outsideWindow,
              end: new Date(outsideWindow.getTime() + 60 * 60 * 1000),
            },
            event3: {
              type: 'VTODO',
              uid: 'todo-1',
              start: withinWindow,
            },
          };
        },
      },
    },
  });

  const result = await service.getUpcomingEvents({
    url: 'https://example.com/calendar.ics',
    lookaheadDays: 10,
    maxItems: 5,
    referenceDate: now,
  });

  assert.deepEqual(result, {
    events: [
      {
        uid: 'event-1',
        summary: 'Soon event',
        location: 'HQ',
        start: withinWindow.toISOString(),
        end: new Date(withinWindow.getTime() + 60 * 60 * 1000).toISOString(),
        allDay: false,
      },
    ],
  });
});

test('CalendarService limits to max items and flags all-day events', async () => {
  const base = new Date('2024-05-01T00:00:00Z');
  const events = Array.from({ length: 3 }, (_, index) => ({
    type: 'VEVENT',
    uid: `event-${index}`,
    summary: `Event ${index}`,
    start: new Date(base.getTime() + index * 60 * 60 * 1000),
    end: new Date(base.getTime() + (index + 1) * 60 * 60 * 1000),
    datetype: index === 0 ? 'date' : undefined,
  }));

  const service = new CalendarService({
    ical: {
      async: {
        async fromURL() {
          return {
            a: events[2],
            b: events[1],
            c: events[0],
          };
        },
      },
    },
  });

  const { events: result } = await service.getUpcomingEvents({
    url: 'ignored',
    lookaheadDays: 1,
    maxItems: 2,
    referenceDate: base,
  });

  assert.equal(result.length, 2);
  assert.equal(result[0].uid, 'event-0');
  assert.equal(result[0].allDay, true);
  assert.equal(result[1].uid, 'event-1');
});
