export function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v))
}

export function ago(ts: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - ts) / 1000))
  if (s < 45) return 'now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.round(h / 24)}d`
}

export function duration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h) return `${h}h ${String(m).padStart(2, '0')}m`
  if (m) return `${m}m`
  return `${s}s`
}

export function clockTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
}

export function dayLabel(ts: number, now = Date.now()): string {
  const d = new Date(ts)
  const days = Math.floor((now - ts) / 86_400_000)
  if (days < 1) return 'Today'
  if (days < 2) return 'Yesterday'
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' })
}

export function rssiBars(rssi: number): number {
  if (rssi >= -50) return 4
  if (rssi >= -62) return 3
  if (rssi >= -74) return 2
  if (rssi >= -85) return 1
  return 0
}

export function pct(v: number) {
  return `${Math.round(v * 100)}%`
}

export function splitMac(mac: string): [string, string] {
  return [mac.slice(0, 8), mac.slice(8)]
}

export function throughput(kbps: number): string {
  if (kbps >= 1000) return `${(kbps / 1000).toFixed(1)} Mbps`
  return `${kbps} kbps`
}

export function proximityLabel(rssi: number): string {
  if (rssi >= -50) return "arm's reach"
  if (rssi >= -65) return 'same room'
  if (rssi >= -80) return 'nearby'
  return 'distant'
}
