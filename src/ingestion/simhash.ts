import crypto from 'crypto'

function tokens(text: string): string[] {
  const cleaned = text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ')
  return cleaned.split(/\s+/).filter(Boolean).slice(0, 400)
}

export function simhash64(text: string): string {
  const vector = new Array(64).fill(0)
  for (const t of tokens(text)) {
    const h = crypto.createHash('md5').update(t).digest()
    for (let i = 0; i < 8; i++) {
      const byte = h[i]
      for (let bit = 0; bit < 8; bit++) {
        const idx = i * 8 + bit
        vector[idx] += (byte >> bit) & 1 ? 1 : -1
      }
    }
  }
  let hex = ''
  for (let i = 0; i < 64; i += 4) {
    let nibble = 0
    for (let b = 0; b < 4; b++) if (vector[i + b] > 0) nibble |= 1 << b
    hex += nibble.toString(16)
  }
  return hex
}

export function hammingDistance(a: string, b: string): number {
  let d = 0
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    const x = parseInt(a[i], 16) ^ parseInt(b[i], 16)
    d += (x & 1) + ((x >> 1) & 1) + ((x >> 2) & 1) + ((x >> 3) & 1)
  }
  return d
}
