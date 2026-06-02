import React, { useState, useEffect } from 'react';
import { getSupabaseClient, isSupabaseConfigured } from '../utils/supabaseClient';
import { X, CheckCircle, AlertCircle, RefreshCw, Database, CloudUpload } from 'lucide-react';
import { serializePhotoIntoDescription } from '../hooks/useDrillholeData';

interface DatabaseSettingsProps {
  onClose: () => void;
  db: Record<string, any>;
}

export const DatabaseSettings: React.FC<DatabaseSettingsProps> = ({
  onClose,
  db
}) => {
  const [url, setUrl] = useState(localStorage.getItem('sb_url') || (import.meta.env.VITE_SUPABASE_URL as string) || '');
  const [key, setKey] = useState(localStorage.getItem('sb_key') || (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '');
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [migrating, setMigrating] = useState(false);

  useEffect(() => {
    if (isSupabaseConfigured()) {
      setConnectionStatus('success');
      setStatusMessage('Connected to Supabase successfully.');
    }
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnectionStatus('testing');
    setStatusMessage('Testing connection...');

    // Temporarily save to local storage to check connection
    localStorage.setItem('sb_url', url.trim());
    localStorage.setItem('sb_key', key.trim());

    const client = getSupabaseClient();
    if (!client) {
      setConnectionStatus('failed');
      setStatusMessage('Invalid credentials format.');
      localStorage.removeItem('sb_url');
      localStorage.removeItem('sb_key');
      return;
    }

    try {
      // Test the connection by selecting from collars table
      const { error } = await client.from('collars').select('hole_id').limit(1);
      
      if (error) {
        throw error;
      }

      setConnectionStatus('success');
      setStatusMessage('Connection verified. Database connected successfully!');
      setTimeout(() => {
        window.location.reload(); // Reload to refresh client instances across hooks
      }, 1000);
    } catch (err: any) {
      setConnectionStatus('failed');
      setStatusMessage(`Connection failed: ${err.message || 'Check URL and Anon key API settings.'}`);
      localStorage.removeItem('sb_url');
      localStorage.removeItem('sb_key');
    }
  };

  const handleDisconnect = () => {
    if (window.confirm('Disconnect from Supabase? Edits will fall back to LocalStorage (Offline Mode).')) {
      localStorage.removeItem('sb_url');
      localStorage.removeItem('sb_key');
      setUrl('');
      setKey('');
      setConnectionStatus('idle');
      setStatusMessage('Disconnected. Operating in Offline Mode.');
      setTimeout(() => {
        window.location.reload();
      }, 800);
    }
  };

  const handleBulkImport = async () => {
    const client = getSupabaseClient();
    if (!client) {
      alert('Please connect database first.');
      return;
    }

    if (!window.confirm('Import all 986 Excel drillholes and logs to Supabase? This will overwrite existing records with the original Excel data.')) {
      return;
    }

    setMigrating(true);
    setConnectionStatus('testing'); // show spinner
    
    try {
      setStatusMessage('Preparing data arrays from Excel compilation...');
      const allCollars: any[] = [];
      const allSurveys: any[] = [];
      const allLithologies: any[] = [];
      const allGeotechs: any[] = [];
      const allAssays: any[] = [];

      Object.entries(db).forEach(([holeId, data]: [string, any]) => {
        // 1. Collar
        const c = data.collar;
        allCollars.push({
          hole_id: holeId,
          easting: c.easting,
          northing: c.northing,
          elevation: c.elevation,
          total_depth: c.totalDepth,
          dip: c.dip,
          azimuth: c.azimuth,
          date_started: c.dateStarted || '',
          date_completed: c.dateCompleted || '',
          logger: c.logger || '',
          status: c.status || 'Completed'
        });

        // 2. Surveys
        if (data.surveys) {
          data.surveys.forEach((s: any) => {
            allSurveys.push({
              id: s.id.startsWith(holeId) ? s.id : `${holeId}_${s.id}`,
              hole_id: holeId,
              depth: s.depth,
              dip: s.dip,
              azimuth: s.azimuth
            });
          });
        }

        // 3. Lithologies
        if (data.lithology) {
          data.lithology.forEach((l: any) => {
            allLithologies.push({
              id: l.id.startsWith(holeId) ? l.id : `${holeId}_${l.id}`,
              hole_id: holeId,
              from_depth: l.from,
              to_depth: l.to,
              rock_code: l.rockCode,
              alteration: l.alteration || '',
              mineralization: l.mineralization || '',
              description: serializePhotoIntoDescription(l.description || '', l.photo)
            });
          });
        }

        // 4. Geotechs
        if (data.geotech) {
          data.geotech.forEach((g: any) => {
            allGeotechs.push({
              id: g.id.startsWith(holeId) ? g.id : `${holeId}_${g.id}`,
              hole_id: holeId,
              from_depth: g.from,
              to_depth: g.to,
              drilled_length: g.drilledLength,
              recovered_length: g.recoveredLength,
              solid_pieces_over_10cm: g.solidPiecesOver10cm,
              tcr_percent: g.tcrPercent,
              rqd_percent: g.rqdPercent
            });
          });
        }

        // 5. Assays
        if (data.assays) {
          data.assays.forEach((a: any) => {
            allAssays.push({
              id: a.id.startsWith(holeId) ? a.id : `${holeId}_${a.id}`,
              hole_id: holeId,
              sample_id: a.sampleId,
              from_depth: a.from,
              to_depth: a.to,
              sample_type: a.sampleType || 'Core',
              al2o3: a.al2o3 || 0,
              fe2o3: a.fe2o3 || 0,
              sio2: a.sio2 || 0,
              tio2: a.tio2 || 0,
              na2o_k2o: a.na2o_k2o || 0,
              loi: a.loi || 0,
              au_ppb: a.au_ppb || 0,
              au_ppm: a.au_ppm || 0,
              ag_ppm: a.ag_ppm || 0,
              cu_ppm: a.cu_ppm || 0,
              pb_ppm: a.pb_ppm || 0,
              zn_ppm: a.zn_ppm || 0,
              as_ppm: a.as_ppm || 0
            });
          });
        }
      });

      const uploadInChunks = async (tableName: string, dataArray: any[], chunkSize: number = 1000) => {
        for (let i = 0; i < dataArray.length; i += chunkSize) {
          const chunk = dataArray.slice(i, i + chunkSize);
          const { error } = await client.from(tableName).upsert(chunk);
          if (error) throw error;
        }
      };

      // Execute upserts sequentially in chunks
      setStatusMessage(`Syncing Collars (986 records)...`);
      await uploadInChunks('collars', allCollars, 500);

      setStatusMessage(`Syncing Surveys (${allSurveys.length} records)...`);
      await uploadInChunks('surveys', allSurveys, 1000);

      setStatusMessage(`Syncing Lithologies (${allLithologies.length} records)...`);
      await uploadInChunks('lithologies', allLithologies, 1000);

      setStatusMessage(`Syncing Geotechnical TCR/RQD (${allGeotechs.length} records)...`);
      await uploadInChunks('geotechs', allGeotechs, 1000);

      setStatusMessage(`Syncing Assays (${allAssays.length} records)...`);
      await uploadInChunks('assays', allAssays, 1000);

      setConnectionStatus('success');
      setStatusMessage('Bulk import complete! All 986 drillholes synced successfully.');
    } catch (err: any) {
      console.error(err);
      setConnectionStatus('failed');
      setStatusMessage(`Bulk sync failed: ${err.message || 'Check database permissions.'}`);
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="modal-overlay" style={modalOverlayStyle}>
      <div className="modal-container" style={modalContainerStyle}>
        <div className="modal-header" style={modalHeaderStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={18} style={{ color: 'var(--primary)' }} />
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 'bold' }}>Supabase Connection Settings</h3>
          </div>
          <button className="btn-icon" onClick={onClose} style={{ background: 'transparent' }}><X size={16} /></button>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '20px' }}>
          <div className="form-group">
            <label style={{ fontSize: '10px' }}>Supabase Project URL</label>
            <input
              type="url"
              required
              placeholder="https://your-project.supabase.co"
              value={url}
              onChange={e => setUrl(e.target.value)}
              disabled={connectionStatus === 'success'}
            />
          </div>

          <div className="form-group">
            <label style={{ fontSize: '10px' }}>Anon Public API Key</label>
            <input
              type="password"
              required
              placeholder="eyJhbGciOi..."
              value={key}
              onChange={e => setKey(e.target.value)}
              disabled={connectionStatus === 'success'}
            />
          </div>

          {statusMessage && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px',
              fontSize: '11px',
              fontWeight: 600,
              borderRadius: 'var(--radius-sm)',
              backgroundColor: connectionStatus === 'success' ? 'var(--success-light)' : connectionStatus === 'failed' ? 'var(--danger-light)' : '#f1f5f9',
              color: connectionStatus === 'success' ? 'var(--success)' : connectionStatus === 'failed' ? 'var(--danger)' : 'var(--text-secondary)'
            }}>
              {connectionStatus === 'success' ? <CheckCircle size={14} /> : connectionStatus === 'failed' ? <AlertCircle size={14} /> : <RefreshCw className="animate-spin" size={14} style={{ animation: 'spin 1s linear infinite' }} />}
              <span>{statusMessage}</span>
            </div>
          )}

          {connectionStatus === 'success' && (
            <div style={{
              marginTop: '10px',
              padding: '14px',
              border: '1px dashed var(--border-medium)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: '#fafafa',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <h4 style={{ fontSize: '12px', fontWeight: 'bold', margin: 0, color: 'var(--text-main)' }}>Historical Data Synchronization</h4>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>
                Upload all 986 drillholes compile logs (assays, lithologies, surveys, geotechs) to your Supabase instance.
              </p>
              <button
                type="button"
                className="btn btn-success btn-sm"
                onClick={handleBulkImport}
                disabled={migrating}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  width: '100%',
                  marginTop: '4px'
                }}
              >
                {migrating ? (
                  <RefreshCw className="animate-spin" size={14} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <CloudUpload size={14} />
                )}
                {migrating ? 'Syncing Excel Compilation...' : 'Upload All Excel Data to Supabase (986 holes)'}
              </button>
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', marginTop: '10px', justifyContent: 'flex-end' }}>
            {connectionStatus === 'success' ? (
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={handleDisconnect}
              >
                Disconnect Settings
              </button>
            ) : (
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={connectionStatus === 'testing'}
              >
                Connect & Verify API
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

// Simple inline styles to support overlay
const modalOverlayStyle: React.CSSProperties = {
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
  zIndex: 100
};

const modalContainerStyle: React.CSSProperties = {
  width: '450px',
  backgroundColor: '#ffffff',
  borderRadius: 'var(--radius-md)',
  boxShadow: 'var(--shadow-lg)',
  border: '1px solid var(--border-light)',
  overflow: 'hidden'
};

const modalHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 20px',
  backgroundColor: '#fafafa',
  borderBottom: '1px solid var(--border-light)'
};
