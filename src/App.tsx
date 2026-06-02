import { useState, useMemo, useEffect, useRef } from 'react';
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
  Plus,
  ChevronDown,
  Search
} from 'lucide-react';
import { DatabaseSettings } from './components/DatabaseSettings';
import { isSupabaseConfigured } from './utils/supabaseClient';
import './App.css';

const METALLIC_PROJECTS = ['BODURLAR', 'BİÇER', 'BICER', 'NAMAZGAH', 'DEDELER', 'ETİLİ', 'ETILI', 'KIRIKLAR', 'DUMAN'];

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
    samplePrep,
    setSamplePrep,
    samplePrepMetallic,
    setSamplePrepMetallic,
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

  // Custom searchable selector states
  const [isSelectorOpen, setIsSelectorOpen] = useState<boolean>(false);
  const [selectorSearch, setSelectorSearch] = useState<string>('');
  const [selectorCategory, setSelectorCategory] = useState<'industrial' | 'metallic'>('industrial');
  const selectorRef = useRef<HTMLDivElement>(null);

  // Helper to determine the project name for a drillhole ID
  const getHoleProjectName = (hId: string): string => {
    let proj = db[hId]?.collar?.project || '';
    if (!proj) {
      try {
        const localStr = localStorage.getItem(`dh_${hId}_collar`);
        if (localStr) {
          const parsed = JSON.parse(localStr);
          proj = parsed.project || '';
        }
      } catch (e) {
        // ignore
      }
    }
    return proj ? proj.trim() : '';
  };

  // Helper to check if drillhole is metallic
  const isHoleMetallic = (hId: string): boolean => {
    const proj = getHoleProjectName(hId);
    const upper = proj.toUpperCase();
    return METALLIC_PROJECTS.some(p => upper.includes(p) || p.includes(upper));
  };

  // Pre-categorize and group holes by project
  const categorizedHoles = useMemo(() => {
    const metallic: Record<string, string[]> = {};
    const industrial: Record<string, string[]> = {};

    for (const hId of holeList) {
      const proj = getHoleProjectName(hId);
      const projKey = proj ? proj.trim().toUpperCase() : 'GENERAL';
      const isMetallic = METALLIC_PROJECTS.some(p => projKey.includes(p) || p.includes(projKey));

      const targetMap = isMetallic ? metallic : industrial;
      if (!targetMap[projKey]) {
        targetMap[projKey] = [];
      }
      targetMap[projKey].push(hId);
    }

    // Sort drillhole IDs alphabetically inside each project group
    for (const proj in metallic) {
      metallic[proj].sort();
    }
    for (const proj in industrial) {
      industrial[proj].sort();
    }

    return { metallic, industrial };
  }, [holeList, db]);

  // Compute filtered project groups based on category and search query
  const filteredHoles = useMemo(() => {
    const targetCategory = selectorCategory === 'metallic' ? categorizedHoles.metallic : categorizedHoles.industrial;
    const filtered: Record<string, string[]> = {};
    const searchLower = selectorSearch.toLowerCase().trim();

    for (const [project, holes] of Object.entries(targetCategory)) {
      // Match project name or drillhole ID
      const matchingHoles = holes.filter(hId => 
        hId.toLowerCase().includes(searchLower) || project.toLowerCase().includes(searchLower)
      );

      if (matchingHoles.length > 0) {
        filtered[project] = matchingHoles;
      }
    }

    return filtered;
  }, [categorizedHoles, selectorCategory, selectorSearch]);

  // Click-Outside closer for Popover dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
        setIsSelectorOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Sync category tab with active selected drillhole when it changes
  useEffect(() => {
    if (selectedHoleId) {
      const isMetallic = isHoleMetallic(selectedHoleId);
      setSelectorCategory(isMetallic ? 'metallic' : 'industrial');
    }
  }, [selectedHoleId]);

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
    { key: 'from', label: 'Depth From (m)', type: 'number', width: '8%', defaultValue: 0 },
    { key: 'to', label: 'Depth To (m)', type: 'number', width: '8%', defaultValue: 0 },
    {
      key: 'rockCode',
      label: 'Geology Code',
      type: 'select',
      width: '15%',
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
    { key: 'description', label: 'Description', type: 'text', width: '20%', defaultValue: '', placeholder: 'Input text here...' },
    { key: 'color', label: 'Color', type: 'text', width: '10%', readOnly: true, defaultValue: '' },
    { key: 'graphic', label: 'Graphic', type: 'text', width: '10%', readOnly: true, defaultValue: '' },
    { key: 'photo', label: 'Photograph', type: 'text', width: '12%', readOnly: true, defaultValue: '' }
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

  // Define Columns for Sample Preparation Tab
  const samplePrepColumns = useMemo<GridColumn[]>(() => [
    { key: 'sampleTag', label: 'Sample Tag', type: 'text', width: '10%', defaultValue: 'S0001' },
    { key: 'from', label: 'Depth From (m)', type: 'number', width: '7%', defaultValue: 0 },
    { key: 'to', label: 'Depth To (m)', type: 'number', width: '7%', defaultValue: 0 },
    { key: 'oreType', label: 'Ore Type', type: 'text', width: '12%', defaultValue: '', placeholder: 'Input text here...' },
    { key: 'description', label: 'Description', type: 'text', width: '18%', defaultValue: '', placeholder: 'Input text here...' },
    {
      key: 'chemical',
      label: 'Chemical Analysis',
      type: 'select',
      width: '13%',
      defaultValue: '',
      options: [
        { value: '', label: 'None' },
        { value: 'XRF', label: 'XRF' },
        { value: 'XRD', label: 'XRD' },
        { value: 'XRF + XRD', label: 'XRF + XRD' }
      ]
    },
    {
      key: 'physical',
      label: 'Physical Analysis',
      type: 'select',
      width: '18%',
      defaultValue: '',
      options: [
        { value: '', label: 'None' },
        { value: 'Granite', label: 'Granite' },
        { value: 'SG', label: 'SG' },
        { value: 'Duvar Karosu', label: 'Duvar Karosu' },
        { value: 'Yer Karosu', label: 'Yer Karosu' }
      ]
    },
    {
      key: 'otherChemical',
      label: 'Other Chemical Analyses',
      type: 'select',
      width: '15%',
      defaultValue: '',
      options: [
        { value: '', label: 'None' },
        { value: 'SO4', label: 'SO4' },
        { value: 'Mn', label: 'Mn' },
        { value: 'Cr', label: 'Cr' },
        { value: 'SO4 + Mn', label: 'SO4 + Mn' },
        { value: 'SO4 + Cr', label: 'SO4 + Cr' },
        { value: 'Mn + Cr', label: 'Mn + Cr' },
        { value: 'SO4 + Mn + Cr', label: 'SO4 + Mn + Cr' }
      ]
    }
  ], []);

  // Define Columns for Sample Preparation Metallic Tab
  const samplePrepMetallicColumns = useMemo<GridColumn[]>(() => [
    { key: 'sampleTag', label: 'Sample Tag', type: 'text', width: '12%', defaultValue: 'M0001' },
    { key: 'from', label: 'Depth From (m)', type: 'number', width: '10%', defaultValue: 0 },
    { key: 'to', label: 'Depth To (m)', type: 'number', width: '10%', defaultValue: 0 },
    { key: 'oreType', label: 'Ore Type', type: 'text', width: '15%', defaultValue: '', placeholder: 'Input text here...' },
    { key: 'description', label: 'Description', type: 'text', width: '25%', defaultValue: '', placeholder: 'Input text here...' },
    {
      key: 'analysisCode',
      label: 'ALS Analysis Code',
      type: 'select',
      width: '28%',
      defaultValue: 'Au-SCR24',
      options: [
        { value: 'Au-SCR21', label: 'Au-SCR21 (Metallic Screen FA, 30g)' },
        { value: 'Au-SCR24', label: 'Au-SCR24 (Metallic Screen FA, 50g)' },
        { value: 'Au-AA23', label: 'Au-AA23 (Gold FA & AAS, 30g)' },
        { value: 'Au-AA24', label: 'Au-AA24 (Gold FA & AAS, 50g)' },
        { value: 'Au-GRA21', label: 'Au-GRA21 (Gold FA & Grav, 30g)' },
        { value: 'Au-GRA22', label: 'Au-GRA22 (Gold FA & Grav, 50g)' },
        { value: 'ME-ICP61', label: 'ME-ICP61 (33 Elements 4-Acid)' },
        { value: 'ME-MS61', label: 'ME-MS61 (48 Elements 4-Acid)' },
        { value: 'ME-XRF26', label: 'ME-XRF26 (Whole Rock XRF)' },
        { value: 'S-IR08', label: 'S-IR08 (Total Sulfur Leco)' }
      ]
    }
  ], []);

  // Count errors by tab for rendering notification badges in headers
  const getTabErrorCount = (tabName: string) => {
    let mapping = tabName;
    if (tabName === 'TCR / RQD') mapping = 'Geotech';
    if (tabName === 'Sample Prep Metallic') mapping = 'SamplePrepMetallic';
    return errors.filter(e => e.tab === mapping).length;
  };

  const getBadgeClass = (tabName: string) => {
    let mapping = tabName;
    if (tabName === 'TCR / RQD') mapping = 'Geotech';
    if (tabName === 'Sample Prep Metallic') mapping = 'SamplePrepMetallic';
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
          <div className="meta-item" style={{ position: 'relative' }}>
            <span className="meta-label">Select Drillhole</span>
            <div className="drillhole-selector-container" ref={selectorRef}>
              <button 
                className="drillhole-selector-trigger" 
                onClick={() => setIsSelectorOpen(!isSelectorOpen)}
                type="button"
              >
                <span className="selected-hole-name">{selectedHoleId || 'Select Drillhole'}</span>
                <ChevronDown size={14} className={`trigger-arrow ${isSelectorOpen ? 'open' : ''}`} />
              </button>
              
              {isSelectorOpen && (
                <div className="drillhole-selector-popover">
                  {/* Category switcher */}
                  <div className="selector-tabs">
                    <button 
                      type="button"
                      className={`selector-tab ${selectorCategory === 'industrial' ? 'active' : ''}`}
                      onClick={() => {
                        setSelectorCategory('industrial');
                        setSelectorSearch('');
                      }}
                    >
                      Industrial (Endüstriyel)
                    </button>
                    <button 
                      type="button"
                      className={`selector-tab ${selectorCategory === 'metallic' ? 'active' : ''}`}
                      onClick={() => {
                        setSelectorCategory('metallic');
                        setSelectorSearch('');
                      }}
                    >
                      Metallic (Metalik)
                    </button>
                  </div>
                  
                  {/* Search box */}
                  <div className="selector-search-box">
                    <Search size={14} className="search-icon" />
                    <input 
                      type="text" 
                      placeholder="Input text here..." 
                      value={selectorSearch}
                      onChange={e => setSelectorSearch(e.target.value)}
                      autoFocus
                    />
                  </div>
                  
                  {/* Project-grouped results list */}
                  <div className="selector-results-list">
                    {Object.keys(filteredHoles).length === 0 ? (
                      <div className="selector-no-results">No drillholes found</div>
                    ) : (
                      Object.entries(filteredHoles).map(([project, holes]) => (
                        <div key={project} className="selector-group">
                          <div className="selector-group-header">
                            PROJECT: {project}
                          </div>
                          <div className="selector-group-items">
                            {holes.map(hId => (
                              <button
                                key={hId}
                                type="button"
                                className={`selector-item-btn ${selectedHoleId === hId ? 'active' : ''}`}
                                onClick={() => {
                                  setSelectedHoleId(hId);
                                  setIsSelectorOpen(false);
                                  setSelectorSearch('');
                                }}
                              >
                                {hId}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
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
            {['Collar', 'Survey', 'Lithology', 'TCR / RQD', 'Assay', 'Sample Preparation', 'Sample Prep Metallic', 'QA/QC Dashboard'].map(tab => {
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
                holeId={selectedHoleId}
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

            {activeTab === 'Sample Preparation' && (
              <GridTable
                title="Sample Preparation & Laboratory Delivery Log"
                columns={samplePrepColumns}
                data={samplePrep}
                onChange={setSamplePrep}
                errors={errors}
                tabName="SamplePrep"
                autoFillNextFrom={true}
                highlightedRowId={highlightedRowId}
                holeId={selectedHoleId}
              />
            )}

            {activeTab === 'Sample Prep Metallic' && (
              <GridTable
                title="Sample Preparation & Metallic Screen Log"
                columns={samplePrepMetallicColumns}
                data={samplePrepMetallic}
                onChange={setSamplePrepMetallic}
                errors={errors}
                tabName="SamplePrepMetallic"
                autoFillNextFrom={true}
                highlightedRowId={highlightedRowId}
                holeId={selectedHoleId}
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
