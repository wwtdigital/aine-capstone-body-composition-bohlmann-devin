export function haptic(type: 'light' | 'medium' | 'success' | 'error' = 'light') {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return
  const patterns: Record<string, number | number[]> = {
    light:   10,
    medium:  20,
    success: [10, 50, 10],
    error:   [30, 50, 30],
  }
  navigator.vibrate(patterns[type])
}
