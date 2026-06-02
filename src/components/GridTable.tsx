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
  tabName: 'Survey' | 'Lithology' | 'Geotech' | 'Assay' | 'SamplePrep' | 'SamplePrepMetallic';
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
    case 'TO':
    case 'TOPRAK':
      return 'Gri-Kahve';
    case 'ALBIT':
      return 'Felsik Mavi';
    case 'GNAYS':
    case 'GNYS':
      return 'Yeşil';
    case 'ANDEZIT':
    case 'AND':
    case 'VIA.A':
      return 'Mor';
    case 'TUF':
    case 'VIA':
    case 'VIA.T':
    case 'VIA:T':
    case 'VIA.P':
    case 'BRES':
    case 'BXS':
    case 'IGNIMBIRIT':
      return 'Açık Mor';
    case 'KAOLEN':
    case 'KAO':
    case 'KIL':
      return 'Sarı-Bej';
    case 'KUVARSIT':
    case 'QVN':
      return 'Sarı-Yeşil';
    case 'SIST':
    case 'MTSH':
    case 'MTSL':
    case 'MTSS':
      return 'Koyu Yeşil';
    case 'SEDIMENT':
      return 'Koyu Yeşil-Sarı';
    case 'GRANIT':
    case 'GNT':
    case 'GRA':
      return 'Kırmızı';
    case 'DASIT':
      return 'Açık Eflatun';
    case 'RIYOLIT':
      return 'Eflatun';
    case 'SIYENIT':
      return 'Pembe';
    case 'GRANODIYORIT':
      return 'Açık Kırmızı';
    case 'SUBVOLKANIK':
    case 'INTRUZIF':
    case 'VFD':
    case 'DAYK':
      return 'Koyu Kırmızı';
    case 'PERLIT':
      return 'Açık Pembe';
    case 'KALSIT':
      return 'Açık Mavi';
    case 'MRB':
      return 'Mavi';
    case 'KOMUR':
      return 'Kül Grisi';
    case 'XBH':
    case 'FLT':
    case 'YANAL':
      return 'Sarı';
    case 'OFY':
      return 'Koyu Yeşil-Gri';
    case 'SERP':
      return 'Açık Yeşil-Gri';
    case 'VSM':
    case 'VOLKANOSEDIMANTER':
      return 'Koyu Mor';
    case 'UNC':
      return 'Koyu Gri';
    case 'KUM':
      return 'Sarı';
    case 'OKSIT':
    case 'SULFIT':
      return 'Haki Yeşil';
    case 'ALUNIT':
      return 'Kirli Beyaz';
    default:
      return 'Gri';
  }
};

const renderGraphicSwatch = (code: string) => {
  const clean = (code || '').toUpperCase();
  const patternId = 'pat-loc-' + Math.random().toString(36).substr(2, 9);
  let patternContent = null;
  
  if (clean === 'GNAYS' || clean === 'GNYS') {
    patternContent = (
      <pattern id={patternId} width="20" height="20" patternUnits="userSpaceOnUse">
        <rect width="20" height="20" fill="#61E07A" />
        <path d="M0,5 Q5,10 10,5 T20,5 M0,15 Q5,20 10,15 T20,15" fill="none" stroke="#15803D" strokeWidth="1.5" />
      </pattern>
    );
  } else if (clean === 'ALBIT') {
    patternContent = (
      <pattern id={patternId} width="20" height="20" patternUnits="userSpaceOnUse">
        <rect width="20" height="20" fill="#E0F3FE" />
        <path d="M 5,2 L 2,5 M 15,12 L 12,15" stroke="#0E7490" strokeWidth="1.5" />
      </pattern>
    );
  } else if (clean === 'KAOLEN' || clean === 'KAO') {
    patternContent = (
      <pattern id={patternId} width="20" height="20" patternUnits="userSpaceOnUse">
        <rect width="20" height="20" fill="#FAF2BF" />
        <circle cx="5" cy="5" r="1.5" fill="#D9C333" fillOpacity="0.8" />
        <circle cx="15" cy="15" r="1.5" fill="#D9C333" fillOpacity="0.8" />
      </pattern>
    );
  } else if (['GRANIT', 'GNT', 'SUBVOLKANIK', 'SIYENIT', 'GRANODIYORIT', 'RIYOLIT', 'DASIT', 'INTRUZIF', 'GRA', 'VFD', 'DAYK'].includes(clean)) {
    patternContent = (
      <pattern id={patternId} width="20" height="20" patternUnits="userSpaceOnUse">
        <rect width="20" height="20" fill="#FF4D4D" />
        <circle cx="5" cy="5" r="1.5" fill="#B91C1C" />
        <circle cx="15" cy="15" r="1.5" fill="#B91C1C" />
        <line x1="12" y1="4" x2="16" y2="8" stroke="#B91C1C" strokeWidth="1" />
        <line x1="16" y1="4" x2="12" y2="8" stroke="#B91C1C" strokeWidth="1" />
        <line x1="2" y1="12" x2="6" y2="16" stroke="#B91C1C" strokeWidth="1" />
        <line x1="6" y1="12" x2="2" y2="16" stroke="#B91C1C" strokeWidth="1" />
      </pattern>
    );
  } else if (clean === 'BRES' || clean === 'BXS' || clean === 'VIA.P') {
    patternContent = (
      <pattern id={patternId} width="25" height="25" patternUnits="userSpaceOnUse">
        <rect width="25" height="25" fill="#BF66D9" />
        <polygon points="5,2 12,5 8,12 2,7" fill="#701A75" stroke="#E9D5FF" strokeWidth="0.5" />
        <polygon points="18,10 23,15 15,20 14,12" fill="#701A75" stroke="#E9D5FF" strokeWidth="0.5" />
        <polygon points="3,18 9,23 6,24" fill="#4A044E" stroke="#D8B4FE" strokeWidth="0.5" />
      </pattern>
    );
  } else if (clean === 'XBH' || clean === 'FLT' || clean === 'YANAL') {
    patternContent = (
      <pattern id={patternId} width="20" height="20" patternUnits="userSpaceOnUse">
        <rect width="20" height="20" fill="#E6E600" />
        <line x1="0" y1="0" x2="20" y2="20" stroke="#991B1B" strokeWidth="1" />
        <line x1="20" y1="0" x2="0" y2="20" stroke="#991B1B" strokeWidth="1" />
      </pattern>
    );
  } else if (clean === 'KUVARSIT' || clean === 'QVN') {
    patternContent = (
      <pattern id={patternId} width="10" height="10" patternUnits="userSpaceOnUse">
        <rect width="10" height="10" fill="#E6F259" />
        <circle cx="3" cy="3" r="1.2" fill="#A1A11A" />
        <circle cx="8" cy="8" r="1.2" fill="#A1A11A" />
      </pattern>
    );
  } else if (['ANDEZIT', 'AND', 'TUF', 'VIA', 'VIA.A', 'VIA.T', 'VIA:T', 'IGNIMBIRIT'].includes(clean)) {
    const isAnd = ['ANDEZIT', 'AND', 'VIA.A'].includes(clean);
    patternContent = (
      <pattern id={patternId} width="20" height="20" patternUnits="userSpaceOnUse">
        <rect width="20" height="20" fill={isAnd ? "#9145EB" : "#BF66D9"} />
        <path d="M 4,6 L 7,3 L 10,6" fill="none" stroke={isAnd ? "#5B21B6" : "#701A75"} strokeWidth="1.5" />
        <path d="M 12,16 L 15,13 L 18,16" fill="none" stroke={isAnd ? "#5B21B6" : "#701A75"} strokeWidth="1.5" />
      </pattern>
    );
  } else if (clean === 'BASALT' || clean === 'OFY' || clean === 'SERP') {
    const isSerp = clean === 'SERP';
    const isOfy = clean === 'OFY';
    const bgFill = isSerp ? "#8CBF80" : (isOfy ? "#8AB580" : "#6600FF");
    const strokeCol = isSerp ? "#15803D" : (isOfy ? "#166534" : "#4338CA");
    patternContent = (
      <pattern id={patternId} width="20" height="20" patternUnits="userSpaceOnUse">
        <rect width="20" height="20" fill={bgFill} />
        <path d="M 5,5 L 8,8 L 11,5" fill="none" stroke={strokeCol} strokeWidth="1.5" />
        <path d="M 15,15 L 18,18 L 21,15" fill="none" stroke={strokeCol} strokeWidth="1.5" />
      </pattern>
    );
  } else if (['DOLGU', 'OB', 'TOPRAK', 'TO'].includes(clean)) {
    patternContent = (
      <pattern id={patternId} width="20" height="20" patternUnits="userSpaceOnUse">
        <rect width="20" height="20" fill="#ADA699" />
        <circle cx="4" cy="4" r="1.2" fill="#57534E" />
        <circle cx="14" cy="14" r="1.2" fill="#57534E" />
        <line x1="2" y1="18" x2="8" y2="18" stroke="#78716C" strokeWidth="1" />
        <line x1="12" y1="8" x2="18" y2="8" stroke="#78716C" strokeWidth="1" />
      </pattern>
    );
  } else if (['SIST', 'MTSH', 'MTSL', 'MTSS', 'VSM', 'VOLKANOSEDIMANTER', 'SEDIMENT'].includes(clean)) {
    const isSed = clean === 'SEDIMENT';
    const fillCol = isSed ? "#CCB266" : (clean === 'VSM' || clean === 'VOLKANOSEDIMANTER' ? "#B259CC" : "#33A666");
    const strokeCol = isSed ? "#78350f" : (clean === 'VSM' || clean === 'VOLKANOSEDIMANTER' ? "#701A75" : "#14532D");
    patternContent = (
      <pattern id={patternId} width="30" height="10" patternUnits="userSpaceOnUse">
        <rect width="30" height="10" fill={fillCol} />
        <path d="M0,5 Q7.5,0 15,5 T30,5" fill="none" stroke={strokeCol} strokeWidth="1" />
      </pattern>
    );
  } else if (clean === 'KIL') {
    patternContent = (
      <pattern id={patternId} width="10" height="10" patternUnits="userSpaceOnUse">
        <rect width="10" height="10" fill="#FAF2BF" />
        <line x1="0" y1="5" x2="10" y2="5" stroke="#D97706" strokeWidth="1" />
      </pattern>
    );
  } else if (clean === 'KALSIT' || clean === 'MRB') {
    const isMrb = clean === 'MRB';
    patternContent = (
      <pattern id={patternId} width="20" height="20" patternUnits="userSpaceOnUse">
        <rect width="20" height="20" fill={isMrb ? "#33B3E6" : "#66B2F2"} />
        <line x1="0" y1="10" x2="20" y2="10" stroke={isMrb ? "#0369a1" : "#1D4ED8"} strokeWidth="0.75" />
        <line x1="0" y1="20" x2="20" y2="20" stroke={isMrb ? "#0369a1" : "#1D4ED8"} strokeWidth="0.75" />
        <line x1="10" y1="0" x2="10" y2="10" stroke={isMrb ? "#0369a1" : "#1D4ED8"} strokeWidth="0.75" />
        <line x1="20" y1="10" x2="20" y2="20" stroke={isMrb ? "#0369a1" : "#1D4ED8"} strokeWidth="0.75" />
        <line x1="0" y1="10" x2="0" y2="20" stroke={isMrb ? "#0369a1" : "#1D4ED8"} strokeWidth="0.75" />
      </pattern>
    );
  } else if (clean === 'UNC') {
    patternContent = (
      <pattern id={patternId} width="20" height="20" patternUnits="userSpaceOnUse">
        <rect width="20" height="20" fill="#64748b" />
        <path d="M 0,10 L 20,10" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4,4" />
      </pattern>
    );
  } else if (clean === 'KUM') {
    patternContent = (
      <pattern id={patternId} width="10" height="10" patternUnits="userSpaceOnUse">
        <rect width="10" height="10" fill="#F2D973" />
        <circle cx="2" cy="2" r="0.8" fill="#B45309" />
        <circle cx="7" cy="7" r="0.8" fill="#B45309" />
      </pattern>
    );
  } else {
    return <div className="graphic-swatch" style={{ background: '#cbd5e1' }} />;
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
  const [colWidths, setColWidths] = useState<Record<string, number>>({});

  useEffect(() => {
    localStorage.setItem('ruhsat_adi', ruhsatAdi);
  }, [ruhsatAdi]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, colKey: string) => {
    e.preventDefault();
    const thElement = e.currentTarget.parentElement;
    if (!thElement) return;

    const startWidth = thElement.getBoundingClientRect().width;
    const startX = e.clientX;
    
    document.body.classList.add('resizing-col');

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.max(60, startWidth + deltaX);
      setColWidths(prev => ({
        ...prev,
        [colKey]: newWidth
      }));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.classList.remove('resizing-col');
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
  };

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

    // For SamplePrep & SamplePrepMetallic, let's auto-increment Sample Tag
    if ((tabName === 'SamplePrep' || tabName === 'SamplePrepMetallic') && lastRow && lastRow.sampleTag) {
      const match = lastRow.sampleTag.match(/^([a-zA-Z_-]*?)(\d+)$/);
      if (match) {
        const prefix = match[1];
        const num = parseInt(match[2], 10) + 1;
        const paddedNum = String(num).padStart(match[2].length, '0');
        newRow.sampleTag = `${prefix}${paddedNum}`;
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
            const parsed = val !== undefined && val !== '' ? parseFloat(val) : 0;
            const isAssayGrade = tabName === 'Assay' && col.key !== 'from' && col.key !== 'to';
            row[col.key] = isAssayGrade ? parsed : Math.round(parsed * 100) / 100;
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
      const ExcelJSModule = await import('exceljs');
      const ExcelJS = (ExcelJSModule.default || ExcelJSModule) as any;
      if (!ExcelJS || typeof ExcelJS.Workbook !== 'function') {
        throw new Error('Workbook constructor not found in loaded exceljs module.');
      }
      const workbook = new ExcelJS.Workbook();
      let worksheet: any;

      const today = new Date();
      const dd = String(today.getDate()).padStart(2, '0');
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const yyyy = today.getFullYear();
      const dateStr = `${dd}/${mm}/${yyyy}`;

      if (tabName === 'SamplePrepMetallic') {
        // Design a completely new premium metallic form from scratch!
        worksheet = workbook.addWorksheet('Sample Submission');

        // Column widths
        worksheet.columns = [
          { width: 3 }, // spacer Col A
          { key: 'rowNo', width: 8 },
          { key: 'sampleTag', width: 18 },
          { key: 'sampleType', width: 16 },
          { key: 'from', width: 15 },
          { key: 'to', width: 15 },
          { key: 'interval', width: 12 },
          { key: 'oreType', width: 22 },
          { key: 'analysisCode', width: 32 },
          { key: 'weight', width: 18 },
          { key: 'description', width: 38 }
        ];

        // Enable grid lines
        worksheet.views = [{ showGridLines: true }];

        const headerBg = '1E293B'; // Deep Slate Navy
        const fontName = 'Segoe UI';

        // 1. Title Block
        worksheet.mergeCells('B2:K2');
        const titleCell = worksheet.getCell('B2');
        titleCell.value = 'KALE MADENCİLİK SANAYİ VE TİCARET A.Ş.';
        titleCell.font = { name: fontName, size: 15, bold: true, color: { argb: 'FFFFFF' } };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerBg } };
        worksheet.getRow(2).height = 35;

        worksheet.mergeCells('B3:K3');
        const subTitleCell = worksheet.getCell('B3');
        subTitleCell.value = 'METALLIC MINERAL SERVICES - LABORATORY SAMPLE SUBMISSION FORM';
        subTitleCell.font = { name: fontName, size: 9, italic: true, bold: true, color: { argb: 'E2E8F0' } };
        subTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        subTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '334155' } }; 
        worksheet.getRow(3).height = 20;

        // 2. Metadata Block
        const metadataBorder = {
          top: { style: 'thin', color: { argb: '94A3B8' } },
          left: { style: 'thin', color: { argb: '94A3B8' } },
          bottom: { style: 'thin', color: { argb: '94A3B8' } },
          right: { style: 'thin', color: { argb: '94A3B8' } }
        };

        const writeMetaCell = (row: number, colName1: string, label: string, colName2: string, value: any) => {
          const lblCell = worksheet.getCell(`${colName1}${row}`);
          lblCell.value = label;
          lblCell.font = { name: fontName, size: 9, bold: true, color: { argb: '475569' } };
          lblCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } }; 
          lblCell.alignment = { horizontal: 'left', vertical: 'middle' };
          lblCell.border = metadataBorder;

          const valCell = worksheet.getCell(`${colName2}${row}`);
          valCell.value = value;
          valCell.font = { name: fontName, size: 9, bold: true, color: { argb: '0F172A' } };
          valCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF' } };
          valCell.alignment = { horizontal: 'left', vertical: 'middle' };
          valCell.border = metadataBorder;
        };

        worksheet.getRow(5).height = 22;
        writeMetaCell(5, 'B', 'License / Ruhsat Adı:', 'C', ruhsatAdi || 'ÇAMLICA');
        writeMetaCell(5, 'E', 'Date of Despatch:', 'F', dateStr);
        writeMetaCell(5, 'H', 'Despatch Number:', 'I', 'MET-DESP-001');

        // Fetch project name from collar info in localStorage
        let projectVal = 'METALİK ARAMA';
        let eastingVal = 0;
        let northingVal = 0;
        let elevationVal = 0;
        try {
          const colLocal = localStorage.getItem(`dh_${holeId}_collar`);
          if (colLocal) {
            const parsed = JSON.parse(colLocal);
            projectVal = parsed.project || 'METALİK ARAMA';
            eastingVal = parsed.easting || 0;
            northingVal = parsed.northing || 0;
            elevationVal = parsed.elevation || 0;
          }
        } catch (e) {}

        worksheet.getRow(6).height = 22;
        writeMetaCell(6, 'B', 'Project Name:', 'C', projectVal);
        writeMetaCell(6, 'E', 'Drillhole ID / Kuyu:', 'F', holeId || 'Unknown');
        writeMetaCell(6, 'H', 'Logged / Dispatched By:', 'I', 'Emir Özçakıcı');

        worksheet.getRow(7).height = 22;
        writeMetaCell(7, 'B', 'Easting (X):', 'C', eastingVal);
        writeMetaCell(7, 'E', 'Northing (Y):', 'F', northingVal);
        writeMetaCell(7, 'H', 'Elevation / RL (Z):', 'I', elevationVal);

        worksheet.getRow(8).height = 22;
        writeMetaCell(8, 'B', 'Destination Lab:', 'C', 'ALS Geochemistry');
        writeMetaCell(8, 'E', 'Total Samples:', 'F', data.length);
        writeMetaCell(8, 'H', 'Carrier / Kargo:', 'I', 'DHL / MNG');

        // Merge helper values columns
        const mergeRanges = [
          'C5:D5', 'F5:G5', 'I5:K5',
          'C6:D6', 'F6:G6', 'I6:K6',
          'C7:D7', 'F7:G7', 'I7:K7',
          'C8:D8', 'F8:G8', 'I8:K8'
        ];

        mergeRanges.forEach(range => {
          worksheet.mergeCells(range);
        });

        // 3. Table Headers (Row 10)
        worksheet.getRow(10).height = 26;
        const headers = [
          { cell: 'B10', val: 'Row No' },
          { cell: 'C10', val: 'Sample Tag / ID' },
          { cell: 'D10', val: 'Sample Type' },
          { cell: 'E10', val: 'From (m)' },
          { cell: 'F10', val: 'To (m)' },
          { cell: 'G10', val: 'Interval (m)' },
          { cell: 'H10', val: 'Ore / Rock Type' },
          { cell: 'I10', val: 'Requested ALS Code' },
          { cell: 'J10', val: 'Estimated Weight (kg)' },
          { cell: 'K10', val: 'Geology Description / Notes' }
        ];

        headers.forEach(h => {
          const cell = worksheet.getCell(h.cell);
          cell.value = h.val;
          cell.font = { name: fontName, size: 9, bold: true, color: { argb: 'FFFFFF' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerBg } };
          cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          cell.border = {
            top: { style: 'medium', color: { argb: '0F172A' } },
            left: { style: 'thin', color: { argb: '94A3B8' } },
            bottom: { style: 'medium', color: { argb: '0F172A' } },
            right: { style: 'thin', color: { argb: '94A3B8' } }
          };
        });

        // 4. Fill Data Rows
        data.forEach((row, index) => {
          const rIdx = 11 + index;
          worksheet.getRow(rIdx).height = 20;

          worksheet.getCell(`B${rIdx}`).value = index + 1;
          worksheet.getCell(`C${rIdx}`).value = row.sampleTag || `M${String(index + 1).padStart(4, '0')}`;
          worksheet.getCell(`D${rIdx}`).value = 'Core Interval';
          worksheet.getCell(`E${rIdx}`).value = row.from !== undefined ? row.from : '';
          worksheet.getCell(`F${rIdx}`).value = row.to !== undefined ? row.to : '';
          if (row.from !== undefined && row.to !== undefined) {
            worksheet.getCell(`G${rIdx}`).value = parseFloat((row.to - row.from).toFixed(2));
          } else {
            worksheet.getCell(`G${rIdx}`).value = '';
          }
          worksheet.getCell(`H${rIdx}`).value = row.oreType || '';
          worksheet.getCell(`I${rIdx}`).value = row.analysisCode || '';
          worksheet.getCell(`J${rIdx}`).value = ''; // left blank for lab
          worksheet.getCell(`K${rIdx}`).value = row.description || '';

          const rowBg = index % 2 === 0 ? 'FFFFFF' : 'F8FAFC';
          const thinBorder = {
            top: { style: 'thin', color: { argb: 'E2E8F0' } },
            left: { style: 'thin', color: { argb: 'CBD5E1' } },
            bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
            right: { style: 'thin', color: { argb: 'CBD5E1' } }
          };

          ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'].forEach(col => {
            const cell = worksheet.getCell(`${col}${rIdx}`);
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
            cell.border = thinBorder;
            cell.font = { name: fontName, size: 9, color: { argb: '1E293B' } };
            
            if (['B', 'C', 'D', 'E', 'F', 'G', 'I', 'J'].includes(col)) {
              cell.alignment = { horizontal: 'center', vertical: 'middle' };
            } else {
              cell.alignment = { horizontal: 'left', vertical: 'middle' };
            }
          });
        });

        // 5. Signature Boxes Block
        const signRowStart = 11 + data.length + 2;
        worksheet.getRow(signRowStart).height = 18;
        worksheet.getRow(signRowStart + 1).height = 18;
        worksheet.getRow(signRowStart + 2).height = 42; 
        worksheet.getRow(signRowStart + 3).height = 24;

        const writeSignatureBox = (col1: string, col2: string, titleLabel: string, nameVal: string, titleVal: string) => {
          worksheet.mergeCells(`${col1}${signRowStart}:${col2}${signRowStart}`);
          const tCell = worksheet.getCell(`${col1}${signRowStart}`);
          tCell.value = titleLabel;
          tCell.font = { name: fontName, size: 9, bold: true, color: { argb: 'FFFFFF' } };
          tCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '475569' } };
          tCell.alignment = { horizontal: 'center', vertical: 'middle' };

          worksheet.mergeCells(`${col1}${signRowStart + 1}:${col2}${signRowStart + 1}`);
          const sCell = worksheet.getCell(`${col1}${signRowStart + 1}`);
          sCell.value = ' Signature / İmza:';
          sCell.font = { name: fontName, size: 8, italic: true, color: { argb: '94A3B8' } };
          sCell.alignment = { horizontal: 'left', vertical: 'top' };

          worksheet.mergeCells(`${col1}${signRowStart + 2}:${col2}${signRowStart + 2}`);
          worksheet.getCell(`${col1}${signRowStart + 2}`).value = '';

          worksheet.mergeCells(`${col1}${signRowStart + 3}:${col2}${signRowStart + 3}`);
          const iCell = worksheet.getCell(`${col1}${signRowStart + 3}`);
          iCell.value = `Name: ${nameVal} (${titleVal})\nDate: ${dateStr}`;
          iCell.font = { name: fontName, size: 8, bold: true, color: { argb: '1E293B' } };
          iCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

          const boxBorder = {
            top: { style: 'thin', color: { argb: '475569' } },
            left: { style: 'thin', color: { argb: '475569' } },
            bottom: { style: 'thin', color: { argb: '475569' } },
            right: { style: 'thin', color: { argb: '475569' } }
          };

          for (let r = signRowStart; r <= signRowStart + 3; r++) {
            worksheet.getCell(`${col1}${r}`).border = boxBorder;
            worksheet.getCell(`${col2}${r}`).border = boxBorder;
          }
        };

        writeSignatureBox('B', 'D', 'PREPARED BY / HAZIRLAYAN', 'Emir Özçakıcı', 'Geologist');
        writeSignatureBox('F', 'H', 'DISPATCHED BY / GÖNDEREN', 'İsmailcan SEVER', 'Geologist');
        writeSignatureBox('I', 'K', 'RECEIVED BY / TESLİM ALAN', 'ALS Laboratory', 'Receiver');

        const mergeSignRanges = [
          `B${signRowStart}:D${signRowStart}`, `B${signRowStart+1}:D${signRowStart+1}`, `B${signRowStart+2}:D${signRowStart+2}`, `B${signRowStart+3}:D${signRowStart+3}`,
          `F${signRowStart}:H${signRowStart}`, `F${signRowStart+1}:H${signRowStart+1}`, `F${signRowStart+2}:H${signRowStart+2}`, `F${signRowStart+3}:H${signRowStart+3}`,
          `I${signRowStart}:K${signRowStart}`, `I${signRowStart+1}:K${signRowStart+1}`, `I${signRowStart+2}:K${signRowStart+2}`, `I${signRowStart+3}:K${signRowStart+3}`
        ];

        mergeSignRanges.forEach(range => {
          worksheet.mergeCells(range);
        });

      } else {
        // Fallback: Read from industrial template
        const response = await fetch('/Numune_Teslim_Formu.xlsx');
        if (!response.ok) {
          throw new Error(`HTTP error fetching template! status: ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        await workbook.xlsx.load(arrayBuffer);

        worksheet = workbook.worksheets[0];
        if (!worksheet) {
          throw new Error('Template sheet not found.');
        }

        // Write the date to Row 4 Col AD (Index 30)
        const dateCell = worksheet.getCell(4, 30);
        dateCell.value = `. . .${dd}. . /. .${mm} . . /. . ${yyyy} . . . `;

        // Clear template rows 10 to 47
        for (let r = 10; r <= 47; r++) {
          for (let c = 2; c <= 30; c++) {
            worksheet.getCell(r, c).value = null;
          }
        }

        // Fill data
        data.forEach((row, index) => {
          const rIdx = 10 + index;
          if (rIdx > 47) return;

          worksheet.getCell(rIdx, 2).value = row.sampleTag || `S${String(index + 1).padStart(4, '0')}`;
          worksheet.getCell(rIdx, 3).value = row.oreType || ''; // Col C
          worksheet.getCell(rIdx, 4).value = `${ruhsatAdi || 'ÇAMLICA'} - ${holeId || ''} KUYUSU`.toUpperCase();
          worksheet.getCell(rIdx, 5).value = row.from !== undefined ? row.from : '';
          worksheet.getCell(rIdx, 6).value = row.to !== undefined ? row.to : '';
          worksheet.getCell(rIdx, 7).value = row.physical || ''; // Col G

          if (row.chemical === 'XRF' || row.chemical === 'XRF + XRD') {
            worksheet.getCell(rIdx, 24).value = 'X'; // Col X
          }

          const otherChem = row.otherChemical || '';
          if (otherChem.includes('SO4')) {
            worksheet.getCell(rIdx, 25).value = 'X'; // Col Y
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
            worksheet.getCell(rIdx, 27).value = otherAnalyses.join(', '); // Col AA
          } else {
            worksheet.getCell(rIdx, 27).value = '';
          }

          worksheet.getCell(rIdx, 30).value = row.description || ''; // Col AD
          worksheet.getCell(rIdx, 29).value = 'X'; // normal priority (Col AC)
        });
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = tabName === 'SamplePrepMetallic' 
        ? `${holeId || 'Drillhole'}_Metalik_Numune_Teslim_Formu.xlsx`
        : `${holeId || 'Drillhole'}_Numune_Teslim_Formu.xlsx`;
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
          {(tabName === 'SamplePrep' || tabName === 'SamplePrepMetallic') && (
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

          {(tabName === 'SamplePrep' || tabName === 'SamplePrepMetallic') && (
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
                <th key={col.key} style={{ width: colWidths[col.key] || col.width || 'auto', position: 'relative', userSelect: 'none' }}>
                  <span style={{ display: 'block', paddingRight: col.readOnly ? '0' : '6px' }}>{col.label}</span>
                  {!col.readOnly && (
                    <div
                      className="col-resizer"
                      onMouseDown={(e) => handleMouseDown(e, col.key)}
                    />
                  )}
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
                             onChange={e => {
                               let val: any = e.target.value;
                               if (col.type === 'number' && val !== '') {
                                 const parsed = parseFloat(val);
                                 const isAssayGrade = tabName === 'Assay' && col.key !== 'from' && col.key !== 'to';
                                 val = isAssayGrade ? parsed : Math.round(parsed * 100) / 100;
                               }
                               handleCellChange(rowIndex, col.key, val);
                             }}
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
