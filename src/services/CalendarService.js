class CalendarService {
  constructor({ ical }) {
    this.ical = ical;
  }

  async getUpcomingEvents({ url, lookaheadDays, maxItems, referenceDate = new Date() }) {
    const data = await this.ical.async.fromURL(url);

    const upperBound = new Date(referenceDate.getTime() + lookaheadDays * 24 * 60 * 60 * 1000);

    const events = Object.values(data)
      .filter((entry) => entry.type === 'VEVENT' && entry.start)
      .map((event) => ({
        uid: event.uid,
        summary: event.summary || 'Untitled event',
        location: event.location || '',
        start: event.start instanceof Date ? event.start : new Date(event.start),
        end: event.end instanceof Date ? event.end : new Date(event.end),
        allDay: !!event.datetype && event.datetype === 'date',
      }))
      .filter((event) => event.start >= referenceDate && event.start <= upperBound)
      .sort((a, b) => a.start - b.start)
      .slice(0, maxItems)
      .map((event) => ({
        uid: event.uid,
        summary: event.summary,
        location: event.location,
        start: event.start.toISOString(),
        end: event.end ? event.end.toISOString() : null,
        allDay: event.allDay,
      }));

    return { events };
  }
}

module.exports = { CalendarService };
