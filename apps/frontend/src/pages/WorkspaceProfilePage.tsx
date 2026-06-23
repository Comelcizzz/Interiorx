import { Card, CardContent, PageHeader } from '@tailored/ui'
import { roleLabel } from '@tailored/shared'
import { AccountProfileForm } from '@/features/profile/AccountProfileForm'
import { useAuthStore } from '@/lib/auth-store'
export function WorkspaceProfilePage() {
	const user = useAuthStore((s) => s.user)
	if (!user) {
		return null
	}
	return (
		<div className="space-y-6">
			<PageHeader
				title="Профіль працівника"
				description="Контактні дані та доступ до внутрішньої панелі."
			/>
			<Card>
				<CardContent className="space-y-3 py-6">
					<div>
						<div className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--tds-muted)]">
							Роль
						</div>
						<div className="mt-1 text-sm font-semibold text-[var(--tds-ink)]">
							{roleLabel(user.role)}
						</div>
					</div>
					{user.title ? (
						<div>
							<div className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--tds-muted)]">
								Посада
							</div>
							<div className="mt-1 text-sm text-[var(--tds-ink)]">
								{user.title}
							</div>
						</div>
					) : null}
				</CardContent>
			</Card>
			<AccountProfileForm />
		</div>
	)
}
