import { NestFactory } from '@nestjs/core'
import { getConnectionToken } from '@nestjs/mongoose'
import type { Connection } from 'mongoose'
import { AppModule } from '../src/app.module'
const COLLECTIONS = [
	'roles',
	'users',
	'client_profiles',
	'staff_profiles',
	'projects',
	'project_locations',
	'orders',
	'tasks',
	'teams',
	'team_members',
	'suppliers',
	'materials',
	'estimates',
	'estimate_items',
	'design_measurements',
	'invoices',
	'project_documents',
	'audit_logs',
	'notifications',
	'payments',
	'receipts',
	'catalog_services',
	'portfolio_items',
	'reviews',
	'signed_documents',
	'contact_submissions',
	'uploaded_files',
]
async function main() {
	const app = await NestFactory.createApplicationContext(AppModule, {
		logger: false,
	})
	const conn = app.get<Connection>(getConnectionToken())
	const out: Record<string, number> = {}
	for (const name of COLLECTIONS) {
		out[name] = await conn.collection(name).countDocuments()
	}
	console.table(out)
	await app.close()
}
main().catch((e) => {
	console.error(e)
	process.exit(1)
})
