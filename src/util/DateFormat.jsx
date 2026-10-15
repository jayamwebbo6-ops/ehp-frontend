import React from 'react';

/**
 * Formats any date (string, Date object, or timestamp) to DD/MM/YYYY format.
 * Avoids timezone shift issues for 'YYYY-MM-DD' strings.
 *
 * @param {string|Date|number} date - Date to format
 * @param {string} [fallback=''] - Fallback return value if date is invalid or empty
 * @returns {string} Formatted date string in DD/MM/YYYY format
 */
export const formatDate = (date, fallback = '') => {
  if (!date) return fallback;

  try {
    // If it's already a DD/MM/YYYY string
    if (typeof date === 'string') {
      const dmyMatch = date.trim().match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})$/);
      if (dmyMatch) {
        const dd = String(dmyMatch[1]).padStart(2, '0');
        const mm = String(dmyMatch[2]).padStart(2, '0');
        const yyyy = dmyMatch[3];
        return `${dd}/${mm}/${yyyy}`;
      }

      // If it's a YYYY-MM-DD (or ISO) string, split directly to prevent timezone shift
      const ymdMatch = date.trim().match(/^(\d{4})[\/\.-](\d{1,2})[\/\.-](\d{1,2})(?:T.*)?$/);
      if (ymdMatch) {
        const yyyy = ymdMatch[1];
        const mm = String(ymdMatch[2]).padStart(2, '0');
        const dd = String(ymdMatch[3]).padStart(2, '0');
        return `${dd}/${mm}/${yyyy}`;
      }
    }

    // Otherwise, parse as Date object
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return fallback;

    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();

    return `${dd}/${mm}/${yyyy}`;
  } catch (e) {
    return fallback;
  }
};

/**
 * Formats a date into YYYY-MM-DD format (required for HTML <input type="date" /> value).
 *
 * @param {string|Date|number} date - Date to format
 * @returns {string} Date string in YYYY-MM-DD format
 */
export const formatDateForInput = (date) => {
  if (!date) return '';

  try {
    if (typeof date === 'string') {
      const trimmed = date.trim();
      // Already YYYY-MM-DD
      const ymdMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
      if (ymdMatch) {
        const yyyy = ymdMatch[1];
        const mm = String(ymdMatch[2]).padStart(2, '0');
        const dd = String(ymdMatch[3]).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      }

      // If DD/MM/YYYY format
      const dmyMatch = trimmed.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})/);
      if (dmyMatch) {
        const dd = String(dmyMatch[1]).padStart(2, '0');
        const mm = String(dmyMatch[2]).padStart(2, '0');
        const yyyy = dmyMatch[3];
        return `${yyyy}-${mm}-${dd}`;
      }
    }

    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '';

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');

    return `${yyyy}-${mm}-${dd}`;
  } catch (e) {
    return '';
  }
};

/**
 * Parses DD/MM/YYYY or YYYY-MM-DD string into a Date object.
 *
 * @param {string} dateStr
 * @returns {Date|null}
 */
export const parseDate = (dateStr) => {
  if (!dateStr) return null;

  if (typeof dateStr === 'string') {
    const dmyMatch = dateStr.trim().match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})$/);
    if (dmyMatch) {
      const dd = parseInt(dmyMatch[1], 10);
      const mm = parseInt(dmyMatch[2], 10) - 1;
      const yyyy = parseInt(dmyMatch[3], 10);
      return new Date(yyyy, mm, dd);
    }

    const ymdMatch = dateStr.trim().match(/^(\d{4})[\/\.-](\d{1,2})[\/\.-](\d{1,2})/);
    if (ymdMatch) {
      const yyyy = parseInt(ymdMatch[1], 10);
      const mm = parseInt(ymdMatch[2], 10) - 1;
      const dd = parseInt(ymdMatch[3], 10);
      return new Date(yyyy, mm, dd);
    }
  }

  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
};

/**
 * Returns today's date formatted as DD/MM/YYYY.
 */
export const getTodayDate = () => {
  return formatDate(new Date());
};

/**
 * Returns today's date formatted as YYYY-MM-DD for HTML date inputs.
 */
export const getTodayInputDate = () => {
  return formatDateForInput(new Date());
};

/**
 * React Component for displaying formatted date in DD/MM/YYYY.
 */
export const DateDisplay = ({ value, fallback = 'N/A' }) => {
  return <>{formatDate(value, fallback) || fallback}</>;
};

export default formatDate;
