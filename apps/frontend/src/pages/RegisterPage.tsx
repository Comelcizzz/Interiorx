import { Button, Input } from '@tailored/ui'
import { validateUaPhoneOptional } from '@tailored/shared'
import { FormEvent, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { PublicHeader } from '@/components/PublicHeader'
import { registerClientRequest } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import {
	clientAuthHref,
	clientPostAuthPath,
	isClientOrderAuthFlow,
} from '@/lib/client-auth'

export function RegisterPage() {
	const navigate = useNavigate()
	const [search] = useSearchParams()
	const token = useAuthStore((s) => s.token)
	const user = useAuthStore((s) => s.user)
	const setSession = useAuthStore((s) => s.setSession)
	const [fullName, setFullName] = useState('')
	const [email, setEmail] = useState('')
	const [phone, setPhone] = useState('')
	const [companyName, setCompanyName] = useState('')
	const [password, setPassword] = useState('')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	const [phoneError, setPhoneError] = useState<string | null>(null)

	const authQuery = {
		next: search.get('next'),
		project: search.get('project'),
	}
	const orderFlow = isClientOrderAuthFlow(search.get('next'))

	if (token) {
		return (
			<Navigate
				to={clientPostAuthPath(user?.role, authQuery)}
				replace
			/>
		)
	}

	async function submit(event: FormEvent) {
		event.preventDefault()
		setError('')
		const phoneMsg = validateUaPhoneOptional(phone)
		setPhoneError(phoneMsg)
		if (phoneMsg) return
		setLoading(true)
		try {
			const result = await registerClientRequest({
				fullName,
				email,
				phone,
				companyName,
				password,
			})
			setSession(result.accessToken, result.user)
			navigate(clientPostAuthPath(result.user.role, authQuery))
		} catch (err: unknown) {
			const maybeError = err as {
				response?: {
					data?: {
						message?: string
					}
				}
			}
			setError(maybeError.response?.data?.message ?? 'Не вдалося створити акаунт')
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="min-h-screen bg-[#f3f1ec] text-slate-950">
			<PublicHeader variant="minimal" />
			<div className="mx-auto max-w-lg space-y-6 px-6 py-10">
				<div>
					<h1 className="text-3xl font-black">
						{orderFlow ? 'Оформити заявку' : 'Створити акаунт клієнта'}
					</h1>
					<p className="mt-2 text-sm text-slate-600">
						{orderFlow
							? 'Створіть профіль або увійдіть у наявний акаунт — після цього відкриється форма заявки.'
							: 'Після реєстрації можна оформити заявку, переглядати проєкти, рахунки, документи і чеки.'}
					</p>
				</div>
				<form className="space-y-3" onSubmit={submit}>
					<Input
						required
						value={fullName}
						onChange={(e) => setFullName(e.target.value)}
						placeholder="Імʼя та прізвище"
					/>
					<Input
						required
						type="email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						placeholder="Email"
					/>
					<Input
						value={phone}
						onChange={(e) => {
							setPhone(e.target.value)
							if (phoneError) setPhoneError(null)
						}}
						onBlur={() => setPhoneError(validateUaPhoneOptional(phone))}
						inputMode="tel"
						autoComplete="tel"
						placeholder="+380 67 123 45 67"
					/>
					{phoneError ? (
						<p className="text-xs text-rose-600">{phoneError}</p>
					) : null}
					<Input
						value={companyName}
						onChange={(e) => setCompanyName(e.target.value)}
						placeholder="Компанія (необовʼязково)"
					/>
					<Input
						required
						type="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						placeholder="Пароль"
					/>
					{error ? <p className="text-sm text-rose-600">{error}</p> : null}
					<Button type="submit" disabled={loading}>
						{loading ? 'Створюємо...' : 'Зареєструватися'}
					</Button>
				</form>
				<p className="text-center text-sm text-slate-600">
					Вже маєте акаунт?{' '}
					<Link
						to={clientAuthHref('/login', authQuery)}
						className="font-semibold text-[var(--tds-primary)]"
					>
						Увійти
					</Link>
				</p>
			</div>
		</div>
	)
}
