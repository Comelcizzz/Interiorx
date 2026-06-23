import {
	registerDecorator,
	ValidationArguments,
	ValidationOptions,
} from 'class-validator'

export function isReferencePhotoUrl(value: unknown): boolean {
	if (typeof value !== 'string') return false
	const url = value.trim()
	if (!url) return false
	if (url.startsWith('/uploads/')) {
		return /^\/uploads\/[^/]+$/i.test(url)
	}
	try {
		const parsed = new URL(url)
		return parsed.protocol === 'http:' || parsed.protocol === 'https:'
	} catch {
		return false
	}
}

export function IsReferencePhotoUrl(validationOptions?: ValidationOptions) {
	return (object: object, propertyName: string) => {
		registerDecorator({
			name: 'isReferencePhotoUrl',
			target: object.constructor,
			propertyName,
			options: validationOptions,
			validator: {
				validate(value: unknown) {
					if (value === undefined || value === null) return true
					if (Array.isArray(value)) {
						return value.every((item) => isReferencePhotoUrl(item))
					}
					return isReferencePhotoUrl(value)
				},
				defaultMessage(args: ValidationArguments) {
					return (
						(args.constraints?.[0] as string | undefined) ??
						'Кожне референс-фото має бути посиланням https://… або завантаженим файлом'
					)
				},
			},
		})
	}
}
