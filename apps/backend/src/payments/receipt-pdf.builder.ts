import * as fs from 'fs'
import * as path from 'path'
import PDFDocument from 'pdfkit'
import QRCode from 'qrcode'

export type ReceiptPdfInput = {
	number: string
	issuedAt: Date
	amount: string
	currency: string
	status: string
	company: {
		brand: string
		legalName: string
		address: string
		phone: string
		email: string
		website: string
		edrpou: string
	}
	client: {
		fullName: string
		email: string
		phone?: string | null
	}
	project: {
		code: string
		title: string
	}
	payment: {
		method: string
		providerRef?: string | null
		paidAt?: Date | null
	}
	invoice?: {
		number: string
		dueDate?: Date | null
	} | null
	lineDescription: string
	verifyUrl: string
}

type FontSet = { regular: string; bold: string }

function resolveDejaVuFonts(): FontSet {
	const roots = [
		path.join(process.cwd(), 'node_modules/dejavu-fonts-ttf'),
		path.join(process.cwd(), '../../node_modules/dejavu-fonts-ttf'),
		path.join(__dirname, '../../../node_modules/dejavu-fonts-ttf'),
		path.join(__dirname, '../../../../node_modules/dejavu-fonts-ttf'),
		path.join(__dirname, '../../../../../node_modules/dejavu-fonts-ttf'),
	]
	for (const root of roots) {
		const regular = path.join(root, 'ttf/DejaVuSans.ttf')
		const bold = path.join(root, 'ttf/DejaVuSans-Bold.ttf')
		if (fs.existsSync(regular) && fs.existsSync(bold)) {
			return { regular, bold }
		}
	}
	throw new Error(
		'DejaVu fonts not found. Run npm install dejavu-fonts-ttf in the backend workspace.'
	)
}

function formatMoney(amount: string, currency: string) {
	const n = Number(amount)
	if (!Number.isFinite(n)) return `${amount} ${currency}`
	return new Intl.NumberFormat('uk-UA', {
		style: 'currency',
		currency: currency === 'UAH' ? 'UAH' : currency,
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(n)
}

function formatDateTimeUk(value: Date) {
	return value.toLocaleString('uk-UA', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	})
}

function paymentMethodUk(method: string) {
	const key = method.toLowerCase()
	if (key.includes('card')) return 'Банківська картка'
	if (key.includes('bank')) return 'Банківський переказ'
	if (key.includes('cash')) return 'Готівка'
	return method
}

function receiptStatusUk(status: string) {
	if (status === 'ISSUED') return 'Оплачено'
	if (status === 'VOID' || status === 'VOIDED') return 'Анульовано'
	return status
}

type PdfDoc = InstanceType<typeof PDFDocument>

function hr(doc: PdfDoc, yPad = 10) {
	const { left, right } = doc.page.margins
	const w = doc.page.width - left - right
	const y = doc.y + yPad / 2
	doc.moveTo(left, y).lineTo(left + w, y).strokeColor('#cbd5e1').lineWidth(0.5).stroke()
	doc.strokeColor('#0f172a')
	doc.moveDown(yPad / 14)
}

function labelValue(
	doc: PdfDoc,
	label: string,
	value: string,
	fonts: FontSet,
	opts?: { boldValue?: boolean },
	contentW?: number
) {
	const x = doc.page.margins.left
	const w =
		contentW ??
		doc.page.width - doc.page.margins.left - doc.page.margins.right
	const y0 = doc.y
	doc.font(fonts.regular).fontSize(9).fillColor('#64748b')
	const labelH = doc.heightOfString(label, { width: w * 0.4 })
	doc.text(label, x, y0, { width: w * 0.4 })
	doc
		.font(opts?.boldValue ? fonts.bold : fonts.regular)
		.fontSize(10)
		.fillColor('#0f172a')
	const valueH = doc.heightOfString(value, { width: w * 0.58 })
	doc.text(value, x + w * 0.42, y0, { width: w * 0.58, align: 'right' })
	doc.y = y0 + Math.max(labelH, valueH) + 6
}

export async function buildReceiptPdf(input: ReceiptPdfInput): Promise<Buffer> {
	const fonts = resolveDejaVuFonts()
	const qrPng = await QRCode.toBuffer(input.verifyUrl, {
		type: 'png',
		margin: 1,
		width: 160,
	})

	return new Promise<Buffer>((resolve, reject) => {
		const doc = new PDFDocument({
			size: 'A4',
			margin: 48,
			info: {
				Title: `Чек ${input.number}`,
				Author: input.company.brand,
			},
		})
		const chunks: Buffer[] = []
		doc.on('data', (c) => chunks.push(c))
		doc.on('end', () => resolve(Buffer.concat(chunks)))
		doc.on('error', reject)

		doc.registerFont('ReceiptRegular', fonts.regular)
		doc.registerFont('ReceiptBold', fonts.bold)

		const contentW =
			doc.page.width - doc.page.margins.left - doc.page.margins.right

		// —— Шапка продавця ——
		doc.font('ReceiptBold').fontSize(16).fillColor('#0f172a').text(
			input.company.brand,
			{ align: 'center', width: contentW }
		)
		doc.font('ReceiptRegular').fontSize(9).fillColor('#475569')
		doc.text(input.company.legalName, { align: 'center', width: contentW })
		doc.text(input.company.address, { align: 'center', width: contentW })
		doc.text(
			`${input.company.phone} · ${input.company.email}`,
			{ align: 'center', width: contentW }
		)
		doc.text(input.company.website, { align: 'center', width: contentW })
		doc.text(`ЄДРПОУ: ${input.company.edrpou}`, {
			align: 'center',
			width: contentW,
		})

		hr(doc, 12)

		doc.font('ReceiptBold').fontSize(13).fillColor('#0f172a').text(
			'ЕЛЕКТРОННИЙ ЧЕК ОПЛАТИ',
			{ align: 'center', width: contentW }
		)
		doc.font('ReceiptBold').fontSize(11).fillColor('#166534').text(
			`№ ${input.number}`,
			{ align: 'center', width: contentW }
		)
		doc.moveDown(0.5)

		labelValue(
			doc,
			'Дата та час видачі',
			formatDateTimeUk(input.issuedAt),
			fonts,
			{ boldValue: true },
			contentW
		)
		if (input.payment.paidAt) {
			labelValue(
				doc,
				'Дата оплати',
				formatDateTimeUk(input.payment.paidAt),
				fonts,
				undefined,
				contentW
			)
		}
		labelValue(
			doc,
			'Форма оплати',
			paymentMethodUk(input.payment.method),
			fonts,
			undefined,
			contentW
		)
		labelValue(doc, 'Статус', receiptStatusUk(input.status), fonts, {
			boldValue: true,
		}, contentW)

		hr(doc)

		doc.font('ReceiptBold').fontSize(10).fillColor('#0f172a').text('ПОКУПЕЦЬ')
		doc.moveDown(0.25)
		labelValue(doc, "ПІБ / назва", input.client.fullName, fonts, {
			boldValue: true,
		}, contentW)
		labelValue(doc, 'Email', input.client.email, fonts, undefined, contentW)
		if (input.client.phone) {
			labelValue(doc, 'Телефон', input.client.phone, fonts, undefined, contentW)
		}

		hr(doc)

		doc.font('ReceiptBold').fontSize(10).fillColor('#0f172a').text('ПРОЄКТ')
		doc.moveDown(0.25)
		labelValue(doc, 'Код проєкту', input.project.code, fonts, undefined, contentW)
		labelValue(doc, 'Назва', input.project.title, fonts, { boldValue: true }, contentW)
		if (input.invoice?.number) {
			labelValue(doc, 'Рахунок', input.invoice.number, fonts, undefined, contentW)
			if (input.invoice.dueDate) {
				labelValue(
					doc,
					'Термін рахунку',
					formatDateTimeUk(input.invoice.dueDate).split(',')[0],
					fonts,
					undefined,
					contentW
				)
			}
		}

		hr(doc)

		// Таблиця позицій
		doc.font('ReceiptBold').fontSize(10).text('ДЕТАЛІЗАЦІЯ ПЛАТЕЖУ')
		doc.moveDown(0.4)

		const colX = doc.page.margins.left
		const colW = [contentW * 0.46, contentW * 0.12, contentW * 0.2, contentW * 0.22]
		const headerY = doc.y
		doc.font('ReceiptBold').fontSize(8).fillColor('#64748b')
		doc.text('Найменування', colX, headerY, { width: colW[0] })
		doc.text('К-сть', colX + colW[0], headerY, { width: colW[1], align: 'right' })
		doc.text('Ціна', colX + colW[0] + colW[1], headerY, {
			width: colW[2],
			align: 'right',
		})
		doc.text('Сума', colX + colW[0] + colW[1] + colW[2], headerY, {
			width: colW[3],
			align: 'right',
		})
		doc.moveDown(0.55)

		const rowY = doc.y
		doc.font('ReceiptRegular').fontSize(9).fillColor('#0f172a')
		doc.text(input.lineDescription, colX, rowY, { width: colW[0] })
		doc.text('1', colX + colW[0], rowY, { width: colW[1], align: 'right' })
		doc.text(formatMoney(input.amount, input.currency), colX + colW[0] + colW[1], rowY, {
			width: colW[2],
			align: 'right',
		})
		doc.font('ReceiptBold').text(
			formatMoney(input.amount, input.currency),
			colX + colW[0] + colW[1] + colW[2],
			rowY,
			{ width: colW[3], align: 'right' }
		)
		doc.moveDown(1)

		hr(doc)

		labelValue(
			doc,
			'Разом до сплати',
			formatMoney(input.amount, input.currency),
			fonts,
			{ boldValue: true },
			contentW
		)
		labelValue(
			doc,
			'Сплачено',
			formatMoney(input.amount, input.currency),
			fonts,
			{ boldValue: true },
			contentW
		)

		if (input.payment.providerRef) {
			labelValue(doc, 'ID транзакції', input.payment.providerRef, fonts, undefined, contentW)
		}

		hr(doc)

		const qrX = doc.page.margins.left
		const qrY = doc.y + 4
		doc.image(qrPng, qrX, qrY, { width: 88, height: 88 })
		doc
			.font('ReceiptRegular')
			.fontSize(9)
			.fillColor('#334155')
			.text('Перевірка чека онлайн', qrX + 100, qrY, { width: contentW - 100 })
		doc
			.fontSize(8)
			.fillColor('#64748b')
			.text(input.verifyUrl, qrX + 100, qrY + 14, {
				width: contentW - 100,
				link: input.verifyUrl,
			})
		doc.text(
			'Відскануйте QR-код або перейдіть за посиланням, щоб переконатися в дійсності чека.',
			qrX + 100,
			qrY + 44,
			{ width: contentW - 100 }
		)

		doc.y = Math.max(doc.y, qrY + 96)
		doc.moveDown(0.6)

		hr(doc)

		doc
			.font('ReceiptRegular')
			.fontSize(8)
			.fillColor('#94a3b8')
			.text(
				'Цей електронний чек підтверджує факт оплати послуг INTERIORIX. ' +
					'Не є фіскальним чеком РРО, якщо інше не зазначено окремою угодою. ' +
					'Збережіть файл або номер чека для звірки з бухгалтерією.',
				{ align: 'center', width: contentW }
			)

		doc.end()
	})
}

export function defaultReceiptCompany(config: {
	get: (key: string) => string | undefined
}): ReceiptPdfInput['company'] {
	return {
		brand: config.get('RECEIPT_COMPANY_BRAND') ?? 'INTERIORIX',
		legalName:
			config.get('RECEIPT_COMPANY_LEGAL') ??
			'ТОВ «Інтеріорікс»',
		address:
			config.get('RECEIPT_COMPANY_ADDRESS') ??
			'м. Київ, вул. Хрещатик, 1, офіс 12',
		phone: config.get('RECEIPT_COMPANY_PHONE') ?? '+380 (44) 000-00-00',
		email:
			config.get('RECEIPT_COMPANY_EMAIL') ?? 'info@tailored-design.demo',
		website:
			config.get('RECEIPT_COMPANY_WEBSITE') ??
			'www.tailored-design.demo',
		edrpou: config.get('RECEIPT_COMPANY_EDRPOU') ?? '12345678',
	}
}
