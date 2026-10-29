import { describe, expect, it } from 'vitest'
import { runScorecard } from './evaluator'

describe('deterministic evaluation scorecard', () => {
  it('keeps curriculum expectations outside the lesson implementation and exposes a known state regression', async () => {
    const scorecard = await runScorecard()
    expect(scorecard.config.model).toBe('none')
    expect(scorecard.scenarios.filter((item) => item.category === 'curriculum')).toHaveLength(34)
    expect(scorecard.scenarios.find((item) => item.id === 'comparison:meaning-only-historical-regression')?.outcome).toBe('pass')
    expect(scorecard.scenarios.find((item) => item.id === 'state:completion-idempotent')).toMatchObject({ category: 'state' })
    expect(scorecard.metrics.modelTaskOutcomes).toMatch(/^Not reached:/)
  })
})
