/**
 * CSV Exporter Utility
 * Generates and triggers browser download of UTF-8 encoded CSV files with BOM.
 */
export function exportToCSV(filename, headers, rows) {
  if (!rows || rows.length === 0) {
    alert('No data available to export.');
    return;
  }

  // Create header row
  const headerRow = headers.map((h) => `"${String(h.label).replace(/"/g, '""')}"`).join(',');

  // Create data rows
  const dataRows = rows.map((row) =>
    headers
      .map((h) => {
        let val = typeof h.accessor === 'function' ? h.accessor(row) : row[h.key];
        if (val === null || val === undefined) val = '';
        return `"${String(val).replace(/"/g, '""')}"`;
      })
      .join(',')
  );

  const csvContent = '\uFEFF' + [headerRow, ...dataRows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
