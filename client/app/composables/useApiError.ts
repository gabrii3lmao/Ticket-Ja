import { useToast } from '#imports'

export function useApiError() {
  const toast = useToast()
  const seen = useState<Record<string, number>>('error-toasts', () => ({}))

  function notifyError(
    error: unknown,
    opts: { title?: string; fallback?: string } = {},
  ) {
    const parsed = parseApiError(error, opts.fallback)
    const key = `${parsed.status ?? 'net'}:${parsed.message}`

    // Dedupe repeated toasts (e.g. vue-query retries) within a short window.
    if (Date.now() - (seen.value[key] ?? 0) < 1500) return parsed
    seen.value[key] = Date.now()

    toast.add({
      title: opts.title ?? 'Erro',
      description: parsed.message,
      color: 'error',
      duration: 6000,
    })
    return parsed
  }

  function notifySuccess(title: string, description?: string) {
    toast.add({ title, description, color: 'success' })
  }

  return { notifyError, notifySuccess }
}
