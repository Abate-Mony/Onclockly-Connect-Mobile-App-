export type PushRegistration = { token: string; registrationId: string }

const registrations = new Map<number, PushRegistration>()
const identifiers = new Map<number, string>()

// An ownership identifier, not a credential. A new sign-in gets a different
// identifier even when the same person signs in again on the same phone.
export function createPushRegistration(version: number, token: string): PushRegistration {
  let registrationId = identifiers.get(version)
  if (!registrationId) {
    registrationId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2).padEnd(10, "0")}-${Math.random().toString(36).slice(2).padEnd(10, "0")}`
    identifiers.set(version, registrationId)
  }
  return { token, registrationId }
}

export function rememberPushRegistration(version: number, registration: PushRegistration) {
  identifiers.set(version, registration.registrationId)
  registrations.set(version, { ...registration })
}

export function getPushRegistration(version: number): PushRegistration | null {
  const registration = registrations.get(version)
  return registration ? { ...registration } : null
}

export function forgetPushRegistration(version: number) {
  registrations.delete(version)
  identifiers.delete(version)
}
