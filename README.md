# Smart Life

AI-powered personal productivity and everyday life management app (PWA web version in `smart-life/`).

## Project type

Android app (Kotlin, Gradle). Application ID: `see app/build.gradle.kts (currently the placeholder `com.example`, change before publishing)`

## Build

```bash
./gradlew assembleDebug
```

## Setup

- If the app uses Gemini, copy `.env.example` to `.env` and add your own `GEMINI_API_KEY`. Never commit real keys.
- Release builds need your own keystore. Keep it outside the repo and pass `STORE_PASSWORD` / `KEY_PASSWORD` as environment variables.

