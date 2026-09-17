export function getErrorMessage(error: unknown, fallback = 'Ocorreu um erro'): string {
  if (error && typeof error === 'object') {
    const message = (error as { data?: { message?: string | string[] } }).data?.message
    if (Array.isArray(message)) return message.join(', ')
    if (typeof message === 'string') return message
  }
  if (error instanceof Error && error.message) return error.message
  return fallback
}
