# Google Play listing brief: OnClockly Client

## Your task

Write the Google Play Console store listing for the Android app described below,
plus the answers I need for Play Console's App content forms. Use **only** the
facts in this brief. Don't invent features, numbers, awards, reviews or
integrations. Where a fact is missing, leave the `[[PLACEHOLDER]]` exactly as it
is so I can fill it in.

Write in clear, friendly British English (the business is UK-based, for example
"organise", "colour"). Write for busy business clients, not developers. No
emoji. Don't use ALL CAPS, superlatives like "best" or "#1", or any claims Google's
metadata policy forbids.

## What to produce

Return these sections, in this order, as Markdown:

1. **App name** (max 30 characters). Give 3 options, with the character count
   for each. The first option must be exactly `OnClockly Client`.
2. **Short description** (max 80 characters). Give 5 options, with the
   character count for each.
3. **Full description** (max 4,000 characters). One version, with the character
   count. Structure: a 2–3 sentence opening, a "What you can do" list, a
   "Who it's for" paragraph, and a closing line saying you need an account
   from your service provider. Plain text only; Play doesn't render Markdown, so
   use "•" for bullets and line breaks between sections.
4. **Screenshot captions**: 6 short captions (max 6 words each), one per screen
   listed under "Screenshot plan".
5. **Feature graphic text**: 3 options for a headline of at most 5 words.
6. **Release notes** for version 1.0.0 (max 500 characters).
7. **Data safety answers**: fill in the table under "Data safety facts".
8. **App content answers**: copy the answers under "App content facts", tidied
   up, ready to paste.
9. **Search keywords**: 10 phrases worked naturally into the full description.
   List them so I can check. Don't keyword-stuff.

## The app

| Field | Value |
|---|---|
| App name | OnClockly Client |
| Package name | `com.onclockly.client` |
| Version | 1.0.0 (first release) |
| Platform | Android phones (an iOS version is also in App Store review) |
| Brand | OnClockly. This is its **client** app; a separate worker app exists. |
| Developer name | [[DEVELOPER NAME]] |
| Website | https://onclockly.com |
| Support email | bateemma14@gmail.com |
| Privacy policy URL | https://onclockly.com/privacy |
| Suggested category | Business |
| Price | Free. No in-app purchases, no ads, no subscriptions inside the app. |

**What it is:** a client portal for customers of service businesses (mainly
professional cleaning companies) that run their operations on OnClockly. It lets
a business's clients see and manage their bookings, quotes and invoices from
their phone, and send requests to the business, without phoning or emailing.

**How people get access:** there is no public sign-up. The service provider
invites the client, and the client signs in with the email and password they
were given. The listing must make clear that an account from your service
provider is needed.

**Who uses it:** people at client organisations, such as office managers,
facilities staff, property managers, homeowners and finance contacts. A client
account can have several members with different roles (owner, manager,
bookings, billing, viewer), and each person sees what their role allows.

## Features you may describe

These are all implemented:

- **Dashboard**: an overview of upcoming visits, items that need attention, and quick actions.
- **Bookings**: upcoming and past visits as a list or a month calendar, with
  date, time, site, and status for each.
- **Booking details**: full visit details, site address and instructions.
  Clients can **request a reschedule** or **request a cancellation** (the
  business reviews and approves it), and **leave a star rating and review** after
  a completed visit. They can also **book again** with one tap.
- **Request a visit**: ask for a service on one or several preferred dates
  (up to 10 in one request), with an optional time for each date and notes.
  Each date is reviewed by the business, which then confirms it.
- **Track requests**: each request shows its status (pending review, approved,
  declined or cancelled), progress steps, and any message from the business. A
  pending request can be cancelled.
- **Quotes**: view quotes with line items, totals and terms, and **accept or
  decline** them in the app.
- **Invoices**: see invoices and what's outstanding, view invoice details, and
  **download or share the invoice as a PDF**.
- **Sites**: the client's service addresses and site contacts.
- **Notifications**: push notifications and an in-app inbox for updates
  such as booking changes and request decisions.
- **Profile**: the account and company details the business holds. Details are
  read-only; changes go through the service provider.

## Do not claim these (not in the app)

- Paying invoices in the app or any online payment
- Creating an account or signing up without an invite
- Resetting a password in the app ("forgot password")
- Editing profile details
- Document sharing or file uploads
- Booking instantly without the business approving it; every request and
  change is reviewed by the business
- Live tracking, GPS, chat, messaging, AI features, offline mode, tablet
  layouts, dark mode
- Any specific customer count, rating, time saved or company names

## Screenshot plan

I'll take one screenshot of each of these screens:

1. Dashboard
2. Bookings calendar
3. Booking details
4. Request a visit, with several dates added
5. Quote details, with Accept and Decline
6. Invoice details, with PDF download

## Data safety facts

Use these to draft the Data safety form. Mark each data type
**Collected: Yes/No**, **Shared: Yes/No**, **Purpose**, **Optional or required**.

- **Personal info:** name, email address and phone number (phone number is
  optional). These are provided by the service provider and shown in the app
  for account management and app functionality. Required for the account.
- **App activity / user-generated content:** booking requests, notes,
  reschedule or cancel requests, quote decisions, and star ratings with written
  reviews. Purpose: app functionality. They are sent to the user's own service
  provider, who runs their account on OnClockly. Treat this as data processed
  for the provider, not shared with third parties.
- **Financial info:** invoices and quotes (amounts, line items) are **shown**
  to the user. The app does **not** collect payment card or bank details.
- **Device or other IDs:** a push notification token is collected so
  notifications can be delivered (through Expo push and Google Firebase Cloud
  Messaging). Purpose: app functionality.
- **Not collected:** location, contacts, photos or videos, audio, files,
  health, messages, browsing history, advertising ID.
- **No analytics, advertising or crash-reporting SDKs** are included.
- **Security:** data is sent over HTTPS. Sign-in credentials and session tokens
  are stored in the device's secure storage.
- **Account deletion:** users email bateemma14@gmail.com from their account
  email address asking for their account and data to be deleted. Deletion web
  page: [[DELETE ACCOUNT URL, for example https://onclockly.com/delete-account]]. Google requires a deletion method
  even though accounts are created by the service provider.

## App content facts

- **Ads:** the app contains no ads.
- **App access:** all features require sign-in. Reviewer test account:
  email `playreview@onclockly.com`, password `MqJNb3FsKCgI-2dQK`. The account has sample
  bookings, a pending request, a quote and an invoice. No 2-step verification
  is needed.
- **Target audience:** 18 and over; this is a business app. Not designed for
  children.
- **Content rating questionnaire:** no violence, sexual content, profanity,
  drugs, gambling or user-to-user chat. Users can write reviews, but only the
  service provider sees them; they aren't public. No location sharing, and no
  digital purchases.
- **News app:** no. **Government app:** no. **Financial features:** no; it
  shows invoices but doesn't handle payments, loans or trading.
- **Health:** no health features.
- **Permissions used:** notifications (optional; the app explains the benefit
  first and offers "Maybe later"), and internet access. The app requests no
  location, camera, microphone, contacts or storage permissions; PDFs are
  shared through the system share sheet.
