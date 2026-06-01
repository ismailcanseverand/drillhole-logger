/**
 * Drillhole Data Logger Validation Utility
 */

export interface ValidationError {
  id: string;      // Identifies the row or context
  tab: 'Collar' | 'Survey' | 'Lithology' | 'Geotech' | 'Assay';
  type: 'error' | 'warning';
  message: string;
  field?: string;  // The invalid field, if applicable
}

/**
 * Validate Collar Data
 */
export function validateCollar(collar: {
  holeId: string;
  easting: number;
  northing: number;
  elevation: number;
  totalDepth: number;
  dip: number;
  azimuth: number;
}): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!collar.holeId.trim()) {
    errors.push({
      id: 'collar-holeId',
      tab: 'Collar',
      type: 'error',
      message: 'Hole ID cannot be blank.',
      field: 'holeId'
    });
  }

  if (collar.totalDepth <= 0) {
    errors.push({
      id: 'collar-depth',
      tab: 'Collar',
      type: 'error',
      message: 'Total Depth must be greater than 0.',
      field: 'totalDepth'
    });
  }

  if (collar.dip < -90 || collar.dip > 90) {
    errors.push({
      id: 'collar-dip',
      tab: 'Collar',
      type: 'error',
      message: 'Dip must be between -90 and +90 degrees.',
      field: 'dip'
    });
  }

  if (collar.azimuth < 0 || collar.azimuth > 360) {
    errors.push({
      id: 'collar-azimuth',
      tab: 'Collar',
      type: 'error',
      message: 'Azimuth must be between 0 and 360 degrees.',
      field: 'azimuth'
    });
  }

  return errors;
}

/**
 * Validate Survey Data
 */
export function validateSurveys(
  surveys: Array<{ id: string; depth: number; dip: number; azimuth: number }>,
  totalDepth: number
): ValidationError[] {
  const errors: ValidationError[] = [];

  surveys.forEach((row, index) => {
    const rowNum = index + 1;

    if (row.depth < 0) {
      errors.push({
        id: row.id,
        tab: 'Survey',
        type: 'error',
        message: `Row ${rowNum}: Depth cannot be negative.`,
        field: 'depth'
      });
    }

    if (row.depth > totalDepth) {
      errors.push({
        id: row.id,
        tab: 'Survey',
        type: 'warning',
        message: `Row ${rowNum}: Survey depth (${row.depth}m) exceeds Collar Total Depth (${totalDepth}m).`,
        field: 'depth'
      });
    }

    if (row.dip < -90 || row.dip > 90) {
      errors.push({
        id: row.id,
        tab: 'Survey',
        type: 'error',
        message: `Row ${rowNum}: Dip must be between -90 and +90.`,
        field: 'dip'
      });
    }

    if (row.azimuth < 0 || row.azimuth > 360) {
      errors.push({
        id: row.id,
        tab: 'Survey',
        type: 'error',
        message: `Row ${rowNum}: Azimuth must be between 0 and 360.`,
        field: 'azimuth'
      });
    }
  });

  return errors;
}

/**
 * Check for interval overlaps or negative intervals
 */
export function validateIntervals(
  intervals: Array<{ id: string; from: number; to: number }>,
  tab: 'Lithology' | 'Geotech' | 'Assay',
  totalDepth: number
): ValidationError[] {
  const errors: ValidationError[] = [];
  
  // Sort by 'from' to scan for overlaps
  const sorted = [...intervals]
    .map((item, index) => ({ item, index }))
    .sort((a, b) => a.item.from - b.item.from);

  sorted.forEach(({ item, index }) => {
    const rowNum = index + 1;

    if (item.from < 0) {
      errors.push({
        id: item.id,
        tab,
        type: 'error',
        message: `Row ${rowNum}: 'From' depth cannot be negative.`,
        field: 'from'
      });
    }

    if (item.to <= item.from) {
      errors.push({
        id: item.id,
        tab,
        type: 'error',
        message: `Row ${rowNum}: 'To' depth (${item.to}m) must be greater than 'From' depth (${item.from}m).`,
        field: 'to'
      });
    }

    if (item.to > totalDepth) {
      errors.push({
        id: item.id,
        tab,
        type: 'warning',
        message: `Row ${rowNum}: Interval (${item.from}m - ${item.to}m) exceeds Collar Total Depth (${totalDepth}m).`,
        field: 'to'
      });
    }
  });

  // Check overlaps
  for (let i = 0; i < sorted.length - 1; i++) {
    const curr = sorted[i];
    const next = sorted[i + 1];

    if (curr.item.to > next.item.from) {
      errors.push({
        id: curr.item.id,
        tab,
        type: 'error',
        message: `Overlapping Interval: Row ${curr.index + 1} ends at ${curr.item.to}m, which overlaps with Row ${next.index + 1} starting at ${next.item.from}m.`,
        field: 'to'
      });
    } else if (curr.item.to < next.item.from) {
      errors.push({
        id: next.item.id,
        tab,
        type: 'warning',
        message: `Gap Detected: There is an unlogged gap between Row ${curr.index + 1} (${curr.item.to}m) and Row ${next.index + 1} (${next.item.from}m).`,
        field: 'from'
      });
    }
  }

  return errors;
}

/**
 * Validate Geotech data (lengths alignment)
 */
export function validateGeotech(
  geotech: Array<{
    id: string;
    from: number;
    to: number;
    drilledLength: number;
    recoveredLength: number;
    solidPiecesOver10cm: number;
  }>
): ValidationError[] {
  const errors: ValidationError[] = [];

  geotech.forEach((row, index) => {
    const rowNum = index + 1;

    // Drilled length should approximate (to - from)
    const intervalLen = parseFloat((row.to - row.from).toFixed(3));
    const drilledLen = parseFloat(row.drilledLength.toFixed(3));
    
    if (Math.abs(drilledLen - intervalLen) > 0.05) {
      errors.push({
        id: row.id,
        tab: 'Geotech',
        type: 'warning',
        message: `Row ${rowNum}: Drilled Length (${row.drilledLength}m) does not match interval depth diff (${intervalLen}m).`,
        field: 'drilledLength'
      });
    }

    if (row.recoveredLength > row.drilledLength) {
      errors.push({
        id: row.id,
        tab: 'Geotech',
        type: 'error',
        message: `Row ${rowNum}: Recovered Length (${row.recoveredLength}m) exceeds Drilled Length (${row.drilledLength}m).`,
        field: 'recoveredLength'
      });
    }

    if (row.solidPiecesOver10cm > row.recoveredLength) {
      errors.push({
        id: row.id,
        tab: 'Geotech',
        type: 'error',
        message: `Row ${rowNum}: Solid Pieces (>10cm) sum (${row.solidPiecesOver10cm}m) exceeds total Recovered Length (${row.recoveredLength}m).`,
        field: 'solidPiecesOver10cm'
      });
    }
  });

  return errors;
}

/**
 * Validate Assay Sample Data
 */
export function validateAssays(
  assays: Array<{
    id: string;
    sampleId: string;
    from: number;
    to: number;
    sampleType: string;
    al2o3: number;
    fe2o3: number;
    sio2: number;
    tio2: number;
    na2o_k2o: number;
    loi: number;
  }>
): ValidationError[] {
  const errors: ValidationError[] = [];

  assays.forEach((row, index) => {
    const rowNum = index + 1;

    if (!row.sampleId.trim()) {
      errors.push({
        id: row.id,
        tab: 'Assay',
        type: 'error',
        message: `Row ${rowNum}: Sample ID cannot be empty.`,
        field: 'sampleId'
      });
    }

    if (
      row.al2o3 < 0 ||
      row.fe2o3 < 0 ||
      row.sio2 < 0 ||
      row.tio2 < 0 ||
      row.na2o_k2o < 0 ||
      row.loi < 0
    ) {
      errors.push({
        id: row.id,
        tab: 'Assay',
        type: 'error',
        message: `Row ${rowNum}: Assay grades cannot be negative.`,
        field: 'al2o3'
      });
    }
  });

  return errors;
}
