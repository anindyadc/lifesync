import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { safeGetDate } from '../../../lib/utils';
import { MARKET_LINKED_TYPES } from '../constants';

const formatDateField = (dateValue) => {
  const d = safeGetDate(dateValue);
  return d ? d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';
};

const formatAmount = (amount) => {
  if (amount === null) return 'Unable to decrypt';
  if (typeof amount !== 'number' || isNaN(amount)) return '-';
  return amount.toLocaleString('en-IN');
};

const statusLabel = (inv) => {
  if (!MARKET_LINKED_TYPES.includes(inv.type)) return '-';
  return inv.status === 'sold' ? 'Sold' : (inv.investmentMode === 'sip' ? `SIP (${inv.sipFrequency || 'monthly'})` : 'Lump Sum · Active');
};

const gainLossLabel = (inv) => {
  const compareValue = inv.status === 'sold' ? inv.saleValue : inv.currentValue;
  if (typeof inv.amount !== 'number' || typeof compareValue !== 'number') return '-';
  const diff = compareValue - inv.amount;
  return `${diff >= 0 ? '+' : '-'}${formatAmount(Math.abs(diff))}`;
};

// Every CSV export in this codebase quotes/escapes every column (not just free-text
// ones) and prefixes a leading =, +, -, @, tab, or CR with a quote before quoting, so a
// pasted description can't execute as a formula when the file is opened in Excel/Sheets
// (CSV/Excel formula injection, CWE-1236) — duplicated per-module rather than shared.
const csvEscape = (value) => {
  let str = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(str)) str = `'${str}`;
  return `"${str.replace(/"/g, '""')}"`;
};

const downloadCSV = (headers, rows, filename) => {
  const csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + "\n" + rows.join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const useInvestmentExport = (investments) => {
  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(20);
    doc.setTextColor(79, 70, 229);
    doc.text("Investment Report", 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, 14, 30);

    autoTable(doc, {
      startY: 38,
      head: [['Holder', 'Type', 'Name', 'Amount (₹)', 'Current Value (₹)', 'Gain/Loss', 'Mode / Status', 'Investment Date', 'Maturity Date', 'Details']],
      body: investments.map(inv => [
        inv.holder || '-',
        inv.type || '-',
        inv.name || '-',
        formatAmount(inv.amount),
        formatAmount(MARKET_LINKED_TYPES.includes(inv.type) ? (inv.status === 'sold' ? inv.saleValue : inv.currentValue) : undefined),
        gainLossLabel(inv),
        statusLabel(inv),
        MARKET_LINKED_TYPES.includes(inv.type) || inv.investmentDate ? formatDateField(inv.investmentDate) : '-',
        inv.maturityDate ? formatDateField(inv.maturityDate) : '-',
        inv.details || '-'
      ]),
      headStyles: { fillColor: [79, 70, 229] },
      styles: { fontSize: 8 },
    });
    doc.save('investments_report.pdf');
  };

  const exportCSV = () => {
    const headers = ['Holder', 'Type', 'Name', 'Amount', 'Investment Mode', 'Units', 'Purchase Price', 'Current Value', 'Gain/Loss', 'Status', 'Investment Date', 'Maturity Date', 'Interest Rate', 'Sold Date', 'Sale Value', 'Details'];
    const rows = investments.map(inv => [
      csvEscape(inv.holder || ''),
      csvEscape(inv.type || ''),
      csvEscape(inv.name || ''),
      csvEscape(formatAmount(inv.amount)),
      csvEscape(inv.investmentMode || '-'),
      csvEscape(inv.units || '-'),
      csvEscape(formatAmount(inv.purchasePrice)),
      csvEscape(formatAmount(inv.currentValue)),
      csvEscape(gainLossLabel(inv)),
      csvEscape(inv.status === 'sold' ? 'Sold' : 'Active'),
      csvEscape(inv.investmentDate ? formatDateField(inv.investmentDate) : '-'),
      csvEscape(inv.maturityDate ? formatDateField(inv.maturityDate) : '-'),
      csvEscape(inv.interestRate ? `${inv.interestRate}%` : '-'),
      csvEscape(inv.soldDate ? formatDateField(inv.soldDate) : '-'),
      csvEscape(formatAmount(inv.saleValue)),
      csvEscape(inv.details || '')
    ].join(','));

    downloadCSV(headers, rows, 'investments_export.csv');
  };

  // FY-scoped export for the Tax Summary tab: FD/NSC accrued interest rows plus
  // realized-sale capital-gains rows for the selected financial year.
  const exportTaxCSV = (fyLabel, interestRows, gainRows) => {
    const headers = ['Section', 'Holder', 'Name', 'Principal / Invested', 'Rate / Sale Value', 'Interest / Gain', 'Classification'];
    const rows = [
      ...interestRows.map(row => [
        csvEscape('FD/NSC Interest'),
        csvEscape(row.holder || ''),
        csvEscape(row.name || ''),
        csvEscape(formatAmount(row.amount)),
        csvEscape(`${row.interestRate}%`),
        csvEscape(formatAmount(row.interest)),
        csvEscape('Interest Income'),
      ].join(',')),
      ...gainRows.map(row => [
        csvEscape('Capital Gains'),
        csvEscape(row.holder || ''),
        csvEscape(row.name || ''),
        csvEscape(formatAmount(row.amount)),
        csvEscape(formatAmount(row.saleValue)),
        csvEscape(`${row.gain >= 0 ? '+' : '-'}${formatAmount(Math.abs(row.gain))}`),
        csvEscape(row.classification || 'Unknown'),
      ].join(',')),
    ];

    downloadCSV(headers, rows, `tax_summary_FY${fyLabel}.csv`);
  };

  return { exportPDF, exportCSV, exportTaxCSV };
};
