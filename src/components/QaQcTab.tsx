import React, { useState } from 'react';
import type { AssayState } from '../hooks/useDrillholeData';
import { ShieldCheck, AlertTriangle } from 'lucide-react';

interface QaQcTabProps {
  assays: AssayState[];
}

export const QaQcTab: React.FC<QaQcTabProps> = ({ assays }) => {
  // Certified Reference Material (CRM) configuration for Kaolin/Clay
  // Expected Al2O3 % and standard deviation
  const [crmExpected] = useState({ al2o3: 20.00, sd: 0.40 });

  // Filter CRM standards
  const standards = assays
    .filter(a => a.sampleType === 'Standard' || a.sampleId.toUpperCase().includes('CRM'))
    .map((s, index) => ({
      index: index + 1,
      sampleId: s.sampleId,
      value: s.al2o3,
      status: Math.abs(s.al2o3 - crmExpected.al2o3) > 3 * crmExpected.sd 
        ? 'fail' 
        : Math.abs(s.al2o3 - crmExpected.al2o3) > 2 * crmExpected.sd 
        ? 'warning' 
        : 'pass'
    }));

  // Filter Blanks (monitoring Fe2O3 staining contaminant)
  const blanks = assays
    .filter(a => a.sampleType === 'Blank' || a.sampleId.toUpperCase().includes('BLK'))
    .map(b => ({
      sampleId: b.sampleId,
      value: b.fe2o3,
      passed: b.fe2o3 <= 0.35 // typical Fe2O3 limit for high quality kaolin is 0.35%
    }));

  // Filter Duplicates and match them by matching depth intervals
  const duplicatePairs: Array<{ depth: string; originalId: string; duplicateId: string; valOrig: number; valDup: number; rpd: number }> = [];
  
  const originals = assays.filter(a => a.sampleType === 'Core');
  const dups = assays.filter(a => a.sampleType === 'Duplicate');

  dups.forEach(dup => {
    const original = originals.find(orig => Math.abs(orig.from - dup.from) < 0.1 && Math.abs(orig.to - dup.to) < 0.1);
    if (original) {
      const avg = (original.al2o3 + dup.al2o3) / 2;
      const rpd = avg > 0 ? (Math.abs(original.al2o3 - dup.al2o3) / avg) * 100 : 0;
      duplicatePairs.push({
        depth: `${original.from}m - ${original.to}m`,
        originalId: original.sampleId,
        duplicateId: dup.sampleId,
        valOrig: original.al2o3,
        valDup: dup.al2o3,
        rpd: parseFloat(rpd.toFixed(2))
      });
    }
  });

  // SVG Chart dimensions for Standard Control Chart
  const chartWidth = 500;
  const chartHeight = 220;
  const padding = 30;

  const yMin = crmExpected.al2o3 - 4 * crmExpected.sd;
  const yMax = crmExpected.al2o3 + 4 * crmExpected.sd;

  const mapY = (val: number) => {
    const ratio = (val - yMin) / (yMax - yMin);
    return chartHeight - padding - ratio * (chartHeight - 2 * padding);
  };

  const mapX = (idx: number, total: number) => {
    if (total <= 1) return chartWidth / 2;
    return padding + (idx / (total - 1)) * (chartWidth - 2 * padding);
  };

  return (
    <div className="qaqc-tab-container">
      <div className="section-title">
        <ShieldCheck size={20} className="title-icon" />
        <h2>QA/QC Analytical Dashboard</h2>
      </div>

      <div className="qaqc-grid">
        {/* Shewhart Control Chart Card */}
        <div className="qaqc-card">
          <div className="card-header">
            <h3>CRM Control Chart (Al₂O₃ %)</h3>
            <span className="subtitle">Expected: {crmExpected.al2o3.toFixed(2)}% (±{crmExpected.sd}% SD)</span>
          </div>
          <div className="card-body">
            {standards.length === 0 ? (
              <div className="empty-panel">No Standard samples logged yet.</div>
            ) : (
              <div className="chart-wrapper">
                <svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
                  {/* Mean line */}
                  <line x1={padding} y1={mapY(crmExpected.al2o3)} x2={chartWidth - padding} y2={mapY(crmExpected.al2o3)} stroke="#059669" strokeWidth="1.5" />
                  
                  {/* +/- 2 SD Warning Limits */}
                  <line x1={padding} y1={mapY(crmExpected.al2o3 + 2 * crmExpected.sd)} x2={chartWidth - padding} y2={mapY(crmExpected.al2o3 + 2 * crmExpected.sd)} stroke="#d97706" strokeWidth="1" strokeDasharray="4,4" />
                  <line x1={padding} y1={mapY(crmExpected.al2o3 - 2 * crmExpected.sd)} x2={chartWidth - padding} y2={mapY(crmExpected.al2o3 - 2 * crmExpected.sd)} stroke="#d97706" strokeWidth="1" strokeDasharray="4,4" />

                  {/* +/- 3 SD Fail Limits */}
                  <line x1={padding} y1={mapY(crmExpected.al2o3 + 3 * crmExpected.sd)} x2={chartWidth - padding} y2={mapY(crmExpected.al2o3 + 3 * crmExpected.sd)} stroke="#dc2626" strokeWidth="1" strokeDasharray="2,2" />
                  <line x1={padding} y1={mapY(crmExpected.al2o3 - 3 * crmExpected.sd)} x2={chartWidth - padding} y2={mapY(crmExpected.al2o3 - 3 * crmExpected.sd)} stroke="#dc2626" strokeWidth="1" strokeDasharray="2,2" />

                  {/* Limits Text Labels */}
                  <text x={chartWidth - padding + 5} y={mapY(crmExpected.al2o3) + 4} fill="#059669" fontSize="9" textAnchor="start">Mean</text>
                  <text x={chartWidth - padding + 5} y={mapY(crmExpected.al2o3 + 2 * crmExpected.sd) + 4} fill="#d97706" fontSize="9" textAnchor="start">+2SD</text>
                  <text x={chartWidth - padding + 5} y={mapY(crmExpected.al2o3 - 2 * crmExpected.sd) + 4} fill="#d97706" fontSize="9" textAnchor="start">-2SD</text>
                  <text x={chartWidth - padding + 5} y={mapY(crmExpected.al2o3 + 3 * crmExpected.sd) + 4} fill="#dc2626" fontSize="9" textAnchor="start">+3SD</text>
                  <text x={chartWidth - padding + 5} y={mapY(crmExpected.al2o3 - 3 * crmExpected.sd) + 4} fill="#dc2626" fontSize="9" textAnchor="start">-3SD</text>

                  {/* Data Path */}
                  {standards.length > 1 && (
                    <path
                      d={standards.map((s, idx) => `${idx === 0 ? 'M' : 'L'} ${mapX(idx, standards.length)} ${mapY(s.value)}`).join(' ')}
                      fill="none"
                      stroke="#4f46e5"
                      strokeWidth="2"
                    />
                  )}

                  {/* Data Points */}
                  {standards.map((s, idx) => (
                    <g key={s.sampleId}>
                      <circle
                        cx={mapX(idx, standards.length)}
                        cy={mapY(s.value)}
                        r="5"
                        fill={s.status === 'fail' ? '#dc2626' : s.status === 'warning' ? '#d97706' : '#4f46e5'}
                      />
                      <title>{`Sample ID: ${s.sampleId}\nAl2O3: ${s.value.toFixed(2)}%`}</title>
                      <text x={mapX(idx, standards.length)} y={mapY(s.value) - 8} fill="#1e293b" fontSize="8" textAnchor="middle">{s.sampleId}</text>
                    </g>
                  ))}
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* Blanks Verification Card */}
        <div className="qaqc-card">
          <div className="card-header">
            <h3>Blank Sample Verification (Fe₂O₃ %)</h3>
            <span className="subtitle">Threshold: &le; 0.35% (Fe₂O₃)</span>
          </div>
          <div className="card-body">
            {blanks.length === 0 ? (
              <div className="empty-panel">No Blank samples logged yet.</div>
            ) : (
              <div className="table-responsive">
                <table className="qaqc-table">
                  <thead>
                    <tr>
                      <th>Sample ID</th>
                      <th>Measured Fe₂O₃ (%)</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {blanks.map((b, i) => (
                      <tr key={`${b.sampleId}-${i}`}>
                        <td>{b.sampleId}</td>
                        <td style={{ fontWeight: 'bold' }}>{b.value.toFixed(2)}%</td>
                        <td>
                          <span className={`badge ${b.passed ? 'badge-success' : 'badge-danger'}`}>
                            {b.passed ? 'Passed (Low Iron)' : 'FAILED (Stained)'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Duplicates Correlation Panel */}
        <div className="qaqc-card full-width">
          <div className="card-header">
            <h3>Field Duplicates Analysis (Al₂O₃ %)</h3>
            <span className="subtitle">RPD (Relative Percent Difference) Limit: 10%</span>
          </div>
          <div className="card-body">
            {duplicatePairs.length === 0 ? (
              <div className="empty-panel">No duplicate pairs identified yet. Log core assays and matching duplicate type samples at same intervals to correlate.</div>
            ) : (
              <div className="table-responsive">
                <table className="qaqc-table">
                  <thead>
                    <tr>
                      <th>Interval Depth</th>
                      <th>Original ID</th>
                      <th>Orig Al₂O₃ (%)</th>
                      <th>Duplicate ID</th>
                      <th>Dup Al₂O₃ (%)</th>
                      <th>RPD %</th>
                      <th>Verdict</th>
                    </tr>
                  </thead>
                  <tbody>
                    {duplicatePairs.map((pair, idx) => {
                      const failed = pair.rpd > 10;
                      return (
                        <tr key={idx}>
                          <td>{pair.depth}</td>
                          <td>{pair.originalId}</td>
                          <td>{pair.valOrig.toFixed(2)}%</td>
                          <td>{pair.duplicateId}</td>
                          <td>{pair.valDup.toFixed(2)}%</td>
                          <td style={{ fontWeight: 'bold', color: failed ? '#dc2626' : '#059669' }}>
                            {pair.rpd}%
                          </td>
                          <td>
                            {failed ? (
                              <span className="badge badge-danger flex-badge">
                                <AlertTriangle size={10} style={{ marginRight: '4px' }} /> High Var
                              </span>
                            ) : (
                              <span className="badge badge-success">Acceptable</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
