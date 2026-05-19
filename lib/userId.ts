// USER_ID determines whose data this deployment reads and writes.
// Set USER_ID env var to deploy a second instance (e.g. a demo user)
// without touching a single query — all DB rows are scoped by this value.
export const USER_ID = process.env.USER_ID ?? 'will'
