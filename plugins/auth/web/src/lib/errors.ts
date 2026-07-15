// Typed auth/network/API errors for the shared authenticated client.

export type AuthErrorKind = 'auth' | 'network' | 'validation' | 'server' | 'unknown'

export class AuthHttpError extends Error {
  kind: AuthErrorKind
  status?: number

  constructor(message: string, kind: AuthErrorKind = 'unknown', status?: number) {
    super(message)
    this.name = 'AuthHttpError'
    this.kind = kind
    if (status !== undefined) {
      this.status = status
    }
  }
}

export function isAuthError(err: unknown): err is AuthHttpError {
  return err instanceof AuthHttpError
}
