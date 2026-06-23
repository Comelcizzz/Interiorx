const UA_MOBILE_OPERATOR_CODES = new Set([
	'39',
	'50',
	'63',
	'66',
	'67',
	'68',
	'73',
	'91',
	'92',
	'93',
	'94',
	'95',
	'96',
	'97',
	'98',
	'99',
])

export function normalizeUaPhoneDigits(phone: string): string | null {
	const raw = phone.replace(/\D/g, '')
	if (raw.length === 10 && raw.startsWith('0')) {
		return `38${raw}`
	}
	if (raw.length === 12 && raw.startsWith('380')) {
		return raw
	}
	if (raw.length === 11 && raw.startsWith('80')) {
		return `3${raw}`
	}
	return null
}

function isTrivialSubscriber(subscriber: string): boolean {
	if (!/^\d{7}$/.test(subscriber)) return true
	if (/^0+$/.test(subscriber)) return true
	if (/^(\d)\1{6}$/.test(subscriber)) return true
	if (subscriber === '1234567' || subscriber === '7654321') return true
	return false
}

export function validateUaPhone(phone: string): string | null {
	const t = phone.trim()
	if (!t) {
		return 'Вкажіть телефон для звʼязку.'
	}
	const digits = normalizeUaPhoneDigits(t)
	if (!digits) {
		return 'Формат: +380 67 123 45 67 або 067 123 45 67 (10 цифр після 0).'
	}
	const operator = digits.slice(3, 5)
	if (!UA_MOBILE_OPERATOR_CODES.has(operator)) {
		return 'Невідомий код оператора. Допустимі мобільні: 050, 063, 066–068, 073, 091–099, 039.'
	}
	const subscriber = digits.slice(5)
	if (isTrivialSubscriber(subscriber)) {
		return 'Вкажіть реальний номер — не однакові чи тестові цифри.'
	}
	return null
}

export function isUaPhone(value: unknown): boolean {
	if (typeof value !== 'string') return false
	return validateUaPhone(value) === null
}
