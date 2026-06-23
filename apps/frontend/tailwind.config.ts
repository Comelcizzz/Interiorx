import type { Config } from 'tailwindcss'
export default {
	content: [
		'./index.html',
		'./src/**/*.{ts,tsx}',
		'../../packages/ui/src/**/*.{ts,tsx}',
	],
	theme: {
		extend: {
			fontFamily: {
				sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
			},
			colors: {
				primary: '#26845b',
				highlight: '#dff2e8',
				ink: '#172033',
				dark: '#4c4c4c',
				grey: '#777f8d',
				silver: '#dfe5ec',
				copper: '#b7794c',
				mist: '#edf1f5',
				light: '#ffffff',
			},
			boxShadow: {
				card: '10px 20px 40px rgba(76,76,76,0.13)',
				primary: '10px 20px 40px rgba(38,132,91,0.24)',
			},
			borderRadius: {
				1: '1px',
				2: '2px',
				4: '4px',
				6: '6px',
				10: '10px',
			},
			screens: {
				desktop: { max: '1600px' },
				'desktop-sm': { max: '1200px' },
				tablet: { max: '768px' },
				'phone-lg': { max: '540px' },
				phone: { max: '480px' },
				'phone-sm': { max: '320px' },
			},
		},
	},
	plugins: [],
} satisfies Config
