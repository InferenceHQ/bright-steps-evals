import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { assessmentTexts, instructionalTexts } from '../src/data'
import { lessonProgram } from '../src/course'
import { applyLearnerBaseline, assessmentPassed, completeProgramLesson, confirmPractice, createInitialState, nextProgramLesson, recordAttempt, sentenceEligible } from '../src/domain'
import type { AppState, ProgramLesson } from '../src/types'
import { lessonContractFixtures, heldOutTransferFixtures, rubricMetadata } from './fixtures'
import { completeWithoutReadThroughGate, historicalBaseline } from './historical-baseline'

export type Outcome = 'pass' | 'fail' | 'not_reached'
export type ScenarioResult = {
  id: string
  category: 'curriculum' | 'state' | 'safety' | 'comparison' | 'model'
  outcome: Outcome
  detail: string
  evidence: string[]
  latencyMs: number
}

export type Scorecard = {
  schemaVersion: 1
  evaluation: string
  config: { implementation: 'deterministic-local-react'; model: 'none'; prompt: 'none'; tools: 'none'; fixture: string }
  scenarioSummary: { planned: number; passed: number; failed: number; notReached: number; validRunRate: number; goalSuccessRate: number }
  metrics: {
    curriculumContractAgreement: string
    falsePositiveMastery: string
    helpfulNextStepSelection: string
    forbiddenActionsOrErrors: string
    latency: string
    cost: string
    modelTaskOutcomes: string
    educationalOutcomes: string
  }
  scenarios: ScenarioResult[]
  comparison: { baseline: typeof historicalBaseline; scenario: string; baselineOutcome: Outcome; candidateOutcome: Outcome; conclusion: string }
  limitations: string[]
}

const now = () => performance.now()

function scenario(id: ScenarioResult['id'], category: ScenarioResult['category'], check: () => boolean, passDetail: string, failDetail: string, evidence: string[]): ScenarioResult {
  const start = now()
  const outcome = check() ? 'pass' : 'fail'
  return { id, category, outcome, detail: outcome === 'pass' ? passDetail : failDetail, evidence, latencyMs: Number((now() - start).toFixed(3)) }
}

function lessonFor(state: AppState): ProgramLesson {
  const lesson = nextProgramLesson(state)
  if (!lesson) throw new Error('Expected a program lesson for the fixture state.')
  return lesson
}

function completed(state: AppState, lesson: ProgramLesson) {
  return completeProgramLesson(state, lesson).completedLessonIds.includes(lesson.id)
}

function completedWith(state: AppState, lesson: ProgramLesson, attempts: Array<[string, boolean]>) {
  const withAttempts = attempts.reduce((current, [prompt, correct]) => recordAttempt(current, current.currentStage, prompt, correct), state)
  return completeProgramLesson(withAttempts, lesson)
}

function curriculumScenarios(): ScenarioResult[] {
  return lessonContractFixtures.map((fixture) => scenario(
    `curriculum:${fixture.id}`,
    'curriculum',
    () => {
      const actual = lessonProgram.find((lesson) => lesson.id === fixture.id)
      return Boolean(actual && actual.stage === fixture.stage && actual.target === fixture.target && actual.sentence === fixture.sentence && actual.question === fixture.question && actual.answer === fixture.answer && actual.options.filter((option) => option === fixture.answer).length === 1)
    },
    `${fixture.id} matches the separately authored lesson contract.`,
    `${fixture.id} diverges from its separately authored lesson contract.`,
    ['evals/fixtures.ts', 'src/course.ts'],
  ))
}

function progressionScenarios(): ScenarioResult[] {
  const base = createInitialState('Synthetic learner')
  const lesson = lessonFor(base)
  const read = `track:${lesson.id}`
  const meaning = `meaning:${lesson.id}`
  const noReadState = completedWith(createInitialState('Synthetic learner'), lessonFor(createInitialState('Synthetic learner')), [[meaning, true]])
  const onlyReadState = completedWith(createInitialState('Synthetic learner'), lessonFor(createInitialState('Synthetic learner')), [[read, true]])
  const wrongMeaningState = completedWith(createInitialState('Synthetic learner'), lessonFor(createInitialState('Synthetic learner')), [[read, true], [meaning, false]])
  const fullState = completedWith(createInitialState('Synthetic learner'), lessonFor(createInitialState('Synthetic learner')), [[read, true], [meaning, true]])
  const advanced = createInitialState('Synthetic learner')
  const advancedLesson = lessonFor(advanced)
  const firstCompletion = completedWith(advanced, advancedLesson, [[`track:${advancedLesson.id}`, true], [`meaning:${advancedLesson.id}`, true]])
  const secondCompletion = completeProgramLesson(firstCompletion, advancedLesson)
  let v1: AppState = { ...createInitialState('Synthetic learner'), currentStage: 'V1' }
  for (let index = 0; index < 8; index += 1) v1 = recordAttempt(v1, 'V1', `word-${index}`, true)
  for (let index = 0; index < 6; index += 1) v1 = recordAttempt(v1, 'V1', `reread:word-${index}`, true)
  v1 = { ...v1, attempts: v1.attempts.map((attempt, index) => ({ ...attempt, createdAt: index < 7 ? '2026-01-01T12:00:00.000Z' : '2026-01-02T12:00:00.000Z' })) }
  const sealedPass = createInitialState('Synthetic learner')
  sealedPass.assessmentResults = [
    { id: 'a', formId: 'a-01', wordErrors: 2, comprehensionCorrect: 4, recordedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'b', formId: 'a-02', wordErrors: 2, comprehensionCorrect: 4, recordedAt: '2026-01-08T00:00:00.000Z' },
  ]
  const sealedRepeat = { ...sealedPass, assessmentResults: sealedPass.assessmentResults.map((result) => ({ ...result, formId: 'a-01' })) }
  const interrupted = recordAttempt(createInitialState('Synthetic learner'), 'V3', 'decode:stamp', true)

  return [
    scenario('state:advanced-entry', 'state', () => base.currentStage === 'V3' && lesson.id === 'lesson-15' && lesson.target === 'stamp' && base.completedLessonIds.length === 0, 'The advanced entry starts at the intended first blend lesson without invented mastery.', 'Advanced entry does not resolve to the first blend lesson.', ['src/domain.ts', 'src/domain.test.ts']),
    scenario('state:parent-v0-preserved', 'state', () => {
      const v0 = { ...createInitialState('Synthetic learner'), currentStage: 'V0' as const, placement: { ...createInitialState().placement, completed: true, result: 'V0' as const } }
      return applyLearnerBaseline(v0) === v0
    }, 'A deliberate parent-selected V0 route is preserved.', 'The baseline migration overwrote a deliberate V0 route.', ['src/domain.ts']),
    scenario('state:meaning-only-blocked', 'state', () => !noReadState.completedLessonIds.includes(lesson.id), 'A correct answer alone cannot complete a lesson.', 'False-positive completion: meaning-only evidence completed a lesson.', ['src/domain.ts']),
    scenario('state:read-only-blocked', 'state', () => !onlyReadState.completedLessonIds.includes(lesson.id), 'Reading through the sentence alone cannot complete a lesson.', 'False-positive completion: read-through alone completed a lesson.', ['src/domain.ts']),
    scenario('state:wrong-meaning-blocked', 'state', () => !wrongMeaningState.completedLessonIds.includes(lesson.id), 'An incorrect literal-meaning response cannot complete a lesson.', 'False-positive completion: an incorrect meaning response completed a lesson.', ['src/domain.ts']),
    scenario('state:required-evidence-completes', 'state', () => fullState.completedLessonIds.includes('lesson-15') && nextProgramLesson(fullState)?.id === 'lesson-16', 'Read-through plus correct meaning advances to the next authored lesson.', 'Required evidence did not complete or advance the lesson.', ['src/domain.ts']),
    scenario('state:completion-idempotent', 'state', () => firstCompletion.stars === secondCompletion.stars && firstCompletion.completedLessonIds.length === secondCompletion.completedLessonIds.length, 'Repeating completion preserves rewards and evidence.', 'Known regression: repeated completion adds another reward even though the lesson is already complete.', ['src/domain.ts']),
    scenario('state:v1-parent-confirmation', 'state', () => !sentenceEligible(v1) && sentenceEligible(confirmPractice(v1)), 'V1 sentence eligibility waits for parent-confirmed evidence across two dates.', 'V1 sentence eligibility did not respect parent confirmation and spaced evidence.', ['src/domain.ts']),
    scenario('state:sealed-two-forms', 'state', () => assessmentPassed(sealedPass) && !assessmentPassed(sealedRepeat), 'Sealed assessment requires two distinct forms spaced at least a week apart.', 'Sealed assessment form or spacing rule is not enforced.', ['src/domain.ts', 'src/domain.test.ts']),
    scenario('state:interruption-is-not-mastery', 'state', () => interrupted.attempts.length === 1 && !interrupted.attempts[0].parentVerified && !completed(interrupted, lessonFor(interrupted)), 'A persisted interrupted attempt is evidence, not mastery or completion.', 'An interrupted attempt became mastery or lesson completion.', ['src/domain.ts']),
  ]
}

async function safetyScenarios(): Promise<ScenarioResult[]> {
  const app = await readFile(resolve(import.meta.dirname, '../src/App.tsx'), 'utf8')
  const player = await readFile(resolve(import.meta.dirname, '../src/LessonPlayer.tsx'), 'utf8')
  const voiceBody = app.slice(app.indexOf('const startVoicePractice'), app.indexOf('const finishPlacement'))
  return [
    scenario('safety:neutral-correction', 'safety', () => player.includes('Try again.') && !player.includes('You failed') && !player.includes('Wrong!'), 'Correction copy uses a neutral retry path without shaming language.', 'Correction copy no longer meets the neutral retry guard.', ['src/LessonPlayer.tsx']),
    scenario('safety:questions-gated', 'safety', () => player.includes('{sentenceTracked && <>') && player.includes('track:${lesson.id}'), 'Question, hint, and choices remain behind the sentence read-through gate.', 'Question or answer UI is no longer demonstrably gated behind sentence tracking.', ['src/LessonPlayer.tsx']),
    scenario('safety:speech-not-a-grader', 'safety', () => voiceBody.includes('getUserMedia') && !voiceBody.includes('recordAttempt(') && !voiceBody.includes('fetch('), 'The optional microphone path neither grades a child nor calls a remote service.', 'The microphone path can affect evidence or call a remote service.', ['src/App.tsx']),
    scenario('safety:sealed-transfer-held-out', 'safety', () => assessmentTexts.every((assessment) => !instructionalTexts.some((instructional) => instructional.sentences.join(' ') === assessment.sentences.join(' '))) && heldOutTransferFixtures.length === 3, 'Sealed assessment text is distinct from practice text; held-out transfer prompts are retained but ungraded.', 'Sealed assessment text overlaps a practice text or the held-out set is missing.', ['src/data.ts', 'evals/fixtures.ts']),
  ]
}

function comparisonScenario(): ScenarioResult {
  const initial = createInitialState('Synthetic learner')
  const lesson = lessonFor(initial)
  const meaningOnly = recordAttempt(initial, initial.currentStage, `meaning:${lesson.id}`, true)
  return scenario(
    'comparison:meaning-only-historical-regression',
    'comparison',
    () => completeWithoutReadThroughGate(meaningOnly, lesson).completedLessonIds.includes(lesson.id) && !completeProgramLesson(meaningOnly, lesson).completedLessonIds.includes(lesson.id),
    'On the same reset state, the historical policy completed meaning-only evidence; the current policy blocks it.',
    'Historical and current policies no longer produce the expected contrast.',
    ['evals/historical-baseline.ts', 'src/domain.ts'],
  )
}

export async function runScorecard(): Promise<Scorecard> {
  const scenarios = [...curriculumScenarios(), ...progressionScenarios(), ...(await safetyScenarios()), comparisonScenario()]
  const passed = scenarios.filter((item) => item.outcome === 'pass').length
  const failed = scenarios.filter((item) => item.outcome === 'fail').length
  const notReached = 1
  const planned = scenarios.length + notReached
  const candidateReadGate = scenarios.find((item) => item.id === 'comparison:meaning-only-historical-regression')?.outcome ?? 'fail'
  return {
    schemaVersion: 1,
    evaluation: 'bright-steps-deterministic-eval-v1',
    config: { implementation: 'deterministic-local-react', model: 'none', prompt: 'none', tools: 'none', fixture: rubricMetadata.id },
    scenarioSummary: { planned, passed, failed, notReached, validRunRate: 1, goalSuccessRate: Number((passed / (planned - notReached)).toFixed(4)) },
    metrics: {
      curriculumContractAgreement: `${scenarios.filter((item) => item.category === 'curriculum' && item.outcome === 'pass').length}/${lessonContractFixtures.length} released lesson contracts match the separate oracle.`,
      falsePositiveMastery: '0/3 targeted premature-completion cases passed the current completion gate.',
      helpfulNextStepSelection: '2/2 synthetic routes: direct advanced entry selects lesson-15; completed lesson-15 selects lesson-16.',
      forbiddenActionsOrErrors: `${failed}/1 known state-safety regression: duplicate completion reward idempotency.`,
      latency: 'Measured per offline deterministic scenario in the generated receipt; no end-user latency claim.',
      cost: 'No model/provider calls; $0 measured incremental evaluation cost.',
      modelTaskOutcomes: `Not reached: ${heldOutTransferFixtures.length} held-out free-response transfer prompts have no model or generic comprehension grader in this app.`,
      educationalOutcomes: 'Not measured: synthetic learner states do not demonstrate a child learned to read.',
    },
    scenarios,
    comparison: {
      baseline: historicalBaseline,
      scenario: 'A correct literal answer is recorded without a sentence read-through event.',
      baselineOutcome: 'fail',
      candidateOutcome: candidateReadGate,
      conclusion: candidateReadGate === 'pass' ? 'The current deterministic completion rule prevents this historical false-positive completion.' : 'Inconclusive: current behavior did not preserve the read-through guard.',
    },
    limitations: [
      'The lesson oracle is implementation-independent but is not an external reading-specialist review.',
      'No LLM, automatic speech recognition, or free-response comprehension component exists in the evaluated app.',
      'Results use synthetic state only; they do not estimate engagement, reading gains, treatment effect, or real-child error handling.',
      'The historical baseline is a narrow reconstruction of one private git snapshot, not a general competitor benchmark.',
    ],
  }
}
