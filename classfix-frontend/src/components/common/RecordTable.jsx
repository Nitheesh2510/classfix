import { Database } from 'lucide-react';
import { EmptyState } from './EmptyState.jsx';

/**
 * Small table for the demo management screens. Renders as a table on wide
 * screens and as stacked definition cards on narrow ones.
 *
 * `columns` is a list of { key, header, render(row), hideOnCard? }.
 */
export function RecordTable({ columns, rows, getRowId, renderActions, emptyTitle, emptyMessage }) {
  if (!rows.length) {
    return (
      <div className="cf-card">
        <EmptyState icon={Database} title={emptyTitle} message={emptyMessage} />
      </div>
    );
  }

  return (
    <>
      <div className="cf-card hidden overflow-hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                {columns.map((column) => (
                  <th key={column.key} scope="col" className="px-4 py-2.5 font-semibold">
                    {column.header}
                  </th>
                ))}
                {renderActions ? (
                  <th scope="col" className="px-4 py-2.5 text-right font-semibold">
                    Actions
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={getRowId(row)} className="align-top hover:bg-slate-50">
                  {columns.map((column) => (
                    <td key={column.key} className="px-4 py-3 text-slate-700">
                      {column.render(row)}
                    </td>
                  ))}
                  {renderActions ? (
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">{renderActions(row)}</div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ul className="space-y-3 md:hidden">
        {rows.map((row) => (
          <li key={getRowId(row)} className="cf-card p-4">
            <dl className="space-y-2">
              {columns.map((column) => (
                <div key={column.key} className="flex justify-between gap-3 text-sm">
                  <dt className="shrink-0 text-xs font-medium uppercase tracking-wide text-slate-400">
                    {column.header}
                  </dt>
                  <dd className="text-right text-slate-700">{column.render(row)}</dd>
                </div>
              ))}
            </dl>
            {renderActions ? (
              <div className="mt-3 flex justify-end gap-2 border-t border-slate-100 pt-3">
                {renderActions(row)}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </>
  );
}
