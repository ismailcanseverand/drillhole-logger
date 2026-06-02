import React, { useState } from 'react';
import type { LithologyState, GeotechState, AssayState } from '../hooks/useDrillholeData';
import { ChevronLeft, ChevronRight, Eye, EyeOff, SlidersHorizontal } from 'lucide-react';

interface ColumnLogProps {
  totalDepth: number;
  lithology: LithologyState[];
  geotech: GeotechState[];
  assays: AssayState[];
  onItemClick?: (tab: string, itemId: string) => void;
}

interface ColumnConfig {
  id: string;
  label: string;
  width: number;
  visible: boolean;
}

const ANALYTES = [
  { key: 'al2o3', label: 'Al2O3 (%)', color: '#3b82f6' },   // Royal Blue
  { key: 'fe2o3', label: 'Fe2O3 (%)', color: '#f43f5e' },   // Rose Red
  { key: 'sio2', label: 'SiO2 (%)', color: '#10b981' },    // Emerald Green
  { key: 'tio2', label: 'TiO2 (%)', color: '#eab308' },    // Amber Yellow
  { key: 'na2o_k2o', label: 'Na2O+K2O (%)', color: '#ec4899' }, // Hot Pink
  { key: 'loi', label: 'LOI / AZ (%)', color: '#a855f7' }  // Purple
];

export const ColumnLog: React.FC<ColumnLogProps> = ({
  totalDepth,
  lithology,
  geotech,
  assays,
  onItemClick,
}) => {
  const [hoverInfo, setHoverInfo] = useState<string | null>(null);
  const [selectedAnalytes, setSelectedAnalytes] = useState<string[]>(['al2o3']);
  const [visualStyle, setVisualStyle] = useState<'bars' | 'line'>('bars');
  const [showConfig, setShowConfig] = useState<boolean>(false);

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
    { id: 'scale', label: 'Scale Ruler', width: 70, visible: true },
    { id: 'lithology', label: 'Lithology', width: 130, visible: true },
    { id: 'geotech', label: 'TCR / RQD', width: 140, visible: true },
    { id: 'assays', label: 'Geochem', width: 180, visible: true },
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
        return '#fde047'; // Sand yellow
      case 'ALBIT':
        return '#ffffff'; // Pure white (feldspar)
      case 'GNAYS':
        return '#94a3b8'; // Slate grey
      case 'ANDEZIT':
      case 'AND':
      case 'TUF':
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
        return '#a7f3d0'; // Schist light green
      case 'GRANIT':
        return '#f472b6'; // Granite pink
      case 'PERLIT':
        return '#d8b4fe'; // Perlite light purple
      case 'KALSIT':
        return '#fda4af'; // Calcite light rose
      case 'KOMUR':
        return '#1e293b'; // Coal dark slate
      case 'BRES':
        return '#a1a1aa'; // Breccia grey
      default:
        return '#cbd5e1'; // Slate grey default
    }
  };



  const getRockPatternUrl = (code: string) => {
    const clean = code.toUpperCase();
    if (clean === 'GNAYS') return 'url(#pat-gnays)';
    if (['GRANIT', 'GNT', 'SUBVOLKANIK', 'SIYENIT', 'GRANODIYORIT', 'RIYOLIT', 'DASIT', 'INTRUZIF'].includes(clean)) return 'url(#pat-granit)';
    if (clean === 'BRES' || clean === 'BXS') return 'url(#pat-bres)';
    if (clean === 'KUVARSIT' || clean === 'QVN') return 'url(#pat-kuvarsit)';
    if (['ANDEZIT', 'AND', 'TUF'].includes(clean)) return 'url(#pat-andezit)';
    if (clean === 'BASALT') return 'url(#pat-basalt)';
    if (clean === 'DOLGU' || clean === 'OB' || clean === 'TOPRAK') return 'url(#pat-dolgu)';
    if (clean === 'SIST') return 'url(#pat-sist)';
    if (clean === 'KIL') return 'url(#pat-kil)';
    if (clean === 'KALSIT') return 'url(#pat-kalsit)';
    return getRockColor(code);
  };

  const getRockLabel = (code: string) => {
    const clean = (code || '').toUpperCase();
    if (clean === 'OB' || clean === 'DOLGU' || clean === 'TOPRAK') return 'Overburden';
    if (clean === 'GRANIT' || clean === 'GNT') return 'Granite';
    if (clean === 'BRES' || clean === 'BXS') return 'Breccia';
    if (clean === 'ANDEZIT' || clean === 'AND' || clean === 'TUF') return 'Andesite';
    if (clean === 'BASALT') return 'Basalt';
    if (clean === 'KUVARSIT' || clean === 'QVN') return 'Quartzite';
    if (clean === 'SIST') return 'Schist';
    if (clean === 'KIL') return 'Clay';
    if (clean === 'KALSIT') return 'Limestone';
    if (clean === 'GNAYS') return 'Gneiss';
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
      <div className="strip-log-header" style={{ borderBottom: '1px solid var(--border-light)', padding: '12px 16px', background: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: 'black', fontFamily: 'var(--font-display)' }}>Column Log View</h3>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowConfig(!showConfig)}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', fontSize: '11px' }}
          >
            <SlidersHorizontal size={12} />
            Configure Columns
          </button>
        </div>

        {/* Dynamic Column Configuration & Settings Panel */}
        {showConfig && (
          <div style={{
            background: '#f8fafc',
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
                  {ANALYTES.map(a => {
                    const isChecked = selectedAnalytes.includes(a.key);
                    return (
                      <label key={a.key} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 8px',
                        background: isChecked ? 'rgba(99, 102, 241, 0.1)' : '#fff',
                        border: `1px solid ${isChecked ? 'var(--primary)' : 'var(--border-medium)'}`,
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
                    background: '#ffffff',
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
                        <ChevronLeft size={14} style={{ color: idx === 0 ? '#cbd5e1' : '#64748b' }} />
                      </button>
                      {/* Move right */}
                      <button
                        disabled={idx === columns.length - 1}
                        onClick={() => moveColumn(idx, 'right')}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        <ChevronRight size={14} style={{ color: idx === columns.length - 1 ? '#cbd5e1' : '#64748b' }} />
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
        <div style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#ffffff', width: svgWidth, flexShrink: 0, paddingTop: '16px', margin: '0 auto' }}>
          <svg
            width={svgWidth}
            height={headerHeight}
            style={{
              background: '#f1f5f9',
              display: 'block',
              border: '1px solid #cbd5e1',
              borderRadius: '4px'
            }}
          >
            {/* Background Rect */}
            <rect width={svgWidth} height={headerHeight} fill="#f1f5f9" />

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
                    stroke="#cbd5e1"
                    strokeWidth="1"
                  />

                  {/* Centered header label */}
                  {col.id === 'assays' ? (
                    selectedAnalytes.map((key, i) => {
                      const analyteDetails = ANALYTES.find(an => an.key === key)!;
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
                              stroke="#cbd5e1"
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
                      fill="#1e293b"
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
            width={svgWidth}
            height={Math.max(200, totalDepth * scaleY) + bodyPaddingTop}
            style={{
              background: 'var(--bg-card)',
              display: 'block',
              border: '1px solid var(--border-light)',
              borderRadius: '4px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
            }}
          >
            {/* Defs for grid and rock patterns */}
            <defs>
              <pattern id="grid-pattern" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="var(--border-light)" strokeWidth="0.5" />
              </pattern>
              {/* Gneiss / GNAYS (wavy lines on grey) */}
              <pattern id="pat-gnays" width="20" height="20" patternUnits="userSpaceOnUse">
                <rect width="20" height="20" fill="#475569" />
                <path d="M0,5 Q5,10 10,5 T20,5 M0,15 Q5,20 10,15 T20,15" fill="none" stroke="#64748b" strokeWidth="1.5" />
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
                    const analyteDetails = ANALYTES.find(an => an.key === key)!;
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
                                  setHoverInfo(`Assay Sample [${a.sampleId}] ${a.from}m-${a.to}m | ${analyteDetails.label.split(' ')[0]}: ${val.toFixed(2)}%`);
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
                    const analyteDetails = ANALYTES.find(an => an.key === key)!;
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
                              setHoverInfo(`Assay Sample [${p.sampleId}] at ${p.depth} | ${analyteDetails.label.split(' ')[0]}: ${p.value.toFixed(2)}%`)
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
                    stroke="#cbd5e1"
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
                          stroke="#cbd5e1"
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
      <div className="strip-log-legend" style={{ borderTop: '1px solid var(--border-light)', padding: '12px 16px', background: '#fff' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 14px', alignItems: 'center' }}>
          <div style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', width: '100%', marginBottom: '2px' }}>Legend Keys</div>

          {colPositions['lithology']?.visible && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', maxWidth: '400px' }}>
              <div className="legend-item"><span className="legend-color" style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#94a3b8', display: 'inline-block' }}></span><span>GNAYS</span></div>
              <div className="legend-item"><span className="legend-color" style={{ width: '10px', height: '10px', borderRadius: '2px', border: '1px solid #cbd5e1', background: '#ffffff', display: 'inline-block' }}></span><span>ALBIT</span></div>
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
                  const analyteDetails = ANALYTES.find(an => an.key === key)!;
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
