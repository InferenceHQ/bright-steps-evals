import { argon2id } from '@noble/hashes/argon2'
import { validateCustomText } from './domain'
import type { AppState } from './types'

const validStages = new Set(['V0', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'])

export function assertValidState(value: unknown): asserts value is AppState {
  const state = value as Partial<AppState> | null
  if (!state || typeof state !== 'object' || state.schema !== 1 || typeof state.learnerName !== 'string' || !validStages.has(state.currentStage ?? '') || !Array.isArray(state.attempts) || !state.placement || !Array.isArray(state.completedTextIds) || !Array.isArray(state.completedLessonIds) || !Array.isArray(state.customTexts) || !Array.isArray(state.parentNotes) || !Array.isArray(state.assessmentResults)) throw new Error('This export has an invalid household record.')
  if (state.attempts.some((attempt) => !attempt || typeof attempt.prompt !== 'string' || !validStages.has(attempt.stage) || typeof attempt.correct !== 'boolean' || typeof attempt.hinted !== 'boolean' || typeof attempt.parentVerified !== 'boolean' || typeof attempt.createdAt !== 'string')) throw new Error('This export has invalid practice evidence.')
  if (state.customTexts.some((item) => !item || typeof item.id !== 'string' || typeof item.title !== 'string' || !validStages.has(item.stage) || !Array.isArray(item.sentences) || item.sentences.length !== 1 || typeof item.sentences[0] !== 'string' || !validateCustomText(item.sentences[0], item.stage).valid)) throw new Error('This export has invalid household content.')
  if (state.assessmentResults.some((result) => !result || typeof result.formId !== 'string' || !Number.isInteger(result.wordErrors) || result.wordErrors < 0 || !Number.isInteger(result.comprehensionCorrect) || result.comprehensionCorrect < 0 || result.comprehensionCorrect > 5 || typeof result.recordedAt !== 'string')) throw new Error('This export has invalid assessment evidence.')
}

function normaliseState(value: unknown): AppState {
  const raw = value as Partial<AppState> | null
  const state = {
    ...raw,
    attempts: (raw?.attempts ?? []).map((attempt) => ({ ...attempt, parentVerified: Boolean(attempt.parentVerified) })),
    completedLessonIds: raw?.completedLessonIds ?? [],
    assessmentResults: raw?.assessmentResults ?? [],
    voicePracticeAllowed: Boolean(raw?.voicePracticeAllowed),
  }
  assertValidState(state)
  return state
}

const DB_NAME = 'bright-steps-reading'
const STORE = 'household'
const KEY = 'sole-learner'
const fallbackKey = 'bright-steps-state'

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function loadState(): Promise<AppState | null> {
  try {
    const db = await openDatabase()
    const value = await new Promise<AppState | undefined>((resolve, reject) => {
      const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY)
      request.onsuccess = () => resolve(request.result as AppState | undefined)
      request.onerror = () => reject(request.error)
    })
    db.close()
    return value ? normaliseState(value) : null
  } catch {
    const value = localStorage.getItem(fallbackKey)
    return value ? normaliseState(JSON.parse(value)) : null
  }
}

export async function saveState(state: AppState): Promise<void> {
  try {
    const db = await openDatabase()
    await new Promise<void>((resolve, reject) => {
      const request = db.transaction(STORE, 'readwrite').objectStore(STORE).put(state, KEY)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
    db.close()
  } catch {
    localStorage.setItem(fallbackKey, JSON.stringify(state))
  }
}

export async function clearState(): Promise<{ cachesRemoved: number }> {
  try {
    const db = await openDatabase()
    await new Promise<void>((resolve, reject) => {
      const request = db.transaction(STORE, 'readwrite').objectStore(STORE).clear()
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
    db.close()
  } catch {
    localStorage.removeItem(fallbackKey)
    throw new Error('Primary device storage could not be cleared. The household may still remain on this device.')
  } finally {
    localStorage.removeItem(fallbackKey)
  }
  let cachesRemoved = 0
  if ('caches' in window) {
    const keys = await caches.keys()
    await Promise.all(keys.map(async (key) => { if (await caches.delete(key)) cachesRemoved += 1 }))
  }
  return { cachesRemoved }
}

const encoder = new TextEncoder()
const decoder = new TextDecoder()
const encode = (value: Uint8Array) => btoa(String.fromCharCode(...value))
const decode = (value: string) => Uint8Array.from(atob(value), (character) => character.charCodeAt(0))

async function keyFor(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const bytes = argon2id(encoder.encode(passphrase), salt, { t: 2, m: 8192, p: 1, dkLen: 32 })
  const raw = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

export type EncryptedExport = {
  version: 1
  kdf: 'argon2id'
  salt: string
  nonce: string
  ciphertext: string
}

export async function encryptExport(state: AppState, passphrase: string): Promise<EncryptedExport> {
  if (passphrase.length < 10) throw new Error('Use a passphrase with at least 10 characters.')
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const nonce = crypto.getRandomValues(new Uint8Array(12))
  const key = await keyFor(passphrase, salt)
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, encoder.encode(JSON.stringify(state)))
  return { version: 1, kdf: 'argon2id', salt: encode(salt), nonce: encode(nonce), ciphertext: encode(new Uint8Array(ciphertext)) }
}

export async function decryptExport(payload: EncryptedExport, passphrase: string): Promise<AppState> {
  if (payload.version !== 1 || payload.kdf !== 'argon2id') throw new Error('This export is not compatible.')
  try {
    const key = await keyFor(passphrase, decode(payload.salt))
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: decode(payload.nonce) }, key, decode(payload.ciphertext))
    return normaliseState(JSON.parse(decoder.decode(plaintext)))
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('This export has')) throw error
    throw new Error('That passphrase does not unlock this export.')
  }
}
