# Local scorecard receipts

`npm run eval:scorecard -- --write` creates `latest.json` here. It contains
only synthetic scenario IDs, results, and timing; it never contains learner
state, recordings, or household content. Receipts are intentionally ignored by
Git so a public export cannot accidentally include local family data.
