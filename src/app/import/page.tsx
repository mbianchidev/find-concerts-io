'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApp } from '@/components/AppProvider';
import EventList from '@/components/EventList';
import ConcertSort from '@/components/ConcertSort';
import Icon from '@/components/Icon';
import SearchBar from '@/components/SearchBar';
import { AccountGate, ErrorState, PageIntro, Pager } from '@/components/Ui';
import { apiData, useApiPage } from '@/lib/api';
import {
  eventSchema,
  importReportSchema,
  workbookPreviewSchema,
  type WorkbookMapping,
  type WorkbookPreview,
} from '@/lib/schema';
import type { ImportReport, SearchFilters } from '@/types';
import { localCalendarDate } from '@/lib/utils';

type Column = Exclude<
  keyof WorkbookMapping,
  'sheet' | 'headerRow' | 'dateOrder'
>;
const columns: [Column, string][] = [
  ['title', 'Concert title (required)'],
  ['date', 'Concert date'],
  ['location', 'Venue / location as written'],
  ['city', 'City'],
  ['country', 'Country'],
  ['attendance', 'Attendance / travel dates'],
  ['price', 'Original price'],
  ['status', 'Your attendance status'],
  ['notes', 'Private notes'],
];

export default function ImportPage() {
  const { user } = useApp();
  const client = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<WorkbookPreview | null>(null);
  const [mappings, setMappings] = useState<WorkbookMapping[]>([]);
  const [report, setReport] = useState<ImportReport | null>(null);
  const errorCount =
    report?.errors ??
    report?.issues.filter((issue) => issue.level === 'error').length ??
    0;
  const [filters, setFilters] = useState<SearchFilters>({});
  const [page, setPage] = useState(1);
  const params = new URLSearchParams({
    page: String(page),
    limit: '12',
    today: localCalendarDate(),
  });
  Object.entries(filters).forEach(([name, value]) => {
    if (typeof value === 'string' && value) params.set(name, value);
  });
  const concerts = useApiPage(
    `/me/events?${params}`,
    eventSchema,
    user?.id || 'signed-out',
    !!user
  );
  const inspect = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Choose an XLSX workbook first.');
      const form = new FormData();
      form.set('file', file);
      return apiData('/imports/preview', workbookPreviewSchema, {
        method: 'POST',
        body: form,
      });
    },
    onSuccess: (result) => {
      setPreview(result);
      setMappings(result.sheets.map((sheet) => sheet.mapping));
      setReport(null);
    },
  });
  const importer = useMutation({
    mutationFn: async () => {
      if (!file || !preview)
        throw new Error('Inspect the workbook and confirm its mapping first.');
      const form = new FormData();
      form.set('file', file);
      form.set('mappings', JSON.stringify(mappings));
      return apiData('/imports', importReportSchema, {
        method: 'POST',
        body: form,
      });
    },
    onSuccess: (result) => {
      setReport(result);
      void client.invalidateQueries({ queryKey: ['page', user?.id] });
    },
  });

  const updateMapping = (sheet: string, field: Column, value: string) =>
    setMappings((current) =>
      current.map((mapping) =>
        mapping.sheet === sheet ? { ...mapping, [field]: value } : mapping
      )
    );

  return (
    <main className="container" id="main" tabIndex={-1}>
      <PageIntro
        eyebrow="YOUR CONCERT HISTORY, NOT PUBLIC DATA"
        title="Bring your nights with you."
      >
        <p>
          Inspect your spreadsheet, choose its columns, and keep every relevant
          field in your private account.
        </p>
      </PageIntro>
      {!user ? (
        <AccountGate>
          Your concert workbook is stored only under your signed-in account. It
          is never added to public listings.
        </AccountGate>
      ) : (
        <>
          <div className="import-layout">
            <div>
              <section className="panel" aria-labelledby="upload-title">
                <h2 id="upload-title">Start with your workbook.</h2>
                <p>
                  XLSX only, up to 5 MB. No records are saved until you confirm
                  the mapping.
                </p>
                <div className="upload-area">
                  <Icon name="upload" width="32" height="32" />
                  <label htmlFor="workbook">
                    Choose your concert spreadsheet
                  </label>
                  <input
                    id="workbook"
                    type="file"
                    accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    onChange={(event) => {
                      setFile(event.target.files?.[0] || null);
                      setPreview(null);
                      setMappings([]);
                      setReport(null);
                      inspect.reset();
                      importer.reset();
                    }}
                  />
                  <span className="form-help">
                    Apple Numbers: export an Excel (.xlsx) copy first. Your
                    original file is not changed.
                  </span>
                </div>
                <button
                  className="button"
                  disabled={!file || inspect.isPending}
                  onClick={() => inspect.mutate()}
                >
                  {inspect.isPending
                    ? 'Inspecting workbook...'
                    : 'Inspect workbook'}
                  <Icon name="arrow" />
                </button>
                <ErrorState error={inspect.error} />
              </section>
              {preview && (
                <section className="panel" aria-labelledby="mapping-title">
                  <h2 id="mapping-title">Check the mapping.</h2>
                  <p>
                    All original fields are preserved privately, including
                    unmapped columns. Ambiguous dates stay unconfirmed instead
                    of being guessed.
                  </p>
                  {preview.sheets.map((sheet) => {
                    const mapping = mappings.find(
                      (entry) => entry.sheet === sheet.name
                    );
                    return (
                      <div key={sheet.name} className="setting-row">
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={!!mapping}
                            onChange={(event) =>
                              setMappings((current) =>
                                event.target.checked
                                  ? [...current, sheet.mapping]
                                  : current.filter(
                                      (entry) => entry.sheet !== sheet.name
                                    )
                              )
                            }
                          />
                          {sheet.name} / {sheet.rows} data rows / header row{' '}
                          {sheet.mapping.headerRow}
                        </label>
                        {mapping && (
                          <>
                            <div className="mapping-grid">
                              {columns.map(([field, label]) => (
                                <label
                                  key={field}
                                  htmlFor={`${sheet.name}-${field}`}
                                >
                                  {label}
                                  <select
                                    id={`${sheet.name}-${field}`}
                                    value={mapping[field] || ''}
                                    onChange={(event) =>
                                      updateMapping(
                                        sheet.name,
                                        field,
                                        event.target.value
                                      )
                                    }
                                  >
                                    <option value="">
                                      {field === 'title'
                                        ? 'Choose a title column'
                                        : 'Not mapped'}
                                    </option>
                                    {sheet.headers.map((header) => (
                                      <option key={header} value={header}>
                                        {header}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                              ))}
                              <label htmlFor={`${sheet.name}-date-order`}>
                                Ambiguous numeric dates
                                <select
                                  id={`${sheet.name}-date-order`}
                                  value={mapping.dateOrder || ''}
                                  onChange={(event) => {
                                    const value = event.target.value;
                                    setMappings((current) =>
                                      current.map((entry) =>
                                        entry.sheet === sheet.name
                                          ? {
                                              ...entry,
                                              dateOrder:
                                                value === 'day-first' ||
                                                value === 'month-first'
                                                  ? value
                                                  : undefined,
                                            }
                                          : entry
                                      )
                                    );
                                  }}
                                >
                                  <option value="">
                                    Do not guess (keep original text)
                                  </option>
                                  <option value="day-first">
                                    Day / month / year
                                  </option>
                                  <option value="month-first">
                                    Month / day / year
                                  </option>
                                </select>
                              </label>
                            </div>
                            <div
                              className="table-wrap"
                              tabIndex={0}
                              aria-label={`Preview of ${sheet.name}`}
                            >
                              <table>
                                <caption className="sr-only">
                                  First rows from {sheet.name}; blank cells are
                                  marked Blank
                                </caption>
                                <thead>
                                  <tr>
                                    {sheet.headers.map((header) => (
                                      <th key={header} scope="col">
                                        {header}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {sheet.sample.map((row, index) => (
                                    <tr key={index}>
                                      {sheet.headers.map((header) => (
                                        <td key={header}>
                                          {row[header] === null
                                            ? 'Blank'
                                            : String(row[header])}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                  <p className="muted-note">
                    {mappings.length} of {preview.sheets.length} worksheets
                    selected. Unselected sheets will not be imported.
                  </p>
                  <button
                    className="button"
                    disabled={
                      !mappings.length ||
                      mappings.some((mapping) => !mapping.title) ||
                      importer.isPending
                    }
                    onClick={() => importer.mutate()}
                  >
                    {importer.isPending
                      ? 'Importing privately...'
                      : 'Import selected sheets'}
                    <Icon name="lock" />
                  </button>
                  <ErrorState error={importer.error} />
                </section>
              )}
              {report && (
                <section className="panel" aria-labelledby="report-title">
                  <h2 id="report-title">Import report</h2>
                  <p role="status">
                    {report.imported} imported, {report.duplicates} duplicates,{' '}
                    {report.skipped} skipped, {errorCount}{' '}
                    {errorCount === 1 ? 'error' : 'errors'} from {report.total}{' '}
                    rows.
                  </p>
                  <div className="import-counts">
                    {[
                      ['Imported', report.imported],
                      ['Duplicates', report.duplicates],
                      ['Skipped', report.skipped],
                      ['Errors', errorCount],
                      ['Rows checked', report.total],
                    ].map(([label, count]) => (
                      <div key={label}>
                        <strong>{count}</strong>
                        {label}
                      </div>
                    ))}
                  </div>
                  {report.issues.length > 0 && (
                    <details open>
                      <summary>
                        Review {report.issues.length} row warnings and errors
                      </summary>
                      <ul className="issue-list">
                        {report.issues.map((issue, index) => (
                          <li key={index}>
                            <strong>
                              {issue.sheet}, row {issue.row} / {issue.level}:
                            </strong>{' '}
                            {issue.message}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </section>
              )}
            </div>
            <aside>
              <section className="panel">
                <p className="eyebrow">
                  <Icon name="lock" />
                  ACCOUNT-PRIVATE
                </p>
                <h2 style={{ marginTop: 16 }}>Your history stays yours.</h2>
                <p>
                  Imports never enter the public catalogue, public artist pages,
                  search engines, or deployment artifacts. They are stored in
                  the server database under your account.
                </p>
                <p className="muted-note">
                  Repeated imports skip exact duplicates. If the same concert
                  has changed fields, the existing record is not overwritten;
                  the report explains the conflict.
                </p>
                <p className="muted-note">
                  Locations and prices stay as written. Notes and attendance
                  plans are not sent to calendar providers or concert websites.
                </p>
              </section>
            </aside>
          </div>
          <section
            className="listing-section"
            aria-labelledby="my-imports-title"
          >
            <div className="section-heading">
              <div>
                <h2 id="my-imports-title">Your imported concerts.</h2>
                <p className="result-count" role="status">
                  {concerts.data?.meta.total || 0} private records, including
                  past shows and unconfirmed dates.
                </p>
              </div>
            </div>
            <SearchBar
              citiesPath="/me/cities"
              scope={user.id}
              initial={filters}
              defaultPeriod="all"
              venues={concerts.data?.meta.venues}
              venuesPending={concerts.isFetching}
              onSearch={(next) => {
                setFilters({
                  ...next,
                  sort: Object.keys(next).length ? filters.sort : undefined,
                });
                setPage(1);
              }}
            />
            <div className="directory-results">
              <ConcertSort
                value={filters.sort}
                onChange={(sort) => {
                  setFilters((current) => ({ ...current, sort }));
                  setPage(1);
                }}
              />
              <ErrorState
                error={concerts.error}
                retry={() => void concerts.refetch()}
              />
              <EventList
                events={concerts.data?.data || []}
                loading={concerts.isPending}
                emptyMessage="Import a workbook above, or adjust your filters to find a concert in your history."
              />
              {concerts.data && (
                <Pager
                  page={page}
                  total={concerts.data.meta.total}
                  hasNext={concerts.data.meta.has_next}
                  onChange={setPage}
                />
              )}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
