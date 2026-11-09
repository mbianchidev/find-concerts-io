import { createHash } from 'node:crypto';
import { inflateRawSync } from 'node:zlib';
import readXlsxFile from 'read-excel-file/node';
import type { Event, ImportDetails, ImportIssue, ImportReport } from '@/types';
import {
  eventSchema,
  mappingSchema,
  type WorkbookMapping,
  type WorkbookPreview,
} from '@/lib/schema';
import { AppError } from './errors';
export { mappingSchema };
export type { WorkbookMapping, WorkbookPreview };

export interface ParsedImport {
  events: Event[];
  report: ImportReport;
}

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_UNCOMPRESSED_BYTES = 30 * 1024 * 1024;
const MAX_ROWS = 5000;
const normalize = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]/g, '');

function checkArchive(buffer: Buffer): void {
  const invalid = () =>
    new AppError(
      422,
      'INVALID_WORKBOOK',
      'Upload a valid, unencrypted XLSX workbook.'
    );
  if (buffer.length > MAX_FILE_BYTES) {
    throw new AppError(
      413,
      'WORKBOOK_TOO_LARGE',
      'Workbooks must be no larger than 5 MB.'
    );
  }
  const end = buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (
    end < 0 ||
    end + 22 > buffer.length ||
    buffer.readUInt32LE(0) !== 0x04034b50
  )
    throw invalid();
  const count = buffer.readUInt16LE(end + 10);
  const directory = buffer.readUInt32LE(end + 16);
  let offset = directory;
  let bytes = 0;
  const tooLarge = () =>
    new AppError(
      413,
      'WORKBOOK_TOO_LARGE',
      'The expanded workbook exceeds the 30 MB safety limit.'
    );
  if (!count || count > 1000) throw invalid();
  for (let entry = 0; entry < count; entry++) {
    if (offset + 46 > end || buffer.readUInt32LE(offset) !== 0x02014b50)
      throw invalid();
    const flags = buffer.readUInt16LE(offset + 8);
    const method = buffer.readUInt16LE(offset + 10);
    const compressed = buffer.readUInt32LE(offset + 20);
    const declared = buffer.readUInt32LE(offset + 24);
    const local = buffer.readUInt32LE(offset + 42);
    if (
      flags & 1 ||
      ![0, 8].includes(method) ||
      local + 30 > directory ||
      buffer.readUInt32LE(local) !== 0x04034b50
    )
      throw invalid();
    if (bytes + declared > MAX_UNCOMPRESSED_BYTES) throw tooLarge();
    const start =
      local +
      30 +
      buffer.readUInt16LE(local + 26) +
      buffer.readUInt16LE(local + 28);
    if (start + compressed > directory) throw invalid();
    let actual = compressed;
    if (method === 8) {
      try {
        actual = inflateRawSync(buffer.subarray(start, start + compressed), {
          maxOutputLength: Math.max(1, MAX_UNCOMPRESSED_BYTES - bytes),
        }).length;
      } catch (error) {
        if (
          error &&
          typeof error === 'object' &&
          'code' in error &&
          error.code === 'ERR_BUFFER_TOO_LARGE'
        )
          throw tooLarge();
        throw invalid();
      }
    }
    if (actual !== declared) throw invalid();
    bytes += actual;
    if (bytes > MAX_UNCOMPRESSED_BYTES) throw tooLarge();
    offset +=
      46 +
      buffer.readUInt16LE(offset + 28) +
      buffer.readUInt16LE(offset + 30) +
      buffer.readUInt16LE(offset + 32);
  }
}

function raw(value: unknown): string | number | boolean | null {
  if (value instanceof Date) return value.toISOString();
  if (value === null || value === undefined) return null;
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  )
    return value;
  throw new AppError(
    422,
    'UNSUPPORTED_CELL',
    'The workbook contains an unsupported cell value. Export a values-only XLSX copy.'
  );
}

function headersFor(row: readonly unknown[], width: number): string[] {
  const headers = Array.from(
    { length: width },
    (_, index) => String(row[index] ?? '').trim() || `Column ${index + 1}`
  );
  if (new Set(headers).size !== headers.length) {
    throw new AppError(
      422,
      'DUPLICATE_HEADERS',
      'Each worksheet column needs a unique heading before it can be mapped.'
    );
  }
  return headers;
}

function fieldsFor(
  headers: string[],
  row: readonly unknown[]
): ImportDetails['fields'] {
  return Object.fromEntries(
    headers.map((header, index) => [header, raw(row[index])])
  );
}

async function readWorkbook(buffer: Buffer) {
  checkArchive(buffer);
  let sheets;
  try {
    sheets = await readXlsxFile(buffer, { trim: false });
  } catch {
    throw new AppError(
      422,
      'INVALID_WORKBOOK',
      'The XLSX workbook could not be read. Export an unencrypted .xlsx copy and try again.'
    );
  }
  if (
    sheets.length > 20 ||
    sheets.some(
      (sheet) =>
        sheet.data.length > MAX_ROWS + 20 ||
        sheet.data.some((row) => row.length > 100)
    )
  ) {
    throw new AppError(
      413,
      'WORKBOOK_TOO_LARGE',
      'Use at most 20 worksheets, 5,000 rows per worksheet, and 100 columns.'
    );
  }
  return sheets;
}

export async function inspectWorkbook(
  buffer: Buffer
): Promise<WorkbookPreview> {
  const sheets = await readWorkbook(buffer);
  return {
    sheets: sheets
      .filter((sheet) => sheet.data.length)
      .map(({ sheet, data }) => {
        const titleHeaders = new Set([
          'name',
          'title',
          'artist',
          'event',
          'concert',
        ]);
        let index = data
          .slice(0, 20)
          .findIndex((row) =>
            row.some(
              (value) =>
                typeof value === 'string' && titleHeaders.has(normalize(value))
            )
          );
        if (index < 0)
          index = data.findIndex((row) => row.some((value) => value !== null));
        const width = Math.max(...data.map((row) => row.length));
        const headers = headersFor(data[index] || [], width);
        const find = (...names: string[]) =>
          headers.find((header) => names.includes(normalize(header)));
        return {
          name: sheet,
          headers,
          rows: Math.max(0, data.length - index - 1),
          sample: data
            .slice(index + 1, index + 4)
            .map((row) => fieldsFor(headers, row)),
          mapping: {
            sheet,
            headerRow: index + 1,
            title: find('name', 'title', 'artist', 'event', 'concert') || '',
            date: find('when', 'date', 'eventdate', 'concertdate'),
            location: find('where', 'venue', 'location'),
            city: find('city'),
            country: find('country'),
            attendance: find('wheniwillbethere', 'attendance'),
            price: find('price', 'cost'),
            status: find('status'),
            notes: find('notes', 'note'),
          },
        };
      }),
  };
}

function day(year: number, month: number, date: number): string | null {
  const value = new Date(Date.UTC(year, month - 1, date));
  return value.getUTCFullYear() === year &&
    value.getUTCMonth() === month - 1 &&
    value.getUTCDate() === date
    ? value.toISOString().slice(0, 10)
    : null;
}

export function parseConcertDate(
  value: unknown,
  dateOrder?: WorkbookMapping['dateOrder']
): { datetime: string | null; end_datetime?: string; date_only: true } {
  const result = (datetime: string | null, end_datetime?: string) => ({
    datetime,
    end_datetime,
    date_only: true as const,
  });
  if (value instanceof Date)
    return result(
      Number.isFinite(value.getTime()) ? value.toISOString().slice(0, 10) : null
    );
  if (typeof value === 'number') {
    if (
      !Number.isFinite(value) ||
      value < 1 ||
      value > 2958465 ||
      Math.floor(value) === 60
    )
      return result(null);
    const base = Date.UTC(1899, 11, value < 60 ? 31 : 30);
    return result(
      new Date(base + Math.floor(value) * 86400000).toISOString().slice(0, 10)
    );
  }
  if (typeof value !== 'string') return result(null);
  const text = value.trim().replace(/(\d)(st|nd|rd|th)\b/gi, '$1');
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (iso) return result(day(Number(iso[1]), Number(iso[2]), Number(iso[3])));
  const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
  if (slash && dateOrder) {
    return result(
      day(
        Number(slash[3]),
        Number(slash[dateOrder === 'day-first' ? 2 : 1]),
        Number(slash[dateOrder === 'day-first' ? 1 : 2])
      )
    );
  }
  const named = /^(\d{1,2}(?:\s*-\s*\d{1,2})*)\s+([a-z]+)\s+(\d{4})$/i.exec(
    text
  );
  if (named) {
    const months = [
      'jan',
      'feb',
      'mar',
      'apr',
      'may',
      'jun',
      'jul',
      'aug',
      'sep',
      'oct',
      'nov',
      'dec',
    ];
    const month = months.indexOf(named[2].slice(0, 3).toLowerCase()) + 1;
    const days = named[1].split('-').map(Number);
    const first = day(Number(named[3]), month, days[0]);
    const last = day(Number(named[3]), month, days.at(-1) || 0);
    if (
      first &&
      last &&
      first <= last &&
      days.every((date) => day(Number(named[3]), month, date))
    ) {
      return result(first, days.length > 1 ? last : undefined);
    }
  }
  return result(null);
}

export async function parseWorkbook(
  buffer: Buffer,
  mappings: WorkbookMapping[]
): Promise<ParsedImport> {
  const sheets = await readWorkbook(buffer);
  const events: Event[] = [];
  const issues: ImportIssue[] = [];
  let total = 0;
  let skipped = 0;
  if (
    !mappings.length ||
    new Set(mappings.map((mapping) => mapping.sheet)).size !== mappings.length
  ) {
    throw new AppError(
      422,
      'INVALID_MAPPING',
      'Select each worksheet once and map its concert title column.'
    );
  }
  for (const input of mappings) {
    const mapping = mappingSchema.parse(input);
    const sheet = sheets.find((entry) => entry.sheet === mapping.sheet);
    if (!sheet || !sheet.data[mapping.headerRow - 1])
      throw new AppError(
        422,
        'INVALID_MAPPING',
        'The selected worksheet or header row does not exist.'
      );
    const headers = headersFor(
      sheet.data[mapping.headerRow - 1],
      Math.max(...sheet.data.map((row) => row.length))
    );
    const mapped = Object.entries(mapping).filter(
      ([key]) => !['sheet', 'headerRow', 'dateOrder'].includes(key)
    );
    if (mapped.some(([, value]) => value && !headers.includes(String(value)))) {
      throw new AppError(
        422,
        'INVALID_MAPPING',
        'A mapped column is not present in the selected worksheet.'
      );
    }
    for (let index = mapping.headerRow; index < sheet.data.length; index++) {
      const row = sheet.data[index];
      total++;
      const issue = (
        message: string,
        level: ImportIssue['level'] = 'warning'
      ) =>
        issues.push({ sheet: mapping.sheet, row: index + 1, message, level });
      if (!row.some((cell) => cell !== null && String(cell).trim())) {
        skipped++;
        issue('Blank row skipped.');
        continue;
      }
      const get = (column?: string) =>
        column ? row[headers.indexOf(column)] : null;
      const text = (column?: string) => String(raw(get(column)) ?? '').trim();
      const title = get(mapping.title);
      if (
        ((typeof title === 'string' &&
          /^\d{4}(?:\s*\(.*\))?$/.test(title.trim())) ||
          (typeof title === 'number' &&
            Number.isInteger(title) &&
            title >= 1600 &&
            title <= 2999)) &&
        row.filter((cell) => cell !== null && String(cell).trim()).length ===
          1 &&
        !text(mapping.date)
      ) {
        skipped++;
        issue(
          'Year/section heading skipped; the original workbook is unchanged.'
        );
        continue;
      }
      if (typeof title !== 'string' || !title.trim()) {
        skipped++;
        issue(
          'A nonempty text concert title is required. This row was not imported.',
          'error'
        );
        continue;
      }
      const date = parseConcertDate(get(mapping.date), mapping.dateOrder);
      if (!date.datetime)
        issue(
          'Unconfirmed date preserved as written. The concert is imported without an invented date.'
        );
      const location = text(mapping.location);
      const identity = [
        title.trim().toLowerCase(),
        String(raw(get(mapping.date)) ?? '').toLowerCase(),
        location.toLowerCase(),
      ].join('|');
      const event: Event = {
        id: `import:${createHash('sha256').update(identity).digest('hex').slice(0, 32)}`,
        title: title.trim(),
        ...date,
        date_label: text(mapping.date) || 'Date not specified',
        venue: {
          name: location,
          city: text(mapping.city),
          country: text(mapping.country),
          region: '',
          latitude: '',
          longitude: '',
        },
        lineup: [title.trim()],
        genres: [],
        url: '',
        source: {
          id: 'workbook',
          name: 'Private workbook',
          url: '',
          fetched_at: new Date().toISOString(),
        },
        status: 'scheduled',
        popularity: 0,
        is_private: true,
        import_details: {
          sheet: mapping.sheet,
          row: index + 1,
          fields: fieldsFor(headers, row),
          attendance: text(mapping.attendance),
          price: text(mapping.price),
          status: text(mapping.status),
          notes: text(mapping.notes),
        },
      };
      const validated = eventSchema.safeParse(event);
      if (!validated.success) {
        skipped++;
        issue(
          `Row could not be imported: ${validated.error.issues.map((error) => `${error.path.join('.')}: ${error.message}`).join('; ')}`,
          'error'
        );
      } else events.push(validated.data);
    }
  }
  return {
    events,
    report: {
      total,
      imported: 0,
      duplicates: 0,
      skipped,
      errors: issues.filter((issue) => issue.level === 'error').length,
      issues,
    },
  };
}
