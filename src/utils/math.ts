/**
 * Math and calculation utilities for Drillhole logging data
 */

export interface SurveyPoint {
  depth: number;
  dip: number;      // degrees (-90 is vertical, 0 is horizontal)
  azimuth: number;  // degrees (0-360)
}

export interface Coordinates3D {
  depth: number;
  x: number; // Easting
  y: number; // Northing
  z: number; // Elevation / RL
}

/**
 * Calculate Total Core Recovery (TCR) Percentage
 * TCR% = (Recovered Length / Drilled Length) * 100
 */
export function calculateTCR(recoveredLength: number, drilledLength: number): number {
  if (drilledLength <= 0) return 0;
  const tcr = (recoveredLength / drilledLength) * 100;
  return Math.min(100, Math.max(0, parseFloat(tcr.toFixed(2))));
}

/**
 * Calculate Rock Quality Designation (RQD) Percentage
 * RQD% = (Sum of solid core pieces > 10cm / Drilled Length) * 100
 */
export function calculateRQD(solidPiecesLength: number, drilledLength: number): number {
  if (drilledLength <= 0) return 0;
  const rqd = (solidPiecesLength / drilledLength) * 100;
  return Math.min(100, Math.max(0, parseFloat(rqd.toFixed(2))));
}

/**
 * Calculates the downhole 3D trace (x, y, z path) using the Balanced Tangential Method.
 * 
 * Collar starts at (east, north, elevation) with initial dip/azimuth at depth 0.
 * Surveys contain measurements at various downhole depths.
 * 
 * Note: dip in degrees where -90 is straight down, 0 is horizontal.
 * azimuth in degrees where 0 is true North, 90 is East.
 */
export function calculateDownholeTrace(
  collar: { easting: number; northing: number; elevation: number; dip: number; azimuth: number },
  surveys: SurveyPoint[]
): Coordinates3D[] {
  // Sort surveys by depth
  const sortedSurveys = [...surveys].sort((a, b) => a.depth - b.depth);
  
  // Ensure we have a starting survey at depth 0 using collar dip/az
  if (sortedSurveys.length === 0 || sortedSurveys[0].depth > 0) {
    sortedSurveys.unshift({
      depth: 0,
      dip: collar.dip,
      azimuth: collar.azimuth
    });
  }

  const trace: Coordinates3D[] = [];
  
  // Starting point at collar
  let currentX = collar.easting;
  let currentY = collar.northing;
  let currentZ = collar.elevation;

  trace.push({
    depth: 0,
    x: currentX,
    y: currentY,
    z: currentZ
  });

  for (let i = 1; i < sortedSurveys.length; i++) {
    const s1 = sortedSurveys[i - 1];
    const s2 = sortedSurveys[i];
    
    const dL = s2.depth - s1.depth;
    if (dL <= 0) continue;

    // Convert angles to standard spherical coordinates
    // Dip is geological dip (-90 straight down).
    // In standard spherical coords: inclination = 90 - dip. If dip is -90, inc = 180 (straight down).
    // If dip is 0, inc = 90 (horizontal).
    const inc1 = (90 - s1.dip) * (Math.PI / 180);
    const inc2 = (90 - s2.dip) * (Math.PI / 180);

    // Azimuth: 0 = North (+Y), 90 = East (+X)
    // Convert to standard mathematical angle: theta = 90 - azimuth
    const az1 = (90 - s1.azimuth) * (Math.PI / 180);
    const az2 = (90 - s2.azimuth) * (Math.PI / 180);

    // Balanced Tangential Method
    // dx = 0.5 * dL * (sin(inc1)*cos(az1) + sin(inc2)*cos(az2))
    // dy = 0.5 * dL * (sin(inc1)*sin(az1) + sin(inc2)*sin(az2))
    // dz = 0.5 * dL * (cos(inc1) + cos(inc2))  [where +Z is upwards, so if inclination is 180, cos is -1, going down]

    const dx = 0.5 * dL * (Math.sin(inc1) * Math.cos(az1) + Math.sin(inc2) * Math.cos(az2));
    const dy = 0.5 * dL * (Math.sin(inc1) * Math.sin(az1) + Math.sin(inc2) * Math.sin(az2));
    const dzCorrected = 0.5 * dL * (Math.cos(inc1) + Math.cos(inc2));

    currentX += dx;
    currentY += dy;
    currentZ += dzCorrected;

    trace.push({
      depth: s2.depth,
      x: parseFloat(currentX.toFixed(2)),
      y: parseFloat(currentY.toFixed(2)),
      z: parseFloat(currentZ.toFixed(2))
    });
  }

  return trace;
}
