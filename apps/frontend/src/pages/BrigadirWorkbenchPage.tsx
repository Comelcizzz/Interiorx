import { Badge, Button, Card, CardContent, PageHeader } from '@tailored/ui'
import { projectStatusLabels, taskStatusLabels } from '@tailored/shared'
import { ClipboardList, HardHat } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getApi, patchApi } from '@/lib/api'
import { useLoad } from '@/lib/use-load'

type MineProject = {
  id: string
  code: string
  title: string
  status: string
  city?: string
  openTasks: number
}

type BoardTask = {
  id: string
  title: string
  status: string
  priority: number
  project: { code: string; title: string }
  assigneeName?: string
  dueDate?: string
}

const priorityColors = ['#dc2626', '#f97316', '#eab308', '#22c55e', '#94a3b8']

const NEXT_STATUS: Record<string, string> = {
  BACKLOG: 'IN_PROGRESS',
  READY: 'IN_PROGRESS',
  IN_PROGRESS: 'DONE',
  REVIEW: 'DONE',
}

export function BrigadirWorkbenchPage() {
  const myProjects = useLoad(
    () => getApi<{ items: MineProject[]; total: number }>('/projects/mine/brigadir'),
    [],
  )
  const board = useLoad(
    () =>
      getApi<{ byStatus: Record<string, BoardTask[]>; total: number }>(
        '/operations/board',
      ),
    [],
  )

  const myTasks =
    board.data
      ? Object.values(board.data.byStatus)
          .flat()
          .filter((t) => t.status !== 'DONE')
          .slice(0, 15)
      : []

  async function moveTask(id: string, status: string) {
    await patchApi(`/operations/tasks/${id}/status`, { status })
    board.reload()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Мій робочий стіл"
        description="Задачі та проєкти бригади."
        actions={
          <Link to="/workspace/kanban">
            <Button type="button" variant="secondary">
              <ClipboardList className="mr-2 h-4 w-4" />
              Повний Канбан
            </Button>
          </Link>
        }
      />

      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm font-black text-[var(--tds-ink)]">
              <ClipboardList className="h-4 w-4 text-[var(--tds-primary)]" />
              Активні задачі
            </div>
          </div>
          {board.loading ? (
            <p className="text-sm text-slate-500">Завантажуємо…</p>
          ) : myTasks.length ? (
            <ul className="space-y-2">
              {myTasks.map((t) => (
                <li
                  key={t.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-[14px] border border-white/70 bg-white/45 px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: priorityColors[(t.priority - 1) % 5] }}
                      />
                      <span className="font-bold text-[var(--tds-ink)] truncate">
                        {t.title}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-[var(--tds-muted)]">
                      <span>{t.project.code}</span>
                      <Badge tone="neutral">
                        {taskStatusLabels[t.status as keyof typeof taskStatusLabels] ?? t.status}
                      </Badge>
                      {t.dueDate ? <span>до {t.dueDate.slice(0, 10)}</span> : null}
                    </div>
                  </div>
                  {NEXT_STATUS[t.status] ? (
                    <button
                      onClick={() => void moveTask(t.id, NEXT_STATUS[t.status])}
                      className="rounded-full border border-white/70 bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-[var(--tds-muted)] transition hover:border-[var(--tds-primary)] hover:text-[var(--tds-primary)]"
                    >
                      →{' '}
                      {taskStatusLabels[NEXT_STATUS[t.status] as keyof typeof taskStatusLabels]}
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">Активних задач немає.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm font-black text-[var(--tds-ink)]">
              <HardHat className="h-4 w-4 text-[var(--tds-primary)]" />
              Мої об'єкти
            </div>
            <Link
              to="/workspace/projects"
              className="text-xs font-bold text-[var(--tds-primary)] hover:underline"
            >
              Всі проєкти →
            </Link>
          </div>
          {myProjects.loading ? (
            <p className="text-sm text-slate-500">Завантажуємо…</p>
          ) : myProjects.data?.items.length ? (
            <ul className="space-y-2">
              {myProjects.data.items.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-[14px] border border-white/70 bg-white/45 px-3 py-2"
                >
                  <div>
                    <Link
                      to={`/workspace/projects/${p.id}`}
                      className="font-bold text-[var(--tds-ink)] hover:text-[var(--tds-primary)]"
                    >
                      {p.title}
                    </Link>
                    <div className="mt-1 flex items-center gap-2 text-xs text-[var(--tds-muted)]">
                      <span>{p.code}</span>
                      <Badge tone="neutral">
                        {projectStatusLabels[p.status as keyof typeof projectStatusLabels] ?? p.status}
                      </Badge>
                      {p.city ? <span>{p.city}</span> : null}
                      <span>задач: {p.openTasks}</span>
                    </div>
                  </div>
                  <Link
                    to={`/workspace/projects/${p.id}`}
                    className="text-xs font-bold text-[var(--tds-primary)]"
                  >
                    Відкрити →
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">
              Поки немає призначених об'єктів. Менеджер призначить вас до проєкту.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
