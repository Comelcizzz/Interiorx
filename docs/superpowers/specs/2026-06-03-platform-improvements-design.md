# Platform Improvements — Design Spec (v2)
**Date:** 2026-06-03  
**Project:** INTERIORIX

---

## Контекст

Платформа для дизайн-студії. Клієнти подають заявки, команда веде проєкти від ескізу до гарантійного обслуговування.

**Після змін система матиме 5 ролей:**
| Роль | Хто це | Де працює |
|---|---|---|
| ADMIN | Власник / системний адміністратор | Workspace |
| PROJECT_MANAGER | Менеджер проєктів | Workspace |
| DESIGNER | Дизайнер | Workspace |
| BRIGADIR | Бригадир (виконроб на об'єкті) | Workspace (обмежено) |
| CLIENT | Клієнт | Portal (окремий) |

**Видаляємо повністю:** ESTIMATOR, ACCOUNTANT, WORKER_LEAD, WORKER, SUPPLIER.

---

## Повний бізнес-ліфсайкл проєкту

```
CLIENT подає ЗАЯВКУ (ORDER)
    ↓
PM кваліфікує → конвертує в ПРОЄКТ
    ↓
ПРОЄКТ: DRAFT
  → PM призначає DESIGNER і BRIGADIR
    ↓
ПРОЄКТ: ESTIMATION
  → DESIGNER знімає заміри, створює чернетку кошторису
  → PM/DESIGNER деталізує кошторис
  → PM відправляє кошторис клієнту
    ↓
ПРОЄКТ: DESIGN
  → CLIENT переглядає, погоджує або відхиляє кошторис
  → CLIENT оплачує
  → DESIGNER завантажує ескізи, рендери, концепти (Дизайн-файли)
    ↓
ПРОЄКТ: APPROVED  ← блокується якщо кошторис не сплачено
  → PM підтверджує готовність до робіт
  → BRIGADIR отримує задачі
    ↓
ПРОЄКТ: IN_PROGRESS  ← блокується якщо кошторис не сплачено
  → BRIGADIR виконує задачі, додає фото з об'єкту
  → DESIGNER контролює відповідність дизайну
    ↓
ПРОЄКТ: COMPLETED  ← блокується якщо кошторис не сплачено
  → Клієнт оглядає результат
  → Клієнт залишає відгук
    ↓
ПРОЄКТ: WARRANTY
  → Гарантійний супровід
```

---

## Зміна 1 — Видалення 5 ролей

### Backend: `apps/backend/src/domain/enums.ts`
```typescript
// ВИДАЛИТИ з RoleCode:
ESTIMATOR, ACCOUNTANT, WORKER_LEAD, WORKER, SUPPLIER

// ДОДАТИ:
BRIGADIR = 'BRIGADIR'
```

### Shared: `packages/shared/src/workspace-roles.ts`
- Видалити нормалізацію для 5 ролей
- Додати `BRIGADIR` як core role (не нормалізується)
- Додати label: `'BRIGADIR': 'Бригадир'`
- Додати tone для badge: `BRIGADIR: 'amber'`

### Backend — очистка контролерів
У всіх `@Roles(...)` декораторах видалити посилання на:
`RoleCode.ESTIMATOR, RoleCode.ACCOUNTANT, RoleCode.WORKER_LEAD, RoleCode.WORKER, RoleCode.SUPPLIER`

Файли для перевірки: `operations.controller.ts`, `projects.controller.ts`, `estimates.controller.ts`, `measurements.controller.ts`, `materials.controller.ts`, `payments.controller.ts`, `crm.controller.ts`, `photo-reports.controller.ts`, `files.controller.ts`, `auth.controller.ts`, `users.controller.ts`

### Backend — управління користувачами
У `users.service.ts` / `auth.service.ts`: при створенні/реєстрації заборонити призначення видалених ролей. Дозволені ролі: `ADMIN, PROJECT_MANAGER, DESIGNER, BRIGADIR, CLIENT`.

---

## Зміна 2 — Переклад UI (англ → укр)

**Файл:** `apps/frontend/src/pages/WorkspaceReviewsModerationPage.tsx`

| Поточно | Замінити |
|---|---|
| `Publish` | `Опублікувати` |
| `Hide` | `Приховати` |
| `{r.status}` в badge | `{ PENDING: 'На модерації', PUBLISHED: 'Опубліковано', HIDDEN: 'Приховано' }[r.status] ?? r.status` |

Підзаголовок Shell.tsx — **залишаємо** (вже укр).

---

## Зміна 3 — Платіжний ґейт

### Правило
Переходи **з DESIGN і далі** (DESIGN→APPROVED, APPROVED→IN_PROGRESS, IN_PROGRESS→COMPLETED, COMPLETED→WARRANTY) потребують:
1. Є кошторис зі статусом `APPROVED`
2. Сума платежів `PAID` >= `estimate.total`

### Backend: `apps/backend/src/projects/projects.service.ts` — `transitionStatus()`

```
const GATED_STATUSES = [DESIGN, APPROVED, IN_PROGRESS, COMPLETED]

if GATED_STATUSES.includes(project.status):
  estimate = estimateModel.findOne({ projectId, status: 'APPROVED' }).sort({ version: -1 })
  if !estimate:
    throw BadRequestException('Потрібен погоджений кошторис перед переходом до наступного етапу')
  
  paidSum = paymentModel.aggregate: sum(amount) where { projectId, status: 'PAID' }
  if paidSum < estimate.total:
    throw BadRequestException(`Кошторис не сплачено повністю. Сплачено: ${paidSum} з ${estimate.total} грн`)
```

`paymentModel` вже є в конструкторі `ProjectsService`.

### Frontend: `apps/frontend/src/components/ProjectStatusActions.tsx`
Передавати `latestEstimate` і `payments` як пропси з `ProjectDetailPage`. Показувати попередження під кнопками якщо умови не виконані.

---

## Зміна 4 — Канбан: активація + створення задач

### App.tsx — виправити route
```tsx
// Було:
<Route path="kanban" element={<Navigate to="/workspace/projects" replace />} />

// Стане:
<Route path="kanban" element={
  <RequireWorkspaceRoles roles={['ADMIN', 'PROJECT_MANAGER', 'DESIGNER', 'BRIGADIR']}>
    <KanbanPage />
  </RequireWorkspaceRoles>
} />
```

### Shell.tsx — додати "Задачі" в навігацію
```tsx
{
  to: '/workspace/kanban',
  label: 'Задачі',
  group: 'Проєкти',
  icon: <ClipboardList className={iconClass} />,
  roles: ['ADMIN', 'PROJECT_MANAGER', 'DESIGNER', 'BRIGADIR'],
}
```

### Backend: `POST /operations/tasks`

**Новий файл:** `apps/backend/src/operations/dto/create-task.dto.ts`
```typescript
class CreateTaskDto {
  projectId: string         // required
  title: string             // required
  description?: string
  priority?: number         // 1-5, default 3
  dueDate?: string          // ISO date
  assigneeId?: string       // staffProfile ID
}
```

**`operations.service.ts`** — метод `createTask(dto, userId)`:
1. Перевірити що `projectId` існує
2. Якщо `assigneeId` — перевірити що staff існує
3. Створити `{ projectId, title, description, status: BACKLOG, priority: dto.priority ?? 3, dueDate, assigneeId }`
4. Зберегти audit log
5. Повернути задачу з даними проєкту та assignee

**`operations.controller.ts`** — новий endpoint:
```typescript
@Post('tasks')
@Roles(ADMIN, PROJECT_MANAGER, DESIGNER, BRIGADIR)
createTask(@Body() dto, @ReqUser() user)
```

### Frontend: KanbanPage.tsx — кнопка "Нова задача"
- Додати `<Button>` в `PageHeader.actions`
- Відкриває `Modal` з формою: назва (required), проєкт (select з GET /projects), пріоритет (select), дедлайн, виконавець (select з staff)
- Submit → `POST /operations/tasks` → reload

---

## Зміна 5 — Швидкі дії в ProjectDetailPage

**Файл:** `apps/frontend/src/pages/ProjectDetailPage.tsx`

### Секція кошторису
```tsx
<CardHeader>
  <div>Кошторис</div>
  {!latestEstimate && canEdit && (
    <Button onClick={createEstimate}>Створити кошторис</Button>
  )}
  {latestEstimate && (
    <Link to="/workspace/estimates">Всі кошториси →</Link>
  )}
</CardHeader>
```
`createEstimate()` → `POST /estimates { projectId }` → navigate('/workspace/estimates')

### Секція задач
```tsx
<CardHeader>
  <div>Задачі</div>
  {canEdit && (
    <Link to="/workspace/kanban">
      <Button variant="secondary">Додати задачу</Button>
    </Link>
  )}
</CardHeader>
```

---

## Зміна 6 — Завантаження файлів

### Backend вже готовий
- `POST /api/files/upload` (multer, disk storage) — існує
- `GET /uploads/{filename}` (static serving) — існує
- `photo-report.schema.ts` вже має `fileIds[]` і `photoUrls[]`

### Frontend: ProjectPhotoReportsSection.tsx
Замінити textarea тільки-URL на два режими:

**Режим 1 — Посилання (існуючий):** textarea з https:// URL

**Режим 2 — Файл (новий):**
```
<input type="file" multiple accept="image/*" onChange={handleFiles} />
```
При виборі файлів:
1. Для кожного файлу → `POST /api/files/upload` (FormData)
2. Отримати `{ url }` у відповіді
3. Накопичити URL в стейті
4. Submit відправляє всі URL в `POST /photo-reports`

Показати thumbnail прев'ю вибраних файлів.

---

## Зміна 7 — Дизайн-файли (нова секція)

### Backend: розширення photo-report

**`photo-report.schema.ts`:**
```typescript
@Prop({ default: 'SITE' })
category!: 'SITE' | 'DESIGN'
```

**`photo-reports.service.ts`:**
- `create()`: приймати `category` (default `'SITE'`)
- `findByProject()`: приймати `category` як фільтр

**`photo-reports.controller.ts`:**
- `GET /projects/:id/photo-reports?category=SITE|DESIGN`
- `POST /photo-reports`: приймати `category`

### Frontend: новий компонент

**`apps/frontend/src/components/ProjectDesignFilesSection.tsx`**
Копія логіки `ProjectPhotoReportsSection` але:
- Заголовок: "Дизайн-файли" + іконка `Layers`
- Опис: "Ескізи, рендери, концепти"
- Завжди передає `category: 'DESIGN'`
- Може завантажувати: ADMIN, PROJECT_MANAGER, DESIGNER
- Може переглядати: всі включно з CLIENT (через portal)
- Підтримує URL і file upload

**Додати в `ProjectDetailPage.tsx`** між секцією замірів і секцією кошторису.

**Додати в `PortalProjectDetailPage.tsx`** — read-only перегляд для клієнта.

---

## Зміна 8 — Логічний флоу КОЖНОЇ РОЛІ

### 8.1 ADMIN — залишається незмінним
Повний доступ до всього. Може виконувати дії будь-якої ролі.

---

### 8.2 PROJECT_MANAGER — додати доступ до Задач

**Що вже є:** Огляд, Аналітика, Заявки, Проєкти, Кошториси, Заміри, Платежі, Чеки, Матеріали, Відгуки, Користувачі

**Що додати:**
- Пункт "Задачі" в навігації (Канбан) — вже в зміні 4

**Флоу PM:**
```
Бачить нові заявки → кваліфікує → конвертує в проєкт →
Призначає дизайнера і бригадира → контролює кошторис →
Відправляє клієнту → отримує оплату → веде проєкт до завершення →
Модерує відгуки → аналітика по бізнесу
```

---

### 8.3 DESIGNER — видалити захоплення замовлень, додати Задачі

**Поточна проблема:** дизайнер може самостійно "захоплювати" замовлення. Це нелогічно — PM призначає дизайнера до проєкту.

**`apps/frontend/src/pages/DesignerWorkbenchPage.tsx`:**
- Видалити секцію "Вхідні замовлення" і будь-яку claim-логіку
- Залишити: "Мої проєкти" (де assignedDesignerId = я)
- Додати: "Мої задачі" — останні 5 задач з Канбану (GET /operations/board, фільтр по assigneeId)
- Додати: кнопка "Відкрити Канбан"

**Shell.tsx — навігація для DESIGNER:**
- **Видалити** "Заявки" з ролей DESIGNER (тільки ADMIN, PROJECT_MANAGER)
- **Додати** "Задачі" (Канбан) — вже в зміні 4
- Залишити: Моя робота, Сповіщення, Проєкти, Каталог послуг, Портфоліо, Матеріали, Заміри, Профіль

**Флоу DESIGNER:**
```
Бачить свої проєкти → заходить у проєкт → знімає заміри →
Створює кошторис (чернетка) → завантажує дизайн-файли (ескізи, рендери) →
Додає фото з об'єкту → веде свої задачі в Канбані
```

---

### 8.4 BRIGADIR — нова роль (повний опис)

#### Backend: дозволи

`operations.controller.ts` — дозволити BRIGADIR:
- `GET /operations/board` — бачити всі задачі (або тільки свої проєкти)
- `PATCH /operations/tasks/:id/status` — рухати задачі
- `POST /operations/tasks` — створювати задачі

`projects.controller.ts` — дозволити BRIGADIR:
- `GET /projects` — список проєктів (де бригадир призначений)
- `GET /projects/:id` — деталі проєкту (без фінансових даних — фільтрувати payments/invoices/receipts)

`photo-reports.controller.ts` — дозволити BRIGADIR:
- `GET /projects/:id/photo-reports` — переглядати
- `POST /photo-reports` — додавати фото з об'єкту

`measurements.controller.ts` — дозволити BRIGADIR:
- `GET /measurements` — переглядати заміри (read-only)

**Заборонено для BRIGADIR:** estimates, payments, invoices, receipts, CRM/orders, analytics, audit, users, portfolio, services

#### Frontend: Shell.tsx — навігація BRIGADIR

```tsx
// Навігація для BRIGADIR:
{ to: '/workspace/my-work', label: 'Мої задачі', group: 'Керування', roles: ['BRIGADIR'] }
{ to: '/workspace/kanban',  label: 'Канбан',     group: 'Проєкти',   roles: ['ADMIN','PROJECT_MANAGER','DESIGNER','BRIGADIR'] }
{ to: '/workspace/projects',label: 'Проєкти',    group: 'Проєкти',   roles: ['ADMIN','PROJECT_MANAGER','DESIGNER','BRIGADIR'] }
{ to: '/workspace/profile', label: 'Профіль',    group: 'Адміністрування', roles: [..., 'BRIGADIR'] }
```

Значок ролі: tone `amber`.

#### Frontend: App.tsx — route guards
Додати `'BRIGADIR'` до `RequireWorkspaceRoles` для routes:
- `/workspace/kanban` ✓ (вже в зміні 4)
- `/workspace/projects` та `/workspace/projects/:id`
- `/workspace/my-work`
- `/workspace/profile`

#### Frontend: нова сторінка `BrigadirWorkbenchPage.tsx`
Route: `/workspace/my-work` (замінює умову — для BRIGADIR рендерить свою версію)

**Вміст:**
```
[Мої задачі] — задачі де assigneeId = поточний staff
  - картки задач з кнопками переміщення
  - кнопка "Відкрити Канбан"

[Мої проєкти] — проєкти де brigadirId = поточний staff
  - список з посиланнями на деталі

[Швидко: Додати фото] — кнопка → відкриває форму photo-report з вибором проєкту
```

#### ProjectDetailPage — розширення для BRIGADIR
Показувати бригадиру (в межах його доступу):
- Основна інфо проєкту (назва, статус, замовник — без email/phone клієнта)
- Заміри (read-only)
- Задачі (з кнопками переміщення)
- Фото з об'єкту (create + view)
- Дизайн-файли (view only)
- **Приховати:** Кошторис, Платежі, Журнал дій

Для цього в `ProjectDetailPage.tsx` додати умову `isBrigadir` і ховати фінансові секції.

#### ProjectStatusActions — BRIGADIR
BRIGADIR не може переводити проєкт між статусами. Компонент повертає `null` для цієї ролі.

#### Staff assignment — призначення бригадира
`ProjectTeamAssignment.tsx` — PM може призначити brigadir до проєкту. Потрібно додати поле `brigadirStaffId` в:
- `project.schema.ts` — нове поле `brigadirId?: Types.ObjectId`
- `projects.service.ts → updateTeam()` — обробляти `brigadirStaffId`
- `UpdateProjectTeamDto` — додати `brigadirStaffId?: string`
- `ProjectTeamAssignment.tsx` — нове поле вибору бригадира
- `projects.service.ts → listForBrigadir()` — вибірка по `brigadirId`

---

### 8.5 CLIENT (Portal) — додати перегляд дизайн-файлів

**Поточний стан:** портал досить повний.

**Що додати:**
- `PortalProjectDetailPage.tsx` — додати `<ProjectDesignFilesSection>` (read-only для CLIENT)
- Клієнт бачить ескізи і рендери які дизайнер завантажив

**Флоу CLIENT:**
```
Реєструється → подає заявку (описує що хоче) →
Отримує повідомлення → переглядає кошторис →
Погоджує або просить зміни → оплачує →
Слідкує за прогресом проєкту → переглядає дизайн-файли →
Погоджує результат → залишає відгук
```

---

## Зміна 9 — Очистка після видалення ролей

### Frontend: App.tsx
- Перевірити всі `RequireWorkspaceRoles` — видалити згадки legacy ролей
- Прибрати route guards що включали WORKER, WORKER_LEAD, ESTIMATOR тощо

### Frontend: скрізь де використовується `role`
- Всі `role === 'WORKER'`, `role === 'ESTIMATOR'` тощо — видалити

### Backend: seed-mongo.js
- Якщо є seed-дані з legacy ролями — оновити їх на валідні ролі

---

## Залежності між змінами

```
[1. Видалення ролей] → має бути першим (все решта залежить від чистого enum)
[8.4 Brigadir]       → після [1]
[2. Переклади]       → незалежний
[3. Payment Gate]    → незалежний
[4. Канбан]          → після [1] і [8.4]
[5. Швидкі дії]      → після [4]
[6. File Upload]     → незалежний
[7. Design Files]    → після [6] (спільна file upload логіка)
[8.3 Designer Flow]  → після [4] (посилання на Канбан)
```

---

## Порядок реалізації (рекомендований)

| Фаза | Що | Де |
|---|---|---|
| 1 | Видалення 5 ролей + додавання BRIGADIR в enum і shared | backend + shared |
| 2 | Переклади WorkspaceReviewsModerationPage | frontend |
| 3 | Платіжний ґейт | backend + frontend |
| 4 | project.schema brigadirId + team assignment | backend + frontend |
| 5 | Activate Kanban route + nav + task creation API | backend + frontend |
| 6 | BrigadirWorkbenchPage + Brigadir permissions | backend + frontend |
| 7 | Designer flow (видалити claim, виправити My Work) | frontend |
| 8 | File upload UI | frontend |
| 9 | Design Files section | backend + frontend |
| 10 | Quick actions в ProjectDetailPage | frontend |
| 11 | Brigadir view in ProjectDetailPage | frontend |
| 12 | Client portal — design files | frontend |
