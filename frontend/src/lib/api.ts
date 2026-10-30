export type SettingsMap = Record<string, string | undefined>

export type SaveResult = 'ok' | 'unauthorized' | 'error'

// Notified whenever the server rejects a request with 401 (e.g. the session was
// lost because the backend restarted). The auth provider uses this to re-check
// the session so the login screen appears instead of a generic error toast.
type UnauthorizedHandler = () => void
let unauthorizedHandler: UnauthorizedHandler | null = null

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler
}

function notifyUnauthorized() {
  try {
    unauthorizedHandler?.()
  } catch {
    /* ignore handler errors */
  }
}

export interface ApiResult<T = unknown> {
  ok: boolean
  data?: T
  error?: string
  status: number
}

async function request<T>(url: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, init)
    const data = (await res.json().catch(() => undefined)) as T | undefined
    if (res.status === 401) notifyUnauthorized()
    return { ok: res.ok, data, error: (data as { error?: string } | undefined)?.error, status: res.status }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'network error', status: 0 }
  }
}

export function apiGet<T>(url: string) {
  return request<T>(url)
}

export function apiSend<T>(url: string, method: 'POST' | 'PUT' | 'PATCH' | 'DELETE', body?: unknown) {
  return request<T>(url, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}

// ---- Settings ----
export async function apiGetSettings(): Promise<SettingsMap> {
  const res = await fetch('/api/settings')
  if (!res.ok) throw new Error('Failed to load settings (' + res.status + ')')
  return res.json()
}

export async function apiPatchSetting(key: string, value: string): Promise<SaveResult> {
  try {
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: value }),
    })
    if (res.ok) return 'ok'
    if (res.status === 401) {
      notifyUnauthorized()
      return 'unauthorized'
    }
    return 'error'
  } catch {
    return 'error'
  }
}

export function apiSmtpTest(to: string) {
  return apiSend('/api/admin/smtp/test', 'POST', { to })
}

export function apiClearHistory() {
  return apiSend('/api/admin/clear-history', 'DELETE')
}

export function apiRotateAdmin(currentPassword: string, newPassword: string) {
  return apiSend('/api/auth/local-rotate', 'POST', { currentPassword, newPassword })
}

export function apiClearAdmin() {
  return apiSend('/api/auth/local-clear', 'DELETE')
}

export function apiCreateAdmin(password: string) {
  return apiSend('/api/auth/local-setup', 'POST', { password })
}

// ---- Auth ----
export interface AuthInfo {
  oidc_enabled: boolean
  local_admin_setup: boolean
  authenticated: boolean
  user?: unknown
}

export function apiAuthInfo() {
  return apiGet<AuthInfo>('/api/auth/info')
}

export function apiLocalLogin(password: string) {
  return apiSend('/auth/local/login', 'POST', { username: 'admin', password })
}

export function apiLocalSetup(password: string) {
  return apiSend('/api/auth/local-setup', 'POST', { password })
}

// ---- Core data ----
export interface TableType {
  id: string
  name_en: string
  base_hourly_cents: number
  maxUsedHours?: number | null
  vatRatePercent?: number | null
}

export interface TableRow {
  id: string
  number: number
  status: string
  tableTypeId: string
  usedSinceMaintenanceSeconds?: number
}

export interface SessionRow {
  id: string
  tableId: string
  status: string
  startedAt: string
  numberOfPlayers?: number
  subscriberCount?: number
  pin?: string
}

export interface Drink {
  id: string
  name: string
  price_cents: number
  vatRatePercent?: number | null
  category?: string | null
}

export interface PendingOrder {
  id: string
  tableNumber?: number
  items: { quantity: number; description: string }[]
  totalCents: number
  createdAt: string
}

export interface Subscription {
  id: string
  patronName?: string
  patronEmail?: string
  monthly_fee_cents: number
  active_from: string
}

export function apiTables() {
  return apiGet<TableRow[]>('/api/tables')
}

export function apiTableTypes() {
  return apiGet<TableType[]>('/api/table-types')
}

export function apiSessions() {
  return apiGet<SessionRow[]>('/api/sessions')
}

export interface SessionItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  totalCents: number
  vatRatePercent?: number | null
  type?: string
}

export interface SessionDetail {
  session?: SessionRow
  items?: SessionItem[]
  totalCents?: number
  tableCharge?: number
}

export function apiSessionDetail(id: string) {
  return apiGet<SessionDetail>('/api/sessions/' + id + '?t=' + Date.now())
}

export function apiDrinks(lang = 'en') {
  return apiGet<Drink[]>('/api/drinks?lang=' + encodeURIComponent(lang))
}

export function apiStartSession(tableId: string, numberOfPlayers: number, subscriberCount: number) {
  return apiSend('/api/sessions', 'POST', { tableId, numberOfPlayers, subscriberCount })
}

export function apiSetPlayerCount(sessionId: string, numberOfPlayers: number) {
  return apiSend('/api/sessions/' + sessionId, 'PATCH', { numberOfPlayers })
}

export function apiAddTabItem(sessionId: string, item: { description: string; quantity: number; unitPrice: number; vatRatePercent?: number | null }) {
  return apiSend('/api/sessions/' + sessionId + '/items', 'POST', { type: 'menu_item', ...item })
}

export function apiRemoveTabItem(sessionId: string, itemId: string) {
  return apiSend('/api/sessions/' + sessionId + '/items/' + itemId, 'DELETE')
}

export function apiTransferSession(sessionId: string, newTableId: string) {
  return apiSend('/api/sessions/' + sessionId + '/switch', 'POST', { newTableId })
}

export interface ReceiptPayment {
  id: string
  method: 'cash' | 'card' | string
  amountCents: number
  currency: string
  status: string
  details?: { tenderedCents?: number; changeCents?: number } | null
}

export interface PaymentInput {
  method: 'cash' | 'card'
  amountCents: number
  tenderedCents?: number
}

export interface CheckoutReceipt {
  receiptNumber: number
  year: number
  totalTtcCents: number
  subtotalHtCents: number
  vatCents: number
  discountCents: number
  items: { description: string; quantity: number; unitPrice: number; totalCents: number; vatRatePercent?: number | null }[]
  payments?: ReceiptPayment[]
}

export function apiCheckoutSession(sessionId: string, discountCents: number, payments?: PaymentInput[]) {
  return apiSend<CheckoutReceipt>('/api/sessions/' + sessionId + '/checkout', 'POST', {
    discountCents,
    ...(payments ? { payments } : {}),
  })
}

export function apiSessionSettle(
  sessionId: string,
  body: { tableSettlementCents: number; items: { itemId: string; quantity: number }[]; isSubscriber: boolean },
) {
  return apiSend('/api/sessions/' + sessionId + '/settle', 'POST', body)
}

export function apiEndSession(sessionId: string) {
  return apiSend('/api/sessions/' + sessionId + '/end', 'PATCH')
}

export function apiPendingOrders() {
  return apiGet<PendingOrder[]>('/api/pending-orders')
}

export function apiFulfillOrder(id: string) {
  return apiSend('/api/pending-orders/' + id + '/fulfill', 'POST')
}

export function apiCancelOrder(id: string) {
  return apiSend('/api/pending-orders/' + id + '/cancel', 'POST')
}

export function apiSetTableStatus(id: string, status: string) {
  return apiSend('/api/tables/' + id, 'PUT', { status })
}

export function apiDeleteTable(id: string) {
  return apiSend('/api/tables/' + id, 'DELETE')
}

export function apiUpdateTableNumber(id: string, number: number) {
  return apiSend('/api/tables/' + id, 'PUT', { number })
}

export function apiCreateTableType(body: { name_en: string; base_hourly_cents: number; vatRatePercent: number; maxUsedHours?: number | null }) {
  return apiSend('/api/table-types', 'POST', { name_fr: body.name_en, ...body })
}

export function apiUpdateTableType(id: string, body: { name_en: string; base_hourly_cents: number; vatRatePercent: number; maxUsedHours?: number | null }) {
  return apiSend('/api/table-types/' + id, 'PUT', { name_fr: body.name_en, ...body })
}

export function apiDeleteTableType(id: string) {
  return apiSend('/api/table-types/' + id, 'DELETE')
}

export function apiAddTables(tableTypeId: string, quantity: number) {
  return apiSend('/api/tables/bulk', 'POST', { tableTypeId, quantity })
}

export function apiCreateDrink(body: { name_en: string; price_cents: number; vatRatePercent: number; category?: string | null }) {
  return apiSend('/api/admin/drinks', 'POST', { name_fr: body.name_en, ...body })
}

export function apiUpdateDrink(id: string, body: { name_en: string; price_cents: number; vatRatePercent: number; category?: string | null }) {
  return apiSend('/api/admin/drinks/' + id, 'PUT', { name_fr: body.name_en, ...body })
}

export function apiDeleteDrink(id: string) {
  return apiSend('/api/admin/drinks/' + id, 'DELETE')
}

export function apiSubscriptions() {
  return apiGet<Subscription[]>('/api/subscriptions')
}

export function apiCreateSubscription(body: { patron_name: string; patron_email: string; monthly_fee_cents: number }) {
  return apiSend('/api/subscriptions', 'POST', { plan_name: 'Standard', ...body })
}

export function apiRenewSubscription(id: string) {
  return apiSend('/api/subscriptions/' + id + '/renew', 'POST')
}

export function apiDeleteSubscription(id: string) {
  return apiSend('/api/subscriptions/' + id, 'DELETE')
}

// ---- Reports ----
export interface FinancialReportTimePoint {
  label: string
  dayOfWeek?: string
  total: number
  tables?: number
  drinks?: number
  subscriptions?: number
}

export interface FinancialReport {
  totalRevenue: number
  byTableType: Record<string, number>
  drinksTotal: number
  subscriptionsTotal: number
  byPaymentMethod?: Record<string, number>
  timeSeries?: FinancialReportTimePoint[]
  dayOfWeekAnalysis?: { dayOfWeek: string; total: number }[]
  error?: string
}

export function apiFinancialReport(params: Record<string, string>) {
  return apiGet<FinancialReport>('/api/reports/financial?' + new URLSearchParams(params).toString())
}

export function apiEmailReport(body: {
  to: string
  format: 'html' | 'pdf'
  report: Record<string, unknown>
  pdfBase64?: string
}) {
  return apiSend<{ success: boolean }>('/api/reports/email', 'POST', body)
}

export interface VatRateBucket {
  totalTtcCents: number
  vatCents: number
  htCents: number
}

export interface VatReport {
  periodKey: string
  fromDate: string
  toDate: string
  byRate: Record<string, VatRateBucket>
  byCategory: Record<string, number>
  grandTotalTtcCents: number
  grandVatCents: number
  grandHtCents: number
  lineCount: number
  closed: boolean
  closedAt?: string | null
}

export function apiVatReport(params: Record<string, string>) {
  return apiGet<VatReport>('/api/reports/vat?' + new URLSearchParams(params).toString())
}

export function vatExportUrl(params: Record<string, string>) {
  return '/api/reports/vat/export?' + new URLSearchParams(params).toString()
}

export interface ClosurePeriod {
  id?: string
  periodType: string
  periodKey: string
  fromDate: string
  toDate: string
  totalHtCents: number
  totalVatCents: number
  totalTtcCents: number
  closedAt: string
  closedBy?: string
}

export function apiClosures() {
  return apiGet<ClosurePeriod[]>('/api/closures')
}

export function apiCreateClosure(body: Record<string, string>) {
  return apiSend<ClosurePeriod>('/api/closures', 'POST', body)
}

// ---- Payments & cash shifts (optional POS feature) ----
export interface PaymentRecord {
  id: string
  sessionId: string
  receiptId?: string | null
  method: string
  amountCents: number
  refundedCents: number
  currency: string
  status: string
  createdAt: string
  tableNumber?: number | null
  details?: { tenderedCents?: number; changeCents?: number } | null
}

export interface CashShift {
  id: string
  openingFloatCents: number
  openedBy?: string | null
  openedAt: string
  countedCents?: number | null
  expectedCents?: number | null
  varianceCents?: number | null
  closedBy?: string | null
  closedAt?: string | null
  notes?: string | null
}

export interface CurrentCashShift {
  shift: CashShift | null
  totals?: { capturedCents: number; refundedCents: number; netCents: number; count: number; expectedCents: number }
}

export function apiPayments(limit = 100) {
  return apiGet<PaymentRecord[]>('/api/payments?limit=' + limit)
}

export function apiRefundPayment(id: string, amountCents?: number) {
  return apiSend<PaymentRecord>('/api/payments/' + id + '/refund', 'POST', amountCents == null ? {} : { amountCents })
}

export function apiCurrentCashShift() {
  return apiGet<CurrentCashShift>('/api/cash-shifts/current')
}

export function apiOpenCashShift(openingFloatCents: number) {
  return apiSend<CashShift>('/api/cash-shifts/open', 'POST', { openingFloatCents })
}

export function apiCloseCashShift(id: string, body: { countedCents: number; notes?: string }) {
  return apiSend<CashShift>('/api/cash-shifts/' + id + '/close', 'POST', body)
}

export function apiCashShifts() {
  return apiGet<CashShift[]>('/api/cash-shifts')
}

// ---- Public (player / status) ----
export interface PublicTable {
  number: number
  status: string
  startedAt?: string | null
  numberOfPlayers?: number
  typeName?: string
}

export interface PublicTableDetail {
  table: { number: number; name?: string; type?: string }
  session?: { startedAt: string; numberOfPlayers?: number } | null
  tableCharge?: number
  items?: { description: string; quantity: number; unitPrice: number; totalCents: number }[]
  totalCents?: number
  pendingOrders?: { totalCents: number; items: { quantity: number; description: string }[] }[]
}

export function apiPublicTables() {
  return apiGet<PublicTable[]>('/api/public/tables')
}

export function apiPublicTable(number: string, pin: string) {
  return apiGet<PublicTableDetail>('/api/public/table/' + number + '?pin=' + encodeURIComponent(pin))
}

export function apiPlaceOrder(tableNumber: string, pin: string, items: { drinkId: string; quantity: number }[]) {
  return apiSend('/api/public/table/' + tableNumber + '/order', 'POST', { pin, items })
}
