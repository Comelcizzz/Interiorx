import {
	IsISO8601,
	IsMongoId,
	IsOptional,
	IsString,
	MaxLength,
	MinLength,
} from 'class-validator'
import { IsAfterToday } from '../../common/validators/is-after-today.decorator'
import { IsRequestedBudget } from '../../common/validators/is-requested-budget.decorator'
import { IsUaPhone } from '../../common/validators/is-ua-phone.decorator'

export class CreateOrderDto {
	@IsMongoId()
	clientId!: string

	@IsString()
	@MinLength(3)
	@MaxLength(160)
	title!: string

	@IsString()
	@MinLength(5)
	@MaxLength(4000)
	description!: string

	@IsOptional()
	@IsString()
	@MaxLength(80)
	@IsRequestedBudget()
	requestedBudget?: string

	@IsOptional()
	@IsISO8601()
	@IsAfterToday({
		message:
			'Бажаний старт не може бути сьогодні чи в минулому — оберіть дату з завтра',
	})
	preferredStart?: string

	@IsString()
	@MinLength(3)
	@MaxLength(200)
	addressLine!: string

	@IsString()
	@MinLength(2)
	@MaxLength(80)
	city!: string

	@IsString()
	@IsUaPhone({
		message:
			'Телефон у форматі +380XXXXXXXXX або 0XXXXXXXXX (10 цифр після 0)',
	})
	phone!: string
}
