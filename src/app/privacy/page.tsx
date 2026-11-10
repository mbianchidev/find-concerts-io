import Link from 'next/link';
import { PageIntro } from '@/components/Ui';

export const metadata = {
  title: 'Privacy and data',
  robots: { index: false, follow: true },
};
export const dynamic = 'force-dynamic';

export default function PrivacyPage() {
  const contact = process.env.PRIVACY_CONTACT;
  return (
    <main className="container" id="main" tabIndex={-1}>
      <PageIntro
        eyebrow="SOFTWARE DEFAULTS / UPDATED 10 NOVEMBER 2026"
        title="Privacy and data."
      >
        <p>
          This notice describes what this app does. The deployment operator must
          provide its controller identity, private contact channel, hosting
          location, backup retention, and any additional legal terms before
          offering a public service.
        </p>
      </PageIntro>
      <div className="panel">
        <h2>Accounts and private concerts</h2>
        <p>
          Accounts store a username, salted scrypt password hash, and optional
          private display name, location, and bio. Saved shows, followed artists
          and venues, private concert imports, and in-app notifications are
          linked to your account. Email is optional and is enabled for
          notifications only after ownership is confirmed. No payment
          information or social-login data is collected.
        </p>
        <p>
          Interested, Going, Went, and Didn&apos;t go are private saved-show
          statuses. Your archive also includes your past private imports. Dates
          never imply attendance, and original workbook fields stay unchanged.
          Statuses are included in your account export and removed when you
          remove the bookmark or delete your account, never shared with concert
          or calendar providers.
        </p>
        <h2 style={{ marginTop: 25 }}>Cookies and browser storage</h2>
        <p>
          The essential HttpOnly session cookie expires after 30 days and is
          revoked on sign-out. Guest saves stay in local storage and are not
          silently uploaded on sign-in. Privacy consent also stays in local
          storage. The offline cache contains only public static assets and a
          generic offline page, never account pages, private concerts, or API
          responses.
        </p>
        <h2 style={{ marginTop: 25 }}>Analytics and operational logs</h2>
        <p>
          Optional anonymous page counts and Core Web Vitals are off by default
          and respect Do Not Track. They do not include identity, URLs, search
          terms, concert details, or private notes. Aggregate metrics expire
          after 14 days. The server records request IDs, resource paths, status
          codes, and durations for reliability. Short-lived rate-limit keys are
          hashed; the app does not persist raw IP addresses. The hosting
          operator controls infrastructure and log retention.
        </p>
        <h2 style={{ marginTop: 25 }}>External services and sharing</h2>
        <p>
          Venue collection requests public pages only. Private imports are never
          sent to concert websites, public APIs, search engines, or deployment
          artifacts. Fonts and the generic crowd photo are served locally;
          supported venue images are proxied by the app. Calendar providers
          receive concert title, date, and location only when you follow their
          export link, never private notes. The app does not sell personal data.
        </p>
        <p className="muted-note">
          If the operator configures SMTP or browser push, those providers
          receive your opted-in delivery information and public concert alerts.
          Optional Sentry reporting sends generic failure messages and random
          request IDs, not user data, request bodies, code context, or workbook
          content. Optional Spotify and Ticketmaster integrations require server
          credentials and explicitly initiated searches. Provider hosting
          locations and international-transfer safeguards depend on the operator
          configuration.
        </p>
        <p className="muted-note">
          Embedded venue maps load only when you choose Show venue map. External
          map links also connect to OpenStreetMap when followed. OpenStreetMap
          then receives your IP address and normal browser request information.
          Missing public venue coordinates are looked up through this server
          using the public venue name, city, and country. Results are cached for
          30 days, or one day when no unique match is found. Private import
          locations are never looked up, embedded, or pre-filled into map links.
        </p>
        <h2 style={{ marginTop: 25 }}>Control, retention, and security</h2>
        <p>
          Use{' '}
          <Link className="show-link" href="/account">
            account settings
          </Link>{' '}
          to export your data, withdraw optional analytics or notification
          consent, or delete your account and its private records from the live
          database. Expired sessions are purged, email-confirmation links expire
          after 24 hours, and metrics expire after 14 days. Account data
          otherwise remains until you delete it. Changed workbook rows are not
          silently overwritten; the import report identifies conflicts. Contact
          the operator for correction, restricted processing, objections, or
          backup erasure.
        </p>
        <p className="muted-note">
          Sessions use Secure cookies when served over HTTPS. Database files use
          restricted filesystem permissions, but this app does not itself
          encrypt the SQLite database at rest. The operator must provide TLS,
          protected persistent storage, safe backups, access controls, and a
          retention schedule. This software notice is not a claim of legal
          compliance or a substitute for deployment-specific legal review.
        </p>
        <h2 style={{ marginTop: 25 }}>Contact, rights, and updates</h2>
        <p>
          {contact
            ? `Deployment privacy contact: ${contact}.`
            : 'No deployment privacy contact has been configured. The operator must set PRIVACY_CONTACT before a public launch.'}{' '}
          You may request access, correction, erasure, restriction, portability,
          or object to processing, withdraw consent, and complain to your
          applicable supervisory authority. Do not post private workbooks or
          personal data in public GitHub issues.
        </p>
        <p className="muted-note">
          This app does not verify age. Operators must set and publish an
          appropriate age policy and child-data handling process for their
          jurisdiction. Material changes should be reflected in this notice and
          communicated by the operator. Optional features remain disabled until
          configured and requested.
        </p>
      </div>
    </main>
  );
}
