import axios from 'axios'
import { LoginResponse } from './types'
function normalizeApiRoot(value?: string) {
	const raw = (value ?? 'http://localhost:4000/api').replace(/\/+$/, '')
	return /\/api$/i.test(raw) ? raw : `${raw}/api`
}
export const API_ROOT = normalizeApiRoot(import.meta.env.VITE_API_URL)
export const API_ORIGIN = API_ROOT.replace(/\/?api\/?$/i, '')
export function mediaUrl(path?: string | null) {
	if (!path) return ''
	if (path.startsWith('http://') || path.startsWith('https://')) return path
	return `${API_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`
}
export const api = axios.create({
	baseURL: API_ROOT,
})
export const publicApi = axios.create({
	baseURL: `${API_ROOT}/public`,
})
export const portalApi = axios.create({
	baseURL: `${API_ROOT}/portal`,
})
let unauthorizedHandler: (() => void) | null = null
export function setUnauthorizedHandler(handler: (() => void) | null) {
	unauthorizedHandler = handler
}
function installUnauthorizedInterceptor(instance: typeof api) {
	instance.interceptors.response.use(
		(response) => response,
		(error) => {
			if (error?.response?.status === 401) unauthorizedHandler?.()
			return Promise.reject(error)
		}
	)
}
installUnauthorizedInterceptor(api)
installUnauthorizedInterceptor(portalApi)
export function setApiToken(token?: string | null) {
	if (token) {
		const auth = `Bearer ${token}`
		api.defaults.headers.common.Authorization = auth
		portalApi.defaults.headers.common.Authorization = auth
		return
	}
	delete api.defaults.headers.common.Authorization
	delete portalApi.defaults.headers.common.Authorization
}
export async function loginRequest(email: string, password: string) {
	const { data } = await axios.post<LoginResponse>(`${API_ROOT}/auth/login`, {
		email,
		password,
	})
	return data
}
export async function registerClientRequest(payload: {
	email: string
	password: string
	fullName: string
	phone?: string
	companyName?: string
}) {
	const { data } = await publicApi.post<LoginResponse>(
		'/auth/register',
		payload
	)
	return data
}
export async function getApi<T>(url: string) {
	const { data } = await api.get<T>(url)
	return data
}
export async function postApi<T = unknown>(url: string, body: unknown) {
	const { data } = await api.post<T>(url, body)
	return data
}
export async function patchApi<T = unknown>(url: string, body: unknown) {
	const { data } = await api.patch<T>(url, body)
	return data
}
export async function deleteApi<T = unknown>(url: string) {
	const { data } = await api.delete<T>(url)
	return data
}
export type UploadFileResponse = {
	id: string
	url: string
	deduped?: boolean
	originalName?: string
	size?: number
	mimeType?: string
}
export async function uploadFile(
	file: File,
	options?: { purpose?: 'AVATAR' },
) {
	const form = new FormData()
	form.append('file', file)
	const query = options?.purpose ? `?purpose=${options.purpose}` : ''
	const { data } = await api.post<UploadFileResponse>(
		`/files/upload${query}`,
		form,
		{
			// Axios must set multipart boundary itself — do not force Content-Type.
			transformRequest: [
				(payload, headers) => {
					if (headers && typeof headers === 'object') {
						delete (headers as Record<string, unknown>)['Content-Type']
					}
					return payload
				},
			],
		},
	)
	return data
}
export async function downloadFile(url: string, fileName: string) {
	const response = await api.get<Blob>(url, { responseType: 'blob' })
	const href = URL.createObjectURL(response.data)
	const link = document.createElement('a')
	link.href = href
	link.download = fileName
	link.click()
	URL.revokeObjectURL(href)
}
