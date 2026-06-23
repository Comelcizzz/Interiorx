import { BrandLockup, Button } from '@tailored/ui'
import { Link, NavLink, useNavigate, useSearchParams } from 'react-router-dom'
import { defaultHomePath } from '@/app/guards'
import { clientAuthHref } from '@/lib/client-auth'
import { useAuthStore } from '@/lib/auth-store'

const NEW_ORDER_NEXT = '/portal/orders/new'

const navItems = [
	{ to: '/services', label: 'Послуги' },
	{ to: '/portfolio', label: 'Портфоліо' },
	{ to: '/reviews', label: 'Відгуки' },
	{ to: '/team', label: 'Команда' },
	{ to: '/contact', label: 'Контакти' },
]

export function PublicHeader({
	variant = 'full',
}: {
	/** Мінімальний хедер без маркетингової навігації (логін / реєстрація) */
	variant?: 'full' | 'minimal'
}) {
	const navigate = useNavigate()
	const [searchParams] = useSearchParams()
	const token = useAuthStore((s) => s.token)
	const user = useAuthStore((s) => s.user)
	const authQuery = {
		next: searchParams.get('next'),
		project: searchParams.get('project'),
	}

	function goPrimaryCta() {
		if (token) {
			navigate(defaultHomePath(user?.role))
			return
		}
		navigate(clientAuthHref('/login', { next: NEW_ORDER_NEXT }))
	}

	if (variant === 'minimal') {
		return (
			<header className="tds-public-header sticky top-0 z-40">
				<div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-4 lg:px-8">
					<Link to="/" className="shrink-0">
						<BrandLockup compact />
					</Link>
					<Button
						type="button"
						variant="ghost"
						onClick={() => navigate(clientAuthHref('/login', authQuery))}
					>
						Увійти
					</Button>
				</div>
			</header>
		)
	}

	return (
		<header className="tds-public-header sticky top-0 z-40">
			<div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-4 lg:px-8">
				<Link to="/" className="shrink-0">
					<BrandLockup compact />
				</Link>
				<nav className="hidden items-center gap-1 md:flex">
					{navItems.map((item) => (
						<NavLink
							key={item.to}
							to={item.to}
							className={({ isActive }) =>
								`rounded-full px-3 py-2 text-sm font-semibold transition ${
									isActive
										? 'bg-slate-950 text-white'
										: 'text-slate-600 hover:bg-white hover:text-slate-950'
								}`
							}
						>
							{item.label}
						</NavLink>
					))}
				</nav>
				<div className="flex items-center gap-2">
					<Button
						type="button"
						variant="ghost"
						className="hidden px-4 sm:inline-flex"
						onClick={() => navigate('/login')}
					>
						Увійти
					</Button>
					<Button type="button" className="px-4" onClick={goPrimaryCta}>
						{token ? 'Кабінет' : 'Створити заявку'}
					</Button>
				</div>
			</div>
		</header>
	)
}
