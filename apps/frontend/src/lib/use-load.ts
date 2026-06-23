import { useCallback, useEffect, useState } from 'react'
export function useLoad<T>(loader: () => Promise<T>, deps: unknown[] = []) {
	const [data, setData] = useState<T | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [loading, setLoading] = useState(true)
	const [tick, setTick] = useState(0)
	const reload = useCallback(() => setTick((n) => n + 1), [])
	useEffect(() => {
		let alive = true
		setLoading(true)
		setError(null)
		loader()
			.then((result) => {
				if (alive) setData(result)
			})
			.catch((err) => {
				if (alive)
					setError(
						err?.response?.data?.message ??
							err?.message ??
							'Request failed'
					)
			})
			.finally(() => {
				if (alive) setLoading(false)
			})
		return () => {
			alive = false
		}
	}, [...deps, tick])
	return { data, error, loading, reload }
}
