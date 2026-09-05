export async function compressImage(file, maxSide = 1000, quality = 0.78) {
  if (!file) return null
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
  const img = new Image()
  img.src = dataUrl
  await img.decode()
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.width * scale)
  canvas.height = Math.round(img.height * scale)
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', quality)
}

export async function extractAccent(dataUrl) {
  if (!dataUrl) return '#00D084'
  const img = new Image()
  img.src = dataUrl
  await img.decode()
  const canvas = document.createElement('canvas')
  canvas.width = 40
  canvas.height = 40
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(img, 0, 0, 40, 40)
  const { data } = ctx.getImageData(0, 0, 40, 40)
  let best = { score: -1, r: 0, g: 208, b: 132 }
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2]
    const max = Math.max(r,g,b), min = Math.min(r,g,b)
    const sat = max === 0 ? 0 : (max-min)/max
    const light = (max+min)/510
    if (light < 0.10 || light > 0.96 || sat < 0.24) continue
    // Prefer saturated, mid-light colors so black backgrounds and white shirts do not dominate.
    const score = sat * (1 - Math.abs(light - 0.55))
    if (score > best.score) best = {score,r,g,b}
  }
  const boost = v => Math.min(255, Math.round(v * 1.08))
  const vals=[boost(best.r),boost(best.g),boost(best.b)]
  return `#${vals.map(v=>v.toString(16).padStart(2,'0')).join('')}`
}
