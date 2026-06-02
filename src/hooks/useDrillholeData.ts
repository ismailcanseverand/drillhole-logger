import { useState, useEffect } from 'react';
import { calculateDownholeTrace } from '../utils/math';
import type { Coordinates3D } from '../utils/math';
import {
  validateCollar,
  validateSurveys,
  validateIntervals,
  validateGeotech,
  validateAssays
} from '../utils/validation';
import type { ValidationError } from '../utils/validation';
import { getSupabaseClient } from '../utils/supabaseClient';

// Helper functions to parse and serialize photo tag from description field
export function parsePhotoFromDescription(desc: string): { description: string; photo?: string } {
  if (!desc) return { description: '' };
  const photoRegex = /\[PHOTO:(.*?)\]/;
  const match = desc.match(photoRegex);
  if (match) {
    return {
      description: desc.replace(photoRegex, '').trim(),
      photo: match[1]
    };
  }
  return { description: desc };
}

export function serializePhotoIntoDescription(desc: string, photo?: string): string {
  const cleanDesc = desc ? desc.replace(/\[PHOTO:(.*?)\]/, '').trim() : '';
  if (photo) {
    return `${cleanDesc} [PHOTO:${photo}]`.trim();
  }
  return cleanDesc;
}

export interface CollarState {
  holeId: string;
  easting: number;
  northing: number;
  elevation: number;
  totalDepth: number;
  dip: number;
  azimuth: number;
  dateStarted: string;
  dateCompleted: string;
  logger: string;
  status: 'Planned' | 'In Progress' | 'Completed';
}

export interface SurveyState {
  id: string;
  depth: number;
  dip: number;
  azimuth: number;
}

export interface LithologyState {
  id: string;
  from: number;
  to: number;
  rockCode: string;
  alteration: string;
  mineralization: string;
  description: string;
  photo?: string; // base64 string or public URL
}

export interface GeotechState {
  id: string;
  from: number;
  to: number;
  drilledLength: number;
  recoveredLength: number;
  solidPiecesOver10cm: number;
  tcrPercent: number;
  rqdPercent: number;
}

export interface AssayState {
  id: string;
  sampleId: string;
  from: number;
  to: number;
  sampleType: 'Core' | 'Standard' | 'Blank' | 'Duplicate';
  al2o3: number; // Al2O3 (%)
  fe2o3: number; // Fe2O3 (%)
  sio2: number;  // SiO2 (%)
  tio2: number;  // TiO2 (%)
  na2o_k2o: number; // Na2O + K2O (%)
  loi: number;   // Loss on ignition (%)
}

export interface SamplePreparationState {
  id: string;
  sampleTag: string;
  from: number;
  to: number;
  oreType: string;
  description: string;
  chemical: 'XRF' | 'XRD' | 'XRF + XRD' | '';
  otherChemical: 'SO4' | 'Mn' | 'Cr' | 'SO4 + Mn' | 'SO4 + Cr' | 'Mn + Cr' | 'SO4 + Mn + Cr' | '';
  physical: string;
}

// Initial empty states before loading data
const EMPTY_COLLAR: CollarState = {
  holeId: 'Select a Drillhole',
  easting: 0,
  northing: 0,
  elevation: 0,
  totalDepth: 100,
  dip: -90,
  azimuth: 0,
  dateStarted: '',
  dateCompleted: '',
  logger: '',
  status: 'Planned'
};

const KNOWN_LOGGERS = ["İsmailcan SEVER", "Altan COŞKUN", "Levent CAN", "Mehmet KOLDANCI", "Muhammed KAYALIDAĞ", "Mustafa KAŞ", "Emir Özçakıcı"];

function sanitizeLogger(logger: string | undefined | null): string {
  if (!logger) return '';
  return KNOWN_LOGGERS.includes(logger) ? logger : '';
}

export function useDrillholeData() {
  const [db, setDb] = useState<Record<string, any>>({});
  const [holeList, setHoleList] = useState<string[]>([]);
  const [selectedHoleId, setSelectedHoleId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Drillhole specific logging states
  const [collar, setCollar] = useState<CollarState>(EMPTY_COLLAR);
  const [surveys, setSurveys] = useState<SurveyState[]>([]);
  const [lithology, setLithology] = useState<LithologyState[]>([]);
  const [geotech, setGeotech] = useState<GeotechState[]>([]);
  const [assays, setAssays] = useState<AssayState[]>([]);
  const [samplePrep, setSamplePrep] = useState<SamplePreparationState[]>([]);

  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [trace, setTrace] = useState<Coordinates3D[]>([]);

  // 1. Fetch compiled Excel JSON database on mount + merge with Supabase holes list if connected
  useEffect(() => {
    const loadHoles = async () => {
      let localKeys: string[] = [];
      let localData: Record<string, any> = {};

      try {
        const res = await fetch('/drillhole_data.json');
        localData = await res.json();
        setDb(localData);
        localKeys = Object.keys(localData);
      } catch (err) {
        console.error('Failed to read local drillhole JSON template:', err);
      }

      // 1. Instantly populate dropdown with local keys & select default
      const initialHole = localKeys.includes('CYHN-33') ? 'CYHN-33' : (localKeys[0] || '');
      setHoleList(localKeys);
      setSelectedHoleId(initialHole);

      // 2. Disable loading screen immediately so the UI is active and responsive!
      setIsLoading(false);

      // 3. Asynchronously fetch database drillholes in the background (non-blocking)
      const client = getSupabaseClient();
      if (client) {
        try {
          const { data, error } = await client.from('collars').select('hole_id');
          if (error) throw error;
          
          if (data) {
            const dbKeys = data.map((d: any) => d.hole_id);
            const mergedKeys = Array.from(new Set([...dbKeys, ...localKeys])).sort();
            setHoleList(mergedKeys);
          }
        } catch (dbErr) {
          console.error('Failed to retrieve holes list from Supabase in the background:', dbErr);
        }
      }
    };

    loadHoles();
  }, []);

  // 2. Load selected hole logs (checks Supabase first, falls back to LocalStorage, then to local JSON)
  useEffect(() => {
    if (!selectedHoleId || Object.keys(db).length === 0) return;

    const loadHoleRecord = async () => {
      const client = getSupabaseClient();
      
      // If Supabase is connected, query the database tables for this hole
      if (client) {
        try {
          const { data: collarData, error: cErr } = await client.from('collars').select('*').eq('hole_id', selectedHoleId).maybeSingle();
          if (cErr) throw cErr;

          if (collarData) {
            // Load child tables
            const { data: sData } = await client.from('surveys').select('*').eq('hole_id', selectedHoleId);
            const { data: lData } = await client.from('lithologies').select('*').eq('hole_id', selectedHoleId);
            const { data: gData } = await client.from('geotechs').select('*').eq('hole_id', selectedHoleId);
            const { data: aData } = await client.from('assays').select('*').eq('hole_id', selectedHoleId);

            setCollar({
              holeId: collarData.hole_id,
              easting: collarData.easting,
              northing: collarData.northing,
              elevation: collarData.elevation,
              totalDepth: collarData.total_depth,
              dip: collarData.dip,
              azimuth: collarData.azimuth,
              dateStarted: collarData.date_started || '',
              dateCompleted: collarData.date_completed || '',
              logger: sanitizeLogger(collarData.logger),
              status: collarData.status || 'Planned'
            });

            setSurveys((sData || []).map((s: any) => ({
              id: s.id,
              depth: s.depth,
              dip: s.dip,
              azimuth: s.azimuth
            })));

            setLithology((lData || []).map((l: any) => {
              const { description, photo } = parsePhotoFromDescription(l.description || '');
              return {
                id: l.id,
                from: l.from_depth,
                to: l.to_depth,
                rockCode: l.rock_code,
                alteration: l.alteration || '',
                mineralization: l.mineralization || '',
                description,
                photo
              };
            }).sort((a: LithologyState, b: LithologyState) => a.from - b.from));

            setGeotech((gData || []).map((g: any) => ({
              id: g.id,
              from: g.from_depth,
              to: g.to_depth,
              drilledLength: g.drilled_length,
              recoveredLength: g.recovered_length,
              solidPiecesOver10cm: g.solid_pieces_over_10cm,
              tcrPercent: g.tcr_percent,
              rqdPercent: g.rqd_percent
            })).sort((a: GeotechState, b: GeotechState) => a.from - b.from));

            setAssays((aData || []).map((a: any) => ({
              id: a.id,
              sampleId: a.sample_id,
              from: a.from_depth,
              to: a.to_depth,
              sampleType: a.sample_type,
              al2o3: a.al2o3,
              fe2o3: a.fe2o3,
              sio2: a.sio2,
              tio2: a.tio2,
              na2o_k2o: a.na2o_k2o,
              loi: a.loi
            })).sort((a: AssayState, b: AssayState) => a.from - b.from));

            return; // Successfully loaded from Supabase database
          }
        } catch (err) {
          console.error('Failed to load active hole from Supabase, falling back to local:', err);
        }
      }

      // Fallback: Check if there are local edits stored in LocalStorage for this hole
      const localCollar = localStorage.getItem(`dh_${selectedHoleId}_collar`);
      const localSurveys = localStorage.getItem(`dh_${selectedHoleId}_surveys`);
      const localLitho = localStorage.getItem(`dh_${selectedHoleId}_litho`);
      const localGeotech = localStorage.getItem(`dh_${selectedHoleId}_geotech`);
      const localAssays = localStorage.getItem(`dh_${selectedHoleId}_assays`);
      const localSamplePrep = localStorage.getItem(`dh_${selectedHoleId}_sampleprep`);

      if (localCollar) {
        const parsedCollar = JSON.parse(localCollar);
        const parsedLitho = localLitho ? JSON.parse(localLitho) : [];
        const parsedAssays = localAssays ? JSON.parse(localAssays) : [];
        
        // Self-healing check: If localStorage has empty data arrays but the read-only JSON database has actual logs,
        // it means we encountered a race condition template write. In this case, clean up and load from DB instead.
        const dbHole = db[selectedHoleId];
        if (dbHole && 
            (dbHole.lithology.length > 0 || dbHole.assays.length > 0) && 
            (parsedLitho.length === 0 && parsedAssays.length === 0)) {
          console.warn(`Cleaned up empty local storage race condition templates for: ${selectedHoleId}`);
          localStorage.removeItem(`dh_${selectedHoleId}_collar`);
          localStorage.removeItem(`dh_${selectedHoleId}_surveys`);
          localStorage.removeItem(`dh_${selectedHoleId}_litho`);
          localStorage.removeItem(`dh_${selectedHoleId}_geotech`);
          localStorage.removeItem(`dh_${selectedHoleId}_assays`);
          localStorage.removeItem(`dh_${selectedHoleId}_sampleprep`);

          setCollar({ ...dbHole.collar, logger: sanitizeLogger(dbHole.collar?.logger) });
          setSurveys(dbHole.surveys);
          setLithology(dbHole.lithology);
          setGeotech(dbHole.geotech);
          setAssays(dbHole.assays);
          setSamplePrep([]);
        } else {
          setCollar({ ...parsedCollar, logger: sanitizeLogger(parsedCollar.logger) });
          setSurveys(localSurveys ? JSON.parse(localSurveys) : []);
          setLithology(localLitho ? JSON.parse(localLitho) : []);
          setGeotech(localGeotech ? JSON.parse(localGeotech) : []);
          setAssays(localAssays ? JSON.parse(localAssays) : []);
          setSamplePrep(localSamplePrep ? JSON.parse(localSamplePrep) : []);
        }
      } else if (db[selectedHoleId]) {
        // Fallback: Read from the read-only JSON database templates
        const holeData = db[selectedHoleId];
        setCollar({
          ...holeData.collar,
          logger: sanitizeLogger(holeData.collar?.logger)
        });

        setSurveys(holeData.surveys);
        setLithology((holeData.lithology || []).map((l: any) => {
          const { description, photo } = parsePhotoFromDescription(l.description || '');
          return {
            ...l,
            description,
            photo
          };
        }));
        setGeotech(holeData.geotech);
        setAssays(holeData.assays);
        setSamplePrep([]);
      } else {
        // Initialize an empty template for newly created holes
        setCollar({
          holeId: selectedHoleId,
          easting: 0,
          northing: 0,
          elevation: 0,
          totalDepth: 100,
          dip: -90,
          azimuth: 0,
          dateStarted: '',
          dateCompleted: '',
          logger: '',
          status: 'Planned'
        });
        setSurveys([
          { id: 's1', depth: 0, dip: -90, azimuth: 0 },
          { id: 's2', depth: 100, dip: -90, azimuth: 0 }
        ]);
        setLithology([]);
        setGeotech([]);
        setAssays([]);
        setSamplePrep([]);
      }
    };

    loadHoleRecord();
  }, [selectedHoleId, db]);

  // 3. Save logs to LocalStorage on modifications (ensures we only save when collar matches selectedHoleId)
  useEffect(() => {
    if (!selectedHoleId || collar.holeId !== selectedHoleId) return;
    localStorage.setItem(`dh_${selectedHoleId}_collar`, JSON.stringify(collar));
  }, [collar, selectedHoleId]);

  useEffect(() => {
    if (!selectedHoleId || collar.holeId !== selectedHoleId) return;
    localStorage.setItem(`dh_${selectedHoleId}_surveys`, JSON.stringify(surveys));
  }, [surveys, selectedHoleId, collar.holeId]);

  useEffect(() => {
    if (!selectedHoleId || collar.holeId !== selectedHoleId) return;
    localStorage.setItem(`dh_${selectedHoleId}_litho`, JSON.stringify(lithology));
  }, [lithology, selectedHoleId, collar.holeId]);

  useEffect(() => {
    if (!selectedHoleId || collar.holeId !== selectedHoleId) return;
    localStorage.setItem(`dh_${selectedHoleId}_geotech`, JSON.stringify(geotech));
  }, [geotech, selectedHoleId, collar.holeId]);

  useEffect(() => {
    if (!selectedHoleId || collar.holeId !== selectedHoleId) return;
    localStorage.setItem(`dh_${selectedHoleId}_assays`, JSON.stringify(assays));
  }, [assays, selectedHoleId, collar.holeId]);

  useEffect(() => {
    if (!selectedHoleId || collar.holeId !== selectedHoleId) return;
    localStorage.setItem(`dh_${selectedHoleId}_sampleprep`, JSON.stringify(samplePrep));
  }, [samplePrep, selectedHoleId, collar.holeId]);

  // 4. Trace calculations and validation routines
  useEffect(() => {
    if (!selectedHoleId) return;
    
    const calculatedTrace = calculateDownholeTrace(
      {
        easting: collar.easting,
        northing: collar.northing,
        elevation: collar.elevation,
        dip: collar.dip,
        azimuth: collar.azimuth
      },
      surveys.map(s => ({ depth: s.depth, dip: s.dip, azimuth: s.azimuth }))
    );
    setTrace(calculatedTrace);

    // Run validations
    const collarErrors = validateCollar(collar);
    const surveyErrors = validateSurveys(surveys, collar.totalDepth);
    const lithologyErrors = validateIntervals(lithology, 'Lithology', collar.totalDepth);
    const geotechErrors = [
      ...validateIntervals(geotech, 'Geotech', collar.totalDepth),
      ...validateGeotech(geotech)
    ];
    const assayErrors = [
      ...validateIntervals(
        assays.filter(a => a.sampleType === 'Core'),
        'Assay',
        collar.totalDepth
      ),
      ...validateAssays(assays)
    ];

    setErrors([
      ...collarErrors,
      ...surveyErrors,
      ...lithologyErrors,
      ...geotechErrors,
      ...assayErrors
    ]);
  }, [collar, surveys, lithology, geotech, assays, selectedHoleId]);

  // Create a brand new drillhole log
  const createNewHole = async (newHoleId: string) => {
    const cleaned = newHoleId.trim().toUpperCase();
    if (!cleaned) return;

    if (holeList.includes(cleaned)) {
      alert(`A drillhole with ID "${cleaned}" already exists.`);
      return;
    }

    const defaultCollar: CollarState = {
      holeId: cleaned,
      easting: 0.0,
      northing: 0.0,
      elevation: 0.0,
      totalDepth: 100.0,
      dip: -90.0,
      azimuth: 0.0,
      dateStarted: '',
      dateCompleted: '',
      logger: '',
      status: 'Planned'
    };

    const defaultSurveys: SurveyState[] = [
      { id: 's1', depth: 0.0, dip: -90.0, azimuth: 0.0 },
      { id: 's2', depth: 100.0, dip: -90.0, azimuth: 0.0 }
    ];

    // Store in localStorage immediately
    localStorage.setItem(`dh_${cleaned}_collar`, JSON.stringify(defaultCollar));
    localStorage.setItem(`dh_${cleaned}_surveys`, JSON.stringify(defaultSurveys));
    localStorage.setItem(`dh_${cleaned}_litho`, JSON.stringify([]));
    localStorage.setItem(`dh_${cleaned}_geotech`, JSON.stringify([]));
    localStorage.setItem(`dh_${cleaned}_assays`, JSON.stringify([]));
    localStorage.setItem(`dh_${cleaned}_sampleprep`, JSON.stringify([]));

    // If Supabase is connected, insert new collar record directly
    const client = getSupabaseClient();
    if (client) {
      try {
        const { error } = await client.from('collars').insert({
          hole_id: cleaned,
          total_depth: 100.0,
          dip: -90.0,
          azimuth: 0.0,
          logger: '',
          status: 'Planned'
        });
        if (error) throw error;
      } catch (err) {
        console.error('Failed to create new collar in Supabase:', err);
      }
    }

    setHoleList(prev => [...prev, cleaned].sort());
    setSelectedHoleId(cleaned);
  };

  const renameDrillhole = async (oldHoleId: string, newHoleId: string): Promise<boolean> => {
    const cleanedOld = oldHoleId.trim().toUpperCase();
    const cleanedNew = newHoleId.trim().toUpperCase();
    
    if (!cleanedNew) {
      alert('Drillhole ID cannot be empty.');
      return false;
    }
    
    if (cleanedOld === cleanedNew) {
      return true; // No change
    }
    
    // Check if new ID already exists
    if (holeList.includes(cleanedNew)) {
      alert(`A drillhole with ID "${cleanedNew}" already exists.`);
      return false;
    }
    
    if (!window.confirm(`Are you sure you want to rename drillhole "${cleanedOld}" to "${cleanedNew}"? This will update all your locally stored logs and database records for this hole.`)) {
      return false;
    }
    
    // 1. Rename LocalStorage keys
    const collarKeyOld = `dh_${cleanedOld}_collar`;
    const surveysKeyOld = `dh_${cleanedOld}_surveys`;
    const lithoKeyOld = `dh_${cleanedOld}_litho`;
    const geotechKeyOld = `dh_${cleanedOld}_geotech`;
    const assaysKeyOld = `dh_${cleanedOld}_assays`;
    
    const collarKeyNew = `dh_${cleanedNew}_collar`;
    const surveysKeyNew = `dh_${cleanedNew}_surveys`;
    const lithoKeyNew = `dh_${cleanedNew}_litho`;
    const geotechKeyNew = `dh_${cleanedNew}_geotech`;
    const assaysKeyNew = `dh_${cleanedNew}_assays`;
    
    const localCollarStr = localStorage.getItem(collarKeyOld);
    const localSurveysStr = localStorage.getItem(surveysKeyOld);
    const localLithoStr = localStorage.getItem(lithoKeyOld);
    const localGeotechStr = localStorage.getItem(geotechKeyOld);
    const localAssaysStr = localStorage.getItem(assaysKeyOld);
    
    let updatedCollar = { ...collar, holeId: cleanedNew };
    if (localCollarStr) {
      try {
        updatedCollar = { ...JSON.parse(localCollarStr), holeId: cleanedNew };
      } catch (e) {
        console.error('Failed to parse local collar during rename:', e);
      }
    }
    
    const samplePrepKeyOld = `dh_${cleanedOld}_sampleprep`;
    const samplePrepKeyNew = `dh_${cleanedNew}_sampleprep`;
    const localSamplePrepStr = localStorage.getItem(samplePrepKeyOld);

    localStorage.setItem(collarKeyNew, JSON.stringify(updatedCollar));
    if (localSurveysStr) localStorage.setItem(surveysKeyNew, localSurveysStr);
    if (localLithoStr) localStorage.setItem(lithoKeyNew, localLithoStr);
    if (localGeotechStr) localStorage.setItem(geotechKeyNew, localGeotechStr);
    if (localAssaysStr) localStorage.setItem(assaysKeyNew, localAssaysStr);
    if (localSamplePrepStr) localStorage.setItem(samplePrepKeyNew, localSamplePrepStr);
    
    localStorage.removeItem(collarKeyOld);
    localStorage.removeItem(surveysKeyOld);
    localStorage.removeItem(lithoKeyOld);
    localStorage.removeItem(geotechKeyOld);
    localStorage.removeItem(assaysKeyOld);
    localStorage.removeItem(samplePrepKeyOld);
    
    // 2. Update database (Supabase) if connected
    const client = getSupabaseClient();
    if (client) {
      try {
        const { data: dbCollar, error: collarCheckErr } = await client
          .from('collars')
          .select('hole_id')
          .eq('hole_id', cleanedOld)
          .maybeSingle();
          
        if (collarCheckErr) throw collarCheckErr;
        
        if (dbCollar) {
          // A. Insert new collar
          const { error: insertErr } = await client.from('collars').insert({
            hole_id: cleanedNew,
            easting: collar.easting,
            northing: collar.northing,
            elevation: collar.elevation,
            total_depth: collar.totalDepth,
            dip: collar.dip,
            azimuth: collar.azimuth,
            date_started: collar.dateStarted,
            date_completed: collar.dateCompleted,
            logger: collar.logger,
            status: collar.status
          });
          if (insertErr) throw insertErr;
          
          // B. Update children tables
          await client.from('surveys').update({ hole_id: cleanedNew }).eq('hole_id', cleanedOld);
          await client.from('lithologies').update({ hole_id: cleanedNew }).eq('hole_id', cleanedOld);
          await client.from('geotechs').update({ hole_id: cleanedNew }).eq('hole_id', cleanedOld);
          await client.from('assays').update({ hole_id: cleanedNew }).eq('hole_id', cleanedOld);
          
          // C. Delete old collar
          const { error: deleteErr } = await client.from('collars').delete().eq('hole_id', cleanedOld);
          if (deleteErr) throw deleteErr;
        }
      } catch (err: any) {
        console.error('Failed to rename drillhole in Supabase:', err);
        alert(`Failed to rename in database: ${err.message || err}`);
      }
    }
    
    // 3. Update local session db cache
    if (db[cleanedOld]) {
      setDb(prev => {
        const next = { ...prev };
        next[cleanedNew] = next[cleanedOld];
        delete next[cleanedOld];
        return next;
      });
    }
    
    // 4. Update local states
    setHoleList(prev => prev.map(h => h === cleanedOld ? cleanedNew : h).sort());
    setCollar(updatedCollar);
    setSelectedHoleId(cleanedNew);
    return true;
  };

  const resetToDefault = () => {
    if (window.confirm('Reset this drillhole to the original Excel dataset? (Losing current local edits)')) {
      if (selectedHoleId && db[selectedHoleId]) {
        const holeData = db[selectedHoleId];
        localStorage.removeItem(`dh_${selectedHoleId}_collar`);
        localStorage.removeItem(`dh_${selectedHoleId}_surveys`);
        localStorage.removeItem(`dh_${selectedHoleId}_litho`);
        localStorage.removeItem(`dh_${selectedHoleId}_geotech`);
        localStorage.removeItem(`dh_${selectedHoleId}_assays`);
        localStorage.removeItem(`dh_${selectedHoleId}_sampleprep`);
        
        setCollar(holeData.collar);
        setSurveys(holeData.surveys);
        setLithology(holeData.lithology);
        setGeotech(holeData.geotech);
        setAssays(holeData.assays);
        setSamplePrep([]);
      }
    }
  };

  const clearAllData = () => {
    if (window.confirm('Clear all data for this active drillhole?')) {
      setCollar({
        holeId: selectedHoleId || 'NEW-HOLE',
        easting: 0,
        northing: 0,
        elevation: 0,
        totalDepth: 100,
        dip: -90,
        azimuth: 0,
        dateStarted: '',
        dateCompleted: '',
        logger: '',
        status: 'Planned'
      });
      setSurveys([]);
      setLithology([]);
      setGeotech([]);
      setAssays([]);
      setSamplePrep([]);
    }
  };
  const saveActiveHoleToSupabase = async (): Promise<{ success: boolean; message: string }> => {
    const client = getSupabaseClient();
    if (!client) {
      return {
        success: false,
        message: 'Supabase database is not configured. Please open connection settings.'
      };
    }
    try {
      // Check if the drillhole already exists in the database
      const { data: dbCollar, error: checkErr } = await client
        .from('collars')
        .select('*')
        .eq('hole_id', collar.holeId)
        .maybeSingle();

      if (checkErr) throw checkErr;

      if (dbCollar) {
        // Fetch all child tables to check for changes
        const { data: dbSurveys } = await client.from('surveys').select('*').eq('hole_id', collar.holeId);
        const { data: dbLithology } = await client.from('lithologies').select('*').eq('hole_id', collar.holeId);
        const { data: dbGeotech } = await client.from('geotechs').select('*').eq('hole_id', collar.holeId);
        const { data: dbAssays } = await client.from('assays').select('*').eq('hole_id', collar.holeId);

        // 1. Compare Collar
        const collarMatches =
          dbCollar.easting === collar.easting &&
          dbCollar.northing === collar.northing &&
          dbCollar.elevation === collar.elevation &&
          dbCollar.total_depth === collar.totalDepth &&
          dbCollar.dip === collar.dip &&
          dbCollar.azimuth === collar.azimuth &&
          (dbCollar.date_started || '') === collar.dateStarted &&
          (dbCollar.date_completed || '') === collar.dateCompleted &&
          !["İsmailcan SEVER", "Altan COŞKUN", "Levent CAN", "Mehmet KOLDANCI", "Muhammed KAYALIDAĞ", "Mustafa KAŞ", "Emir Özçakıcı"].includes(collar.logger) && collar.logger && (
          (dbCollar.status || '') === collar.status);

        // 2. Compare Surveys
        const cleanDbSurveys = (dbSurveys || []).map((s: any) => ({ depth: s.depth, dip: s.dip, azimuth: s.azimuth }));
        const cleanLocalSurveys = surveys.map((s: SurveyState) => ({ depth: s.depth, dip: s.dip, azimuth: s.azimuth }));
        const surveysMatches = JSON.stringify(cleanDbSurveys.sort((a: any, b: any) => a.depth - b.depth)) === 
                              JSON.stringify(cleanLocalSurveys.sort((a: any, b: any) => a.depth - b.depth));

        // 3. Compare Lithology
        const cleanDbLitho = (dbLithology || []).map((l: any) => {
          const { description, photo } = parsePhotoFromDescription(l.description || '');
          return {
            from: l.from_depth,
            to: l.to_depth,
            rockCode: l.rock_code,
            alteration: l.alteration || '',
            mineralization: l.mineralization || '',
            description,
            photo: photo || ''
          };
        });
        const cleanLocalLitho = lithology.map((l: LithologyState) => ({
          from: l.from,
          to: l.to,
          rockCode: l.rockCode,
          alteration: l.alteration || '',
          mineralization: l.mineralization || '',
          description: l.description || '',
          photo: l.photo || ''
        }));
        const lithoMatches = JSON.stringify(cleanDbLitho.sort((a: any, b: any) => a.from - b.from)) === 
                            JSON.stringify(cleanLocalLitho.sort((a: any, b: any) => a.from - b.from));

        // 4. Compare Geotech
        const cleanDbGeotech = (dbGeotech || []).map((g: any) => ({ from: g.from_depth, to: g.to_depth, drilledLength: g.drilled_length, recoveredLength: g.recovered_length, solidPiecesOver10cm: g.solid_pieces_over_10cm, tcrPercent: g.tcr_percent, rqdPercent: g.rqd_percent }));
        const cleanLocalGeotech = geotech.map((g: GeotechState) => ({ from: g.from, to: g.to, drilledLength: g.drilledLength, recoveredLength: g.recoveredLength, solidPiecesOver10cm: g.solidPiecesOver10cm, tcrPercent: g.tcrPercent, rqdPercent: g.rqdPercent }));
        const geotechMatches = JSON.stringify(cleanDbGeotech.sort((a: any, b: any) => a.from - b.from)) === 
                              JSON.stringify(cleanLocalGeotech.sort((a: any, b: any) => a.from - b.from));

        // 5. Compare Assays
        const cleanDbAssays = (dbAssays || []).map((a: any) => ({ sampleId: a.sample_id, from: a.from_depth, to: a.to_depth, sampleType: a.sample_type || 'Core', al2o3: a.al2o3 || 0, fe2o3: a.fe2o3 || 0, sio2: a.sio2 || 0, tio2: a.tio2 || 0, na2o_k2o: a.na2o_k2o || 0, loi: a.loi || 0 }));
        const cleanLocalAssays = assays.map((a: AssayState) => ({ sampleId: a.sampleId, from: a.from, to: a.to, sampleType: a.sampleType || 'Core', al2o3: a.al2o3 || 0, fe2o3: a.fe2o3 || 0, sio2: a.sio2 || 0, tio2: a.tio2 || 0, na2o_k2o: a.na2o_k2o || 0, loi: a.loi || 0 }));
        const assaysMatches = JSON.stringify(cleanDbAssays.sort((a: any, b: any) => a.from - b.from)) === 
                             JSON.stringify(cleanLocalAssays.sort((a: any, b: any) => a.from - b.from));

        const isIdentical = collarMatches && surveysMatches && lithoMatches && geotechMatches && assaysMatches;

        if (isIdentical) {
          return {
            success: true,
            message: `Drillhole "${collar.holeId}" is already up to date with the database. No changes were detected.`
          };
        }
      }

      // 1. Upsert Collar
      const { error: collarErr } = await client.from('collars').upsert({
        hole_id: collar.holeId,
        easting: collar.easting,
        northing: collar.northing,
        elevation: collar.elevation,
        total_depth: collar.totalDepth,
        dip: collar.dip,
        azimuth: collar.azimuth,
        date_started: collar.dateStarted,
        date_completed: collar.dateCompleted,
        logger: collar.logger,
        status: collar.status
      });

      if (collarErr) throw collarErr;

      // 2. Sync Surveys (delete and insert)
      await client.from('surveys').delete().eq('hole_id', collar.holeId);
      if (surveys.length > 0) {
        const { error: sErr } = await client.from('surveys').insert(
          surveys.map((s: SurveyState) => ({
            id: s.id.startsWith(collar.holeId) ? s.id : `${collar.holeId}_${s.id}`,
            hole_id: collar.holeId,
            depth: s.depth,
            dip: s.dip,
            azimuth: s.azimuth
          }))
        );
        if (sErr) throw sErr;
      }

      // 3. Sync Lithologies
      await client.from('lithologies').delete().eq('hole_id', collar.holeId);
      if (lithology.length > 0) {
        const { error: lErr } = await client.from('lithologies').insert(
          lithology.map((l: LithologyState) => ({
            id: l.id.startsWith(collar.holeId) ? l.id : `${collar.holeId}_${l.id}`,
            hole_id: collar.holeId,
            from_depth: l.from,
            to_depth: l.to,
            rock_code: l.rockCode,
            alteration: l.alteration,
            mineralization: l.mineralization,
            description: serializePhotoIntoDescription(l.description, l.photo)
          }))
        );
        if (lErr) throw lErr;
      }

      // 4. Sync Geotechs
      await client.from('geotechs').delete().eq('hole_id', collar.holeId);
      if (geotech.length > 0) {
        const { error: gErr } = await client.from('geotechs').insert(
          geotech.map((g: GeotechState) => ({
            id: g.id.startsWith(collar.holeId) ? g.id : `${collar.holeId}_${g.id}`,
            hole_id: collar.holeId,
            from_depth: g.from,
            to_depth: g.to,
            drilled_length: g.drilledLength,
            recovered_length: g.recoveredLength,
            solid_pieces_over_10cm: g.solidPiecesOver10cm,
            tcr_percent: g.tcrPercent,
            rqd_percent: g.rqdPercent
          }))
        );
        if (gErr) throw gErr;
      }

      // 5. Sync Assays
      await client.from('assays').delete().eq('hole_id', collar.holeId);
      if (assays.length > 0) {
        const { error: aErr } = await client.from('assays').insert(
          assays.map((a: AssayState) => ({
            id: a.id.startsWith(collar.holeId) ? a.id : `${collar.holeId}_${a.id}`,
            hole_id: collar.holeId,
            sample_id: a.sampleId,
            from_depth: a.from,
            to_depth: a.to,
            sample_type: a.sampleType,
            al2o3: a.al2o3,
            fe2o3: a.fe2o3,
            sio2: a.sio2,
            tio2: a.tio2,
            na2o_k2o: a.na2o_k2o,
            loi: a.loi
          }))
        );
        if (aErr) throw aErr;
      }

      return { success: true, message: `Successfully saved logs for ${collar.holeId} to Supabase.` };
    } catch (err: any) {
      console.error(err);
      return { success: false, message: err.message || 'Check database permissions and connection.' };
    }
  };

  return {
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
    errors,
    trace,
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
  };
}
