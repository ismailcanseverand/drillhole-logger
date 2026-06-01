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
  { key: 'al2o3', label: 'Al2O3 (%)', color: '#6366f1' },
  { key: 'fe2o3', label: 'Fe2O3 (%)', color: '#f43f5e' },
  { key: 'sio2', label: 'SiO2 (%)', color: '#10b981' },
  { key: 'tio2', label: 'TiO2 (%)', color: '#06b6d4' },
  { key: 'na2o_k2o', label: 'Na2O+K2O (%)', color: '#ec4899' },
  { key: 'loi', label: 'LOI / AZ (%)', color: '#8b5cf6' }
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
    { id: 'scale', label: 'Scale Ruler', width: 55, visible: true },
    { id: 'lithology', label: 'Lithology', width: 65, visible: true },
    { id: 'geotech', label: 'TCR / RQD', width: 90, visible: true },
    { id: 'assays', label: 'Geochem', width: 110, visible: true },
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
        width = Math.max(100, selectedAnalytes.length * 65);
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

  const getRqdColor = (rqd: number) => {
    if (rqd < 50) return '#ef4444'; // Red
    if (rqd < 75) return '#f59e0b'; // Orange
    return '#10b981'; // Green
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
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', fontFamily: 'var(--font-display)' }}>Column Log View</h3>
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
              background: '#f8fafc', 
              display: 'block', 
              border: '1px solid #cbd5e1',
              borderRadius: '4px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
            }}
          >
            {/* Defs for grid patterns */}
            <defs>
              <pattern id="grid-pattern" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#f1f5f9" strokeWidth="0.5" />
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
                    stroke="#e2e8f0"
                    strokeWidth="1"
                  />
                </g>
              ))}
            </g>

            {/* Left vertical border line */}
            <line x1={0} y1={0} x2={0} y2={Math.max(200, totalDepth * scaleY) + bodyPaddingTop} stroke="#cbd5e1" strokeWidth="1" />

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
                    const color = getRockColor(l.rockCode);
                    return (
                      <rect
                        key={l.id}
                        x={pos.startX + 2}
                        y={y}
                        width={pos.width - 4}
                        height={h}
                        fill={color}
                        stroke="#ffffff"
                        strokeWidth="0.5"
                        style={{ cursor: 'pointer', opacity: 0.85 }}
                        onClick={() => handleBlockClick('Lithology', l.id)}
                        onMouseEnter={() =>
                          setHoverInfo(
                            `Geology: [${l.rockCode}] ${l.from}m-${l.to}m: ${l.description || 'No description'}`
                          )
                        }
                        onMouseLeave={() => setHoverInfo(null)}
                      />
                    );
                  })}
              </g>
            )}

            {/* 3. GEOTECH TCR & RQD Recovery Bars */}
            {colPositions['geotech']?.visible && (
              <g>
                {geotech
                  .filter(g => g.to > g.from)
                  .map(g => {
                    const pos = colPositions['geotech'];
                    const y = g.from * scaleY + bodyPaddingTop;
                    const h = (g.to - g.from) * scaleY;
                    
                    const colWidth = pos.width;
                    const tcrWidth = (colWidth / 2) - 3;
                    const rqdWidth = (colWidth / 2) - 3;

                    const tcrBarWidth = Math.max(1, tcrWidth * (g.tcrPercent / 100));
                    const rqdBarWidth = Math.max(1, rqdWidth * (g.rqdPercent / 100));

                    return (
                      <g
                        key={g.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleBlockClick('TCR / RQD', g.id)}
                        onMouseEnter={() =>
                          setHoverInfo(
                            `Geotech run: ${g.from}m-${g.to}m | TCR: ${g.tcrPercent}% | RQD: ${g.rqdPercent}%`
                          )
                        }
                        onMouseLeave={() => setHoverInfo(null)}
                      >
                        {/* TCR bar background */}
                        <rect
                          x={pos.startX + 2}
                          y={y}
                          width={tcrWidth}
                          height={h}
                          fill="#e2e8f0"
                          stroke="#ffffff"
                          strokeWidth="0.5"
                        />
                        {/* TCR filled bar */}
                        <rect
                          x={pos.startX + 2}
                          y={y}
                          width={tcrBarWidth}
                          height={h}
                          fill="#3b82f6"
                        />

                        {/* RQD bar background */}
                        <rect
                          x={pos.startX + (colWidth / 2) + 1}
                          y={y}
                          width={rqdWidth}
                          height={h}
                          fill="#e2e8f0"
                          stroke="#ffffff"
                          strokeWidth="0.5"
                        />
                        {/* RQD filled bar */}
                        <rect
                          x={pos.startX + (colWidth / 2) + 1}
                          y={y}
                          width={rqdBarWidth}
                          height={h}
                          fill={getRqdColor(g.rqdPercent)}
                        />
                      </g>
                    );
                  })}
              </g>
            )}

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
                                fillOpacity={0.7}
                                stroke={analyteDetails.color}
                                strokeWidth="0.75"
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
