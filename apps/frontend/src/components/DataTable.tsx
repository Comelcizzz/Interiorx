import { ReactNode } from 'react'
export type DataTableColumn<Row> = {
	id: string
	header: string
	cell: (row: Row) => ReactNode
	className?: string
}
export type DataTableProps<Row> = {
	columns: DataTableColumn<Row>[]
	rows: Row[]
	getRowId: (row: Row) => string
	emptyLabel?: string
}
export function DataTable<Row>({
	columns,
	rows,
	getRowId,
	emptyLabel,
}: DataTableProps<Row>) {
	if (!rows.length) {
		return (
			<p className="text-sm text-slate-500">
				{emptyLabel ?? 'No rows to display.'}
			</p>
		)
	}
	return (
		<div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
			<table className="w-full text-left text-sm">
				<thead className="bg-slate-50 text-xs uppercase text-slate-500">
					<tr>
						{columns.map((col) => (
							<th
								key={col.id}
								className={`px-4 py-3 font-medium ${col.className ?? ''}`}
							>
								{col.header}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{rows.map((row) => (
						<tr
							key={getRowId(row)}
							className="border-t border-slate-100"
						>
							{columns.map((col) => (
								<td
									key={col.id}
									className={`px-4 py-3 align-middle ${col.className ?? ''}`}
								>
									{col.cell(row)}
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	)
}
