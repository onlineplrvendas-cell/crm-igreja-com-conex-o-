/**
 * Utilities for dates and timezones (America/Sao_Paulo, DD/MM/AAAA)
 */

export const SAO_PAULO_TZ = 'America/Sao_Paulo';

const MONTH_NAMES_PT = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

/**
 * Returns current date object localized to Sao Paulo
 */
export function getNowInSaoPaulo(): Date {
  // Use Intl to compute the current wall-clock date in Sao Paulo
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: SAO_PAULO_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const map: Record<string, string> = {};
  parts.forEach(p => { map[p.type] = p.value; });

  const year = parseInt(map.year, 10);
  const month = parseInt(map.month, 10) - 1;
  const day = parseInt(map.day, 10);
  const hour = parseInt(map.hour, 10);
  const minute = parseInt(map.minute, 10);
  const second = parseInt(map.second, 10);

  return new Date(year, month, day, hour, minute, second);
}

/**
 * Returns today in YYYY-MM-DD format (Sao Paulo timezone)
 */
export function getTodayString(): string {
  const spDate = getNowInSaoPaulo();
  const year = spDate.getFullYear();
  const month = String(spDate.getMonth() + 1).padStart(2, '0');
  const day = String(spDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats an ISO string or YYYY-MM-DD to DD/MM/AAAA
 */
export function formatDateBR(dateInput?: string | null): string {
  if (!dateInput) return '-';
  try {
    // If it's YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      const [year, month, day] = dateInput.split('-');
      return `${day}/${month}/${year}`;
    }
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '-';
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: SAO_PAULO_TZ,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
  } catch {
    return '-';
  }
}

/**
 * Formats an ISO string to DD/MM/AAAA às HH:mm
 */
export function formatDateTimeBR(dateInput?: string | null): string {
  if (!dateInput) return '-';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '-';
    const datePart = new Intl.DateTimeFormat('pt-BR', {
      timeZone: SAO_PAULO_TZ,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);

    const timePart = new Intl.DateTimeFormat('pt-BR', {
      timeZone: SAO_PAULO_TZ,
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);

    return `${datePart} às ${timePart}`;
  } catch {
    return '-';
  }
}

/**
 * Checks if a given date string or ISO belongs to current year and month in SP
 */
export function isCurrentMonthInSP(dateInput?: string | null): boolean {
  if (!dateInput) return false;
  try {
    let year: number;
    let month: number;

    if (/^\d{4}-\d{2}-\d{2}/.test(dateInput)) {
      const parts = dateInput.split('-');
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
    } else {
      const d = new Date(dateInput);
      if (isNaN(d.getTime())) return false;
      const sp = getNowInSaoPaulo();
      return d.getFullYear() === sp.getFullYear() && d.getMonth() === sp.getMonth();
    }

    const todaySP = getNowInSaoPaulo();
    return year === todaySP.getFullYear() && month === todaySP.getMonth();
  } catch {
    return false;
  }
}

/**
 * Evaluates task due state: 'overdue' | 'today' | 'upcoming'
 */
export function getTaskDueState(dueDate: string): 'overdue' | 'today' | 'upcoming' {
  const today = getTodayString();
  const dateOnly = dueDate.slice(0, 10);
  if (dateOnly < today) return 'overdue';
  if (dateOnly === today) return 'today';
  return 'upcoming';
}

/**
 * Returns the last 6 months (including current month) formatted for charts
 */
export function getLast6Months(): { key: string; label: string; year: number; month: number }[] {
  const spDate = getNowInSaoPaulo();
  const result: { key: string; label: string; year: number; month: number }[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(spDate.getFullYear(), spDate.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    const key = `${year}-${String(month + 1).padStart(2, '0')}`;
    const label = `${MONTH_NAMES_PT[month]}/${String(year).slice(2)}`;
    result.push({ key, label, year, month });
  }

  return result;
}

/**
 * Calculates the Monday-to-Sunday week boundary for a given date (Sao Paulo timezone)
 */
export function getWeekRangeForDate(dateInput?: Date | string | null): {
  startDate: string; // YYYY-MM-DD (Monday)
  endDate: string; // YYYY-MM-DD (Sunday)
  weekKey: string; // YYYY-MM-DD (Monday)
  weekLabel: string; // e.g. "Semana de 21/09 a 27/09/2026"
  isCurrentWeek: boolean;
} {
  let target: Date;
  if (!dateInput) {
    target = getNowInSaoPaulo();
  } else if (typeof dateInput === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      const [y, m, d] = dateInput.split('-').map(Number);
      target = new Date(y, m - 1, d, 12, 0, 0);
    } else {
      target = new Date(dateInput);
    }
  } else {
    target = new Date(dateInput.getTime());
  }

  if (isNaN(target.getTime())) {
    target = getNowInSaoPaulo();
  }

  // Calculate day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const day = target.getDay();
  // Monday offset: if Sunday (0) go back 6 days; if Mon (1) go back 0; Tue (2) go back 1, etc.
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(target.getFullYear(), target.getMonth(), target.getDate() + diffToMonday);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);

  const formatYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dayStr = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dayStr}`;
  };

  const formatDM = (d: Date) => {
    const dayStr = String(d.getDate()).padStart(2, '0');
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${dayStr}/${m}`;
  };

  const startDate = formatYMD(monday);
  const endDate = formatYMD(sunday);
  const weekLabel = `Semana de ${formatDM(monday)} a ${formatDM(sunday)}/${sunday.getFullYear()}`;

  // Check if current week in SP
  const todaySP = getNowInSaoPaulo();
  const currentMonday = new Date(todaySP.getFullYear(), todaySP.getMonth(), todaySP.getDate() + (todaySP.getDay() === 0 ? -6 : 1 - todaySP.getDay()));
  const isCurrentWeek = formatYMD(currentMonday) === startDate;

  return {
    startDate,
    endDate,
    weekKey: startDate,
    weekLabel,
    isCurrentWeek,
  };
}

/**
 * Returns available week choices for history navigation (past 8 weeks + current week + next week)
 */
export function getAvailableWeekOptions(pastCount: number = 8, futureCount: number = 2): {
  weekKey: string;
  startDate: string;
  endDate: string;
  weekLabel: string;
  displayLabel: string;
  isCurrent: boolean;
}[] {
  const currentWeek = getWeekRangeForDate();
  const options: {
    weekKey: string;
    startDate: string;
    endDate: string;
    weekLabel: string;
    displayLabel: string;
    isCurrent: boolean;
  }[] = [];

  const [currY, currM, currD] = currentWeek.startDate.split('-').map(Number);
  const baseMonday = new Date(currY, currM - 1, currD, 12, 0, 0);

  for (let i = -pastCount; i <= futureCount; i++) {
    const targetMonday = new Date(baseMonday.getFullYear(), baseMonday.getMonth(), baseMonday.getDate() + i * 7);
    const range = getWeekRangeForDate(targetMonday);
    let displayLabel = range.weekLabel;
    if (i === 0) {
      displayLabel = `Semana Atual (${range.weekLabel.replace('Semana de ', '')})`;
    } else if (i === -1) {
      displayLabel = `Semana Anterior (${range.weekLabel.replace('Semana de ', '')})`;
    } else if (i === 1) {
      displayLabel = `Próxima Semana (${range.weekLabel.replace('Semana de ', '')})`;
    }

    options.push({
      ...range,
      displayLabel,
      isCurrent: i === 0,
    });
  }

  // Sort descending so the most recent weeks come first
  return options.reverse();
}

