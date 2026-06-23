export const demoPassword = process.env.DEMO_PASSWORD ?? 'Demo12345!'

export const demoUsers = {
	client: 'client@tailored.demo',
	manager: 'manager@tailored.demo',
	designer: 'designer@tailored.demo',
	estimator: 'estimator@tailored.demo',
	accountant: 'accountant@tailored.demo',
	worker: 'worker@tailored.demo',
	lead: 'lead@tailored.demo',
	supplier: 'supplier@tailored.demo',
	admin: 'admin@tailored.demo',
} as const

export type DemoRole = keyof typeof demoUsers
