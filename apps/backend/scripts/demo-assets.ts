import * as fs from 'fs'
import * as path from 'path'

export function uploadRootPath() {
	const uploadRoot = process.env.UPLOAD_DIR ?? 'uploads'
	return path.isAbsolute(uploadRoot)
		? uploadRoot
		: path.join(process.cwd(), uploadRoot)
}

function writeDemoSvg(
	name: string,
	title: string,
	subtitle: string,
	tone: string
) {
	const root = path.join(uploadRootPath(), 'demo')
	fs.mkdirSync(root, { recursive: true })
	const file = path.join(root, name)
	const palette: Record<string, [string, string, string]> = {
		interior: ['#f2efe8', '#243126', '#b8794c'],
		lighting: ['#eef3f6', '#1f2a44', '#d7a43b'],
		facade: ['#ebe7df', '#2f3d46', '#8b9a72'],
		material: ['#f5efe6', '#2a2f2d', '#607466'],
		terrace: ['#edf2ea', '#243126', '#c06f44'],
	}
	const [bg, ink, accent] = palette[tone] ?? palette.interior
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="820" viewBox="0 0 1280 820">
<rect width="1280" height="820" fill="${bg}"/>
<rect x="78" y="74" width="1124" height="672" rx="44" fill="#fffaf3" opacity=".82"/>
<path d="M128 642 C312 560 438 612 590 502 C748 388 846 434 1154 238" fill="none" stroke="${accent}" stroke-width="42" stroke-linecap="round" opacity=".35"/>
<rect x="158" y="144" width="410" height="278" rx="28" fill="${ink}" opacity=".92"/>
<rect x="618" y="150" width="476" height="84" rx="22" fill="${accent}" opacity=".82"/>
<rect x="618" y="278" width="360" height="34" rx="17" fill="${ink}" opacity=".23"/>
<rect x="618" y="334" width="430" height="34" rx="17" fill="${ink}" opacity=".18"/>
<rect x="170" y="458" width="170" height="128" rx="26" fill="${accent}" opacity=".78"/>
<rect x="372" y="458" width="170" height="128" rx="26" fill="${ink}" opacity=".12"/>
<text x="158" y="668" font-family="Arial, sans-serif" font-size="48" font-weight="800" fill="${ink}">${title}</text>
<text x="158" y="718" font-family="Arial, sans-serif" font-size="26" fill="${ink}" opacity=".72">${subtitle}</text>
</svg>`
	fs.writeFileSync(file, svg)
}

export function ensureDemoMarketingImages() {
	const rows: Array<[string, string, string, string]> = [
		['catalog-full-interior.svg', 'Повний інтерʼєр', 'Концепція, матеріали, реалізація', 'interior'],
		['catalog-kitchen-living.svg', 'Кухня-вітальня', 'Зонування, світло, меблі', 'interior'],
		['catalog-commercial-lobby.svg', 'Комерційне лобі', 'Рецепція, навігація, атмосфера', 'material'],
		['catalog-lighting-design.svg', 'Світловий дизайн', 'Сценарії, акценти, керування', 'lighting'],
		['catalog-exterior-facade.svg', 'Фасад і тераса', 'Матеріали, вхідна група, дренаж', 'facade'],
		['catalog-bathroom-remodel.svg', 'Санвузол під ключ', 'Гідроізоляція, плитка, сантехніка', 'material'],
		['ternopil-residence.svg', 'Тернопільська резиденція', 'Теплий інтерʼєр з деревом', 'interior'],
		['lviv-facade.svg', 'Львівський фасад', 'Тераса та вхідна група', 'facade'],
		['kyiv-office-quiet.svg', 'Київський офіс', 'Акустика і гнучкі робочі зони', 'material'],
		['ifr-retail-light.svg', 'Retail lighting', 'Світло для вітрин і маршруту', 'lighting'],
		['uzhhorod-terrace.svg', 'Ужгородська тераса', 'Камінь, зелень і дренаж', 'terrace'],
		['review-1.svg', 'Фінальний огляд', 'Фото до відгуку клієнта', 'interior'],
	]
	for (const row of rows) writeDemoSvg(...row)
}
