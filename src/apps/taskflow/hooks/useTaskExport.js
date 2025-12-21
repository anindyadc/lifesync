import { useState } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { formatDuration } from '../../../lib/utils';

export const useTaskExport = (tasks, chartElementId) => {
  const [exporting, setExporting] = useState(false);

  const exportToCSV = (tasksToExport) => {
    const data = tasksToExport || tasks;
    const headers = ['Title', 'Status', 'Priority', 'Category', 'Due Date', 'Time Spent (mins)'];
    const rows = data.map(t => [
      `"${(t.title || '').replace(/"/g, '""')}"`,
      t.status,
      t.priority,
      t.category,
      t.dueDate?.toDate ? t.dueDate.toDate().toLocaleDateString('en-CA') : t.dueDate,
      t.timeSpent
    ].join(','));
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + "\n" + rows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "tasks_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = async (activeTab, tasksToExport) => {
    setExporting(true);
    try {
      const data = tasksToExport || tasks;
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(20);
      doc.setTextColor(79, 70, 229); // Indigo
      doc.text("TaskFlow Report", 14, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, 14, 30);

      let yPos = 40;

      // Capture Dashboard Visuals if visible
      const chartElement = document.getElementById(chartElementId);
      
      if (chartElement && activeTab === 'dashboard') {
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text("Dashboard Overview", 14, yPos);
        yPos += 5;

        // Capture chart area
        const canvas = await html2canvas(chartElement, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 180; 
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        doc.addImage(imgData, 'PNG', 14, yPos, imgWidth, imgHeight);
        yPos += imgHeight + 10;
      }

      // Table
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text("Task Details", 14, yPos);
      yPos += 5;

      autoTable(doc, {
        head: [['Title', 'Status', 'Priority', 'Category', 'Time']],
        body: data.map(t => [t.title, t.status, t.priority, t.category, formatDuration(t.timeSpent)]),
        startY: yPos,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [79, 70, 229] }
      });
      doc.save("tasks_report.pdf");
    } catch (err) {
      console.error("PDF Export failed:", err);
      alert("Failed to export PDF.");
    } finally {
      setExporting(false);
    }
  };

  return { exportToCSV, exportToPDF, exporting };
};