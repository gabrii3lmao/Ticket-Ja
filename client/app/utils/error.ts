interface ErrorData {
  statusCode?: number
  message?: string | string[]
  error?: { message?: string | string[]; code?: string; type?: string }
}

export interface ParsedApiError {
  status?: number
  message: string
  fieldErrors: Record<string, string>
  isNetwork: boolean
}

export function parseApiError(
  error: unknown,
  fallback = 'Ocorreu um erro',
): ParsedApiError {
  const err = error as
    | (ErrorData & { status?: number; data?: ErrorData; message?: string })
    | undefined
  const status = err?.statusCode ?? err?.status
  const data = err?.data
  const raw = data?.error?.message ?? data?.message
  const messages = Array.isArray(raw) ? raw.filter(Boolean) : raw ? [raw] : []

  const fieldErrors: Record<string, string> = {}
  for (const message of messages) {
    // Backend validation messages look like "email must be an email".
    const field = /^([\w.]+)\s/.exec(message)?.[1]
    if (field) fieldErrors[field] ||= message
  }

  const message =
    messages.join(', ') ||
    (data?.error?.code ? `Erro (${data.error.code})` : '') ||
    (status ? fallback : err?.message || fallback)

  return { status, message, fieldErrors, isNetwork: !status }
}

export function getErrorMessage(
  error: unknown,
  fallback = 'Ocorreu um erro',
): string {
  return parseApiError(error, fallback).message
}
