import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
	IsNumberString,
	IsOptional,
	IsString,
	MinLength,
	ValidateIf,
} from 'class-validator'
export class MockPaymentDto {
	@ApiPropertyOptional({
		description:
			'When set, server uses invoice.amount; projectId and amount are ignored.',
	})
	@IsOptional()
	@IsString()
	invoiceId?: string
	@ApiProperty({ required: false })
	@ValidateIf((o: MockPaymentDto) => !o.invoiceId?.trim())
	@IsString()
	projectId?: string
	@ApiProperty({ example: '463800', required: false })
	@ValidateIf((o: MockPaymentDto) => !o.invoiceId?.trim())
	@IsNumberString()
	amount?: string
	@ApiProperty({ example: '4242 4242 4242 4242' })
	@IsString()
	@MinLength(12)
	cardNumber!: string
}
