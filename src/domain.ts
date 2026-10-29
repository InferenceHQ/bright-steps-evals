import { assessmentTexts, instructionalTexts, irregularWords, placementGraphemes, stages } from './data'
import { lessonProgram } from './course'
import type { AppState, Lesson, Placement, ProgramLesson, StageId, TextItem } from './types'

export const stageOrder: StageId[] = ['V0', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6']

export const defaultPlacement: Placement = {
  graphemeKnown: Object.fromEntries(placementGraphemes.map(({ letter }) => [letter, false])),
  oralBlends: 0,
  cvcFluent: false,
}

export const createInitialState = (learnerName = 'Reader'): AppState => ({
  schema: 1,
  learnerName,
  currentStage: 'V3',
  attempts: [],
  placement: { graphemeKnown: { ...defaultPlacement.graphemeKnown }, oralBlends: 0, cvcFluent: true, completed: true, result: 'V3' },
  completedTextIds: [],
  completedLessonIds: [],
  stars: 0,
  pausedForSupport: false,
  theme: 'sunrise',
  audioMuted: false,
  voicePracticeAllowed: false,
  reducedMotion: false,
  customTexts: [],
  parentNotes: [],
  assessmentResults: [],
  updatedAt: new Date().toISOString(),
})

export function applyLearnerBaseline(state: AppState): AppState {
  const hasLearningEvidence = state.attempts.length > 0 || state.completedLessonIds.length > 0
  const parentChoseV0 = state.placement.completed && state.placement.result === 'V0'
  if (state.currentStage !== 'V0' || hasLearningEvidence || parentChoseV0) return state
  return {
    ...state,
    currentStage: 'V3',
    placement: { ...state.placement, cvcFluent: true, completed: true, result: 'V3' },
    updatedAt: new Date().toISOString(),
  }
}

export function getPlacementResult(placement: Placement): StageId {
  const known = Object.values(placement.graphemeKnown).filter(Boolean).length
  if (known >= 18 && placement.oralBlends >= 4) return 'V3'
  return 'V0'
}

export function makePlacementState(current: Placement, letter: string, known: boolean, oralBlends = current.oralBlends): Placement {
  return { ...current, graphemeKnown: { ...current.graphemeKnown, [letter]: known }, oralBlends }
}

export function currentStageIndex(stage: StageId): number {
  return stageOrder.indexOf(stage)
}

export function eligibleTexts(state: AppState): TextItem[] {
  const index = currentStageIndex(state.currentStage)
  return [...instructionalTexts, ...state.customTexts].filter((item) => currentStageIndex(item.stage) <= index)
}

export function nextProgramLesson(state: AppState): ProgramLesson | null {
  const entryStage = state.currentStage === 'V1' ? 'V3' : state.currentStage
  const available = lessonProgram.filter((lesson) => currentStageIndex(lesson.stage) >= currentStageIndex(entryStage) && !state.completedLessonIds.includes(lesson.id))
  const lesson = available[0]
  return lesson ? { ...lesson, number: state.completedLessonIds.filter((id) => lessonProgram.some((candidate) => candidate.id === id)).length + 1 } : null
}

export function completeProgramLesson(state: AppState, lesson: ProgramLesson): AppState {
  const hasReadSentence = state.attempts.some((attempt) => attempt.stage === state.currentStage && attempt.prompt === `track:${lesson.id}` && attempt.correct && !attempt.hinted)
  const hasCorrectMeaning = state.attempts.some((attempt) => attempt.stage === state.currentStage && attempt.prompt === `meaning:${lesson.id}` && attempt.correct && !attempt.hinted)
  if (!hasReadSentence || !hasCorrectMeaning) return state
  const completedLessonIds = state.completedLessonIds.includes(lesson.id) ? state.completedLessonIds : [...state.completedLessonIds, lesson.id]
  const next = nextProgramLesson({ ...state, completedLessonIds })
  return { ...state, completedLessonIds, currentStage: next?.stage ?? state.currentStage, stars: state.stars + 3, pausedForSupport: false, updatedAt: new Date().toISOString() }
}

export function makeLesson(state: AppState): Lesson {
  const texts = eligibleTexts(state)
  const unseen = texts.filter((item) => !state.completedTextIds.includes(item.id))
  const targetText = unseen[0] ?? texts[0] ?? instructionalTexts[0]
  const words = targetText.sentences.join(' ').replace(/[^\w]/g, ' ').split(/\s+/).filter((word) => word.length > 2)
  const candidates = words.filter((candidate) => /^[a-z]+$/i.test(candidate)).map((candidate) => candidate.toLowerCase())
  const word = candidates.sort((left, right) => {
    const leftCount = state.attempts.filter((attempt) => attempt.stage === state.currentStage && attempt.prompt === left).length
    const rightCount = state.attempts.filter((attempt) => attempt.stage === state.currentStage && attempt.prompt === right).length
    return leftCount - rightCount
  })[0] ?? 'sat'
  const distractors = ['map', 'sun', 'fish', 'run', 'cat'].filter((candidate) => candidate !== word)
  return { word, choices: [word, ...distractors.slice(0, 2)].sort(), sentence: targetText.sentences[0], targetText }
}

export function recordAttempt(state: AppState, stage: StageId, prompt: string, correct: boolean, hinted = false): AppState {
  const attempt = { id: crypto.randomUUID(), stage, prompt, correct, hinted, parentVerified: false, createdAt: new Date().toISOString() }
  const next = { ...state, attempts: [...state.attempts, attempt], updatedAt: new Date().toISOString() }
  return correct ? { ...next, stars: next.stars + 1 } : next
}

export function completeLesson(state: AppState, lesson: Lesson): AppState {
  const completedTextIds = state.completedTextIds.includes(lesson.targetText.id)
    ? state.completedTextIds
    : [...state.completedTextIds, lesson.targetText.id]
  const currentIndex = currentStageIndex(state.currentStage)
  const answers = state.attempts.filter((attempt) => attempt.stage === state.currentStage && !attempt.hinted && attempt.parentVerified)
  const accuracy = answers.length ? answers.filter((attempt) => attempt.correct).length / answers.length : 0
  const eligible = state.currentStage === 'V1'
    ? sentenceEligible(state)
    : state.currentStage !== 'V0' && state.currentStage !== 'V6' && stageMasteryEligible(answers) && accuracy >= 0.9
  const nextStage = eligible && currentIndex < stageOrder.length - 1 ? stageOrder[currentIndex + 1] : state.currentStage
  return { ...state, completedTextIds, currentStage: nextStage, pausedForSupport: false, updatedAt: new Date().toISOString() }
}

function stageMasteryEligible(attempts: AppState['attempts']): boolean {
  const decoded = new Set(attempts.filter((attempt) => attempt.correct && !attempt.prompt.includes(':')).map((attempt) => attempt.prompt)).size
  const encoded = new Set(attempts.filter((attempt) => attempt.correct && attempt.prompt.startsWith('encode:')).map((attempt) => attempt.prompt)).size
  return decoded >= 12 && encoded >= 6 && distinctPracticeDays(attempts) >= 2
}

function distinctPracticeDays(attempts: AppState['attempts']): number {
  return new Set(attempts.map((attempt) => attempt.createdAt.slice(0, 10))).size
}

export function stageProgress(state: AppState, stage: StageId): { correct: number; total: number; accuracy: number } {
  const attempts = state.attempts.filter((attempt) => attempt.stage === stage && !attempt.hinted && attempt.parentVerified)
  const correct = attempts.filter((attempt) => attempt.correct).length
  return { correct, total: attempts.length, accuracy: attempts.length ? Math.round((correct / attempts.length) * 100) : 0 }
}

export function masteryMessage(state: AppState): string {
  const progress = stageProgress(state, state.currentStage)
  if (state.currentStage === 'V0') return 'Finish the sound check to choose a starting point.'
  if (state.currentStage === 'V1') return sentenceEligible(state) ? 'Word fluency is ready. Finish this lesson to open the next step.' : `Read ${Math.max(0, 8 - progress.correct)} more new words and ${Math.max(0, 6 - state.attempts.filter((attempt) => attempt.stage === 'V1' && attempt.prompt.startsWith('reread:') && attempt.correct && !attempt.hinted && attempt.parentVerified).length)} whole-word rereads.`
  if (state.currentStage === 'V6') return 'Use the two sealed reading checks before deciding that this path is complete.'
  const days = distinctPracticeDays(state.attempts.filter((attempt) => attempt.stage === state.currentStage && !attempt.hinted && attempt.parentVerified))
  const evidence = state.attempts.filter((attempt) => attempt.stage === state.currentStage && !attempt.hinted && attempt.parentVerified)
  const decoded = new Set(evidence.filter((attempt) => attempt.correct && !attempt.prompt.includes(':')).map((attempt) => attempt.prompt)).size
  const encoded = new Set(evidence.filter((attempt) => attempt.correct && attempt.prompt.startsWith('encode:')).map((attempt) => attempt.prompt)).size
  return `${Math.max(0, 12 - decoded)} more different reading words, ${Math.max(0, 6 - encoded)} more different build-it words, and ${Math.max(0, 2 - days)} more practice day${days === 1 ? '' : 's'} before this step can move on.`
}

export function assessmentPassed(state: AppState): boolean {
  const wordCounts = new Map(assessmentTexts.map((item) => [item.id, normalise(item.sentences.join(' ')).length]))
  const passes = state.assessmentResults.filter((result) => result.comprehensionCorrect >= 4 && result.wordErrors / (wordCounts.get(result.formId) ?? 0) <= 0.05)
  if (passes.length < 2) return false
  if (new Set(passes.map((result) => result.formId)).size < 2) return false
  return passes.some((first, index) => passes.some((second, secondIndex) => index !== secondIndex && first.formId !== second.formId && Math.abs(new Date(second.recordedAt).getTime() - new Date(first.recordedAt).getTime()) >= 7 * 24 * 60 * 60 * 1000))
}

export function confirmPractice(state: AppState): AppState {
  const attempts = state.attempts.map((attempt) => attempt.parentVerified || attempt.stage !== state.currentStage ? attempt : { ...attempt, parentVerified: true })
  return { ...state, attempts, parentNotes: [...state.parentNotes, 'A grown-up confirmed the recent reading practice.'], updatedAt: new Date().toISOString() }
}

const normalise = (value: string) => value.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean)
export function sentenceEligible(state: AppState): boolean {
  if (currentStageIndex(state.currentStage) > currentStageIndex('V1')) return true
  if (state.currentStage !== 'V1') return false
  const independentWords = state.attempts.filter((attempt) => attempt.stage === 'V1' && attempt.correct && !attempt.hinted && attempt.parentVerified && !attempt.prompt.startsWith('reread:') && !attempt.prompt.includes(' '))
  const rereads = state.attempts.filter((attempt) => attempt.stage === 'V1' && attempt.correct && !attempt.hinted && attempt.parentVerified && attempt.prompt.startsWith('reread:'))
  return new Set(independentWords.map((attempt) => attempt.prompt)).size >= 8 && new Set(rereads.map((attempt) => attempt.prompt)).size >= 6 && distinctPracticeDays([...independentWords, ...rereads]) >= 2
}

export function approvedIrregularWords(stage: StageId): string[] {
  const releases: Record<StageId, string[]> = {
    V0: [],
    V1: ['a', 'I', 'the', 'is'],
    V2: ['a', 'I', 'the', 'is', 'was', 'to', 'of', 'said', 'you'],
    V3: ['a', 'I', 'the', 'is', 'was', 'to', 'of', 'said', 'you', 'are', 'he', 'she', 'we', 'me', 'be', 'do'],
    V4: ['a', 'I', 'the', 'is', 'was', 'to', 'of', 'said', 'you', 'are', 'he', 'she', 'we', 'me', 'be', 'do', 'does', 'have', 'has', 'come', 'some'],
    V5: irregularWords,
    V6: irregularWords,
  }
  return releases[stage]
}

export function validateCustomText(value: string, stage: StageId): { valid: boolean; unsupported: string[]; message: string } {
  const words = normalise(value)
  const approvedVocabulary = new Set([
    ...approvedIrregularWords(stage).map((word) => word.toLowerCase()),
    ...instructionalTexts.filter((item) => currentStageIndex(item.stage) <= currentStageIndex(stage)).flatMap((item) => normalise(item.sentences.join(' '))),
  ])
  const unsupported = [...new Set(words.filter((word) => !approvedVocabulary.has(word)))]
  if (!value.trim()) return { valid: false, unsupported: [], message: 'Write a sentence first.' }
  if (currentStageIndex(stage) < currentStageIndex('V1')) return { valid: false, unsupported: [], message: 'Use the sound check before adding reading text.' }
  if (unsupported.length) return { valid: false, unsupported, message: `Needs adult review: ${unsupported.join(', ')}` }
  return { valid: true, unsupported: [], message: 'This sentence stays inside the current approved word bank.' }
}

export function getAssessment(): TextItem[] {
  return assessmentTexts
}

export function stageLabel(stage: StageId): string {
  return stages.find((item) => item.id === stage)?.label ?? stage
}
