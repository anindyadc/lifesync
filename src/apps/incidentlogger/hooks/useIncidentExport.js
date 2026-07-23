import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDate } from '../../../lib/utils';

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
      formatDate(i.dateReported),
      `"${(i.title || '').replace(/"/g, '""')}"`,
      i.serverName || '',
      i.application || '',
      i.priority || '',
      i.status || '',
      i.reportedBy || '',
      `"${(i.issueDescription || '').replace(/"/g, '""')}"`,
      `"${(i.fixProvided || '').replace(/"/g, '""')}"`
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
