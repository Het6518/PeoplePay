/**
 * PDF / Printable Document Exporter Utility
 * Generates an elegant print view that triggers browser PDF save or print.
 */
export function exportToPDF(title, subtitle, headers, rows, summaryCards = []) {
  if (!rows || rows.length === 0) {
    alert('No data available to export.');
    return;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Pop-up blocked. Please allow pop-ups for this site to generate PDF reports.');
    return;
  }

  const nowStr = new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const cardsHtml = summaryCards.length
    ? `<div style="display: flex; gap: 16px; margin-bottom: 20px;">
        ${summaryCards
          .map(
            (c) => `
          <div style="flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 16px;">
            <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">${c.label}</div>
            <div style="font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 4px;">${c.value}</div>
          </div>
        `
          )
          .join('')}
      </div>`
    : '';

  const tableHeaderHtml = headers
    .map(
      (h) => `
    <th style="padding: 10px 12px; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #475569; background: #f1f5f9; text-align: ${
      h.align || 'left'
    }; border-bottom: 2px solid #cbd5e1;">${h.label}</th>
  `
    )
    .join('');

  const tableBodyHtml = rows
    .map(
      (row, idx) => `
    <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
      ${headers
        .map((h) => {
          let val = typeof h.accessor === 'function' ? h.accessor(row) : row[h.key];
          if (val === null || val === undefined) val = '-';
          return `<td style="padding: 10px 12px; font-size: 12px; font-weight: 500; color: #1e293b; border-bottom: 1px solid #e2e8f0; text-align: ${
            h.align || 'left'
          };">${val}</td>`;
        })
        .join('')}
    </tr>
  `
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title} - PeoplePay360</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 24px; color: #0f172a; }
          .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #f59e0b; padding-bottom: 12px; margin-bottom: 20px; }
          .brand { font-size: 20px; font-weight: 900; color: #0f172a; }
          .brand span { color: #f59e0b; }
          .subtitle { font-size: 12px; color: #64748b; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          .footer { margin-top: 24px; pt: 12px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: center; }
          @media print {
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand">PeoplePay<span>360</span></div>
            <div style="font-size: 16px; font-weight: 800; margin-top: 6px;">${title}</div>
            <div class="subtitle">${subtitle}</div>
          </div>
          <div style="text-align: right; font-size: 11px; color: #64748b;">
            <div>Generated: <strong>${nowStr}</strong></div>
            <div>Confidential HR Document</div>
          </div>
        </div>

        ${cardsHtml}

        <table>
          <thead>
            <tr>${tableHeaderHtml}</tr>
          </thead>
          <tbody>
            ${tableBodyHtml}
          </tbody>
        </table>

        <div class="footer">
          Computer-generated report from PeoplePay360 HR & Payroll Engine • Page 1 of 1
        </div>

        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
