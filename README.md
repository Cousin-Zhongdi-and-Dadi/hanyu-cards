# HanYu Cards

Offline-first Mandarin Chinese learning app for adult HSK learners. The app was rebuilt from the MIT-licensed `languages-learner/web` Vue 3 codebase and now focuses on Chinese vocabulary, smart review, and an optional AI tutor.

## Features

- HSK 1-3 vocabulary set with simplified, traditional, pinyin, English meanings, radicals, tags, and review status.
- Flashcard study with `Again`, `Hard`, `Good`, and `Easy` spaced-review scheduling.
- Multiple-choice practice, searchable dictionary, daily goal, accuracy, due count, and level progress.
- Device speech synthesis for Mandarin pronunciation.
- Offline-first progress storage through IndexedDB/localforage.
- Floating AI tutor with a secure backend proxy and offline fallback.
- PWA plus Capacitor configuration for Android and iOS packaging.

## Development

Use Node.js 20 or newer.

```bash
npm install
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

Set `OPENAI_API_KEY` and `AI_MOCK=false` in `.env` for production AI responses. The frontend uses `VITE_ASSISTANT_API_URL` and never stores provider keys.

## Build

```bash
npm run build
npx cap sync
```

Android and iOS release details are in [docs/release-checklist.md](docs/release-checklist.md).

## Compliance Notes

- No Baicizhan branding, assets, or proprietary word data are used.
- Base app attribution and HSK dataset attribution are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
- The default release has no account, no ads, and no tracking.
- The privacy policy draft is available at `public/privacy.html` and must be hosted under the publisher domain before store submission.
