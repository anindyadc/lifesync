import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { safeGetDate } from '../../../lib/utils';

const fmt = (dateInput) => {
  const d = safeGetDate(dateInput);
  return d ? d.toLocaleDateString('en-IN') : '-';
};

const medicineSummary = (medicines) =>
  (medicines || []).map((m) => m.name).filter(Boolean).join(', ') || '-';

export const useMedicalExport = (prescriptions) => {
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.setTextColor(79, 70, 229);
    doc.text("Prescription Records Report", 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, 14, 30);

    autoTable(doc, {
      startY: 36,
      head: [['Date', 'Patient', 'Relation', 'Doctor', 'Disease', 'Medicines']],
      body: prescriptions.map((p) => [
        fmt(p.date),
        p.patientName || '-',
        p.relation || '-',
        p.doctorName || '-',
        p.disease || '-',
        medicineSummary(p.medicines),
      ]),
      headStyles: { fillColor: [79, 70, 229] },
    });
    doc.save('prescription_report.pdf');
  };

  const exportCSV = () => {
    const headers = ['Date', 'Patient', 'Relation', 'Doctor', 'Disease', 'Medicines'];
    // A leading =, +, -, @, tab, or CR is prefixed with a quote first so Excel/Sheets
    // treats the value as text instead of a formula on open (CSV/Excel formula injection).
    const escape = (val) => {
      let str = (val || '').toString();
      if (/^[=+\-@\t\r]/.test(str)) str = `'${str}`;
      return `"${str.replace(/"/g, '""')}"`;
    };
    const rows = prescriptions.map((p) => [
      fmt(p.date),
      escape(p.patientName),
      escape(p.relation),
      escape(p.doctorName),
      escape(p.disease),
      escape((p.medicines || []).map((m) => m.name).filter(Boolean).join('; ')),
    ].join(','));

    const csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + "\n" + rows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "prescription_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return { exportPDF, exportCSV };
};
