import {
	registerDecorator,
	type ValidationArguments,
	type ValidationOptions,
} from 'class-validator'
import { validateRequestedBudget } from './requested-budget.util'

export function isRequestedBudget(value: unknown): boolean {
	if (value === undefined || value === null || value === '') return true
	if (typeof value !== 'string') return false
	return validateRequestedBudget(value) === null
}

export function IsRequestedBudget(validationOptions?: ValidationOptions) {
	return (object: object, propertyName: string) => {
		registerDecorator({
			name: 'isRequestedBudget',
			target: object.constructor,
			propertyName,
			options: validationOptions,
			validator: {
				validate(value: unknown) {
					return isRequestedBudget(value)
				},
				defaultMessage(args: ValidationArguments) {
					if (typeof args.value === 'string') {
						const msg = validateRequestedBudget(args.value)
						if (msg) return msg
					}
					return (
						validationOptions?.message?.toString() ??
						'Некоректний орієнтовний бюджет'
					)
				},
			},
		})
	}
}
