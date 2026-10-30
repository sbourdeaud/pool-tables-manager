import { apiGet, apiSessionDetail, apiTableTypes, apiTables, type SessionDetail, type CheckoutReceipt } from '@/lib/api'
import { money } from '@/lib/format'

interface ReceiptLine {
  description: string
  quantity: number
  unitPrice: number
  totalCents: number
  vatRatePercent?: number | null
}

async function appName(): Promise<string> {
  try {
    const res = await apiGet<Record<string, string>>('/api/settings')
    return res.data?.app_name || 'Pool Tables Manager'
  } catch {
    return 'Pool Tables Manager'
  }
}

async function resolveTableInfo(detail: SessionDetail | null) {
  let tableName = 'N/A'
  let tableType = ''
  if (detail?.session?.tableId) {
    try {
      const [tablesRes, typesRes] = await Promise.all([apiTables(), apiTableTypes()])
      const table = tablesRes.data?.find((t) => t.id === detail.session!.tableId)
      if (table) {
        tableName = `Table #${table.number}`
        const type = typesRes.data?.find((tt) => tt.id === table.tableTypeId)
        if (type) tableType = ` (${type.name_en})`
      }
    } catch {
      /* ignore */
    }
  }
  return { tableName, tableType }
}

function vatRowsForLines(lines: ReceiptLine[], currency: string) {
  const buckets: Record<number, number> = {}
  let vatTotal = 0
  for (const line of lines) {
    const rate = line.vatRatePercent ?? 20
    const vat = Math.round(line.totalCents - line.totalCents / (1 + rate / 100))
    vatTotal += vat
    buckets[rate] = (buckets[rate] || 0) + vat
  }
  const rows = Object.keys(buckets)
    .sort()
    .map((rate) => `<tr><td>VAT ${rate}%</td><td style="text-align:right">${money(buckets[Number(rate)], currency)}</td></tr>`)
    .join('')
  return { vatTotal, rows }
}

function openPrintWindow(): Window | null {
  const w = window.open('', '', 'width=320,height=640')
  if (!w) alert('Please allow popups to print receipts.')
  return w
}

function writeReceipt(w: Window, title: string, body: string) {
  w.document.write(`<html><head><title>${title}</title><style>
    body { font-family: monospace; font-size: 12px; margin: 20px; }
    h2 { text-align: center; margin: 0 0 6px; }
    h3 { text-align: center; margin: 0 0 12px; font-weight: normal; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th, td { padding: 4px; text-align: left; }
    th { border-bottom: 2px solid #000; }
    .totals { border-top: 2px solid #000; font-weight: bold; }
    .info { margin-bottom: 10px; }
  </style></head><body>${body}</body></html>`)
  w.document.close()
  w.print()
}

function linesTable(lines: ReceiptLine[], currency: string) {
  return `<table>
    <thead><tr><th>Item</th><th>Qty</th><th style="text-align:right">VAT</th><th style="text-align:right">Price</th><th style="text-align:right">Total (TTC)</th></tr></thead>
    <tbody>${lines
      .map(
        (l) =>
          `<tr><td>${l.description}</td><td>${l.quantity}</td><td style="text-align:right">${l.vatRatePercent ?? 20}%</td><td style="text-align:right">${money(l.unitPrice, currency)}</td><td style="text-align:right">${money(l.totalCents, currency)}</td></tr>`,
      )
      .join('')}</tbody>
  </table>`
}

/** Definitive fiscal invoice printed after checkout. */
export async function printFinalReceipt(receipt: CheckoutReceipt, currency: string, detail: SessionDetail | null) {
  const w = openPrintWindow()
  if (!w) return
  const name = await appName()
  const lines = receipt.items || []
  const grossTtc = lines.reduce((sum, l) => sum + (l.totalCents || 0), 0)
  const { rows } = vatRowsForLines(lines, currency)
  const info = await resolveTableInfo(detail)
  const startStr = detail?.session ? new Date(detail.session.startedAt).toLocaleString() : 'N/A'

  writeReceipt(
    w,
    `Invoice #${receipt.receiptNumber}/${receipt.year}`,
    `<h2>${name}</h2>
     <h3>RECEIPT / INVOICE #${receipt.receiptNumber}/${receipt.year}</h3>
     <div class="info">
       <div>Table: ${info.tableName}${info.tableType}</div>
       <div>Start: ${startStr}</div>
       <div>End: ${new Date().toLocaleString()}</div>
     </div>
     ${linesTable(lines, currency)}
     <table class="totals">
       <tr><td>Subtotal (TTC):</td><td style="text-align:right">${money(grossTtc, currency)}</td></tr>
       ${receipt.discountCents > 0 ? `<tr><td>Discount:</td><td style="text-align:right">-${money(receipt.discountCents, currency)}</td></tr>` : ''}
       <tr><td>TOTAL (TTC):</td><td style="text-align:right">${money(receipt.totalTtcCents, currency)}</td></tr>
       <tr><td>Total HT:</td><td style="text-align:right">${money(receipt.totalTtcCents - receipt.vatCents, currency)}</td></tr>
     </table>
     <table>
       <tr><td>of which VAT (TVA):</td><td style="text-align:right">${money(receipt.vatCents, currency)}</td></tr>
       ${rows}
     </table>
     <div style="text-align:center;margin-top:20px">Thank you!</div>`,
  )
}

/** Partial settlement receipt for one player leaving a shared session. */
export async function printSettlementReceipt(
  tableSettlementCents: number,
  selectedItems: { itemId: string; quantity: number }[],
  itemsData: { id: string; description: string; unitPrice: number; vatRatePercent?: number | null }[],
  currency: string,
  sessionId: string,
) {
  const w = openPrintWindow()
  if (!w) return
  const name = await appName()
  const detail = (await apiSessionDetail(sessionId)).data || null
  const info = await resolveTableInfo(detail)
  const startTime = detail?.session ? new Date(detail.session.startedAt).toLocaleString() : 'N/A'

  const lines: ReceiptLine[] = []
  if (tableSettlementCents > 0) {
    lines.push({ description: 'Table Charge (Player Share)', quantity: 1, unitPrice: tableSettlementCents, totalCents: tableSettlementCents })
  }
  for (const selected of selectedItems) {
    const item = itemsData.find((i) => i.id === selected.itemId)
    if (item) {
      lines.push({
        description: item.description,
        quantity: selected.quantity,
        unitPrice: item.unitPrice,
        totalCents: selected.quantity * item.unitPrice,
        vatRatePercent: item.vatRatePercent,
      })
    }
  }
  const subtotal = lines.reduce((s, l) => s + l.totalCents, 0)
  const { vatTotal, rows } = vatRowsForLines(lines, currency)

  writeReceipt(
    w,
    `Settlement Receipt — ${info.tableName}`,
    `<h2>${name}</h2>
     <h3>Partial Settlement Receipt</h3>
     <div class="info">
       <div>Table: ${info.tableName}${info.tableType}</div>
       <div>Session Start: ${startTime}</div>
       <div>Settlement: ${new Date().toLocaleString()}</div>
     </div>
     ${linesTable(lines, currency)}
     <table class="totals"><tr><td>SETTLEMENT TOTAL (TTC)</td><td style="text-align:right">${money(subtotal, currency)}</td></tr></table>
     <table>
       <tr><td>of which VAT (TVA):</td><td style="text-align:right">${money(vatTotal, currency)}</td></tr>
       ${rows}
     </table>
     <div style="margin-top:20px;text-align:center;font-size:10px">
       <p>Thank you!</p>
       <p>This is a partial settlement (not an invoice). Remaining charges will be settled when the session ends.</p>
     </div>`,
  )
}

/** Pre-payment tab estimate (not an invoice), printed before checkout. */
export async function printEstimateReceipt(
  detail: SessionDetail | null,
  tableChargeCents: number,
  items: ReceiptLine[],
  discountCents: number,
  currency: string,
) {
  const w = openPrintWindow()
  if (!w) return
  const name = await appName()
  const info = await resolveTableInfo(detail)
  const lines: ReceiptLine[] = []
  if (tableChargeCents > 0) lines.push({ description: 'Table Time', quantity: 1, unitPrice: tableChargeCents, totalCents: tableChargeCents })
  lines.push(...items)
  const subtotal = lines.reduce((s, l) => s + l.totalCents, 0)
  const total = Math.max(0, subtotal - discountCents)
  const { vatTotal, rows } = vatRowsForLines(lines, currency)

  writeReceipt(
    w,
    `Tab Estimate — ${info.tableName}`,
    `<h2>${name}</h2>
     <h3>TAB ESTIMATE (not an invoice)</h3>
     <div class="info">
       <div>Table: ${info.tableName}${info.tableType}</div>
       <div>Session Start: ${detail?.session ? new Date(detail.session.startedAt).toLocaleString() : 'N/A'}</div>
       <div>Printed: ${new Date().toLocaleString()}</div>
     </div>
     ${linesTable(lines, currency)}
     <table class="totals">
       <tr><td>Subtotal (TTC):</td><td style="text-align:right">${money(subtotal, currency)}</td></tr>
       ${discountCents > 0 ? `<tr><td>Discount:</td><td style="text-align:right">-${money(discountCents, currency)}</td></tr>` : ''}
       <tr><td>TOTAL (TTC):</td><td style="text-align:right">${money(total, currency)}</td></tr>
     </table>
     <table>
       <tr><td>of which VAT (TVA):</td><td style="text-align:right">${money(vatTotal, currency)}</td></tr>
       ${rows}
     </table>
     <div style="margin-top:20px;text-align:center;font-size:10px">Estimate only — the fiscal invoice is issued after payment.</div>`,
  )
}
