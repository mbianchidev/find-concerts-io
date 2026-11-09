import { loadEnvConfig } from '@next/env';
import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { z } from 'zod';

async function main() {
  loadEnvConfig(process.cwd());
  const { values } = parseArgs({
    options: {
      file: { type: 'string' },
      username: { type: 'string' },
      mapping: { type: 'string' },
      inspect: { type: 'boolean', default: false },
    },
  });
  if (!values.file)
    throw new Error(
      'Usage: npm run import:workbook -- --file /private/concerts.xlsx --inspect, or --username existing-account [--mapping /private/mapping.json]'
    );
  const { inspectWorkbook, parseWorkbook, mappingSchema } =
    await import('../src/server/imports');
  const buffer = await readFile(values.file);
  const preview = await inspectWorkbook(buffer);
  if (values.inspect) {
    console.log(
      JSON.stringify(
        {
          sheets: preview.sheets.map(({ name, rows, headers, mapping }) => ({
            name,
            rows,
            headers,
            mapping,
          })),
        },
        null,
        2
      )
    );
    return;
  }
  if (!values.username)
    throw new Error(
      'Provide --username for the existing account that should own these private records. Passwords are never accepted as command-line arguments.'
    );
  const mappings = values.mapping
    ? z
        .array(mappingSchema)
        .parse(JSON.parse(await readFile(values.mapping, 'utf8')))
    : preview.sheets.map((sheet) => mappingSchema.parse(sheet.mapping));
  const { getStore } = await import('../src/server/store');
  const store = getStore();
  try {
    const owner = store.credentials(values.username);
    if (!owner)
      throw new Error(
        'The account does not exist. Create it in the app before importing private data.'
      );
    const parsed = await parseWorkbook(buffer, mappings);
    const report = store.importEvents(owner.id, parsed);
    const stored = store.events(owner.id, true);
    let verified = 0;
    for (const draft of parsed.events) {
      const actual = stored.find(
        (event) =>
          event.title === draft.title &&
          event.date_label === draft.date_label &&
          event.venue.name === draft.venue.name
      );
      if (!actual)
        throw new Error(
          'An imported concert could not be read back from private storage.'
        );
      if (
        JSON.stringify(actual.import_details?.fields) ===
        JSON.stringify(draft.import_details?.fields)
      )
        verified++;
    }
    console.log(
      JSON.stringify(
        {
          ...report,
          private_records_after_import: stored.length,
          exact_field_roundtrips: verified,
          parsed_records: parsed.events.length,
        },
        null,
        2
      )
    );
  } finally {
    store.close();
  }
}

void main().catch((error: unknown) => {
  console.error('Private workbook import failed:', error);
  process.exitCode = 1;
});
