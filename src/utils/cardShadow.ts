import { shadow } from "./theme"

// Kept as a thin re-export so earlier imports keep working — new code
// should import { shadow } from "./theme" directly and pick sm/md/lg.
export const cardShadow = shadow.md
