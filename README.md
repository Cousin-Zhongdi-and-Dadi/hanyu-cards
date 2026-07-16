# HanYu Cards

Offline-first Mandarin Chinese learning app for adult HSK learners. The app was rebuilt from the MIT-licensed `languages-learner/web` Vue 3 codebase and now focuses on Chinese vocabulary, smart review, and an optional AI tutor.

## Features

- HSK 1-3 vocabulary set with simplified, traditional, pinyin, English meanings, radicals, tags, and review status.
- Flashcard study with `Again`, `Hard`, `Good`, and `Easy` spaced-review scheduling.
- Six progressive real-life missions for introductions, dining, shopping, transit, campus teamwork, and clinic visits.
- Task-based lessons with learning goals, core expressions, bilingual dialogue, pronunciation, culture notes, and applied response checks.
- Multiple-choice practice, searchable dictionary, daily goal, accuracy, due count, and level progress.
- Device speech synthesis for Mandarin pronunciation.
- Offline-first progress storage through IndexedDB/localforage.
- Personalized learning analytics with a next-step recommendation, seven-day activity, XP, and mission completion.
- Floating AI tutor with HSK level, current mission, due words, and recent mistakes as context; includes role-play and offline fallback.
- PWA plus Capacitor configuration for Android and iOS packaging.

## Project implementation scope

HanYu Cards is the working prototype for the university innovation project **AI赋能的个性化汉语学习系统开发与运营**. The current milestone maps the proposal to an executable learning loop:

- **Content foundation:** 2,209 HSK 1–3 entries with simplified/traditional forms, pinyin, meanings, radicals, frequency and searchable tags.
- **Personalization:** local spaced review, daily goal, accuracy, mastery and recent-mistake context drive the next recommended action.
- **Scenario application:** six task-based missions cover first meetings, dining, shopping, metro travel, campus teamwork and clinic communication; each combines dialogue, pronunciation, culture notes and a written check.
- **AI extension:** the tutor receives only the active learning context and supports explanation, review planning and role-play, with an offline fallback for prototype demonstrations.

For the 2026 mid-term review, the recommended evidence set is the built web/PWA prototype, automated unit/component tests, a small user-trial feedback log, and screenshots of the study, mission and progress flows. Suggested acceptance indicators are: a complete review-to-feedback loop, six playable missions, persistent offline progress, and a reproducible production build.

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
