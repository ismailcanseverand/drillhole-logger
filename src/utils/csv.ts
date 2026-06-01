/**
 * CSV Import / Export Utilities
 */

/**
 * Escapes a cell value for safe inclusion in a CSV file.
 */
function escapeCSVValue(val: any): string {
  if (val === null || val === undefined) return '';
  let str = String(val);
  // Replace double quotes with double-double quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    str = str.replace(/"/g, '""');
    return `"${str}"`;
  }
  return str;
}

/**
 * Generates and triggers download of a CSV file from an array of objects.
 */
export function exportToCSV(data: Array<Record<string, any>>, filename: string) {
  if (!data || data.length === 0) {
    alert('No data to export.');
    return;
  }

  const headers = Object.keys(data[0]);
  const csvRows = [];

  // Header row
  csvRows.push(headers.join(','));

  // Data rows
  for (const row of data) {
    const values = headers.map(header => escapeCSVValue(row[header]));
    csvRows.push(values.join(','));
  }

  const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Parses CSV text into an array of objects.
 * Simple parser that respects double quotes for fields containing commas.
 */
export function parseCSV(text: string): Array<Record<string, string>> {
  const lines: string[] = [];
  let currentLine = '';
  let insideQuote = false;

  // Split lines manually to support newlines inside quotes
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      insideQuote = !insideQuote;
      currentLine += char;
    } else if ((char === '\n' || char === '\r') && !insideQuote) {
      if (currentLine.trim()) {
        lines.push(currentLine);
      }
      currentLine = '';
      // Skip CRLF second char if needed
      if (char === '\r' && text[i + 1] === '\n') {
        i++;
      }
    } else {
      currentLine += char;
    }
  }
  if (currentLine.trim()) {
    lines.push(currentLine);
  }

  if (lines.length === 0) return [];

  // Parse headers
  const headers = parseCSVLine(lines[0]);
  const result: Array<Record<string, string>> = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const obj: Record<string, string> = {};
    
    headers.forEach((header, index) => {
      obj[header] = values[index] !== undefined ? values[index] : '';
    });
    
    result.push(obj);
  }

  return result;
}

/**
 * Helper to split a CSV line into its token fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let currentVal = '';
  let insideQuote = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      // Check if double double-quote
      if (insideQuote && line[i + 1] === '"') {
        currentVal += '"';
        i++; // skip next quote
      } else {
        insideQuote = !insideQuote;
      }
    } else if (char === ',' && !insideQuote) {
      result.push(currentVal.trim());
      currentVal = '';
    } else {
      currentVal += char;
    }
  }
  
  result.push(currentVal.trim());
  return result;
}
