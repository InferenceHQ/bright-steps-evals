import { describe, expect, it } from 'vitest'
import { assessmentTexts, instructionalTexts, irregularWords, placementGraphemes } from './data'
import { lessonProgram } from './course'
import { applyLearnerBaseline, approvedIrregularWords, assessmentPassed, completeLesson, completeProgramLesson, confirmPractice, createInitialState, getPlacementResult, makeLesson, masteryMessage, nextProgramLesson, recordAttempt, sentenceEligible, validateCustomText } from './domain'
import type { AppState } from './types'

describe('placement', () => {
  it('starts this learner directly at the first blend-word lesson without prior mastery receipts', () => {
    const state = createInitialState()
    expect(state.currentStage).toBe('V3')
    expect(state.placement).toMatchObject({ completed: true, result: 'V3' })
    expect(state.completedLessonIds).toEqual([])
    expect(nextProgramLesson(state)).toMatchObject({ id: 'lesson-15', number: 1, target: 'stamp' })
  })

  it('migrates an untouched V0 setup to V3 but preserves a parent-selected V0 route', () => {
    const untouched = { ...createInitialState(), currentStage: 'V0' as const, placement: { ...createInitialState().placement, completed: true } }
    expect(applyLearnerBaseline(untouched)).toMatchObject({ currentStage: 'V3', placement: { result: 'V3' } })
    const parentSelected = { ...untouched, placement: { ...untouched.placement, result: 'V0' as const } }
    expect(applyLearnerBaseline(parentSelected)).toBe(parentSelected)
  })

  it('starts a child who knows the 20 sampled sounds and 4 oral blends at blend words', () => {
    const state = createInitialState()
    state.placement.graphemeKnown = Object.fromEntries(placementGraphemes.map(({ letter }) => [letter, true]))
    state.placement.oralBlends = 4
    expect(getPlacementResult(state.placement)).toBe('V3')
  })

  it('routes an existing CVC session to the first blend-word lesson without inventing completion receipts', () => {
    const state = createInitialState()
    state.placement.graphemeKnown = Object.fromEntries(placementGraphemes.map(({ letter }) => [letter, true]))
    state.placement.oralBlends = 5
    state.currentStage = 'V1'
    expect(nextProgramLesson(state)).toMatchObject({ id: 'lesson-15', number: 1, target: 'stamp' })
  })

  it('routes back to the earliest prerequisite when sound confidence is below the skip gate', () => {
    const state = createInitialState()
    state.placement.oralBlends = 5
    expect(getPlacementResult(state.placement)).toBe('V0')
  })
})

describe('curriculum pack', () => {
  it('has a complete original model-to-meaning lesson sequence', () => {
    expect(lessonProgram).toHaveLength(34)
    expect(lessonProgram.map((lesson) => lesson.number)).toEqual(Array.from({ length: 34 }, (_, index) => index + 1))
    expect(lessonProgram.every((lesson) => lesson.target && lesson.soundParts.length > 0 && Boolean(lesson.sentence && lesson.question && lesson.answer && lesson.options.includes(lesson.answer)))).toBe(true)
  })
  it('ships the frozen instructional and sealed assessment quantities', () => {
    expect(instructionalTexts).toHaveLength(30)
    expect(assessmentTexts).toHaveLength(2)
    expect(irregularWords).toHaveLength(25)
    expect(assessmentTexts.every((item) => item.assessment)).toBe(true)
    const words = (text: string) => text.toLowerCase().match(/[a-z]+/g) ?? []
    const knownBeforeV6 = new Set([...instructionalTexts.filter((item) => item.stage !== 'V6').flatMap((item) => words(item.sentences.join(' '))), ...irregularWords.map((word) => word.toLowerCase())])
    const v6Words = [...instructionalTexts.filter((item) => item.stage === 'V6'), ...assessmentTexts].flatMap((item) => words(item.sentences.join(' ')))
    expect(v6Words.filter((word) => !knownBeforeV6.has(word))).toEqual([])
  })

  it('keeps household additions inside the approved word bank', () => {
    expect(validateCustomText('Sam sat.', 'V1').valid).toBe(true)
    expect(validateCustomText('She has a shell.', 'V1')).toMatchObject({ valid: false, unsupported: ['she', 'has', 'shell'] })
    expect(validateCustomText('A unicorn danced.', 'V1')).toMatchObject({ valid: false, unsupported: ['unicorn', 'danced'] })
  })

  it('introduces irregular words cumulatively instead of exposing the entire list at the first stage', () => {
    expect(approvedIrregularWords('V1')).toEqual(['a', 'I', 'the', 'is'])
    expect(approvedIrregularWords('V5')).toEqual(irregularWords)
  })
})

describe('mastery projection', () => {
  it('requires correct sentence meaning before preserving a completion receipt', () => {
    let state: AppState = { ...createInitialState(), currentStage: 'V1' }
    const first = nextProgramLesson(state)
    expect(first?.id).toBe('lesson-15')
    expect(completeProgramLesson(state, first!)).toBe(state)
    state = recordAttempt(state, state.currentStage, `track:${first!.id}`, true)
    expect(completeProgramLesson(state, first!)).toBe(state)
    state = recordAttempt(state, state.currentStage, `meaning:${first!.id}`, true)
    state = completeProgramLesson(state, first!)
    expect(nextProgramLesson(state)?.id).toBe('lesson-16')
    expect(state.completedLessonIds).toContain('lesson-15')
  })
  it('keeps Blend words open until sentence-entry evidence exists and retains the completed text', () => {
    let state = createInitialState()
    state = { ...state, currentStage: 'V1' }
    const lesson = makeLesson(state)
    for (let index = 0; index < 4; index += 1) state = recordAttempt(state, 'V1', lesson.word, true)
    const next = completeLesson(state, lesson)
    expect(next.currentStage).toBe('V1')
    expect(next.completedTextIds).toContain(lesson.targetText.id)
    expect(masteryMessage(state)).toContain('more new words')
  })

  it('does not advance on weak evidence', () => {
    let state = createInitialState()
    state = { ...state, currentStage: 'V1' }
    const lesson = makeLesson(state)
    state = recordAttempt(state, 'V1', lesson.word, false)
    const next = completeLesson(state, lesson)
    expect(next.currentStage).toBe('V1')
  })

  it('does not show connected text until the V1 sentence-entry evidence exists', () => {
    let state: AppState = { ...createInitialState(), currentStage: 'V1' }
    expect(sentenceEligible(state)).toBe(false)
    for (let index = 0; index < 8; index += 1) state = recordAttempt(state, 'V1', `word-${index}`, true)
    for (let index = 0; index < 6; index += 1) state = recordAttempt(state, 'V1', `reread:word-${index}`, true)
    state = { ...state, attempts: state.attempts.map((attempt, index) => ({ ...attempt, createdAt: index < 7 ? '2026-01-01T12:00:00.000Z' : '2026-01-02T12:00:00.000Z' })) }
    expect(sentenceEligible(state)).toBe(false)
    expect(sentenceEligible(confirmPractice(state))).toBe(true)
  })

  it('selects a word from the next instructional text instead of falling back to one fixed word', () => {
    let state: AppState = { ...createInitialState(), currentStage: 'V1', completedTextIds: ['s-01'] }
    const lesson = makeLesson(state)
    expect(['man', 'van']).toContain(lesson.word)
    state = recordAttempt(state, 'V1', lesson.word, true)
    const second = makeLesson(state)
    expect(['man', 'van']).toContain(second.word)
    expect(second.word).not.toBe(lesson.word)
  })

  it('requires two passing sealed forms at least a week apart', () => {
    const state = createInitialState()
    state.assessmentResults = [
      { id: 'one', formId: 'a-01', wordErrors: 2, comprehensionCorrect: 5, recordedAt: '2026-01-01T12:00:00.000Z' },
      { id: 'two', formId: 'a-02', wordErrors: 2, comprehensionCorrect: 4, recordedAt: '2026-01-08T12:00:00.000Z' },
    ]
    expect(assessmentPassed(state)).toBe(true)
    state.assessmentResults = [
      { id: 'one', formId: 'a-01', wordErrors: 5, comprehensionCorrect: 5, recordedAt: '2026-01-01T12:00:00.000Z' },
      { id: 'two', formId: 'a-01', wordErrors: 2, comprehensionCorrect: 5, recordedAt: '2026-01-08T12:00:00.000Z' },
    ]
    expect(assessmentPassed(state)).toBe(false)
    state.assessmentResults = [
      { id: 'one', formId: 'a-01', wordErrors: 2, comprehensionCorrect: 5, recordedAt: '2026-01-01T12:00:00.000Z' },
      { id: 'two', formId: 'a-02', wordErrors: 2, comprehensionCorrect: 5, recordedAt: '2026-02-01T12:00:00.000Z' },
      { id: 'three', formId: 'a-02', wordErrors: 2, comprehensionCorrect: 5, recordedAt: '2026-02-08T12:00:00.000Z' },
    ]
    expect(assessmentPassed(state)).toBe(true)
  })
})
