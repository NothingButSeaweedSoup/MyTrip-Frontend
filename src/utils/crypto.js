// SHA-256 fallback for non-HTTPS environments
function sha256Pure(message) {
  function rightRotate(v, n) { return (v >>> n) | (v << (32 - n)) }
  const K = [
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
  ]
  const msg = new TextEncoder().encode(message)
  const len = msg.length * 8
  const chunks = []
  for (let i = 0; i < msg.length; i += 64) {
    chunks.push(msg.slice(i, i + 64))
  }
  const last = msg.length % 64
  const padLen = last < 56 ? 56 - last : 120 - last
  const pad = new Uint8Array(padLen + 8)
  pad[0] = 0x80
  const lenView = new DataView(pad.buffer)
  lenView.setUint32(padLen + 4, Math.floor(len / 0x100000000), false)
  lenView.setUint32(padLen, len, false)
  chunks.push(new Uint8Array([...msg.slice(-last || 64), ...pad]))

  let H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]
  for (const chunk of chunks) {
    const W = new Uint32Array(64)
    for (let t = 0; t < 16; t++) {
      W[t] = (chunk[t * 4] << 24) | (chunk[t * 4 + 1] << 16) | (chunk[t * 4 + 2] << 8) | chunk[t * 4 + 3]
    }
    for (let t = 16; t < 64; t++) {
      const s0 = rightRotate(W[t - 15], 7) ^ rightRotate(W[t - 15], 18) ^ (W[t - 15] >>> 3)
      const s1 = rightRotate(W[t - 2], 17) ^ rightRotate(W[t - 2], 19) ^ (W[t - 2] >>> 10)
      W[t] = (W[t - 16] + s0 + W[t - 7] + s1) >>> 0
    }
    let [a, b, c, d, e, f, g, h] = H
    for (let t = 0; t < 64; t++) {
      const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)
      const ch = (e & f) ^ (~e & g)
      const T1 = (h + S1 + ch + K[t] + W[t]) >>> 0
      const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)
      const maj = (a & b) ^ (a & c) ^ (b & c)
      const T2 = (S0 + maj) >>> 0
      h = g; g = f; f = e; e = (d + T1) >>> 0
      d = c; c = b; b = a; a = (T1 + T2) >>> 0
    }
    H = [H[0]+a,H[1]+b,H[2]+c,H[3]+d,H[4]+e,H[5]+f,H[6]+g,H[7]+h].map(x => x>>>0)
  }
  return H.map(x => x.toString(16).padStart(8, '0')).join('')
}

export async function sha256(message) {
  if (crypto.subtle) {
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(message))
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
  }
  return sha256Pure(message)
}
