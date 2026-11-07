# OnClockly Connect — project knowledge

Audit date: **2 November 2026**; booking/request navigation updated **3 November 2026**.
This document describes the audited working
tree, including the notification onboarding flow. It is a technical handoff for
engineers and AI assistants, not a proposed redesign or a product roadmap.

**Evidence and scope:** facts below come from this repository's application
source, configuration, scripts, assets references, and documentation. Backend
paths mentioned in comments describe the client contract; the deployed server,
cloud credentials, live data, and physical-device behavior were not verified by
this audit. Section 18 separates confirmed implementation gaps from possible
runtime problems. No configuration variable names or values, credential
contents, account/project identifiers, or actual authentication tokens are
reproduced here. API field names are included where necessary to explain a
contract.

## 1. Project identity

- **Client-facing product:** OnClockly Connect, the display name in `app.json`.
- **Package:** `onclockly-client`, version `1.0.0`, private package, entry point
  `expo-router/entry`.
- **Purpose:** a mobile client portal for reviewing service bookings, requesting
  visits or booking changes, reviewing quotes, viewing invoices/PDFs, reading
  site instructions, and receiving account updates.
- **Users:** authenticated client-account members with owner, manager, booking,
  billing, or viewer responsibilities. The application's user type has
  `role: "client"`; it is not a staff administration or worker clock-in app.
- **Domain:** the product context is professional cleaning/services. The code
  accepts a free-text service description rather than implementing a fixed
  cleaning-service catalog.
- **Problem addressed:** clients can see scheduled work and commercial records
  and submit requests for staff review without accessing staff scheduling tools.
- **Ecosystem:** OnClockly is the master brand; this checkout is its client app.
  A separate worker-facing OnClockly product exists in the supplied project
  context. This repository contains no worker-facing screens. See section 17
  for the limits of the integration evidence.

Do not describe Documents, online payments, profile editing, password recovery,
or direct booking approval as implemented client features; the current limits
are documented below.

## 2. Tech stack

Versions below are the **declared ranges/versions in `package.json`**, not a
claim that every installed transitive dependency has that exact version.

| Technology | Declared version | Actual responsibility |
|---|---|---|
| Expo | `~58.0.21` | Application runtime, Metro configuration, native modules, build configuration |
| React / React DOM | `19.3.0` | Components/hooks/context; DOM supports the web target |
| React Native | `0.88.1` | Native views, text, lists, forms, modals, platform APIs, StyleSheet |
| TypeScript | `~6.0.3` | Strict application typing; API interfaces are compile-time contracts |
| Expo Router | `~58.0.28` | File routes, protected stacks, tabs, dynamic detail screens, imperative navigation |
| TanStack React Query | `^5.105.0` | Query cache, infinite lists, mutations, invalidation and polling |
| Axios | `^1.20.0` | `customFetch` plus isolated refresh/logout/push-cleanup requests |
| NativeWind / Tailwind | `^4.2.7` / `^3.4.17` | Configured CSS/JSX interoperability; current screens use StyleSheet rather than utility classes |
| Lucide React Native | `^1.61.0` | Navigation, status and action icons, backed by React Native SVG |
| Day.js | `^1.11.23` | Date display, local calendar/time comparisons and dashboard selection |
| Safe Area Context | `~5.10.1` | Screen safe-area views and tab-bar bottom inset |
| React Native Web | `~0.21.4` | Web rendering target |
| React Native Toast Message | `^2.5.2` | Mutation/authentication success and failure feedback |
| Community DateTimePicker | `9.2.1` | Still installed/configured; visit and reschedule forms use the shared React Native picker instead |
| Expo SecureStore | `~58.0.2` | Native session, push binding and notification-onboarding persistence |
| Expo Notifications | `~58.1.7` | Installed-app permissions, device push token, channels, receipt/tap listeners |
| Expo Constants | `~58.0.13` | Runtime environment and linked push-project configuration |
| Expo FileSystem | `~58.0.11` | Invoice download through the explicitly imported **legacy** API |
| Expo Sharing | `~58.0.21` | Opens the platform share sheet for invoice PDFs |
| Expo SplashScreen / StatusBar | `~58.0.12` / `~58.0.4` | Startup splash lifecycle and dark status-bar content |
| Expo Dev Client | `~58.0.18` | Installed development builds |
| ESLint / Expo ESLint config | `^9.0.0` / `~58.0.4` | Expo flat-config lint checks |

React Context is used directly for authentication; there is no separate Redux,
Zustand, or other application state store in the inspected source.

Other declared packages include `@expo/ui`, Expo Device, Font, GlassEffect,
Image, Linking, Symbols, SystemUI, WebBrowser, Gesture Handler, Reanimated,
Worklets, Screens, and React Native SVG. Some provide Router/native/plugin
infrastructure. Several have no direct application import in `src`; that alone
does **not** establish that removing them is safe. In particular, avatars use
React Native `Image`, and no custom font-loading call was found.

## 3. Repository structure

```text
client-mobile/
├── PROJECT.md                         This handoff
├── AGENTS.md                          Repository-specific engineering rules
├── README.md                          Still the stock Expo starter README
├── package.json / package-lock.json    npm package manifest and lockfile
├── app.json                           Static identity/platform/plugin config
├── app.config.ts                      Extends static config for Android Firebase file setup
├── eas.json                           Build/submission profiles
├── .eas/workflows/create-production-builds.yml
├── .github/workflows/build-android-apk.yml
├── babel.config.js / metro.config.js   Expo + NativeWind integration
├── tailwind.config.js / global.css     Tailwind scanning/directives
├── nativewind-env.d.ts                 NativeWind type augmentation
├── tsconfig.json / eslint.config.js
├── assets/
│   ├── images/                        App/splash/adaptive icons, favicon, starter assets
│   └── expo.icon/                     Additional icon bundle; not referenced by current app config
├── docs/notifications.md              Notification operation/setup notes
├── scripts/
│   ├── test-session-storage.cjs
│   ├── test-session-cleanup.cjs
│   ├── test-notifications.cjs
│   ├── test-styled-pressable.cjs
│   └── reset-project.js               Starter reset utility; not routine maintenance
└── src/
    ├── app/
    │   ├── _layout.tsx
    │   ├── login.tsx
    │   ├── notification-onboarding.tsx
    │   ├── (tabs)/
    │   │   ├── _layout.tsx
    │   │   ├── index.tsx
    │   │   ├── quotes.tsx
    │   │   ├── bookings.tsx
    │   │   ├── new-booking.tsx         Plus action / redirect alias
    │   │   ├── invoices.tsx
    │   │   └── profile.tsx
    │   ├── booking/[id].tsx
    │   ├── request-booking.tsx
    │   ├── sites.tsx / site/[id].tsx
    │   ├── quote/[id].tsx / invoice/[id].tsx
    │   ├── notifications.tsx
    │   └── documents.tsx
    ├── components/
    │   ├── Avatar.tsx / StatusBadge.tsx
    │   ├── StyledPressable.tsx / interactiveStyles.ts
    │   ├── SearchAndFilters.tsx / QueryStates.tsx
    │   ├── NotificationBell.tsx / NotificationRuntime.tsx
    │   └── dashboard/
    │       ├── BookingCard.tsx
    │       ├── AccountOverview.tsx
    │       ├── QuickActions.tsx
    │       └── DashboardPrimitives.tsx
    ├── context/AuthContext.tsx
    ├── hooks/
    │   ├── useDashboardData.ts
    │   ├── useNotifications.ts
    │   └── useTabBarClearance.ts
    ├── lib/queryClient.ts
    └── utils/
        ├── types.ts / clientPermissions.ts
        ├── auth.ts / auth.web.ts / sessionStorage.ts / authEvents.ts
        ├── customFetch.ts
        ├── clientPush.ts / pushRegistration.ts / notificationOnboarding.ts
        ├── notifications.ts
        ├── dashboard.ts / format.ts
        └── theme.ts / cardShadow.ts
```

`src/app` contains route components and layouts; non-route logic belongs in the
other `src` directories. Types are centralized mainly in `utils/types.ts`, with
notification contracts in `utils/notifications.ts`. There is no separate
document model or shared form-control library.

Generated dependencies, Metro/QA/export files, caches and native build output
are omitted from this tree. No `ios/` or `android/` directory is currently
present. Native projects are generated from Expo configuration.

## 4. Navigation architecture

`src/app/_layout.tsx` imports root `global.css`, mounts `AuthProvider`, the dark
`StatusBar`, splash controller, navigation theme, shared `QueryClientProvider`,
protected `Stack`, and Toast host. `NotificationRuntime` is inside the query
provider and mounts whenever authenticated, including during onboarding.

```text
Root stack
├── unauthenticated
│   └── /login                         login.tsx
└── authenticated
    ├── needsNotificationOnboarding
    │   └── /notification-onboarding   notification-onboarding.tsx
    │                                 gestureEnabled: false
    └── !needsNotificationOnboarding
        ├── (tabs)                     (tabs)/_layout.tsx
        │   ├── /                     (tabs)/index.tsx       Home
        │   ├── /quotes               (tabs)/quotes.tsx
        │   ├── /bookings             (tabs)/bookings.tsx
        │   ├── /new-booking          (tabs)/new-booking.tsx  redirects to request form
        │   ├── /invoices             (tabs)/invoices.tsx
        │   └── /profile              (tabs)/profile.tsx
        ├── /notifications            notifications.tsx
        ├── /booking/[id]             booking/[id].tsx
        ├── /request-booking          request-booking.tsx    standalone card presentation
        ├── /sites                    sites.tsx
        ├── /site/[id]                site/[id].tsx
        ├── /quote/[id]               quote/[id].tsx
        ├── /invoice/[id]             invoice/[id].tsx
        └── /documents                documents.tsx
```

`(tabs)` is a route group and does not appear in the public URL. These are the
only nested layouts found. Normal native headers are hidden; screens implement
their own headings/back controls. Dynamic route IDs come from
`useLocalSearchParams`; calls such as `router.push({pathname:"/booking/[id]",
params:{id}})` preserve Expo Router navigation.

Main relationships:

- Login establishes auth; protected guards expose onboarding or the app.
- Onboarding Enable/Maybe later completes the onboarding gate.
- Home profile/avatar and notification bell open Profile and Notifications.
- Home next visit, account summaries, and quick actions open their detail/list
  destinations. Bookings is a bottom tab; Sites, Documents and Request a visit
  remain stack routes.
- The center plus is a request action, not the Quotes route. Its `new-booking`
  tab intercepts `tabPress`, prevents tab selection, and pushes the standalone
  `/request-booking` screen. Its redirect component handles direct/restored
  alias navigation. Back/Cancel/success returns to the previous screen, with
  `/bookings` as a fallback when there is no history.
- Lists open singular detail routes: `/bookings` → `/booking/[id]`, `/quotes` →
  `/quote/[id]`, `/invoices` → `/invoice/[id]`, `/sites` → `/site/[id]`.
- Booking detail can open its linked invoice. Reschedule/cancel forms are local
  modals in that detail screen, not separate file routes.
- Notification links are mapped from server booking URLs to mobile destinations;
  the resolver does not accept arbitrary URLs.
- Notifications has a `canGoBack` fallback to Home; several other back controls
  simply call `router.back()`.

Visible tab order is Home, Bookings, plus request action, Invoices, Profile.
Home/Profile are always shown. Bookings/Invoices depend on their read permission,
and the plus depends on `booking:create`. Quotes remains a hidden tab route
(`href: null`) reachable from permitted dashboard account actions. This is link
visibility, **not** a local
authorization boundary for every direct route. Root guards enforce auth and
onboarding, not individual business permissions.

## 5. Authentication

Primary files: `src/context/AuthContext.tsx`, `src/utils/auth.ts`,
`src/utils/auth.web.ts`, `src/utils/sessionStorage.ts`,
`src/utils/customFetch.ts`, `src/utils/authEvents.ts`, `src/app/login.tsx`.

### Login and restoration

1. Login trims/lowercases email and posts email/password to
   `POST /client-auth/mobile-login`.
2. The expected body contains `user`, `client`, `company`, `accessToken` and
   `refreshToken`; actual credential values must never be logged/documented.
3. `AuthContext.login` starts a new storage generation, clears old account
   state/cache, persists the user and token pair, then exposes the account.
4. Native auth storage uses Expo SecureStore. The `.web.ts` adapter uses
   `window.sessionStorage`. Both use the same queued storage factory.
5. Startup restores the stored user/access credential. It does not decode
   expiry or automatically request `/portal/me`. Missing/corrupt data is cleared.
6. `client` and `company` are populated from login but are not persisted or
   restored; after a restart they remain null in context until a later login.

Context exposes `user`, `client`, `company`, `accessToken`, `loading`, `login`,
`logout`, `updateUser`, `needsNotificationOnboarding`, and
`completeNotificationOnboarding`. `updateUser` merges/persists a local user patch;
it is not itself an API profile-update operation.

Profile separately queries `GET /portal/me`. It displays returned client/company
data but does not synchronize the context user from that result. Stored
identity/role can therefore lag server changes.

### Authenticated API requests and rotation

The app primarily uses body-delivered credentials and Bearer authorization.
The client-auth endpoints explicitly disable cookie credentials. There is no
cookie-based login state stored by this application; browser/server cookie
behavior outside these requests is outside this audit.

`customFetch` stamps a request's session version before asynchronous reads,
reads the latest stored access credential, and attaches the Bearer header.
Responses/errors from an obsolete generation are rejected as Axios cancellation.

A protected HTTP 401 gets one shared, per-generation refresh operation:

- Raw Axios posts the refresh credential to `/client-auth/refresh`, with a
  ten-second timeout and credential transport disabled.
- Concurrent failures share that rotation. The token pair is saved together
  only if the original generation is still active, then the request retries.
- `_retry` prevents an endless retry loop.
- Missing refresh credentials or refresh HTTP 401/403 invokes the unauthorized
  event bridge, Toast and logout.
- Offline/timeouts/refresh server errors preserve local auth for retry.
- A late rotation's newly issued refresh credential is best-effort retired.
  A stale successful login response is similarly prevented from reopening auth.

Refresh updates **storage**, not `AuthContext.accessToken`. The context string
is used as a truthy navigation marker and may no longer be the latest access
credential. New network code should use `customFetch` or `getToken()`.

### Logout and concurrency

Logout begins push cleanup, synchronously invalidates the storage generation,
clears React account/onboarding state, cancels queries and clears both query and
mutation caches. It then finishes storage deletion and remote revocation; UI
sign-out does not wait for the network.

`sessionStorage.ts` serializes writes and protects reads against obsolete
generations. `clearSession()` captures the latest refresh credential after any
already-started storage writes and attempts every session-key deletion. It does
not wait for unfinished network refreshes; their late results are retired
separately by `customFetch`. Its return
value is used for `POST /client-auth/logout`. `SessionChangedError` identifies
stale writes; `SessionCleanupError` preserves a captured refresh credential even
if local deletion fails, allowing revocation to proceed.

Logout is deduplicated for the same generation. Raw revocation has a five-second
timeout, can include the exact push binding, and bypasses refresh interceptors.
Old logout completion cannot clear a newer account's cache. Local deletion and
remote cleanup failures have separate Toast messages. Offline cleanup cannot
guarantee remote session/device revocation.

### Notification onboarding gate

After restore/login, the provider checks a SecureStore completion flag and
native permission status. Only an incomplete flag plus `undetermined` permission
requires onboarding. Unsupported platforms, Expo Go, or missing push-project
metadata report `unavailable` and do not cause this gate. Other native setup
errors can reject; the evaluator catches errors and does not require onboarding.
Completion/Maybe later stores a device-wide flag,
which survives logout and is not keyed by user. Generation checks protect the
asynchronous evaluation. See section 18 for the Enable error path.

## 6. Users, roles and permissions

`ClientUser.role` is the literal `"client"`. Optional `clientRole` is one of
`owner`, `manager`, `booking`, `billing`, `viewer`.

`src/utils/clientPermissions.ts` defines `canClient(role, action)`. Unknown or
missing roles return false. Its comment identifies it as a UI mirror of the
backend permission system; actual authorization must remain server-enforced.

| Permission | Owner | Manager | Booking | Billing | Viewer |
|---|---|---|---|---|---|
| `booking:read` | Yes | Yes | Yes | No | Yes |
| `booking:create` | Yes | Yes | Yes | No | No |
| `booking:update` | Yes | Yes | Yes | No | No |
| `booking:cancel` | Yes | Yes | Yes | No | No |
| `quote:read` | Yes | Yes | No | Yes | No |
| `quote:accept` | Yes | No | No | No | No |
| `invoice:read` | Yes | Yes | No | Yes | No |

Usage:

- Booking section, Manage bookings and Sites use `booking:read`.
- Request a visit and the booking-request panel use `booking:create`.
- Reschedule/cancel controls use `booking:update` / `booking:cancel`, plus status,
  calendar eligibility and pending-request checks.
- Quote/invoice dashboard summaries and the visible invoice tab use their read
  permissions. Quotes has a hidden tab route rather than a bottom-bar button.
- Request booking and its action alias redirect users without `booking:create`
  to Home; the API remains the authorization boundary.
- Quote approval **and decline** use `quote:accept`; owner-only copy is shown
  where relevant. Sent/viewed status is also required.
- Profile, Documents, notification setup and personal inbox have no extra
  business permission gate beyond authenticated navigation.

Not every stack screen independently checks its read permission. The linked
invoice and Withdraw controls also have UI-gating gaps (section 18). Do not
equate a hidden tab with secure authorization or weaken the API's enforcement.

## 7. Main product features

| Feature and source | Implemented user behavior | Permissions and important components |
|---|---|---|
| Home, `src/app/(tabs)/index.tsx` | Greeting, next scheduled visit, commercial summaries, quick navigation and unread bell | Role-gated dashboard queries; dashboard components; section 8 |
| Bookings, `src/app/(tabs)/bookings.tsx` | Calendar by default with month/year navigation, marked dates and daily/monthly agendas; List switch retains search/status filters; details and pending/declined request cards | Booking-read route/tab guard; request actions need booking-create; month/day retained when switching views |
| Booking detail, `src/app/booking/[id].tsx` | Schedule/location/site instructions, charge information, linked invoice, review requests; reschedule/cancel request modals; withdraw a pending change request | Update/cancel permissions and temporal/status rules; local modals/pickers, StatusBadge |
| Request visit, `src/app/request-booking.tsx` | Standalone full-page form; service description, preferred date defaulting to tomorrow, optional time/notes; submits a staff-reviewed request | Entry action and route require booking-create; unauthorized local entry redirects Home; shared DateTimePickerField/Sheet |
| Sites, `src/app/sites.tsx` | Read-only location list and navigation to site detail | Booking-read entry action; simple spinner/error/empty states |
| Site detail, `src/app/site/[id].tsx` | Read-only address/contact/general/access/parking instructions | Contact fields are text, not call/email actions; no implemented booking-history section |
| Quotes, `src/app/(tabs)/quotes.tsx` | Infinite list, loaded-record search, All/To review/Accepted/Closed filters, review summary | Hidden tab route; quote-read dashboard entry; SearchAndFilters, StatusBadge, QueryStates |
| Quote detail, `src/app/quote/[id].tsx` | Items/tax/totals/status/validity; warning within ten days; approve or decline with optional reason | Quote-read contract; quote-accept owner action on sent/viewed records |
| Invoices, `src/app/(tabs)/invoices.tsx` | Infinite list, loaded-record search, All/Due/Overdue/Paid filters, outstanding summary | Invoice-read tab; shared list states/statuses |
| Invoice detail, `src/app/invoice/[id].tsx` | Issue/due dates, line items, VAT, totals, amount paid/balance; download/share PDF | Invoice-read contract; FileSystem legacy + Sharing; no payment/checkout action |
| Documents, `src/app/documents.tsx` | **Static coming-soon screen** | No document API, document type, upload or sharing implementation here |
| Profile, `src/app/(tabs)/profile.tsx` | Read-only identity/role/client/provider information, help copy and confirmed sign-out | AuthContext, `/portal/me`, Avatar; no edit/change-password operation |
| Notifications, `src/app/notifications.tsx` | Infinite inbox, unread summary, mark one/all read, booking destination, relative times, phone Enable/settings card | Personal inbox; destination resolver additionally requires booking-read |
| Notification onboarding, `src/app/notification-onboarding.tsx` | Permission-benefit explanation, Enable notifications, Maybe later | Authenticated conditional route; clientPush + AuthContext completion |

Form/API semantics:

- Creating a visit request sends trimmed `service`, preferred calendar date
  `YYYY-MM-DD`, optional `preferredTime` `HH:mm`, and optional trimmed notes.
  Only service nonemptiness is locally required; backend validation is necessary.
- Booking changes create **requests for staff review**, not immediate edits to
  the scheduled job. Reschedule sends requested date/start/end plus optional
  reason; cancellation sends an optional reason. Withdrawal cancels a request.
- Detail UI permits change requests for eligible draft/published bookings not
  before today and hides creation controls when a pending request is known.
  These calendar checks are not the dashboard's time-of-day calculations.
- Quote response invalidates the quote detail and quote-list prefix. Visit
  request creation/cancellation invalidates request lists; change actions
  invalidate the booking's change-request list.

Lists search/filter **only currently loaded pages**, not the server's entire
dataset. Bookings/quotes/invoices provide pagination and additional-search/load
controls; their counters must be interpreted in that context.

### Booking calendar

The Bookings tab defaults to Calendar; List remains available. Header and mode
controls scroll with the content so short phones and large text retain access
to the calendar and agenda. Selecting a day reveals its bookings, All month
clears that selection, arrows browse months, and the month title opens a year/
month chooser. Calendar bookings open the existing `/booking/[id]` detail route.

`useBookingCalendar` has account/month-scoped keys under `portal-bookings` and
requires `booking:read`. The existing API supports only status/page/limit, with
dates sorted descending; it has no server month/range filter. The calendar scans
pages of 100 until the oldest visible grid day is passed or pagination ends,
then filters and deduplicates the complete visible range. Requests consume the
query cancellation signal. Failed scans reject as a whole; initial failures do
not masquerade as empty months, and refresh failures retain cached results.
Long histories can require several requests when browsing older months. The
server's date-only offset sort is not a stable snapshot during concurrent
changes; client deduplication cannot guarantee recovery of skipped records.

Jobs store UTC-midnight calendar dates; calendar/list displays preserve the
written YYYY-MM-DD day instead of converting it to the phone's timezone. UK
Today uses Europe/London, matching the server's service timezone. Start/end
times stay HH:mm wall-clock values, including overnight bookings. A past date
does not imply completed status: every badge uses the actual server status.
No new backend endpoints, calendar dependencies or production fixtures exist.

## 8. Dashboard

The dashboard is deliberately split among `index.tsx`, `useDashboardData.ts`,
`utils/dashboard.ts`, and `components/dashboard/*`.

### Header and layout

The header shows a 40-point Avatar, a device-hour greeting (morning before 12,
afternoon before 18, otherwise evening), the first word of `user.fullname`, a
Profile press target and NotificationBell. **It currently renders no date or
Last updated label.** Old date/header-stack style definitions remain unused.

Canvas is warm off-white. Content is centered, `maxWidth: 560`, horizontal
padding 20, top padding 16, and section gap 24. The Overview stacks above font
scale 1.25; several booking/quick-action/notice rows stack above 1.3. The name
uses one line, while content flex rules allow shrinking/wrapping elsewhere.

On focus, permitted dashboard queries refetch. Pull-to-refresh waits for their
independent results with `Promise.allSettled`. A focus-scoped 60-second clock
recomputes the selected booking from cached candidates, rather than downloading
all booking pages every minute.

### Next booking

`fetchUpcomingBookings` requests published bookings, pages of 100. It assumes
the API sorts dates descending and stops at exhaustion or when dates older than
yesterday appear. Yesterday is retained for overnight visits. This ordering is
an explicit **client assumption**, not a server guarantee verified in this repo.

`selectNextBooking` excludes non-published, invalid and ended visits, retains
ongoing visits, and chooses earliest eligible start. `bookingStart` preserves
the first ten ISO date characters before combining the separate start time.
`bookingEnd` reconstructs end time and adds a day for overnight/equal-time
positive-duration cases. These values are parsed in **phone local timezone**.

`BookingCard.tsx` presents a green service/location region and white date/time
itinerary. Its scheduled-now indicator is based on schedule, not live worker
attendance. Pressing opens `/booking/[id]`. Empty, initial loading/error, and
cached-data refresh failures have distinct states and request/list actions.

### Your account

`AccountOverview.tsx` renders permission-appropriate Quotes to review and
Outstanding rows beneath “Your account”.

- Quotes: concurrent `status: sent` and `status: viewed` requests, each limit 1;
  sum exact response totals. One reviewable quote opens its detail, otherwise
  the quote list. Viewed still means awaiting a response.
- Invoices: fetch every sent page (limit 100), deduplicate by ID, retain positive
  balances and group by currency. Up to two currency totals are shown, with a
  further-currencies indication. A single invoice opens detail; multiple open
  the invoice list. This differs from the invoice tab's mixed-currency summary.

Each query/section has independent permission, loading, empty and failure
handling. A failed section does not require hiding successful sections.

### Quick access and tab clearance

`QuickActions.tsx` prioritizes Request a visit, then Manage bookings, followed by
Sites, Documents and Profile. Request/booking/site actions respect their UI
permissions. Documents currently opens the placeholder.

The tab bar is in normal navigator layout, not an absolute floating overlay.
`useTabBarClearance(extra)` currently **returns extra only**; the navigator
already reserves bar height and bottom inset. Dashboard requests 32 points;
other tabs generally use the default 24. Do not add the full tab height again
without revisiting the navigator layout.

Current confirmed layout/style debt is unused header/date styles, some
hardcoded values and duplicated patterns. Actual clipping or overlap on short
phones/extreme font sizes remains a device-verification question; no redesign
was performed for this document.

## 9. API integration

### API client and configuration

`src/utils/customFetch.ts` exports the Axios instance and `BASE_URL`. A public
build-time API setting is required; absence throws at module load. The client
appends the paths below to the configured base; it does not discover a server
host or automatically insert an API-version prefix. Configuration names,
deployment addresses and values are deliberately omitted here.

Most requests use the current stored Bearer credential and the session guards
described in section 5. No default timeout is configured on the general Axios
instance. Refresh/logout and push registration/cleanup have explicit timeouts.
Dashboard/notification query functions forward React Query's AbortSignal;
most screen query functions do not.

Mutation feedback generally uses Toast and the server's `msg` field. Many error
callbacks use `any`; there is no central runtime response-schema validation.
The invoice PDF request is an important direct-download exception.

### Actual endpoint inventory

Paths are relative to `BASE_URL`. `:id` denotes the route record/request ID.
Response types are the minimum fields declared/consumed by this client, not a
complete independently verified server specification.

| Method | Path | Parameters/body and expected result | Callers |
|---|---|---|---|
| POST | `/client-auth/mobile-login` | Email/password → user/client/company and credential pair | Login |
| POST | `/client-auth/refresh` | Refresh credential → rotated access/refresh pair | Axios interceptor |
| POST | `/client-auth/logout` | Refresh credential; optional `clientPushRegistration` | Auth and stale-session cleanup |
| GET | `/portal/me` | `PortalMeResponse` | Profile |
| GET | `/portal/bookings` | List uses `page`; dashboard uses `status: published`, `limit: 100`; calendar scans `page`, `limit: 100` for the visible range → `BookingsResponse` | Bookings, calendar, dashboard |
| GET | `/portal/bookings/:id` | `BookingResponse` | Booking detail |
| GET | `/portal/bookings/requests` | `BookingRequestsResponse` | Your requests panel |
| POST | `/portal/bookings/requests` | `service`, `preferredDate`, optional `preferredTime`, `notes` → `{request: PortalBookingRequest}` | Request visit |
| PATCH | `/portal/bookings/requests/:id/cancel` | No body supplied | Pending visit-request cancellation |
| POST | `/portal/bookings/:id/reschedule-request` | `requestedDate`, `requestedStartTime`, `requestedEndTime`, optional `reason` | Booking detail modal |
| POST | `/portal/bookings/:id/cancel-request` | Optional `reason` | Booking detail modal |
| GET | `/portal/bookings/:id/change-requests` | `JobChangeRequestsResponse` | Booking detail |
| PATCH | `/portal/change-requests/:id/cancel` | No body supplied | Withdraw pending change request |
| GET | `/portal/quotes` | List uses `page`; dashboard uses separate sent/viewed `status` and `limit: 1` → `QuotesResponse` | Quotes, dashboard |
| GET | `/portal/quotes/:id` | `QuoteResponse` | Quote detail |
| POST | `/portal/quotes/:id/accept` | Empty object | Owner quote approval |
| POST | `/portal/quotes/:id/decline` | Optional `declineReason` | Owner quote decline |
| GET | `/portal/invoices` | List uses `page`; dashboard uses sent `status`, `page`, `limit: 100` → `InvoicesResponse` | Invoices, dashboard |
| GET | `/portal/invoices/:id` | `InvoiceResponse` | Invoice detail |
| GET | `/portal/invoices/:id/pdf` | PDF via legacy `downloadAsync`, captured Bearer, then share sheet | Invoice detail |
| GET | `/portal/sites` | No page parameter sent → `SitesResponse` | Sites list |
| GET | `/portal/sites/:id` | `SiteResponse` | Site detail |
| GET | `/portal/notifications` | Summary page 1/limit 1; inbox page/limit 20 → `NotificationsResponse` | Notification hooks |
| PATCH | `/portal/notifications/:id/read` | No body supplied | Read-on-inbox-row-tap |
| PATCH | `/portal/notifications/read-all` | No body supplied | Inbox mark all read |
| POST | `/portal/expo-push-token` | `{token, registrationId}` | Native device registration |
| DELETE | `/portal/expo-push-token` | Same exact binding, captured Bearer; raw Axios | Native device cleanup |

There are no document, profile-edit, password recovery, checkout, worker clock-in
or direct booking-edit API calls in the inspected application sources.

### Query keys and invalidation

| Area | Keys |
|---|---|
| Dashboard | `["portal-bookings","dashboard",userId,"candidates"]`; `["portal-quotes","dashboard",userId]`; `["portal-invoices","dashboard",userId]` |
| Notification summary/inbox | `["portal-notifications",userId,"summary"]`; `["portal-notifications",userId,"inbox"]` |
| Main lists | `["portal-bookings"]`, `["portal-quotes"]`, `["portal-invoices"]`, `["portal-sites"]` |
| Requests/profile | `["portal-booking-requests"]`, `["portal-me"]` |
| Details | `["portal-booking",id]`, `["portal-quote",id]`, `["portal-invoice",id]`, `["portal-site",id]` |
| Booking changes | `["portal-booking-change-requests",bookingId]` |

Many keys are not individually user-scoped. Isolation relies on auth's immediate
global query/mutation clear and session-version response guards; do not remove
those safeguards assuming every query already includes user ID.

Quote responses invalidate singular detail plus the quote prefix, including
dashboard data. Visit-request create/cancel invalidates request lists. Booking
change actions invalidate the change-request list. Notification read mutations
invalidate that user's notification prefix. Newest-notification changes, app
resume and push receipt invalidate notification/booking prefixes (see section
11); they do not currently invalidate quote/invoice prefixes.

## 10. Data models and TypeScript types

`src/utils/types.ts` states that its types mirror the backend's client-safe
portal serializers. They are **not raw database models** and TypeScript does not
validate live JSON at runtime.

| Type | Important fields and meaning |
|---|---|
| `ClientUser` | `_id`, `email`, `fullname`, literal client `role`, optional `clientRole`, `isActive`, optional `phone`, optional/null `profilePhoto.url` |
| `PortalClient` | `_id`, `name` |
| `PortalCompany` | `name`, nullable `logo`; **no timezone field** |
| `PortalBooking` | `_id`, `title`, `description`, `date`, separate `startTime`/`endTime`, `minutes`, `location`, optional address/coordinates, status/priority, nullable site/invoice IDs, site snapshot, charge and billing fields |
| `PortalQuote` | Quote number/status/title, items, client/site snapshots, subtotal/tax/total/currency, validity/notes/terms and sent/viewed/accepted/declined metadata |
| `PortalInvoice` | Invoice number/currency, client snapshot/jobs, issue/due dates, service period/PO number, line items, subtotal/VAT/total/paid/balance fields, overdue/display status and payment metadata |
| `PortalSite` | `_id`, `name`, structured/formatted address, coordinates, contact name/phone/email, general/access/parking instructions and status |
| `PortalBookingRequest` | Service, preferred date/time, notes, status, review notes, nullable `convertedJob`, `createdAt` |
| `PortalJobChangeRequest` | Nullable job ID, reschedule/cancel type, requested/original schedule, reason/status/review notes/created time |
| `PortalNotification` | In `utils/notifications.ts`: `_id`, `type`, `title`, `body`, nullable `link`, `isRead`, `createdAt` |
| `PushRegistration` | In `utils/pushRegistration.ts`: token plus per-session `registrationId` ownership metadata; actual values must not be documented |

Status unions:

- Bookings: `draft`, `published`, `completed`, `cancelled`.
- Quotes: `sent`, `viewed`, `accepted`, `declined`, `expired`.
- Invoice stored status: `sent`, `paid`, `cancelled`; display status additionally
  permits `draft` and `overdue`.
- Visit/change request status: `pending`, `approved`, `declined`, `cancelled`.
- Site status: `active`, `inactive`.

`QuoteItem` uses description/quantity/unitPrice/amount. `InvoiceLineItem` carries
description, hourly/fixed/adjustment type, nullable job, optional date/time/location
information, quantity/rate/amount and optional minutes.

Entity list envelopes (`BookingsResponse`, `QuotesResponse`, `InvoicesResponse`,
`SitesResponse`) use their named array plus `success`, `total`, `totalPages`,
`currentPage`. Detail wrappers expose `booking`, `quote`, `invoice`, or `site`.
Request lists declare only `requests`. Notifications instead use **`page`**, not
`currentPage`, plus notifications/total/totalPages/unreadCount. `PortalMeResponse`
contains success/user/client/company. The generic parameter on
`PaginatedResponse<T>` is currently unused and triggers a lint warning.

No `Document` entity, timezone-aware scheduled instant, or worker attendance
model is declared by this client.

## 11. State management

| State | Owner | Persistence/lifecycle |
|---|---|---|
| Authenticated identity and navigation marker | AuthContext | User/access credential restored from native SecureStore or web sessionStorage; context also holds login-time client/company |
| Server entities and mutations | Singleton QueryClient | In-memory; no query-cache persistence plugin is configured; cleared on account transitions |
| Filters, form inputs, selected dates, modal visibility, busy flags | Screen/component React state | Local to component lifecycle |
| Dashboard clock | Home screen | Updated on focus and every minute while focused |
| Native push device binding | clientPush + pushRegistration | In-memory generation map, separately persisted SecureStore binding; serialized native/network work |
| Notification onboarding completion | notificationOnboarding utility | Installation-wide SecureStore flag, retained after sign-out |

`src/lib/queryClient.ts` globally sets query `retry: 1`. Other global stale-time,
garbage-collection and mutation-retry options are not customized; do not assume
special offline persistence, a background sync queue, or durable server cache.

Notification summary/inbox queries explicitly use 15-second stale time,
30-second foreground polling, and no background polling. AppState controls
their enabled/polling state. Summary tracks the newest notification ID; a change
invalidates booking lists/details/request/change-request prefixes and inbox.

`NotificationRuntime` also invalidates these prefixes on app resume and push
receipt: `portal-notifications`, `portal-bookings`, `portal-booking-requests`,
`portal-booking`, `portal-booking-change-requests`. There is no socket/SSE client
in the inspected source. Dashboard has its own focus/pull refresh behavior;
there is no app-wide TanStack focus/online-manager bridge configured here.

### Push and inbox state flow

1. Authenticated Runtime mounts native/AppState listeners and attempts silent
   registration only if permission is already granted.
2. `clientPush.ts` dynamically imports native notification code only on installed
   iOS/Android, skipping Expo Go/web. Unsupported platforms, Expo Go, or missing
   push-project metadata yield `unavailable`; other native/credential setup
   failures can reject instead.
3. Explicit Enable actions can request OS permission. Android creates channel
   `default` first, named “Booking updates”, with high importance and configured
   vibration/light settings. iOS provisional/ephemeral grants count as enabled.
4. Registration sends the device token and ownership ID to the portal endpoint.
   The saved binding also records user ID. Ownership IDs use time/random
   components; they identify a binding and are not authentication credentials.
5. Session versions and an additional epoch invalidate obsolete native work.
   Registration, stale cleanup and the next account's registration are queued.
6. Logout starts `prepareClientPushLogout` before clearing auth. It attempts raw
   exact-owner deletion using captured authorization, removes saved/native
   notification state, and supplies the binding for refresh-session revocation.

Runtime reads push `data.userId` and `data.url`. Foreground display
and navigation require the recipient ID to match the current user and the
session to remain active. It handles initial/cold-start responses, deduplicates
taps, clears the last response, removes listeners on disposal, and installs a
reject-all foreground handler when disposed.

`resolveNotificationDestination` currently accepts only `/bookings` (optionally
with query text) and `/bookings/<24-hex-ID>`, requiring `booking:read`. A booking
detail link maps to `/booking/[id]`; other links, staff routes and external URLs
are ignored. System-push taps navigate/refetch but do not mark the inbox item
read. Only inbox-row taps and mark-all call the read endpoints.

`docs/notifications.md` describes expected server producers and 30-day history
retention. That is integration documentation, not proof that the deployed
backend/indexes or phone delivery are configured. The in-app unread bell is
implemented; OS app-icon badge synchronization is not.

## 12. Styling and design system

### Source of truth

`src/utils/theme.ts` exports colors, spacing, radius and shadow helpers. The
root navigation theme maps these to canvas/card/text/border/notification colors.
App configuration requests a light interface; no active user-selectable dark
theme or custom font loading was found.

| Token group | Current values |
|---|---|
| Brand | primary `#173F35`, primaryDark `#102F28`, primarySoft `#E9F0E9` |
| Text | ink `#182D26`, inkSoft `#43564B`, muted `#68756D`, subtle `#819087` |
| Surfaces | canvas `#F6F5F0`, surface `#FFFFFF`, surfaceAlt `#F0F2EB`, border `#E3E7DF`, divider `#EDF0E9` |
| Semantics | danger `#DC2626`, warning `#936126`, info `#2563EB`, success `#237457`, plus soft backgrounds |
| Spacing | xs 4, sm 8, md 12, lg 16, xl 20, xxl 24, xxxl 32 |
| Radius | sm 12, md 16, lg 22, xl 28, pill 999 |
| Shadow | sm/md/lg; Android elevation 2/6/10, other platforms use shadow color/opacity/radius/offset |

Typography is defined within component StyleSheets using platform system
fonts. Examples: Home name 21/27 size/line-height, dashboard section headings
18/24, notification title 30/38. There is no shared typography-token or text
component system. Weights and spacing vary between screens. Spacing is a
four-point-increment scale, not a strictly enforced eight-point grid.

### NativeWind and StyleSheet boundary

- Root `global.css` contains only Tailwind base/components/utilities directives.
- Metro wraps Expo's default config with NativeWind and that CSS entry.
- Babel uses Expo preset with NativeWind JSX source and `nativewind/babel`.
- Tailwind scans `src/**/*.{js,jsx,ts,tsx}`, uses the NativeWind preset and
  class-based dark mode, with no custom theme extension/plugins.
- No current `className=` use was found in application source; actual screen
  styling uses StyleSheet and inline computed styles.

**Preserve `StyledPressable`.** Its source and regression test document a
NativeWind 4 native-interop problem with function-valued Pressable styles. The
wrapper explicitly sets `cssInterop={false}`, forwards native props, and omits
`className`/`cssInterop` from its public prop type. Callback styles and pressed
render-prop children rely on this boundary. Replacing it with an ordinary
Pressable or attaching Tailwind classes can reintroduce lost layout/background/
pressed styles and unreadable text contrast; inspect and test rather than
adding CSS workarounds.

`interactiveStyles.ts` supplies opacity 0.78 and scale 0.99 for pressed state.
Some dashboard components instead use their own pressed-opacity child Views.
`cardShadow.ts` is a compatibility re-export of `shadow.md`; its comment directs
new code to import the shared theme.

### Safe areas and tabs

Screens generally use `react-native-safe-area-context` SafeAreaView. Many stack
details include only top safe area and fixed bottom scroll padding; Notifications
includes top/bottom/left/right. Tab styling is a normal white bar with a thin top
border, no floating position, and a soft-green active icon pill.

Tab height is `64 + max(0, fontScale - 1) * 16 + bottomInset`, with bottom padding
equal to that inset. Labels sit below icons; icons are Lucide rather than the
old PNG tab assets. `useTabBarClearance` adds ordinary content breathing room,
not another full bar inset.

Confirmed inconsistencies: hardcoded semantic palettes in StatusBadge,
screen-specific radii/colors/gaps outside theme tokens, repeated card/header/form
styles, multiple pressed-state patterns and unused dashboard styles. Native
splash/adaptive backgrounds remain navy `#1E3A5F`, whereas the active UI is green.
These observations do not establish a currently reproduced layout-overlap bug.

## 13. Shared components

| Component | Responsibility and caveats |
|---|---|
| `Avatar.tsx` | Circular RN Image when photo URL exists; otherwise initials from first two name words or “C”; tone/size options; initials scaling capped at 1.2. No on-image-error fallback. |
| `StatusBadge.tsx` | Booking/request/quote/invoice labels and semantic palettes; draft → Pending confirmation, published → Confirmed, pending → Pending review, overdue → Sent · overdue; neutral unknown-status fallback. |
| `StyledPressable.tsx` | Native callback-style/accessibility/event/ref forwarding with NativeWind opt-out. See section 12. |
| `interactiveStyles.ts` | Shared pressed opacity/scale helper. |
| `DateTimePicker.tsx` | Shared date/time fields and picker sheet content; staged calendar/hour/minute choices with explicit Cancel/Confirm; caller owns the single native Modal. |
| `bookings/BookingCalendarView.tsx` | Calendar query, monthly/day agendas, counts, cached/error/empty states, UK Today clock, detail navigation and month chooser. |
| `bookings/BookingMonthCalendar.tsx` | Accessible Monday-first month grid, booking dots, month arrows/title chooser, Today, loading/unavailable states and 44-point day targets. |
| `bookings/BookingMonthChooser.tsx` | Bounded scrolling month/year Modal, safe-area footer and current-month shortcut; draft year browsing does not change the calendar until selection. |
| `SearchAndFilters.tsx` | Controlled search text, clear action and horizontal filter chips; no API request, debounce or search engine of its own. |
| `QueryStates.tsx` | Static LoadingSkeleton, full RetryState, cached/inline RetryNotice, LoadMoreButton including loading/error states. |
| `dashboard/DashboardPrimitives.tsx` | SectionHeading with optional action; responsive QueryNotice with busy-aware retry. |
| `dashboard/BookingCard.tsx` | Featured booking, itinerary, selection presentation, initial/empty/error/cached states and navigation. |
| `dashboard/AccountOverview.tsx` | Quote count, per-currency outstanding balances, permission-sensitive navigation and query states. |
| `dashboard/QuickActions.tsx` | Visit request, Manage bookings and utility navigation; responsive rows and permission gates. |
| `NotificationBell.tsx` | 48×48 target, accessible unread count, visual badge capped at 99+, opens Notifications. |
| `NotificationRuntime.tsx` | Nonvisual native/AppState listener and registration lifecycle; recipient/session checks, refetching and push-tap navigation. |

Date/time fields are shared between request and reschedule forms. Other form
controls remain in their route files; there is no generic shared screen-header
component for all stack pages.

## 14. Hooks and utilities

| File | Purpose |
|---|---|
| `hooks/useDashboardData.ts` | Permission-enabled queries, published booking page scan, exact quote totals, all-page outstanding invoices; preserves shared invalidation prefixes. |
| `hooks/useBookingCalendar.ts` | Account/month query keys, booking-read permission, 30-second stale time, complete visible-range fetches and normal React Query refresh behavior. |
| `utils/bookingCalendar.ts` / `fetchBookingCalendar.ts` | Timezone-safe calendar keys, UK Today, canonical-year bounds, grouping/sorting and cancellable paginated history loading. |
| `hooks/useNotifications.ts` | App-active polling, summary/infinite inbox, read mutations/Toast errors, booking-prefix invalidation. |
| `hooks/useTabBarClearance.ts` | Returns requested scroll padding, default 24; intentionally does not measure/add navigator height. |
| `utils/clientPermissions.ts` | UI role/action matrix and `canClient`; no server authorization. |
| `utils/customFetch.ts` | API configuration, Bearer requests, per-session guards, one-flight refresh and raw revocation. |
| `utils/auth.ts` / `auth.web.ts` | Platform persistence adapters for the shared queued session factory. |
| `utils/sessionStorage.ts` | Session generation, active state, serialized writes, guarded reads, cleanup errors and atomic-to-readers credential-pair persistence. |
| `utils/authEvents.ts` | Installs/notifies a single unauthorized handler across Axios and React context. |
| `utils/clientPush.ts` | Native capability/permission checks, dynamic loading, registration queue, device binding persistence, exact-owner logout cleanup. |
| `utils/pushRegistration.ts` | In-memory ownership identifiers/snapshots by session version; returns copies rather than mutable stored objects. |
| `utils/notificationOnboarding.ts` | Reads/writes the installation completion flag; storage failures are caught. |
| `utils/notifications.ts` | Notification types and strictly allowlisted permission-sensitive booking destinations. |
| `utils/dashboard.ts` | `bookingStart`, `bookingEnd`, `selectNextBooking`, `groupOutstandingByCurrency`. |
| `utils/format.ts` | `formatDate(iso, pattern)` through Day.js; `money(amount,currency)` uses GBP/USD/EUR symbols or a code prefix, two decimals, no locale grouping. |
| `utils/dateTimePicker.ts` | Monday-first calendar grids using local noon, calendar-day comparisons/keys, and strict `HH:mm` parsing/formatting; time values are never coerced through a Date. |
| `utils/theme.ts` / `cardShadow.ts` | Design tokens/platform shadow construction and compatibility alias. |

There is no central runtime validation library/schema layer in the app. Type
interfaces describe expected data, local forms perform limited validation, and
the API is expected to reject invalid/unauthorized operations.

## 15. Error, loading and empty states

| Area | Current handling |
|---|---|
| Global queries | One query retry configured; no global error screen or persisted offline query cache |
| Dashboard | Separate initial skeletons/retry states, empty booking action, and cached-data warnings per section |
| Bookings/quotes/invoices | Initial skeleton, initial RetryState, cached RetryNotice, pull refresh, pagination retry/loading, empty and local-search-no-match states |
| Booking/quote/invoice detail | Skeleton; unavailable/error retry when no record; cached-data warning after a failed refresh |
| Notifications | Initial, empty, cached-error, paging and retry states; mutations show Toast; opening a row does not wait for mark-read |
| Profile | Context identity shown immediately; client/provider placeholders while query loads; refresh failure notice and retry |
| Sites list | Spinner, generic error text or empty list; no retry control/pull refresh |
| Site detail | Spinner, then returns null without site data, including failure/missing record; effectively blank |
| Forms | Local busy flags, server-message Toasts and confirmation Alerts; validation/error typing varies |
| Unauthorized | Interceptor refresh/unauthorized event → Toast + immediate local logout; protected navigator reacts |
| Missing fine-grained permission | Actions/tabs often hidden, but some routes still attempt API reads and depend on API rejection |
| Notification onboarding | Enable always completes in finally, but has no catch or error feedback; see confirmed debt |

Most detail error states do not expose a distinct not-found versus network-error
experience. Secondary booking change-request query failures are not surfaced,
which can incorrectly make the UI look as though no request is pending.

## 16. Android and iOS considerations

- `app.json` requests portrait orientation and light appearance. iOS tablet
  support is false. Native application identifier on both platforms is
  `com.onclockly.client`; URL scheme is `onclockly-client`.
- Dark status-bar content suits the light canvas. Splash is held until auth
  restoration finishes, then hidden by the root controller.
- Android adaptive foreground/background/monochrome assets are configured;
  predictive back gesture is disabled. Root icon and web favicon use images
  under `assets/images`. Splash references an image with width 76.
- iOS includes the non-exempt-encryption declaration. EAS project linkage exists;
  project/account identifiers are intentionally not reproduced.
- Config plugins include Router, SplashScreen, SecureStore, Notifications,
  Sharing, community DateTimePicker, Image and WebBrowser. Notifications use
  the green color and `default` channel.
- `app.config.ts` extends static config and conditionally supplies Android's
  Firebase services-file path from build configuration. Actual FCM/APNs
  credentials and live delivery cannot be inferred from source configuration.
- Native projects are generated; no checked-out `ios/` or `android/` directories
  exist. Do not manually create/edit them to solve a JS layout issue.
- Login, request-booking and reschedule use KeyboardAvoidingView and scrollable
  form content. The shared picker has bounded scrolling, a fixed action footer
  and bottom safe-area padding. Rescheduling switches content inside its one
  Modal rather than presenting a nested picker Modal. Other forms still need
  independent keyboard/short-screen review.
- Picker dates are submitted as local calendar `YYYY-MM-DD` keys. Time values
  remain wall-clock `HH:mm` strings, including all minutes and overnight ranges;
  optional Any time omits `preferredTime`. No timezone conversion, business-hour
  restrictions or availability claims are introduced by the picker.
- Font scaling is considered in tabs/dashboard and some cards, but not all
  forms. Onboarding is a non-scrolling full-height layout; test short phones
  and large accessibility fonts.
- Remote push is skipped by app code in Expo Go/web. Installed native builds,
  permissions and platform delivery configuration are required for phone alerts.
  The in-app API inbox does not require native push support.
- The web target uses Metro/server output and has a dedicated auth adapter.
  Native file sharing/download and storage paths still need independent web
  compatibility verification; do not equate web configuration with full parity.

### Builds and automation

`eas.json` configures remote native version sourcing; development client/internal
distribution with Android APK; preview/internal with Android APK and an iOS
simulator build; production native-version auto-increment. Android submission
settings select an alpha track. These are configuration facts, not evidence
that any build was submitted or released.

`.eas/workflows/create-production-builds.yml` defines Android and iOS build jobs
without explicit profile overrides. `.github/workflows/build-android-apk.yml`
is a manually dispatched, separate Android APK pipeline: Ubuntu, Node 20,
Temurin Java 17, `npm ci`, Android `expo prebuild --no-install`,
`./gradlew assembleRelease --no-daemon`, then upload of the release APK as a
GitHub artifact. This generates native files on the CI runner; it is distinct
from the EAS build workflow and does not itself prove store publication or
production signing readiness. Inspect it before changing release behavior;
do not print its credential configuration.

## 17. Branding and ecosystem

- **OnClockly:** master ecosystem brand.
- **OnClockly Connect:** this client-facing app and the configured display name.
- **Worker-facing OnClockly:** a separate product; no worker clock-in,
  assignment-acceptance, timesheet or staff-scheduling UI exists in this checkout.

Source comments identify `time_sheet_server/src/utils/portalSerializers.ts` as
the model-contract source and `client_portal_onclockly` permission/status files
as browser-portal mirrors. Login comments compare the client mobile endpoint
with a worker mobile endpoint. These support a wider backend/portal ecosystem,
not a direct app-to-app integration or shared runtime module.

Sibling directories `../time_sheet_server`, `../client_portal_onclockly` and
`../work.wk` exist in the surrounding workspace. Their existence alone does not
identify which repository contains the worker **mobile** app; do not label
`work.wk` that way without inspecting it. They are separate repositories, not
subdirectories bundled by this app.

Conceptually clients request/view service work while a worker-facing product
serves the delivery workforce. Worker behavior, backend approval mechanics and
cross-product synchronization guarantees are not established by this client's
source audit.

Current branding inconsistencies: Login still renders “OnClockly”; native
splash/adaptive backgrounds are navy, while the app theme is green. Additional
Expo/React starter assets remain. Image contents were not visually audited, so
filenames alone are not proof of the actual installed icon's appearance.

## 18. Current known issues / technical debt

### Confirmed issues and implementation gaps

“Confirmed” means visible in code; it does not claim a production incident or
an exploited security issue. No fixes were made as part of this documentation.

| Issue | Evidence / practical implication |
|---|---|
| Mixed-currency invoice-tab total | `(tabs)/invoices.tsx` sums positive sent balances and formats with the first invoice's currency. It can misstate mixed-currency accounts. Dashboard correctly groups currencies. |
| PDF bypasses normal auth/session protection | `invoice/[id].tsx` uses legacy download with a captured Bearer, outside Axios refresh/generation guards; it does not validate download HTTP status/content before sharing. |
| PDF cache is not account-scoped/cleared on logout | Filename derives from invoice number; auth cleanup clears session/query state, not these cached files. Same-number collisions/post-logout behavior require runtime verification. |
| Stored identity is not refreshed from `/portal/me` | Profile renders context identity while its query supplies other account data. Context roles/contact/greeting can lag server changes; API enforcement remains necessary. |
| Login-time client/company context is not restored | Only user and credentials persist. Context client/company remain null after restart; Profile separately fetches them. |
| Onboarding failure is unhandled | `notification-onboarding.tsx` invokes `void enable()` with try/finally but no catch. It completes onboarding even if permission/registration rejects, with no failure/retry message. |
| Non-booking notifications cannot navigate | Onboarding advertises quote/invoice updates, but the destination resolver supports only booking links. Runtime also invalidates booking/notif caches rather than quote/invoice caches. |
| Push tap does not mark the inbox entry read | Runtime handles navigation/refetch only; no read mutation is made for the system-tap path. |
| Permission status is not delivery readiness | `getClientPushStatus` measures OS permission; Runtime suppresses registration failures. “Phone alerts allowed” does not establish server registration or successful delivery. |
| Sites list lacks retry/pull refresh | `site/[id].tsx` now shows a RetryState on failure/missing record; the Sites list itself still has no retry or pull-to-refresh. |
| Secondary booking-request errors are hidden | Booking detail does not surface change-request query loading/error; failure looks like no pending request until server rejects conflicting actions. |
| Incomplete UI permission gates | Linked invoice action lacks invoice-read gating; pending-change Withdraw lacks update/cancel gating. Many direct stack routes do not preempt unauthorized API reads. |
| Local list counts/search are partial | List filters operate on loaded pages; quote review count and invoice summaries differ from exact/all-page dashboard calculations. |
| Date/time interpretations differ | Dashboard reconstructs service wall times in phone timezone. Booking list/eligibility use calendar-day checks. Types expose no service timezone or UTC scheduled instants. |
| Documents is unfinished | `documents.tsx` is a "coming soon" placeholder. Its Quick Actions entry is hidden; the route still exists. Profile and Sites copy were corrected to match what is implemented. |
| Type/error duplication | `PaginatedResponse<T>` has an unused generic; multiple API errors use `any`, some snapshots use loose records, and JSON is not runtime validated. |
| Styling/form duplication | Repeated headers/cards/pickers, hardcoded palette/radius values, differing pressed-state approaches and unused Home styles. |
| Starter maintenance material remains | Stock README and reset utility coexist with production screens. Reset can move/delete application trees; it is not normal cleanup. |
| Configuration ignore coverage is narrow | `.gitignore` does not ignore every possible environment-file name. Do not infer that production configuration or credential files are safe to commit. No secret contents were inspected. |

### Possible issues requiring verification

- Invoice expiry during a direct download, same-number cache collisions,
  sharing after logout/account switch, and web PDF compatibility need runtime
  tests. The bypasses are confirmed; actual exposure/reproduction is not.
- Dashboard's descending-date assumption, complete site-list retrieval without
  pagination, server-computed quote expiry, current role enforcement and tenant
  boundaries must be verified against the backend implementation/deployment.
- Traveling phones/DST can misinterpret service times without an explicit zone.
  Confirm the service timezone/duration contract before changing date handling.
- Short phones/large fonts may clip non-scrolling onboarding and other modals;
  request/reschedule now scroll, but physical-device keyboard/safe-area review
  is still needed across forms.
- Direct-link/back behavior and a system-push tap while onboarding excludes the
  target route need installed-device tests. No explicit deferred-tap workflow is
  visible for the onboarding gate.
- Live FCM/APNs setup, cold-start delivery and notification retention/index
  health are external configuration/runtime matters, not established here.
- Installation-wide onboarding may be intentional or may need per-user scope;
  that is an unresolved product decision, not automatically a defect.

## 19. Important constraints for future work

1. Read `AGENTS.md` and the current implementation before editing. The stock
   README is not the product specification. Keep this file synchronized with
   major architecture/route/contract changes.
2. Preserve existing API paths, payloads, pagination conventions and client-safe
   fields unless explicitly asked to change them; coordinate backend changes.
3. Preserve authentication, permission logic, session-generation guards, storage
   queue ordering, and immediate query/mutation clearing on account transitions.
   Use `customFetch` for normal API calls; do not capture a context credential
   as though it were always the current rotated value.
4. Use Expo Router for navigation. Keep non-route code outside `src/app`, respect
   both auth and notification-onboarding guards, and keep permission gates plus
   server authorization intact.
5. Never replace live production data with mocks. Existing test adapters and
   ignored QA fixtures are isolated from application behavior.
6. Maintain Android/iOS compatibility, safe areas and dynamic font behavior.
   Respect normal-flow tab geometry; do not duplicate its height in scroll
   padding or introduce an absolute tab overlay without a coordinated change.
7. Reuse components/theme where appropriate. Preserve StyledPressable's
   intentional NativeWind boundary; do not fix missing native styles with
   competing CSS/StyleSheet rules.
8. Read the Expo major version from `package.json` before touching Expo/React
   Native/EAS APIs. Per AGENTS, consult matching versioned documentation and
   the Expo documentation index; do not rely on remembered APIs.
9. Use `npx expo install` for dependency additions/compatibility work. This is an
   npm-lockfile project, not currently a Bun project. Do not hand-edit generated
   native directories; use Expo config/plugins.
10. Keep credentials/private configuration out of source, logs and handoffs.
    Build configuration/project linkage does not prove native push credentials
    or deployment health. Do not send real pushes or mutate live records as an
    automated unit-test step.
11. Do not infer worker-app or backend behavior from this client. Verify the
    corresponding repository before changing cross-product contracts.
12. Run TypeScript/lint after meaningful changes and the focused regression
    scripts when auth, notification registration or pressed styles change.

### Current commands and checks

```sh
npm ci
npm start
npm run android
npm run ios
npm run web
npm run lint
npx tsc --noEmit
npm run test:session
npm run test:notifications
npm run test:styles
npm run test:date-time
npm run test:booking-calendar
```

`npm run android`/`ios` start Expo with a platform flag; they are not cloud
release builds. `npm run start:clean` clears Metro and explicitly selects Expo
Go, so use an installed development/production build for remote-push testing.
For cloud builds/submission use the repository profiles and
`npx eas-cli@latest ...` as directed by AGENTS. Do not invoke deployment or the
starter `reset-project` command merely to investigate a UI problem.

Regression scripts compile production TS and replace native/database/network
boundaries with test adapters. Session tests cover queued storage and provider/
Axios/query-cache races; notification tests cover registration/permission/
account-switch/destination behavior; style tests exercise NativeWind callback
interop and native prop forwarding. They do not prove actual phone delivery or
the entire navigation/onboarding experience.

`npm run test:date-time` tests the production calendar/time helpers, including
leap years, month boundaries, same-day minimums, DST and multiple device zones.
It does not substitute for checking picker gestures and keyboard behavior on
physical Android/iOS devices.

`npm run test:booking-calendar` checks production date/grouping/query helpers,
UK/device timezone boundaries, canonical years, multi-page history completeness,
deduplication, cancellation, partial-scan errors and permission/account keys.

Validation of this documentation snapshot: TypeScript, Expo lint and the three
listed test scripts were run:

| Check | Result on 2 November 2026 |
|---|---|
| `npx tsc --noEmit` | Passed |
| `npm run lint` | Passed with zero errors; one existing unused-generic warning in `utils/types.ts` |
| `npm run test:session` | 30 tests passed |
| `npm run test:notifications` | 8 tests passed |
| `npm run test:styles` | 4 tests passed |

These are local code/test checks, not deployed-API, native-build or physical
device push-delivery verification. The table records the original documentation
snapshot; the shared date/time picker and booking navigation were added on
3 November 2026.

Picker validation on 3 November: TypeScript passed; Expo lint reported zero
errors and the existing unused-generic warning; all 12 date/time tests passed.
Offline component-boundary checks verified real request/reschedule payloads,
Cancel/Confirm, Any time, overnight times and single-Modal back handling in four
timezones. React Native Web previews covered 320–430px widths and up to 2.5× text;
physical-device gestures, keyboard and screen-reader behavior remain unverified.

Calendar validation on 4 November: TypeScript passed; Expo lint reported zero
errors and the same existing generic warning; all 18 booking-calendar and 12
date/time tests passed. Offline interaction checks in UTC and Los Angeles
verified month/day persistence, UK Today, chooser dismissal, detail routes,
permissions and query states. Layout previews covered narrow/large phones,
large text, loading, empty/error/cached results and the month chooser. These
checks use test adapters; physical Android/iOS gestures remain unverified.

## 20. Open questions

The following answers could not be established confidently from this checkout:

- Which repository is the separate worker **mobile** application, and what
  contracts/modules, if any, are formally shared with Connect?
- Which deployed backend version serves each build, and are tenant/permission,
  request-review, pagination/order and expiry guarantees aligned with these
  client assumptions?
- What is the authoritative service timezone and DST/duration policy? Should
  portal bookings expose timezone plus server-derived UTC start/end instants?
- Are all accounts single-currency, or must every financial summary support
  multiple currencies and locale formatting?
- Are FCM/APNs credentials fully configured and verified on actual installed
  builds? What retention/index/dead-device cleanup behavior is deployed?
- Should onboarding completion be per installation or per account? Should a
  failed registration complete onboarding, and when should skipped users be
  prompted again?
- Should quote/invoice notifications navigate to their corresponding details,
  refresh their caches, mark read on system tap, and update OS app badges?
- What are the intended implementations/timelines for Documents, password
  recovery, profile editing and the site-history copy?
- Should current-user/role data be refreshed centrally from `/portal/me`, and
  should client/company state be restored/persisted or remain query-owned?
- What are the intended PDF cache lifetime, account-isolation, download-status
  validation and expired-session behaviors?
- What installed-device/accessibility/web test matrix and release ownership
  process should future changes follow?

Until verified, do not turn these questions into asserted features or backend
guarantees. Update this handoff when a decision is implemented and confirmed.
