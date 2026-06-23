import { Badge, Card, CardContent, PageHeader } from '@tailored/ui'
import { projectStatusLabels } from '@tailored/shared'
import { Briefcase, ClipboardList } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getApi } from '@/lib/api'
import { useLoad } from '@/lib/use-load'

type MineProject = {
  id: string
  code: string
  title: string
  status: string
  city?: string
  clientName: string
  openTasks: number
}

export function DesignerWorkbenchPage() {
  const mine = useLoad(
    () => getApi<{ items: MineProject[]; total: number }>('/projects/mine'),
    [],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Моя робота"
        description="Призначені проєкти та задачі."
      />

      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 text-sm font-black text-[var(--tds-ink)]">
              <Briefcase className="h-4 w-4 text-[var(--tds-primary)]" />
              Мої проєкти
            </div>
            <Link
              to="/workspace/projects"
              className="text-xs font-bold text-[var(--tds-primary)] hover:underline"
            >
              Всі проєкти →
            </Link>
          </div>
          {mine.loading ? (
            <p className="text-sm text-slate-500">Завантажуємо…</p>
          ) : mine.data?.items.length ? (
            <ul className="space-y-2">
              {mine.data.items.map((p) => (
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
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--tds-muted)]">
                      <span>{p.code}</span>
                      <Badge tone="neutral">
                        {projectStatusLabels[
                          p.status as keyof typeof projectStatusLabels
                        ] ?? p.status}
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
              Поки немає призначених проєктів. Менеджер призначить вас до проєкту.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3 text-sm">
        <Link
          to="/workspace/kanban"
          className="flex items-center gap-1 font-bold text-[var(--tds-primary)] hover:underline"
        >
          <ClipboardList className="h-3.5 w-3.5" />
          Мої задачі (Канбан) →
        </Link>
        <Link
          to="/workspace/projects"
          className="font-bold text-[var(--tds-primary)] hover:underline"
        >
          Усі проєкти →
        </Link>
      </div>
    </div>
  )
}
