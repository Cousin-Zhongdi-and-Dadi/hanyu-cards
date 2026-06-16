# HanYu Cards Release Checklist

## Android

- Build with Node 20+ and `npm run build`.
- Run `npx cap sync android` after each web build.
- Use Android Studio with Android SDK API 35 or newer.
- Verify the generated app targets Android 15/API 35+ before Play submission.
- Build a signed Android App Bundle (`.aab`) with the publisher keystore.
- To sign locally, set `HANYU_UPLOAD_STORE_FILE`, `HANYU_UPLOAD_STORE_PASSWORD`, `HANYU_UPLOAD_KEY_ALIAS`, and `HANYU_UPLOAD_KEY_PASSWORD`, then run `cd android && ./gradlew bundleRelease`.
- Confirm native dependencies support 16 KB page sizes for Android 15+ devices.

## iOS

- Build on macOS with Xcode 26+ and the iOS 26 SDK.
- Run `npx cap sync ios`, open `ios/App/App.xcworkspace`, and archive.
- Set the production bundle identifier and signing team.
- Test with TestFlight on current iPhone and iPad devices.

## Store Metadata

- App name: HanYu Cards.
- Subtitle: HSK Mandarin flashcards with an AI tutor.
- Category: Education.
- Privacy policy URL: host `public/privacy.html` on the publisher domain.
- Data disclosure: local learning progress; optional AI tutor messages and vocabulary context.
- No ads, no tracking, no account required in the default release.

## Pre-Submission QA

- Offline launch and offline study work without the assistant API.
- AI tutor shows a clear fallback when the backend is unreachable.
- Font scaling, small screens, dark system UI overlays, and safe areas do not obscure controls.
- Reset progress removes local study history.
- Third-party notices are included in the app website or support bundle.
