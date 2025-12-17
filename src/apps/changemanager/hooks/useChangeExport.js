import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDate } from '../../../lib/utils';

export const useChangeExport = (changes, filterServer) => {
  
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.setTextColor(79, 70, 229);
    doc.text("Server Change Log Report", 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, 14, 30);
    
    if (filterServer) {
      doc.text(`Filter: Server '${filterServer}'`, 14, 36);
    }
    
    autoTable(doc, {
      startY: filterServer ? 42 : 40,
      head: [['Date', 'Server', 'App', 'Type', 'Title', 'Status']],
      body: changes.map(c => [
        formatDate(c.date),
        c.serverName,
        c.application || '-',
        c.type,
        c.title,
        c.status
      ]),
      headStyles: { fillColor: [79, 70, 229] }
    });
    doc.save('changelog_report.pdf');
  };

  const exportCSV = () => {
    const headers = ['Date', 'Server', 'Application', 'Type', 'Title', 'Description', 'Parameters', 'Status', 'Performed By'];
    const rows = changes.map(c => [
      formatDate(c.date), 
      c.serverName, 
      c.application || '', 
      c.type, 
      `"${c.title.replace(/"/g, '""')}"`, 
      `"${c.description.replace(/"/g, '""')}"`, 
      `"${(c.parameters || '').replace(/"/g, '""')}"`, 
      c.status,
      c.performedBy || ''
    ].join(','));
    
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + "\n" + rows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "changelog_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return { exportPDF, exportCSV };
};