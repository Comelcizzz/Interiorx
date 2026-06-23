import {
	BrandLockup,
	Button,
	WorkspaceShell,
	type WorkspaceNavItem,
} from '@tailored/ui'
import {
	Bell,
	FileText,
	FolderKanban,
	LayoutDashboard,
	ListTodo,
	LogOut,
	PlusCircle,
	Receipt,
	Star,
	User,
	WalletCards,
} from 'lucide-react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/lib/auth-store'
import { NotificationBell } from '@/components/NotificationBell'

const iconClass = 'h-4 w-4'
const nav: WorkspaceNavItem[] = [
	{
		to: '/portal/orders/new',
		label: 'Нова заявка',
		group: 'Портал',
		icon: <PlusCircle className={iconClass} />,
	},
	{
		to: '/portal/dashboard',
		label: 'Панель',
		group: 'Портал',
		icon: <LayoutDashboard className={iconClass} />,
	},
	{
		to: '/portal/orders',
		label: 'Мої заявки',
		group: 'Портал',
		icon: <ListTodo className={iconClass} />,
	},
	{
		to: '/portal/projects',
		label: 'Мої проєкти',
		group: 'Портал',
		icon: <FolderKanban className={iconClass} />,
	},
	{
		to: '/portal/reviews',
		label: 'Відгуки',
		group: 'Портал',
		icon: <Star className={iconClass} />,
	},
	{
		to: '/portal/notifications',
		label: 'Сповіщення',
		group: 'Портал',
		icon: <Bell className={iconClass} />,
	},
	{
		to: '/portal/profile',
		label: 'Профіль',
		group: 'Портал',
		icon: <User className={iconClass} />,
	},
	{
		to: '/portal/invoices',
		label: 'Рахунки',
		group: 'Портал',
		icon: <WalletCards className={iconClass} />,
	},
	{
		to: '/portal/receipts',
		label: 'Чеки',
		group: 'Портал',
		icon: <Receipt className={iconClass} />,
	},
]

export function PortalShell() {
	const navigate = useNavigate()
	const location = useLocation()
	const { user, logout } = useAuthStore()
	return (
		<WorkspaceShell
			brand={<BrandLockup />}
			subtitle={undefined}
			nav={nav}
			activePath={location.pathname}
			onNavigate={navigate}
			userName={user?.fullName}
			userRole={null}
			toolbar={
				<div className="flex items-center gap-1">
					<NotificationBell />
					<Button
						variant="ghost"
						className="px-2 text-[var(--tds-muted)] hover:text-[var(--tds-ink)]"
						onClick={() => {
							logout()
							navigate('/login')
						}}
						icon={<LogOut />}
					/>
				</div>
			}
		>
			<Outlet />
		</WorkspaceShell>
	)
}
