import { useState } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { formatDate } from '../../../lib/utils';
import { PAYMENT_MODES } from '../constants';

const toRow = (e, categories) => [
  formatDate(e.date),
  e.description || '',
  categories.find(c => c.id === e.category)?.label || e.category,
  PAYMENT_MODES.find(p => p.id === e.paymentMode)?.label || e.paymentMode || '-',
  e.amount
];

/** Pure CSV/PDF builders — callable outside a hook (e.g. from a modal scoped to one trip/group). */
export const downloadExpensesCSV = (expenses, categories, filename = 'expenses.csv') => {
  const headers = ['Date', 'Description', 'Category', 'Mode', 'Amount'];
  const rows = expenses.map(e => {
    const row = toRow(e, categories);
    row[1] = `"${row[1].replace(/"/g, '""')}"`;
    return row.join(',');
  });

  const csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + "\n" + rows.join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const downloadExpensesPDF = async (expenses, categories, { title = 'WalletWatch Expenses Report', filename = 'expenses.pdf', chartElementId = null } = {}) => {
  const doc = new jsPDF();

  doc.setFontSize(20);
  doc.setTextColor(79, 70, 229);
  doc.text(title, 14, 22);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`, 14, 30);

  let yPos = 40;

  if (chartElementId) {
    const chartDiv = document.getElementById(chartElementId);
    if (chartDiv) {
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text("Dashboard Overview", 14, yPos);
      yPos += 5;

      const canvas = await html2canvas(chartDiv, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 180;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      doc.addImage(imgData, 'PNG', 14, yPos, imgWidth, imgHeight);
      yPos += imgHeight + 10;
    }
  }

  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text("Transaction Details", 14, yPos);
  yPos += 5;

  autoTable(doc, {
    startY: yPos,
    head: [['Date', 'Description', 'Category', 'Mode', 'Amount (INR)']],
    body: expenses.map(e => {
      const row = toRow(e, categories);
      row[4] = `INR ${Number(e.amount).toLocaleString('en-IN')}`;
      return row;
    }),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [79, 70, 229] }
  });

  doc.save(filename);
};

export const useExport = (expenses, categories, chartElementId) => {
  const [exporting, setExporting] = useState(false);

  const exportToCSV = () => downloadExpensesCSV(expenses, categories);

  const exportToPDF = async () => {
    setExporting(true);
    try {
      await downloadExpensesPDF(expenses, categories, { chartElementId });
    } catch (err) {
      console.error("PDF Export failed:", err);
      alert("Failed to export PDF.");
    } finally {
      setExporting(false);
    }
  };

  return { exportToCSV, exportToPDF, exporting };
};
