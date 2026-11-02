# Client booking notifications

The Home bell opens the authenticated user's notification inbox. Opening an
update marks that item read and opens the related booking. The inbox also
supports mark-all-read, pagination, refresh, and saved/error/empty states.
History follows the server's existing 30-day notification retention.

Booking request approvals and declines notify the requester. Published booking
time changes and cancellations notify active members of that client account
with booking read permission; billing-only users receive no booking details.
Draft/template approval confirms the request without exposing an unpublished
booking. Existing quote/invoice notification producers are preserved.

The foreground inbox refreshes every 30 seconds and on app resume. Push receipt
refreshes booking data immediately. Device permissions are requested only after
tapping **Enable phone alerts** inside Notifications. Denying push permission
does not affect the in-app inbox. Sign-out invalidates native registration work
immediately and attempts to retire the exact device/login binding on the server.
Remote cleanup requires a network connection.

## Installed app setup

The EAS project is already linked in app.json. The expo-notifications plugin is
configured. Remote push requires an installed build; use Expo Go for the inbox.

For Android, register the package `com.onclockly.client` in Firebase. Supply the
downloaded `google-services.json` as an EAS **file** environment variable named
`GOOGLE_SERVICES_JSON` in the environment used by your build. app.config.ts maps
that path to android.googleServicesFile. Separately upload the Firebase FCM V1
service-account credential to this project's Android push credentials in EAS.
Do not put service-account private keys in EXPO_PUBLIC variables or app config.

For iOS, configure APNs push credentials for `com.onclockly.client` in EAS. Build
and install a new signed app after configuring credentials/native plugins.

Official guides:
- https://docs.expo.dev/push-notifications/push-notifications-setup/
- https://docs.expo.dev/push-notifications/fcm-credentials/

## Verification

Use a test client account in the installed app and enable phone alerts. From an
admin test account, approve/decline a booking request, edit a published booking's
date/time, and cancel a published booking. Verify the unread bell, inbox copy,
read state, and booking destination. Repeat a phone alert with the app closed,
and verify another client's account receives nothing. Production push delivery
has not been exercised by the automated tests.

Automated checks use only in-memory native/database/HTTP adapters:
`npm run test:notifications`, `npm run test:session`, and the server's `npm test`.

## Changed files

Mobile project:

```text
app.json
app.config.ts
package.json
src/app/(tabs)/index.tsx
src/app/_layout.tsx
src/app/notifications.tsx
src/components/NotificationBell.tsx
src/components/NotificationRuntime.tsx
src/hooks/useNotifications.ts
src/utils/notifications.ts
src/utils/clientPush.ts
src/utils/pushRegistration.ts
src/utils/customFetch.ts
src/context/AuthContext.tsx
scripts/test-notifications.cjs
scripts/test-session-cleanup.cjs
docs/notifications.md
```

Server project (`../time_sheet_server`):

```text
src/controllers/notificationController.ts
src/controllers/portalPushController.ts
src/controllers/bookingRequestController.ts
src/controllers/jobChangeRequestController.ts
src/controllers/jobController.ts
src/controllers/authControler.ts
src/routes/portalRouter.ts
src/models/userModel.ts
src/utils/notifyClientBooking.ts
src/utils/expoPush.ts
tests/booking-notifications.test.cjs
package.json
```

Temporary layout previews, build logs, staging copies and export artifacts are
under the ignored `.expo/` directory. The server build regenerates `dist/`.
No edits were made to `.env.production` or its token values.
