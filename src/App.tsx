import { useState, useMemo, useEffect, useRef } from 'react';
import { useDrillholeData, METALLIC_HOLES } from './hooks/useDrillholeData';
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
  Search,
  Map,
  Layers,
  ArrowRight,
  ChevronLeft,
  Home
} from 'lucide-react';
import { DatabaseSettings } from './components/DatabaseSettings';
import { isSupabaseConfigured, getSupabaseClient } from './utils/supabaseClient';
import { AuthScreen } from './components/AuthScreen';
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
    samplePrep,
    setSamplePrep,
    samplePrepMetallic,
    setSamplePrepMetallic,
    alterations,
    setAlterations,
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
    db,
    isDirty
  } = useDrillholeData();

  const [appMode, setAppMode] = useState<'landing' | 'sondaj_menu' | 'yuzey_menu' | 'sondaj_search' | 'yuzey_search' | 'yuzey_browse' | 'drillhole'>('landing');
  const [portalSearchQuery, setPortalSearchQuery] = useState<string>('');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isSavingToDb, setIsSavingToDb] = useState<boolean>(false);
  const [highlightedRowId, setHighlightedRowId] = useState<string | null>(null);
  
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [guestMode, setGuestMode] = useState<boolean>(false);
  const [authChecked, setAuthChecked] = useState<boolean>(false);
  const isAdmin = userEmail?.trim().toLowerCase() === 'ismailcansever@kale.com.tr';

  useEffect(() => {
    const checkUser = async () => {
      if (isSupabaseConfigured()) {
        const client = getSupabaseClient();
        if (client) {
          try {
            const { data } = await client.auth.getSession();
            if (data?.session?.user) {
              const email = data.session.user.email || '';
              if (email.toLowerCase().endsWith('@kale.com.tr')) {
                setUserEmail(email);
              } else {
                await client.auth.signOut();
                setUserEmail(null);
                alert('Sadece @kale.com.tr uzantılı e-posta adreslerine izin verilir.');
              }
            }
          } catch (err) {
            console.error('Session retrieval error:', err);
          }
        }
      }
      setAuthChecked(true);
    };
    checkUser();
  }, []);

  const handleLogout = async () => {
    if (isSupabaseConfigured()) {
      const client = getSupabaseClient();
      if (client) {
        await client.auth.signOut();
      }
    }
    setUserEmail(null);
    setGuestMode(false);
  };

  const [leftWidth, setLeftWidth] = useState<number>(50); // initial 50% split width

  const handleResizerMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const resizer = e.currentTarget;
    resizer.classList.add('resizing');
    const startX = e.clientX;
    const startLeftWidth = leftWidth;
    const containerWidth = document.querySelector('.app-main')?.getBoundingClientRect().width || window.innerWidth;

    document.body.classList.add('resizing-col');

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaPercentage = (deltaX / containerWidth) * 100;
      const newWidth = Math.max(25, Math.min(75, startLeftWidth + deltaPercentage)); // restrict between 25% and 75%
      setLeftWidth(newWidth);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.classList.remove('resizing-col');
      resizer.classList.remove('resizing');
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

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
    if (!hId) return false;
    return METALLIC_HOLES.includes(hId.trim().toUpperCase());
  };

  // Pre-categorize and group holes by project
  const categorizedHoles = useMemo(() => {
    const metallic: Record<string, string[]> = {};
    const industrial: Record<string, string[]> = {};

    for (const hId of holeList) {
      const proj = getHoleProjectName(hId);
      const projKey = proj ? proj.trim().toUpperCase() : 'GENERAL';
      const isMetallic = METALLIC_HOLES.includes(hId.trim().toUpperCase());

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

  const portalSearchResults = useMemo(() => {
    const query = portalSearchQuery.toLowerCase().trim();
    if (!query) return holeList;
    return holeList.filter(hId => {
      const proj = getHoleProjectName(hId).toLowerCase();
      const logger = (db[hId]?.collar?.logger || '').toLowerCase();
      const status = (db[hId]?.collar?.status || '').toLowerCase();
      return hId.toLowerCase().includes(query) || 
             proj.includes(query) || 
             logger.includes(query) || 
             status.includes(query);
    });
  }, [holeList, portalSearchQuery, db]);

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
      defaultValue: 'GNS',
      options: [
        { value: 'ALN', label: 'Alunit Alterasyonu (ALN)' },
        { value: 'AND', label: 'Andezit (AND)' },
        { value: 'AP', label: 'Aplit (AP)' },
        { value: 'BAZ', label: 'Bazalt (BAZ)' },
        { value: 'BNT', label: 'Bentonit (BNT)' },
        { value: 'BRS', label: 'Breş (BRS)' },
        { value: 'BU', label: 'Boş Karot (BU)' },
        { value: 'CRT', label: 'Çört (CRT)' },
        { value: 'DST', label: 'Dasit (DST)' },
        { value: 'DYK', label: 'Dayk (DYK)' },
        { value: 'DB', label: 'Diyabaz (DB)' },
        { value: 'DYR', label: 'Diyorit (DYR)' },
        { value: 'ALV', label: 'Alüvyon / Dolgu / Toprak (ALV)' },
        { value: 'FGNS', label: 'Felsik Gnays (FGNS)' },
        { value: 'FLL', label: 'Fillit (FLL)' },
        { value: 'GB', label: 'Gabro (GB)' },
        { value: 'GNS', label: 'Gnays (GNS)' },
        { value: 'GRD', label: 'Granodiyorit (GRD)' },
        { value: 'GRND', label: 'Granitoid / Felsik Damar (GRND)' },
        { value: 'GRT', label: 'Granit (GRT)' },
        { value: 'HAL', label: 'Halloysit (HAL)' },
        { value: 'HRF', label: 'Hornfels (HRF)' },
        { value: 'IGB', label: 'İgnimbirit (IGB)' },
        { value: 'KÇT', label: 'Kireçtaşı / Kalsit (KÇT)' },
        { value: 'KL', label: 'Kil / Kaolen (KL)' },
        { value: 'KONG', label: 'Konglomera (KONG)' },
        { value: 'KMR', label: 'Kömür (KMR)' },
        { value: 'KMT', label: 'Kumtaşı (KMT)' },
        { value: 'QVN', label: 'Kuvars Damarı (QVN)' },
        { value: 'KVS', label: 'Kuvarsit (KVS)' },
        { value: 'MER', label: 'Mermer (MER)' },
        { value: 'MLK', label: 'Fay Zonu / Milonitik Kayaç (MLK)' },
        { value: 'NONE', label: 'Belirsiz (NONE)' },
        { value: 'OFM', label: 'Ofiyolitik Melanj (OFM)' },
        { value: 'DSED', label: 'Oksit Zonu / Demirce Zengin (DSED)' },
        { value: 'PEG', label: 'Pegmatit (PEG)' },
        { value: 'OBS', label: 'Perlit / Obsidiyen (OBS)' },
        { value: 'RYL', label: 'Riyolit (RYL)' },
        { value: 'SRP', label: 'Serpantinit (SRP)' },
        { value: 'SST', label: 'Şist (SST)' },
        { value: 'SY', label: 'Siyenit (SY)' },
        { value: 'TF', label: 'Tüf (TF)' },
        { value: 'UNC', label: 'Uyumsuzluk Zonu (UNC)' },
        { value: 'VKT', label: 'Volkanosedimanter (VKT)' },
        { value: 'UNKNOWN', label: 'Belirsiz (UNKNOWN)' }
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
    { key: 'al2o3', label: 'Al2O3 (%)', type: 'number', width: '8%', defaultValue: 0 },
    { key: 'fe2o3', label: 'Fe2O3 (%)', type: 'number', width: '8%', defaultValue: 0 },
    { key: 'sio2', label: 'SiO2 (%)', type: 'number', width: '8%', defaultValue: 0 },
    { key: 'tio2', label: 'TiO2 (%)', type: 'number', width: '8%', defaultValue: 0 },
    { key: 'na2o_k2o', label: 'Na2O+K2O (%)', type: 'number', width: '8%', defaultValue: 0 },
    { key: 'loi', label: 'LOI/AZ (%)', type: 'number', width: '8%', defaultValue: 0 },
    { key: 'cao', label: 'CaO (%)', type: 'number', width: '8%', defaultValue: 0 },
    { key: 'mgo', label: 'MgO (%)', type: 'number', width: '8%', defaultValue: 0 },
    { key: 'p2o5', label: 'P2O5 (%)', type: 'number', width: '8%', defaultValue: 0 },
    { key: 'sro', label: 'SrO (%)', type: 'number', width: '8%', defaultValue: 0 },
    { key: 'so4', label: 'SO4 (%)', type: 'number', width: '8%', defaultValue: 0 },
    { key: 'cr2o3', label: 'Cr2O3 (%)', type: 'number', width: '8%', defaultValue: 0 },
    { key: 'mno', label: 'MnO (%)', type: 'number', width: '8%', defaultValue: 0 }
  ], []);

  // Define Columns for Metallic Assay Tab
  const metallicAssayColumns = useMemo<GridColumn[]>(() => [
    { key: 'sampleId', label: 'Sample ID', type: 'text', width: '12%', defaultValue: 'M0001' },
    { key: 'from', label: 'From (m)', type: 'number', width: '8%', defaultValue: 0 },
    { key: 'to', label: 'To (m)', type: 'number', width: '8%', defaultValue: 0 },
    {
      key: 'sampleType',
      label: 'Type',
      type: 'select',
      width: '10%',
      defaultValue: 'Core',
      options: [
        { value: 'Core', label: 'Core Interval' },
        { value: 'Standard', label: 'CRM Standard' },
        { value: 'Blank', label: 'Blank Control' },
        { value: 'Duplicate', label: 'Field Duplicate' }
      ]
    },
    { key: 'au_ppm', label: 'Au (ppm)', type: 'number', width: '9%', defaultValue: 0 },
    { key: 'au_ppb', label: 'Au (ppb)', type: 'number', width: '9%', defaultValue: 0 },
    { key: 'ag_ppm', label: 'Ag (ppm)', type: 'number', width: '9%', defaultValue: 0 },
    { key: 'cu_ppm', label: 'Cu (ppm)', type: 'number', width: '9%', defaultValue: 0 },
    { key: 'pb_ppm', label: 'Pb (ppm)', type: 'number', width: '9%', defaultValue: 0 },
    { key: 'zn_ppm', label: 'Zn (ppm)', type: 'number', width: '9%', defaultValue: 0 },
    { key: 'as_ppm', label: 'As (ppm)', type: 'number', width: '9%', defaultValue: 0 }
  ], []);

  // Define Columns for Sample Preparation Tab
  const samplePrepColumns = useMemo<GridColumn[]>(() => [
    { key: 'sampleTag', label: 'Sample Tag', type: 'text', width: '10%', defaultValue: 'S0001' },
    { key: 'from', label: 'Depth From (m)', type: 'number', width: '7%', defaultValue: 0 },
    { key: 'to', label: 'Depth To (m)', type: 'number', width: '7%', defaultValue: 0 },
    {
      key: 'sampleType',
      label: 'Type',
      type: 'select',
      width: '10%',
      defaultValue: 'Core',
      options: [
        { value: 'Core', label: 'Core Interval' },
        { value: 'Standard', label: 'CRM Standard' },
        { value: 'Blank', label: 'Blank Control' },
        { value: 'Duplicate', label: 'Field Duplicate' }
      ]
    },
    { key: 'oreType', label: 'Ore Type', type: 'text', width: '10%', defaultValue: '', placeholder: 'Input text here...' },
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
    {
      key: 'sampleType',
      label: 'Type',
      type: 'select',
      width: '10%',
      defaultValue: 'Core',
      options: [
        { value: 'Core', label: 'Core Interval' },
        { value: 'Standard', label: 'CRM Standard' },
        { value: 'Blank', label: 'Blank Control' },
        { value: 'Duplicate', label: 'Field Duplicate' }
      ]
    },
    { key: 'oreType', label: 'Ore Type', type: 'text', width: '12%', defaultValue: '', placeholder: 'Input text here...' },
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

  // Define Columns for Alteration Tab
  const alterationColumns = useMemo<GridColumn[]>(() => [
    { key: 'from', label: 'From (m)', type: 'number', width: '8%', defaultValue: 0 },
    { key: 'to', label: 'To (m)', type: 'number', width: '8%', defaultValue: 0 },
    { key: 'color', label: 'Color', type: 'text', width: '10%', defaultValue: '' },
    {
      key: 'lithology',
      label: 'Lithology',
      type: 'select',
      width: '12%',
      defaultValue: 'GNS',
      options: [
        { value: 'ALN', label: 'Alunit Alterasyonu (ALN)' },
        { value: 'AND', label: 'Andezit (AND)' },
        { value: 'AP', label: 'Aplit (AP)' },
        { value: 'BAZ', label: 'Bazalt (BAZ)' },
        { value: 'BNT', label: 'Bentonit (BNT)' },
        { value: 'BRS', label: 'Breş (BRS)' },
        { value: 'BU', label: 'Boş Karot (BU)' },
        { value: 'CRT', label: 'Çört (CRT)' },
        { value: 'DST', label: 'Dasit (DST)' },
        { value: 'DYK', label: 'Dayk (DYK)' },
        { value: 'DB', label: 'Diyabaz (DB)' },
        { value: 'DYR', label: 'Diyorit (DYR)' },
        { value: 'ALV', label: 'Alüvyon / Dolgu / Toprak (ALV)' },
        { value: 'FGNS', label: 'Felsik Gnays (FGNS)' },
        { value: 'FLL', label: 'Fillit (FLL)' },
        { value: 'GB', label: 'Gabro (GB)' },
        { value: 'GNS', label: 'Gnays (GNS)' },
        { value: 'GRD', label: 'Granodiyorit (GRD)' },
        { value: 'GRND', label: 'Granitoid / Felsik Damar (GRND)' },
        { value: 'GRT', label: 'Granit (GRT)' },
        { value: 'HAL', label: 'Halloysit (HAL)' },
        { value: 'HRF', label: 'Hornfels (HRF)' },
        { value: 'IGB', label: 'İgnimbirit (IGB)' },
        { value: 'KÇT', label: 'Kireçtaşı / Kalsit (KÇT)' },
        { value: 'KL', label: 'Kil / Kaolen (KL)' },
        { value: 'KONG', label: 'Konglomera (KONG)' },
        { value: 'KMR', label: 'Kömür (KMR)' },
        { value: 'KMT', label: 'Kumtaşı (KMT)' },
        { value: 'QVN', label: 'Kuvars Damarı (QVN)' },
        { value: 'KVS', label: 'Kuvarsit (KVS)' },
        { value: 'MER', label: 'Mermer (MER)' },
        { value: 'MLK', label: 'Fay Zonu / Milonitik Kayaç (MLK)' },
        { value: 'NONE', label: 'Belirsiz (NONE)' },
        { value: 'OFM', label: 'Ofiyolitik Melanj (OFM)' },
        { value: 'DSED', label: 'Oksit Zonu / Demirce Zengin (DSED)' },
        { value: 'PEG', label: 'Pegmatit (PEG)' },
        { value: 'OBS', label: 'Perlit / Obsidiyen (OBS)' },
        { value: 'RYL', label: 'Riyolit (RYL)' },
        { value: 'SRP', label: 'Serpantinit (SRP)' },
        { value: 'SST', label: 'Şist (SST)' },
        { value: 'SY', label: 'Siyenit (SY)' },
        { value: 'TF', label: 'Tüf (TF)' },
        { value: 'UNC', label: 'Uyumsuzluk Zonu (UNC)' },
        { value: 'VKT', label: 'Volkanosedimanter (VKT)' },
        { value: 'UNKNOWN', label: 'Belirsiz (UNKNOWN)' }
      ]
    },
    {
      key: 'structuralAlteration',
      label: 'Structural Alteration',
      type: 'select',
      width: '10%',
      defaultValue: 'Fresh',
      options: [
        { value: 'Fresh', label: 'Fresh' },
        { value: 'Geçiş zonu', label: 'Geçiş zonu' },
        { value: 'Geçişli', label: 'Geçişli' },
        { value: 'Yayılımlı', label: 'Yayılımlı' },
        { value: 'Yayılımlı-geçişli', label: 'Yayılımlı-geçişli' },
        { value: 'Yayımlı', label: 'Yayımlı' }
      ]
    },
    {
      key: 'alterationIntensity',
      label: 'Intensity',
      type: 'select',
      width: '9%',
      defaultValue: 'YOK',
      options: [
        { value: 'YOK', label: 'YOK' },
        { value: 'Düşük', label: 'Düşük' },
        { value: 'Orta', label: 'Orta' },
        { value: 'Yoğun', label: 'Yoğun' },
        { value: 'Düşük-Orta', label: 'Düşük-Orta' },
        { value: 'Orta-Düşük', label: 'Orta-Düşük' },
        { value: 'Orta-Yoğun', label: 'Orta-Yoğun' }
      ]
    },
    {
      key: 'alterationType',
      label: 'Alteration Type',
      type: 'select',
      width: '10%',
      defaultValue: 'YOK',
      options: [
        { value: 'YOK', label: 'YOK' },
        { value: 'Arjilik', label: 'Arjilik' },
        { value: 'Silisleşme', label: 'Silisleşme' }
      ]
    },
    { key: 'structuralOxide', label: 'Structural Oxide', type: 'text', width: '10%', defaultValue: '' },
    {
      key: 'oxideIntensity',
      label: 'Oxide Intensity',
      type: 'select',
      width: '9%',
      defaultValue: 'YOK',
      options: [
        { value: 'YOK', label: 'YOK' },
        { value: 'Düşük', label: 'Düşük' },
        { value: 'Orta', label: 'Orta' },
        { value: 'Yoğun', label: 'Yoğun' },
        { value: 'Düşük-Orta', label: 'Düşük-Orta' },
        { value: 'Orta-Düşük', label: 'Orta-Düşük' },
        { value: 'Orta-Yoğun', label: 'Orta-Yoğun' }
      ]
    },
    {
      key: 'redoxType',
      label: 'Redox Type',
      type: 'select',
      width: '8%',
      defaultValue: 'OX',
      options: [
        { value: 'OX', label: 'OX (Oksit)' },
        { value: 'SUL', label: 'SUL (Sülfid)' },
        { value: 'OX/SUL', label: 'OX/SUL (Geçiş)' },
        { value: 'Transition', label: 'Transition' }
      ]
    },
    { key: 'description', label: 'Description', type: 'text', width: '12%', defaultValue: '' }
  ], []);

  // Count errors by tab for rendering notification badges in headers
  const getTabErrorCount = (tabName: string) => {
    let mapping = tabName;
    if (tabName === 'TCR / RQD') mapping = 'Geotech';
    if (tabName === 'Sample Prep Metallic') mapping = 'SamplePrepMetallic';
    if (tabName === 'Sample Preparation') mapping = 'SamplePrep';
    if (tabName === 'Alteration') mapping = 'Alteration';
    return errors.filter(e => e.tab === mapping).length;
  };

  const getBadgeClass = (tabName: string) => {
    let mapping = tabName;
    if (tabName === 'TCR / RQD') mapping = 'Geotech';
    if (tabName === 'Sample Prep Metallic') mapping = 'SamplePrepMetallic';
    if (tabName === 'Sample Preparation') mapping = 'SamplePrep';
    if (tabName === 'Alteration') mapping = 'Alteration';
    const errList = errors.filter(e => e.tab === mapping);
    if (errList.some(e => e.type === 'error')) return 'badge badge-danger';
    if (errList.some(e => e.type === 'warning')) return 'badge badge-warning';
    return '';
  };

  // 1. Auth check loading screen
  if (isSupabaseConfigured() && !authChecked) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '16px', backgroundColor: '#0f172a' }}>
        <RefreshCw style={{ animation: 'spin 1s linear infinite', color: '#6366f1' }} size={48} />
        <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, color: '#ffffff' }}>Giriş Kontrol Ediliyor...</h2>
      </div>
    );
  }

  // 2. Auth Screen redirect
  if (isSupabaseConfigured() && !userEmail && !guestMode) {
    return (
      <AuthScreen 
        onAuthSuccess={(email) => {
          setUserEmail(email);
          // Set logger name to actual geologist name automatically if empty
          if (!collar.logger) {
            let name = email.split('@')[0];
            if (email.toLowerCase() === 'ismailcansever@kale.com.tr') name = 'İsmailcan SEVER';
            else if (email.toLowerCase() === 'leventcan@kale.com.tr') name = 'Levent CAN';
            setCollar(prev => ({ ...prev, logger: name }));
          }
        }}
        onContinueOffline={() => setGuestMode(true)}
      />
    );
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '16px', backgroundColor: '#f8fafc' }}>
        <RefreshCw style={{ animation: 'spin 1s linear infinite', color: '#4f46e5' }} size={48} />
        <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, color: '#0f172a' }}>Loading Drillhole Database...</h2>
        <p style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', color: '#64748b', fontSize: '13px' }}>Processing KaleMaden Sondaj records...</p>
      </div>
    );
  }

  if (appMode === 'landing') {
    return (
      <div className="portal-container" style={{ backgroundImage: "url('/geology_bg.png')" }}>
        <div className="portal-overlay" />
        <div className="portal-content">
          <header className="portal-header">
            <div className="portal-logo animate-pulse">
              <Database size={48} className="logo-icon" />
            </div>
            <h1>KALEMADEN VERİ PORTALI</h1>
            <p className="portal-subtitle">Jeolojik Veri Analiz ve Yönetim Sistemleri</p>
          </header>

          <div className="portal-grid">
            <div className="portal-card animate-fade-in" onClick={() => setAppMode('sondaj_menu')}>
              <div className="card-glow" />
              <div className="card-content">
                <div className="card-icon-wrapper cyan">
                  <Database size={32} />
                </div>
                <h3>Sondaj Veritabanı</h3>
                <p>
                  Sondaj lokasyonları (collar), kuyu içi yön ölçümleri (survey), jeolojik loglama, TCR/RQD jeoteknik verileri ve laboratuvar numune hazırlık süreçlerinin yönetimi.
                </p>
                <div className="card-footer-btn">
                  <span>Sondaj Portalı</span>
                  <ArrowRight size={16} />
                </div>
              </div>
            </div>

            <div className="portal-card animate-fade-in" onClick={() => setAppMode('yuzey_menu')}>
              <div className="card-glow" />
              <div className="card-content">
                <div className="card-icon-wrapper amber">
                  <Layers size={32} />
                </div>
                <h3>Yüzey Veritabanı</h3>
                <p>
                  Jeokimya örneklemeleri, yüzey yapısal jeoloji haritalama verileri, uzaktan algılama (Sentinel-2, ASTER) katmanları ve drone fotogrametri sonuçlarının GIS entegrasyonu.
                </p>
                <div className="card-footer-btn">
                  <span>Yüzey Portalı</span>
                  <ArrowRight size={16} />
                </div>
              </div>
            </div>
          </div>

          <footer className="portal-footer">
            <p>© {new Date().getFullYear()} Kale Maden A.Ş. — Her hakkı saklıdır. Çanakkale / Biga Yarımadası Projeleri.</p>
          </footer>
        </div>
      </div>
    );
  }

  if (appMode === 'sondaj_menu') {
    return (
      <div className="portal-container" style={{ backgroundImage: "url('/geology_bg.png')" }}>
        <div className="portal-overlay" />
        <div className="portal-content">
          <button className="btn btn-secondary back-to-portal-btn" onClick={() => setAppMode('landing')}>
            <ChevronLeft size={16} /> Ana Portala Dön
          </button>
          
          <header className="portal-header">
            <div className="portal-logo animate-pulse">
              <Database size={48} className="logo-icon" />
            </div>
            <h1>SONDAJ VERİTABANI</h1>
            <p className="portal-subtitle">Kuyu Verileri ve Log Yönetimi</p>
          </header>

          <div className="portal-grid">
            <div className="portal-card animate-fade-in" onClick={() => setAppMode('sondaj_search')}>
              <div className="card-glow" />
              <div className="card-content">
                <div className="card-icon-wrapper cyan">
                  <Search size={32} />
                </div>
                <h3>Arama Yap</h3>
                <p>
                  Sondaj kuyu kodlarına (Hole ID), projelere, loglayan mühendise veya çalışma durumuna göre hızlı arama ve filtreleme yapın.
                </p>
                <div className="card-footer-btn">
                  <span>Arama Ekranını Aç</span>
                  <ArrowRight size={16} />
                </div>
              </div>
            </div>

            <div className="portal-card animate-fade-in" onClick={() => setAppMode('drillhole')}>
              <div className="card-glow" />
              <div className="card-content">
                <div className="card-icon-wrapper cyan">
                  <Database size={32} />
                </div>
                <h3>Veritabanını İncele</h3>
                <p>
                  Tüm kuyu kayıtlarını, survey ölçümlerini, litoloji katmanlarını, RQD jeoteknik verilerini ve laboratuvar numune hazırlık tablolarını detaylıca görüntüleyin.
                </p>
                <div className="card-footer-btn">
                  <span>Tablo ve Analiz Ekranına Git</span>
                  <ArrowRight size={16} />
                </div>
              </div>
            </div>
          </div>

          <footer className="portal-footer">
            <p>© {new Date().getFullYear()} Kale Maden A.Ş. — Çanakkale / Biga Projeleri.</p>
          </footer>
        </div>
      </div>
    );
  }

  if (appMode === 'yuzey_menu') {
    return (
      <div className="portal-container" style={{ backgroundImage: "url('/geology_bg.png')" }}>
        <div className="portal-overlay" />
        <div className="portal-content">
          <button className="btn btn-secondary back-to-portal-btn" onClick={() => setAppMode('landing')}>
            <ChevronLeft size={16} /> Ana Portala Dön
          </button>
          
          <header className="portal-header">
            <div className="portal-logo animate-pulse">
              <Layers size={48} className="logo-icon amber" />
            </div>
            <h1>YÜZEY VERİTABANI</h1>
            <p className="portal-subtitle">Jeokimya, Haritalama ve GIS Portalı</p>
          </header>

          <div className="portal-grid">
            <div className="portal-card animate-fade-in" onClick={() => setAppMode('yuzey_search')}>
              <div className="card-glow" />
              <div className="card-content">
                <div className="card-icon-wrapper amber">
                  <Search size={32} />
                </div>
                <h3>Arama Yap</h3>
                <p>
                  Yüzey jeokimya örnek kodlarına, spektrometre ölçümlerine, koordinat bölgelerine veya mineral alterasyon tiplerine göre arama yapın.
                </p>
                <div className="card-footer-btn">
                  <span>Arama Ekranını Aç (Yakında)</span>
                  <ArrowRight size={16} />
                </div>
              </div>
            </div>

            <div className="portal-card animate-fade-in" onClick={() => setAppMode('yuzey_browse')}>
              <div className="card-glow" />
              <div className="card-content">
                <div className="card-icon-wrapper amber">
                  <Map size={32} />
                </div>
                <h3>Veritabanını İncele</h3>
                <p>
                  Yüzey yapısal haritalama verilerini, Sentinel-2 ve ASTER spektral anomali bantlarını GIS entegrasyonuyla harita üzerinde inceleyin.
                </p>
                <div className="card-footer-btn">
                  <span>Harita Ekranına Git (Yakında)</span>
                  <ArrowRight size={16} />
                </div>
              </div>
            </div>
          </div>

          <footer className="portal-footer">
            <p>© {new Date().getFullYear()} Kale Maden A.Ş. — Çanakkale / Biga Projeleri.</p>
          </footer>
        </div>
      </div>
    );
  }

  if (appMode === 'sondaj_search') {
    return (
      <div className="portal-container" style={{ backgroundImage: "url('/geology_bg.png')" }}>
        <div className="portal-overlay" />
        <div className="portal-content search-mode-content">
          <button className="btn btn-secondary back-to-portal-btn" onClick={() => setAppMode('sondaj_menu')}>
            <ChevronLeft size={16} /> Geri Dön
          </button>
          
          <header className="portal-header">
            <h1>SONDAJ ARAMA PANELİ</h1>
            <p className="portal-subtitle">Kuyu ID, Proje, Logger veya Durum Bilgisine Göre Arama</p>
          </header>

          <div className="search-bar-container">
            <Search size={20} className="search-bar-icon" />
            <input 
              type="text" 
              className="portal-search-input"
              placeholder="Aramak istediğiniz kuyu kodu, proje adı veya logger bilgisini yazın..." 
              value={portalSearchQuery}
              onChange={e => setPortalSearchQuery(e.target.value)}
              autoFocus
            />
          </div>

          <div className="search-results-container">
            {portalSearchResults.length === 0 ? (
              <div className="no-search-results">
                <Search size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                <h3>Eşleşen Kuyu Bulunamadı</h3>
                <p>Arama teriminizi kontrol edin veya farklı bir anahtar kelime deneyin.</p>
              </div>
            ) : (
              <div className="search-results-grid">
                {portalSearchResults.map(hId => {
                  const proj = getHoleProjectName(hId) || 'Belirtilmemiş';
                  const isMetallic = METALLIC_HOLES.includes(hId.trim().toUpperCase());
                  const cData = db[hId]?.collar || {};
                  const depth = cData.totalDepth || 0;
                  const logger = cData.logger || 'Bilinmiyor';
                  const status = cData.status || 'Planned';
                  
                  return (
                    <div 
                      key={hId} 
                      className={`search-result-card ${isMetallic ? 'metallic-border' : 'industrial-border'}`}
                      onClick={() => {
                        setSelectedHoleId(hId);
                        setAppMode('drillhole');
                        setPortalSearchQuery('');
                      }}
                    >
                      <div className="result-card-header">
                        <span className="result-hole-id">{hId}</span>
                        <span className={`badge ${
                          status === 'Completed' ? 'badge-success' : 
                          status === 'In Progress' ? 'badge-warning' : 'badge-danger'
                        }`}>
                          {status}
                        </span>
                      </div>
                      
                      <div className="result-card-body">
                        <div className="result-meta-row">
                          <span className="meta-label">Proje:</span>
                          <span className="meta-value">{proj}</span>
                        </div>
                        <div className="result-meta-row">
                          <span className="meta-label">Tip:</span>
                          <span className="meta-value">{isMetallic ? 'Metalik' : 'Endüstriyel'}</span>
                        </div>
                        <div className="result-meta-row">
                          <span className="meta-label">Derinlik:</span>
                          <span className="meta-value">{depth} m</span>
                        </div>
                        <div className="result-meta-row">
                          <span className="meta-label">Logger:</span>
                          <span className="meta-value">{logger}</span>
                        </div>
                      </div>
                      
                      <div className="result-card-footer">
                        <span>Detayları Görüntüle</span>
                        <ArrowRight size={14} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <footer className="portal-footer">
            <p>© {new Date().getFullYear()} Kale Maden A.Ş. — Toplam {holeList.length} kayıt arasından arama yapılıyor.</p>
          </footer>
        </div>
      </div>
    );
  }

  if (appMode === 'yuzey_search') {
    return (
      <div className="portal-container surface-mode" style={{ backgroundImage: "url('/geology_bg.png')" }}>
        <div className="portal-overlay" />
        <div className="portal-content">
          <button className="btn btn-secondary back-to-portal-btn" onClick={() => setAppMode('yuzey_menu')}>
            <ChevronLeft size={16} /> Geri Dön
          </button>
          
          <header className="portal-header">
            <div className="portal-logo animate-pulse">
              <Search size={48} className="logo-icon amber" />
            </div>
            <h1>YÜZEY JEOKİMYA ARAMA</h1>
            <p className="portal-subtitle">Jeokimya Örnekleri ve Spektrometre Arama Modülü</p>
          </header>

          <div className="coming-soon-container">
            <div className="coming-soon-card">
              <div className="coming-soon-badge">YAKINDA HİZMETİNİZDE</div>
              <h2>Sahadan Toplanan Yüzey Verileri Filtreleme Sistemi</h2>
              <p>
                Biga Yarımadası projelerimiz kapsamında araziden alınan jeokimya örnek verilerinin analiz sonuçları, XRD/XRF spektral bulguları ve yüzey alterasyon haritaları üzerinde akıllı sorgulama yapabileceğiniz arama altyapısı hazırlanmaktadır.
              </p>
              
              <div className="coming-soon-progress">
                <div className="progress-label">
                  <span>Geliştirme Aşaması (Arama Altyapısı)</span>
                  <span>60%</span>
                </div>
                <div className="progress-bar-container">
                  <div className="progress-bar-fill" style={{ width: '60%' }}></div>
                </div>
              </div>
            </div>
          </div>

          <footer className="portal-footer">
            <p>© {new Date().getFullYear()} Kale Maden A.Ş. — Çanakkale / Biga Projeleri.</p>
          </footer>
        </div>
      </div>
    );
  }

  if (appMode === 'yuzey_browse') {
    return (
      <div className="portal-container surface-mode" style={{ backgroundImage: "url('/geology_bg.png')" }}>
        <div className="portal-overlay" />
        <div className="portal-content">
          <button className="btn btn-secondary back-to-portal-btn" onClick={() => setAppMode('yuzey_menu')}>
            <ChevronLeft size={16} /> Geri Dön
          </button>
          
          <header className="portal-header">
            <div className="portal-logo animate-pulse">
              <Map size={48} className="logo-icon amber" />
            </div>
            <h1>YÜZEY CBS HARİTA BROWSER</h1>
            <p className="portal-subtitle">Uzaktan Algılama ve Yapısal Jeoloji GIS Katmanları</p>
          </header>

          <div className="coming-soon-container">
            <div className="coming-soon-card">
              <div className="coming-soon-badge">YAKINDA HİZMETİNİZDE</div>
              <h2>İnteraktif Web GIS & Katman İnceleme Modülü</h2>
              <p>
                Sentinel-2 ve ASTER uydu görüntülerinden elde edilen spektral mineral indeksleri (demir oksit, kil, alterasyon anomalileri) ve MTA 1/25.000 jeoloji haritalarının CBS katmanı olarak harita üzerinde görüntülenebileceği web ara yüzü hazırlanmaktadır.
              </p>
              
              <div className="coming-soon-progress">
                <div className="progress-label">
                  <span>Geliştirme Aşaması (GIS Entegrasyonu)</span>
                  <span>80%</span>
                </div>
                <div className="progress-bar-container">
                  <div className="progress-bar-fill" style={{ width: '80%' }}></div>
                </div>
              </div>
            </div>
          </div>

          <footer className="portal-footer">
            <p>© {new Date().getFullYear()} Kale Maden A.Ş. — Çanakkale / Biga Projeleri.</p>
          </footer>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Top Application Bar */}
      <header className="app-header">
        <div className="header-brand">
          <button 
            className="btn btn-secondary portal-nav-btn" 
            onClick={() => setAppMode('sondaj_menu')}
            title="Sondaj Menüsüne Dön"
          >
            <Home size={14} />
            <span>Portal</span>
          </button>
          <Database size={24} />
          <h1>KaleMaden Drillhole Manager</h1>
          <div className="sync-status-indicator" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '16px', fontSize: '11px', fontWeight: 600, padding: '4px 8px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.05)' }}>
            {!isSupabaseConfigured() ? (
              <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#64748b' }} />
                Çevrimdışı Mod (Sadece Yerel)
              </span>
            ) : !isOnline ? (
              <span style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '6px' }} title="İnternet bağlantısı geldiğinde otomatik buluta yedeklenecektir.">
                <span className="animate-pulse" style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
                Çevrimdışı (Eşitleme Bekliyor)
              </span>
            ) : isSavingToDb ? (
              <span style={{ color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="animate-pulse" style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#3b82f6' }} />
                Kaydediliyor...
              </span>
            ) : isDirty ? (
              <span style={{ color: '#f97316', display: 'flex', alignItems: 'center', gap: '6px' }} title="Yerel değişiklikleriniz var, buluta henüz kaydedilmedi.">
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#f97316' }} />
                Kaydedilmemiş Değişiklikler
              </span>
            ) : (
              <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                Bulutla Eşitlendi
              </span>
            )}
          </div>
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
          {isAdmin && (
            <button className="btn btn-danger" onClick={clearAllData}>
              <Trash2 size={14} /> Reset / Clear
            </button>
          )}
          {isSupabaseConfigured() && (userEmail || guestMode) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', marginRight: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#e2e8f0' }}>
                {guestMode ? 'Misafir Modu' : userEmail}
              </span>
              <button 
                onClick={handleLogout} 
                style={{ 
                  background: 'transparent', 
                  border: 'none', 
                  color: '#f87171', 
                  fontSize: '11px', 
                  fontWeight: 700, 
                  cursor: 'pointer',
                  padding: '2px 4px',
                  textDecoration: 'underline'
                }}
              >
                Çıkış Yap
              </button>
            </div>
          )}
          {isAdmin && (
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
          )}
        </div>
      </header>

      {/* Split Screens Panel */}
      <main className="app-main">
        <section className="data-entry-panel" style={{ width: `${leftWidth}%` }}>
          <nav className="tab-navigation" onWheel={(e) => { e.currentTarget.scrollLeft += e.deltaY; }}>
            {['Collar', 'Survey', 'Lithology', 'Alteration', 'TCR / RQD', 'Assay', 'Sample Preparation', 'Sample Prep Metallic', 'QA/QC Dashboard'].map(tab => {
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
              <CollarTab collar={collar} setCollar={setCollar} errors={errors} onRenameHole={renameDrillhole} isAdmin={isAdmin} />
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

            {activeTab === 'Alteration' && (
              <GridTable
                title="Alteration & Redox Mineralization Logging"
                columns={alterationColumns}
                data={alterations}
                onChange={setAlterations}
                errors={errors}
                tabName="Alteration"
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
                columns={isHoleMetallic(selectedHoleId) ? metallicAssayColumns : assayColumns}
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

        <div
          className="main-pane-resizer"
          onMouseDown={handleResizerMouseDown}
        />

        {/* Visual Charts & Warnings Panel (Right, 40% Width) */}
        <section className="visuals-panel" style={{ width: `${100 - leftWidth}%` }}>
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
                key={selectedHoleId}
                holeId={selectedHoleId}
                collar={collar}
                totalDepth={collar.totalDepth}
                lithology={lithology}
                geotech={geotech}
                assays={assays}
                alterations={alterations}
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
