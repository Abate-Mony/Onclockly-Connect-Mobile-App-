// Bridges customFetch's axios interceptor (plain JS, outside the component
// tree) to AuthContext's React state — clearing SecureStore alone wouldn't
// update `accessToken`, and the Stack.Protected route guards key off that
// state, not storage, so navigating back to login needs this in the loop.
type UnauthorizedHandler = () => void

let handler: UnauthorizedHandler | null = null

export function setUnauthorizedHandler(fn: UnauthorizedHandler | null) {
  handler = fn
}

export function notifyUnauthorized() {
  handler?.()
}
