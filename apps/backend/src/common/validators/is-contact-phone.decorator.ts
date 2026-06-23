import { validateContactPhone } from '@tailored/shared'
import {
	registerDecorator,
	type ValidationArguments,
	type ValidationOptions,
} from 'class-validator'

export function isContactPhone(value: unknown): boolean {
	return typeof value === 'string' && validateContactPhone(value) === null
}

export function IsContactPhone(validationOptions?: ValidationOptions) {
	return (object: object, propertyName: string) => {
		registerDecorator({
			name: 'isContactPhone',
			target: object.constructor,
			propertyName,
			options: validationOptions,
			validator: {
				validate(value: unknown) {
					return isContactPhone(value)
				},
				defaultMessage(args: ValidationArguments) {
					if (typeof args.value === 'string') {
						const msg = validateContactPhone(args.value)
						if (msg) return msg
					}
					return (
						validationOptions?.message?.toString() ??
						'Некоректний номер телефону'
					)
				},
			},
		})
	}
}
