# ATS backend

## AI provider configuration

Job-description normalization and semantic CV matching use Groq when
`AI_PROVIDER=groq`. Copy `.env.example` to `.env`, then set `GROQ_API_KEY`.
The API key is backend-only and must never be placed in the mobile app.

## Normal tests

Run deterministic, mocked-provider, API, and fallback tests without making external AI requests:

```powershell
npm test
```

## Optional real provider test

Set `RUN_GEMINI_TESTS=true`, `AI_PROVIDER=groq`, and `GROQ_API_KEY` in the
backend environment, then run:

```powershell
$env:RUN_GEMINI_TESTS='true'; $env:AI_PROVIDER='groq'; npm test -- --run tests/gemini.integration.test.ts
```

The normal test suite skips this integration test.
