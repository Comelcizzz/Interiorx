import {
	registerDecorator,
	type ValidationArguments,
	type ValidationOptions,
} from 'class-validator'

function parseDateOnly(value: string): Date | null {
	const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim())
	if (!m) return null
	const y = Number(m[1])
	const mo = Number(m[2]) - 1
	const d = Number(m[3])
	const date = new Date(y, mo, d)
	if (
		date.getFullYear() !== y ||
		date.getMonth() !== mo ||
		date.getDate() !== d
	) {
		return null
	}
	return date
}

function startOfLocalDay(d: Date): Date {
	return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function isCalendarDateAfterToday(value: unknown): boolean {
	if (typeof value !== 'string' || !value.trim()) return true
	const d = parseDateOnly(value)
	if (!d) return false
	return (
		startOfLocalDay(d).getTime() > startOfLocalDay(new Date()).getTime()
	)
}

export function IsAfterToday(validationOptions?: ValidationOptions) {
	return (object: object, propertyName: string) => {
		registerDecorator({
			name: 'isAfterToday',
			target: object.constructor,
			propertyName,
			options: validationOptions,
			validator: {
				validate(value: unknown) {
					return isCalendarDateAfterToday(value)
				},
				defaultMessage(args: ValidationArguments) {
					return (
						validationOptions?.message?.toString() ??
						`${args.property} must be a calendar date after today`
					)
				},
			},
		})
	}
}
