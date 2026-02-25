export function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ')
}

export function formatDate(d: string | null) {
  if (!d) return ''
  return d
}

export function truncate(s: string, max: number) {
  return s.length > max ? s.slice(0, max) + '...' : s
}
