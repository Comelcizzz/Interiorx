import {
	Badge,
	BrandLockup,
	Button,
	WorkspaceShell,
	type WorkspaceNavItem,
} from '@tailored/ui'
import {
	Activity,
	BarChart3,
	Bell,
	BookMarked,
	ClipboardList,
	FileText,
	Inbox,
	LayoutDashboard,
	LayoutGrid,
	LogOut,
	Receipt,
	Ruler,
	Star,
	UserCircle,
	UsersRound,
} from 'lucide-react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import type { RoleCode } from '@tailored/shared'
import { normalizeWorkspaceRole, roleLabel } from '@tailored/shared'
import { useAuthStore } from '@/lib/auth-store'
import { NotificationBell } from '@/components/NotificationBell'
const iconClass = 'h-4 w-4'
type NavWithRoles = WorkspaceNavItem & {
	roles?: readonly RoleCode[]
}
const navItems: NavWithRoles[] = [
	{
		to: '/workspace/dashboard',
		label: 'Огляд',
		group: 'Керування',
		icon: <LayoutDashboard className={iconClass} />,
		roles: ['ADMIN', 'PROJECT_MANAGER'],
	},
	{
		to: '/workspace/my-work',
		label: 'Моя робота',
		group: 'Керування',
		icon: <LayoutDashboard className={iconClass} />,
		roles: ['DESIGNER'],
	},
	{
		to: '/workspace/my-work',
		label: 'Мої задачі',
		group: 'Керування',
		icon: <LayoutDashboard className={iconClass} />,
		roles: ['BRIGADIR'],
	},
	{
		to: '/workspace/notifications',
		label: 'Сповіщення',
		group: 'Керування',
		icon: <Bell className={iconClass} />,
		roles: ['ADMIN', 'PROJECT_MANAGER', 'DESIGNER'],
	},
	{
		to: '/workspace/analytics',
		label: 'Звіти',
		group: 'Керування',
		icon: <BarChart3 className={iconClass} />,
		roles: ['ADMIN', 'PROJECT_MANAGER'],
	},
	{
		to: '/workspace/orders',
		label: 'Заявки',
		group: 'Проєкти',
		icon: <Inbox className={iconClass} />,
		roles: ['ADMIN', 'PROJECT_MANAGER'],
	},
	{
		to: '/workspace/projects',
		label: 'Проєкти',
		group: 'Проєкти',
		icon: <Ruler className={iconClass} />,
		roles: ['ADMIN', 'PROJECT_MANAGER', 'DESIGNER'],
	},
	{
		to: '/workspace/kanban',
		label: 'Задачі',
		group: 'Проєкти',
		icon: <ClipboardList className={iconClass} />,
		roles: ['ADMIN', 'PROJECT_MANAGER', 'DESIGNER', 'BRIGADIR'],
	},
	{
		to: '/workspace/services',
		label: 'Каталог послуг',
		group: 'Бізнес',
		icon: <BookMarked className={iconClass} />,
		roles: ['ADMIN', 'DESIGNER'],
	},
	{
		to: '/workspace/portfolio',
		label: 'Портфоліо',
		group: 'Бізнес',
		icon: <LayoutGrid className={iconClass} />,
		roles: ['ADMIN', 'DESIGNER'],
	},
	{
		to: '/workspace/estimates',
		label: 'Кошториси',
		group: 'Бізнес',
		icon: <FileText className={iconClass} />,
		roles: ['ADMIN', 'PROJECT_MANAGER'],
	},
	{
		to: '/workspace/measurements',
		label: 'Заміри',
		group: 'Бізнес',
		icon: <Ruler className={iconClass} />,
		roles: ['ADMIN', 'PROJECT_MANAGER', 'DESIGNER'],
	},
	{
		to: '/workspace/payments',
		label: 'Платежі',
		group: 'Фінанси',
		icon: <Receipt className={iconClass} />,
		roles: ['ADMIN', 'PROJECT_MANAGER'],
	},
	{
		to: '/workspace/receipts',
		label: 'Чеки',
		group: 'Фінанси',
		icon: <Receipt className={iconClass} />,
		roles: ['ADMIN', 'PROJECT_MANAGER'],
	},
	{
		to: '/workspace/profile',
		label: 'Профіль',
		group: 'Адміністрування',
		icon: <UserCircle className={iconClass} />,
		roles: ['ADMIN', 'PROJECT_MANAGER', 'DESIGNER', 'BRIGADIR'],
	},
	{
		to: '/workspace/audit',
		label: 'Журнал дій',
		group: 'Адміністрування',
		icon: <Activity className={iconClass} />,
		roles: ['ADMIN', 'PROJECT_MANAGER'],
	},
	{
		to: '/workspace/reviews',
		label: 'Відгуки',
		group: 'Адміністрування',
		icon: <Star className={iconClass} />,
		roles: ['ADMIN', 'PROJECT_MANAGER'],
	},
	{
		to: '/workspace/users',
		label: 'Користувачі',
		group: 'Адміністрування',
		icon: <UsersRound className={iconClass} />,
		roles: ['ADMIN', 'PROJECT_MANAGER'],
	},
]
const roleTone: Record<string, 'neutral' | 'green' | 'blue' | 'amber' | 'red'> =
	{
		ADMIN: 'red',
		PROJECT_MANAGER: 'blue',
		DESIGNER: 'green',
		BRIGADIR: 'amber',
		CLIENT: 'neutral',
	}
export function Shell() {
	const navigate = useNavigate()
	const location = useLocation()
	const { user, logout } = useAuthStore()
	const effectiveRole = normalizeWorkspaceRole(user?.role)
	const tone = effectiveRole
		? (roleTone[effectiveRole] ?? 'neutral')
		: 'neutral'
	const nav: WorkspaceNavItem[] = navItems
		.filter(
			(item) =>
				!item.roles ||
				(effectiveRole != null && item.roles.includes(effectiveRole))
		)
		.map(({ roles: _r, ...rest }) => rest)
	return (
		<WorkspaceShell
			brand={<BrandLockup />}
			subtitle="Заявки, проєкти, кошториси, оплати та чеки."
			nav={nav}
			activePath={location.pathname}
			onNavigate={navigate}
			userName={user?.fullName}
			userRole={
				user?.role ? (
					<Badge tone={tone}>{roleLabel(user.role)}</Badge>
				) : null
			}
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
