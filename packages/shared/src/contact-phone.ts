import { formatUaPhoneE164, validateUaPhone } from './ua-phone'

function isTrivialDigits(digits: string): boolean {
	if (!/^\d+$/.test(digits)) return true
	if (/^(\d)\1+$/.test(digits)) return true
	if (digits === '12345678' || digits === '87654321') return true
	return false
}

/** Контактний телефон: український мобільний або міжнародний (E.164, 8–15 цифр). */
export function validateContactPhone(phone: string): string | null {
	const t = phone.trim()
	if (!t) {
		return 'Вкажіть телефон для звʼязку.'
	}
	if (validateUaPhone(t) === null) {
		return null
	}
	const digits = t.replace(/\D/g, '')
	if (digits.length >= 8 && digits.length <= 15) {
		if (isTrivialDigits(digits)) {
			return 'Вкажіть реальний номер телефону.'
		}
		return null
	}
	return 'Формат: +380…, 067… або міжнародний номер (+48…, +1…).'
}

export function isValidContactPhone(phone: string): boolean {
	return validateContactPhone(phone) === null
}

/** Для збереження / API: +XXXXXXXXXXX */
export function formatContactPhoneE164(phone: string): string | null {
	const ua = formatUaPhoneE164(phone)
	if (ua) return ua
	const digits = phone.replace(/\D/g, '')
	if (digits.length >= 8 && digits.length <= 15 && !isTrivialDigits(digits)) {
		return `+${digits}`
	}
	return null
}
