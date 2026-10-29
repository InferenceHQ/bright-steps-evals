import { useEffect, useMemo, useState } from 'react'
import type { ProgramLesson } from './types'

type Props = {
  lesson: ProgramLesson
  onAttempt: (prompt: string, correct: boolean) => void
  onComplete: () => void
  onPause: () => void
}

const speak = (text: string) => {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const message = new SpeechSynthesisUtterance(text)
  message.rate = 0.7
  message.pitch = 1.05
  window.speechSynthesis.speak(message)
}

const pictureWords: Record<string, string> = {
  sam: '🧒', tim: '🧑', she: '👧', we: '👫',
  stamp: '🏷️', map: '🗺️', ram: '🐏', van: '🚐', fin: '🐟', fish: '🐟', mop: '🧹', mat: '🟫', fan: '🌀',
  hen: '🐔', tub: '🛁', bed: '🛏️', cap: '🧢', jet: '✈️', bug: '🐞',
  sand: '🏖️', nest: '🪺', camp: '⛺', tent: '⛺', pond: '🪷', frog: '🐸', crab: '🦀', flag: '🚩',
  ship: '🚢', chip: '🥔', stick: '🪵', shell: '🐚', snack: '🍎', box: '📦',
  swim: '🏊', jump: '🤸', run: '🏃', slip: '🛝', grab: '✋', see: '👀',
}

const pictureHint = (sentence: string, target: string) => {
  const words = sentence.toLowerCase().match(/[a-z]+/g) ?? []
  return [...new Set([target, ...words].map((word) => pictureWords[word]).filter(Boolean))].slice(0, 5)
}

const optionPicture = (option: string) => {
  const words = option.toLowerCase().match(/[a-z]+/g) ?? []
  return words.map((word) => pictureWords[word]).find(Boolean) ?? '❔'
}

export function LessonPlayer({ lesson, onAttempt, onComplete, onPause }: Props) {
  const [step, setStep] = useState(0)
  const [chosen, setChosen] = useState<number[]>([])
  const [feedback, setFeedback] = useState('')
  const [meaningAnswer, setMeaningAnswer] = useState('')
  const [showPictureHint, setShowPictureHint] = useState(false)
  const [sentenceLetterIndex, setSentenceLetterIndex] = useState(0)
  const [sentenceReadRecorded, setSentenceReadRecorded] = useState(false)
  const tiles = useMemo(() => lesson.target.split('').sort((a, b) => (a > b ? -1 : 1)), [lesson.target])
  const built = chosen.map((index) => tiles[index]).join('')
  const sentenceWords = useMemo(() => lesson.sentence.match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) ?? [], [lesson.sentence])
  const sentenceStop = useMemo(() => lesson.sentence.trim().match(/[.!?]$/)?.[0] ?? '', [lesson.sentence])
  const sentenceLetterCount = useMemo(() => sentenceWords.reduce((total, word) => total + [...word].length, 0), [sentenceWords])
  const sentenceTracked = sentenceLetterIndex === sentenceLetterCount
  const visualTokens = useMemo(() => pictureHint(lesson.sentence, lesson.target), [lesson.sentence, lesson.target])
  const narration = useMemo(() => [
    `Listen. Today's sounds are ${lesson.soundParts.join(', ')}. When you are ready, tap the arrow.`,
    `Watch and listen. The sounds slide together to make ${lesson.target}. Tap the arrow when you are ready to try.`,
    `Your turn. Listen to the sounds: ${lesson.soundParts.join(', ')}. Touch the word they make.`,
    'Build the word you just read. Touch the sound tiles in order, then tap the check mark.',
    'Read the shiny letter. Tap the word or the arrow to move to the next letter. The big gaps are spaces.',
    'You did it! Tap the star to finish your lesson.',
  ], [lesson])

  useEffect(() => {
    const timer = window.setTimeout(() => speak(narration[step]), 180)
    return () => window.clearTimeout(timer)
  }, [narration, step])

  const advanceAfterFeedback = (message: string, nextStep: number) => {
    setFeedback(message)
    speak(message)
    window.setTimeout(() => setStep(nextStep), 1050)
  }

  const chooseWord = (word: string) => {
    const correct = word === lesson.target
    onAttempt(`decode:${lesson.target}`, correct)
    if (correct) advanceAfterFeedback('Yes! You put the sounds together.', 3)
    else {
      const message = 'Try again. Touch each sound with your eyes, then slide them together.'
      setFeedback(message)
      speak(message)
    }
  }

  const checkBuild = () => {
    const correct = built === lesson.target
    onAttempt(`encode:${lesson.target}`, correct)
    if (correct) advanceAfterFeedback('You built it from its sounds!', 4)
    else {
      const message = 'Try again. The first sound comes first.'
      setFeedback(message)
      speak(message)
    }
  }

  const checkMeaning = (answer: string) => {
    const correct = answer === lesson.answer
    setMeaningAnswer(answer)
    onAttempt(`meaning:${lesson.id}`, correct)
    if (correct) advanceAfterFeedback('Yes! You read it and understood it.', 5)
    else {
      const message = 'Try once more. Read the sentence again, then choose a picture.'
      setFeedback(message)
      speak(message)
    }
  }

  const advanceSentence = () => {
    if (sentenceTracked) return
    const nextIndex = sentenceLetterIndex + 1
    setSentenceLetterIndex(nextIndex)
    if (nextIndex === sentenceLetterCount && !sentenceReadRecorded) {
      setSentenceReadRecorded(true)
      onAttempt(`track:${lesson.id}`, true)
      speak(`Nice reading. The question is: ${lesson.question}. Tap the question card to hear it again, then choose a picture.`)
    }
  }

  const goBackInSentence = () => setSentenceLetterIndex((index) => Math.max(0, index - 1))

  useEffect(() => {
    if (step !== 4 || sentenceTracked) return
    const handleReadingKey = (event: KeyboardEvent) => {
      if (event.code === 'Space' || event.key === 'ArrowRight') {
        event.preventDefault()
        advanceSentence()
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        goBackInSentence()
      }
    }
    window.addEventListener('keydown', handleReadingKey)
    return () => window.removeEventListener('keydown', handleReadingKey)
  }, [sentenceLetterIndex, sentenceTracked, step])

  return <section className="lesson-page explicit-lesson" aria-label={`Lesson ${lesson.number}`}>
    <div className="lesson-progress">
      <span className="sr-only">Lesson {lesson.number}, step {step + 1} of 6</span>
      <div aria-hidden="true"><i style={{ width: `${((step + 1) / 6) * 100}%` }} /></div>
      <button className="lesson-icon pause-icon" onClick={onPause} aria-label="Take a break"><span aria-hidden="true">☁️</span><span className="sr-only">Take a break</span></button>
    </div>
    <article className="lesson-card">
      {step === 0 && <>
        <span className="step-icon" aria-hidden="true">👂</span><h1 className="sr-only">Warm up</h1>
        <div className="word-display" aria-label={`Today's sounds: ${lesson.soundParts.join(', ')}`}>{lesson.soundParts.map((sound, index) => <span key={`${sound}-${index}`}>{sound}</span>)}</div>
        <button className="lesson-icon replay-icon" onClick={() => speak(narration[0])} aria-label="Hear the directions again"><span aria-hidden="true">🔊</span><span className="sr-only">Hear again</span></button>
        <button className="lesson-icon primary-icon" onClick={() => setStep(1)} aria-label="Continue"><span aria-hidden="true">➜</span><span className="sr-only">Continue</span></button>
      </>}
      {step === 1 && <>
        <span className="step-icon" aria-hidden="true">🌈</span><h1 className="sr-only">Watch the sounds slide together</h1>
        <div className="blend-rail" aria-label={`${lesson.soundParts.join(', ')} makes ${lesson.target}`}>{lesson.soundParts.map((sound, index) => <span key={`${sound}-${index}`}>{sound}</span>)}<b>→ {lesson.target}</b></div>
        <button className="lesson-icon replay-icon" onClick={() => speak(`${lesson.soundParts.join(', ')}, ${lesson.target}`)} aria-label="Hear the sound slide again"><span aria-hidden="true">🔊</span><span className="sr-only">Hear the sound slide again</span></button>
        <button className="lesson-icon primary-icon" onClick={() => setStep(2)} aria-label="Try it"><span aria-hidden="true">➜</span><span className="sr-only">Try it</span></button>
      </>}
      {step === 2 && <>
        <span className="step-icon" aria-hidden="true">🗣️</span><h1 className="sr-only">Which word did you make?</h1>
        <div className="sound-prompt" aria-hidden="true">{lesson.soundParts.map((sound, index) => <span key={`${sound}-${index}`}>{sound}</span>)}</div>
        <div className="choice-row">{[lesson.target, 'map', 'sun'].filter((word, index, list) => list.indexOf(word) === index).map((word) => <button key={word} className="word-choice" onClick={() => chooseWord(word)} aria-label={`Choose ${word}`}>{word}</button>)}</div>
        {feedback && <p className="lesson-message" aria-live="polite">{feedback}</p>}
        <button className="lesson-icon replay-icon" onClick={() => speak(narration[2])} aria-label="Hear the sounds again"><span aria-hidden="true">🔊</span><span className="sr-only">Hear the sounds again</span></button>
      </>}
      {step === 3 && <>
        <span className="step-icon" aria-hidden="true">🧩</span><h1 className="sr-only">Build the word</h1>
        <div className="tile-row">{tiles.map((tile, index) => <button key={`${tile}-${index}`} className="sound-tile" disabled={chosen.includes(index)} onClick={() => setChosen([...chosen, index])} aria-label={`Add ${tile}`}>{tile}</button>)}</div>
        <div className="built-word" aria-label={built ? `You built ${built}` : 'No letters chosen yet'}>{built || '—'}</div>
        <div className="lesson-actions">
          <button className="lesson-icon reset-icon" onClick={() => setChosen([])} aria-label="Start the word over"><span aria-hidden="true">↺</span><span className="sr-only">Start over</span></button>
          <button className="lesson-icon primary-icon" disabled={built.length !== lesson.target.length} onClick={checkBuild} aria-label="Check my word"><span aria-hidden="true">✓</span><span className="sr-only">Check my word</span></button>
        </div>
        {feedback && <p className="lesson-message" aria-live="polite">{feedback}</p>}
        <button className="lesson-icon replay-icon" onClick={() => speak(narration[3])} aria-label="Hear the directions again"><span aria-hidden="true">🔊</span><span className="sr-only">Hear again</span></button>
      </>}
      {step === 4 && <>
        <span className="step-icon" aria-hidden="true">📖</span><h1 className="sr-only">Read the sentence aloud, touching each word from left to right</h1>
        <div className="sentence-track" aria-label={lesson.sentence}>
          {sentenceWords.map((word, wordIndex) => {
            const wordStart = sentenceWords.slice(0, wordIndex).reduce((total, earlierWord) => total + [...earlierWord].length, 0)
            const currentLetter = sentenceLetterIndex - wordStart
            const wordComplete = sentenceLetterIndex >= wordStart + [...word].length
            const wordCurrent = currentLetter >= 0 && currentLetter < [...word].length
            return <span className="sentence-word-step" key={`${word}-${wordIndex}`}>
              {wordIndex > 0 && <span className="word-space" aria-hidden="true" />}
              <button className={wordComplete ? 'read-word complete' : wordCurrent ? 'read-word current' : 'read-word'} disabled={!wordCurrent} onClick={advanceSentence} aria-label={wordCurrent ? `${word}. Read the highlighted letter next.` : word}>
                <span className="word-letters" aria-hidden="true">{[...word].map((letter, letterIndex) => <span className={letterIndex === currentLetter ? 'read-letter next-letter' : 'read-letter'} key={`${letter}-${letterIndex}`}>{letter}</span>)}</span>
              </button>
            </span>
          })}
          {sentenceStop && <span className="sentence-stop" aria-hidden="true">{sentenceStop}</span>}
        </div>
        <div className="sentence-navigation" aria-label="Sentence reading navigation">
          <button className="lesson-icon sentence-nav-icon" disabled={sentenceLetterIndex === 0} onClick={goBackInSentence} aria-label="Read the previous letter"><span aria-hidden="true">←</span><span className="sr-only">Read the previous letter</span></button>
          <button className="lesson-icon sentence-nav-icon primary-icon" disabled={sentenceTracked} onClick={advanceSentence} aria-label="Read the next letter"><span aria-hidden="true">→</span><span className="sr-only">Read the next letter</span></button>
        </div>
        {!sentenceTracked && <div className="read-gate" aria-live="polite"><span aria-hidden="true">👆 👀 🗣️</span><span className="sr-only">Touch each word as you read it aloud.</span></div>}
        {sentenceTracked && <>
          <button className="lesson-icon hint-icon" onClick={() => setShowPictureHint(!showPictureHint)} aria-label={showPictureHint ? 'Hide picture clue' : 'Show picture clue'}><span aria-hidden="true">{showPictureHint ? '🙈' : '🖼️'}</span><span className="sr-only">{showPictureHint ? 'Hide picture clue' : 'Show picture clue'}</span></button>
          {showPictureHint && <div className="picture-hint" role="img" aria-label={`A cartoon clue for: ${lesson.sentence}`}><img src="/hints/storybook-scene.png" alt="" /><div className="picture-stickers">{visualTokens.map((token, index) => <span key={`${token}-${index}`}>{token}</span>)}</div></div>}
          <button className="question-card" onClick={() => speak(`The question is: ${lesson.question}`)} aria-label={`Hear the question again: ${lesson.question}`}><span aria-hidden="true">❓</span><span>{lesson.question}</span><span aria-hidden="true">🔊</span></button>
          <div className="choice-row picture-choice-row">{lesson.options.map((option) => <button key={option} className={`word-choice picture-choice ${meaningAnswer === option ? 'selected' : ''}`} onClick={() => checkMeaning(option)} aria-label={`Choose: ${option}`}><span aria-hidden="true">{optionPicture(option)}</span><small>{option}</small></button>)}</div>
        </>}
        {feedback && <p className="lesson-message" aria-live="polite">{feedback}</p>}
        <button className="lesson-icon replay-icon" onClick={() => speak(narration[4])} aria-label="Hear the directions again"><span aria-hidden="true">🔊</span><span className="sr-only">Hear again</span></button>
      </>}
      {step === 5 && <>
        <span className="step-icon celebration-icon" aria-hidden="true">⭐</span><h1 className="sr-only">You did it</h1><div className="celebration" aria-hidden="true">✦ ✦ ✦</div>
        <button className="lesson-icon finish-icon" onClick={onComplete} aria-label="Finish lesson"><span aria-hidden="true">⭐</span><span className="sr-only">Finish lesson</span></button>
      </>}
    </article>
  </section>
}
