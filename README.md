# HanYu Cards

Offline-first Mandarin Chinese learning app for adult HSK learners. The app was rebuilt from the MIT-licensed `languages-learner/web` Vue 3 codebase and now focuses on Chinese vocabulary, smart review, and an optional AI tutor.

## Features

- HSK 1-3 vocabulary set with simplified, traditional, pinyin, English meanings, radicals, tags, and review status.
- One fixed, resumable route per day that prioritizes due reviews, active mistakes, and high-frequency new words. Its numerator counts unique assigned cards rated once; repeat practice is tracked separately.
- Flashcard study with `Again`, `Hard`, `Good`, and `Easy` spaced-review scheduling, plus a focused mistake notebook.
- Six progressive real-life missions for introductions, dining, shopping, transit, campus teamwork, and clinic visits.
- Task-based lessons with learning goals, core expressions, bilingual dialogue, pronunciation, culture notes, and Agicto-powered semantic checks with three score dimensions, follow-up prompts, best scores, and an offline fallback.
- Adaptive practice across meaning, Hanzi recall, pinyin, listening, and dialogue context; weaker modes and mistake words receive priority, with a clear summary after each 10-question round.
- Searchable, paginated dictionary plus daily goal, accuracy, due count, focused study time, seven-day trends, and paginated vocabulary progress.
- Device speech synthesis for Mandarin pronunciation.
- Offline-first progress storage through IndexedDB/localforage, with JSON backup/restore and a protected reset flow.
- Personalized learning analytics with a next-step recommendation, seven-day activity, XP, and mission completion.
- Floating AI tutor with HSK level, current mission, due words, and recent mistakes as context; includes role-play and offline fallback.
- PWA plus Capacitor 8 packaging for Android 16/API 36 and iOS 15+.

## Project implementation scope

HanYu Cards is the working prototype for the university innovation project **AI赋能的个性化汉语学习系统开发与运营**. The current milestone maps the proposal to an executable learning loop:

- **Content foundation:** 2,209 HSK 1–3 entries with simplified/traditional forms, pinyin, meanings, radicals, frequency and searchable tags.
- **Personalization:** local spaced review, daily goal, accuracy, mastery and recent-mistake context drive the next recommended action.
- **Scenario application:** six task-based missions cover first meetings, dining, shopping, metro travel, campus teamwork and clinic communication; each combines dialogue, pronunciation, culture notes and a written check.
- **AI extension:** the tutor receives only the active learning context and supports explanation, review planning and role-play, with an offline fallback for prototype demonstrations.

For the 2026 mid-term review, the recommended evidence set is the built web/PWA prototype, automated unit/component tests, a small user-trial feedback log, and screenshots of the study, mission and progress flows. Suggested acceptance indicators are: a complete review-to-feedback loop, six playable missions, persistent offline progress, and a reproducible production build.

## Development

Use Node.js 22.12 or newer.

```bash
npm ci
npm run dev
```

To run the AI assistant backend in mock mode:

```bash
cp .env.example .env
npm run dev:api
```

For frontend and API together:

```bash
npm run dev:all
```

Set `AGICTO_API_KEY` and `AI_MOCK=false` in `.env` for live AI responses through the Agicto OpenAI-compatible API. `AGICTO_CHAT_MODEL` defaults to the low-cost `qwen-turbo` model and can be changed without rebuilding the frontend. The browser only uses `VITE_ASSISTANT_API_URL` and never receives the provider key.

The same model evaluates mission responses by communicative meaning rather than requiring exact sample wording. If the provider is unavailable, the app clearly labels and uses its stricter on-device expression check instead.

The repository ignores `.env`; never rename the provider key with a `VITE_` prefix, because Vite-prefixed values are exposed to browser code.

## Data architecture

The current milestone intentionally has no remote application database. Versioned HSK and scenario content ships with the app, learning progress remains in IndexedDB/localforage, preferences remain in localStorage, and the AI proxy is stateless. This keeps the prototype offline-first, account-free, inexpensive to operate, and usable when the network or model is unavailable.

A server database becomes useful when the product adds accounts, cross-device sync, remotely managed learning content, teacher dashboards, paid plans, or cohort analytics. At that stage, add an authenticated API and PostgreSQL-compatible storage with explicit local-to-cloud conflict handling; do not make the core study loop wait for the network.

## Build

```bash
npm run build
npm run mobile:android:debug
npm run mobile:sync:ios
```

The Android debug APK is generated at `android/app/build/outputs/apk/debug/app-debug.apk`. Native Mandarin TTS, backup sharing, haptics, Android back-button handling, production AI endpoint configuration, signing, and iOS archive steps are documented in [docs/mobile-build.md](docs/mobile-build.md). Store submission gates are in [docs/release-checklist.md](docs/release-checklist.md).

## Compliance Notes

- No Baicizhan branding, assets, or proprietary word data are used.
- Base app attribution and HSK dataset attribution are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
- The default release has no account, no ads, and no tracking.
- The privacy policy draft is available at `public/privacy.html` and must be hosted under the publisher domain before store submission.
