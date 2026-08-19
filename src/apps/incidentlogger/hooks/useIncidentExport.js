import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDate } from '../../../lib/utils';

// Every field quoted/escaped, not just the free-text ones — an unquoted serverName or
// application containing a comma used to shift every later column. A leading =, +, -, @,
// tab, or CR is prefixed with a quote first so Excel/Sheets treats the value as text
// instead of a formula on open (CSV/Excel formula injection, CWE-1236).
const csvEscape = (value) => {
  let str = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(str)) str = `'${str}`;
  return `"${str.replace(/"/g, '""')}"`;
};

export const useIncidentExport = (incidents) => {

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.setTextColor(220, 38, 38);
    doc.text("Incident Report", 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, 14, 30);

    autoTable(doc, {
      startY: 36,
      head: [['Date', 'Title', 'Server', 'App', 'Priority', 'Status', 'Reported By']],
      body: incidents.map(i => [
        formatDate(i.dateReported),
        i.title,
        i.serverName,
        i.application || '-',
        i.priority,
        i.status,
        i.reportedBy || '-'
      ]),
      headStyles: { fillColor: [220, 38, 38] }
    });
    doc.save('incident_report.pdf');
  };

  const exportCSV = () => {
    const headers = ['Date', 'Title', 'Server', 'Application', 'Priority', 'Status', 'Reported By', 'Issue Description', 'Fix Provided'];
    const rows = incidents.map(i => [
      csvEscape(formatDate(i.dateReported)),
      csvEscape(i.title),
      csvEscape(i.serverName),
      csvEscape(i.application),
      csvEscape(i.priority),
      csvEscape(i.status),
      csvEscape(i.reportedBy),
      csvEscape(i.issueDescription),
      csvEscape(i.fixProvided)
    ].join(','));

    const csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + "\n" + rows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "incident_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return { exportPDF, exportCSV };
};
