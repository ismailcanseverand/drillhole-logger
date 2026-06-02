import React, { useState, useEffect } from 'react';
import type { CollarState } from '../hooks/useDrillholeData';
import { Compass, Anchor, User, Calendar, Edit3 } from 'lucide-react';
import type { ValidationError } from '../utils/validation';

interface CollarTabProps {
  collar: CollarState;
  setCollar: React.Dispatch<React.SetStateAction<CollarState>>;
  errors: ValidationError[];
  onRenameHole: (oldHoleId: string, newHoleId: string) => Promise<boolean>;
}

export const CollarTab: React.FC<CollarTabProps> = ({ collar, setCollar, errors, onRenameHole }) => {
  const [localHoleId, setLocalHoleId] = useState(collar.holeId);

  useEffect(() => {
    setLocalHoleId(collar.holeId);
  }, [collar.holeId]);

  const handleRenameSubmit = async () => {
    const trimmed = localHoleId.trim().toUpperCase();
    if (!trimmed) {
      setLocalHoleId(collar.holeId);
      return;
    }
    if (trimmed === collar.holeId) {
      return;
    }
    const success = await onRenameHole(collar.holeId, trimmed);
    if (!success) {
      setLocalHoleId(collar.holeId); // Reset back to original if failed
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Auto convert numbers
    const numericFields = ['easting', 'northing', 'elevation', 'totalDepth', 'dip', 'azimuth'];
    setCollar(prev => ({
      ...prev,
      [name]: numericFields.includes(name) ? (value === '' ? 0 : parseFloat(value)) : value
    }));
  };

  const getFieldError = (fieldName: string) => {
    const err = errors.find(e => e.tab === 'Collar' && e.field === fieldName);
    return err ? err.message : null;
  };

  return (
    <div className="collar-tab-container">
      <div className="section-title">
        <Anchor size={20} className="title-icon" />
        <h2>Drillhole Collar Details</h2>
      </div>

      <div className="collar-form-grid">
        {/* Core details card */}
        <div className="form-card">
          <div className="card-header">
            <h3>Identity & Status</h3>
          </div>
          <div className="card-body">
            <div className="form-group">
              <label htmlFor="holeId" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Edit3 size={12} /> Hole ID (Editable)
              </label>
              <input
                type="text"
                id="holeId"
                name="holeId"
                value={localHoleId}
                onChange={e => setLocalHoleId(e.target.value)}
                onBlur={handleRenameSubmit}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    handleRenameSubmit();
                  }
                }}
                className={getFieldError('holeId') ? 'input-error' : ''}
                style={{ fontWeight: 'bold', color: 'var(--primary)' }}
                placeholder="e.g. CYHN-33"
              />
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
                Press Enter or click away to rename the drillhole.
              </span>
              {getFieldError('holeId') && <span className="field-error-msg">{getFieldError('holeId')}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="status">Drilling Status</label>
              <select id="status" name="status" value={collar.status} onChange={handleChange}>
                <option value="Planned">Planned</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="logger">
                <User size={14} style={{ marginRight: '4px', display: 'inline-block', verticalAlign: 'middle' }} />
                Logger / Geologist
              </label>
              <select id="logger" name="logger" value={collar.logger || ''} onChange={handleChange}>
                {!["İsmailcan SEVER", "Altan COŞKUN", "Levent CAN", "Mehmet KOLDANCI", "Muhammed KAYALIDAĞ", "Mustafa KAŞ", "Emir Özçakıcı"].includes(collar.logger) && collar.logger && (
                  <option value={collar.logger}>{collar.logger}</option>
                )}
                <option value="">Select Logger</option>
                <option value="İsmailcan SEVER">İsmailcan SEVER</option>
                <option value="Altan COŞKUN">Altan COŞKUN</option>
                <option value="Levent CAN">Levent CAN</option>
                <option value="Mehmet KOLDANCI">Mehmet KOLDANCI</option>
                <option value="Muhammed KAYALIDAĞ">Muhammed KAYALIDAĞ</option>
                <option value="Mustafa KAŞ">Mustafa KAŞ</option>
                <option value="Emir Özçakıcı">Emir Özçakıcı</option>
              </select>
            </div>
          </div>
        </div>

        {/* Spatial metrics card */}
        <div className="form-card">
          <div className="card-header">
            <h3>Coordinates & Dimensions</h3>
          </div>
          <div className="card-body">
            <div className="form-row">
              <div className="form-group col">
                <label htmlFor="easting">Easting (X)</label>
                <input
                  type="number"
                  step="0.01"
                  id="easting"
                  name="easting"
                  value={collar.easting || ''}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group col">
                <label htmlFor="northing">Northing (Y)</label>
                <input
                  type="number"
                  step="0.01"
                  id="northing"
                  name="northing"
                  value={collar.northing || ''}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group col">
                <label htmlFor="elevation">Elevation / RL (Z)</label>
                <input
                  type="number"
                  step="0.01"
                  id="elevation"
                  name="elevation"
                  value={collar.elevation || ''}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group col">
                <label htmlFor="totalDepth">Total Depth (m)</label>
                <input
                  type="number"
                  step="0.1"
                  id="totalDepth"
                  name="totalDepth"
                  value={collar.totalDepth || ''}
                  onChange={handleChange}
                  className={getFieldError('totalDepth') ? 'input-error' : ''}
                />
                {getFieldError('totalDepth') && <span className="field-error-msg">{getFieldError('totalDepth')}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Orientation card */}
        <div className="form-card">
          <div className="card-header">
            <h3>Initial Orientation</h3>
          </div>
          <div className="card-body">
            <div className="form-row">
              <div className="form-group col">
                <label htmlFor="dip">
                  <Compass size={14} style={{ marginRight: '4px', display: 'inline-block', verticalAlign: 'middle' }} />
                  Dip (°)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="-90"
                  max="90"
                  id="dip"
                  name="dip"
                  value={collar.dip ?? ''}
                  onChange={handleChange}
                  className={getFieldError('dip') ? 'input-error' : ''}
                />
                <span className="field-hint">Horizontal = 0, Straight Down = -90</span>
                {getFieldError('dip') && <span className="field-error-msg">{getFieldError('dip')}</span>}
              </div>

              <div className="form-group col">
                <label htmlFor="azimuth">Azimuth (°)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="360"
                  id="azimuth"
                  name="azimuth"
                  value={collar.azimuth ?? ''}
                  onChange={handleChange}
                  className={getFieldError('azimuth') ? 'input-error' : ''}
                />
                <span className="field-hint">True North = 0, East = 90</span>
                {getFieldError('azimuth') && <span className="field-error-msg">{getFieldError('azimuth')}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Time schedule card */}
        <div className="form-card">
          <div className="card-header">
            <h3>Schedule Dates</h3>
          </div>
          <div className="card-body">
            <div className="form-group">
              <label htmlFor="dateStarted">
                <Calendar size={14} style={{ marginRight: '4px', display: 'inline-block', verticalAlign: 'middle' }} />
                Date Started
              </label>
              <input
                type="date"
                id="dateStarted"
                name="dateStarted"
                value={collar.dateStarted}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="dateCompleted">Date Completed</label>
              <input
                type="date"
                id="dateCompleted"
                name="dateCompleted"
                value={collar.dateCompleted}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
