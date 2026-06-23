import { Card, CardContent, PageHeader } from '@tailored/ui'
import { roleLabel } from '@tailored/shared'
import { AccountProfileForm } from '@/features/profile/AccountProfileForm'
import { useAuthStore } from '@/lib/auth-store'
export function PortalProfilePage() {
	const user = useAuthStore((s) => s.user)
	return (
		<div className="space-y-6 p-6">
			<PageHeader
				title="Профіль"
				description="Контактні дані для клієнтського кабінету."
			/>
			{user ? (
				<Card>
					<CardContent className="py-4">
						<div className="text-xs font-bold uppercase text-slate-500">
							Роль
						</div>
						<div className="mt-1 text-sm font-semibold text-[var(--tds-ink)]">
							{roleLabel(user.role)}
						</div>
					</CardContent>
				</Card>
			) : null}
			<AccountProfileForm />
		</div>
	)
}
