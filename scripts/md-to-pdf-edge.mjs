import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const mdPath = resolve(process.argv[2] ?? join(__dirname, '../help/05-vidpovidi-zakhist.md'))
const pdfPath = mdPath.replace(/\.md$/i, '.pdf')
const htmlPath = mdPath.replace(/\.md$/i, '.html')

const md = readFileSync(mdPath, 'utf8')

function escapeHtml(s) {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
}

function mdToHtml(source) {
	const lines = source.replace(/\r\n/g, '\n').split('\n')
	let html = ''
	let inCode = false
	let inUl = false
	let inOl = false
	let inTable = false

	const closeLists = () => {
		if (inUl) {
			html += '</ul>\n'
			inUl = false
		}
		if (inOl) {
			html += '</ol>\n'
			inOl = false
		}
	}

	const inline = (text) =>
		escapeHtml(text)
			.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
			.replace(/`([^`]+)`/g, '<code>$1</code>')
			.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')

	for (const raw of lines) {
		const line = raw.trimEnd()

		if (line.startsWith('```')) {
			closeLists()
			if (!inCode) {
				html += '<pre><code>'
				inCode = true
			} else {
				html += '</code></pre>\n'
				inCode = false
			}
			continue
		}
		if (inCode) {
			html += `${escapeHtml(line)}\n`
			continue
		}

		if (line.startsWith('|') && line.endsWith('|')) {
			closeLists()
			const cells = line
				.slice(1, -1)
				.split('|')
				.map((c) => c.trim())
			if (cells.every((c) => /^[-:]+$/.test(c))) continue
			if (!inTable) {
				html += '<table>\n'
				inTable = true
			}
			const tag = html.endsWith('<table>\n') ? 'th' : 'td'
			html += `<tr>${cells.map((c) => `<${tag}>${inline(c)}</${tag}>`).join('')}</tr>\n`
			continue
		}
		if (inTable && !line.startsWith('|')) {
			html += '</table>\n'
			inTable = false
		}

		if (!line) {
			closeLists()
			continue
		}

		if (line.startsWith('# ')) {
			closeLists()
			html += `<h1>${inline(line.slice(2))}</h1>\n`
			continue
		}
		if (line.startsWith('## ')) {
			closeLists()
			html += `<h2>${inline(line.slice(3))}</h2>\n`
			continue
		}
		if (line.startsWith('### ')) {
			closeLists()
			html += `<h3>${inline(line.slice(4))}</h3>\n`
			continue
		}
		if (line.startsWith('> ')) {
			closeLists()
			html += `<blockquote>${inline(line.slice(2))}</blockquote>\n`
			continue
		}
		if (line.startsWith('- ')) {
			if (!inUl) {
				closeLists()
				html += '<ul>\n'
				inUl = true
			}
			html += `<li>${inline(line.slice(2))}</li>\n`
			continue
		}
		if (/^\d+\.\s/.test(line)) {
			if (!inOl) {
				closeLists()
				html += '<ol>\n'
				inOl = true
			}
			html += `<li>${inline(line.replace(/^\d+\.\s/, ''))}</li>\n`
			continue
		}
		if (line.startsWith('---')) {
			closeLists()
			html += '<hr />\n'
			continue
		}

		closeLists()
		html += `<p>${inline(line)}</p>\n`
	}

	closeLists()
	if (inTable) html += '</table>\n'
	if (inCode) html += '</code></pre>\n'
	return html
}

const body = mdToHtml(md)
const html = `<!DOCTYPE html>
<html lang="uk">
<head>
<meta charset="utf-8" />
<title>INTERIORIX — відповіді на захист</title>
<style>
  @page { margin: 18mm 16mm; }
  body { font-family: "Segoe UI", Arial, sans-serif; font-size: 11pt; line-height: 1.45; color: #111; }
  h1 { font-size: 20pt; margin: 0 0 12pt; page-break-after: avoid; }
  h2 { font-size: 14pt; margin: 18pt 0 8pt; page-break-after: avoid; border-bottom: 1px solid #ddd; padding-bottom: 4pt; }
  h3 { font-size: 12pt; margin: 12pt 0 6pt; page-break-after: avoid; }
  p, li { margin: 0 0 6pt; }
  ul, ol { margin: 0 0 8pt 18pt; padding: 0; }
  blockquote { margin: 8pt 0; padding: 6pt 10pt; border-left: 3px solid #64748b; background: #f8fafc; color: #334155; }
  code, pre { font-family: Consolas, monospace; font-size: 9.5pt; }
  pre { background: #f1f5f9; padding: 8pt; overflow-x: auto; white-space: pre-wrap; }
  table { width: 100%; border-collapse: collapse; margin: 8pt 0 12pt; font-size: 10pt; }
  th, td { border: 1px solid #cbd5e1; padding: 4pt 6pt; vertical-align: top; }
  th { background: #f1f5f9; }
  a { color: #2563eb; text-decoration: none; }
  hr { border: none; border-top: 1px solid #e2e8f0; margin: 14pt 0; }
</style>
</head>
<body>${body}</body>
</html>`

writeFileSync(htmlPath, html, 'utf8')

const edgePaths = [
	'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
	'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
	'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
	'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
]

const browser = edgePaths.find((p) => {
	try {
		readFileSync(p)
		return true
	} catch {
		return false
	}
})

if (!browser) {
	console.error('Не знайдено Edge/Chrome для друку PDF.')
	process.exit(1)
}

execFileSync(
	browser,
	[
		'--headless=new',
		'--disable-gpu',
		`--print-to-pdf=${pdfPath}`,
		`file:///${htmlPath.replace(/\\/g, '/')}`,
	],
	{ stdio: 'inherit' },
)

console.log(`PDF: ${pdfPath}`)
