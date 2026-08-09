import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { safeGetDate } from '../../../lib/utils';

const formatMaturityDate = (maturityDate) => {
  const d = safeGetDate(maturityDate);
  return d ? d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';
};

const formatAmount = (amount) => {
  if (amount === null) return 'Unable to decrypt';
  if (typeof amount !== 'number' || isNaN(amount)) return '-';
  return amount.toLocaleString('en-IN');
};

export const useInvestmentExport = (investments) => {
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.setTextColor(79, 70, 229);
    doc.text("Investment Report", 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, 14, 30);

    autoTable(doc, {
      startY: 38,
      head: [['Holder', 'Type', 'Name', 'Amount (₹)', 'Maturity Date', 'Details']],
      body: investments.map(inv => [
        inv.holder || '-',
        inv.type || '-',
        inv.name || '-',
        formatAmount(inv.amount),
        formatMaturityDate(inv.maturityDate),
        inv.details || '-'
      ]),
      headStyles: { fillColor: [79, 70, 229] }
    });
    doc.save('investments_report.pdf');
  };

  const exportCSV = () => {
    // Every field quoted/escaped, not just the free-text ones — formatAmount's 'en-IN'
    // grouping commas (e.g. "1,00,000") were shifting every later column when left
    // unquoted.
    const csvEscape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const headers = ['Holder', 'Type', 'Name', 'Amount', 'Maturity Date', 'Details'];
    const rows = investments.map(inv => [
      csvEscape(inv.holder || ''),
      csvEscape(inv.type || ''),
      csvEscape(inv.name || ''),
      csvEscape(formatAmount(inv.amount)),
      csvEscape(formatMaturityDate(inv.maturityDate)),
      csvEscape(inv.details || '')
    ].join(','));

    const csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + "\n" + rows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "investments_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return { exportPDF, exportCSV };
};
