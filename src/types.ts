export type StageId = 'V0' | 'V1' | 'V2' | 'V3' | 'V4' | 'V5' | 'V6'

export type Attempt = {
  id: string
  stage: StageId
  prompt: string
  correct: boolean
  hinted: boolean
  parentVerified: boolean
  createdAt: string
}

export type TextItem = {
  id: string
  stage: StageId
  title: string
  sentences: string[]
  assessment?: boolean
}

export type AssessmentResult = {
  id: string
  formId: string
  wordErrors: number
  comprehensionCorrect: number
  recordedAt: string
}

export type Placement = {
  graphemeKnown: Record<string, boolean>
  oralBlends: number
  cvcFluent?: boolean
  completed?: boolean
  result?: StageId
}

export type AppState = {
  schema: 1
  learnerName: string
  currentStage: StageId
  attempts: Attempt[]
  placement: Placement
  completedTextIds: string[]
  completedLessonIds: string[]
  stars: number
  pausedForSupport: boolean
  theme: 'sunrise' | 'ocean' | 'forest'
  audioMuted: boolean
  voicePracticeAllowed: boolean
  parentPin?: string
  reducedMotion: boolean
  customTexts: TextItem[]
  parentNotes: string[]
  assessmentResults: AssessmentResult[]
  updatedAt: string
}

export type Lesson = {
  word: string
  choices: string[]
  sentence: string
  targetText: TextItem
}

export type ProgramLesson = {
  id: string
  number: number
  stage: StageId
  title: string
  objective: string
  target: string
  soundParts: string[]
  sentence: string
  question: string
  answer: string
  options: string[]
}
