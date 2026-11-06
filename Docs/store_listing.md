# Store listing and submission

What Google Play and the App Store ask for, with QuillFin's answers. Account
setup (Clerk, Convex, Stripe) is in `setup_guide.md`.

## Before you start

- **D-U-N-S number** for Save Point Limited (free from Dun & Bradstreet; takes
  a few days). Both stores need it for an organisation account, and an
  organisation Play account skips the 12-tester closed test that new
  personal accounts must run.
- **Google Play Console** (one-off US$25) and **Apple Developer Program**
  (US$99 a year), both as Save Point Limited.
- **Production Clerk, Convex and Stripe** set up and `config/prod.json`
  filled in (`setup_guide.md` §6 and Production). Store builds without it
  only offer "Continue on this device".

## Links

| Asked for | Use |
|---|---|
| Privacy policy | https://savepoint.co.nz/legal/quillfin#privacy |
| Terms of use (Apple: custom EULA field, optional) | https://savepoint.co.nz/legal/quillfin#terms |
| Delete account URL (Play, Data safety) | https://savepoint.co.nz/legal/quillfin#delete-account |
| Support URL / email | https://savepoint.co.nz/contact, support@savepoint.co.nz |
| Marketing URL / website | https://savepoint.co.nz/apps#quillfin |

## Listing

- **Name**: QuillFin
- **Subtitle** (Apple, max 30): Notes that quiz you back
- **Short description** (Play, max 80): Notes, AI quizzes and practice problems, scheduled so you never forget.
- **Category**: Education
- **Keywords** (Apple, max 100): notes,flashcards,spaced repetition,quiz,study,revision,exam,FSRS,AI,practice problems
  (no other apps' names: Apple rejects trademarks in keywords)
- **Full description**:

  > QuillFin turns your notes into quizzes and brings each question back right before you'd forget it.
  >
  > • Notes in folders. Type them, or import .txt, .md, .pdf, .docx and .pptx files.
  > • AI quiz questions written from your own notes, short answer or multiple choice.
  > • FSRS spaced repetition, the modern scheduling algorithm used by leading flashcard apps, for every question and practice problem.
  > • A problem tracker for coding and maths practice: difficulty, tags, timed attempts and a re-solve schedule.
  > • Today dashboard and an optional daily study reminder.
  > • Works offline. Sign in to sync between your phone, tablet, computer and the web, or keep everything on this device with no account at all.
  > • Bring your own OpenAI-compatible or Anthropic key for unlimited generation, or use QuillFin's AI within your plan.
  > • Light and dark themes, built for phones, tablets and desktops.
  >
  > Made in New Zealand by Save Point.

- **Graphics** (`node tool/build_icons.mjs` makes them from the brand SVG):
  - Play icon 512×512: `store/play-icon-512.png`
  - Play feature graphic 1024×500: `store/play-feature-graphic.png`
  - The app icons themselves are generated into each platform folder.
- **Screenshots** (take them from a real build with sample notes):
  - Play: at least 2 phone shots; 7-inch and 10-inch tablet shots to be
    listed for tablets.
  - Apple: 6.9-inch iPhone (1320×2868), and 13-inch iPad (2064×2752) because
    the app runs on iPad.

## Audience and ratings

- **Target age**: 13 and over (Play: tick 13–15, 16–17 and 18+ only). This
  keeps QuillFin out of Play's Families programme and matches the terms.
- **Content rating** (Play IARC, Apple age rating): an education/reference
  app with no violence, sexual content, gambling, drugs or profanity, and no
  chat or sharing between users (notes are private). No in-app purchases in
  the store builds (see Billing). Answer yes to anything asking whether the
  app generates content with AI.
- **Ads**: none.

## Play Data safety

Collection is **optional** (the app works without an account). Everything
is **encrypted in transit**, and users can **request deletion** (in the app,
and at the delete account URL above). No data is **shared**: Clerk, Convex,
Stripe and Anthropic process it on Save Point's behalf, and sending notes to
your own AI provider is something the user asks for.

| Data type | Collected | Purpose |
|---|---|---|
| Personal info: Name, Email address | Yes | Account management, App functionality |
| App activity: Other user-generated content (notes, questions, problems) | Yes | App functionality |
| App activity: Other actions (review and attempt history) | Yes | App functionality |
| Financial info: Purchase history (plan status) | Yes | App functionality |
| Location, contacts, photos, device IDs, crash logs, analytics | No | |

## Apple App Privacy

Tracking: **No**. Data linked to the user, all for **App Functionality**
only: Contact Info (name, email address), User Content (other user content),
Identifiers (user ID), Purchases (purchase history).

`ios/Runner/Info.plist` sets `ITSAppUsesNonExemptEncryption` to false (HTTPS
only), so uploads skip the export compliance question.

## Billing

Store builds (iOS and Android) show the plan but never offer to buy or
manage it, and don't point to the website for it (`PlanPanel`, `storeBuild`).
Pro is bought on the web or desktop app through Stripe.

- **Google Play** allows this: the app only uses a subscription bought
  elsewhere.
- **Apple** (guideline 3.1.3(b), multiplatform services) only allows a
  subscription bought elsewhere to unlock features in the app if it can
  **also be bought with In-App Purchase** in the app. Expect App Review to
  ask for IAP.

**Decided 2026-11-06:** QuillFin launches on Android, the web and desktop
first. The App Store release waits, and before it ships Pro is added as an
In-App Purchase (StoreKit, with the App Store's server notifications feeding
the `subscriptions` table the same way Stripe's webhook does).

## App Review notes

Signing in is optional: reviewers can tap **Continue on this device**. To
check sync and account deletion, give App Review a test account (a Clerk
user made for them), and say that **Account > Delete account** permanently
deletes the account.

## Signing and building

**Android.** Make the upload key once and keep it, with its passwords, in
the password manager and an offline backup. Losing it means a Play support
request to reset it.

```bash
keytool -genkey -v -keystore ~/quillfin-upload.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

Then create `android/key.properties` (git-ignored):

```properties
storePassword=...
keyPassword=...
keyAlias=upload
storeFile=/home/<you>/quillfin-upload.jks
```

Enrol in Play App Signing when creating the app (Google holds the app
signing key; this is your upload key). Build:

```bash
flutter build appbundle --release --dart-define-from-file=config/prod.json
# build/app/outputs/bundle/release/app-release.aab
```

**iOS** (on a Mac with Xcode): open `ios/Runner.xcworkspace`, choose the
Save Point team under Signing & Capabilities, then:

```bash
flutter build ipa --release --dart-define-from-file=config/prod.json
```

and upload `build/ios/ipa/*.ipa` with Transporter.

**Versions.** Every upload needs a higher build number: bump `version` in
`pubspec.yaml` (`0.1.0+1` → `0.1.0+2`, and the first number for releases
users see).

## Status (6 November 2026)

Done: account deletion in the app, the web app and the backend; terms,
privacy, cookie and account deletion pages; app icons on every platform and
the Play graphics; release signing; store builds without purchases;
`ITSAppUsesNonExemptEncryption`.

Open: the D-U-N-S number, the Play Console account, production
Clerk/Convex/Stripe, the Play upload key and screenshots. Later, for the App
Store: the Apple Developer account, Pro as an In-App Purchase, and a first
build on a Mac (no Mac has built the iOS app yet).
