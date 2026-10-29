import { useEffect, useMemo, useState } from 'react'
import { assessmentTexts, instructionalTexts, irregularWords, placementGraphemes, stages } from './data'
import { applyLearnerBaseline, approvedIrregularWords, assessmentPassed, completeLesson, completeProgramLesson, confirmPractice, createInitialState, getPlacementResult, makeLesson, makePlacementState, masteryMessage, nextProgramLesson, recordAttempt, sentenceEligible, stageLabel, stageProgress, validateCustomText } from './domain'
import { clearState, decryptExport, encryptExport, loadState, saveState, type EncryptedExport } from './storage'
import type { AppState, StageId, TextItem } from './types'
import { LessonPlayer } from './LessonPlayer'
import { lessonProgram } from './course'

type View = 'home' | 'lesson' | 'map' | 'parent' | 'placement' | 'studio' | 'privacy'

const say = (text: string, muted: boolean) => {
  if (muted || !('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.rate = 0.72
  utterance.pitch = 1.12
  window.speechSynthesis.speak(utterance)
}

const download = (name: string, data: unknown) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
}

export default function App() {
  const [state, setState] = useState<AppState | null>(null)
  const [view, setView] = useState<View>('home')
  const [parentOpen, setParentOpen] = useState(false)
  const [gateAnswer, setGateAnswer] = useState('')
  const [gateError, setGateError] = useState('')
  const [lessonStep, setLessonStep] = useState(0)
  const [lessonMessage, setLessonMessage] = useState('')
  const [voiceStatus, setVoiceStatus] = useState('')
  const [passphrase, setPassphrase] = useState('')
  const [transferMessage, setTransferMessage] = useState('')
  const [draft, setDraft] = useState('')
  const [assessmentId, setAssessmentId] = useState<string | null>(null)
  const [assessmentErrors, setAssessmentErrors] = useState(0)
  const [assessmentQuestions, setAssessmentQuestions] = useState(0)
  const [deletionNotice, setDeletionNotice] = useState('')
  const [encodingDraft, setEncodingDraft] = useState('')

  useEffect(() => {
    loadState().then((saved) => setState(saved ? applyLearnerBaseline(saved) : createInitialState()))
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/service-worker.js').catch(() => undefined)
  }, [])

  useEffect(() => {
    if (state) void saveState(state)
  }, [state])

  const lesson = useMemo(() => state ? makeLesson(state) : null, [state])
  const change = (next: AppState) => setState(next)
  const update = (patch: Partial<AppState>) => state && setState({ ...state, ...patch, updatedAt: new Date().toISOString() })

  const openParent = () => {
    if (parentOpen) return setView('parent')
    setGateError('')
    setView('parent')
  }

  const unlockParent = () => {
    if (!state) return
    if (!state.parentPin && /^\d{4,8}$/.test(gateAnswer.trim())) {
      change({ ...state, parentPin: gateAnswer.trim(), updatedAt: new Date().toISOString() })
      setParentOpen(true)
      setGateError('')
    } else if (state.parentPin && gateAnswer.trim() === state.parentPin) {
      setParentOpen(true)
      setGateError('')
    } else setGateError(state.parentPin ? 'That code did not match. Try again.' : 'Choose 4 to 8 numbers for the grown-up code.')
  }

  const startVoicePractice = async () => {
    if (!state?.voicePracticeAllowed) return setVoiceStatus('A grown-up can turn on the optional microphone in the grown-up area. You can always read to them instead.')
    if (!navigator.mediaDevices?.getUserMedia) return setVoiceStatus('This browser cannot open the microphone. A grown-up can listen instead.')
    try {
      setVoiceStatus('Listening for 3 seconds. Your voice is never saved.')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      window.setTimeout(() => {
        stream.getTracks().forEach((track) => track.stop())
        setVoiceStatus('All done. Ask a grown-up: “Did that sound like the word?”')
      }, 3000)
    } catch {
      setVoiceStatus('Microphone permission was not available. You can still read to a grown-up.')
    }
  }

  const finishPlacement = () => {
    if (!state) return
    const result = getPlacementResult(state.placement)
    change({ ...state, placement: { ...state.placement, completed: true, result }, currentStage: result, updatedAt: new Date().toISOString() })
    setView('home')
  }

  const startChildLesson = () => {
    if (!state) return
    change(applyLearnerBaseline(state))
    setLessonStep(0)
    setView('lesson')
  }

  const chooseWord = (choice: string) => {
    if (!state || !lesson) return
    const correct = choice.toLowerCase() === lesson.word.toLowerCase()
    change(recordAttempt(state, state.currentStage, lesson.word, correct))
    if (correct) {
      setLessonMessage('You put the sounds together. Nice reading!')
      setLessonStep(2)
    } else setLessonMessage('Let’s slide the sounds together slowly, then try again.')
  }

  const markReread = () => {
    if (!state || !lesson) return
    const next = recordAttempt(state, state.currentStage, `reread:${lesson.word}`, true)
    change(next)
    setLessonStep(sentenceEligible(next) ? 2 : 3)
  }

  const finishLesson = () => {
    if (!state || !lesson) return
    change(completeLesson(state, lesson))
    setLessonStep(0)
    setLessonMessage('')
    setEncodingDraft('')
    setView('home')
  }

  const submitEncoding = () => {
    if (!state || !lesson) return
    const correct = encodingDraft.trim().toLowerCase() === lesson.word
    change(recordAttempt(state, state.currentStage, `encode:${lesson.word}`, correct))
    if (correct) {
      setLessonMessage('You built the word. Nice work!')
      setLessonStep(4)
    } else setLessonMessage('Try the sound cards again, then build the word from left to right.')
  }

  const addCustomText = () => {
    if (!state) return
    const validation = validateCustomText(draft, state.currentStage)
    if (!validation.valid) return setTransferMessage(validation.message)
    const text: TextItem = { id: `home-${Date.now()}`, stage: state.currentStage, title: 'A family sentence', sentences: [draft.trim()] }
    change({ ...state, customTexts: [...state.customTexts, text], parentNotes: [...state.parentNotes, `Added a checked family sentence: ${draft.trim()}`], updatedAt: new Date().toISOString() })
    setDraft('')
    setTransferMessage('Added to the approved household pack.')
  }

  const exportHousehold = async () => {
    if (!state) return
    try {
      const payload = await encryptExport(state, passphrase)
      download('bright-steps-encrypted-export.json', payload)
      setTransferMessage('Encrypted export saved. Keep the passphrase somewhere safe; it cannot be recovered.')
      setPassphrase('')
    } catch (error) {
      setTransferMessage(error instanceof Error ? error.message : 'Export could not be created.')
    }
  }

  const importHousehold = async (file: File | undefined) => {
    if (!file) return
    try {
      const payload = JSON.parse(await file.text()) as EncryptedExport
      const next = await decryptExport(payload, passphrase)
      change({ ...next, updatedAt: new Date().toISOString() })
      setTransferMessage('Import complete. This household is ready to continue.')
      setPassphrase('')
    } catch (error) {
      setTransferMessage(error instanceof Error ? error.message : 'Import could not be read.')
    }
  }

  const deleteHousehold = async () => {
    if (!window.confirm('Delete this household from this device? This cannot be undone without an export.')) return
    try {
      const receipt = await clearState()
      setState(createInitialState())
      setParentOpen(false)
      setDeletionNotice(`Household deleted from this device. Removed ${receipt.cachesRemoved} local cache${receipt.cachesRemoved === 1 ? '' : 's'}.`)
      setView('home')
    } catch {
      setState(createInitialState())
      setParentOpen(false)
      setDeletionNotice('Household data was deleted, but cache cleanup could not be confirmed. Clear this browser’s site data to finish cleanup.')
      setView('home')
    }
  }

  const saveAssessment = () => {
    if (!state || !shownAssessment) return
    const wordErrors = Math.max(0, assessmentErrors)
    const comprehensionCorrect = Math.max(0, Math.min(5, assessmentQuestions))
    change({ ...state, assessmentResults: [...state.assessmentResults, { id: crypto.randomUUID(), formId: shownAssessment.id, wordErrors, comprehensionCorrect, recordedAt: new Date().toISOString() }], parentNotes: [...state.parentNotes, `Recorded ${shownAssessment.title}: ${wordErrors} word errors, ${comprehensionCorrect}/5 meaning answers.`], updatedAt: new Date().toISOString() })
    setAssessmentId(null)
    setAssessmentErrors(0)
    setAssessmentQuestions(0)
  }

  if (!state || !lesson) return <main className="loading">Getting Bright Steps ready…</main>

  const currentProgress = stageProgress(state, state.currentStage)
  const customValidation = validateCustomText(draft, state.currentStage)
  const shownAssessment = assessmentTexts.find((item) => item.id === assessmentId)
  const canReadSentence = sentenceEligible(state)
  const needsBuildIt = ['V2', 'V3', 'V4', 'V5'].includes(state.currentStage)
  const programLesson = nextProgramLesson(state)
  const childLesson = programLesson ?? lessonProgram[lessonProgram.length - 1]
  const isCourseReview = !programLesson

  return (
    <main className={`app theme-${state.theme} ${state.reducedMotion ? 'reduce-motion' : ''}`}>
      <header className="topbar">
        <button className="brand" onClick={() => setView('home')} aria-label="Go home"><span>✦</span><span className="sr-only">Bright Steps home</span></button>
        <div className="top-actions">
          <button className="lesson-icon top-icon" onClick={() => setView('map')} aria-label="My reading path"><span aria-hidden="true">🗺️</span><span className="sr-only">My reading path</span></button>
          <button className="lesson-icon top-icon parent-button" onClick={openParent} aria-label="Grown-up area"><span aria-hidden="true">🔒</span><span className="sr-only">Grown-up area</span></button>
        </div>
      </header>

      {view === 'home' && <section className="home-screen">
        <div className="hero-card">
          <div className="hero-copy">
            <span className="home-mascot" aria-hidden="true">🚀</span>
            <h1 className="sr-only">Hi, {state.learnerName}!</h1>
            <p className="sr-only">{isCourseReview ? 'Read your story again.' : `Lesson ${childLesson.number}: ${childLesson.title}.`}</p>
            <button className="child-play-button" onClick={startChildLesson} aria-label={isCourseReview ? 'Read your story again' : `Start lesson ${childLesson.number}`}>
              <span aria-hidden="true">▶</span><span className="sr-only">{isCourseReview ? 'Read your story again' : `Start lesson ${childLesson.number}`}</span>
            </button>
            {state.pausedForSupport && <p className="support-note">You took a break. That was a smart choice. A grown-up can help you choose what comes next.</p>}
            {deletionNotice && <p className="privacy-line">{deletionNotice}</p>}
          </div>
          <div className="hero-orb" aria-hidden="true"><div className="orb-face">◕‿◕</div><span>one step at a time</span></div>
        </div>
        <div className="home-grid">
          <section className="small-card progress-card"><span className="card-icon">◎</span><div><p className="eyebrow">Your path</p><h2>{stageLabel(state.currentStage)}</h2><p>{currentProgress.total ? `${currentProgress.accuracy}% in this step` : 'Your first try is waiting.'}</p></div><button className="text-button" onClick={() => setView('map')}>See path</button></section>
          <section className="small-card"><span className="card-icon">✦</span><div><p className="eyebrow">Your sparks</p><h2>{state.stars}</h2><p>Every careful try counts.</p></div></section>
          <section className="small-card"><span className="card-icon">☼</span><div><p className="eyebrow">Need a pause?</p><h2>You can stop.</h2><p>Stopping is always okay.</p></div><button className="text-button" onClick={() => change({ ...state, pausedForSupport: true, updatedAt: new Date().toISOString() })}>Take a break</button></section>
        </div>
      </section>}

      {view === 'map' && <section className="page map-page"><button className="back" onClick={() => setView('home')}>← Home</button><p className="eyebrow">Your reading path</p><h1>Small steps make readers.</h1><div className="path-list">{stages.map((stage, index) => { const active = stage.id === state.currentStage; const complete = index < stages.findIndex((item) => item.id === state.currentStage); return <article key={stage.id} className={`path-step ${active ? 'active' : ''} ${complete ? 'complete' : ''}`}><span>{complete ? '✓' : stage.marker}</span><div><h2>{stage.label}</h2><p>{stage.focus}</p></div>{active && <b>Here now</b>}</article> })}</div></section>}

      {view === 'placement' && <section className="page placement-page">{!parentOpen ? <div className="gate-card"><p className="eyebrow">Grown-up needed</p><h1>Ask a grown-up to open the sound check.</h1><button className="primary-button" onClick={openParent}>Go to grown-up area</button><button className="back" onClick={() => setView('home')}>← Home</button></div> : <><button className="back" onClick={() => setView('parent')}>← Parent overview</button><p className="eyebrow">Grown-up and reader together</p><h1>A tiny sound check</h1><p className="lead">Tap “I know it” only when your reader says the sound, not the letter name. This is not a test. It only helps us choose a useful first step.</p><div className="sound-grid">{placementGraphemes.map(({ letter, sound }) => { const known = state.placement.graphemeKnown[letter]; return <button key={letter} className={`sound-card ${known ? 'known' : ''}`} onClick={() => change({ ...state, placement: makePlacementState(state.placement, letter, !known), updatedAt: new Date().toISOString() })}><strong>{letter}</strong><span>{sound}</span><em>{known ? 'I know it' : 'Tap if known'}</em></button> })}</div><section className="blend-check"><h2>Can she blend these spoken sounds?</h2><p>Say each one slowly: <b>/s/ /a/ /t/</b>, <b>/m/ /a/ /p/</b>, <b>/f/ /i/ /n/</b>, <b>/r/ /u/ /n/</b>, <b>/h/ /o/ /p/</b>.</p><label>How many became whole words?<input type="number" min="0" max="5" value={state.placement.oralBlends} onChange={(event) => change({ ...state, placement: { ...state.placement, oralBlends: Math.max(0, Math.min(5, Number(event.target.value))) }, updatedAt: new Date().toISOString() })} /></label></section><section className="advance-check"><h2>Ready for a bigger first step?</h2><p>Choose this only if she already reads and builds regular 3- and 4-letter words without help. Her first lesson will be a five-sound blend word.</p><button className={`advance-choice ${state.placement.cvcFluent ? 'selected' : ''}`} onClick={() => change({ ...state, placement: { ...state.placement, cvcFluent: !state.placement.cvcFluent }, updatedAt: new Date().toISOString() })}>{state.placement.cvcFluent ? '✓ Start with bigger blend words' : 'She is ready for bigger blend words'}</button></section><button className="primary-button" onClick={finishPlacement}>Choose my first step →</button></>}</section>}

      {view === 'lesson' && <LessonPlayer lesson={childLesson} onAttempt={(prompt, correct) => change(recordAttempt(state, state.currentStage, prompt, correct))} onPause={() => { change({ ...state, pausedForSupport: true, updatedAt: new Date().toISOString() }); setView('home') }} onComplete={() => { if (programLesson) change(completeProgramLesson(state, programLesson)); setView('home') }} />}

      {view === 'parent' && <section className="page parent-page">{!parentOpen ? <div className="gate-card"><p className="eyebrow">Grown-up area</p><h1>{state.parentPin ? 'Enter the grown-up code.' : 'Choose a grown-up code.'}</h1><p className="lead">Use 4 to 8 numbers. This keeps setup, progress, and privacy controls out of the child path on this device.</p><input aria-label="Grown-up code" inputMode="numeric" value={gateAnswer} onChange={(event) => setGateAnswer(event.target.value)} /><button className="primary-button" onClick={unlockParent}>Open parent area</button>{gateError && <p className="error">{gateError}</p>}<button className="back" onClick={() => setView('home')}>← Not now</button></div> : <><button className="back" onClick={() => setView('home')}>← Child home</button><p className="eyebrow">Private household overview</p><h1>How reading is growing</h1><div className="parent-grid"><article className="parent-card"><h2>Right now</h2><b>{stageLabel(state.currentStage)}</b><p>{currentProgress.total ? `${currentProgress.correct} adult-confirmed correct answers from ${currentProgress.total} scored tries.` : 'No adult-confirmed tries yet.'}</p><button className="text-button" onClick={() => setView('placement')}>Review placement</button></article><article className="parent-card"><h2>Next helpful move</h2><p>{masteryMessage(state)}</p><button className="text-button" onClick={() => setView('map')}>See the curriculum</button></article><article className="parent-card"><h2>Recent evidence</h2><p>{state.attempts.slice(-3).map((attempt) => `${attempt.parentVerified ? '✓' : '○'} ${attempt.prompt}`).join(' · ') || 'Practice will appear here. It stays local on this device.'}</p><button className="text-button" disabled={!state.attempts.some((attempt) => !attempt.parentVerified)} onClick={() => change(confirmPractice(state))}>Confirm practice I observed</button></article></div><div className="parent-nav"><button onClick={() => setView('studio')}>Content studio</button><button onClick={() => setView('privacy')}>Privacy & data</button><button onClick={() => update({ reducedMotion: !state.reducedMotion })}>{state.reducedMotion ? 'Turn motion on' : 'Reduce motion'}</button><button onClick={() => update({ audioMuted: !state.audioMuted })}>{state.audioMuted ? 'Turn sound on' : 'Mute decorative sound'}</button><button onClick={() => update({ voicePracticeAllowed: !state.voicePracticeAllowed })}>{state.voicePracticeAllowed ? 'Turn microphone practice off' : 'Allow optional microphone practice'}</button></div>{state.currentStage === 'V6' && <><section className="assessment-card"><div><p className="eyebrow">Sentence-reader check</p><h2>Use only when she is ready for V6.</h2><p>Two sealed passages are outside daily practice. Read each one at least 7 days apart, with no hints, audio, pictures, or preview. Mark substitutions, omissions, insertions, supplied words, and pauses over 5 seconds. A self-correction before the next word counts.</p><p className="privacy-line">{assessmentPassed(state) ? 'Both sealed checks meet the sentence-reader goal.' : `${state.assessmentResults.length}/2 checks recorded. Goal: at least 95% word accuracy and 4 of 5 meaning answers on each.`}</p></div><div>{assessmentTexts.map((item) => <button key={item.id} className="text-button" onClick={() => setAssessmentId(item.id)}>Open {item.title}</button>)}</div></section>{shownAssessment && <section className="sealed-card"><p className="eyebrow">Sealed assessment</p><h2>{shownAssessment.title}</h2><p>{shownAssessment.sentences.join(' ')}</p><ol><li>Where did the trip happen?</li><li>What did the child see?</li><li>What did the child use or carry?</li><li>What happened near the end?</li><li>Tell one thing you remember.</li></ol><div className="assessment-inputs"><label>Word errors<input type="number" min="0" value={assessmentErrors} onChange={(event) => setAssessmentErrors(Number(event.target.value))} /></label><label>Meaning answers right (0–5)<input type="number" min="0" max="5" value={assessmentQuestions} onChange={(event) => setAssessmentQuestions(Number(event.target.value))} /></label></div><button className="primary-button" onClick={saveAssessment}>Save this private check</button><button className="text-button" onClick={() => setAssessmentId(null)}>Close assessment</button></section>}</>}</>}</section>}

      {view === 'studio' && parentOpen && <section className="page"><button className="back" onClick={() => setView('parent')}>← Parent overview</button><p className="eyebrow">Parent content studio</p><h1>Add one checked household sentence.</h1><p className="lead">This validator only admits words already approved in the current local pack. It does not publish to anyone else.</p><textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Write one simple sentence." /><p className={customValidation.valid ? 'valid' : 'privacy-line'}>{draft ? customValidation.message : 'Write a sentence to check it.'}</p><button className="primary-button" disabled={!customValidation.valid} onClick={addCustomText}>Add checked sentence</button>{transferMessage && <p className="privacy-line">{transferMessage}</p>}<section className="word-bank"><h2>Words approved at this step</h2><p>{approvedIrregularWords(state.currentStage).join(' · ') || 'Irregular words come after the first sound work.'}</p><h2>Full 25-word review list</h2><p>{irregularWords.join(' · ')}</p><h2>Household additions</h2><p>{state.customTexts.length ? state.customTexts.map((item) => item.sentences[0]).join(' · ') : 'None yet.'}</p></section></section>}

      {view === 'privacy' && parentOpen && <section className="page privacy-page"><button className="back" onClick={() => setView('parent')}>← Parent overview</button><p className="eyebrow">Privacy and portability</p><h1>This household stays on this device.</h1><div className="privacy-grid"><article><h2>What is kept</h2><p>Local progress, placement choices, local content, and parent notes. Audio is not stored.</p></article><article><h2>What is not used</h2><p>No child account, ads, trackers, cloud sync, or automatic speech scoring.</p></article><article><h2>Export and import</h2><p>Exports are encrypted with your passphrase using Argon2id and AES-GCM. The passphrase is never stored.</p></article></div><label className="passphrase">Export/import passphrase<input type="password" value={passphrase} onChange={(event) => setPassphrase(event.target.value)} placeholder="At least 10 characters" /></label><div className="transfer-row"><button className="primary-button" onClick={exportHousehold}>Download encrypted export</button><label className="file-button">Import encrypted export<input type="file" accept="application/json" onChange={(event) => importHousehold(event.target.files?.[0])} /></label></div>{transferMessage && <p className="privacy-line">{transferMessage}</p>}<button className="danger-button" onClick={deleteHousehold}>Delete this household from this device</button></section>}
    </main>
  )
}
