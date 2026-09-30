const zlib = require('node:zlib');

const MAX_EXCEL_ROWS = 1_048_576;

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function columnName(index) {
  let result = '';
  let n = index + 1;
  while (n > 0) {
    const remainder = (n - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}

function cellXml(rowNumber, columnIndex, value, style = 0) {
  const ref = `${columnName(columnIndex)}${rowNumber}`;
  const styleAttr = style ? ` s="${style}"` : '';

  if (value === null || value === undefined || value === '') {
    return `<c r="${ref}"${styleAttr}/>`;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<c r="${ref}"${styleAttr}><v>${value}</v></c>`;
  }

  return `<c r="${ref}" t="inlineStr"${styleAttr}><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
}

function worksheetXml(headers, rows) {
  if (rows.length + 1 > MAX_EXCEL_ROWS) {
    throw new Error('A quantidade de registros excede o limite de linhas do Excel.');
  }

  const allRows = [headers, ...rows];
  const lastColumn = columnName(Math.max(headers.length - 1, 0));
  const lastRow = allRows.length;
  const xmlRows = allRows.map((row, rowIndex) => {
    const values = headers.map((_, columnIndex) => row[columnIndex] ?? '');
    const cells = values.map((value, columnIndex) => cellXml(rowIndex + 1, columnIndex, value, rowIndex === 0 ? 1 : 0)).join('');
    return `<row r="${rowIndex + 1}">${cells}</row>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<dimension ref="A1:${lastColumn}${lastRow}"/>` +
    `<sheetViews><sheetView workbookViewId="0"/></sheetViews>` +
    `<sheetFormatPr defaultRowHeight="15"/>` +
    `<sheetData>${xmlRows}</sheetData>` +
    `</worksheet>`;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function zipFiles(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const file of files) {
    const name = Buffer.from(file.name, 'utf8');
    const data = Buffer.isBuffer(file.data) ? file.data : Buffer.from(file.data, 'utf8');
    const compressed = zlib.deflateRawSync(data, { level: 6 });
    const crc = crc32(data);

    const local = Buffer.alloc(30 + name.length + compressed.length);
    let p = 0;
    local.writeUInt32LE(0x04034b50, p); p += 4;
    local.writeUInt16LE(20, p); p += 2;
    local.writeUInt16LE(0, p); p += 2;
    local.writeUInt16LE(8, p); p += 2;
    local.writeUInt16LE(0, p); p += 2;
    local.writeUInt16LE(0, p); p += 2;
    local.writeUInt32LE(crc, p); p += 4;
    local.writeUInt32LE(compressed.length, p); p += 4;
    local.writeUInt32LE(data.length, p); p += 4;
    local.writeUInt16LE(name.length, p); p += 2;
    local.writeUInt16LE(0, p); p += 2;
    name.copy(local, p); p += name.length;
    compressed.copy(local, p);
    localParts.push(local);

    const central = Buffer.alloc(46 + name.length);
    p = 0;
    central.writeUInt32LE(0x02014b50, p); p += 4;
    central.writeUInt16LE(20, p); p += 2;
    central.writeUInt16LE(20, p); p += 2;
    central.writeUInt16LE(0, p); p += 2;
    central.writeUInt16LE(8, p); p += 2;
    central.writeUInt16LE(0, p); p += 2;
    central.writeUInt16LE(0, p); p += 2;
    central.writeUInt32LE(crc, p); p += 4;
    central.writeUInt32LE(compressed.length, p); p += 4;
    central.writeUInt32LE(data.length, p); p += 4;
    central.writeUInt16LE(name.length, p); p += 2;
    central.writeUInt16LE(0, p); p += 2;
    central.writeUInt16LE(0, p); p += 2;
    central.writeUInt16LE(0, p); p += 2;
    central.writeUInt16LE(0, p); p += 2;
    central.writeUInt32LE(0, p); p += 4;
    central.writeUInt32LE(offset, p); p += 4;
    name.copy(central, p);
    centralParts.push(central);

    offset += local.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const localData = Buffer.concat(localParts);
  const end = Buffer.alloc(22);
  let p = 0;
  end.writeUInt32LE(0x06054b50, p); p += 4;
  end.writeUInt16LE(0, p); p += 2;
  end.writeUInt16LE(0, p); p += 2;
  end.writeUInt16LE(files.length, p); p += 2;
  end.writeUInt16LE(files.length, p); p += 2;
  end.writeUInt32LE(centralDirectory.length, p); p += 4;
  end.writeUInt32LE(localData.length, p); p += 4;
  end.writeUInt16LE(0, p);

  return Buffer.concat([localData, centralDirectory, end]);
}

function buildXlsx({ sheetName = 'Dados', headers, rows }) {
  const safeSheetName = String(sheetName).slice(0, 31) || 'Dados';
  const files = [
    {
      name: '[Content_Types].xml',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
        `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
        `<Default Extension="xml" ContentType="application/xml"/>` +
        `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
        `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
        `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
        `</Types>`,
    },
    {
      name: '_rels/.rels',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
        `</Relationships>`,
    },
    {
      name: 'xl/workbook.xml',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
        `<sheets><sheet name="${escapeXml(safeSheetName)}" sheetId="1" r:id="rId1"/></sheets>` +
        `</workbook>`,
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>` +
        `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
        `</Relationships>`,
    },
    {
      name: 'xl/styles.xml',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
        `<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>` +
        `<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>` +
        `<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>` +
        `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
        `<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0"/></cellXfs>` +
        `</styleSheet>`,
    },
    {
      name: 'xl/worksheets/sheet1.xml',
      data: worksheetXml(headers, rows),
    },
  ];

  return zipFiles(files);
}

module.exports = { buildXlsx };
