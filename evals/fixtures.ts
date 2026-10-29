import type { StageId } from '../src/types'

/**
 * This oracle is deliberately separate from src/course.ts. It is a manually
 * reviewed record of the released lesson contracts, not a generated mirror of
 * the implementation. It is an internal implementation-independent check,
 * not a substitute for review by a reading specialist.
 */
export type LessonContractFixture = {
  id: string
  stage: StageId
  target: string
  sentence: string
  question: string
  answer: string
}

export const lessonContractFixtures: LessonContractFixture[] = [
  { id: 'lesson-01', stage: 'V1', target: 'map', sentence: 'Sam has a map.', question: 'What does Sam have?', answer: 'a map' },
  { id: 'lesson-02', stage: 'V1', target: 'sam', sentence: 'Sam sat.', question: 'Who sat?', answer: 'Sam' },
  { id: 'lesson-03', stage: 'V1', target: 'stamp', sentence: 'A stamp is on a map.', question: 'What is on the map?', answer: 'a stamp' },
  { id: 'lesson-04', stage: 'V1', target: 'fin', sentence: 'A fin is in a fish.', question: 'What is in the fish?', answer: 'a fin' },
  { id: 'lesson-05', stage: 'V1', target: 'mop', sentence: 'A mop is on a mat.', question: 'Where is the mop?', answer: 'on a mat' },
  { id: 'lesson-06', stage: 'V1', target: 'fan', sentence: 'A fan is on.', question: 'What is on?', answer: 'a fan' },
  { id: 'lesson-07', stage: 'V1', target: 'sip', sentence: 'Sam can sip.', question: 'What can Sam do?', answer: 'sip' },
  { id: 'lesson-08', stage: 'V1', target: 'van', sentence: 'Sam is in a van.', question: 'Where is Sam?', answer: 'in a van' },
  { id: 'lesson-09', stage: 'V2', target: 'hen', sentence: 'A red hen can hop.', question: 'What can the hen do?', answer: 'hop' },
  { id: 'lesson-10', stage: 'V2', target: 'tub', sentence: 'A fish is in a tub.', question: 'Where is the fish?', answer: 'in a tub' },
  { id: 'lesson-11', stage: 'V2', target: 'bed', sentence: 'Tim has a red bed.', question: 'What color is the bed?', answer: 'red' },
  { id: 'lesson-12', stage: 'V2', target: 'cap', sentence: 'A cap is in a bag.', question: 'Where is the cap?', answer: 'in a bag' },
  { id: 'lesson-13', stage: 'V2', target: 'jet', sentence: 'A jet is in a box.', question: 'Where is the jet?', answer: 'in a box' },
  { id: 'lesson-14', stage: 'V2', target: 'bug', sentence: 'A bug can run.', question: 'What can the bug do?', answer: 'run' },
  { id: 'lesson-15', stage: 'V3', target: 'stamp', sentence: 'A stamp is on a map.', question: 'What is on the map?', answer: 'a stamp' },
  { id: 'lesson-16', stage: 'V3', target: 'sand', sentence: 'A nest is in the sand.', question: 'Where is the nest?', answer: 'in the sand' },
  { id: 'lesson-17', stage: 'V3', target: 'camp', sentence: 'We can camp in a tent.', question: 'Where can we camp?', answer: 'in a tent' },
  { id: 'lesson-18', stage: 'V3', target: 'nest', sentence: 'A nest is at a pond.', question: 'Where is the nest?', answer: 'at a pond' },
  { id: 'lesson-19', stage: 'V3', target: 'jump', sentence: 'A frog can jump.', question: 'What can the frog do?', answer: 'jump' },
  { id: 'lesson-20', stage: 'V4', target: 'slip', sentence: 'A crab can slip.', question: 'What can the crab do?', answer: 'slip' },
  { id: 'lesson-21', stage: 'V4', target: 'flag', sentence: 'A flag can flap.', question: 'What can the flag do?', answer: 'flap' },
  { id: 'lesson-22', stage: 'V4', target: 'grab', sentence: 'Tim can grab a map.', question: 'What can Tim grab?', answer: 'a map' },
  { id: 'lesson-23', stage: 'V4', target: 'frog', sentence: 'A frog is at a pond.', question: 'Where is the frog?', answer: 'at a pond' },
  { id: 'lesson-24', stage: 'V5', target: 'ship', sentence: 'She can see a ship.', question: 'What can she see?', answer: 'a ship' },
  { id: 'lesson-25', stage: 'V5', target: 'chip', sentence: 'A chip is in a box.', question: 'Where is the chip?', answer: 'in a box' },
  { id: 'lesson-26', stage: 'V5', target: 'thick', sentence: 'The stick is thick.', question: 'What is thick?', answer: 'the stick' },
  { id: 'lesson-27', stage: 'V5', target: 'stick', sentence: 'Tim can drag a stick.', question: 'What can Tim drag?', answer: 'a stick' },
  { id: 'lesson-28', stage: 'V5', target: 'shell', sentence: 'She has a shell.', question: 'What does she have?', answer: 'a shell' },
  { id: 'lesson-29', stage: 'V6', target: 'pond', sentence: 'Sam is at a pond. Sam can see a fish. The fish can swim.', question: 'What can Sam see?', answer: 'a fish' },
  { id: 'lesson-30', stage: 'V6', target: 'tent', sentence: 'We can camp in a red tent. Tim has a map. It is fun.', question: 'What does Tim have?', answer: 'a map' },
  { id: 'lesson-31', stage: 'V6', target: 'crab', sentence: 'A crab is in a pond. The crab can grab a snack.', question: 'What can the crab grab?', answer: 'a snack' },
  { id: 'lesson-32', stage: 'V6', target: 'ship', sentence: 'She can see a ship. The ship has a big flag. A fish can swim at the ship.', question: 'What does the ship have?', answer: 'a big flag' },
  { id: 'lesson-33', stage: 'V6', target: 'shell', sentence: 'She has a shell in a box. She can see the shell. The shell is big.', question: 'Where is the shell?', answer: 'in a box' },
  { id: 'lesson-34', stage: 'V6', target: 'map', sentence: 'Tim can camp at a pond. Tim has a map. We can see a frog jump.', question: 'What does Tim have?', answer: 'a map' },
]

/** Held-out prompts are never sent to a grader: the app has no free-response
 * comprehension component. They make that missing boundary explicit. */
export const heldOutTransferFixtures = [
  { id: 'transfer-01', text: 'A crab can swim at a pond.', question: 'Where can the crab swim?', answer: 'at a pond' },
  { id: 'transfer-02', text: 'Tim has a red flag in a tent.', question: 'What color is the flag?', answer: 'red' },
  { id: 'transfer-03', text: 'She can see a fish jump.', question: 'What can she see?', answer: 'a fish' },
] as const

export const rubricMetadata = {
  id: 'bright-steps-deterministic-rubric-v1',
  source: 'Manually authored evaluation fixture; expectations do not import from src/course.ts.',
  reviewedBoundary: 'Lesson identity, stage, prompt, literal question, expected answer, and option membership only.',
  excluded: 'Pedagogy efficacy, oral-reading quality, child comprehension, and specialist review.',
} as const
