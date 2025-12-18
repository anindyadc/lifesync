/**
 * Global Utilities for Project OS
 */

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Returns YYYY-MM-DD string in local time.
 * This is the most reliable way to match dates in charts.
 */
export const toISODate = (dateInput) => {
  let d;
  if (!dateInput) d = new Date();
  else if (dateInput.toDate && typeof dateInput.toDate === 'function') d = dateInput.toDate();
  else if (dateInput.seconds) d = new Date(dateInput.seconds * 1000);
  else d = new Date(dateInput);
  if (isNaN(d.getTime())) d = new Date();
  
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const formatDate = (dateField) => {
  const d = dateField?.toDate ? dateField.toDate() : new Date(dateField);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

export const formatDuration = (minutes) => {
  if (!minutes || minutes <= 0) return '0m';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
};
