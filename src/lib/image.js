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
  canvas.width = 32
  canvas.height = 32
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(img, 0, 0, 32, 32)
  const { data } = ctx.getImageData(0, 0, 32, 32)
  let r = 0, g = 0, b = 0, weight = 0
  for (let i = 0; i < data.length; i += 4) {
    const rr = data[i], gg = data[i + 1], bb = data[i + 2]
    const max = Math.max(rr, gg, bb), min = Math.min(rr, gg, bb)
    const saturation = max === 0 ? 0 : (max - min) / max
    const w = 0.25 + saturation
    r += rr * w; g += gg * w; b += bb * w; weight += w
  }
  r = Math.round(r / weight); g = Math.round(g / weight); b = Math.round(b / weight)
  const boost = (v) => Math.min(255, Math.round(v * 1.18 + 4))
  return `#${[boost(r), boost(g), boost(b)].map(v => v.toString(16).padStart(2, '0')).join('')}`
}
