/** Build-time constant. Production static deploys keep the composer visible but closed. */
export const DISCUSSION_WRITES_OPEN = process.env.NODE_ENV !== 'production'
