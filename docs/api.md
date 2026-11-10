# API and integrations

Base path: `/api/v1`. All responses are JSON except calendar and account-export
downloads. Single resources use `{ data }`; lists use
`{ data, meta: { total, page, limit, has_next, venues? } }`. Pagination starts at 1 and
accepts limits up to 100. Errors use
`{ error: { code, message, request_id, details? } }`. Responses carry a matching
`X-Request-ID` and are never publicly cached by the browser.

City facets and source-status lookups return `{ data: [...] }` without pagination.
City options include persistent public venues, even with no upcoming concerts.

| Resource                              | Methods           | Access                                                                                  |
| ------------------------------------- | ----------------- | --------------------------------------------------------------------------------------- |
| `/health`                             | GET               | Public runtime capabilities and readiness                                               |
| `/users`                              | POST              | Register `{ username, password }`, normal role only                                     |
| `/sessions`                           | POST              | Sign in `{ username, password }`                                                        |
| `/sessions/current`                   | GET, DELETE       | Current account or null; revoke this session                                            |
| `/events`                             | GET               | Public concerts only                                                                    |
| `/events/:id`                         | GET               | Public or owner-authorized detail                                                       |
| `/events/:id/calendar`                | GET               | Owner-aware `.ics` download                                                             |
| `/events/:id/similar`                 | GET               | Similar upcoming public concerts                                                        |
| `/artists`, `/tours`                  | GET               | Derived public directories                                                              |
| `/venues`                             | GET               | Persistent public venues and filtered upcoming counts; `saved=true` requires an account |
| `/cities`                             | GET               | Public city facet; never includes private import locations                              |
| `/me/cities`                          | GET               | Public cities plus the signed-in owner's explicitly mapped private cities               |
| `/sources`                            | GET               | Venue collection status and errors                                                      |
| `/me/events`, `/me/saved-events`      | GET               | Private history / saved public and private concerts                                     |
| `/me/recommendations`                 | GET               | Account-specific public recommendations                                                 |
| `/me/saved`                           | GET, PUT          | `{ type: event/artist/venue, id, saved: boolean }`                                      |
| `/imports/preview`                    | POST              | Owner-only multipart `file`                                                             |
| `/imports`                            | POST, GET         | Multipart `file` and JSON `mappings`; recent reports                                    |
| `/notifications`                      | GET, PATCH        | Inbox; mark one `{ id }` or all `{}` as read                                            |
| `/push-config`                        | GET               | Notification capability flags and public VAPID key                                      |
| `/push-subscriptions`                 | GET, POST, DELETE | Current session's browser push                                                          |
| `/email-verifications`                | POST              | Send opt-in confirmation `{ email }`                                                    |
| `/email-verifications/confirm`        | POST              | Confirm `{ token }` while signed in                                                     |
| `/me`                                 | PATCH, DELETE     | Email preference / password-confirmed account deletion                                  |
| `/me/profile`                         | GET, PATCH        | Private display name, location, and bio; username and role cannot be changed here       |
| `/me/password`                        | PATCH             | Current-password verification, matching new passwords, and session rotation             |
| `/me/export`                          | GET               | Private account-data download, no credential material                                   |
| `/jobs`                               | GET, POST         | Admin-only worker status and `{ type: scrape }`                                         |
| `/metrics`                            | POST, GET         | Opted-in anonymous metrics / admin aggregates                                           |
| `/integrations/spotify/artists`       | GET               | Authenticated explicit artist search `?q=`                                              |
| `/integrations/ticketmaster/searches` | POST              | Authenticated `{ q, city?, genre? }`                                                    |

List filters: `artist`, `city`, `location`, `date=YYYY-MM-DD`, `date_from`,
`date_to`, `period`, `venue`, `sort`, `genre`, and where applicable
`past=true`, `saved=true`, or `view=trending`. The public event endpoint accepts
at most 30 comma-separated `ids` for guest shortlists and never resolves private IDs.

`city` is a trimmed, case-insensitive, NFKC-normalized full-city match, with a
250-character limit. It does not match venue names or nearby towns. It combines
with other filters on discovery, recommendations, similar concerts, saved/private
concerts, and directories. `location` remains the broader venue/city/country search.

The UI combines city suggestions and free-text location search into one **Where**
field. Choosing a known city sends `city`; other place text sends `location`.

`date_from` and `date_to` are inclusive venue-local calendar dates and can be used
independently. Multi-day shows match when their date span overlaps the range.
Invalid dates and reversed ranges return 422. The legacy `date` filter still
matches a show's start date.

`period=upcoming` includes today and future dates, excluding cancelled/postponed
shows. `today` matches concerts running on the reference day; `past` matches
concerts that ended before it. `all` also includes unconfirmed dates unless a
date range excludes them. Public discovery/directories default to upcoming;
private history and saved shows default to all. Explicit dates/ranges imply all
unless a period is supplied, so historical ranges work without another flag.
The browser sends its local day as `today=YYYY-MM-DD`; API callers that omit it
use the current UTC day. Upcoming comparisons retain explicit timestamp offsets.
Recommendations and trending remain upcoming-only.

Concert ordering accepts `sort=date_asc`, `date_desc`, `band_asc`, or `band_desc`.
Date order is chronological, with unconfirmed dates last in both directions.
Band order uses the headliner, falling back to the title. Sorting happens before
pagination. Discovery defaults to soonest first; recommendations/trending retain
their ranking unless an explicit sort is requested.

Concert and directory lists return `meta.venues` as
`[{ id, name, city, event_count }]`. These facets count the complete matching set,
not the current page, and omit zero-count venues. The selected `venue` facet is
excluded from its own counts so users can switch venues without clearing it.
Other filters, including date period/range, city, artist, and genre, remain active.
Private facets are owner-scoped. The independent venue directory still retains
followable venues without concerts.

Venue records may include `genres`, `source_url`, and an optional venue-website `url`.
Their stable IDs also validate follows when `event_count` is zero. City, location,
and genre filters can return these empty venues; artist/date filters require a
matching gig in the chosen period/range. Counts describe collected matching shows, not a claim that
the venue has no other concerts.

Event sources may include `genre_basis: "calendar"` or `"description"`.
Specialist-calendar categories are not independently verified artist subgenres.
An explicit concert date without a published start time uses `date_only: true`;
no local start time or UTC offset is invented.

Optional `image_kind: "event" | "artist" | "venue"` distinguishes concert/tour
artwork, reused headliner imagery, and a venue-photo fallback. Photos are public
source URLs, not uploaded copies or fabricated artwork.

Mutations require an `Origin` equal to `APP_ORIGIN`. JSON mutations require
`application/json`; imports require multipart forms. Session cookies are
HttpOnly and cannot be read by frontend code. CORS is same-origin only.

The client uses canonical trailing-slash API URLs and confirms a persisted server
session before treating sign-in as successful. The signed-in header shows the
username, profile-settings link, and Log out without requiring a page reload.
Blocked session cookies produce an explicit error instead of a false sign-in.

Profile updates accept `display_name` (80 characters), `location` (120), and
`bio` (500). These are account-private and never enter concert-source requests.
Password changes accept `current_password`, `new_password`, and `confirm_password`;
they require at least 12 characters for the new password, revoke existing
sessions/subscriptions, and issue a new confirmed session for the current browser.
Existing account IDs, password hashes, sessions, and concert records survive the
profile schema migration.

Default limits: 600 API requests/minute per trusted connection key,
10 authentication attempts/15 minutes, 20 import requests/hour/account,
30 provider searches/15 minutes/account, 3 email confirmations/hour/account,
and one queued collection/15 minutes. A 429 includes `Retry-After`.
Without a trusted proxy, the anonymous connection bucket is shared, rather than
trusting spoofable forwarding headers.

## Optional configuration

Spotify requires `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`; server-side
client credentials are cached until token expiry. Search results contain artist
profiles, genres, and previews only when the provider supplies one.
Ticketmaster requires `TICKETMASTER_API_KEY`. Explicit searches normalize supported
public events, persist them to the catalogue, and return every skipped-record
warning. Automated tests mock both providers with fictional data; production
never substitutes fake results when credentials or APIs are unavailable.

Email requires `SMTP_HOST`, `SMTP_FROM`, and optionally `SMTP_PORT`,
`SMTP_USER`, and `SMTP_PASSWORD`. Authentication values must be paired.
Addresses must be confirmed before notifications are enabled.

Push requires `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT`.
Generate keys privately with `npm exec web-push -- generate-vapid-keys`.
Only the public key is exposed to the browser. Push endpoints are limited to
supported browser services; sign-out/expiry removes the session's subscription
from delivery. A browser permission prompt appears only after explicit action.

`SENTRY_DSN` optionally enables sanitized error reporting. Core service operation,
private imports, source collection, recommendations, calendars, and the in-app
inbox do not depend on any of these external provider credentials.
