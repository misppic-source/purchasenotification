import * as XLSX from 'xlsx';
import { ImportPreviewItem, RMSchedule } from './types';

export interface ParseExcelResult {
  previewItems: ImportPreviewItem[];
  errors: { row: number; rmCode?: string; column?: string; error: string }[];
  detectedDates: string[];
  totalRowsProcessed: number;
  fileName: string;
}

/**
 * Normalizes varied date formats into YYYY-MM-DD
 * Supports:
 * - DD-MM-YY (e.g., 03-10-26 -> 2026-10-03)
 * - DD-MM-YYYY (e.g., 03-10-2026 -> 2026-10-03)
 * - DD/MM/YY (e.g., 03/10/26 -> 2026-10-03)
 * - DD/MM/YYYY (e.g., 03/10/2026 -> 2026-10-03)
 * - YYYY-MM-DD (e.g., 2026-10-03)
 * - Excel Serial Date Number
 */
export function normalizeExcelDate(input: any): string | null {
  if (input == null) return null;

  // Handle native Date instance
  if (input instanceof Date && !isNaN(input.getTime())) {
    const y = input.getFullYear();
    const m = String(input.getMonth() + 1).padStart(2, '0');
    const d = String(input.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Handle Excel date serial number (e.g. 46298 is 2026-10-03)
  if (typeof input === 'number') {
    if (input >= 20000 && input <= 90000) {
      const utcDays = Math.floor(input - 25569);
      const date = new Date(utcDays * 86400 * 1000);
      if (!isNaN(date.getTime())) {
        const y = date.getUTCFullYear();
        const m = String(date.getUTCMonth() + 1).padStart(2, '0');
        const d = String(date.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    }
    return null;
  }

  const str = String(input).trim();
  if (!str) return null;

  // If numeric string in Excel serial range
  const numCheck = Number(str);
  if (!isNaN(numCheck) && numCheck >= 20000 && numCheck <= 90000) {
    const utcDays = Math.floor(numCheck - 25569);
    const date = new Date(utcDays * 86400 * 1000);
    if (!isNaN(date.getTime())) {
      const y = date.getUTCFullYear();
      const m = String(date.getUTCMonth() + 1).padStart(2, '0');
      const d = String(date.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  // Pattern: YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
  const ymd = str.match(/^(\d{4})[-/. ](\d{1,2})[-/. ](\d{1,2})$/);
  if (ymd) {
    const y = ymd[1];
    const m = ymd[2].padStart(2, '0');
    const d = ymd[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Pattern: DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
  const dmy4 = str.match(/^(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{4})$/);
  if (dmy4) {
    const d = dmy4[1].padStart(2, '0');
    const m = dmy4[2].padStart(2, '0');
    const y = dmy4[3];
    return `${y}-${m}-${d}`;
  }

  // Pattern: DD-MM-YY or DD/MM/YY or DD.MM.YY
  const dmy2 = str.match(/^(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{2})$/);
  if (dmy2) {
    const d = dmy2[1].padStart(2, '0');
    const m = dmy2[2].padStart(2, '0');
    const yy = parseInt(dmy2[3], 10);
    const y = yy >= 70 ? `19${dmy2[3]}` : `20${dmy2[3]}`;
    return `${y}-${m}-${d}`;
  }

  // Pattern: Month name formats e.g. "03-Oct-26", "03-Oct-2026", "3 Oct 2026"
  const monthNames: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  };
  const monthMatch = str.match(/^(\d{1,2})[-/. ]([A-Za-z]{3,9})[-/. ](\d{2,4})$/);
  if (monthMatch) {
    const d = monthMatch[1].padStart(2, '0');
    const monKey = monthMatch[2].slice(0, 3).toLowerCase();
    const m = monthNames[monKey];
    if (m) {
      let y = monthMatch[3];
      if (y.length === 2) {
        const yy = parseInt(y, 10);
        y = yy >= 70 ? `19${y}` : `20${y}`;
      }
      return `${y}-${m}-${d}`;
    }
  }

  // Fallback: Date.parse
  const parsed = Date.parse(str);
  if (!isNaN(parsed)) {
    const date = new Date(parsed);
    if (date.getFullYear() >= 2000 && date.getFullYear() <= 2100) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  return null;
}

/**
 * Intelligent matrix parser for Excel files
 */
export function parseRMPlanningExcel(
  buffer: Buffer,
  fileName: string,
  existingSchedules: RMSchedule[],
  mode: 'APPEND' | 'REPLACE' = 'APPEND'
): ParseExcelResult {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('Excel workbook contains no sheets.');
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  if (!rawRows || rawRows.length < 2) {
    throw new Error('Excel sheet is empty or lacks header rows.');
  }

  // Find header row (the row containing "Child" or "RM Code")
  let headerRowIndex = -1;
  let codeColIdx = -1;
  let descColIdx = -1;
  let supplierColIdx = -1;
  let poColIdx = -1;
  let uomColIdx = -1;

  for (let r = 0; r < Math.min(rawRows.length, 10); r++) {
    const row = rawRows[r];
    for (let c = 0; c < row.length; c++) {
      const val = String(row[c] || '').trim().toLowerCase();
      if (
        val === 'child' ||
        val === 'child code' ||
        val === 'rm code' ||
        val === 'material' ||
        val === 'material code'
      ) {
        headerRowIndex = r;
        codeColIdx = c;
      }
      if (
        val === 'child description' ||
        val === 'rm description' ||
        val === 'material description' ||
        val === 'description'
      ) {
        descColIdx = c;
      }
      if (val === 'supplier' || val === 'vendor') {
        supplierColIdx = c;
      }
      if (val === 'po' || val === 'po number' || val === 'po #' || val === 'purchase order') {
        poColIdx = c;
      }
      if (val === 'uom' || val === 'unit') {
        uomColIdx = c;
      }
    }
    if (headerRowIndex !== -1) break;
  }

  // Fallback: if header not explicitly named "child", assume row 0, col 0 is code, col 1 is description
  if (headerRowIndex === -1) {
    headerRowIndex = 0;
    codeColIdx = 0;
    descColIdx = 1;
  }
  if (descColIdx === -1) {
    descColIdx = codeColIdx + 1;
  }

  const headerRow = rawRows[headerRowIndex];
  const dateColumns: { colIdx: number; rawHeader: string; normalizedDate: string }[] = [];

  // Dynamically identify date columns from header
  for (let c = 0; c < headerRow.length; c++) {
    if (
      c === codeColIdx ||
      c === descColIdx ||
      c === supplierColIdx ||
      c === poColIdx ||
      c === uomColIdx
    ) {
      continue;
    }

    const headerVal = headerRow[c];
    const normalized = normalizeExcelDate(headerVal);
    if (normalized) {
      dateColumns.push({
        colIdx: c,
        rawHeader: String(headerVal),
        normalizedDate: normalized,
      });
    }
  }

  if (dateColumns.length === 0) {
    throw new Error(
      `No valid planning date columns detected in header row ${
        headerRowIndex + 1
      }. Expected formats: DD-MM-YY, DD-MM-YYYY, or YYYY-MM-DD.`
    );
  }

  const previewItems: ImportPreviewItem[] = [];
  const errors: { row: number; rmCode?: string; column?: string; error: string }[] = [];
  const existingMap = new Map<string, RMSchedule>();
  if (mode === 'APPEND') {
    for (const s of existingSchedules) {
      existingMap.set(`${s.rmCode}_${s.plannedDate}`, s);
    }
  }

  const detectedDates = dateColumns.map((d) => d.normalizedDate);
  let totalRowsProcessed = 0;

  // Process data rows
  for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.every((cell) => cell === '' || cell == null)) {
      continue; // skip blank row
    }

    totalRowsProcessed++;
    const rowNumber = r + 1;
    const rawCode = row[codeColIdx];
    const rmCode = String(rawCode || '').trim();
    const rmDesc = String(row[descColIdx] || '').trim();

    if (!rmCode) {
      errors.push({
        row: rowNumber,
        column: 'RM Code',
        error: 'Missing RM Code/Child identifier',
      });
      continue;
    }

    if (!rmDesc) {
      errors.push({
        row: rowNumber,
        rmCode,
        column: 'RM Description',
        error: 'Missing RM Description',
      });
    }

    // Check each detected date column
    for (const dCol of dateColumns) {
      const rawQty = row[dCol.colIdx];
      if (rawQty === '' || rawQty == null) {
        continue; // Blank quantity: do not create schedule
      }

      const numQty = Number(rawQty);
      if (isNaN(numQty)) {
        errors.push({
          row: rowNumber,
          rmCode,
          column: dCol.rawHeader,
          error: `Invalid quantity "${rawQty}". Must be a numeric value.`,
        });
        continue;
      }

      if (numQty < 0) {
        errors.push({
          row: rowNumber,
          rmCode,
          column: dCol.rawHeader,
          error: `Negative quantity "${numQty}" is not permitted.`,
        });
        continue;
      }

      // Business Rule: Only quantities greater than zero create arrival schedules
      if (numQty === 0) {
        continue;
      }

      // Check existing schedule for this RM + Date
      const key = `${rmCode}_${dCol.normalizedDate}`;
      const existing = existingMap.get(key);

      if (!existing) {
        previewItems.push({
          rmCode,
          rmDescription: rmDesc || `Material ${rmCode}`,
          date: dCol.normalizedDate,
          newQty: numQty,
          changeType: 'NEW',
          notes: 'New planned arrival will be registered.',
        });
      } else {
        if (existing.plannedQty === numQty) {
          previewItems.push({
            id: existing.id,
            rmCode,
            rmDescription: rmDesc || existing.rmDescription,
            date: dCol.normalizedDate,
            oldQty: existing.plannedQty,
            newQty: numQty,
            changeType: 'UNCHANGED',
            notes: 'Exact match with existing schedule.',
          });
        } else {
          previewItems.push({
            id: existing.id,
            rmCode,
            rmDescription: rmDesc || existing.rmDescription,
            date: dCol.normalizedDate,
            oldQty: existing.plannedQty,
            newQty: numQty,
            changeType: 'MODIFIED',
            notes: `Planned quantity will change from ${existing.plannedQty} to ${numQty}. Balance will be adjusted accordingly.`,
          });
        }
      }
    }
  }

  return {
    previewItems,
    errors,
    detectedDates,
    totalRowsProcessed,
    fileName,
  };
}
