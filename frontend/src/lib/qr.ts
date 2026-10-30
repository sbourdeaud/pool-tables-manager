declare global {
  interface Window {
    qrcode?: (typeNumber: number, errorCorrectionLevel: string) => {
      addData: (data: string) => void
      make: () => void
      createSvgTag: (opts: { cellSize?: number; margin?: number }) => string
    }
  }
}

/** Inline QR SVG using the vendored qrcode-generator from /vendor/qrcode.js */
export function buildQrSvg(text: string, cellSize = 5, margin = 4): string {
  const qrcode = window.qrcode
  if (!qrcode) return ''
  const qr = qrcode(0, 'M')
  qr.addData(text)
  qr.make()
  return qr.createSvgTag({ cellSize, margin })
}

/** Player-facing URL for a table session, honouring the configured public base URL. */
export function tableSessionUrl(tableNumber: number, pin?: string): string {
  const base = (localStorage.getItem('public_base_url') || window.location.origin).replace(/\/+$/, '')
  return `${base}/table${tableNumber}${pin ? '?pin=' + pin : ''}`
}
