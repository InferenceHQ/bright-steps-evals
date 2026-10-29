// @vitest-environment node
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createInitialState } from './domain'
import { decryptExport, encryptExport } from './storage'
import type { AppState } from './types'

describe('household privacy', () => {
  it('round-trips an Argon2id and AES-GCM encrypted export and rejects a wrong passphrase', async () => {
    const state = createInitialState('Sample Learner')
    const payload = await encryptExport(state, 'a long family passphrase')
    expect(payload.kdf).toBe('argon2id')
    expect(payload.ciphertext).not.toContain('Sample Learner')
    await expect(decryptExport(payload, 'wrong passphrase')).rejects.toThrow('does not unlock')
    await expect(decryptExport(payload, 'a long family passphrase')).resolves.toMatchObject({ learnerName: 'Sample Learner' })
  }, 20_000)

  it('rejects tampered or schema-invalid decrypted imports', async () => {
    const state = createInitialState('Sample Learner')
    const passphrase = 'a long family passphrase'
    const payload = await encryptExport(state, passphrase)
    const tampered = { ...payload, ciphertext: `${payload.ciphertext.slice(0, -2)}aa` }
    await expect(decryptExport(tampered, passphrase)).rejects.toThrow('does not unlock')
    const malformed = await encryptExport({ ...state, currentStage: 'not-a-stage' } as unknown as AppState, passphrase)
    await expect(decryptExport(malformed, passphrase)).rejects.toThrow('invalid household record')
    const malformedContent = await encryptExport({ ...state, customTexts: [{ id: 'bad', stage: 'V1', title: 'Bad', sentences: ['A unicorn danced.'] }] } as AppState, passphrase)
    await expect(decryptExport(malformedContent, passphrase)).rejects.toThrow('invalid household content')
  }, 20_000)

  it('keeps speech local and does not add analytics or remote endpoints to child code', async () => {
    const source = await readFile(resolve(import.meta.dirname, 'App.tsx'), 'utf8')
    expect(source).toContain('getUserMedia')
    expect(source).not.toContain('MediaRecorder')
    expect(source).not.toMatch(/fetch\(['"]https?:/)
    expect(source).toContain('never saved')
  })
})
