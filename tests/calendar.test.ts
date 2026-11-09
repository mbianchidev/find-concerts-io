import assert from 'node:assert/strict';
import test from 'node:test';
import { calendarFile, googleCalendarUrl } from '../src/lib/calendar';
import { concert } from './fixtures';

test('calendar exports preserve instants and escape untrusted text', () => {
  const event = concert({ title: 'Example, band;\nInjected: no' });
  const text = calendarFile(event, new Date('2027-01-01T00:00:00Z'));
  assert.ok(text.includes('DTSTART:20270403T170000Z\r\n'));
  assert.ok(text.includes('SUMMARY:Example\\, band\\;\\nInjected: no\r\n'));
  assert.ok(!text.includes('\r\nInjected:'));
  const url = new URL(googleCalendarUrl(event));
  assert.equal(
    url.searchParams.get('dates')?.split('/')[0],
    '20270403T170000Z'
  );
});

test('all-day festival exports use an exclusive end date and reject undated shows', () => {
  const event = concert({
    datetime: '2027-06-05',
    end_datetime: '2027-06-07',
    date_only: true,
  });
  const text = calendarFile(event);
  assert.ok(text.includes('DTSTART;VALUE=DATE:20270605\r\n'));
  assert.ok(text.includes('DTEND;VALUE=DATE:20270608\r\n'));
  assert.throws(() => calendarFile(concert({ datetime: null })), /date/i);
});
