# Bright Steps Reading

Private, local-first reading practice for one kindergarten learner who knows most letter sounds and is learning to blend words into sentences.

## Run locally

```bash
npm install
npm run dev
```

Open the local address Vite prints. The app uses IndexedDB when available and falls back to local browser storage. It has no account, analytics, cloud sync, remote child-audio processing, or ads.

## Verify

```bash
npm run verify:preflight
npm run verify:diagnostic
npm run verify:journey -- placement-to-first-lesson
npm run verify:journey -- offline-resume
npm run verify:journey -- parent-evidence
npm run verify:privacy
npm run build
```

## Reproducible evaluation

Bright Steps is a deterministic, local tutor. It has no live LLM, remote speech
grader, or generic free-response comprehension scorer. Its evaluation therefore
measures the code-owned lesson contracts, learner-state gates, historical
read-through regression, and safety boundaries—not a child's reading growth.

```bash
npm run eval:scorecard
# optional local synthetic receipt (ignored by Git)
npm run eval:scorecard -- --write
```

See [the evaluation guide](evals/README.md) for the scenario inventory,
comparison boundary, public-export rules, and the honest result report.

The journey runner also supports `--break` to prove it writes a first-failure receipt.

## Privacy

Exports are passphrase-encrypted using Argon2id and AES-GCM. The passphrase is never stored. Voice practice opens the microphone only after a child action, stops it after a brief check, and does not save audio.
