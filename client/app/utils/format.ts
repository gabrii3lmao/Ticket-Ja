const LOCALE = 'pt-BR'

export function formatDate(
  value: string | Date,
  options?: Intl.DateTimeFormatOptions,
): string {
  return new Date(value).toLocaleDateString(LOCALE, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...options,
  })
}

export function formatDateTime(
  value: string | Date,
  options?: Intl.DateTimeFormatOptions,
): string {
  return new Date(value).toLocaleString(LOCALE, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  })
}

export function formatPrice(value: string | number): string {
  return Number(value).toLocaleString(LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatDateTimeLocal(iso: string): string {
  return new Date(iso).toISOString().slice(0, 16)
}
