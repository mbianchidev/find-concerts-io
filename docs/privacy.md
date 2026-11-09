# Privacy and operations

`/privacy` describes the software's data handling, not a blanket claim of GDPR
compliance. Before public launch, the deployment operator must publish controller
identity, a private contact channel (`PRIVACY_CONTACT`), hosting jurisdiction,
provider/transfer disclosures, age policy, log and backup retention, and any
additional legally required terms. Do not invent these values.

Private concert imports are account-owned database rows. They do not appear in
public feeds, artist/venue pages, recommendations shown to other accounts,
structured data, sitemaps, test fixtures, builds, or provider searches.
No private workbook file is retained after upload. Server-console tools must
only process owner-provided paths and must not publish the source file.

The essential session cookie expires after 30 days and is revoked on sign-out.
Guest saves and opt-in preferences stay in browser storage. The offline worker
stores only public static assets and a generic offline page, never API responses
or private HTML. Optional push delivery is session-bound; email is verified
and opt-in. The app does not sell personal data.

Anonymous operational metrics and opted-in browser counts expire after 14 days.
The application does not persist raw IP addresses or record bodies, search terms,
credentials, or workbook rows in request logs. Infrastructure logs and SMTP/push
provider behavior are deployment responsibilities. Optional Sentry automatic
collection is disabled; only generic failures and random request IDs are sent.

Use `/account` to export or delete live account data and withdraw optional
notification/analytics consent. Do Not Track overrides browser analytics consent.
Expired verification tokens and sessions are purged by the worker.
Database files have restricted filesystem permissions but are not encrypted
by the application. Provide TLS, encrypted/protected storage where needed,
restricted backups, retention, and a process for correction, restriction,
portability, objections, supervisory complaints, and backup erasure.
