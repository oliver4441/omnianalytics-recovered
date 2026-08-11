import { useEffect, useMemo, useState } from 'react';
import Icon from '../../components/Icon';
import {
  buildRelationshipIndex,
  isTimestampWithinLocalDateRange,
  RESOURCE_LABELS,
  sanitizeResourceForExport,
  SOURCE_LABELS,
} from '../../modules/integrations';

const PAGE_SIZE = 10;
const columns = [
  { id: 'resource', label: 'Resource' },
  { id: 'provider', label: 'Provider' },
  { id: 'type', label: 'Type' },
  { id: 'connectedTo', label: 'Connected to' },
  { id: 'relationship', label: 'Relationship' },
  { id: 'status', label: 'Health' },
  { id: 'verification', label: 'Attribution' },
  { id: 'updatedAt', label: 'Last updated' },
];

const formatDate = (value) => {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function ResourceTable({ dataset, onSelectResource, selectedResourceId }) {
  const [sort, setSort] = useState({ column: 'resource', direction: 'asc' });
  const [page, setPage] = useState(1);
  const [groupBy, setGroupBy] = useState('none');
  const [selected, setSelected] = useState(new Set());
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(new Set(columns.map((column) => column.id)));
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const relationshipIndex = useMemo(() => buildRelationshipIndex(dataset), [dataset]);

  const rows = useMemo(() => dataset.resources.map((resource) => {
    const edges = relationshipIndex.adjacency.get(resource.id) || [];
    return {
      id: resource.id,
      resource: resource.name,
      provider: resource.provider,
      type: resource.type,
      connectedTo: edges.map((edge) => edge.resource?.name).filter(Boolean).join(', ') || 'No recorded connections',
      relationship: edges.map((edge) => edge.connection.relationshipType.replaceAll('_', ' ')).join(', ') || '—',
      status: resource.status,
      verification: resource.verificationState,
      source: resource.source,
      updatedAt: resource.updatedAt,
      raw: resource,
    };
  }).filter((row) => isTimestampWithinLocalDateRange(
    row.updatedAt,
    dateRange.from,
    dateRange.to,
  )).sort((a, b) => {
    const left = String(a[sort.column] || '').toLowerCase();
    const right = String(b[sort.column] || '').toLowerCase();
    const result = left.localeCompare(right);
    return sort.direction === 'asc' ? result : -result;
  }), [dataset.resources, dateRange, relationshipIndex.adjacency, sort]);

  useEffect(() => {
    const visibleIds = new Set(rows.map((row) => row.id));
    setSelected((current) => new Set([...current].filter((resourceId) => visibleIds.has(resourceId))));
    setPage(1);
  }, [rows]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pagedRows = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const changeSort = (column) => {
    setSort((current) => ({
      column,
      direction: current.column === column && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const toggleSelected = (resourceId) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(resourceId)) next.delete(resourceId);
      else next.add(resourceId);
      return next;
    });
  };

  const togglePage = () => {
    const allSelected = pagedRows.every((row) => selected.has(row.id));
    setSelected((current) => {
      const next = new Set(current);
      pagedRows.forEach((row) => {
        if (allSelected) next.delete(row.id);
        else next.add(row.id);
      });
      return next;
    });
  };

  const exportSelected = () => {
    const exported = dataset.resources
      .filter((resource) => selected.has(resource.id))
      .map(sanitizeResourceForExport);
    const blob = new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'omnianalytics-resources.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const renderCell = (row, columnId) => {
    if (columnId === 'resource') {
      return (
        <div className="resource-cell">
          <span className={`resource-cell__icon provider-${row.provider}`}><Icon name={row.type === 'repository' ? 'branch' : row.type === 'account' ? 'users' : 'cube'} size={16} /></span>
          <button className="resource-cell__label" onClick={(event) => { event.stopPropagation(); onSelectResource(row.id); }}>
            <strong>{row.resource}</strong><small>{row.raw.externalId || RESOURCE_LABELS[row.type]}</small>
          </button>
        </div>
      );
    }
    if (columnId === 'status') return <span className={`health-label status-${row.status}`}><i />{row.status}</span>;
    if (columnId === 'verification') {
      return (
        <span className={`attribution-label verification-${row.verification}`}>
          {row.verification.replaceAll('_', ' ')}
          <small>{SOURCE_LABELS[row.source] || row.source}</small>
        </span>
      );
    }
    if (columnId === 'updatedAt') return formatDate(row.updatedAt);
    if (columnId === 'type') return RESOURCE_LABELS[row.type] || row.type;
    return row[columnId];
  };

  const groupedRows = useMemo(() => {
    if (groupBy === 'none') return [{ label: null, rows: pagedRows }];
    const groups = new Map();
    pagedRows.forEach((row) => {
      const key = row[groupBy] || 'Unknown';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    });
    return [...groups.entries()].map(([label, groupRows]) => ({ label, rows: groupRows }));
  }, [groupBy, pagedRows]);

  return (
    <div className="resource-table-view">
      <div className="resource-table__controls">
        <div className="resource-table__date">
          <label>Updated from<input onChange={(event) => { setDateRange({ ...dateRange, from: event.target.value }); setPage(1); }} type="date" value={dateRange.from} /></label>
          <label>To<input onChange={(event) => { setDateRange({ ...dateRange, to: event.target.value }); setPage(1); }} type="date" value={dateRange.to} /></label>
        </div>
        <label className="table-group-control">Group by
          <select onChange={(event) => setGroupBy(event.target.value)} value={groupBy}>
            <option value="none">None</option>
            <option value="provider">Provider</option>
            <option value="type">Resource type</option>
            <option value="status">Health</option>
          </select>
        </label>
        <div className="column-picker">
          <button aria-expanded={columnsOpen} onClick={() => setColumnsOpen(!columnsOpen)}><Icon name="columns" size={15} /> Columns</button>
          {columnsOpen && (
            <fieldset>
              <legend>Visible columns</legend>
              {columns.map((column) => (
                <label key={column.id}>
                  <input
                    checked={visibleColumns.has(column.id)}
                    disabled={column.id === 'resource'}
                    onChange={() => setVisibleColumns((current) => {
                      const next = new Set(current);
                      if (next.has(column.id)) next.delete(column.id);
                      else next.add(column.id);
                      return next;
                    })}
                    type="checkbox"
                  />
                  {column.label}
                </label>
              ))}
            </fieldset>
          )}
        </div>
      </div>

      {selected.size > 0 && (
        <div className="resource-table__bulk" role="status">
          <strong>{selected.size} selected</strong>
          <button onClick={exportSelected}><Icon name="download" size={14} /> Export metadata</button>
          <button onClick={() => setSelected(new Set())}>Clear selection</button>
        </div>
      )}

      <div className="resource-table__scroll">
        <table>
          <thead>
            <tr>
              <th className="selection-column">
                <input
                  aria-label="Select resources on this page"
                  checked={Boolean(pagedRows.length) && pagedRows.every((row) => selected.has(row.id))}
                  onChange={togglePage}
                  type="checkbox"
                />
              </th>
              {columns.filter((column) => visibleColumns.has(column.id)).map((column) => (
                <th aria-sort={sort.column === column.id ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'} key={column.id}>
                  <button onClick={() => changeSort(column.id)}>
                    {column.label}
                    {sort.column === column.id && <span aria-label={sort.direction === 'asc' ? 'ascending' : 'descending'}>{sort.direction === 'asc' ? '↑' : '↓'}</span>}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groupedRows.map((group) => (
              <GroupRows
                group={group}
                key={group.label || 'ungrouped'}
                onSelectResource={onSelectResource}
                renderCell={renderCell}
                selected={selected}
                selectedResourceId={selectedResourceId}
                toggleSelected={toggleSelected}
                visibleColumns={visibleColumns}
              />
            ))}
          </tbody>
        </table>
      </div>

      {!rows.length ? (
        <div className="integration-empty"><h3>No resource records match</h3><p>Adjust filters or date range to see imported resources.</p></div>
      ) : (
        <footer className="resource-table__pagination">
          <span>Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, rows.length)} of {rows.length}</span>
          <div>
            <button disabled={safePage === 1} onClick={() => setPage(safePage - 1)}><Icon name="chevronLeft" size={14} /> Previous</button>
            <span>Page {safePage} of {pageCount}</span>
            <button disabled={safePage === pageCount} onClick={() => setPage(safePage + 1)}>Next <Icon name="chevronRight" size={14} /></button>
          </div>
        </footer>
      )}
    </div>
  );
}

function GroupRows({ group, onSelectResource, renderCell, selected, selectedResourceId, toggleSelected, visibleColumns }) {
  return (
    <>
      {group.label && (
        <tr className="resource-table__group-row">
          <th colSpan={visibleColumns.size + 1}>{group.label.replaceAll('_', ' ')} <span>{group.rows.length}</span></th>
        </tr>
      )}
      {group.rows.map((row) => (
        <tr aria-selected={selectedResourceId === row.id} className={selectedResourceId === row.id ? 'is-active' : ''} key={row.id} onClick={() => onSelectResource(row.id)}>
          <td className="selection-column">
            <input
              aria-label={`Select ${row.resource}`}
              checked={selected.has(row.id)}
              onChange={() => toggleSelected(row.id)}
              onClick={(event) => event.stopPropagation()}
              type="checkbox"
            />
          </td>
          {columns.filter((column) => visibleColumns.has(column.id)).map((column) => (
            <td key={column.id}>{renderCell(row, column.id)}</td>
          ))}
        </tr>
      ))}
    </>
  );
}
