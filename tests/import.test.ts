import assert from 'node:assert/strict';
import test from 'node:test';
import writeXlsxFile from 'write-excel-file/node';
import {
  inspectWorkbook,
  parseWorkbook,
  parseConcertDate,
} from '../src/server/imports';

async function workbook() {
  return writeXlsxFile(
    [
      [
        'Name',
        'Where',
        'When I will be there',
        'Price',
        'When',
        'Status',
        'Notes',
      ].map((value) => ({ value })),
      [
        { value: '  Synthetic Festival  ' },
        { value: 'Example City, Fictional Field' },
        { value: 'One day only' },
        { value: 42, type: Number },
        { value: '5-6-7 Jun 2027' },
        { value: 'Considering' },
        { value: 'Synthetic private note' },
      ],
      [
        { value: 'Undated Synthetic Band' },
        { value: 'Example City' },
        null,
        null,
        { value: 'Sometime in July' },
        null,
        null,
      ],
      [{ value: '2027 (archived)' }],
      [{ value: 2028, type: Number }],
      [null, { value: 'Incomplete synthetic row' }],
    ],
    { sheet: 'Synthetic concerts' }
  ).toBuffer();
}

test('workbook inspection precedes mapping and imports preserve raw fields and uncertain dates', async () => {
  const buffer = await workbook();
  const preview = await inspectWorkbook(buffer);
  assert.equal(preview.sheets[0].name, 'Synthetic concerts');
  assert.equal(preview.sheets[0].headers[0], 'Name');
  const parsed = await parseWorkbook(buffer, [preview.sheets[0].mapping]);
  assert.equal(parsed.events.length, 2);
  assert.equal(parsed.report.total, 5);
  assert.equal(parsed.report.skipped, 3);
  assert.equal(parsed.report.errors, 1);
  assert.equal(parsed.events[0].title, 'Synthetic Festival');
  assert.equal(
    parsed.events[0].import_details?.fields.Name,
    '  Synthetic Festival  '
  );
  assert.equal(
    parsed.report.issues.filter((issue) => issue.level === 'error').length,
    1
  );
  assert.equal(parsed.events[0].datetime, '2027-06-05');
  assert.equal(parsed.events[0].end_datetime, '2027-06-07');
  assert.equal(
    parsed.events[0].import_details?.notes,
    'Synthetic private note'
  );
  assert.equal(parsed.events[0].import_details?.fields.Price, 42);
  assert.equal(parsed.events[1].datetime, null);
  assert.ok(
    parsed.report.issues.some((issue) =>
      /unconfirmed date/i.test(issue.message)
    )
  );
});

test('date parsing handles Excel serials and leap years without silently rolling invalid days', () => {
  assert.equal(parseConcertDate(61).datetime, '1900-03-01');
  assert.equal(parseConcertDate('29 Feb 2028').datetime, '2028-02-29');
  assert.equal(parseConcertDate('30 Feb 2027').datetime, null);
  assert.equal(parseConcertDate('13 Nov?').datetime, null);
  assert.equal(parseConcertDate('2027-02-30').datetime, null);
});

test('invalid archives are rejected before XML parsing', async () => {
  await assert.rejects(
    inspectWorkbook(Buffer.from('not an xlsx file')),
    /XLSX/i
  );
});

test('ZIP entries cannot hide their actual expanded size in central-directory metadata', async () => {
  const buffer = Buffer.from(await workbook());
  const directory = buffer.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
  assert.ok(directory > 0);
  buffer.writeUInt32LE(0, directory + 24);
  await assert.rejects(inspectWorkbook(buffer), /XLSX|archive|size/i);
});
