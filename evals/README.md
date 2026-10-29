# Bright Steps evaluation system

This folder evaluates the real, deterministic Bright Steps runtime. It does not
add an LLM, call a provider, capture speech, or change a child's lesson.

```text
separate fixtures.ts ──> curriculum contract grader ──┐
                                                       ├─> scorecard JSON
domain.ts + course.ts ──> synthetic learner scenarios ─┤
                                                       ├─> comparison report
historical-baseline.ts ─> same reset-state regression ─┘

App.tsx + LessonPlayer.tsx ──> static safety-boundary checks
```

## Run it

```bash
npm install
npm run eval:scorecard
npm run eval:scorecard -- --write   # optional ignored local receipt
npm test -- evals/scorecard.test.ts
```

The runner emits JSON to stdout. `--write` additionally creates the ignored
`evals/results/latest.json` receipt. It contains only synthetic scenario IDs,
outcomes, and offline timings.

## What is graded

| Layer | Tasks | Status of claim |
| --- | --- | --- |
| Released curriculum | 34 independently authored lesson-contract fixtures: stage, target, sentence, literal question, correct answer, and one correct option | Deterministic software check |
| Learner progression | Advanced entry, intentional V0 preservation, premature completion, parent confirmation, sealed-form rules, interruption state, and duplicate completion | Synthetic learner-state simulation |
| Child-safety boundaries | Neutral correction copy, sentence read-through gate, no automatic speech scoring or remote speech call, and distinct sealed assessment text | Static code-boundary check |
| Historical comparison | Meaning-only completion on a fixed reset state: private snapshot `d70e4effd` versus current completion logic | One bounded regression comparison |
| Transfer questions | Three held-out literal questions retained outside teaching examples | **Not reached**: no generic/free-response comprehension grader exists |
| Model behavior | Prompt, model, tool, model-task score, cost | **Not applicable**: no model is present |
| Educational outcomes | Reading gain, retention, engagement, treatment effect | **Not measured**: synthetic data cannot establish them |

`fixtures.ts` never imports `src/course.ts`; that separation catches accidental
content drift. It is a manually inspected implementation oracle, not a claim
of independent literacy-specialist review.

## Scorecard fields

Each run binds the implementation type, model/prompt/tool status, fixture
version, scenario ID, category, result, offline timing, evidence paths, and a
pass/fail/not-reached status. The scorecard reports planned coverage, valid-run
rate, goal success, false-positive mastery cases, known errors, and only costs
or latency actually measured. A grader execution can succeed while a product
scenario fails; that distinction is intentional.

## Comparison boundary

The baseline is a narrow reconstruction of the pre-read-through policy from
private commit `d70e4effd`, not a competitor or a fabricated model baseline.
Both policies receive the identical reset state containing a correct literal
answer but no sentence read-through event. The current code should block that
completion. The comparison says nothing about teaching efficacy.

## Public export boundary

Only the app source, evaluation code, original illustration, package metadata,
and documentation may enter a portfolio export. Exclude IndexedDB/localStorage
records, browser profiles, encrypted household exports, generated receipts,
build output, parent-workspace history, credentials, child names, recordings,
screenshots, and operational configuration. The export must be made into a
fresh directory, privacy-scanned, committed as a new public repository without
a license assumption, and verified by a fresh clone before sharing.
