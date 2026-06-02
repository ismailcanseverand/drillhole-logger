import React, { useRef, useEffect, useState } from 'react';
import { Plus, Trash2, Download, Upload, AlertCircle, Camera } from 'lucide-react';
import { exportToCSV, parseCSV } from '../utils/csv';
import type { ValidationError } from '../utils/validation';
import { getSupabaseClient } from '../utils/supabaseClient';

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
  tabName: 'Survey' | 'Lithology' | 'Geotech' | 'Assay' | 'SamplePrep';
  autoFillNextFrom?: boolean; // automatically prefill 'from' of new row with 'to' of last row
  highlightedRowId?: string | null;
  holeId?: string;
}

const compressPhoto = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 800;
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(img.src);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

const uploadPhotoToSupabase = async (base64Data: string, rowId: string, holeId?: string): Promise<string | null> => {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const response = await fetch(base64Data);
    const blob = await response.blob();
    
    const filePrefix = holeId ? `${holeId}_` : '';
    const filePath = `photos/${filePrefix}${rowId}.jpg`;
    
    const { error } = await client.storage
      .from('lithology-photos')
      .upload(filePath, blob, {
        contentType: 'image/jpeg',
        upsert: true
      });
      
    if (error) {
      console.warn('Failed to upload photo to Supabase storage, using base64 fallback:', error);
      return null;
    }
    
    const { data: publicUrlData } = client.storage
      .from('lithology-photos')
      .getPublicUrl(filePath);
      
    return publicUrlData.publicUrl;
  } catch (err) {
    console.error('Error uploading photo:', err);
    return null;
  }
};

const getRockColorName = (code: string): string => {
  switch ((code || '').toUpperCase()) {
    case 'DOLGU':
    case 'OB':
      return 'Brown';
    case 'ALBIT':
      return 'White';
    case 'GNAYS':
      return 'Grey';
    case 'ANDEZIT':
    case 'AND':
    case 'TUF':
      return 'Red';
    case 'KAOLEN':
    case 'KAO':
      return 'Yellow';
    case 'KIL':
      return 'Orange';
    case 'KUVARSIT':
    case 'QVN':
      return 'Cyan';
    case 'SIST':
      return 'Green';
    case 'GRANIT':
    case 'GNT':
      return 'Pink';
    case 'PERLIT':
      return 'Purple';
    case 'KALSIT':
      return 'Rose';
    case 'KOMUR':
      return 'Dark Slate';
    case 'BRES':
    case 'BXS':
      return 'Grey';
    default:
      return 'Grey';
  }
};

const renderGraphicSwatch = (code: string) => {
  const clean = (code || '').toUpperCase();
  const patternId = 'pat-loc-' + Math.random().toString(36).substr(2, 9);
  let patternContent = null;
  
  if (clean === 'GNAYS') {
    patternContent = (
      <pattern id={patternId} width="20" height="20" patternUnits="userSpaceOnUse">
        <rect width="20" height="20" fill="#475569" />
        <path d="M0,5 Q5,10 10,5 T20,5 M0,15 Q5,20 10,15 T20,15" fill="none" stroke="#64748b" strokeWidth="1.5" />
      </pattern>
    );
  } else if (['GRANIT', 'GNT', 'SUBVOLKANIK', 'SIYENIT', 'GRANODIYORIT', 'RIYOLIT', 'DASIT', 'INTRUZIF'].includes(clean)) {
    patternContent = (
      <pattern id={patternId} width="20" height="20" patternUnits="userSpaceOnUse">
        <rect width="20" height="20" fill="#ec4899" fillOpacity="0.8" />
        <circle cx="5" cy="5" r="1.5" fill="#9d174d" />
        <circle cx="15" cy="15" r="1.5" fill="#9d174d" />
        <line x1="12" y1="4" x2="16" y2="8" stroke="#9d174d" strokeWidth="1" />
        <line x1="16" y1="4" x2="12" y2="8" stroke="#9d174d" strokeWidth="1" />
        <line x1="2" y1="12" x2="6" y2="16" stroke="#9d174d" strokeWidth="1" />
        <line x1="6" y1="12" x2="2" y2="16" stroke="#9d174d" strokeWidth="1" />
      </pattern>
    );
  } else if (clean === 'BRES' || clean === 'BXS') {
    patternContent = (
      <pattern id={patternId} width="25" height="25" patternUnits="userSpaceOnUse">
        <rect width="25" height="25" fill="#52525b" />
        <polygon points="5,2 12,5 8,12 2,7" fill="#27272a" stroke="#a1a1aa" strokeWidth="0.5" />
        <polygon points="18,10 23,15 15,20 14,12" fill="#27272a" stroke="#a1a1aa" strokeWidth="0.5" />
        <polygon points="3,18 9,23 6,24" fill="#18181b" stroke="#71717a" strokeWidth="0.5" />
      </pattern>
    );
  } else if (clean === 'KUVARSIT' || clean === 'QVN') {
    patternContent = (
      <pattern id={patternId} width="10" height="10" patternUnits="userSpaceOnUse">
        <rect width="10" height="10" fill="#0891b2" />
        <circle cx="3" cy="3" r="1.2" fill="#22d3ee" />
        <circle cx="8" cy="8" r="1.2" fill="#22d3ee" />
      </pattern>
    );
  } else if (['ANDEZIT', 'AND', 'TUF', 'BASALT'].includes(clean)) {
    patternContent = (
      <pattern id={patternId} width="20" height="20" patternUnits="userSpaceOnUse">
        <rect width="20" height="20" fill="#065f46" />
        <path d="M 5,5 L 8,8 L 11,5" fill="none" stroke="#10b981" strokeWidth="1.5" />
        <path d="M 15,15 L 18,18 L 21,15" fill="none" stroke="#10b981" strokeWidth="1.5" />
      </pattern>
    );
  } else if (['DOLGU', 'OB', 'TOPRAK'].includes(clean)) {
    patternContent = (
      <pattern id={patternId} width="20" height="20" patternUnits="userSpaceOnUse">
        <rect width="20" height="20" fill="#78350f" />
        <circle cx="4" cy="4" r="1.2" fill="#b45309" />
        <circle cx="14" cy="14" r="1.2" fill="#b45309" />
        <line x1="2" y1="18" x2="8" y2="18" stroke="#d97706" strokeWidth="1" />
        <line x1="12" y1="8" x2="18" y2="8" stroke="#d97706" strokeWidth="1" />
      </pattern>
    );
  } else if (clean === 'SIST') {
    patternContent = (
      <pattern id={patternId} width="30" height="10" patternUnits="userSpaceOnUse">
        <rect width="30" height="10" fill="#047857" />
        <path d="M0,5 Q7.5,0 15,5 T30,5" fill="none" stroke="#34d399" strokeWidth="1" />
      </pattern>
    );
  } else if (clean === 'KIL') {
    patternContent = (
      <pattern id={patternId} width="10" height="10" patternUnits="userSpaceOnUse">
        <rect width="10" height="10" fill="#c2410c" />
        <line x1="0" y1="5" x2="10" y2="5" stroke="#ffedd5" strokeWidth="1" />
      </pattern>
    );
  } else if (clean === 'KALSIT') {
    patternContent = (
      <pattern id={patternId} width="20" height="20" patternUnits="userSpaceOnUse">
        <rect width="20" height="20" fill="#9f1239" />
        <line x1="0" y1="10" x2="20" y2="10" stroke="#f43f5e" strokeWidth="0.75" />
        <line x1="0" y1="20" x2="20" y2="20" stroke="#f43f5e" strokeWidth="0.75" />
        <line x1="10" y1="0" x2="10" y2="10" stroke="#f43f5e" strokeWidth="0.75" />
        <line x1="20" y1="10" x2="20" y2="20" stroke="#f43f5e" strokeWidth="0.75" />
        <line x1="0" y1="10" x2="0" y2="20" stroke="#f43f5e" strokeWidth="0.75" />
      </pattern>
    );
  } else {
    return <div className="graphic-swatch" style={{ background: '#4b5563' }} />;
  }
  
  return (
    <svg className="graphic-swatch">
      <defs>{patternContent}</defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
};

export const GridTable: React.FC<GridTableProps> = ({
  title,
  columns,
  data,
  onChange,
  errors,
  tabName,
  autoFillNextFrom = false,
  highlightedRowId = null,
  holeId,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const highlightedRowRef = useRef<HTMLTableRowElement | null>(null);

  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const capturingRowIndexRef = useRef<number | null>(null);
  const [ruhsatAdi, setRuhsatAdi] = useState(() => localStorage.getItem('ruhsat_adi') || 'ÇAMLICA');

  useEffect(() => {
    localStorage.setItem('ruhsat_adi', ruhsatAdi);
  }, [ruhsatAdi]);

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const rowIndex = capturingRowIndexRef.current;
    if (!file || rowIndex === null) return;

    try {
      const compressedBase64 = await compressPhoto(file);
      const rowId = data[rowIndex]?.id;
      
      if (!rowId) return;

      let finalPhotoUrl = compressedBase64;
      const uploadedUrl = await uploadPhotoToSupabase(compressedBase64, rowId, holeId);
      if (uploadedUrl) {
        finalPhotoUrl = uploadedUrl;
      }
      
      handleCellChange(rowIndex, 'photo', finalPhotoUrl);
    } catch (err) {
      console.error('Failed to process captured image:', err);
      alert('Error processing image. Please try again.');
    } finally {
      capturingRowIndexRef.current = null;
      e.target.value = '';
    }
  };

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
    const firstRow = data[0];
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
      } else if (col.type === 'select' && firstRow && firstRow[col.key] !== undefined) {
        newRow[col.key] = firstRow[col.key];
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

  const handleExportLabForm = async () => {
    if (data.length === 0) {
      alert('No data rows to export.');
      return;
    }

    try {
      const response = await fetch('/Numune_Teslim_Formu.xlsx');
      if (!response.ok) {
        throw new Error(`HTTP error fetching template! status: ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();

      const ExcelJSModule = await import('exceljs');
      const ExcelJS = (ExcelJSModule.default || ExcelJSModule) as any;
      if (!ExcelJS || typeof ExcelJS.Workbook !== 'function') {
        throw new Error('Workbook constructor not found in loaded exceljs module.');
      }
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);

      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        throw new Error('Template sheet not found.');
      }

      const today = new Date();
      const dd = String(today.getDate()).padStart(2, '0');
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const yyyy = today.getFullYear();
      
      // Write the date to Row 4 Col AE (Index 31)
      const dateCell = worksheet.getCell(4, 31);
      dateCell.value = `. . .${dd}. . /. .${mm} . . /. . ${yyyy} . . . `;

      // Overwrite coordinate headers to "Başlangıç" and "Bitiş"
      worksheet.getCell(9, 5).value = 'BAŞLANGIÇ';
      worksheet.getCell(9, 6).value = 'BİTİŞ';
      worksheet.getCell(9, 7).value = '';

      // Clear template rows 10 to 47 (columns B to AE)
      for (let r = 10; r <= 47; r++) {
        for (let c = 2; c <= 31; c++) {
          worksheet.getCell(r, c).value = null;
        }
      }

      // Fill data
      data.forEach((row, index) => {
        const rIdx = 10 + index;
        if (rIdx > 47) return;

        worksheet.getCell(rIdx, 2).value = row.sampleTag || `S${String(index + 1).padStart(4, '0')}`;
        worksheet.getCell(rIdx, 3).value = row.oreType || ''; // Col C
        worksheet.getCell(rIdx, 4).value = ruhsatAdi || 'ÇAMLICA';
        worksheet.getCell(rIdx, 5).value = row.from !== undefined ? row.from : '';
        worksheet.getCell(rIdx, 6).value = row.to !== undefined ? row.to : '';
        worksheet.getCell(rIdx, 7).value = '';
        worksheet.getCell(rIdx, 8).value = row.physical || ''; // Col H

        if (row.chemical === 'XRF' || row.chemical === 'XRF + XRD') {
          worksheet.getCell(rIdx, 25).value = 'X';
        }

        const otherChem = row.otherChemical || '';
        if (otherChem.includes('SO4')) {
          worksheet.getCell(rIdx, 26).value = 'X';
        }

        const otherAnalyses: string[] = [];
        if (row.chemical === 'XRD' || row.chemical === 'XRF + XRD') {
          otherAnalyses.push('XRD');
        }
        if (otherChem.includes('Mn')) {
          otherAnalyses.push('Mn');
        }
        if (otherChem.includes('Cr')) {
          otherAnalyses.push('Cr');
        }

        if (otherAnalyses.length > 0) {
          worksheet.getCell(rIdx, 28).value = otherAnalyses.join(', ');
        } else {
          worksheet.getCell(rIdx, 28).value = '';
        }

        worksheet.getCell(rIdx, 31).value = row.description || ''; // Col AE
        
        worksheet.getCell(rIdx, 30).value = 'X'; // normal priority
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${holeId || 'Drillhole'}_Numune_Teslim_Formu.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error('Error generating lab Excel sheet:', err);
      alert(`Failed to export Excel delivery form. Error: ${err.message || err}`);
    }
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

        <div className="grid-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {tabName === 'SamplePrep' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '10px' }}>
              <label style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Ruhsat Adı:</label>
              <input
                type="text"
                value={ruhsatAdi}
                onChange={e => setRuhsatAdi(e.target.value.toUpperCase())}
                style={{
                  padding: '4px 8px',
                  fontSize: '12px',
                  width: '120px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-medium)',
                  background: 'var(--bg-input, #0f172a)',
                  color: 'var(--text-main)',
                  outline: 'none'
                }}
              />
            </div>
          )}

          {tabName === 'SamplePrep' && (
            <button className="btn btn-success btn-sm" onClick={handleExportLabForm} style={{ background: '#10b981', borderColor: '#10b981', color: '#fff' }}>
              <Download size={14} /> Export Lab Form
            </button>
          )}

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
                        {tabName === 'Lithology' && col.key === 'photo' ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '4px' }}>
                            {row.photo ? (
                              <div style={{ position: 'relative', display: 'inline-block' }}>
                                <img
                                  src={row.photo}
                                  alt="Lithology"
                                  onClick={() => setLightboxUrl(row.photo)}
                                  style={{
                                    width: '32px',
                                    height: '32px',
                                    objectFit: 'cover',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    border: '1px solid var(--border-medium)',
                                    boxShadow: 'var(--shadow-sm)'
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleCellChange(rowIndex, 'photo', '')}
                                  style={{
                                    position: 'absolute',
                                    top: '-4px',
                                    right: '-4px',
                                    background: 'var(--danger)',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '12px',
                                    height: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '8px',
                                    cursor: 'pointer',
                                    lineHeight: 1
                                  }}
                                  title="Remove Photo"
                                >
                                  ×
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => {
                                  capturingRowIndexRef.current = rowIndex;
                                  cameraInputRef.current?.click();
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '2px 6px',
                                  fontSize: '10px',
                                  borderRadius: 'var(--radius-sm)'
                                }}
                              >
                                <Camera size={12} />
                                <span>Capture</span>
                              </button>
                            )}
                          </div>
                        ) : tabName === 'Lithology' && col.key === 'color' ? (
                          <div className="readonly-value">
                            {getRockColorName(row.rockCode)}
                          </div>
                        ) : tabName === 'Lithology' && col.key === 'graphic' ? (
                          <div style={{ padding: '4px', display: 'flex', justifyContent: 'center' }}>
                            {renderGraphicSwatch(row.rockCode)}
                          </div>
                        ) : col.readOnly ? (
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
      
      {/* Hidden file input for capturing photos natively */}
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handlePhotoCapture}
      />

      {/* Full screen Lightbox Viewer */}
      {lightboxUrl && (
        <div
          onClick={() => setLightboxUrl(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            cursor: 'zoom-out'
          }}
        >
          <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%' }} onClick={e => e.stopPropagation()}>
            <img
              src={lightboxUrl}
              alt="Lithology Full Size"
              style={{
                maxWidth: '100%',
                maxHeight: '80vh',
                borderRadius: '8px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
              }}
            />
            <button
              onClick={() => setLightboxUrl(null)}
              style={{
                position: 'absolute',
                top: '-40px',
                right: '0',
                background: 'transparent',
                color: '#fff',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer'
              }}
            >
              Close ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
