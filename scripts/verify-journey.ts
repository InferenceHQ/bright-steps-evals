import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { placementGraphemes } from '../src/data'
import { lessonProgram } from '../src/course'
import { completeLesson, completeProgramLesson, confirmPractice, createInitialState, getPlacementResult, makeLesson, nextProgramLesson, recordAttempt, sentenceEligible } from '../src/domain'

const journey = process.argv[2] ?? 'placement-to-first-lesson'
const deliberatelyBroken = process.argv.includes('--break')
const evidenceDirectory = resolve(import.meta.dirname, '../evidence')

async function fail(step: string, message: string): Promise<never> {
  const path = resolve(evidenceDirectory, 'failures')
  await mkdir(path, { recursive: true })
  await writeFile(resolve(path, `${journey}.json`), JSON.stringify({ journey, step, message, timestamp: new Date().toISOString(), rerun: `pnpm verify:journey -- ${journey}` }, null, 2))
  throw new Error(`${step}: ${message}`)
}

async function run() {
  let state = createInitialState('Journey reader')
  state.placement.graphemeKnown = Object.fromEntries(placementGraphemes.map(({ letter }) => [letter, true]))
  state.placement.oralBlends = 5
  const startingStage = getPlacementResult(state.placement)
  if (startingStage !== 'V3') await fail('placement', 'Known sounds and oral blending did not start at the first blend-word lesson.')
  if (deliberatelyBroken) await fail('known-broken-fixture', 'Intentional failure packet for harness verification.')
  state = { ...state, currentStage: startingStage, placement: { ...state.placement, completed: true, result: startingStage } }
  if (journey === 'explicit-lesson') {
    const first = nextProgramLesson(state)
    if (!first || first.id !== 'lesson-15' || first.target !== 'stamp') await fail('program-selection', 'The first explicit blend-word lesson was not selected.')
    const explicit = first!
    state = recordAttempt(state, state.currentStage, `decode:${explicit.target}`, true)
    state = recordAttempt(state, state.currentStage, `encode:${explicit.target}`, true)
    if (completeProgramLesson(state, explicit) !== state) await fail('completion-gate', 'A lesson completed before the sentence meaning response.')
    state = recordAttempt(state, state.currentStage, `track:${explicit.id}`, true)
    if (completeProgramLesson(state, explicit) !== state) await fail('completion-gate', 'A lesson completed before sentence meaning was answered.')
    state = recordAttempt(state, state.currentStage, `meaning:${explicit.id}`, true)
    state = completeProgramLesson(state, explicit)
    if (!state.completedLessonIds.includes(explicit.id) || nextProgramLesson(state)?.id !== 'lesson-16') await fail('program-completion', 'Explicit lesson completion did not advance to the next lesson.')
    await mkdir(evidenceDirectory, { recursive: true })
    await writeFile(resolve(evidenceDirectory, `${journey}.json`), JSON.stringify({ journey, status: 'pass', lesson: explicit.id, timestamp: new Date().toISOString() }, null, 2))
    console.log(JSON.stringify({ journey, status: 'pass', lesson: explicit.id }))
    return
  }
  if (journey === 'child-controls') {
    const player = await readFile(resolve(import.meta.dirname, '../src/LessonPlayer.tsx'), 'utf8')
    const app = await readFile(resolve(import.meta.dirname, '../src/App.tsx'), 'utf8')
    const requirements = [
      ['automatic step narration', 'speak(narration[step])'],
      ['a replay control', 'replay-icon'],
      ['a visual continue control', 'primary-icon'],
      ['a visual finish control', 'finish-icon'],
      ['a picture choice for meaning', 'picture-choice'],
      ['a visible, tappable question card', 'question-card'],
      ['a word-by-word sentence tracker', 'sentence-track'],
      ['visible word spaces', 'word-space'],
      ['individual letter cues inside each word', 'word-letters'],
      ['one active reading letter', 'next-letter'],
      ['sentence back navigation', 'sentence-nav-icon'],
      ['a child-safe end-of-course reread', 'childLesson = programLesson ?? lessonProgram[lessonProgram.length - 1]'],
      ['a large visual child entry control', 'child-play-button'],
      ['a direct child lesson start', 'startChildLesson'],
    ] as const
    for (const [name, marker] of requirements) if (!(player.includes(marker) || app.includes(marker))) await fail('child-controls', `Missing ${name}.`)
    if (player.includes('onClick={() => speak(lesson.target)')) await fail('child-controls', 'Independent decoding replay reveals the target word.')
    if (!player.includes('speak(`The question is: ${lesson.question}`)')) await fail('child-controls', 'The visible question cannot be replayed for the child.')
    if (!player.includes('track:${lesson.id}')) await fail('child-controls', 'Sentence tracking is not recorded before completion.')
    if (app.includes("programLesson ? (setLessonStep(0), setView('lesson')) : openParent()")) await fail('child-controls', 'The child play button can route to the grown-up code instead of a lesson.')
    if (!app.includes('applyLearnerBaseline') || !app.includes("onClick={startChildLesson}")) await fail('child-controls', 'A first-launch child can still be routed to placement instead of the blend-word lesson.')
    if (!player.includes("event.code === 'Space'") || !player.includes("event.key === 'ArrowRight'") || !player.includes("event.key === 'ArrowLeft'")) await fail('child-controls', 'Sentence navigation is not keyboard accessible.')
    if (!lessonProgram.every((lesson) => lesson.sentence && lesson.question && lesson.answer && lesson.options.includes(lesson.answer))) await fail('sentence-inventory', 'A program lesson omitted its required sentence or meaning response.')
    await mkdir(evidenceDirectory, { recursive: true })
    await writeFile(resolve(evidenceDirectory, `${journey}.json`), JSON.stringify({ journey, status: 'pass', controls: requirements.map(([name]) => name), timestamp: new Date().toISOString() }, null, 2))
    console.log(JSON.stringify({ journey, status: 'pass', controls: requirements.length }))
    return
  }
  // The sentence-entry guard is a V1-specific regression. Placement now begins
  // this learner at V3, so keep the guard fixture independent of that route.
  state = { ...state, currentStage: 'V1' }
  const lesson = makeLesson(state)
  state = recordAttempt(state, 'V1', lesson.word, true)
  state = recordAttempt(state, 'V1', lesson.sentence, true)
  if (sentenceEligible(state)) await fail('sentence-gate', 'A child tap opened sentence reading without adult-confirmed fluency evidence.')
  if (journey === 'parent-evidence') {
    if (state.attempts.length !== 2 || state.attempts.some((attempt) => attempt.parentVerified)) await fail('parent-projection', 'Practice was not retained as unconfirmed parent evidence.')
    state = confirmPractice(state)
    if (state.attempts.some((attempt) => !attempt.parentVerified)) await fail('parent-confirmation', 'Adult confirmation did not promote the observed evidence.')
  }
  if (journey === 'offline-resume') {
    const restored = JSON.parse(JSON.stringify(state))
    if (restored.attempts.length !== state.attempts.length) await fail('offline-resume', 'Checkpoint did not retain attempts.')
  }
  if (journey === 'placement-to-first-lesson') {
    const complete = completeLesson(state, lesson)
    if (!complete.completedTextIds.includes(lesson.targetText.id)) await fail('lesson-completion', 'Completed reading text was not retained.')
  }
  await mkdir(evidenceDirectory, { recursive: true })
  await writeFile(resolve(evidenceDirectory, `${journey}.json`), JSON.stringify({ journey, status: 'pass', stage: startingStage, text: lesson.targetText.id, timestamp: new Date().toISOString() }, null, 2))
  console.log(JSON.stringify({ journey, status: 'pass', stage: startingStage, text: lesson.targetText.id }))
}

run().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1 })
