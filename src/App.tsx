import { useState, useMemo } from 'react';
import { useDrillholeData } from './hooks/useDrillholeData';
import { CollarTab } from './components/CollarTab';
import { GridTable } from './components/GridTable';
import type { GridColumn } from './components/GridTable';
import { QaQcTab } from './components/QaQcTab';
import { ColumnLog } from './components/ColumnLog';
import { ValidationAuditor } from './components/ValidationAuditor';
import {
  Database,
  RefreshCw,
  Trash2,
  Layout,
  ClipboardList,
  Settings,
  CloudUpload,
  CloudOff,
  Plus
} from 'lucide-react';
import { DatabaseSettings } from './components/DatabaseSettings';
import { isSupabaseConfigured } from './utils/supabaseClient';
import './App.css';

function App() {
  const {
    collar,
    setCollar,
    surveys,
    setSurveys,
    lithology,
    setLithology,
    geotech,
    setGeotech,
    assays,
    setAssays,
    errors,
    resetToDefault,
    clearAllData,
    holeList,
    selectedHoleId,
    setSelectedHoleId,
    isLoading,
    createNewHole,
    renameDrillhole,
    saveActiveHoleToSupabase,
    db
  } = useDrillholeData();

  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isSavingToDb, setIsSavingToDb] = useState<boolean>(false);
  const [highlightedRowId, setHighlightedRowId] = useState<string | null>(null);

  const handleItemClick = (tab: string, itemId: string) => {
    setActiveTab(tab);
    setHighlightedRowId(itemId);
    // Clear highlight after 3 seconds
    setTimeout(() => {
      setHighlightedRowId(null);
    }, 3000);
  };

  const handleCreateHole = () => {
    const newId = window.prompt('Enter new drillhole ID:');
    if (newId && newId.trim()) {
      createNewHole(newId.trim());
    }
  };

  const handleSaveToDb = async () => {
    if (!isSupabaseConfigured()) {
      alert('Please configure your Supabase connection settings first by clicking the Settings gear icon in the top right.');
      setIsSettingsOpen(true);
      return;
    }
    
    setIsSavingToDb(true);
    const result = await saveActiveHoleToSupabase();
    setIsSavingToDb(false);
    
    alert(result.message);
  };

  const [activeTab, setActiveTab] = useState<string>('Collar');
  const [rightPanelTab, setRightPanelTab] = useState<'columnlog' | 'audit'>('columnlog');

  // Define Columns for Survey Tab
  const surveyColumns = useMemo<GridColumn[]>(() => [
    { key: 'depth', label: 'Depth (m)', type: 'number', width: '30%', defaultValue: 0 },
    { key: 'dip', label: 'Dip (°)', type: 'number', width: '35%', defaultValue: -90 },
    { key: 'azimuth', label: 'Azimuth (°)', type: 'number', width: '35%', defaultValue: 0 }
  ], []);

  // Define Columns for Lithology Tab
  const lithologyColumns = useMemo<GridColumn[]>(() => [
    { key: 'from', label: 'From (m)', type: 'number', width: '12%', defaultValue: 0 },
    { key: 'to', label: 'To (m)', type: 'number', width: '12%', defaultValue: 0 },
    {
      key: 'rockCode',
      label: 'Rock Code',
      type: 'select',
      width: '18%',
      defaultValue: 'GNAYS',
      options: [
        { value: 'GNAYS', label: 'GNAYS - Gneiss' },
        { value: 'ALBIT', label: 'ALBIT - Albite / Feldspar' },
        { value: 'ANDEZIT', label: 'ANDEZIT - Andesite / Tuff' },
        { value: 'KIL', label: 'KIL - Clay' },
        { value: 'DOLGU', label: 'DOLGU - Overburden / Fill' },
        { value: 'KUVARSIT', label: 'KUVARSIT - Quartzite' },
        { value: 'KUM', label: 'KUM - Sand' },
        { value: 'KAOLEN', label: 'KAOLEN - Kaolin' },
        { value: 'BRES', label: 'BRES - Fault Breccia' },
        { value: 'SIST', label: 'SIST - Schist' },
        { value: 'GRANIT', label: 'GRANIT - Granite' },
        { value: 'SIYENIT', label: 'SIYENIT - Syenite' },
        { value: 'KALSIT', label: 'KALSIT - Calcite / Limestone' },
        { value: 'PERLIT', label: 'PERLIT - Perlite' },
        { value: 'KOMUR', label: 'KOMUR - Coal' },
        { value: 'OKSIT', label: 'OKSIT - Oxide' },
        { value: 'SULFIT', label: 'SULFIT - Sulfide' },
        { value: 'SUBVOLKANIK', label: 'SUBVOLKANIK - Subvolcanic' },
        { value: 'DAYK', label: 'DAYK - Dyke' },
        { value: 'HALLOYSIT', label: 'HALLOYSIT - Halloysite' },
        { value: 'VOLKANOSEDIMANTER', label: 'VOLKANOSEDIMANTER - Volcanosedimentary' },
        { value: 'INTRUZIF', label: 'INTRUZIF - Intrusive' },
        { value: 'TOPRAK', label: 'TOPRAK - Soil' },
        { value: 'RIYOLIT', label: 'RIYOLIT - Rhyolite' },
        { value: 'DASIT', label: 'DASIT - Dacite' },
        { value: 'GRANODIYORIT', label: 'GRANODIYORIT - Granodiorite' },
        { value: 'IGNIMBIRIT', label: 'IGNIMBIRIT - Ignimbrite' },
        { value: 'UNKNOWN', label: 'UNKNOWN - Unspecified' }
      ]
    },
    { key: 'alteration', label: 'Alteration', type: 'text', width: '18%', defaultValue: '' },
    { key: 'mineralization', label: 'Mineralization', type: 'text', width: '18%', defaultValue: '' },
    { key: 'description', label: 'Description', type: 'text', width: '22%', defaultValue: '', placeholder: 'Texture, grain size...' }
  ], []);

  // Define Columns for TCR/RQD Geotech Tab
  const geotechColumns = useMemo<GridColumn[]>(() => [
    { key: 'from', label: 'Run From (m)', type: 'number', width: '12%', defaultValue: 0 },
    { key: 'to', label: 'Run To (m)', type: 'number', width: '12%', defaultValue: 3.0 },
    { key: 'drilledLength', label: 'Drilled (m)', type: 'number', width: '12%', defaultValue: 3.0 },
    { key: 'recoveredLength', label: 'Recovered (m)', type: 'number', width: '14%', defaultValue: 3.0 },
    { key: 'solidPiecesOver10cm', label: 'Solids >10cm (m)', type: 'number', width: '16%', defaultValue: 0 },
    { key: 'tcrPercent', label: 'TCR %', type: 'number', width: '12%', readOnly: true },
    { key: 'rqdPercent', label: 'RQD %', type: 'number', width: '12%', readOnly: true }
  ], []);

  // Define Columns for Assay Tab
  const assayColumns = useMemo<GridColumn[]>(() => [
    { key: 'sampleId', label: 'Sample ID', type: 'text', width: '12%', defaultValue: 'S0001' },
    { key: 'from', label: 'From (m)', type: 'number', width: '8%', defaultValue: 0 },
    { key: 'to', label: 'To (m)', type: 'number', width: '8%', defaultValue: 0 },
    {
      key: 'sampleType',
      label: 'Type',
      type: 'select',
      width: '12%',
      defaultValue: 'Core',
      options: [
        { value: 'Core', label: 'Core Interval' },
        { value: 'Standard', label: 'CRM Standard' },
        { value: 'Blank', label: 'Blank Control' },
        { value: 'Duplicate', label: 'Field Duplicate' }
      ]
    },
    { key: 'al2o3', label: 'Al2O3 (%)', type: 'number', width: '10%', defaultValue: 0 },
    { key: 'fe2o3', label: 'Fe2O3 (%)', type: 'number', width: '10%', defaultValue: 0 },
    { key: 'sio2', label: 'SiO2 (%)', type: 'number', width: '10%', defaultValue: 0 },
    { key: 'tio2', label: 'TiO2 (%)', type: 'number', width: '10%', defaultValue: 0 },
    { key: 'na2o_k2o', label: 'Na2O+K2O (%)', type: 'number', width: '10%', defaultValue: 0 },
    { key: 'loi', label: 'LOI/AZ (%)', type: 'number', width: '10%', defaultValue: 0 }
  ], []);

  // Count errors by tab for rendering notification badges in headers
  const getTabErrorCount = (tabName: string) => {
    let mapping = tabName;
    if (tabName === 'TCR / RQD') mapping = 'Geotech';
    return errors.filter(e => e.tab === mapping).length;
  };

  const getBadgeClass = (tabName: string) => {
    let mapping = tabName;
    if (tabName === 'TCR / RQD') mapping = 'Geotech';
    const errList = errors.filter(e => e.tab === mapping);
    if (errList.some(e => e.type === 'error')) return 'badge badge-danger';
    if (errList.some(e => e.type === 'warning')) return 'badge badge-warning';
    return '';
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '16px', backgroundColor: '#f8fafc' }}>
        <RefreshCw style={{ animation: 'spin 1s linear infinite', color: '#4f46e5' }} size={48} />
        <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, color: '#0f172a' }}>Loading Drillhole Database...</h2>
        <p style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', color: '#64748b', fontSize: '13px' }}>Processing KaleMaden Sondaj records...</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Top Application Bar */}
      <header className="app-header">
        <div className="header-brand">
          <Database size={24} />
          <h1>KaleMaden Drillhole Manager</h1>
        </div>

        <div className="project-meta-controls">
          <div className="meta-item">
            <span className="meta-label">Select Drillhole</span>
            <select
              value={selectedHoleId}
              onChange={e => setSelectedHoleId(e.target.value)}
              style={{
                width: '180px',
                padding: '4px 8px',
                fontSize: '13px',
                fontWeight: 'bold',
                borderColor: 'var(--border-medium)',
                borderRadius: 'var(--radius-sm)'
              }}
            >
              {holeList.map(h => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>
          <div className="meta-item">
            <span className="meta-label">Easting / Northing</span>
            <span className="meta-value">{collar.easting}E, {collar.northing}N</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Total Depth</span>
            <span className="meta-value">{collar.totalDepth} m</span>
          </div>
        </div>

        <div className="header-actions">
          <button className="btn btn-primary" onClick={handleCreateHole}>
            <Plus size={14} /> Create New Hole
          </button>
          <button 
            className="btn btn-success" 
            onClick={handleSaveToDb}
            disabled={isSavingToDb}
            title={isSupabaseConfigured() ? "Save active drillhole logs to Supabase" : "Click to connect Supabase"}
          >
            {isSavingToDb ? (
              <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <CloudUpload size={14} />
            )}
            Save Drillhole to Database
          </button>
          <button className="btn btn-secondary" onClick={resetToDefault}>
            <RefreshCw size={14} /> Load Demo Project
          </button>
          <button className="btn btn-danger" onClick={clearAllData}>
            <Trash2 size={14} /> Reset / Clear
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={() => setIsSettingsOpen(true)}
            style={{ padding: '8px' }}
            title="Database Connection Settings"
          >
            {isSupabaseConfigured() ? (
              <CloudUpload size={14} style={{ color: 'var(--success)' }} />
            ) : (
              <CloudOff size={14} style={{ color: 'var(--text-muted)' }} />
            )}
            <Settings size={14} style={{ marginLeft: '4px' }} />
          </button>
        </div>
      </header>

      {/* Split Screens Panel */}
      <main className="app-main">
        {/* Data Log Editor (Left, 60% Width) */}
        <section className="data-entry-panel">
          <nav className="tab-navigation">
            {['Collar', 'Survey', 'Lithology', 'TCR / RQD', 'Assay', 'QA/QC Dashboard'].map(tab => {
              const errCount = getTabErrorCount(tab);
              return (
                <button
                  key={tab}
                  className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                  {errCount > 0 && (
                    <span className={getBadgeClass(tab)} style={{ marginLeft: '6px' }}>
                      {errCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="tab-content">
            {activeTab === 'Collar' && (
              <CollarTab collar={collar} setCollar={setCollar} errors={errors} onRenameHole={renameDrillhole} />
            )}

            {activeTab === 'Survey' && (
              <GridTable
                title="Downhole Survey Orientation Measurements"
                columns={surveyColumns}
                data={surveys}
                onChange={setSurveys}
                errors={errors}
                tabName="Survey"
                highlightedRowId={highlightedRowId}
              />
            )}

            {activeTab === 'Lithology' && (
              <GridTable
                title="Geological Stratigraphy Logging"
                columns={lithologyColumns}
                data={lithology}
                onChange={setLithology}
                errors={errors}
                tabName="Lithology"
                autoFillNextFrom={true}
                highlightedRowId={highlightedRowId}
              />
            )}

            {activeTab === 'TCR / RQD' && (
              <GridTable
                title="Geotechnical Run Core Recovery Logging"
                columns={geotechColumns}
                data={geotech}
                onChange={setGeotech}
                errors={errors}
                tabName="Geotech"
                autoFillNextFrom={true}
                highlightedRowId={highlightedRowId}
              />
            )}

            {activeTab === 'Assay' && (
              <GridTable
                title="Assay Sample Interval Entry"
                columns={assayColumns}
                data={assays}
                onChange={setAssays}
                errors={errors}
                tabName="Assay"
                autoFillNextFrom={true}
                highlightedRowId={highlightedRowId}
              />
            )}

            {activeTab === 'QA/QC Dashboard' && (
              <QaQcTab assays={assays} />
            )}
          </div>
        </section>

        {/* Visual Charts & Warnings Panel (Right, 40% Width) */}
        <section className="visuals-panel">
          <div className="visuals-tab-toggle">
            <button
              className={`toggle-btn ${rightPanelTab === 'columnlog' ? 'active' : ''}`}
              onClick={() => setRightPanelTab('columnlog')}
            >
              <Layout size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              Column Log
            </button>
            <button
              className={`toggle-btn ${rightPanelTab === 'audit' ? 'active' : ''}`}
              onClick={() => setRightPanelTab('audit')}
            >
              <ClipboardList size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              Audit Log ({errors.length})
            </button>
          </div>

          <div className="visuals-tabs-content">
            {rightPanelTab === 'columnlog' ? (
              <ColumnLog
                totalDepth={collar.totalDepth}
                lithology={lithology}
                geotech={geotech}
                assays={assays}
                onItemClick={handleItemClick}
              />
            ) : (
              <ValidationAuditor
                errors={errors}
                setActiveTab={setActiveTab}
              />
            )}
          </div>
        </section>
      </main>
      {isSettingsOpen && (
        <DatabaseSettings
          onClose={() => setIsSettingsOpen(false)}
          db={db}
        />
      )}
    </div>
  );
}

export default App;
