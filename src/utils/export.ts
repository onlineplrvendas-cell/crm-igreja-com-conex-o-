import {
  Contact,
  ContactsFilterState,
  CongregationFilter,
  WeeklyConfirmationEntry,
  WeeklyConfirmationSummary,
} from '../types';
import { formatDateBR } from './date';

/**
 * Sanitizes a cell to prevent CSV formula injection attacks in Excel/Google Sheets
 */
function sanitizeCSVCell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  let str = String(value).trim();

  // If string begins with characters that trigger formula execution in spreadsheets
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // Escape internal double quotes
  str = str.replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Exports contacts to CSV format in UTF-8 with BOM for Excel compatibility
 */
export function exportContactsToCSV(
  contacts: Contact[],
  activeCongregation: CongregationFilter,
  filterState: ContactsFilterState
): void {
  const lines: string[] = [];

  // Metadata comments in header
  lines.push(`# EXPORTAÇÃO CASA DE DEUS - CRM`);
  lines.push(`# Data de geração: ${new Date().toLocaleString('pt-BR')}`);
  lines.push(`# Congregação: ${activeCongregation === 'all' ? 'Todas / Visão Geral' : activeCongregation}`);
  lines.push(`# Categoria: ${filterState.category === 'all' ? 'Todas' : filterState.category}`);
  lines.push(`# Etapa: ${filterState.stage === 'all' ? 'Todas' : filterState.stage}`);
  lines.push(`# Responsável: ${filterState.assignedTo === 'all' ? 'Todos' : filterState.assignedTo}`);
  lines.push(`# Inclui arquivados: ${filterState.showArchived ? 'Sim' : 'Não'}`);
  lines.push(`# Total de registros: ${contacts.length}`);
  lines.push('');

  // CSV Column headers
  const headers = [
    'ID',
    'Nome Completo',
    'Telefone/WhatsApp',
    'Congregação',
    'Categoria',
    'Etapa do Acompanhamento',
    'Responsável',
    'E-mail',
    'Bairro',
    'Origem',
    'Primeira Visita',
    'Membro Desde',
    'Data de Cadastro',
    'Status'
  ];

  lines.push(headers.map(sanitizeCSVCell).join(';'));

  for (const c of contacts) {
    const row = [
      c.id,
      c.name,
      c.phone,
      c.congregation,
      c.category,
      c.stage,
      c.assignedToName || 'Não atribuído',
      c.email || '',
      c.neighborhood || '',
      c.source || 'Outro',
      formatDateBR(c.firstVisitDate),
      formatDateBR(c.memberSinceDate),
      formatDateBR(c.createdAt),
      c.isArchived ? 'Arquivado' : 'Ativo'
    ];
    lines.push(row.map(sanitizeCSVCell).join(';'));
  }

  // Prepend UTF-8 BOM so Excel opens with proper accents (ç, ã, é, etc.)
  const csvContent = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  const dateSlug = new Date().toISOString().slice(0, 10);
  link.setAttribute('download', `casa-de-deus-contatos-${activeCongregation}-${dateSlug}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports weekly confirmation list (Convidados, Visitantes, Membros) to CSV/Excel
 * Includes mandatory columns: Nome, Tipo, Telefone, Responsável, Status, Motivo da Ausência, Data/Semana de Referência.
 */
export function exportWeeklyConfirmationsToCSV(
  entries: WeeklyConfirmationEntry[],
  weekLabel: string,
  activeCongregation: CongregationFilter,
  summary?: WeeklyConfirmationSummary
): void {
  const lines: string[] = [];

  // Metadata comments in header
  lines.push(`# CASA DE DEUS - RELATÓRIO DE CONFIRMADOS DA SEMANA`);
  lines.push(`# Semana de Referência: ${weekLabel}`);
  lines.push(`# Congregação: ${activeCongregation === 'all' ? 'Todas as congregações' : activeCongregation}`);
  lines.push(`# Data de emissão: ${new Date().toLocaleString('pt-BR')}`);
  lines.push(`# Total de pessoas na lista: ${entries.length}`);
  if (summary) {
    lines.push(`# Confirmados (Positivo/Verde): ${summary.confirmed} (${summary.confirmationRate}%)`);
    lines.push(`# Ausentes/Não confirmados (Negativo/Vermelho): ${summary.unconfirmed}`);
    lines.push(`# Membros: ${summary.byCategory.membros} | Visitantes: ${summary.byCategory.visitantes} | Convidados: ${summary.byCategory.convidados}`);
  }
  lines.push('');

  // Mandatory CSV Column headers
  const headers = [
    'Nome',
    'Tipo (Membro/Visitante/Convidado)',
    'Telefone',
    'Responsável',
    'Status (Confirmado/Não Confirmado)',
    'Motivo da Ausência',
    'Data/Semana de Referência',
    'Congregação',
    'Observações'
  ];

  lines.push(headers.map(sanitizeCSVCell).join(';'));

  for (const entry of entries) {
    const statusLabel = entry.status === 'confirmed' ? 'Confirmado' : 'Não Confirmado';
    const motivoLabel = entry.status === 'confirmed' ? '-' : (entry.absenceReason || 'Não informado');

    const row = [
      entry.name,
      entry.category,
      entry.phone,
      entry.responsibleName || 'Não atribuído',
      statusLabel,
      motivoLabel,
      weekLabel,
      entry.congregation,
      entry.notes || ''
    ];
    lines.push(row.map(sanitizeCSVCell).join(';'));
  }

  // Prepend UTF-8 BOM for Excel / Google Sheets
  const csvContent = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  const safeWeekName = weekLabel.replace(/[^a-zA-Z0-9-]/g, '_');
  const congSlug = activeCongregation === 'all' ? 'todas' : activeCongregation.toLowerCase();
  link.setAttribute('download', `confirmados-semana-${congSlug}-${safeWeekName}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

