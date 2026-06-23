import {
	registerDecorator,
	type ValidationArguments,
	type ValidationOptions,
} from 'class-validator'
import { isUaPhone, validateUaPhone } from './ua-phone.util'

export { isUaPhone } from './ua-phone.util'

export function IsUaPhone(validationOptions?: ValidationOptions) {
	return (object: object, propertyName: string) => {
		registerDecorator({
			name: 'isUaPhone',
			target: object.constructor,
			propertyName,
			options: validationOptions,
			validator: {
				validate(value: unknown) {
					return isUaPhone(value)
				},
				defaultMessage(args: ValidationArguments) {
					if (typeof args.value === 'string') {
						const msg = validateUaPhone(args.value)
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
