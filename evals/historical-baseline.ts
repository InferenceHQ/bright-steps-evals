import type { AppState, ProgramLesson } from '../src/types'

/**
 * A narrow policy reconstruction from the pre-read-through snapshot, retained
 * solely to compare one historical regression. It is not a second runtime.
 * Source provenance: private Bright Steps history, d70e4effd, domain.ts:59-65.
 */
export const historicalBaseline = {
  id: 'pre-read-through-policy-d70e4effd',
  sourceCommit: 'd70e4effd',
  sourcePath: 'src/domain.ts (private snapshot)',
  purpose: 'Historical comparison for the meaning-only completion regression.',
}

export function completeWithoutReadThroughGate(state: AppState, lesson: ProgramLesson): AppState {
  const hasCorrectMeaning = state.attempts.some((attempt) => attempt.stage === state.currentStage && attempt.prompt === `meaning:${lesson.id}` && attempt.correct && !attempt.hinted)
  if (!hasCorrectMeaning) return state
  const completedLessonIds = state.completedLessonIds.includes(lesson.id) ? state.completedLessonIds : [...state.completedLessonIds, lesson.id]
  return { ...state, completedLessonIds, stars: state.stars + 3 }
}
