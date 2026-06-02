import React, { useState, useRef } from 'react';
import type { LithologyState, GeotechState, AssayState } from '../hooks/useDrillholeData';
import { ChevronLeft, ChevronRight, Eye, EyeOff, SlidersHorizontal, Download } from 'lucide-react';

interface ColumnLogProps {
  totalDepth: number;
  lithology: LithologyState[];
  geotech: GeotechState[];
  assays: AssayState[];
  onItemClick?: (tab: string, itemId: string) => void;
  holeId?: string;
  collar?: any;
}

interface ColumnConfig {
  id: string;
  label: string;
  width: number;
  visible: boolean;
  color?: string;
}

const INDUSTRIAL_ANALYTES = [
  { key: 'al2o3', label: 'Al2O3 (%)', color: '#3b82f6' },   // Royal Blue
  { key: 'fe2o3', label: 'Fe2O3 (%)', color: '#f43f5e' },   // Rose Red
  { key: 'sio2', label: 'SiO2 (%)', color: '#10b981' },    // Emerald Green
  { key: 'tio2', label: 'TiO2 (%)', color: '#eab308' },    // Amber Yellow
  { key: 'na2o_k2o', label: 'Na2O+K2O (%)', color: '#ec4899' }, // Hot Pink
  { key: 'loi', label: 'LOI / AZ (%)', color: '#a855f7' }  // Purple
];

const METALLIC_ANALYTES = [
  { key: 'au_ppm', label: 'Au (ppm)', color: '#ffd700' },    // Gold Yellow
  { key: 'au_ppb', label: 'Au (ppb)', color: '#f59e0b' },    // Amber
  { key: 'ag_ppm', label: 'Ag (ppm)', color: '#94a3b8' },    // Slate (Silver)
  { key: 'cu_ppm', label: 'Cu (ppm)', color: '#ec4899' },    // Copper Pink
  { key: 'pb_ppm', label: 'Pb (ppm)', color: '#a855f7' },    // Lead Purple
  { key: 'zn_ppm', label: 'Zn (ppm)', color: '#3b82f6' },    // Zinc Blue
  { key: 'as_ppm', label: 'As (ppm)', color: '#ef4444' }     // Arsenic Red
];

const METALLIC_HOLES = [
  'BCK-01', 'BCK-01A', 'BCK-02', 'BCK-03', 'BCK-04', 'BCK-05',
  'BDK-01', 'BDK-02', 'BDK-03', 'BDK-04', 'BDK-05', 'BDK-06', 'BDK-07', 'BDK-08', 'BDK-09', 'BDK-10',
  'DDK-01', 'DDK-02', 'DDK-03', 'DDK-04', 'DDK-05', 'DDK-06', 'DDK-07', 'DDK-08', 'DDK-09', 'DDK-10',
  'DDK-11', 'DDK-12', 'DDK-13', 'DDK-14', 'DDK-15', 'DDK-16', 'DDK-17', 'DDK-18', 'DDK-19', 'DDK-20',
  'DDK-21', 'DDK-22', 'DDK-23', 'DDK-24', 'DDK-25', 'DDK-26', 'DKK-27', 'DDK-28', 'DDK-29', 'DDK-30',
  'T-01', 'T-02', 'T-03',
  'ETK-01', 'ETK-02', 'ETK-03', 'ETK-04', 'ETK-5', 'ETK-6', 'ETK-7', 'ETK-8', 'ETK-9', 'ETK-10',
  'ETK-11', 'ETK-12', 'ETK-13', 'ETK-14',
  'NMK-01', 'NMK-02', 'NMK-03',
  'S-01', 'S-02', 'S-03', 'S-04',
  'KRK-S1', 'KRK-S2'
];

export const ColumnLog: React.FC<ColumnLogProps> = ({
  totalDepth,
  lithology,
  geotech,
  assays,
  onItemClick,
  holeId,
  collar,
}) => {
  const isMetallic = holeId ? METALLIC_HOLES.includes(holeId.trim().toUpperCase()) : false;
  const analytesList = isMetallic ? METALLIC_ANALYTES : INDUSTRIAL_ANALYTES;

  const [hoverInfo, setHoverInfo] = useState<string | null>(null);
  const [selectedAnalytes, setSelectedAnalytes] = useState<string[]>(isMetallic ? ['au_ppm'] : ['al2o3']);
  const [visualStyle, setVisualStyle] = useState<'bars' | 'line'>('bars');
  const [showConfig, setShowConfig] = useState<boolean>(false);

  const headerSvgRef = useRef<SVGSVGElement>(null);
  const bodySvgRef = useRef<SVGSVGElement>(null);

  const handleExportExcel = async () => {
    const project = collar?.project || '-';
    const holeIdVal = holeId || collar?.holeId || '-';
    const easting = collar?.easting !== undefined ? `${collar.easting}` : '-';
    const northing = collar?.northing !== undefined ? `${collar.northing}` : '-';
    const elevation = collar?.elevation !== undefined ? `${collar.elevation}` : '-';
    const dipAzimuth = collar?.dip !== undefined && collar?.azimuth !== undefined ? `${collar.dip}° / ${collar.azimuth}°` : '-';
    const logger = collar?.logger || '-';

    try {
      const ExcelJSModule = await import('exceljs');
      const ExcelJS = (ExcelJSModule.default || ExcelJSModule) as any;
      if (!ExcelJS || typeof ExcelJS.Workbook !== 'function') {
        throw new Error('Workbook constructor not found in loaded exceljs module.');
      }
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Sondaj Logu');

      // Set columns
      worksheet.columns = [
        { width: 3 }, // spacer Col A
        { key: 'depth', width: 12 }, // Col B
        { key: 'interval', width: 18 }, // Col C
        { key: 'sampleNo', width: 15 }, // Col D
        { key: 'strength', width: 12 }, // Col E
        { key: 'weathering', width: 18 }, // Col F
        { key: 'fracture', width: 14 }, // Col G
        { key: 'tcr', width: 12 }, // Col H
        { key: 'scr', width: 12 }, // Col I
        { key: 'rqd', width: 12 }, // Col J
        { key: 'lithology', width: 18 }, // Col K
        { key: 'description', width: 45 } // Col L
      ];

      // Enable grid lines
      worksheet.views = [{ showGridLines: true }];

      // Borders & Fills
      const thinBorder = {
        top: { style: 'thin', color: { argb: '000000' } },
        left: { style: 'thin', color: { argb: '000000' } },
        bottom: { style: 'thin', color: { argb: '000000' } },
        right: { style: 'thin', color: { argb: '000000' } }
      };
      
      const thickBorder = {
        top: { style: 'medium', color: { argb: '000000' } },
        left: { style: 'medium', color: { argb: '000000' } },
        bottom: { style: 'medium', color: { argb: '000000' } },
        right: { style: 'medium', color: { argb: '000000' } }
      };

      const grayFill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'F1F5F9' }
      };

      // Classification Header
      worksheet.getCell('B1').value = 'Sınıflandırma: HİZMETE ÖZEL (CONFIDENTIAL)';
      worksheet.getCell('B1').font = { name: 'Segoe UI', size: 8, bold: true };

      // Title Card
      worksheet.mergeCells('B2:J3');
      const titleCell = worksheet.getCell('B2');
      titleCell.value = 'SONDAJ LOGU';
      titleCell.font = { name: 'Segoe UI', size: 16, bold: true };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      titleCell.border = thickBorder;

      const snoLbl = worksheet.getCell('K2');
      snoLbl.value = 'Sondaj No';
      snoLbl.font = { name: 'Segoe UI', size: 8, bold: true };
      snoLbl.alignment = { horizontal: 'center', vertical: 'middle' };
      snoLbl.border = thinBorder;
      snoLbl.fill = grayFill;

      const snoVal = worksheet.getCell('L2');
      snoVal.value = holeIdVal;
      snoVal.font = { name: 'Segoe UI', size: 9, bold: true };
      snoVal.alignment = { horizontal: 'center', vertical: 'middle' };
      snoVal.border = thinBorder;

      const pnoLbl = worksheet.getCell('K3');
      pnoLbl.value = 'Sayfa No';
      pnoLbl.font = { name: 'Segoe UI', size: 8, bold: true };
      pnoLbl.alignment = { horizontal: 'center', vertical: 'middle' };
      pnoLbl.border = thinBorder;
      pnoLbl.fill = grayFill;

      const pnoVal = worksheet.getCell('L3');
      pnoVal.value = 1;
      pnoVal.font = { name: 'Segoe UI', size: 9 };
      pnoVal.alignment = { horizontal: 'center', vertical: 'middle' };
      pnoVal.border = thinBorder;

      // Metadata Rows
      const rowData = [
        {
          c1Label: 'Yüklenici Firma', c1Val: 'MCB SONDAJ',
          c2Label: 'Sondaj Derinliği', c2Val: `${collar?.totalDepth !== undefined ? collar.totalDepth : '0'} m`,
          c3Label: 'Yeraltı Suyu', c3Val: '-'
        },
        {
          c1Label: 'Proje Adı', c1Val: project,
          c2Label: 'Başlama Tarihi', c2Val: collar?.dateStarted || '-',
          c3Label: 'Makine Tipi/Metodu', c3Val: '-'
        },
        {
          c1Label: 'İl', c1Val: 'Çanakkale',
          c2Label: 'Bitiş Tarihi', c2Val: collar?.dateCompleted || '-',
          c3Label: 'SPT Şahmerdan Tipi', c3Val: '-'
        },
        {
          c1Label: 'İlçe', c1Val: 'Biga',
          c2Label: 'Sondaj Kotu', c2Val: collar?.elevation !== undefined ? `${collar.elevation} m` : '-',
          c3Label: 'Delgi Çapı', c3Val: 'HQ'
        },
        {
          c1Label: 'Mahalle/Köy', c1Val: 'Arabaalan',
          c2Label: 'Koordinat X (N)', c2Val: northing,
          c3Label: 'Sondör', c3Val: '-'
        },
        {
          c1Label: 'Pafta', c1Val: '-',
          c2Label: 'Koordinat Y (E)', c2Val: easting,
          c3Label: 'Sondör Belge No', c3Val: '-'
        },
        {
          c1Label: 'Ada', c1Val: '-',
          c2Label: 'Koordinat Z (RL)', c2Val: elevation,
          c3Label: 'Yönelim (Dip/Azim)', c3Val: dipAzimuth
        },
        {
          c1Label: 'Parsel', c1Val: '-',
          c2Label: 'Drill Status', c2Val: collar?.status || '-',
          c3Label: 'Logger / Geologist', c3Val: logger
        }
      ];

      const startY = 4;
      const writeMetaRow = (rowNum: number, label1: string, val1: any, label2: string, val2: any, label3: string, val3: any) => {
        worksheet.getRow(rowNum).height = 16;
        
        // c1
        const l1 = worksheet.getCell(`B${rowNum}`);
        l1.value = label1;
        l1.font = { name: 'Segoe UI', size: 9, bold: true };
        l1.alignment = { horizontal: 'left', vertical: 'middle' };
        l1.border = thinBorder;
        l1.fill = grayFill;
        
        worksheet.mergeCells(`C${rowNum}:D${rowNum}`);
        const v1 = worksheet.getCell(`C${rowNum}`);
        v1.value = val1;
        v1.font = { name: 'Segoe UI', size: 9 };
        v1.alignment = { horizontal: 'left', vertical: 'middle' };
        v1.border = thinBorder;
        
        // c2
        worksheet.mergeCells(`E${rowNum}:F${rowNum}`);
        const l2 = worksheet.getCell(`E${rowNum}`);
        l2.value = label2;
        l2.font = { name: 'Segoe UI', size: 9, bold: true };
        l2.alignment = { horizontal: 'left', vertical: 'middle' };
        l2.border = thinBorder;
        l2.fill = grayFill;
        
        worksheet.mergeCells(`G${rowNum}:H${rowNum}`);
        const v2 = worksheet.getCell(`G${rowNum}`);
        v2.value = val2;
        v2.font = { name: 'Segoe UI', size: 9 };
        v2.alignment = { horizontal: 'left', vertical: 'middle' };
        v2.border = thinBorder;

        // c3
        worksheet.mergeCells(`I${rowNum}:J${rowNum}`);
        const l3 = worksheet.getCell(`I${rowNum}`);
        l3.value = label3;
        l3.font = { name: 'Segoe UI', size: 9, bold: true };
        l3.alignment = { horizontal: 'left', vertical: 'middle' };
        l3.border = thinBorder;
        l3.fill = grayFill;
        
        worksheet.mergeCells(`K${rowNum}:L${rowNum}`);
        const v3 = worksheet.getCell(`K${rowNum}`);
        v3.value = val3;
        v3.font = { name: 'Segoe UI', size: 9 };
        v3.alignment = { horizontal: 'left', vertical: 'middle' };
        v3.border = thinBorder;
      };

      rowData.forEach((row, i) => {
        writeMetaRow(startY + i, row.c1Label, row.c1Val, row.c2Label, row.c2Val, row.c3Label, row.c3Val);
      });

      // Headers for Columns
      worksheet.getRow(13).height = 25;
      worksheet.getRow(14).height = 25;

      const headerCells = [
        { cell: 'B13', val: 'Derinlik (m)', merge: 'B13:B14' },
        { cell: 'C13', val: 'Örnek Derinliği (m)', merge: 'C13:C14' },
        { cell: 'D13', val: 'Örnek (Karot) No', merge: 'D13:D14' },
        { cell: 'E13', val: 'KAYA ÖZELLİKLERİ', merge: 'E13:J13' },
        { cell: 'K13', val: 'LİTOLOJİ', merge: 'K13:K14' },
        { cell: 'L13', val: 'AÇIKLAMALAR', merge: 'L13:L14' }
      ];

      headerCells.forEach(hc => {
        if (hc.merge) worksheet.mergeCells(hc.merge);
        const cell = worksheet.getCell(hc.cell);
        cell.value = hc.val;
        cell.font = { name: 'Segoe UI', size: 9, bold: true };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.fill = grayFill;
        cell.border = thinBorder;
      });

      const subHeaders = [
        { cell: 'E14', val: 'Dayanım' },
        { cell: 'F14', val: 'Ayrışma Derecesi' },
        { cell: 'G14', val: 'Kırık/30cm' },
        { cell: 'H14', val: 'TCR (%)' },
        { cell: 'I14', val: 'SCR (%)' },
        { cell: 'J14', val: 'RQD (%)' }
      ];

      subHeaders.forEach(sh => {
        const cell = worksheet.getCell(sh.cell);
        cell.value = sh.val;
        cell.font = { name: 'Segoe UI', size: 8, bold: true };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.fill = grayFill;
        cell.border = thinBorder;
      });

      // Body initialization
      const bodyStartRow = 15;

      // Precision Boundary Detection
      const cleanDepth = (val: number) => Math.round(val * 100) / 100;

      const formatDepth = (d: number) => {
        if (Number.isInteger(d)) return d.toString();
        return d.toFixed(2).replace(/\.?0+$/, ''); // remove trailing zeros
      };

      const depths = new Set<number>();
      depths.add(0);
      for (let m = 1; m <= Math.ceil(totalDepth); m++) {
        depths.add(m);
      }
      geotech.forEach(g => {
        depths.add(cleanDepth(g.from));
        depths.add(cleanDepth(g.to));
      });
      lithology.forEach(l => {
        depths.add(cleanDepth(l.from));
        depths.add(cleanDepth(l.to));
      });
      assays.forEach(a => {
        depths.add(cleanDepth(a.from));
        depths.add(cleanDepth(a.to));
      });

      // Filter and sort the boundaries
      const sortedDepths = Array.from(depths)
        .filter(d => d <= totalDepth)
        .sort((a, b) => a - b);

      if (sortedDepths.length === 0 || sortedDepths[0] > 0) {
        sortedDepths.unshift(0);
      }
      const lastDepth = cleanDepth(totalDepth);
      if (sortedDepths[sortedDepths.length - 1] < lastDepth) {
        sortedDepths.push(lastDepth);
      }

      const rowIntervals: { from: number; to: number }[] = [];
      for (let i = 0; i < sortedDepths.length - 1; i++) {
        const fromDepth = sortedDepths[i];
        const toDepth = sortedDepths[i+1];
        if (toDepth <= fromDepth) continue;
        rowIntervals.push({ from: fromDepth, to: toDepth });
      }

      const totalRowsCount = rowIntervals.length;

      // Populate body rows
      for (let idx = 0; idx < totalRowsCount; idx++) {
        const { from: fromDepth, to: toDepth } = rowIntervals[idx];
        const rowNum = bodyStartRow + idx;
        const row = worksheet.getRow(rowNum);
        row.height = 20;

        // Depth Column B
        const depthCell = worksheet.getCell(`B${rowNum}`);
        depthCell.value = `${formatDepth(fromDepth)} - ${formatDepth(toDepth)}`;
        depthCell.font = { name: 'Segoe UI', size: 8.5, bold: true };
        depthCell.alignment = { horizontal: 'center', vertical: 'middle' };
        depthCell.border = thinBorder;

        // Default style & thin border for columns C to L
        const cols = ['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
        cols.forEach(col => {
          const cell = worksheet.getCell(`${col}${rowNum}`);
          cell.border = thinBorder;
          cell.font = { name: 'Segoe UI', size: 8.5 };
          cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          cell.value = '-';
        });

        // 1. Geotech matching
        const g = geotech.find(run => run.from <= fromDepth + 0.001 && run.to >= toDepth - 0.001);
        if (g) {
          worksheet.getCell(`C${rowNum}`).value = `${formatDepth(g.from)} - ${formatDepth(g.to)}`;
          worksheet.getCell(`H${rowNum}`).value = g.tcrPercent;
          worksheet.getCell(`J${rowNum}`).value = g.rqdPercent;
        }

        // 2. Assay matching
        const a = assays.find(assay => assay.from <= fromDepth + 0.001 && assay.to >= toDepth - 0.001);
        if (a) {
          worksheet.getCell(`D${rowNum}`).value = a.sampleId;
          worksheet.getCell(`D${rowNum}`).font = { name: 'Segoe UI', size: 8.5, bold: true };
        }

        // 3. Lithology matching
        const l = lithology.find(lith => lith.from <= fromDepth + 0.001 && lith.to >= toDepth - 0.001);
        if (l) {
          const rockLabel = getRockLabel(l.rockCode);
          const hexColor = getRockColor(l.rockCode).replace('#', '');

          const litCell = worksheet.getCell(`K${rowNum}`);
          litCell.value = rockLabel;
          litCell.font = { name: 'Segoe UI', size: 8.5, bold: true };
          litCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: hexColor }
          };

          const descCell = worksheet.getCell(`L${rowNum}`);
          descCell.value = l.description || '';
          descCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
        }
      }

      // Safe merge tracker to prevent ExcelJS crashes
      const mergedRanges: Record<string, Set<number>> = {
        C: new Set(), D: new Set(), E: new Set(), F: new Set(), G: new Set(),
        H: new Set(), I: new Set(), J: new Set(), K: new Set(), L: new Set()
      };

      const safeMerge = (col: string, startRow: number, endRow: number) => {
        for (let r = startRow; r <= endRow; r++) {
          if (mergedRanges[col].has(r)) return; // skip if any cell in range already merged
        }
        for (let r = startRow; r <= endRow; r++) {
          mergedRanges[col].add(r);
        }
        worksheet.mergeCells(`${col}${startRow}:${col}${endRow}`);
      };

      // 1. Geotech merges
      geotech.forEach(g => {
        if (g.to <= g.from) return;
        const startRIdx = rowIntervals.findIndex(r => Math.abs(r.from - g.from) < 0.01);
        const endRIdx = rowIntervals.findIndex(r => Math.abs(r.to - g.to) < 0.01);
        if (startRIdx !== -1 && endRIdx !== -1 && endRIdx > startRIdx) {
          const startR = bodyStartRow + startRIdx;
          const endR = bodyStartRow + endRIdx;
          
          const geotechCols = ['C', 'E', 'F', 'G', 'H', 'I', 'J'];
          geotechCols.forEach(col => {
            safeMerge(col, startR, endR);
          });
        }
      });

      // 2. Assay merges
      assays.forEach(a => {
        if (a.to <= a.from) return;
        const startRIdx = rowIntervals.findIndex(r => Math.abs(r.from - a.from) < 0.01);
        const endRIdx = rowIntervals.findIndex(r => Math.abs(r.to - a.to) < 0.01);
        if (startRIdx !== -1 && endRIdx !== -1 && endRIdx > startRIdx) {
          const startR = bodyStartRow + startRIdx;
          const endR = bodyStartRow + endRIdx;
          
          safeMerge('D', startR, endR);
        }
      });

      // 3. Lithology merges
      lithology.forEach(l => {
        if (l.to <= l.from) return;
        const startRIdx = rowIntervals.findIndex(r => Math.abs(r.from - l.from) < 0.01);
        const endRIdx = rowIntervals.findIndex(r => Math.abs(r.to - l.to) < 0.01);
        if (startRIdx !== -1 && endRIdx !== -1 && endRIdx > startRIdx) {
          const startR = bodyStartRow + startRIdx;
          const endR = bodyStartRow + endRIdx;
          
          safeMerge('K', startR, endR);
          safeMerge('L', startR, endR);
        }
      });

      // Footer Legend
      const footerStartRow = bodyStartRow + totalRowsCount + 2;
      const fHeaderRow = worksheet.getRow(footerStartRow);
      fHeaderRow.height = 20;

      const fHeaders = [
        { start: 'B', end: 'C', val: 'Kısaltmalar' },
        { start: 'D', end: 'E', val: 'Kaya Kalitesi Tanımı-RQD(%)' },
        { start: 'F', end: 'G', val: 'Kırık-Eklem / 30 cm' },
        { start: 'H', end: 'I', val: 'Ayrışma derecesi' },
        { start: 'J', end: 'K', val: 'Dayanıklılık' }
      ];

      fHeaders.forEach(fh => {
        worksheet.mergeCells(`${fh.start}${footerStartRow}:${fh.end}${footerStartRow}`);
        const cell = worksheet.getCell(`${fh.start}${footerStartRow}`);
        cell.value = fh.val;
        cell.font = { name: 'Segoe UI', size: 9, bold: true };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.fill = grayFill;
        cell.border = thinBorder;
      });

      const authCell = worksheet.getCell(`L${footerStartRow}`);
      authCell.value = 'Logu Hazırlayan / Onay';
      authCell.font = { name: 'Segoe UI', size: 9, bold: true };
      authCell.alignment = { horizontal: 'center', vertical: 'middle' };
      authCell.fill = grayFill;
      authCell.border = thinBorder;

      const legendData = [
        [
          'UD: Örselenmemiş Örnek',
          '0-25% Çok Kötü',
          '< 1 Seyrek',
          'W1 Taze kayaç',
          'I Çok Zayıf'
        ],
        [
          'DS: Örselenmiş Örnek',
          '25-50% Kötü',
          '1-2 Orta',
          'W2 Az ayrışmış',
          'II Zayıf'
        ],
        [
          'TCR: Toplam Karot Yüzdesi',
          '50-75% Orta',
          '2-10 Sık',
          'W3-W4 Orta-Çok Ayrışmış',
          'III Orta'
        ],
        [
          'SCR: Silindirik Karot Yüzdesi',
          '75-90% İyi',
          '10-20 Çok Sık',
          'W5 Tümüyle Ayrışmış',
          'IV Dayanıklı'
        ],
        [
          'RQD: Toplam Kaya Kalitesi',
          '90-100% Çok İyi',
          '> 20 Parçalı',
          'W6 Rezidüel Zemin',
          'V/VI Çok/Aşırı Dayanıklı'
        ]
      ];

      legendData.forEach((rowData, i) => {
        const rowNum = footerStartRow + 1 + i;
        worksheet.getRow(rowNum).height = 15;
        
        worksheet.mergeCells(`B${rowNum}:C${rowNum}`);
        const cellB = worksheet.getCell(`B${rowNum}`);
        cellB.value = rowData[0];
        cellB.font = { name: 'Segoe UI', size: 7.5 };
        cellB.alignment = { horizontal: 'left', vertical: 'middle' };
        cellB.border = thinBorder;
        
        worksheet.mergeCells(`D${rowNum}:E${rowNum}`);
        const cellD = worksheet.getCell(`D${rowNum}`);
        cellD.value = rowData[1];
        cellD.font = { name: 'Segoe UI', size: 7.5 };
        cellD.alignment = { horizontal: 'left', vertical: 'middle' };
        cellD.border = thinBorder;

        worksheet.mergeCells(`F${rowNum}:G${rowNum}`);
        const cellF = worksheet.getCell(`F${rowNum}`);
        cellF.value = rowData[2];
        cellF.font = { name: 'Segoe UI', size: 7.5 };
        cellF.alignment = { horizontal: 'left', vertical: 'middle' };
        cellF.border = thinBorder;

        worksheet.mergeCells(`H${rowNum}:I${rowNum}`);
        const cellH = worksheet.getCell(`H${rowNum}`);
        cellH.value = rowData[3];
        cellH.font = { name: 'Segoe UI', size: 7.5 };
        cellH.alignment = { horizontal: 'left', vertical: 'middle' };
        cellH.border = thinBorder;

        worksheet.mergeCells(`J${rowNum}:K${rowNum}`);
        const cellJ = worksheet.getCell(`J${rowNum}`);
        cellJ.value = rowData[4];
        cellJ.font = { name: 'Segoe UI', size: 7.5 };
        cellJ.alignment = { horizontal: 'left', vertical: 'middle' };
        cellJ.border = thinBorder;
      });

      const sigCell = worksheet.getCell(`L${footerStartRow + 1}`);
      worksheet.mergeCells(`L${footerStartRow + 1}:L${footerStartRow + 5}`);
      sigCell.value = `Hazırlayan:\n${logger}\n\nKontrol Eden:\nLevent CAN`;
      sigCell.font = { name: 'Segoe UI', size: 8, bold: true };
      sigCell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
      sigCell.border = thinBorder;

      const classificationRow = footerStartRow + 7;
      worksheet.mergeCells(`B${classificationRow}:L${classificationRow}`);
      const classCell = worksheet.getCell(`B${classificationRow}`);
      classCell.value = 'Bu mesaj/doküman HİZMETE ÖZEL (CONFIDENTIAL) etiketi ile sınıflandırılmıştır.';
      classCell.font = { name: 'Segoe UI', size: 8, bold: true, italic: true };
      classCell.alignment = { horizontal: 'center', vertical: 'middle' };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${holeIdVal}_Sondaj_Log_Raporu.xlsx`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error(err);
      alert('Excel export failed!');
    }
  };

  const handleAnalyteToggle = (key: string) => {
    if (selectedAnalytes.includes(key)) {
      if (selectedAnalytes.length > 1) {
        setSelectedAnalytes(selectedAnalytes.filter(k => k !== key));
      }
    } else {
      setSelectedAnalytes([...selectedAnalytes, key]);
    }
  };

  // Column Configuration state: order, visibility, and width
  const [columns, setColumns] = useState<ColumnConfig[]>([
    { id: 'scale', label: 'Scale Ruler', width: 70, visible: true, color: 'black' },
    { id: 'lithology', label: 'Lithology', width: 130, visible: true, color: 'black' },
    { id: 'geotech', label: 'TCR / RQD', width: 140, visible: true, color: 'black' },
    { id: 'assays', label: 'Geochem', width: 180, visible: true, color: 'black' },
  ]);

  // Height scaling: 8 pixels per meter is scrollable and readable
  const scaleY = 8;
  const headerHeight = 35;
  const bodyPaddingTop = 6; // Small gap over the meter zero

  // Calculate dynamic X positions and SVG total width
  let currentX = 0;
  const colPositions: Record<string, { startX: number; width: number; visible: boolean }> = {};

  columns.forEach(col => {
    if (col.visible) {
      let width = col.width;
      if (col.id === 'assays') {
        width = Math.max(180, selectedAnalytes.length * 100);
      }
      colPositions[col.id] = { startX: currentX, width: width, visible: true };
      currentX += width;
    } else {
      colPositions[col.id] = { startX: 0, width: col.width, visible: false };
    }
  });

  const svgWidth = Math.max(100, currentX);

  const getRockColor = (code: string) => {
    switch (code.toUpperCase()) {
      case 'DOLGU':
      case 'OB':
      case 'TO':
      case 'TOPRAK':
        return '#fde047'; // Sand yellow / soil brown
      case 'ALBIT':
        return '#e2e8f0'; // Clean feldspar off-white
      case 'GNAYS':
      case 'GNYS':
        return '#94a3b8'; // Slate grey
      case 'ANDEZIT':
      case 'AND':
      case 'TUF':
      case 'VIA':
      case 'VIA.A':
      case 'VIA.P':
      case 'VIA.T':
      case 'VIA:T':
        return '#f87171'; // Andesite light red
      case 'KAOLEN':
      case 'KAO':
        return '#fef08a'; // Kaolin creamy yellow
      case 'KIL':
        return '#fed7aa'; // Clay pale brown
      case 'KUVARSIT':
      case 'QVN':
        return '#22d3ee'; // Quartzite cyan
      case 'SIST':
      case 'MTSH':
      case 'MTSL':
      case 'MTSS':
      case 'SEDIMENT':
        return '#a7f3d0'; // Schist / Meta-mudstone light green
      case 'GRANIT':
      case 'GNT':
      case 'GRA':
      case 'VFD':
      case 'DASIT':
      case 'RIYOLIT':
      case 'IGNIMBIRIT':
      case 'SIYENIT':
      case 'GRANODIYORIT':
      case 'SUBVOLKANIK':
      case 'INTRUZIF':
        return '#f472b6'; // Granite / Dacite / Felsic Igneous pink
      case 'PERLIT':
        return '#d8b4fe'; // Perlite light purple
      case 'KALSIT':
      case 'MRB':
        return '#fda4af'; // Calcite / Marble light rose
      case 'KOMUR':
        return '#1e293b'; // Coal dark slate
      case 'BRES':
      case 'BXS':
      case 'XBH':
      case 'FLT':
      case 'YANAL':
        return '#a1a1aa'; // Breccia / Fault grey
      case 'OFY':
      case 'SERP':
        return '#065f46'; // Ophiolite / Serpentinite dark green
      case 'VSM':
      case 'VOLKANOSEDIMANTER':
        return '#cbd5e1'; // Volcanosedimentary greyish
      case 'UNC':
        return '#64748b'; // Unconformity grey
      case 'DAYK':
        return '#f43f5e'; // Dyke red-rose
      case 'KUM':
        return '#fef9c3'; // Sand light yellow
      case 'OKSIT':
      case 'SULFIT':
        return '#d97706'; // Oxide/Sulfide orange-brown
      case 'ALUNIT':
        return '#f1f5f9'; // Alunite white-grey
      case 'BU':
      case 'KAROT':
      case 'NONE':
      default:
        return '#cbd5e1'; // Slate grey default
    }
  };



  const getRockPatternUrl = (code: string) => {
    const clean = code.toUpperCase();
    if (clean === 'GNAYS' || clean === 'GNYS') return 'url(#pat-gnays)';
    if (clean === 'ALBIT') return 'url(#pat-albit)';
    if (clean === 'KAOLEN' || clean === 'KAO') return 'url(#pat-kaolen)';
    if (['GRANIT', 'GNT', 'SUBVOLKANIK', 'SIYENIT', 'GRANODIYORIT', 'RIYOLIT', 'DASIT', 'INTRUZIF', 'GRA', 'VFD', 'IGNIMBIRIT'].includes(clean)) return 'url(#pat-granit)';
    if (clean === 'BRES' || clean === 'BXS' || clean === 'XBH' || clean === 'FLT' || clean === 'YANAL') return 'url(#pat-bres)';
    if (clean === 'KUVARSIT' || clean === 'QVN') return 'url(#pat-kuvarsit)';
    if (['ANDEZIT', 'AND', 'TUF', 'VIA', 'VIA.A', 'VIA.P', 'VIA.T', 'VIA:T'].includes(clean)) return 'url(#pat-andezit)';
    if (clean === 'BASALT' || clean === 'OFY' || clean === 'SERP') return 'url(#pat-basalt)';
    if (clean === 'DOLGU' || clean === 'OB' || clean === 'TOPRAK' || clean === 'TO') return 'url(#pat-dolgu)';
    if (['SIST', 'MTSH', 'MTSL', 'MTSS', 'VSM', 'VOLKANOSEDIMANTER', 'SEDIMENT'].includes(clean)) return 'url(#pat-sist)';
    if (clean === 'KIL') return 'url(#pat-kil)';
    if (clean === 'KALSIT' || clean === 'MRB') return 'url(#pat-kalsit)';
    if (clean === 'UNC') return 'url(#pat-unc)';
    if (clean === 'DAYK') return 'url(#pat-dayk)';
    if (clean === 'KUM') return 'url(#pat-kum)';
    return getRockColor(code);
  };

  const getRockLabel = (code: string) => {
    const clean = (code || '').toUpperCase();
    if (clean === 'OB' || clean === 'DOLGU' || clean === 'TOPRAK' || clean === 'TO') return 'Overburden';
    if (['GRANIT', 'GNT', 'GRA', 'GRANODIYORIT', 'SIYENIT', 'INTRUZIF', 'SUBVOLKANIK'].includes(clean)) return 'Granite/Intru';
    if (clean === 'BRES' || clean === 'BXS' || clean === 'XBH' || clean === 'FLT' || clean === 'YANAL') return 'Breccia/Fault';
    if (['ANDEZIT', 'AND', 'TUF', 'VIA', 'VIA.A', 'VIA.P', 'VIA.T', 'VIA:T'].includes(clean)) return 'Andesite';
    if (clean === 'BASALT' || clean === 'OFY' || clean === 'SERP') return 'Basalt/Oph';
    if (clean === 'KUVARSIT' || clean === 'QVN') return 'Quartzite';
    if (['SIST', 'MTSH', 'MTSL', 'MTSS', 'SEDIMENT'].includes(clean)) return 'Schist/Meta';
    if (clean === 'KIL') return 'Clay';
    if (clean === 'KALSIT' || clean === 'MRB') return 'Limestone/Marble';
    if (clean === 'GNAYS' || clean === 'GNYS') return 'Gneiss';
    if (clean === 'VFD' || clean === 'DASIT') return 'Dacite';
    if (clean === 'VSM' || clean === 'VOLKANOSEDIMANTER') return 'Volc-Sed';
    if (clean === 'UNC') return 'Unconformity';
    if (clean === 'DAYK') return 'Dyke';
    if (clean === 'KUM') return 'Sand';
    if (clean === 'OKSIT') return 'Oxide';
    if (clean === 'SULFIT') return 'Sulfide';
    return code;
  };

  // Reorder columns
  const moveColumn = (index: number, direction: 'left' | 'right') => {
    const newIndex = direction === 'left' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= columns.length) return;
    const updated = [...columns];
    const temp = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = temp;
    setColumns(updated);
  };

  // Toggle visibility of columns
  const toggleVisibility = (id: string) => {
    setColumns(columns.map(c => c.id === id ? { ...c, visible: !c.visible } : c));
  };

  // Removed global activeAnalyteDetails, maxVal, assayPoints - they are computed locally below.

  const scaleTicks = [];
  for (let i = 0; i <= totalDepth; i += 10) {
    scaleTicks.push(i);
  }

  const handleBlockClick = (tab: string, itemId: string) => {
    if (onItemClick) {
      onItemClick(tab, itemId);
    }
  };

  return (
    <div className="strip-log-container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header Area */}
      <div className="strip-log-header" style={{ borderBottom: '1px solid var(--border-light)', padding: '12px 16px', background: 'var(--bg-card)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: 'var(--text-main)', fontFamily: 'var(--font-display)' }}>Column Log View</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setShowConfig(!showConfig)}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', fontSize: '11px' }}
            >
              <SlidersHorizontal size={12} />
              Configure
            </button>
            
            <button
              className="btn btn-primary btn-sm"
              onClick={handleExportExcel}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', fontSize: '11px' }}
            >
              <Download size={12} />
              Export to Excel
            </button>
          </div>
        </div>

        {/* Dynamic Column Configuration & Settings Panel */}
        {showConfig && (
          <div style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border-medium)',
            borderRadius: 'var(--radius-md)',
            padding: '10px',
            marginBottom: '10px',
            fontSize: '11px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            {/* Analyte Selection and Style */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Observe Geochem Analytes (Multiple Selectable)</span>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {analytesList.map(a => {
                    const isChecked = selectedAnalytes.includes(a.key);
                    return (
                      <label key={a.key} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 8px',
                        background: isChecked ? 'var(--primary-light)' : 'var(--bg-card)',
                        border: `1px solid ${isChecked ? 'var(--primary)' : 'var(--border-light)'}`,
                        borderRadius: '12px',
                        cursor: 'pointer',
                        fontSize: '10px',
                        color: isChecked ? 'var(--primary)' : 'var(--text-secondary)',
                        fontWeight: isChecked ? 'bold' : 'normal',
                        userSelect: 'none'
                      }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleAnalyteToggle(a.key)}
                          style={{ display: 'none' }}
                        />
                        {a.label.split(' ')[0]}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Assay Representation</span>
                <select
                  value={visualStyle}
                  onChange={e => setVisualStyle(e.target.value as 'bars' | 'line')}
                  style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-medium)', fontSize: '11px', width: '100%' }}
                >
                  <option value="bars">Histogram / Horizontal Bars (Side-by-Side)</option>
                  <option value="line">Downhole Trend Lines (Overlapping)</option>
                </select>
              </div>
            </div>

            {/* Column Order and Visibility Toggles */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Arrange Column Sequence & Visibility</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {columns.map((col, idx) => (
                  <div key={col.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '4px 8px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-light)',
                    borderRadius: '4px'
                  }}>
                    <span style={{ fontWeight: 500 }}>{col.label}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {/* Move left */}
                      <button
                        disabled={idx === 0}
                        onClick={() => moveColumn(idx, 'left')}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        <ChevronLeft size={14} style={{ color: idx === 0 ? 'var(--border-medium)' : 'var(--text-secondary)' }} />
                      </button>
                      {/* Move right */}
                      <button
                        disabled={idx === columns.length - 1}
                        onClick={() => moveColumn(idx, 'right')}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        <ChevronRight size={14} style={{ color: idx === columns.length - 1 ? 'var(--border-medium)' : 'var(--text-secondary)' }} />
                      </button>

                      {/* Visibility check */}
                      <button
                        onClick={() => toggleVisibility(col.id)}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
                      >
                        {col.visible ? (
                          <Eye size={14} style={{ color: 'var(--primary)' }} />
                        ) : (
                          <EyeOff size={14} style={{ color: '#94a3b8' }} />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Hover/Tooltip description bar */}
        {hoverInfo ? (
          <div className="tooltip-panel" style={{ fontSize: '11px', animation: 'fadeIn 0.2s' }}>{hoverInfo}</div>
        ) : (
          <div className="tooltip-panel hint" style={{ fontSize: '11px' }}>
            Click log intervals to jump to grid; Hover to inspect parameters.
          </div>
        )}
      </div>

      {/* SVG Column Log Visual Container */}
      <div
        className="strip-log-scroll"
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '0 24px 20px 24px',
          display: 'block',
          position: 'relative'
        }}
      >
        {/* 1. STICKY HEADER SVG CONTAINER */}
        <div style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'var(--bg-app)', width: svgWidth, flexShrink: 0, paddingTop: '16px', margin: '0 auto' }}>
          <svg
            ref={headerSvgRef}
            width={svgWidth}
            height={headerHeight}
            style={{
              background: 'var(--bg-card)',
              display: 'block',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-sm)'
            }}
          >
            {/* Background Rect */}
            <rect width={svgWidth} height={headerHeight} fill="var(--bg-card)" />

            {/* Divider lines and text labels */}
            {columns.map((col) => {
              if (!col.visible) return null;
              const pos = colPositions[col.id];
              const dividerX = pos.startX + pos.width;
              return (
                <g key={`hdr-col-${col.id}`}>
                  {/* Vertical column divider line */}
                  <line
                    x1={dividerX}
                    y1={0}
                    x2={dividerX}
                    y2={headerHeight}
                    stroke="var(--border-light)"
                    strokeWidth="1"
                  />

                  {/* Centered header label */}
                  {col.id === 'assays' ? (
                    selectedAnalytes.map((key, i) => {
                      const analyteDetails = analytesList.find(an => an.key === key);
                      if (!analyteDetails) return null;
                      const subColWidth = pos.width / selectedAnalytes.length;
                      const textX = pos.startX + (i * subColWidth) + (subColWidth / 2);
                      return (
                        <g key={`hdr-an-${key}`}>
                          {/* Sub-column divider line */}
                          {i > 0 && (
                            <line
                              x1={pos.startX + i * subColWidth}
                              y1={0}
                              x2={pos.startX + i * subColWidth}
                              y2={headerHeight}
                              stroke="var(--border-medium)"
                              strokeWidth="1"
                              strokeDasharray="2,2"
                            />
                          )}
                          <text
                            x={textX}
                            y={21}
                            textAnchor="middle"
                            fill={analyteDetails.color}
                            fontSize="9"
                            fontWeight="800"
                            fontFamily="var(--font-display)"
                          >
                            {analyteDetails.label.split(' ')[0]}
                          </text>
                        </g>
                      );
                    })
                  ) : (
                    <text
                      x={pos.startX + pos.width / 2}
                      y={21}
                      textAnchor="middle"
                      fill="var(--text-main)"
                      fontSize="10"
                      fontWeight="800"
                      fontFamily="var(--font-display)"
                    >
                      {col.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* 2. SCROLLABLE BODY SVG CONTAINER */}
        <div style={{ width: svgWidth, flexShrink: 0, margin: '0 auto', marginTop: '4px' }}>
          <svg
            ref={bodySvgRef}
            width={svgWidth}
            height={Math.max(200, totalDepth * scaleY) + bodyPaddingTop}
            style={{
              background: 'var(--bg-card)',
              display: 'block',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-sm)',
              boxShadow: 'var(--shadow-md)'
            }}
          >
            {/* Defs for grid and rock patterns */}
            <defs>
              <pattern id="grid-pattern" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="var(--border-light)" strokeWidth="0.5" />
              </pattern>
              {/* Feldspar / ALBIT (soft gray diagonal patterns) */}
              <pattern id="pat-albit" width="20" height="20" patternUnits="userSpaceOnUse">
                <rect width="20" height="20" fill="#2d3748" />
                <path d="M 5,2 L 2,5 M 15,12 L 12,15" stroke="#4a5568" strokeWidth="1.5" />
              </pattern>
              {/* Kaolin / KAOLEN (soft yellow texture) */}
              <pattern id="pat-kaolen" width="20" height="20" patternUnits="userSpaceOnUse">
                <rect width="20" height="20" fill="#3f3f46" />
                <circle cx="5" cy="5" r="1.5" fill="#facc15" fillOpacity="0.4" />
                <circle cx="15" cy="15" r="1.5" fill="#facc15" fillOpacity="0.4" />
              </pattern>
              {/* Gneiss / GNAYS (wavy lines on grey) */}
              <pattern id="pat-gnays" width="20" height="20" patternUnits="userSpaceOnUse">
                <rect width="20" height="20" fill="#475569" />
                <path d="M0,5 Q5,10 10,5 T20,5 M0,15 Q5,20 10,15 T20,15" fill="none" stroke="#64748b" strokeWidth="1.5" />
              </pattern>
              {/* Unconformity / UNC (dashed lines on grey) */}
              <pattern id="pat-unc" width="20" height="20" patternUnits="userSpaceOnUse">
                <rect width="20" height="20" fill="#64748b" />
                <path d="M 0,10 L 20,10" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4,4" />
              </pattern>
              {/* Granite / GRANIT (dots/crosses on pink) */}
              <pattern id="pat-granit" width="20" height="20" patternUnits="userSpaceOnUse">
                <rect width="20" height="20" fill="#ec4899" fillOpacity="0.8" />
                <circle cx="5" cy="5" r="1.5" fill="#9d174d" />
                <circle cx="15" cy="15" r="1.5" fill="#9d174d" />
                <line x1="12" y1="4" x2="16" y2="8" stroke="#9d174d" strokeWidth="1" />
                <line x1="16" y1="4" x2="12" y2="8" stroke="#9d174d" strokeWidth="1" />
                <line x1="2" y1="12" x2="6" y2="16" stroke="#9d174d" strokeWidth="1" />
                <line x1="6" y1="12" x2="2" y2="16" stroke="#9d174d" strokeWidth="1" />
              </pattern>
              {/* Breccia / BRES (rock pieces on grey) */}
              <pattern id="pat-bres" width="25" height="25" patternUnits="userSpaceOnUse">
                <rect width="25" height="25" fill="#52525b" />
                <polygon points="5,2 12,5 8,12 2,7" fill="#27272a" stroke="#a1a1aa" strokeWidth="0.5" />
                <polygon points="18,10 23,15 15,20 14,12" fill="#27272a" stroke="#a1a1aa" strokeWidth="0.5" />
                <polygon points="3,18 9,23 6,24" fill="#18181b" stroke="#71717a" strokeWidth="0.5" />
              </pattern>
              {/* Quartzite / KUVARSIT (cyan with fine dots) */}
              <pattern id="pat-kuvarsit" width="10" height="10" patternUnits="userSpaceOnUse">
                <rect width="10" height="10" fill="#0891b2" />
                <circle cx="3" cy="3" r="1.2" fill="#22d3ee" />
                <circle cx="8" cy="8" r="1.2" fill="#22d3ee" />
              </pattern>
              {/* Andesite / ANDEZIT, AND, TUF (red-brown with V-shapes) */}
              <pattern id="pat-andezit" width="20" height="20" patternUnits="userSpaceOnUse">
                <rect width="20" height="20" fill="#991b1b" />
                <path d="M 4,6 L 7,3 L 10,6" fill="none" stroke="#f87171" strokeWidth="1.5" />
                <path d="M 12,16 L 15,13 L 18,16" fill="none" stroke="#f87171" strokeWidth="1.5" />
              </pattern>
              {/* Basalt / BASALT (dark green with chevrons) */}
              <pattern id="pat-basalt" width="20" height="20" patternUnits="userSpaceOnUse">
                <rect width="20" height="20" fill="#065f46" />
                <path d="M 5,5 L 8,8 L 11,5" fill="none" stroke="#10b981" strokeWidth="1.5" />
                <path d="M 15,15 L 18,18 L 21,15" fill="none" stroke="#10b981" strokeWidth="1.5" />
              </pattern>
              {/* Overburden / DOLGU or OB (brown blocks/sand) */}
              <pattern id="pat-dolgu" width="20" height="20" patternUnits="userSpaceOnUse">
                <rect width="20" height="20" fill="#78350f" />
                <circle cx="4" cy="4" r="1.2" fill="#b45309" />
                <circle cx="14" cy="14" r="1.2" fill="#b45309" />
                <line x1="2" y1="18" x2="8" y2="18" stroke="#d97706" strokeWidth="1" />
                <line x1="12" y1="8" x2="18" y2="8" stroke="#d97706" strokeWidth="1" />
              </pattern>
              {/* Schist / SIST (wavy lines on light green) */}
              <pattern id="pat-sist" width="30" height="10" patternUnits="userSpaceOnUse">
                <rect width="30" height="10" fill="#047857" />
                <path d="M0,5 Q7.5,0 15,5 T30,5" fill="none" stroke="#34d399" strokeWidth="1" />
              </pattern>
              {/* Clay / KIL (orange with horizontal stripes) */}
              <pattern id="pat-kil" width="10" height="10" patternUnits="userSpaceOnUse">
                <rect width="10" height="10" fill="#c2410c" />
                <line x1="0" y1="5" x2="10" y2="5" stroke="#ffedd5" strokeWidth="1" />
              </pattern>
              {/* Calcite/Limestone / KALSIT (light rose bricks) */}
              <pattern id="pat-kalsit" width="20" height="20" patternUnits="userSpaceOnUse">
                <rect width="20" height="20" fill="#9f1239" />
                <line x1="0" y1="10" x2="20" y2="10" stroke="#f43f5e" strokeWidth="0.75" />
                <line x1="0" y1="20" x2="20" y2="20" stroke="#f43f5e" strokeWidth="0.75" />
                <line x1="10" y1="0" x2="10" y2="10" stroke="#f43f5e" strokeWidth="0.75" />
                <line x1="20" y1="10" x2="20" y2="20" stroke="#f43f5e" strokeWidth="0.75" />
                <line x1="0" y1="10" x2="0" y2="20" stroke="#f43f5e" strokeWidth="0.75" />
              </pattern>
              {/* Dyke / DAYK (diagonal red blocks) */}
              <pattern id="pat-dayk" width="20" height="20" patternUnits="userSpaceOnUse">
                <rect width="20" height="20" fill="#f43f5e" />
                <line x1="0" y1="0" x2="20" y2="20" stroke="#be123c" strokeWidth="2" />
                <line x1="20" y1="0" x2="0" y2="20" stroke="#be123c" strokeWidth="2" />
              </pattern>
              {/* Sand / KUM (yellow with fine dots) */}
              <pattern id="pat-kum" width="10" height="10" patternUnits="userSpaceOnUse">
                <rect width="10" height="10" fill="#fef9c3" />
                <circle cx="2" cy="2" r="0.8" fill="#ca8a04" />
                <circle cx="7" cy="7" r="0.8" fill="#ca8a04" />
              </pattern>
            </defs>

            {/* Background grid */}
            <rect width={svgWidth} height={Math.max(200, totalDepth * scaleY) + bodyPaddingTop} fill="url(#grid-pattern)" />

            {/* Scale Horizontal Helper Lines */}
            <g>
              {scaleTicks.map(tick => (
                <g key={tick}>
                  <line
                    x1={0}
                    y1={tick * scaleY + bodyPaddingTop}
                    x2={svgWidth}
                    y2={tick * scaleY + bodyPaddingTop}
                    stroke="var(--border-light)"
                    strokeWidth="1"
                  />
                </g>
              ))}
            </g>

            {/* Left vertical border line */}
            <line x1={0} y1={0} x2={0} y2={Math.max(200, totalDepth * scaleY) + bodyPaddingTop} stroke="var(--border-light)" strokeWidth="1" />

            {/* 1. SCALE TICK LABELS */}
            {colPositions['scale']?.visible && (
              <g>
                {scaleTicks.map(tick => {
                  const pos = colPositions['scale'];
                  return (
                    <text
                      key={`tick-${tick}`}
                      x={pos.startX + pos.width / 2}
                      y={tick * scaleY + bodyPaddingTop + 3}
                      fill="#64748b"
                      fontSize="9"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {tick}m
                    </text>
                  );
                })}
              </g>
            )}

            {/* 2. LITHOLOGY BLOCKS */}
            {colPositions['lithology']?.visible && (
              <g>
                {lithology
                  .filter(l => l.to > l.from)
                  .map(l => {
                    const pos = colPositions['lithology'];
                    const y = l.from * scaleY + bodyPaddingTop;
                    const h = (l.to - l.from) * scaleY;
                    const patternUrl = getRockPatternUrl(l.rockCode);
                    const labelText = getRockLabel(l.rockCode);
                    const textWidth = Math.max(30, labelText.length * 6);
                    return (
                      <g key={l.id}>
                        <rect
                          x={pos.startX + 2}
                          y={y}
                          width={pos.width - 4}
                          height={h}
                          fill={patternUrl}
                          stroke="var(--border-light)"
                          strokeWidth="0.5"
                          style={{ cursor: 'pointer', opacity: 0.9 }}
                          onClick={() => handleBlockClick('Lithology', l.id)}
                          onMouseEnter={() =>
                            setHoverInfo(
                              `Geology: [${l.rockCode}] ${l.from}m-${l.to}m${l.photo ? ' [📷 Photo Attached]' : ''}: ${l.description || 'No description'}`
                            )
                          }
                          onMouseLeave={() => setHoverInfo(null)}
                        />
                        {l.photo && h > 12 && (
                          <g style={{ pointerEvents: 'none' }}>
                            <circle
                              cx={pos.startX + pos.width - 15}
                              cy={y + 12}
                              r="8"
                              fill="rgba(15, 23, 42, 0.85)"
                              stroke="rgba(255, 255, 255, 0.4)"
                              strokeWidth="0.5"
                            />
                            <text
                              x={pos.startX + pos.width - 15}
                              y={y + 15}
                              textAnchor="middle"
                              fill="#ffffff"
                              fontSize="8"
                            >
                              📷
                            </text>
                          </g>
                        )}
                        {h > 15 && (
                          <g style={{ pointerEvents: 'none' }}>
                            <rect
                              x={pos.startX + pos.width / 2 - textWidth / 2 - 4}
                              y={y + h / 2 - 7}
                              width={textWidth + 8}
                              height={14}
                              rx={4}
                              fill="var(--bg-card)"
                              fillOpacity={0.8}
                            />
                            <text
                              x={pos.startX + pos.width / 2}
                              y={y + h / 2 + 3}
                              textAnchor="middle"
                              fill="var(--text-main)"
                              fontSize="9"
                              fontWeight="bold"
                              fontFamily="var(--font-display)"
                            >
                              {labelText}
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}
              </g>
            )}

            {/* 3. GEOTECH TCR & RQD Line Plot */}
            {colPositions['geotech']?.visible && (() => {
              const pos = colPositions['geotech'];
              const ticks = [0, 25, 50, 75, 100];
              const sortedGeotech = [...geotech]
                .filter(g => g.to > g.from)
                .sort((a, b) => a.from - b.from);

              const points = sortedGeotech.map(g => {
                const mid = (g.from + g.to) / 2;
                const y = mid * scaleY + bodyPaddingTop;
                const x = pos.startX + 5 + (g.rqdPercent / 100) * (pos.width - 10);
                return { x, y, rqd: g.rqdPercent, tcr: g.tcrPercent, from: g.from, to: g.to, id: g.id };
              });

              return (
                <g>
                  {/* Background grid lines for 0, 25, 50, 75, 100% */}
                  {ticks.map(tick => {
                    const tickX = pos.startX + 5 + (tick / 100) * (pos.width - 10);
                    return (
                      <line
                        key={`rqd-tick-line-${tick}`}
                        x1={tickX}
                        y1={0}
                        x2={tickX}
                        y2={Math.max(200, totalDepth * scaleY) + bodyPaddingTop}
                        stroke="var(--border-light)"
                        strokeWidth="0.5"
                        strokeDasharray="2,2"
                      />
                    );
                  })}

                  {/* Subtle background TCR bars */}
                  {sortedGeotech.map(g => {
                    const y = g.from * scaleY + bodyPaddingTop;
                    const h = (g.to - g.from) * scaleY;
                    const tcrBarWidth = Math.max(1, (pos.width - 10) * (g.tcrPercent / 100));
                    return (
                      <rect
                        key={`tcr-bg-${g.id}`}
                        x={pos.startX + 5}
                        y={y}
                        width={tcrBarWidth}
                        height={h}
                        fill="#3b82f6"
                        fillOpacity="0.08"
                        stroke="none"
                        style={{ pointerEvents: 'none' }}
                      />
                    );
                  })}

                  {/* Continuous RQD Trend Line */}
                  {points.length > 1 && (
                    <path
                      d={points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')}
                      fill="none"
                      stroke="#ff9800" // Vibrant orange
                      strokeWidth="2"
                    />
                  )}

                  {/* RQD circular markers */}
                  {points.map(p => (
                    <circle
                      key={`rqd-circle-${p.id}`}
                      cx={p.x}
                      cy={p.y}
                      r="4"
                      fill="#ff9800"
                      stroke="#ffffff"
                      strokeWidth="1"
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleBlockClick('TCR / RQD', p.id)}
                      onMouseEnter={() =>
                        setHoverInfo(
                          `Geotech: ${p.from}m-${p.to}m | TCR: ${p.tcr}% | RQD: ${p.rqd}%`
                        )
                      }
                      onMouseLeave={() => setHoverInfo(null)}
                    />
                  ))}
                </g>
              );
            })()}

            {/* 4. GEOCHEMICAL ASSAYS COLUMN */}
            {colPositions['assays']?.visible && (
              <g>
                {visualStyle === 'bars' ? (
                  // HISTOGRAM BARS REPRESENTATION (Grouped / Side-by-Side sub-columns)
                  selectedAnalytes.map((key, i) => {
                    const analyteDetails = analytesList.find(an => an.key === key);
                    if (!analyteDetails) return null;
                    const pos = colPositions['assays'];
                    const subColWidth = pos.width / selectedAnalytes.length;
                    const subColX = pos.startX + i * subColWidth;
                    const maxValForAnalyte = Math.max(0.1, ...assays.map(item => Number(item[key as keyof AssayState]) || 0));

                    return (
                      <g key={`bar-group-${key}`}>
                        {assays
                          .filter(a => a.sampleType === 'Core' && a.to > a.from)
                          .map(a => {
                            const y = a.from * scaleY + bodyPaddingTop;
                            const h = (a.to - a.from) * scaleY;

                            const val = Number(a[key as keyof AssayState]) || 0;
                            const valRatio = Math.min(1, val / maxValForAnalyte);
                            const barWidth = Math.max(2, valRatio * (subColWidth - 6));

                            return (
                              <rect
                                key={`${key}-${a.id}`}
                                x={subColX + 3}
                                y={y}
                                width={barWidth}
                                height={h}
                                fill={analyteDetails.color}
                                fillOpacity={0.3}
                                stroke={analyteDetails.color}
                                strokeWidth="1.5"
                                strokeOpacity={0.9}
                                style={{ cursor: 'pointer', transition: 'fill-opacity 0.2s' }}
                                onClick={() => handleBlockClick('Assay', a.id)}
                                onMouseEnter={() => {
                                  setHoverInfo(`Assay Sample [${a.sampleId}] ${a.from}m-${a.to}m | ${analyteDetails.label}: ${val.toFixed(2)}`);
                                }}
                                onMouseLeave={() => setHoverInfo(null)}
                              />
                            );
                          })}
                      </g>
                    );
                  })
                ) : (
                  // TREND LINE REPRESENTATION (Overlapping lines)
                  selectedAnalytes.map((key) => {
                    const analyteDetails = analytesList.find(an => an.key === key);
                    if (!analyteDetails) return null;
                    const pos = colPositions['assays'];
                    const maxValForAnalyte = Math.max(0.1, ...assays.map(item => Number(item[key as keyof AssayState]) || 0));

                    const points = assays
                      .filter(a => a.sampleType === 'Core' && a.to > a.from)
                      .sort((a, b) => a.from - b.from)
                      .map(a => {
                        const midDepth = (a.from + a.to) / 2;
                        const y = midDepth * scaleY + bodyPaddingTop;
                        const val = Number(a[key as keyof AssayState]) || 0;
                        const valRatio = Math.min(1, val / maxValForAnalyte);
                        const x = pos.startX + 5 + valRatio * (pos.width - 10);
                        return { x, y, value: val, depth: `${a.from}m-${a.to}m`, id: a.id, sampleId: a.sampleId };
                      });

                    return (
                      <g key={`trend-group-${key}`}>
                        {points.length > 1 && (
                          <path
                            d={points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')}
                            fill="none"
                            stroke={analyteDetails.color}
                            strokeWidth="1.5"
                          />
                        )}
                        {points.map(p => (
                          <circle
                            key={`pt-${key}-${p.id}`}
                            cx={p.x}
                            cy={p.y}
                            r="3.5"
                            fill={analyteDetails.color}
                            stroke="#ffffff"
                            strokeWidth="1"
                            style={{ cursor: 'pointer' }}
                            onClick={() => handleBlockClick('Assay', p.id)}
                            onMouseEnter={() =>
                              setHoverInfo(`Assay Sample [${p.sampleId}] at ${p.depth} | ${analyteDetails.label}: ${p.value.toFixed(2)}`)
                            }
                            onMouseLeave={() => setHoverInfo(null)}
                          />
                        ))}
                      </g>
                    );
                  })
                )}
              </g>
            )}

            {/* Vertical column divider lines */}
            {columns.map((col) => {
              if (!col.visible) return null;
              const pos = colPositions[col.id];
              const dividerX = pos.startX + pos.width;
              return (
                <g key={`body-div-${col.id}`}>
                  <line
                    x1={dividerX}
                    y1={0}
                    x2={dividerX}
                    y2={Math.max(200, totalDepth * scaleY) + bodyPaddingTop}
                    stroke="var(--border-light)"
                    strokeWidth="1"
                  />
                  {col.id === 'assays' && selectedAnalytes.length > 1 && (
                    selectedAnalytes.map((key, i) => {
                      if (i === 0) return null;
                      const subColWidth = pos.width / selectedAnalytes.length;
                      return (
                        <line
                          key={`body-subdiv-${key}`}
                          x1={pos.startX + i * subColWidth}
                          y1={0}
                          x2={pos.startX + i * subColWidth}
                          y2={Math.max(200, totalDepth * scaleY) + bodyPaddingTop}
                          stroke="var(--border-medium)"
                          strokeWidth="1"
                          strokeDasharray="2,2"
                        />
                      );
                    })
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>


      {/* Interactive Legend panel */}
      <div className="strip-log-legend" style={{ borderTop: '1px solid var(--border-light)', padding: '12px 16px', background: 'var(--bg-card)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 14px', alignItems: 'center' }}>
          <div style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', width: '100%', marginBottom: '2px' }}>Legend Keys</div>

          {colPositions['lithology']?.visible && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', maxWidth: '400px' }}>
              <div className="legend-item"><span className="legend-color" style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#94a3b8', display: 'inline-block' }}></span><span>GNAYS</span></div>
              <div className="legend-item"><span className="legend-color" style={{ width: '10px', height: '10px', borderRadius: '2px', border: '1px solid var(--border-medium)', background: '#e2e8f0', display: 'inline-block' }}></span><span>ALBIT</span></div>
              <div className="legend-item"><span className="legend-color" style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#f87171', display: 'inline-block' }}></span><span>ANDEZIT</span></div>
              <div className="legend-item"><span className="legend-color" style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#fed7aa', display: 'inline-block' }}></span><span>KIL</span></div>
              <div className="legend-item"><span className="legend-color" style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#fde047', display: 'inline-block' }}></span><span>DOLGU</span></div>
              <div className="legend-item"><span className="legend-color" style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#fef08a', display: 'inline-block' }}></span><span>KAOLEN</span></div>
              <div className="legend-item"><span className="legend-color" style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#a7f3d0', display: 'inline-block' }}></span><span>SIST</span></div>
              <div className="legend-item"><span className="legend-color" style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#22d3ee', display: 'inline-block' }}></span><span>KUVARSIT</span></div>
            </div>
          )}

          {(colPositions['geotech']?.visible || colPositions['assays']?.visible) && (
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', borderLeft: '1px solid var(--border-light)', paddingLeft: '10px' }}>
              {colPositions['geotech']?.visible && (
                <>
                  <div className="legend-item"><span className="legend-color" style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#3b82f6', display: 'inline-block' }}></span><span>TCR %</span></div>
                  <div className="legend-item"><span className="legend-color" style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#10b981', display: 'inline-block' }}></span><span>RQD %</span></div>
                </>
              )}
              {colPositions['assays']?.visible && (
                selectedAnalytes.map(key => {
                  const analyteDetails = analytesList.find(an => an.key === key);
                  if (!analyteDetails) return null;
                  return (
                    <div key={`legend-an-${key}`} className="legend-item">
                      <span className="legend-color" style={{ width: '10px', height: '10px', borderRadius: '2px', background: analyteDetails.color, display: 'inline-block' }}></span>
                      <span>{analyteDetails.label}</span>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
