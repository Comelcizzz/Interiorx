import { BrandLockup, Button, Input } from '@tailored/ui'
import { ArrowRight } from 'lucide-react'
import { FormEvent, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { loginRequest } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import {
	clientAuthHref,
	clientPostAuthPath,
	isClientOrderAuthFlow,
} from '@/lib/client-auth'

const quickAccounts = [
	'client@tailored.demo',
	'manager@tailored.demo',
	'designer@tailored.demo',
	'brigadir@tailored.demo',
	'admin@tailored.demo',
]

export function LoginPortalPage() {
	const navigate = useNavigate()
	const [params] = useSearchParams()
	const token = useAuthStore((s) => s.token)
	const user = useAuthStore((s) => s.user)
	const setSession = useAuthStore((s) => s.setSession)
	const [email, setEmail] = useState('client@tailored.demo')
	const [password, setPassword] = useState('Demo12345!')
	const [error, setError] = useState('')
	const [loading, setLoading] = useState(false)

	const authQuery = {
		next: params.get('next'),
		project: params.get('project'),
	}
	const orderFlow = isClientOrderAuthFlow(params.get('next'))

	if (token) {
		return (
			<Navigate
				to={clientPostAuthPath(user?.role, authQuery)}
				replace
			/>
		)
	}

	async function submit(e: FormEvent) {
		e.preventDefault()
		setError('')
		setLoading(true)
		try {
			const result = await loginRequest(email, password)
			setSession(result.accessToken, result.user)
			navigate(clientPostAuthPath(result.user.role, authQuery))
		} catch (err: unknown) {
			const maybeError = err as { response?: { data?: { message?: string } } }
			setError(maybeError.response?.data?.message ?? 'Не вдалося увійти')
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="tds-shell min-h-screen">
			<div className="tds-gradient-bg" />
			<header className="relative z-20 mx-auto flex max-w-6xl justify-center px-5 py-8 lg:px-8">
				<Link to="/" className="inline-block">
					<BrandLockup compact />
				</Link>
			</header>

			<main className="relative z-10 mx-auto flex max-w-6xl justify-center px-5 pb-12 pt-2 lg:px-8">
				<section className="tds-glass-card w-full max-w-[520px] rounded-[30px] p-7 shadow-[0_24px_80px_rgba(17,24,39,0.14)]">
					<div className="text-center">
						<h1 className="text-3xl font-black leading-tight text-[var(--tds-ink)]">
							{orderFlow ? 'Оформити заявку' : 'INTERIORIX'}
						</h1>
						<p className="mt-2 text-sm leading-6 text-[var(--tds-muted)]">
							{orderFlow
								? 'Увійдіть у клієнтський кабінет або створіть новий акаунт.'
								: 'Увійдіть, щоб продовжити.'}
						</p>
					</div>

					<form className="mt-7 space-y-4" onSubmit={submit}>
						<div>
							<label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-[var(--tds-dark)]">
								Email
							</label>
							<Input
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								autoComplete="email"
							/>
						</div>
						<div>
							<label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-[var(--tds-dark)]">
								Пароль
							</label>
							<Input
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								autoComplete="current-password"
							/>
						</div>
						{error ? (
							<div className="rounded-[12px] border border-rose-200/70 bg-rose-50/80 px-3 py-2 text-sm text-rose-700">
								{error}
							</div>
						) : null}
						<Button type="submit" className="w-full" disabled={loading}>
							{loading ? 'Входимо...' : 'Увійти'}
							{!loading && <ArrowRight className="ml-1 h-4 w-4" />}
						</Button>
					</form>

					<p className="mt-5 text-center text-sm text-[var(--tds-muted)]">
						Немає акаунта?{' '}
						<Link
							to={clientAuthHref('/register', authQuery)}
							className="font-semibold text-[var(--tds-primary)]"
						>
							Створити профіль клієнта
						</Link>
					</p>

					<div className="mt-6">
						<div className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--tds-muted)]">
							Швидкий вибір ролі (демо)
						</div>
						<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
							{quickAccounts.map((account) => (
								<button
									key={account}
									type="button"
									className="tds-glass-control rounded-[14px] px-3 py-2 text-left text-xs font-semibold text-[var(--tds-muted)] transition hover:text-[var(--tds-primary)]"
									onClick={() => setEmail(account)}
								>
									{account}
								</button>
							))}
						</div>
					</div>
				</section>
			</main>
		</div>
	)
}
