import React, { useRef, useEffect } from 'react';
import { Plus, Trash2, Download, Upload, AlertCircle } from 'lucide-react';
import { exportToCSV, parseCSV } from '../utils/csv';
import type { ValidationError } from '../utils/validation';

export interface GridColumn {
  key: string;
  label: string;
  type: 'number' | 'text' | 'select';
  options?: { value: string; label: string }[];
  readOnly?: boolean;
  defaultValue?: any;
  placeholder?: string;
  width?: string;
}

interface GridTableProps {
  title: string;
  columns: GridColumn[];
  data: Array<any>;
  onChange: (newData: Array<any>) => void;
  errors: ValidationError[];
  tabName: 'Survey' | 'Lithology' | 'Geotech' | 'Assay';
  autoFillNextFrom?: boolean; // automatically prefill 'from' of new row with 'to' of last row
  highlightedRowId?: string | null;
}

export const GridTable: React.FC<GridTableProps> = ({
  title,
  columns,
  data,
  onChange,
  errors,
  tabName,
  autoFillNextFrom = false,
  highlightedRowId = null,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const highlightedRowRef = useRef<HTMLTableRowElement | null>(null);

  useEffect(() => {
    if (highlightedRowId && highlightedRowRef.current) {
      highlightedRowRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [highlightedRowId, data]);

  // Auto-calculated fields for TCR and RQD inside GeotechTab are done here or before onDataChange
  const handleCellChange = (rowIndex: number, columnKey: string, value: any) => {
    const updated = data.map((row, idx) => {
      if (idx !== rowIndex) return row;
      const updatedRow = { ...row, [columnKey]: value };

      // Geotech auto-calculations
      if (tabName === 'Geotech') {
        const drilled = parseFloat(updatedRow.drilledLength) || 0;
        const recovered = parseFloat(updatedRow.recoveredLength) || 0;
        const solids = parseFloat(updatedRow.solidPiecesOver10cm) || 0;

        if (drilled > 0) {
          updatedRow.tcrPercent = parseFloat(((recovered / drilled) * 100).toFixed(2));
          updatedRow.rqdPercent = parseFloat(((solids / drilled) * 100).toFixed(2));
        } else {
          updatedRow.tcrPercent = 0;
          updatedRow.rqdPercent = 0;
        }
      }

      return updatedRow;
    });

    onChange(updated);
  };

  const addRow = () => {
    const lastRow = data[data.length - 1];
    const newRow: Record<string, any> = {
      id: Math.random().toString(36).substr(2, 9),
    };

    columns.forEach(col => {
      if (col.key === 'from' && autoFillNextFrom && lastRow) {
        newRow[col.key] = lastRow.to || 0;
      } else if (col.key === 'to' && autoFillNextFrom && lastRow) {
        // default next run to + 3.0m (common core run length)
        newRow[col.key] = parseFloat(((lastRow.to || 0) + 3.0).toFixed(2));
      } else if (col.key === 'drilledLength' && autoFillNextFrom) {
        newRow[col.key] = 3.0; // standard drill run
      } else {
        newRow[col.key] = col.defaultValue !== undefined ? col.defaultValue : (col.type === 'number' ? 0 : '');
      }
    });

    // For Assays, let's auto-increment Sample ID
    if (tabName === 'Assay' && lastRow && lastRow.sampleId) {
      const match = lastRow.sampleId.match(/^([a-zA-Z_-]*?)(\d+)$/);
      if (match) {
        const prefix = match[1];
        const num = parseInt(match[2], 10) + 1;
        const paddedNum = String(num).padStart(match[2].length, '0');
        newRow.sampleId = `${prefix}${paddedNum}`;
      }
    }

    // Auto TCR/RQD setup
    if (tabName === 'Geotech') {
      newRow.tcrPercent = 0;
      newRow.rqdPercent = 0;
    }

    onChange([...data, newRow]);
  };

  const deleteRow = (rowIndex: number) => {
    const updated = data.filter((_, idx) => idx !== rowIndex);
    onChange(updated);
  };

  // Keyboard navigation inside input cells
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>, rowIndex: number) => {
    const inputs = document.querySelectorAll(`.grid-table-${tabName} input, .grid-table-${tabName} select`);
    const totalCols = columns.filter(c => !c.readOnly).length;
    
    // Find index of current input in list of editable inputs
    let currentInputIdx = -1;
    inputs.forEach((el, idx) => {
      if (el === e.target) currentInputIdx = idx;
    });

    if (currentInputIdx === -1) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextInput = inputs[currentInputIdx + totalCols] as HTMLElement;
      if (nextInput) nextInput.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevInput = inputs[currentInputIdx - totalCols] as HTMLElement;
      if (prevInput) prevInput.focus();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      // Move down or add a row if on the last row
      const nextInput = inputs[currentInputIdx + totalCols] as HTMLElement;
      if (nextInput) {
        nextInput.focus();
      } else if (rowIndex === data.length - 1) {
        addRow();
        setTimeout(() => {
          const freshInputs = document.querySelectorAll(`.grid-table-${tabName} input, .grid-table-${tabName} select`);
          const firstNewInput = freshInputs[currentInputIdx + totalCols] as HTMLElement;
          if (firstNewInput) firstNewInput.focus();
        }, 50);
      }
    }
  };

  // CSV Import
  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsedData = parseCSV(text);

      if (parsedData.length === 0) {
        alert('Empty CSV or invalid format.');
        return;
      }

      // Map CSV records back to expected schemas
      const mappedRows = parsedData.map(record => {
        const row: Record<string, any> = {
          id: Math.random().toString(36).substr(2, 9),
        };

        columns.forEach(col => {
          const val = record[col.label] ?? record[col.key];
          if (col.type === 'number') {
            row[col.key] = val !== undefined && val !== '' ? parseFloat(val) : 0;
          } else {
            row[col.key] = val ?? '';
          }
        });

        // Compute RQD / TCR on import
        if (tabName === 'Geotech') {
          const drilled = parseFloat(row.drilledLength) || 0;
          const recovered = parseFloat(row.recoveredLength) || 0;
          const solids = parseFloat(row.solidPiecesOver10cm) || 0;
          row.tcrPercent = drilled > 0 ? parseFloat(((recovered / drilled) * 100).toFixed(2)) : 0;
          row.rqdPercent = drilled > 0 ? parseFloat(((solids / drilled) * 100).toFixed(2)) : 0;
        }

        return row;
      });

      onChange(mappedRows);
    };

    reader.readAsText(file);
    // Reset file input value so same file can be loaded again
    e.target.value = '';
  };

  const handleCSVExport = () => {
    // Generate data rows with labels as columns
    const exportData = data.map((row, idx) => {
      const obj: Record<string, any> = {};
      obj['Row #'] = idx + 1;
      columns.forEach(col => {
        obj[col.label] = row[col.key];
      });
      return obj;
    });

    exportToCSV(exportData, `Drillhole_${tabName}_Data`);
  };

  const getCellValidationError = (rowId: string, colKey: string) => {
    return errors.find(e => e.id === rowId && e.field === colKey);
  };

  return (
    <div className={`grid-table-container grid-table-${tabName}`}>
      <div className="grid-header">
        <div className="grid-title-area">
          <h2>{title}</h2>
          <span className="row-counter">{data.length} {data.length === 1 ? 'row' : 'rows'}</span>
        </div>

        <div className="grid-actions">
          <button className="btn btn-secondary btn-sm" onClick={handleCSVExport}>
            <Download size={14} /> Export CSV
          </button>
          
          <button className="btn btn-secondary btn-sm" onClick={() => fileInputRef.current?.click()}>
            <Upload size={14} /> Import CSV
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleCSVImport}
            accept=".csv"
            style={{ display: 'none' }}
          />

          <button className="btn btn-primary btn-sm" onClick={addRow}>
            <Plus size={14} /> Add Row
          </button>
        </div>
      </div>

      <div className="grid-table-scroll">
        <table className="grid-table">
          <thead>
            <tr>
              <th className="cell-action-header">#</th>
              {columns.map(col => (
                <th key={col.key} style={{ width: col.width || 'auto' }}>
                  {col.label}
                </th>
              ))}
              <th className="cell-action-header">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 2} className="grid-empty-state">
                  No log entries yet. Click "Add Row" or "Import CSV" to begin logging.
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => {
                const isHighlighted = row.id === highlightedRowId;
                return (
                  <tr key={row.id} ref={isHighlighted ? highlightedRowRef : null} className={isHighlighted ? 'row-highlight-flash' : ''}>
                    <td className="cell-row-num">{rowIndex + 1}</td>
                    {columns.map((col) => {
                      const validationErr = getCellValidationError(row.id, col.key);
                    const cellClass = `grid-cell ${col.readOnly ? 'cell-readonly' : ''} ${
                      validationErr ? (validationErr.type === 'error' ? 'cell-error' : 'cell-warning') : ''
                    }`;

                    return (
                      <td key={col.key} className={cellClass} title={validationErr?.message}>
                        {col.readOnly ? (
                          <div className="readonly-value">
                            {col.type === 'number'
                              ? (typeof row[col.key] === 'number' ? row[col.key].toFixed(2) : row[col.key])
                              : row[col.key]}
                          </div>
                        ) : col.type === 'select' ? (
                          <select
                            value={row[col.key] || ''}
                            onChange={e => handleCellChange(rowIndex, col.key, e.target.value)}
                            onKeyDown={e => handleKeyDown(e, rowIndex)}
                          >
                            {col.options?.map(opt => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={col.type === 'number' ? 'number' : 'text'}
                            step={col.type === 'number' ? 'any' : undefined}
                            placeholder={col.placeholder || ''}
                            value={row[col.key] ?? ''}
                            onChange={e =>
                              handleCellChange(
                                rowIndex,
                                col.key,
                                col.type === 'number'
                                  ? e.target.value === ''
                                    ? ''
                                    : parseFloat(e.target.value)
                                  : e.target.value
                              )
                            }
                            onKeyDown={e => handleKeyDown(e, rowIndex)}
                          />
                        )}
                        {validationErr && (
                          <span className="cell-warning-icon">
                            <AlertCircle size={12} />
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td className="cell-action">
                    <button
                      className="btn-icon btn-danger"
                      onClick={() => deleteRow(rowIndex)}
                      title="Delete Entry"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })
          )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
