# Bright Steps deterministic evaluation report

## Result

**Current offline run — October 28, 2026:** 48 of 49 executed scenarios pass;
all 49 graders ran validly; one model/free-response category is not reached. The
only failing scenario is `state:completion-idempotent`.

The evaluation runner is designed to make two different facts visible:

1. **The current completion rule closes a known historical loophole.** On the
   same synthetic state containing only a correct literal answer, the
   pre-read-through policy completed the lesson; the current policy blocks it
   until a sentence read-through receipt exists.
2. **One real state-safety regression remains.** Repeating
   `completeProgramLesson` after a valid completion adds three extra stars.
   The scorecard deliberately records this as a failure. This evaluation does
   not change the app; the underlying fix requires explicit approval.

Run the report yourself:

```bash
npm run eval:scorecard
```

Expected current shape: 34 lesson-contract checks, 10 learner-state scenarios,
4 safety-boundary scenarios, and 1 historical-comparison scenario. One
model/free-response transfer category is `not_reached`, not zero: the app has
no LLM or generic answer grader.

## What the result supports

- The released lesson data currently matches the separate evaluation oracle.
- The deterministic progression logic blocks three targeted premature
  completion patterns.
- The advanced learner route selects `lesson-15` (`stamp`) without backfilling
  skipped mastery, and then routes to `lesson-16` after valid completion.
- The optional microphone path is not an automated speech grader and does not
  call a remote service in the evaluated source.

## What it does not support

- A claim that a child learned to read, learned faster, or retained skills.
- A claim about LLM accuracy, speech-recognition accuracy, model cost, or model
  latency.
- A claim that this is a clinical, classroom, or reading-specialist validation.

The exact results, scenario IDs, source paths, and per-scenario offline timing
are emitted in the JSON scorecard. Local generated receipts remain ignored by
Git and contain no learner data.
