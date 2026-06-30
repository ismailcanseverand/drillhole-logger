import React, { useState, useRef, useEffect } from 'react';
import type { LithologyState, GeotechState, AssayState, AlterationState } from '../hooks/useDrillholeData';
import { ChevronLeft, ChevronRight, Eye, EyeOff, SlidersHorizontal, Download, X } from 'lucide-react';

interface ColumnLogProps {
  totalDepth: number;
  lithology: LithologyState[];
  geotech: GeotechState[];
  assays: AssayState[];
  alterations?: AlterationState[];
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
  { key: 'loi', label: 'LOI / AZ (%)', color: '#a855f7' },  // Purple
  { key: 'cao', label: 'CaO (%)', color: '#0ea5e9' },       // Sky Blue
  { key: 'mgo', label: 'MgO (%)', color: '#f97316' },       // Orange
  { key: 'so4', label: 'SO4 (%)', color: '#84cc16' },       // Lime
  { key: 'mno', label: 'MnO (%)', color: '#64748b' },       // Slate
  { key: 'cr2o3', label: 'Cr2O3 (%)', color: '#10b981' },   // Emerald Green
  { key: 'p2o5', label: 'P2O5 (%)', color: '#8b5cf6' }      // Violet
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

const getColLetter = (colIndex: number): string => {
  let temp = colIndex;
  let letter = '';
  while (temp > 0) {
    let modulo = (temp - 1) % 26;
    letter = String.fromCharCode(65 + modulo) + letter;
    temp = Math.floor((temp - modulo) / 26);
  }
  return letter;
};

export const ColumnLog: React.FC<ColumnLogProps> = ({
  totalDepth,
  lithology,
  geotech,
  assays,
  alterations = [],
  onItemClick,
  holeId,
  collar,
}) => {
  const isMetallic = holeId ? METALLIC_HOLES.includes(holeId.trim().toUpperCase()) : false;

  const ALL_FEATURES = isMetallic ? [
    { key: 'tcrPercent', label: 'TCR (%)', color: '#3b82f6', isGeotech: true },
    { key: 'rqdPercent', label: 'RQD (%)', color: '#ff9800', isGeotech: true },
    { key: 'au_ppm', label: 'Au (ppm)', color: '#ffd700' },
    { key: 'au_ppb', label: 'Au (ppb)', color: '#f59e0b' },
    { key: 'ag_ppm', label: 'Ag (ppm)', color: '#94a3b8' },
    { key: 'cu_ppm', label: 'Cu (ppm)', color: '#ec4899' },
    { key: 'pb_ppm', label: 'Pb (ppm)', color: '#a855f7' },
    { key: 'zn_ppm', label: 'Zn (ppm)', color: '#3b82f6' },
    { key: 'as_ppm', label: 'As (ppm)', color: '#ef4444' }
  ] : [
    { key: 'tcrPercent', label: 'TCR (%)', color: '#3b82f6', isGeotech: true },
    { key: 'rqdPercent', label: 'RQD (%)', color: '#ff9800', isGeotech: true },
    { key: 'al2o3', label: 'Al2O3 (%)', color: '#3b82f6' },
    { key: 'fe2o3', label: 'Fe2O3 (%)', color: '#f43f5e' },
    { key: 'sio2', label: 'SiO2 (%)', color: '#10b981' },
    { key: 'tio2', label: 'TiO2 (%)', color: '#eab308' },
    { key: 'na2o_k2o', label: 'Na2O+K2O (%)', color: '#ec4899' },
    { key: 'loi', label: 'LOI / AZ (%)', color: '#a855f7' },
    { key: 'cao', label: 'CaO (%)', color: '#0ea5e9' },
    { key: 'mgo', label: 'MgO (%)', color: '#f97316' },
    { key: 'so4', label: 'SO4 (%)', color: '#84cc16' },
    { key: 'mno', label: 'MnO (%)', color: '#64748b' },
    { key: 'cr2o3', label: 'Cr2O3 (%)', color: '#10b981' },
    { key: 'p2o5', label: 'P2O5 (%)', color: '#8b5cf6' }
  ];

  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(
    isMetallic 
      ? ['tcrPercent', 'rqdPercent', 'au_ppm'] 
      : ['tcrPercent', 'rqdPercent', 'al2o3']
  );

  useEffect(() => {
    setSelectedFeatures(
      isMetallic 
        ? ['tcrPercent', 'rqdPercent', 'au_ppm'] 
        : ['tcrPercent', 'rqdPercent', 'al2o3']
    );
  }, [isMetallic]);

  const analytesList = isMetallic ? METALLIC_ANALYTES : INDUSTRIAL_ANALYTES;

  const selectedAnalytes = selectedFeatures.filter(key => {
    const feat = ALL_FEATURES.find(f => f.key === key);
    return feat && !feat.isGeotech;
  });

  const getAnalyteVal = (assay: AssayState, key: string): number => {
    if (key === 'fe_ti') {
      const fe = Number(assay.fe2o3) || 0;
      const ti = Number(assay.tio2) || 0;
      return fe + ti;
    }
    if (key === 'na2o_k2o') {
      return Number(assay.na2o_k2o) || 0;
    }
    return Number(assay[key as keyof AssayState]) || 0;
  };

  const headerSvgRef = useRef<SVGSVGElement>(null);
  const bodySvgRef = useRef<SVGSVGElement>(null);

  const [hoverInfo, setHoverInfo] = useState<string | null>(null);
  const [visualStyle, setVisualStyle] = useState<'bars' | 'line'>('bars');
  const [showConfig, setShowConfig] = useState<boolean>(false);

  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [metaCompany, setMetaCompany] = useState<string>('MCB SONDAJ');
  const [metaProject, setMetaProject] = useState<string>(collar?.project || '');
  const [metaCity, setMetaCity] = useState<string>('BALIKESİR');
  const [metaDistrict, setMetaDistrict] = useState<string>('SINDIRGI');
  const [metaVillage, setMetaVillage] = useState<string>('BİÇER-SARISU');
  const [metaDrillMethod, setMetaDrillMethod] = useState<string>('-');
  const [metaDiameter, setMetaDiameter] = useState<string>('HQ');
  const [metaWaterTable, setMetaWaterTable] = useState<string>('-');
  const [metaDriller, setMetaDriller] = useState<string>('-');

  useEffect(() => {
    if (collar?.project) {
      setMetaProject(collar.project);
    }
  }, [collar?.project]);

  const handleExportExcel = async () => {
    const project = metaProject || collar?.project || '-';
    const holeIdVal = holeId || collar?.holeId || '-';
    const easting = collar?.easting !== undefined ? `${collar.easting}` : '-';
    const northing = collar?.northing !== undefined ? `${collar.northing}` : '-';
    const elevation = collar?.elevation !== undefined ? `${collar.elevation}` : '-';
    const dipAzimuth = collar?.dip !== undefined && collar?.azimuth !== undefined ? `${collar.dip}° / ${collar.azimuth}°` : '-';
    const logger = collar?.logger || '-';

    try {
      const ExcelJSModule = await import('exceljs');
      const ExcelJS = (ExcelJSModule.default || ExcelJSModule) as any;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Sondaj Logu', {
        pageSetup: { orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
      });

      const dynamicCols = selectedFeatures.map(key => {
        const feat = ALL_FEATURES.find(f => f.key === key);
        return { key, width: 12, label: feat ? feat.label : key, isGeotech: feat?.isGeotech };
      });


      worksheet.columns = [
        { width: 3 }, // spacer Col A
        { key: 'depth', width: 11 }, // Col B: Derinlik
        { key: 'interval', width: 13 }, // Col C: Örnek Derinliği
        { key: 'sampleNo', width: 13 }, // Col D: Örnek No
        { key: 'colE', width: 12 }, // Col E
        { key: 'colF', width: 12 }, // Col F
        { key: 'colG', width: 12 }, // Col G
        { key: 'colH', width: 12 }, // Col H
        { key: 'colI', width: 12 }, // Col I
        { key: 'colJ', width: 12 }, // Col J
        { key: 'lithology', width: 15 }, // Col K: Litoloji
        { key: 'alteration', width: 15 }, // Col L: Alterasyon
        { key: 'redox', width: 15 }, // Col M: Redoks
        { key: 'description', width: 38 } // Col N: Açıklamalar
      ];
      worksheet.views = [{ showGridLines: true }];

      const thinBorder = { top: { style: 'thin', color: { argb: '000000' } }, left: { style: 'thin', color: { argb: '000000' } }, bottom: { style: 'thin', color: { argb: '000000' } }, right: { style: 'thin', color: { argb: '000000' } } };
      const thickBorder = { top: { style: 'medium', color: { argb: '000000' } }, left: { style: 'medium', color: { argb: '000000' } }, bottom: { style: 'medium', color: { argb: '000000' } }, right: { style: 'medium', color: { argb: '000000' } } };
      const grayFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };

      worksheet.getCell('B1').value = 'Sınıflandırma: HİZMETE ÖZEL (CONFIDENTIAL)';
      
      // Merge Title Card and set borders AFTER merging to prevent distortion
      worksheet.mergeCells('B2:L3');
      for (let r = 2; r <= 3; r++) {
        for (let col = 2; col <= 12; col++) {
          const c = worksheet.getCell(r, col);
          c.border = thickBorder;
        }
      }
      const titleCell = worksheet.getCell('B2');
      titleCell.value = 'SONDAJ LOGU';
      titleCell.font = { name: 'Segoe UI', size: 16, bold: true };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

      // Sondaj No / Sayfa No - set borders on M2, N2, M3, N3
      worksheet.getCell('M2').value = 'Sondaj No';
      worksheet.getCell('N2').value = holeIdVal;
      worksheet.getCell('M3').value = 'Sayfa No';
      worksheet.getCell('N3').value = 1;

      for (let r = 2; r <= 3; r++) {
        for (let col = 13; col <= 14; col++) {
          const cell = worksheet.getCell(r, col);
          cell.border = thinBorder;
          cell.font = { name: 'Segoe UI', size: 9, bold: col === 13 };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
      }

      const rowData = [
        { c1Label: 'Yüklenici Firma', c1Val: metaCompany, c2Label: 'Sondaj Derinliği', c2Val: `${collar?.totalDepth || 0} m`, c3Label: 'Yeraltı Suyu', c3Val: metaWaterTable },
        { c1Label: 'Proje Adı', c1Val: project, c2Label: 'Başlama Tarihi', c2Val: collar?.dateStarted || '-', c3Label: 'Makine Tipi/Metodu', c3Val: metaDrillMethod },
        { c1Label: 'İl', c1Val: metaCity, c2Label: 'Bitiş Tarihi', c2Val: collar?.dateCompleted || '-', c3Label: 'SPT Şahmerdan Tipi', c3Val: '-' },
        { c1Label: 'İlçe', c1Val: metaDistrict, c2Label: 'Sondaj Kotu', c2Val: elevation, c3Label: 'Delgi Çapı', c3Val: metaDiameter },
        { c1Label: 'Mahalle/Köy', c1Val: metaVillage, c2Label: 'Koordinat X (N)', c2Val: northing, c3Label: 'Sondör', c3Val: metaDriller },
        { c1Label: 'Pafta', c1Val: '-', c2Label: 'Koordinat Y (E)', c2Val: easting, c3Label: 'Sondör Belge No', c3Val: '-' },
        { c1Label: 'Ada', c1Val: '-', c2Label: 'Koordinat Z (RL)', c2Val: elevation, c3Label: 'Yönelim (Dip/Azim)', c3Val: dipAzimuth },
        { c1Label: 'Parsel', c1Val: '-', c2Label: 'Drill Status', c2Val: collar?.status || '-', c3Label: 'Logger / Geologist', c3Val: logger }
      ];

      const writeMetaRow = (rowNum: number, label1: string, val1: any, label2: string, val2: any, label3: string, val3: any) => {
        // Merge cells
        worksheet.mergeCells(`C${rowNum}:D${rowNum}`);
        worksheet.mergeCells(`E${rowNum}:G${rowNum}`);
        worksheet.mergeCells(`H${rowNum}:J${rowNum}`);
        worksheet.mergeCells(`K${rowNum}:L${rowNum}`);
        worksheet.mergeCells(`M${rowNum}:N${rowNum}`);

        // Set values on master cells
        worksheet.getCell(`B${rowNum}`).value = label1;
        worksheet.getCell(`C${rowNum}`).value = val1;
        worksheet.getCell(`E${rowNum}`).value = label2;
        worksheet.getCell(`H${rowNum}`).value = val2;
        worksheet.getCell(`K${rowNum}`).value = label3;
        worksheet.getCell(`M${rowNum}`).value = val3;

        // Apply borders and styling to all cells B..N after merging to prevent distortion
        for (let col = 2; col <= 14; col++) {
          const cell = worksheet.getCell(rowNum, col);
          cell.border = thinBorder;
          cell.font = { name: 'Segoe UI', size: 8.5 };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
      };

      rowData.forEach((row, i) => writeMetaRow(4 + i, row.c1Label, row.c1Val, row.c2Label, row.c2Val, row.c3Label, row.c3Val));

      ['B13', 'C13', 'D13'].forEach((cell, i) => {
        worksheet.mergeCells(`${cell.slice(0, 1)}13:${cell.slice(0, 1)}14`);
        const colLetter = cell.slice(0, 1);
        for (let r = 13; r <= 14; r++) {
          const c = worksheet.getCell(`${colLetter}${r}`);
          c.fill = grayFill;
          c.border = thinBorder;
          c.alignment = { horizontal: 'center', vertical: 'middle' };
        }
        const masterCell = worksheet.getCell(cell);
        masterCell.value = ['Derinlik (m)', 'Örnek Derinliği (m)', 'Örnek (Karot) No'][i];
        masterCell.font = { name: 'Segoe UI', size: 9, bold: true };
      });

      for (let i = 0; i < 6; i++) {
        const colLetter = getColLetter(5 + i);
        worksheet.mergeCells(`${colLetter}13:${colLetter}14`);
        for (let r = 13; r <= 14; r++) {
          const c = worksheet.getCell(`${colLetter}${r}`);
          c.fill = grayFill;
          c.border = thinBorder;
          c.alignment = { horizontal: 'center', vertical: 'middle' };
        }
        const cell = worksheet.getCell(`${colLetter}13`);
        cell.font = { name: 'Segoe UI', size: 9, bold: true };
        if (i < dynamicCols.length) {
          cell.value = dynamicCols[i].label;
        } else {
          cell.value = '-';
        }
      }

      const postHeaders = [
        { v: 'LİTOLOJİ', col: 'K' },
        { v: 'ALTERASYON', col: 'L' },
        { v: 'REDOKS/OKSİT', col: 'M' },
        { v: 'AÇIKLAMALAR', col: 'N' }
      ];
      postHeaders.forEach(ph => {
        worksheet.mergeCells(`${ph.col}13:${ph.col}14`);
        for (let r = 13; r <= 14; r++) {
          const c = worksheet.getCell(`${ph.col}${r}`);
          c.fill = grayFill;
          c.border = thinBorder;
          c.alignment = { horizontal: 'center', vertical: 'middle' };
        }
        const cell = worksheet.getCell(`${ph.col}13`);
        cell.value = ph.v;
        cell.font = { name: 'Segoe UI', size: 9, bold: true };
      });

      // Populate Data...
      const bodyStartRow = 15;
      const cleanDepth = (val: number) => Math.round(val * 100) / 100;
      const formatDepth = (d: number) => {
        if (Number.isInteger(d)) return d.toString();
        return d.toFixed(2).replace(/\.?0+$/, '');
      };

      const depths = new Set<number>();
      depths.add(0);
      for (let m = 1; m <= Math.ceil(totalDepth); m++) {
        depths.add(m);
      }
      (geotech || []).forEach(g => {
        depths.add(cleanDepth(g.from));
        depths.add(cleanDepth(g.to));
      });
      (lithology || []).forEach(l => {
        depths.add(cleanDepth(l.from));
        depths.add(cleanDepth(l.to));
      });
      (assays || []).forEach(a => {
        depths.add(cleanDepth(a.from));
        depths.add(cleanDepth(a.to));
      });
      (alterations || []).forEach(alt => {
        depths.add(cleanDepth(alt.from));
        depths.add(cleanDepth(alt.to));
      });

      const sortedDepths = Array.from(depths)
        .filter(d => d <= totalDepth)
        .sort((a, b) => a - b);

      if (sortedDepths.length === 0 || sortedDepths[0] > 0) sortedDepths.unshift(0);
      const lastDepth = cleanDepth(totalDepth);
      if (sortedDepths[sortedDepths.length - 1] < lastDepth) sortedDepths.push(lastDepth);

      const rowIntervals: { from: number; to: number }[] = [];
      for (let i = 0; i < sortedDepths.length - 1; i++) {
        const fromDepth = sortedDepths[i];
        const toDepth = sortedDepths[i+1];
        if (toDepth <= fromDepth) continue;
        rowIntervals.push({ from: fromDepth, to: toDepth });
      }

      const totalRowsCount = rowIntervals.length;

      // Fill values
      for (let idx = 0; idx < totalRowsCount; idx++) {
        const { from: fromDepth, to: toDepth } = rowIntervals[idx];
        const rowNum = bodyStartRow + idx;
        const row = worksheet.getRow(rowNum);
        row.height = 20;

        const depthCell = worksheet.getCell(`B${rowNum}`);
        depthCell.value = `${formatDepth(fromDepth)} - ${formatDepth(toDepth)}`;
        depthCell.font = { name: 'Segoe UI', size: 8.5, bold: true };
        depthCell.alignment = { horizontal: 'center', vertical: 'middle' };
        depthCell.border = thinBorder;

        for (let colIndex = 3; colIndex <= 14; colIndex++) {
          const colLetter = getColLetter(colIndex);
          const cell = worksheet.getCell(`${colLetter}${rowNum}`);
          cell.border = thinBorder;
          cell.font = { name: 'Segoe UI', size: 8.5 };
          cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          cell.value = '-';
        }

        // 1. Geotech
        const g = (geotech || []).find(run => run.from <= fromDepth + 0.001 && run.to >= toDepth - 0.001);
        if (g) {
          worksheet.getCell(`C${rowNum}`).value = `${formatDepth(g.from)} - ${formatDepth(g.to)}`;
          dynamicCols.forEach((dCol, i) => {
            if (dCol.isGeotech) {
              const cell = worksheet.getCell(`${getColLetter(5 + i)}${rowNum}`);
              if (dCol.key === 'tcrPercent') cell.value = g.tcrPercent;
              else if (dCol.key === 'rqdPercent') cell.value = g.rqdPercent;
            }
          });
        }

        // 2. Assay
        const a = (assays || []).find(assay => assay.from <= fromDepth + 0.001 && assay.to >= toDepth - 0.001);
        if (a) {
          const sampleCell = worksheet.getCell(`D${rowNum}`);
          sampleCell.value = a.sampleId;
          sampleCell.font = { name: 'Segoe UI', size: 8.5, bold: true };
          dynamicCols.forEach((dCol, i) => {
            if (!dCol.isGeotech) {
              const cell = worksheet.getCell(`${getColLetter(5 + i)}${rowNum}`);
              cell.value = getAnalyteVal(a, dCol.key);
              cell.numFmt = '0.00';
            }
          });
        }

        // 3. Lithology
        const l = (lithology || []).find(lith => lith.from <= fromDepth + 0.001 && lith.to >= toDepth - 0.001);
        if (l) {
          const rockLabel = getRockLabel(l.rockCode);
          const hexColor = getRockColor(l.rockCode).replace('#', '');
          const litCell = worksheet.getCell(`K${rowNum}`);
          litCell.value = rockLabel;
          litCell.font = { name: 'Segoe UI', size: 8.5, bold: true };
          litCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: hexColor } };
          worksheet.getCell(`N${rowNum}`).value = l.description || '';
          worksheet.getCell(`N${rowNum}`).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
        }

        // 4. Alteration & Redox
        const alt = (alterations || []).find(altItem => altItem.from <= fromDepth + 0.001 && altItem.to >= toDepth - 0.001);
        if (alt) {
          const altCell = worksheet.getCell(`L${rowNum}`);
          if (alt.alterationType !== 'YOK') {
            altCell.value = `${alt.alterationType} (${alt.alterationIntensity})`;
            altCell.font = { name: 'Segoe UI', size: 8.5, bold: true };
            let altHex = 'FFFFFF';
            if (alt.alterationType === 'Arjilik') altHex = 'F5EBE6';
            else if (alt.alterationType === 'Silisleşme') altHex = 'E0F2FE';
            if (altHex !== 'FFFFFF') altCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: altHex } };
          } else {
            altCell.value = 'YOK';
          }

          const redoxCell = worksheet.getCell(`M${rowNum}`);
          redoxCell.value = alt.oxideIntensity !== 'YOK' ? `${alt.redoxType} (${alt.oxideIntensity})` : alt.redoxType;
          let redoxHex = '94A3B8';
          if (alt.redoxType === 'OX') redoxHex = 'D97706';
          else if (alt.redoxType === 'SUL') redoxHex = '475569';
          else if (alt.redoxType === 'OX/SUL' || alt.redoxType === 'Transition') redoxHex = 'B45309';
          redoxCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: redoxHex } };
          redoxCell.font = { name: 'Segoe UI', size: 8.5, bold: true, color: { argb: 'FFFFFF' } };
        }
      }

      // Merges
      const mergedRanges: Record<string, Set<number>> = {};
      for (let colIndex = 3; colIndex <= 14; colIndex++) {
        mergedRanges[getColLetter(colIndex)] = new Set();
      }

      const safeMerge = (col: string, startRow: number, endRow: number) => {
        if (!mergedRanges[col]) return;
        for (let r = startRow; r <= endRow; r++) {
          if (mergedRanges[col].has(r)) return;
        }
        for (let r = startRow; r <= endRow; r++) {
          mergedRanges[col].add(r);
        }
        worksheet.mergeCells(`${col}${startRow}:${col}${endRow}`);
        
        // Re-apply border and alignment styling to all cells in the merged range to fix distortion
        for (let r = startRow; r <= endRow; r++) {
          const cell = worksheet.getCell(`${col}${r}`);
          cell.border = thinBorder;
          cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        }
      };

      (geotech || []).forEach(gItem => {
        if (gItem.to <= gItem.from) return;
        const startRIdx = rowIntervals.findIndex(r => Math.abs(r.from - gItem.from) < 0.01);
        const endRIdx = rowIntervals.findIndex(r => Math.abs(r.to - gItem.to) < 0.01);
        if (startRIdx !== -1 && endRIdx !== -1 && endRIdx > startRIdx) {
          const startR = bodyStartRow + startRIdx;
          const endR = bodyStartRow + endRIdx;
          safeMerge('C', startR, endR);
          dynamicCols.forEach((dCol, i) => {
            if (dCol.isGeotech) safeMerge(getColLetter(5 + i), startR, endR);
          });
        }
      });

      (assays || []).forEach(aItem => {
        if (aItem.to <= aItem.from) return;
        const startRIdx = rowIntervals.findIndex(r => Math.abs(r.from - aItem.from) < 0.01);
        const endRIdx = rowIntervals.findIndex(r => Math.abs(r.to - aItem.to) < 0.01);
        if (startRIdx !== -1 && endRIdx !== -1 && endRIdx > startRIdx) {
          const startR = bodyStartRow + startRIdx;
          const endR = bodyStartRow + endRIdx;
          safeMerge('D', startR, endR);
          dynamicCols.forEach((dCol, i) => {
            if (!dCol.isGeotech) safeMerge(getColLetter(5 + i), startR, endR);
          });
        }
      });

      (lithology || []).forEach(lItem => {
        if (lItem.to <= lItem.from) return;
        const startRIdx = rowIntervals.findIndex(r => Math.abs(r.from - lItem.from) < 0.01);
        const endRIdx = rowIntervals.findIndex(r => Math.abs(r.to - lItem.to) < 0.01);
        if (startRIdx !== -1 && endRIdx !== -1 && endRIdx > startRIdx) {
          const startR = bodyStartRow + startRIdx;
          const endR = bodyStartRow + endRIdx;
          safeMerge('K', startR, endR);
          safeMerge('N', startR, endR);
        }
      });

      (alterations || []).forEach(altItem => {
        if (altItem.to <= altItem.from) return;
        const startRIdx = rowIntervals.findIndex(r => Math.abs(r.from - altItem.from) < 0.01);
        const endRIdx = rowIntervals.findIndex(r => Math.abs(r.to - altItem.to) < 0.01);
        if (startRIdx !== -1 && endRIdx !== -1 && endRIdx > startRIdx) {
          const startR = bodyStartRow + startRIdx;
          const endR = bodyStartRow + endRIdx;
          safeMerge('L', startR, endR);
          safeMerge('M', startR, endR);
        }
      });

      // Conditional formatting
      if (totalRowsCount > 0) {
        dynamicCols.forEach((dCol, i) => {
          if (!dCol.isGeotech) {
            const colLetter = getColLetter(5 + i);
            const colorHex = (analytesList.find(an => an.key === dCol.key)?.color || '#3b82f6').replace('#', '');
            worksheet.addConditionalFormatting({
              ref: `${colLetter}${bodyStartRow}:${colLetter}${bodyStartRow + totalRowsCount - 1}`,
              rules: [{ type: 'dataBar', color: { argb: `FF${colorHex}` }, cfvo: [{ type: 'min' }, { type: 'max' }] }]
            });
          }
        });
      }

      // Legend
      const footerStartRow = bodyStartRow + totalRowsCount + 2;
      worksheet.getRow(footerStartRow).height = 20;

      const fHeaders = [
        { start: 'B', end: 'C', val: 'Kısaltmalar' },
        { start: 'D', end: 'E', val: 'Kaya Kalitesi Tanımı-RQD(%)' },
        { start: 'F', end: 'G', val: 'Kırık-Eklem / 30 cm' },
        { start: 'H', end: 'I', val: 'Ayrışma derecesi' },
        { start: 'J', end: 'K', val: 'Dayanıklılık' }
      ];

      fHeaders.forEach(fh => {
        worksheet.mergeCells(`${fh.start}${footerStartRow}:${fh.end}${footerStartRow}`);
        // Apply border to all cells in merged range to prevent distortion
        const colStartNum = fh.start === 'B' ? 2 : (fh.start === 'D' ? 4 : (fh.start === 'F' ? 6 : (fh.start === 'H' ? 8 : 10)));
        const colEndNum = colStartNum + 1;
        for (let col = colStartNum; col <= colEndNum; col++) {
          const cell = worksheet.getCell(footerStartRow, col);
          cell.border = thinBorder;
          cell.fill = grayFill;
        }
        const cell = worksheet.getCell(`${fh.start}${footerStartRow}`);
        cell.value = fh.val;
        cell.font = { name: 'Segoe UI', size: 9, bold: true };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });

      // Signature Header
      worksheet.mergeCells(`L${footerStartRow}:N${footerStartRow}`);
      for (let col = 12; col <= 14; col++) {
        const cell = worksheet.getCell(footerStartRow, col);
        cell.border = thinBorder;
        cell.fill = grayFill;
      }
      const authCell = worksheet.getCell(`L${footerStartRow}`);
      authCell.value = 'Logu Hazırlayan / Onay';
      authCell.font = { name: 'Segoe UI', size: 9, bold: true };
      authCell.alignment = { horizontal: 'center', vertical: 'middle' };

      const legendData = [
        ['UD: Örselenmemiş Örnek', '0-25% Çok Kötü', '< 1 Seyrek', 'W1 Taze kayaç', 'I Çok Zayıf'],
        ['DS: Örselenmiş Örnek', '25-50% Kötü', '1-2 Orta', 'W2 Az ayrışmış', 'II Zayıf'],
        ['TCR: Toplam Karot Yüzdesi', '50-75% Orta', '2-10 Sık', 'W3-W4 Orta-Çok Ayrışmış', 'III Orta'],
        ['SCR: Silindirik Karot Yüzdesi', '75-90% İyi', '10-20 Çok Sık', 'W5 Tümüyle Ayrışmış', 'IV Dayanıklı'],
        ['RQD: Toplam Kaya Kalitesi', '90-100% Çok İyi', '> 20 Parçalı', 'W6 Rezidüel Zemin', 'V/VI Çok/Aşırı Dayanıklı']
      ];

      legendData.forEach((rowDataArr, i) => {
        const rowNum = footerStartRow + 1 + i;
        worksheet.getRow(rowNum).height = 15;
        fHeaders.forEach((fh, idx) => {
          worksheet.mergeCells(`${fh.start}${rowNum}:${fh.end}${rowNum}`);
          const colStartNum = fh.start === 'B' ? 2 : (fh.start === 'D' ? 4 : (fh.start === 'F' ? 6 : (fh.start === 'H' ? 8 : 10)));
          const colEndNum = colStartNum + 1;
          for (let col = colStartNum; col <= colEndNum; col++) {
            worksheet.getCell(rowNum, col).border = thinBorder;
          }
          const cell = worksheet.getCell(`${fh.start}${rowNum}`);
          cell.value = rowDataArr[idx];
          cell.font = { name: 'Segoe UI', size: 7.5 };
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        });
      });

      worksheet.mergeCells(`L${footerStartRow + 1}:N${footerStartRow + 5}`);
      for (let r = footerStartRow + 1; r <= footerStartRow + 5; r++) {
        for (let col = 12; col <= 14; col++) {
          worksheet.getCell(r, col).border = thinBorder;
        }
      }
      const sigCell = worksheet.getCell(`L${footerStartRow + 1}`);
      sigCell.value = `Hazırlayan:\n${logger}\n\nKontrol Eden:\nİsmailcan SEVER`;
      sigCell.font = { name: 'Segoe UI', size: 8, bold: true };
      sigCell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };

      const classificationRow = footerStartRow + 7;
      worksheet.mergeCells(`B${classificationRow}:N${classificationRow}`);
      for (let col = 2; col <= 14; col++) {
        worksheet.getCell(classificationRow, col).border = thinBorder;
      }
      const classCell = worksheet.getCell(`B${classificationRow}`);
      classCell.value = 'Bu mesaj/doküman HİZMETE ÖZEL (CONFIDENTIAL) etiketi ile sınıflandırılmıştır.';
      classCell.font = { name: 'Segoe UI', size: 8, bold: true, italic: true };
      classCell.alignment = { horizontal: 'center', vertical: 'middle' };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${holeIdVal}_Log.xlsx`; a.click();
    } catch (err) { console.error(err); }
  };

  const handleFeatureToggle = (key: string) => {
    if (selectedFeatures.includes(key)) {
      if (selectedFeatures.length > 1) setSelectedFeatures(selectedFeatures.filter(k => k !== key));
    } else {
      if (selectedFeatures.length >= 6) {
        alert("En fazla 6 özellik seçebilirsiniz! Rapor düzeninin A4 boyutuna sığması için bu sınır konulmuştur.");
        return;
      }
      setSelectedFeatures([...selectedFeatures, key]);
    }
  };

  const [columns, setColumns] = useState<ColumnConfig[]>([
    { id: 'scale', label: 'Scale Ruler', width: 70, visible: true, color: 'black' },
    { id: 'lithology', label: 'Lithology', width: 130, visible: true, color: 'black' },
    { id: 'alteration', label: 'Alteration', width: 65, visible: true, color: 'black' },
    { id: 'redox', label: 'Redox/Oxide', width: 65, visible: true, color: 'black' },
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
    switch ((code || '').toUpperCase()) {
      // Magmatik Kayaçlar
      case 'TFR': return '#B24DCC';
      case 'VK':
      case 'LPL': return '#BF4DCC';
      case 'VKB':
      case 'VBR':
      case 'BTF': return '#CC59D9';
      case 'VKT':
      case 'LTS':
      case 'LTF': return '#B259CC';
      case 'TF':
      case 'TUF':
      case 'BRS':
      case 'BRES':
      case 'AGL':
      case 'PBR': return '#BF66D9';
      case 'AP': return '#FFCC33';
      case 'PEG': return '#FFB219';
      case 'GRND': return '#FF3333';
      case 'GRT':
      case 'GRA':
      case 'GNT':
      case 'GRANIT': return '#FF4D4D';
      case 'AFGR': return '#FFD1DC';
      case 'MGR': return '#F24D59';
      case 'SGR': return '#E64D4D';
      case 'TRND': return '#FFA7BC';
      case 'TNLT': return '#FF6666';
      case 'GRD':
      case 'GRANODIYORIT': return '#FF8080';
      case 'DRD': return '#D9408C';
      case 'DYR':
      case 'DIYORIT': return '#D959A1';
      case 'KSD': return '#E066A1';
      case 'MDYR': return '#DB61AD';
      case 'GBY': return '#F23366';
      case 'GB':
      case 'GABRO': return '#F24073';
      case 'MGB': return '#E64073';
      case 'KMG': return '#FF6F5B';
      case 'NOR': return '#FFD6D1';
      case 'TROK': return '#FFBFCE';
      case 'DOLE': return '#8019CC';
      case 'DB':
      case 'DIYABAZ': return '#F24073';
      case 'ANR': return '#F7ABC4';
      case 'SYD': return '#F226A6';
      case 'SY':
      case 'SIYENIT': return '#FF4DCC';
      case 'KSY': return '#FF59D9';
      case 'FDS': return '#FF73F2';
      case 'MONZ': return '#F240BF';
      case 'KSM': return '#F24DCC';
      case 'FOD': return '#F791C3';
      case 'FDG': return '#F273BF';
      case 'FDSY': return '#ED54B8';
      case 'FDL': return '#E633B3';
      case 'RYL':
      case 'RIYOLIT': return '#C799F2';
      case 'AFR': return '#CC42F2';
      case 'DST':
      case 'DASIT': return '#B373F2';
      case 'RYD': return '#FEC62A';
      case 'TRKD': return '#9966E6';
      case 'TRKT': return '#A17AED';
      case 'TRKA': return '#C95201';
      case 'TRKB': return '#ECD5C6';
      case 'LA': return '#AD8CFA';
      case 'KLA': return '#FE8736';
      case 'AND':
      case 'ANDEZIT': return '#9145EB';
      case 'BON': return '#9E52EB';
      case 'BAZ':
      case 'BAZALT': return '#6600FF';
      case 'AOB': return '#7333E6';
      case 'TLB': return '#804DED';
      case 'FND': return '#5926F2';
      case 'FON': return '#594DF2';
      case 'TFFD': return '#7359F2';
      case 'TEF': return '#7373F2';
      case 'BAS': return '#8080F2';
      case 'FDD':
      case 'FDT': return '#804DE6';
      case 'PRD': return '#D90D99';
      case 'PRKS': return '#E626A6';
      case 'KOM': return '#F045AB';
      case 'HAR': return '#D90F66';
      case 'LER': return '#D94059';
      case 'DUN': return '#D96F8C';
      case 'VER': return '#D91E9E';
      case 'KMB': return '#C1010A';
      case 'HBT': return '#A30109';
      case 'KAR': return '#00FFFF';
      case 'KAL-MEL': return '#E6B200';
      case 'EKS': return '#B200D9';
      case 'POR': return '#9919B2';
      case 'OBS': return '#FFD1EA';
      case 'PMS': return '#FFE5F3';
      case 'LAMB': return '#E45891';

      // Sedimanter Kayaçlar
      case 'ALV':
      case 'DOLGU':
      case 'TOPRAK':
      case 'TO': return '#FFFF99';
      case 'DMK': return '#F2F2BF';
      case 'CK': return '#FFFFCC';
      case 'CM': return '#FFF2B2';
      case 'KL':
      case 'KIL':
      case 'KAOLEN': return '#FAF2BF';
      case 'SL': return '#F2E6BF';
      case 'KBS': return '#0DB3C9';
      case 'KKS': return '#33C7D9';
      case 'BYS': return '#D9CC80';
      case 'OZS': return '#DED48C';
      case 'OOZ': return '#E6D9A6';
      case 'TRB': return '#E6D694';
      case 'SPR': return '#EBDE9E';
      case 'KOOZ': return '#E6E6CC';
      case 'SOOZ': return '#EDE0B2';
      case 'KLSED':
      case 'SEDIMENT': return '#CCB266';
      case 'DMKT': return '#CCBF8C';
      case 'KONG': return '#CCBFA6';
      case 'KMT':
      case 'KUM': return '#F2D973';
      case 'ARN': return '#F2E080';
      case 'CKMT': return '#F2E691';
      case 'CMT': return '#B28C59';
      case 'KLT': return '#BF996B';
      case 'SLT': return '#CCA612';
      case 'SY': return '#D1B08C';
      case 'OSED': return '#B3B399';
      case 'KMR':
      case 'KOMUR': return '#B3BFBF';
      case 'LNY': return '#BFB3A6';
      case 'BTK': return '#CCB8A6';
      case 'ANTR': return '#BFBFBF';
      case 'KSED': return '#4D80FF';
      case 'SKASED': return '#598CFA';
      case 'DOSED-MASED': return '#6699FA';
      case 'DOL': return '#73A6FA';
      case 'KÇT':
      case 'KALSIT': return '#66B2F2';
      case 'TBT': return '#73BFF2';
      case 'TRV': return '#7ECDF2';
      case 'KKSED': return '#33B3E6';
      case 'KKÇT-MRN': return '#59BFF1';
      case 'KDOL': return '#66CCF2';
      case 'KOSS': return '#B3CC66';
      case 'BSSED': return '#BFD973';
      case 'DSED':
      case 'OKSIT':
      case 'SULFIT': return '#BFCC66';
      case 'CNCT': return '#D9B27F';
      case 'ORCT': return '#D9BA99';
      case 'KİSED': return '#CCCCE6';
      case 'EVP': return '#99CCE6';
      case 'KAT': return '#AADEF2';
      case 'JPS-ANH': return '#B2E6F2';
      case 'BNT': return '#C0D0C0';
      case 'ARJ': return '#E1F0D8';
      case 'ARK': return '#69CF9C';
      case 'OLS': return '#8DDECD';
      case 'SBR': return '#A7BA86';
      case 'KARN': return '#9ACEFE';
      case 'CRT': return '#9ABFC0';

      // Metamorfik Kayaçlar
      case 'FOM': return '#4DD966';
      case 'GNS':
      case 'GNAYS':
      case 'GNYS': return '#61E07A';
      case 'OGNS': return '#73E68C';
      case 'PGNS': return '#85F09E';
      case 'FGNS':
      case 'ALBIT': return '#E0F3FE';
      case 'GGNS': return '#C1E1C9';
      case 'BGNS': return '#AED6C1';
      case 'MGNS': return '#BBFBDE';
      case 'FLL': return '#73F28C';
      case 'SLY': return '#80F299';
      case 'SST':
      case 'SIST': return '#33A666';
      case 'MSST': return '#4DBF80';
      case 'YSST': return '#45B872';
      case 'MVST': return '#188B3F';
      case 'PSST': return '#22955B';
      case 'KFST': return '#396D3F';
      case 'AMFS': return '#454551';
      case 'KSST': return '#0E814D';
      case 'KAE': return '#26994D';
      case 'GLE': return '#73B380';
      case 'SRP':
      case 'SERP': return '#8CBF80';
      case 'KVS':
      case 'KUVARSIT': return '#E6F259';
      case 'AMF': return '#40D973';
      case 'MER':
      case 'MRB': return '#33B3E6';
      case 'GRNL': return '#66CC80';
      case 'EKL': return '#33CC59';
      case 'MGM': return '#19BF66';
      case 'GRF': return '#80B280';
      case 'HRF': return '#8CBF8C';
      case 'MTZ': return '#80E64D';
      case 'SKR': return '#99E659';
      case 'SPL': return '#A6E666';
      case 'YKS': return '#A6D9CC';
      case 'BKS': return '#BFE6D9';
      case 'DRC': return '#B3E6D9';
      case 'KAM': return '#CCF2E6';
      case 'MLK':
      case 'FLT': return '#E6E600';
      case 'CMS': return '#00B366';
      case 'MKON': return '#E9FFE9';
      case 'MAR': return '#C9FFC9';
      case 'MVOL': return '#FF57FF';
      case 'MRYL': return '#FFA7FF';
      case 'KRT': return '#FE6700';
      case 'MBZ': return '#872B4C';
      case 'GRY': return '#A449FF';
      case 'OFM':
      case 'OFY': return '#8AB580';

      case 'BU':
      case 'KAROT':
      case 'NONE':
      default:
        return '#cbd5e1'; // Varsayılan gri
    }
  };



  const getRockPatternUrl = (code: string) => {
    const clean = code.toUpperCase();
    if (clean === 'GNS' || clean === 'GNAYS' || clean === 'GNYS') return 'url(#pat-gnays)';
    if (clean === 'FGNS' || clean === 'ALBIT') return 'url(#pat-albit)';
    if (clean === 'KL' || clean === 'KAOLEN' || clean === 'KAO') return 'url(#pat-kaolen)';
    if (['GRT', 'GRANIT', 'GNT', 'GRA', 'GRND', 'SUBVOLKANIK', 'SIYENIT', 'SY', 'GRD', 'GRANODIYORIT', 'RYL', 'RIYOLIT', 'DST', 'DASIT', 'INTRUZIF', 'VFD', 'IGB', 'IGNIMBIRIT'].includes(clean)) return 'url(#pat-granit)';
    if (['BRS', 'BRES', 'BXS', 'XBH', 'MLK', 'FLT', 'YANAL'].includes(clean)) return 'url(#pat-bres)';
    if (clean === 'KVS' || clean === 'KUVARSIT' || clean === 'QVN' || clean === 'KUVARS' || clean === 'SILIS') return 'url(#pat-kuvarsit)';
    if (['AND', 'ANDEZIT', 'TF', 'TUF', 'VIA', 'VIA.A', 'VIA.P', 'VIA.T', 'VIA:T'].includes(clean)) return 'url(#pat-andezit)';
    if (clean === 'BAZ' || clean === 'BAZALT' || clean === 'BSL' || clean === 'OFM' || clean === 'OFY' || clean === 'SRP' || clean === 'SERP') return 'url(#pat-basalt)';
    if (clean === 'ALV' || clean === 'DOLGU' || clean === 'OB' || clean === 'TOPRAK' || clean === 'TO') return 'url(#pat-dolgu)';
    if (['SST', 'SIST', 'MTSH', 'MTSL', 'MTSS', 'VKT', 'VSM', 'VOLKANOSEDIMANTER', 'KLSED', 'SEDIMENT'].includes(clean)) return 'url(#pat-sist)';
    if (clean === 'KL' || clean === 'KIL') return 'url(#pat-kil)';
    if (['KÇT', 'KALSIT', 'MER', 'MRB'].includes(clean)) return 'url(#pat-kalsit)';
    if (clean === 'UNC') return 'url(#pat-unc)';
    if (clean === 'DYK' || clean === 'DAYK') return 'url(#pat-dayk)';
    if (clean === 'KMT' || clean === 'KUM') return 'url(#pat-kum)';
    return getRockColor(code);
  };

  const getRockLabel = (code: string) => {
    const clean = (code || '').toUpperCase();
    if (clean === 'ALV' || clean === 'OB' || clean === 'DOLGU' || clean === 'TOPRAK' || clean === 'TO') return 'Alüvyon / Toprak / Dolgu (ALV)';
    if (clean === 'GRT' || clean === 'GRANIT' || clean === 'GNT' || clean === 'GRA') return 'Granit (GRT)';
    if (clean === 'GRD' || clean === 'GRANODIYORIT') return 'Granodiyorit (GRD)';
    if (clean === 'SY' || clean === 'SIYENIT') return 'Siyenit (SY)';
    if (clean === 'GRND' || clean === 'INTRUZIF' || clean === 'SUBVOLKANIK' || clean === 'VFD') return 'Granitoid (GRND)';
    if (clean === 'BRS' || clean === 'BRES' || clean === 'BXS' || clean === 'VIA.P') return 'Breş (BRS)';
    if (clean === 'MLK' || clean === 'XBH' || clean === 'FLT' || clean === 'YANAL') return 'Fay Zonu / Milonit (MLK)';
    if (clean === 'AND' || clean === 'ANDEZIT' || clean === 'VIA.A') return 'Andezit (AND)';
    if (clean === 'TF' || clean === 'TUF' || clean === 'VIA.T' || clean === 'VIA:T' || clean === 'VIA') return 'Tüf (TF)';
    if (clean === 'BAZ' || clean === 'BAZALT' || clean === 'BSL') return 'Bazalt (BAZ)';
    if (clean === 'OFM' || clean === 'OFY') return 'Ofiyolitik Melanj (OFM)';
    if (clean === 'SRP' || clean === 'SERP') return 'Serpantinit (SRP)';
    if (clean === 'KVS' || clean === 'KUVARSIT') return 'Kuvarsit (KVS)';
    if (clean === 'QVN' || clean === 'KUVARS' || clean === 'SILIS') return 'Kuvars Damarı (QVN)';
    if (clean === 'SST' || clean === 'SIST' || ['MTSH', 'MTSL', 'MTSS'].includes(clean)) return 'Şist (SST)';
    if (clean === 'KLSED' || clean === 'SEDIMENT') return 'Sedimanter (KLSED)';
    if (clean === 'KL' || clean === 'KIL' || clean === 'KAOLEN' || clean === 'KAO') return 'Kil / Kaolen (KL)';
    if (clean === 'KÇT' || clean === 'KALSIT') return 'Kireçtaşı / Kalsit (KÇT)';
    if (clean === 'MER' || clean === 'MRB') return 'Mermer (MER)';
    if (clean === 'GNS' || clean === 'GNAYS' || clean === 'GNYS') return 'Gnays (GNS)';
    if (clean === 'FGNS' || clean === 'ALBIT') return 'Felsik Gnays (FGNS)';
    if (clean === 'DST' || clean === 'DASIT') return 'Dasit (DST)';
    if (clean === 'RYL' || clean === 'RIYOLIT') return 'Riyolit (RYL)';
    if (clean === 'IGB' || clean === 'IGNIMBIRIT') return 'İgnimbirit (IGB)';
    if (clean === 'VKT' || clean === 'VSM' || clean === 'VOLKANOSEDIMANTER') return 'Volkanosedimanter (VKT)';
    if (clean === 'UNC') return 'Uyumsuzluk Zonu (UNC)';
    if (clean === 'DYK' || clean === 'DAYK') return 'Dayk (DYK)';
    if (clean === 'KMT' || clean === 'KUM') return 'Kumtaşı (KMT)';
    if (clean === 'DSED' || clean === 'OKSIT' || clean === 'SULFIT') return 'Demirce Zengin (DSED)';
    if (clean === 'ALN' || clean === 'ALUNIT') return 'Alunit Alterasyonu (ALN)';
    if (clean === 'OBS' || clean === 'PERLIT') return 'Perlit / Obsidiyen (OBS)';
    if (clean === 'KMR' || clean === 'KOMUR') return 'Kömür (KMR)';
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
              onClick={() => setShowExportModal(true)}
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
            {/* Feature Selection for Log and Excel Export */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Seçilen Sütun ve Rapor Özellikleri (Selected Features for Export & View)</span>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {ALL_FEATURES.map(f => {
                    const isChecked = selectedFeatures.includes(f.key);
                    return (
                      <label key={f.key} style={{
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
                          onChange={() => handleFeatureToggle(f.key)}
                          style={{ display: 'none' }}
                        />
                        {f.label}
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
            height={Math.max(200, totalDepth * scaleY) + bodyPaddingTop + 40}
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
                <rect width="20" height="20" fill="none" />
                <path d="M 5,2 L 2,5 M 15,12 L 12,15" stroke="#0E7490" strokeWidth="1.5" />
              </pattern>
              {/* Kaolin / KAOLEN (soft yellow texture) */}
              <pattern id="pat-kaolen" width="20" height="20" patternUnits="userSpaceOnUse">
                <rect width="20" height="20" fill="none" />
                <circle cx="5" cy="5" r="1.5" fill="#D9C333" fillOpacity="0.8" />
                <circle cx="15" cy="15" r="1.5" fill="#D9C333" fillOpacity="0.8" />
              </pattern>
              {/* Gneiss / GNAYS (wavy lines on grey) */}
              <pattern id="pat-gnays" width="20" height="20" patternUnits="userSpaceOnUse">
                <rect width="20" height="20" fill="none" />
                <path d="M0,5 Q5,10 10,5 T20,5 M0,15 Q5,20 10,15 T20,15" fill="none" stroke="#15803D" strokeWidth="1.5" />
              </pattern>
              {/* Unconformity / UNC (dashed lines on grey) */}
              <pattern id="pat-unc" width="20" height="20" patternUnits="userSpaceOnUse">
                <rect width="20" height="20" fill="none" />
                <path d="M 0,10 L 20,10" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4,4" />
              </pattern>
              {/* Granite / GRANIT (dots/crosses on pink) */}
              <pattern id="pat-granit" width="20" height="20" patternUnits="userSpaceOnUse">
                <rect width="20" height="20" fill="none" />
                <circle cx="5" cy="5" r="1.5" fill="#B91C1C" />
                <circle cx="15" cy="15" r="1.5" fill="#B91C1C" />
                <line x1="12" y1="4" x2="16" y2="8" stroke="#B91C1C" strokeWidth="1" />
                <line x1="16" y1="4" x2="12" y2="8" stroke="#B91C1C" strokeWidth="1" />
                <line x1="2" y1="12" x2="6" y2="16" stroke="#B91C1C" strokeWidth="1" />
                <line x1="6" y1="12" x2="2" y2="16" stroke="#B91C1C" strokeWidth="1" />
              </pattern>
              {/* Breccia / BRES (rock pieces on grey) */}
              <pattern id="pat-bres" width="25" height="25" patternUnits="userSpaceOnUse">
                <rect width="25" height="25" fill="none" />
                <polygon points="5,2 12,5 8,12 2,7" fill="#701A75" stroke="#E9D5FF" strokeWidth="0.5" />
                <polygon points="18,10 23,15 15,20 14,12" fill="#701A75" stroke="#E9D5FF" strokeWidth="0.5" />
                <polygon points="3,18 9,23 6,24" fill="#4A044E" stroke="#D8B4FE" strokeWidth="0.5" />
              </pattern>
              {/* Quartzite / KUVARSIT (cyan with fine dots) */}
              <pattern id="pat-kuvarsit" width="10" height="10" patternUnits="userSpaceOnUse">
                <rect width="10" height="10" fill="none" />
                <circle cx="3" cy="3" r="1.2" fill="#A1A11A" />
                <circle cx="8" cy="8" r="1.2" fill="#A1A11A" />
              </pattern>
              {/* Andesite / ANDEZIT, AND, TUF (red-brown with V-shapes) */}
              <pattern id="pat-andezit" width="20" height="20" patternUnits="userSpaceOnUse">
                <rect width="20" height="20" fill="none" />
                <path d="M 4,6 L 7,3 L 10,6" fill="none" stroke="#5B21B6" strokeWidth="1.5" />
                <path d="M 12,16 L 15,13 L 18,16" fill="none" stroke="#5B21B6" strokeWidth="1.5" />
              </pattern>
              {/* Basalt / BASALT (dark green with chevrons) */}
              <pattern id="pat-basalt" width="20" height="20" patternUnits="userSpaceOnUse">
                <rect width="20" height="20" fill="none" />
                <path d="M 5,5 L 8,8 L 11,5" fill="none" stroke="#4338CA" strokeWidth="1.5" />
                <path d="M 15,15 L 18,18 L 21,15" fill="none" stroke="#4338CA" strokeWidth="1.5" />
              </pattern>
              {/* Overburden / DOLGU or OB (brown blocks/sand) */}
              <pattern id="pat-dolgu" width="20" height="20" patternUnits="userSpaceOnUse">
                <rect width="20" height="20" fill="none" />
                <circle cx="4" cy="4" r="1.2" fill="#57534E" />
                <circle cx="14" cy="14" r="1.2" fill="#57534E" />
                <line x1="2" y1="18" x2="8" y2="18" stroke="#78716C" strokeWidth="1" />
                <line x1="12" y1="8" x2="18" y2="8" stroke="#78716C" strokeWidth="1" />
              </pattern>
              {/* Schist / SIST (wavy lines on light green) */}
              <pattern id="pat-sist" width="30" height="10" patternUnits="userSpaceOnUse">
                <rect width="30" height="10" fill="none" />
                <path d="M0,5 Q7.5,0 15,5 T30,5" fill="none" stroke="#14532D" strokeWidth="1" />
              </pattern>
              {/* Clay / KIL (orange with horizontal stripes) */}
              <pattern id="pat-kil" width="10" height="10" patternUnits="userSpaceOnUse">
                <rect width="10" height="10" fill="none" />
                <line x1="0" y1="5" x2="10" y2="5" stroke="#D97706" strokeWidth="1" />
              </pattern>
              {/* Calcite/Limestone / KALSIT (light rose bricks) */}
              <pattern id="pat-kalsit" width="20" height="20" patternUnits="userSpaceOnUse">
                <rect width="20" height="20" fill="none" />
                <line x1="0" y1="10" x2="20" y2="10" stroke="#1D4ED8" strokeWidth="0.75" />
                <line x1="0" y1="20" x2="20" y2="20" stroke="#1D4ED8" strokeWidth="0.75" />
                <line x1="10" y1="0" x2="10" y2="10" stroke="#1D4ED8" strokeWidth="0.75" />
                <line x1="20" y1="10" x2="20" y2="20" stroke="#1D4ED8" strokeWidth="0.75" />
                <line x1="0" y1="10" x2="0" y2="20" stroke="#1D4ED8" strokeWidth="0.75" />
              </pattern>
              {/* Dyke / DAYK (diagonal red blocks) */}
              <pattern id="pat-dayk" width="20" height="20" patternUnits="userSpaceOnUse">
                <rect width="20" height="20" fill="none" />
                <line x1="0" y1="0" x2="20" y2="20" stroke="#991B1B" strokeWidth="2" />
                <line x1="20" y1="0" x2="0" y2="20" stroke="#991B1B" strokeWidth="2" />
              </pattern>
              {/* Sand / KUM (yellow with fine dots) */}
              <pattern id="pat-kum" width="10" height="10" patternUnits="userSpaceOnUse">
                <rect width="10" height="10" fill="none" />
                <circle cx="2" cy="2" r="0.8" fill="#B45309" />
                <circle cx="7" cy="7" r="0.8" fill="#B45309" />
              </pattern>
            </defs>

            {/* Background grid */}
            <rect width={svgWidth} height={Math.max(200, totalDepth * scaleY) + bodyPaddingTop + 40} fill="url(#grid-pattern)" />

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
            <line x1={0} y1={0} x2={0} y2={Math.max(200, totalDepth * scaleY) + bodyPaddingTop + 40} stroke="var(--border-light)" strokeWidth="1" />

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
                        {/* Layer 1: MAPEG solid background color */}
                        <rect
                          x={pos.startX + 2}
                          y={y}
                          width={pos.width - 4}
                          height={h}
                          fill={getRockColor(l.rockCode)}
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleBlockClick('Lithology', l.id)}
                          onMouseEnter={() =>
                            setHoverInfo(
                              `Geology: [${l.rockCode}] ${l.from}m-${l.to}m${l.photo ? ' [📷 Photo Attached]' : ''}: ${l.description || 'No description'}`
                            )
                          }
                          onMouseLeave={() => setHoverInfo(null)}
                        />
                        {/* Layer 2: Texture pattern drawn on top with stroke borders */}
                        {patternUrl.startsWith('url(') ? (
                          <rect
                            x={pos.startX + 2}
                            y={y}
                            width={pos.width - 4}
                            height={h}
                            fill={patternUrl}
                            stroke="var(--border-light)"
                            strokeWidth="0.5"
                            style={{ cursor: 'pointer', pointerEvents: 'none' }}
                          />
                        ) : (
                          <rect
                            x={pos.startX + 2}
                            y={y}
                            width={pos.width - 4}
                            height={h}
                            fill="none"
                            stroke="var(--border-light)"
                            strokeWidth="0.5"
                            style={{ cursor: 'pointer', pointerEvents: 'none' }}
                          />
                        )}
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

            {/* NEW: ALTERATION COLUMN */}
            {colPositions['alteration']?.visible && alterations && (
              <g>
                {alterations
                  .filter(alt => alt.to > alt.from)
                  .map(alt => {
                    const pos = colPositions['alteration'];
                    const y = alt.from * scaleY + bodyPaddingTop;
                    const h = (alt.to - alt.from) * scaleY;
                    
                    // Determine fill color based on Alteration Type
                    let fillColor = '#f8fafc'; // light gray/white for YOK
                    let strokeColor = 'var(--border-light)';
                    if (alt.alterationType === 'Arjilik') {
                      fillColor = '#F5EBE6'; // Kil/Arjilik bej/pembe
                    } else if (alt.alterationType === 'Silisleşme') {
                      fillColor = '#E0F2FE'; // Silisleşme soft blue
                    }
                    
                    // Opacity based on Intensity
                    let opacity = 0.8;
                    const intensity = (alt.alterationIntensity || '').toLowerCase();
                    if (intensity.includes('yoğun') || intensity.includes('yogun')) {
                      opacity = 1.0;
                    } else if (intensity.includes('orta')) {
                      opacity = 0.7;
                    } else if (intensity.includes('düşük') || intensity.includes('dusuk')) {
                      opacity = 0.4;
                    } else if (intensity.includes('yok')) {
                      opacity = 0.15;
                    }

                    // Formulate label text
                    const labelText = alt.alterationType !== 'YOK' 
                      ? `${alt.alterationType.substring(0, 5)}. (${alt.alterationIntensity.substring(0, 3)}.)` 
                      : 'YOK';

                    return (
                      <g key={`alt-col-block-${alt.id}`}>
                        <rect
                          x={pos.startX + 2}
                          y={y}
                          width={pos.width - 4}
                          height={h}
                          fill={fillColor}
                          fillOpacity={opacity}
                          stroke={strokeColor}
                          strokeWidth="0.5"
                          style={{ cursor: 'pointer' }}
                          onClick={() => onItemClick?.('Alteration', alt.id)}
                          onMouseEnter={() =>
                            setHoverInfo(
                              `Alteration: ${alt.alterationType || 'YOK'} (${alt.alterationIntensity || 'YOK'}) | Depth: ${alt.from}m - ${alt.to}m`
                            )
                          }
                          onMouseLeave={() => setHoverInfo(null)}
                        />
                        {/* Patterns overlay */}
                        {alt.alterationType === 'Silisleşme' && h > 6 && (
                          <line
                            x1={pos.startX + 2}
                            y1={y}
                            x2={pos.startX + pos.width - 2}
                            y2={y + h}
                            stroke="#ffffff"
                            strokeWidth="1"
                            strokeDasharray="2,2"
                            style={{ pointerEvents: 'none' }}
                          />
                        )}
                        {alt.alterationType === 'Arjilik' && h > 6 && (
                          <circle
                            cx={pos.startX + pos.width / 2}
                            cy={y + h / 2}
                            r="2"
                            fill="#94a3b8"
                            fillOpacity="0.5"
                            style={{ pointerEvents: 'none' }}
                          />
                        )}
                        {/* Text Label */}
                        {h > 12 && (
                          <text
                            x={pos.startX + pos.width / 2}
                            y={y + h / 2 + 3}
                            textAnchor="middle"
                            fill="var(--text-main)"
                            fontSize="8"
                            fontWeight="bold"
                            style={{ pointerEvents: 'none', fontFamily: 'var(--font-display)' }}
                          >
                            {labelText}
                          </text>
                        )}
                      </g>
                    );
                  })}
              </g>
            )}

            {/* NEW: REDOX / OXIDE COLUMN */}
            {colPositions['redox']?.visible && alterations && (
              <g>
                {alterations
                  .filter(alt => alt.to > alt.from)
                  .map(alt => {
                    const pos = colPositions['redox'];
                    const y = alt.from * scaleY + bodyPaddingTop;
                    const h = (alt.to - alt.from) * scaleY;
                    
                    // Determine fill color based on Redox Type
                    let fillColor = '#94a3b8'; // Slate grey fallback
                    if (alt.redoxType === 'OX') {
                      fillColor = '#D97706'; // Lemonite / Hematite Amber
                    } else if (alt.redoxType === 'SUL') {
                      fillColor = '#475569'; // Pyrite Slate Grey
                    } else if (alt.redoxType === 'OX/SUL' || alt.redoxType === 'Transition') {
                      fillColor = '#B45309'; // Transition Ochre/Brown
                    }
                    
                    // Opacity based on oxide intensity
                    let opacity = 0.8;
                    const intensity = (alt.oxideIntensity || '').toLowerCase();
                    if (intensity.includes('yoğun') || intensity.includes('yogun')) {
                      opacity = 1.0;
                    } else if (intensity.includes('orta')) {
                      opacity = 0.7;
                    } else if (intensity.includes('düşük') || intensity.includes('dusuk')) {
                      opacity = 0.45;
                    } else if (intensity.includes('yok')) {
                      opacity = 0.2;
                    }

                    // Formulate label text
                    const labelText = alt.oxideIntensity !== 'YOK' 
                      ? `${alt.redoxType} (${alt.oxideIntensity.substring(0, 3)}.)` 
                      : alt.redoxType;

                    return (
                      <g key={`redox-col-block-${alt.id}`}>
                        <rect
                          x={pos.startX + 2}
                          y={y}
                          width={pos.width - 4}
                          height={h}
                          fill={fillColor}
                          fillOpacity={opacity}
                          stroke="var(--border-light)"
                          strokeWidth="0.5"
                          style={{ cursor: 'pointer' }}
                          onClick={() => onItemClick?.('Alteration', alt.id)}
                          onMouseEnter={() =>
                            setHoverInfo(
                              `Redox: ${alt.redoxType} | Oxide Intensity: ${alt.oxideIntensity || 'YOK'} | Depth: ${alt.from}m - ${alt.to}m`
                            )
                          }
                          onMouseLeave={() => setHoverInfo(null)}
                        />
                        {/* Text Label */}
                        {h > 12 && (
                          <text
                            x={pos.startX + pos.width / 2}
                            y={y + h / 2 + 3}
                            textAnchor="middle"
                            fill="#ffffff"
                            fontSize="8"
                            fontWeight="bold"
                            style={{ pointerEvents: 'none', fontFamily: 'var(--font-display)' }}
                          >
                            {labelText}
                          </text>
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
              const sortedGeotech = [...(geotech || [])]
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
                        y2={Math.max(200, totalDepth * scaleY) + bodyPaddingTop + 40}
                        stroke="var(--border-light)"
                        strokeWidth="0.5"
                        strokeDasharray="2,2"
                      />
                    );
                  })}

                  {/* Subtle background TCR bars */}
                  {selectedFeatures.includes('tcrPercent') && sortedGeotech.map(g => {
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
                  {selectedFeatures.includes('rqdPercent') && points.length > 1 && (
                    <path
                      d={points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')}
                      fill="none"
                      stroke="#ff9800" // Vibrant orange
                      strokeWidth="2"
                    />
                  )}

                  {/* RQD circular markers */}
                  {selectedFeatures.includes('rqdPercent') && points.map(p => (
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
                    const maxValForAnalyte = Math.max(0.1, ...(assays || []).map(item => Number(item[key as keyof AssayState]) || 0));

                    return (
                      <g key={`bar-group-${key}`}>
                        {(assays || [])
                          .filter(a => (a.sampleType === 'Core' || !a.sampleType) && a.to > a.from)
                          .map(a => {
                            const y = a.from * scaleY + bodyPaddingTop;
                            const h = (a.to - a.from) * scaleY;
                            const val = Number(a[key as keyof AssayState]) || 0;
                            const valRatio = Math.min(1, val / maxValForAnalyte);
                            const barWidth = Math.max(2, valRatio * (subColWidth - 6));
                            const isInside = barWidth > 24;
                            const textX = isInside ? subColX + 6 : subColX + 3 + barWidth + 3;
                            const showLabel = h >= 11 && val > 0;
                            const formattedVal = isMetallic ? val.toFixed(2) : `%${val.toFixed(1)}`;

                            return (
                              <g key={`${key}-${a.id}`}>
                                <rect
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
                                {showLabel && (
                                  <text
                                    x={textX}
                                    y={y + h / 2 + 3}
                                    fill={analyteDetails.color}
                                    fontSize="8px"
                                    fontWeight="bold"
                                    pointerEvents="none"
                                    style={{ userSelect: 'none' }}
                                  >
                                    {formattedVal}
                                  </text>
                                )}
                              </g>
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
                    const maxValForAnalyte = Math.max(0.1, ...(assays || []).map(item => Number(item[key as keyof AssayState]) || 0));

                    const points = (assays || [])
                      .filter(a => (a.sampleType === 'Core' || !a.sampleType) && a.to > a.from)
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
                    y2={Math.max(200, totalDepth * scaleY) + bodyPaddingTop + 40}
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
                          y2={Math.max(200, totalDepth * scaleY) + bodyPaddingTop + 40}
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
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', maxWidth: '500px' }}>
              {Array.from(new Set((lithology || []).map(l => l.rockCode).filter(Boolean))).map(code => (
                <div key={code} className="legend-item">
                  <span className="legend-color" style={{ width: '10px', height: '10px', borderRadius: '2px', background: getRockColor(code), display: 'inline-block', border: '1px solid var(--border-medium)' }}></span>
                  <span>{getRockLabel(code)}</span>
                </div>
              ))}
            </div>
          )}
          {(colPositions['geotech']?.visible || colPositions['assays']?.visible) && (
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', borderLeft: '1px solid var(--border-light)', paddingLeft: '10px' }}>
              {colPositions['geotech']?.visible && (
                <>
                  {selectedFeatures.includes('tcrPercent') && (
                    <div className="legend-item"><span className="legend-color" style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#3b82f6', display: 'inline-block' }}></span><span>TCR %</span></div>
                  )}
                  {selectedFeatures.includes('rqdPercent') && (
                    <div className="legend-item"><span className="legend-color" style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#ff9800', display: 'inline-block' }}></span><span>RQD %</span></div>
                  )}
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
          {colPositions['alteration']?.visible && (
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', borderLeft: '1px solid var(--border-light)', paddingLeft: '10px' }}>
              <div className="legend-item"><span className="legend-color" style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#F5EBE6', display: 'inline-block', border: '1px solid var(--border-medium)' }}></span><span>Arjilik</span></div>
              <div className="legend-item"><span className="legend-color" style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#E0F2FE', display: 'inline-block', border: '1px solid var(--border-medium)' }}></span><span>Silisleşme</span></div>
            </div>
          )}
          {colPositions['redox']?.visible && (
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', borderLeft: '1px solid var(--border-light)', paddingLeft: '10px' }}>
              <div className="legend-item"><span className="legend-color" style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#D97706', display: 'inline-block' }}></span><span>OX (Oksit)</span></div>
              <div className="legend-item"><span className="legend-color" style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#475569', display: 'inline-block' }}></span><span>SUL (Sülfid)</span></div>
              <div className="legend-item"><span className="legend-color" style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#B45309', display: 'inline-block' }}></span><span>OX/SUL</span></div>
            </div>
          )}
        </div>
      </div>

      {showExportModal && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(2px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999
        }}>
          <div className="modal-container" style={{
            width: '500px',
            backgroundColor: '#ffffff',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid var(--border-light)',
            overflow: 'hidden'
          }}>
            <div className="modal-header" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 20px',
              backgroundColor: '#fafafa',
              borderBottom: '1px solid var(--border-light)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Download size={18} style={{ color: 'var(--primary)' }} />
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 'bold', margin: 0, color: 'var(--text-main)' }}>
                  Excel Rapor Üst Bilgileri (Header Information)
                </h3>
              </div>
              <button
                className="btn-icon"
                onClick={() => setShowExportModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '0 0 4px 0' }}>
                Excel Sondaj Logunda üst bilgi kısmında yer alacak detayları aşağıdan düzenleyebilirsiniz:
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--text-muted)' }}>Yüklenici Firma</label>
                  <input
                    type="text"
                    value={metaCompany}
                    onChange={e => setMetaCompany(e.target.value)}
                    style={{ padding: '6px 10px', fontSize: '12px', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)' }}
                  />
                </div>

                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--text-muted)' }}>Proje Adı</label>
                  <input
                    type="text"
                    value={metaProject}
                    onChange={e => setMetaProject(e.target.value)}
                    style={{ padding: '6px 10px', fontSize: '12px', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)' }}
                  />
                </div>

                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--text-muted)' }}>İl</label>
                  <input
                    type="text"
                    value={metaCity}
                    onChange={e => setMetaCity(e.target.value)}
                    style={{ padding: '6px 10px', fontSize: '12px', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)' }}
                  />
                </div>

                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--text-muted)' }}>İlçe</label>
                  <input
                    type="text"
                    value={metaDistrict}
                    onChange={e => setMetaDistrict(e.target.value)}
                    style={{ padding: '6px 10px', fontSize: '12px', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)' }}
                  />
                </div>

                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--text-muted)' }}>Mahalle / Köy</label>
                  <input
                    type="text"
                    value={metaVillage}
                    onChange={e => setMetaVillage(e.target.value)}
                    style={{ padding: '6px 10px', fontSize: '12px', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)' }}
                  />
                </div>

                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--text-muted)' }}>Makine Tipi / Metodu</label>
                  <input
                    type="text"
                    value={metaDrillMethod}
                    onChange={e => setMetaDrillMethod(e.target.value)}
                    style={{ padding: '6px 10px', fontSize: '12px', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)' }}
                  />
                </div>

                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--text-muted)' }}>Delgi Çapı</label>
                  <input
                    type="text"
                    value={metaDiameter}
                    onChange={e => setMetaDiameter(e.target.value)}
                    style={{ padding: '6px 10px', fontSize: '12px', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)' }}
                  />
                </div>

                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--text-muted)' }}>Yeraltı Suyu Seviyesi</label>
                  <input
                    type="text"
                    value={metaWaterTable}
                    onChange={e => setMetaWaterTable(e.target.value)}
                    style={{ padding: '6px 10px', fontSize: '12px', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)' }}
                  />
                </div>

                <div className="form-group" style={{ display: 'flex', gridColumn: 'span 2', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--text-muted)' }}>Sondör</label>
                  <input
                    type="text"
                    value={metaDriller}
                    onChange={e => setMetaDriller(e.target.value)}
                    style={{ padding: '6px 10px', fontSize: '12px', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '14px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowExportModal(false)}
                  style={{ fontSize: '11px', padding: '6px 12px' }}
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={async () => {
                    setShowExportModal(false);
                    await handleExportExcel();
                  }}
                  style={{ fontSize: '11px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Download size={12} />
                  Excel Raporunu İndir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
