import { chromium } from 'playwright'
import { writeFileSync, mkdirSync } from 'fs'

const BASE = 'http://localhost:3000'
const shots = []
let passed = 0, failed = 0, warnings = []

mkdirSync('verify-screenshots', { recursive: true })

async function shot(page, name) {
  const file = `verify-screenshots/${name}.png`
  await page.screenshot({ path: file, fullPage: false })
  shots.push({ name, file })
  console.log(`  📸 ${name}`)
}

async function login(page, email, password = 'Demo12345!') {
  await page.goto(`${BASE}/login`)
  await page.waitForLoadState('networkidle')
  await page.fill('input[type="email"], input[name="email"]', email)
  await page.fill('input[type="password"], input[name="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(800)
}

async function quickLogin(page, email) {
  await page.goto(`${BASE}/login`)
  await page.waitForLoadState('networkidle')
  const btn = page.locator(`button:has-text("${email}"), div:has-text("${email}") >> button, [data-email="${email}"]`).first()
  const exists = await btn.count()
  if (exists) {
    await btn.click()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(800)
  } else {
    await login(page, email)
  }
}

function log(icon, msg) {
  console.log(`${icon} ${msg}`)
  if (icon === '✅') passed++
  if (icon === '❌') { failed++; warnings.push(msg) }
  if (icon === '⚠️') warnings.push(msg)
}

const browser = await chromium.launch({ headless: false, slowMo: 200 })
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
const page = await ctx.newPage()

console.log('\n═══════════════════════════════════════')
console.log('   INTERIORIX — Flow Tests')
console.log('═══════════════════════════════════════\n')

// ─── FLOW 1: LOGIN PAGE ──────────────────────────────────────
console.log('── Flow 1: Login page ──')
await page.goto(`${BASE}/login`)
await page.waitForLoadState('networkidle')
await shot(page, '01-login-page')

const quickBtns = await page.locator('text=Швидкий вибір').count()
log(quickBtns ? '✅' : '❌', `Quick login panel visible: ${quickBtns > 0}`)

const hasBrigadir = await page.locator('text=brigadir@tailored.demo').count()
log(hasBrigadir ? '✅' : '❌', `Brigadir quick login present: ${hasBrigadir > 0}`)

// ─── FLOW 2: MANAGER LOGIN + DASHBOARD ──────────────────────
console.log('\n── Flow 2: Manager login + dashboard ──')
await login(page, 'manager@tailored.demo')
await shot(page, '02-manager-dashboard')

const currentUrl = page.url()
log(currentUrl.includes('/workspace') ? '✅' : '❌', `Manager redirected to workspace: ${currentUrl}`)

// ─── FLOW 3: MANAGER — ORDERS ────────────────────────────────
console.log('\n── Flow 3: Manager — Orders ──')
await page.goto(`${BASE}/workspace/orders`)
await page.waitForLoadState('networkidle')
await shot(page, '03-manager-orders')
const ordersTitle = await page.locator('h1, [data-testid="page-title"]').first().textContent().catch(() => '')
log(ordersTitle ? '✅' : '⚠️', `Orders page loaded: "${ordersTitle?.trim()}"`)

// ─── FLOW 4: MANAGER — PROJECTS ──────────────────────────────
console.log('\n── Flow 4: Manager — Projects ──')
await page.goto(`${BASE}/workspace/projects`)
await page.waitForLoadState('networkidle')
await shot(page, '04-manager-projects')
const projectRows = await page.locator('table tbody tr, [data-row], .project-row').count()
log(projectRows > 0 ? '✅' : '⚠️', `Projects list has ${projectRows} rows`)

// ─── FLOW 5: MANAGER — PROJECT DETAIL ────────────────────────
console.log('\n── Flow 5: Manager — Project detail ──')
const firstProjectLink = page.locator('a[href*="/workspace/projects/"]').first()
const hasProjectLink = await firstProjectLink.count()
if (hasProjectLink) {
  await firstProjectLink.click()
  await page.waitForLoadState('networkidle')
  await shot(page, '05-project-detail-manager')

  // Check for brigadir field in team assignment
  const brigadirField = await page.locator('text=Бригадир').count()
  log(brigadirField ? '✅' : '❌', `Brigadir field in team assignment: ${brigadirField > 0}`)

  // Check estimate section
  const estimateSection = await page.locator('text=Кошторис').count()
  log(estimateSection ? '✅' : '❌', `Estimate section visible: ${estimateSection > 0}`)

  // Check payment gate card (Етап проєкту)
  const stageCard = await page.locator('text=Етап проєкту').count()
  log(stageCard ? '✅' : '⚠️', `Stage transition card visible: ${stageCard > 0}`)

  // Check tasks section with link
  const kanbanLink = await page.locator('a[href*="/kanban"]').count()
  log(kanbanLink ? '✅' : '❌', `Kanban link in tasks section: ${kanbanLink > 0}`)

  // Check design files section
  const designFiles = await page.locator('text=Дизайн-файли').count()
  log(designFiles ? '✅' : '❌', `Design files section visible: ${designFiles > 0}`)

  // Check payments card is visible to manager
  const paymentsCard = await page.locator('text=Фінанси').count()
  log(paymentsCard ? '✅' : '❌', `Finances card visible to manager: ${paymentsCard > 0}`)

  // Check audit log visible to manager
  const auditCard = await page.locator('text=Останні дії').count()
  log(auditCard ? '✅' : '❌', `Audit log visible to manager: ${auditCard > 0}`)
} else {
  log('⚠️', 'No project links found')
}

// ─── FLOW 6: MANAGER — KANBAN ────────────────────────────────
console.log('\n── Flow 6: Manager — Kanban ──')
await page.goto(`${BASE}/workspace/kanban`)
await page.waitForLoadState('networkidle')
await shot(page, '06-kanban-page')
const kanbanTitle = await page.locator('text=Канбан задач').count()
log(kanbanTitle ? '✅' : '❌', `Kanban page loads (not redirect): ${kanbanTitle > 0}`)

const newTaskBtn = await page.locator('button:has-text("Нова задача"), button:has-text("+ Нова")').count()
log(newTaskBtn ? '✅' : '❌', `"Нова задача" button present: ${newTaskBtn > 0}`)

// Test task creation modal
if (newTaskBtn) {
  await page.click('button:has-text("Нова задача"), button:has-text("+ Нова")')
  await page.waitForTimeout(500)
  const modal = await page.locator('text=Назва задачі').count()
  log(modal ? '✅' : '❌', `Task creation modal opens: ${modal > 0}`)
  await shot(page, '07-kanban-new-task-modal')
  // Close modal
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
}

// ─── FLOW 7: MANAGER — ESTIMATES ─────────────────────────────
console.log('\n── Flow 7: Manager — Estimates ──')
await page.goto(`${BASE}/workspace/estimates`)
await page.waitForLoadState('networkidle')
await shot(page, '08-estimates-page')
const estimatesLoaded = await page.locator('text=Кошториси, text=кошторис').count()
log(estimatesLoaded ? '✅' : '⚠️', `Estimates page loaded`)

// ─── FLOW 8: DESIGNER LOGIN ───────────────────────────────────
console.log('\n── Flow 8: Designer login + flow ──')
await page.goto(`${BASE}/login`)
await page.waitForLoadState('networkidle')
await login(page, 'designer@tailored.demo')
await shot(page, '09-designer-workbench')

const designerTitle = await page.locator('text=Моя робота').count()
log(designerTitle ? '✅' : '❌', `Designer sees "Моя робота": ${designerTitle > 0}`)

// Check no "Вхідні заявки" (order claiming removed)
const claimOrders = await page.locator('text=Вхідні заявки').count()
log(!claimOrders ? '✅' : '❌', `Order claiming removed from designer: ${claimOrders === 0}`)

// Check kanban link
const kanbanLinkDesigner = await page.locator('a[href*="/kanban"], text=Канбан').count()
log(kanbanLinkDesigner ? '✅' : '❌', `Kanban link visible to designer: ${kanbanLinkDesigner > 0}`)

// Designer nav — check "Заявки" is NOT in nav
await page.goto(`${BASE}/workspace/kanban`)
await page.waitForLoadState('networkidle')
const designerKanban = await page.locator('text=Канбан задач').count()
log(designerKanban ? '✅' : '❌', `Designer can access Kanban: ${designerKanban > 0}`)
await shot(page, '10-designer-kanban')

// ─── FLOW 9: DESIGNER — PROJECT DETAIL ───────────────────────
console.log('\n── Flow 9: Designer — Project detail ──')
await page.goto(`${BASE}/workspace/projects`)
await page.waitForLoadState('networkidle')
const designerProjectLink = page.locator('a[href*="/workspace/projects/"]').first()
const hasDesignerProject = await designerProjectLink.count()
if (hasDesignerProject) {
  await designerProjectLink.click()
  await page.waitForLoadState('networkidle')
  await shot(page, '11-project-detail-designer')

  // Designer should NOT see stage transition buttons
  const stageCard = await page.locator('text=Етап проєкту').count()
  log(!stageCard ? '✅' : '⚠️', `Stage transition hidden from designer: ${stageCard === 0}`)

  // Designer should see design files section
  const designSection = await page.locator('text=Дизайн-файли').count()
  log(designSection ? '✅' : '❌', `Design files section visible to designer: ${designSection > 0}`)

  // Photo reports section with file upload
  const photoSection = await page.locator('text=Фото з обʼєкта, text=Завантажити файл').count()
  log(photoSection ? '✅' : '⚠️', `Photo section with upload tab visible: ${photoSection > 0}`)
  await shot(page, '12-designer-photo-section')
}

// ─── FLOW 10: BRIGADIR LOGIN ──────────────────────────────────
console.log('\n── Flow 10: Brigadir login + dashboard ──')
await page.goto(`${BASE}/login`)
await page.waitForLoadState('networkidle')
await login(page, 'brigadir@tailored.demo')
await page.waitForTimeout(1000)
await shot(page, '13-brigadir-workbench')

const brigadirDashboard = await page.locator('text=Мій робочий стіл, text=Мої задачі').count()
log(brigadirDashboard ? '✅' : '❌', `Brigadir sees own dashboard: ${brigadirDashboard > 0}`)

// Brigadir kanban
await page.goto(`${BASE}/workspace/kanban`)
await page.waitForLoadState('networkidle')
const brigadirKanban = await page.locator('text=Канбан задач').count()
log(brigadirKanban ? '✅' : '❌', `Brigadir can access Kanban: ${brigadirKanban > 0}`)
await shot(page, '14-brigadir-kanban')

// Brigadir project detail — check no finances
await page.goto(`${BASE}/workspace/projects`)
await page.waitForLoadState('networkidle')
const brigadirProjectLink = page.locator('a[href*="/workspace/projects/"]').first()
const hasBrigadirProject = await brigadirProjectLink.count()
if (hasBrigadirProject) {
  await brigadirProjectLink.click()
  await page.waitForLoadState('networkidle')
  await shot(page, '15-project-detail-brigadir')

  // Finances card should be HIDDEN
  const financesCard = await page.locator('text=Фінанси').count()
  log(!financesCard ? '✅' : '❌', `Finances card HIDDEN from brigadir: ${financesCard === 0}`)

  // Audit log should be HIDDEN
  const auditLog = await page.locator('text=Останні дії').count()
  log(!auditLog ? '✅' : '❌', `Audit log HIDDEN from brigadir: ${auditLog === 0}`)

  // Tasks should be VISIBLE
  const tasksSection = await page.locator('text=Задачі').count()
  log(tasksSection ? '✅' : '❌', `Tasks section VISIBLE to brigadir: ${tasksSection > 0}`)

  // Stage transitions hidden
  const stageActions = await page.locator('text=Етап проєкту').count()
  log(!stageActions ? '✅' : '❌', `Stage transitions HIDDEN from brigadir: ${stageActions === 0}`)
}

// ─── FLOW 11: FILE UPLOAD UI ──────────────────────────────────
console.log('\n── Flow 11: File upload UI ──')
// Go back to project as designer
await page.goto(`${BASE}/login`)
await page.waitForLoadState('networkidle')
await login(page, 'designer@tailored.demo')
await page.goto(`${BASE}/workspace/projects`)
await page.waitForLoadState('networkidle')
const projectForUpload = page.locator('a[href*="/workspace/projects/"]').first()
if (await projectForUpload.count()) {
  await projectForUpload.click()
  await page.waitForLoadState('networkidle')

  // Find file upload tab
  const uploadTab = page.locator('button:has-text("Завантажити файл")').first()
  const hasUploadTab = await uploadTab.count()
  log(hasUploadTab ? '✅' : '❌', `File upload tab in photo section: ${hasUploadTab > 0}`)

  if (hasUploadTab) {
    await uploadTab.click()
    await page.waitForTimeout(400)
    const dropzone = await page.locator('text=Натисніть щоб обрати фото').count()
    log(dropzone ? '✅' : '❌', `File dropzone appears after switching to file tab: ${dropzone > 0}`)
    await shot(page, '16-file-upload-tab')
  }
}

// ─── FLOW 12: CLIENT PORTAL ───────────────────────────────────
console.log('\n── Flow 12: Client portal ──')
await page.goto(`${BASE}/login`)
await page.waitForLoadState('networkidle')
await login(page, 'client@tailored.demo')
await page.waitForTimeout(1000)
await shot(page, '17-client-portal-dashboard')

const portalDash = await page.locator('text=Нова заявка, text=Мої проєкти, text=заявки').count()
log(portalDash ? '✅' : '❌', `Client sees portal dashboard: ${portalDash > 0}`)

// Client projects
await page.goto(`${BASE}/portal/projects`)
await page.waitForLoadState('networkidle')
await shot(page, '18-client-projects')
const clientProjects = await page.locator('a[href*="/portal/projects/"]').count()
log(clientProjects > 0 ? '✅' : '⚠️', `Client has ${clientProjects} project(s) visible`)

if (clientProjects > 0) {
  await page.locator('a[href*="/portal/projects/"]').first().click()
  await page.waitForLoadState('networkidle')
  await shot(page, '19-client-project-detail')

  const hasPhotosTab = await page.locator('text=Photos, text=Фото').count()
  log(hasPhotosTab ? '✅' : '⚠️', `Photos tab visible to client: ${hasPhotosTab > 0}`)

  if (hasPhotosTab) {
    await page.locator('text=Photos, text=Фото').first().click()
    await page.waitForTimeout(500)
    const designFilesPanel = await page.locator('text=Дизайн-файли').count()
    log(designFilesPanel ? '✅' : '⚠️', `Design files panel in client portal photos tab: ${designFilesPanel > 0}`)
    await shot(page, '20-client-photos-tab')
  }
}

// ─── FLOW 13: PAYMENT GATE ────────────────────────────────────
console.log('\n── Flow 13: Payment gate warning ──')
await page.goto(`${BASE}/login`)
await page.waitForLoadState('networkidle')
await login(page, 'manager@tailored.demo')

// Find a DESIGN-stage project
await page.goto(`${BASE}/workspace/projects`)
await page.waitForLoadState('networkidle')

// Try to find a project with DESIGN status
const designProject = page.locator('tr:has-text("Дизайн"), tr:has-text("DESIGN")').first()
const hasDesignProject = await designProject.count()
if (hasDesignProject) {
  await designProject.locator('a').first().click()
  await page.waitForLoadState('networkidle')
  const paymentWarning = await page.locator('text=Потрібен погоджений кошторис, text=не сплачено').count()
  log(paymentWarning ? '✅' : '⚠️', `Payment gate warning shown for DESIGN project: ${paymentWarning > 0}`)
  await shot(page, '21-payment-gate-warning')
} else {
  log('⚠️', 'No DESIGN-status project found to test payment gate')
}

// ─── FLOW 14: ADMIN ───────────────────────────────────────────
console.log('\n── Flow 14: Admin access ──')
await page.goto(`${BASE}/login`)
await page.waitForLoadState('networkidle')
await login(page, 'admin@tailored.demo')
await shot(page, '22-admin-dashboard')
const adminDash = await page.locator('text=Огляд, text=Аналітика').count()
log(adminDash ? '✅' : '⚠️', `Admin sees full dashboard: ${adminDash > 0}`)

// Admin reviews moderation — check Ukrainian buttons
await page.goto(`${BASE}/workspace/reviews`)
await page.waitForLoadState('networkidle')
await shot(page, '23-admin-reviews')
const publishUkr = await page.locator('button:has-text("Опублікувати")').count()
const publishEng = await page.locator('button:has-text("Publish")').count()
log(publishUkr > 0 || publishEng === 0 ? '✅' : '❌',
  `Reviews buttons in Ukrainian (Опублікувати: ${publishUkr}, Publish: ${publishEng})`)

// ─── RESULTS ─────────────────────────────────────────────────
console.log('\n═══════════════════════════════════════')
console.log(`  ✅ PASSED: ${passed}`)
console.log(`  ❌ FAILED: ${failed}`)
console.log(`  Screenshots: ${shots.length} saved to verify-screenshots/`)
console.log('═══════════════════════════════════════')

if (warnings.length) {
  console.log('\nWarnings / Failed:')
  warnings.forEach(w => console.log(`  → ${w}`))
}

writeFileSync('verify-results.json', JSON.stringify({ passed, failed, warnings, shots }, null, 2))

await browser.close()
process.exit(failed > 0 ? 1 : 0)
