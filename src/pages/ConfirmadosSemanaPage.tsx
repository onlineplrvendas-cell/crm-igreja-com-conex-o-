import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CheckCheck,
  CheckCircle2,
  XCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Save,
  Search,
  UserPlus,
  Phone,
  MessageCircle,
  AlertCircle,
  Users,
  UserCheck,
  UserX,
  Sparkles,
  Trash2,
  Clock,
  Filter,
  Check,
  Building2,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { useAuth } from '../context/AuthContext';
import {
  WeeklyConfirmationEntry,
  WeeklyConfirmationReport,
  WeeklyConfirmationStatus,
  ContactCategory,
  Congregation,
  CongregationFilter,
  Contact,
} from '../types';
import {
  getWeekRangeForDate,
  getAvailableWeekOptions,
  formatDateBR,
} from '../utils/date';
import { maskPhoneBR, getOnlyDigits } from '../utils/phone';
import { exportWeeklyConfirmationsToCSV } from '../utils/export';
import { calculateWeeklySummary } from '../data/mockData';
import { UniReinoBadge } from '../components/UniReinoBadge';

const ABSENCE_PRESET_REASONS = [
  'Trabalho / Plantão',
  'Viagem',
  'Problema de saúde',
  'Não respondeu',
  'Compromisso familiar',
  'Sem transporte',
  'Imprevisto pessoal',
];

interface ConfirmadosSemanaPageProps {
  onOpenContactDetails?: (contact: Contact) => void;
  onOpenNewContact?: () => void;
}

export const ConfirmadosSemanaPage: React.FC<ConfirmadosSemanaPageProps> = ({
  onOpenContactDetails,
  onOpenNewContact,
}) => {
  const {
    contacts,
    teamMembers,
    selectedCongregation,
    setSelectedCongregation,
    authorizedCongregations,
    weeklyReports,
    saveWeeklyReport,
    deleteWeeklyReport,
    updateContact,
  } = useCRM();

  const { currentUser } = useAuth();

  // Week selection state
  const availableWeeks = useMemo(() => getAvailableWeekOptions(8, 2), []);
  const currentWeekRange = useMemo(() => getWeekRangeForDate(), []);

  const [selectedWeekKey, setSelectedWeekKey] = useState<string>(() => currentWeekRange.weekKey);

  // Active week range computed from selectedWeekKey
  const activeWeekRange = useMemo(() => {
    return getWeekRangeForDate(selectedWeekKey);
  }, [selectedWeekKey]);

  // Current working confirmation entries
  const [entries, setEntries] = useState<WeeklyConfirmationEntry[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Search & Filters within table
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'unconfirmed'>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | ContactCategory>('all');

  // Add Contact Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [addSearchTerm, setAddSearchTerm] = useState<string>('');
  const [addCategoryFilter, setAddCategoryFilter] = useState<'all' | ContactCategory>('all');

  // Quick manual add form state
  const [quickManualName, setQuickManualName] = useState<string>('');
  const [quickManualPhone, setQuickManualPhone] = useState<string>('');
  const [quickManualCategory, setQuickManualCategory] = useState<ContactCategory>('Novo contato');
  const [quickManualCongregation, setQuickManualCongregation] = useState<Congregation>(() => {
    return selectedCongregation === 'all' ? 'Recreio' : (selectedCongregation as Congregation);
  });
  const [showManualForm, setShowManualForm] = useState<boolean>(false);

  // Helper to generate default entries for a week from existing contacts
  const buildDefaultEntriesFromContacts = useCallback(
    (congFilter: CongregationFilter): WeeklyConfirmationEntry[] => {
      let filtered = contacts.filter(c => !c.isArchived);
      if (congFilter !== 'all') {
        filtered = filtered.filter(c => c.congregation === congFilter);
      }

      // Priority: contacts marked confirmedThisWeek, or recent visitors/new contacts
      const initialList = filtered.filter(c => {
        // Include if explicitly confirmed or active in weekly process
        if (c.confirmedThisWeek) return true;
        if (c.stage === 'Aguardando primeiro contato' || c.stage === '1º contato feito' || c.stage === 'Em acompanhamento') {
          return true;
        }
        return false;
      });

      // If list is small, also add a few members to accompany
      const finalContacts = initialList.length > 0 ? initialList : filtered.slice(0, 10);

      return finalContacts.map(c => ({
        contactId: c.id,
        name: c.name,
        category: c.category,
        phone: c.phone,
        congregation: c.congregation,
        responsibleId: c.assignedToId,
        responsibleName: c.assignedToName || 'Não atribuído',
        status: c.confirmedThisWeek ? 'confirmed' : 'unconfirmed',
        absenceReason: c.confirmedThisWeek ? undefined : (c.initialNotes?.includes('Trabalho') ? 'Trabalho' : undefined),
        updatedAt: new Date().toISOString(),
      }));
    },
    [contacts]
  );

  // Load entries when week or congregation changes
  useEffect(() => {
    // 1. Check if we already have a saved report for this weekKey and congregation
    const existingReport = weeklyReports.find(
      r => r.weekKey === selectedWeekKey && (r.congregation === selectedCongregation || (selectedCongregation === 'all' && r.congregation === 'all'))
    );

    if (existingReport && existingReport.entries && existingReport.entries.length > 0) {
      // Filter by congregation if needed
      let weekEntries = existingReport.entries;
      if (selectedCongregation !== 'all') {
        weekEntries = weekEntries.filter(e => e.congregation === selectedCongregation);
      }
      // Strictly enforce congregation and family boundaries
      weekEntries = weekEntries.filter(e => authorizedCongregations.includes(e.congregation));
      if (currentUser?.role === 'lider_familia' && currentUser.assignedCuricicaFamily) {
        const familyContactIds = new Set(contacts.map(c => c.id));
        weekEntries = weekEntries.filter(e => familyContactIds.has(e.contactId));
      }
      setEntries(weekEntries);
      setHasUnsavedChanges(false);
    } else {
      // 2. Fallback: generate default entries from contacts
      const defaultEntries = buildDefaultEntriesFromContacts(selectedCongregation);
      setEntries(defaultEntries);
      setHasUnsavedChanges(false);
    }
  }, [selectedWeekKey, selectedCongregation, weeklyReports, buildDefaultEntriesFromContacts]);

  // Compute live summary metrics
  const summary = useMemo(() => {
    return calculateWeeklySummary(entries);
  }, [entries]);

  // Handle status toggle (Confirmed <-> Unconfirmed)
  const handleToggleStatus = (contactId: string, newStatus: WeeklyConfirmationStatus) => {
    setEntries(prev =>
      prev.map(entry => {
        if (entry.contactId === contactId) {
          return {
            ...entry,
            status: newStatus,
            // If turning confirmed, clear absence reason. If unconfirmed, set placeholder if empty
            absenceReason: newStatus === 'confirmed' ? undefined : (entry.absenceReason || ''),
            updatedAt: new Date().toISOString(),
          };
        }
        return entry;
      })
    );
    setHasUnsavedChanges(true);

    // Also sync with contact's confirmedThisWeek attribute if current week
    if (activeWeekRange.isCurrentWeek) {
      updateContact(contactId, {
        confirmedThisWeek: newStatus === 'confirmed',
        confirmedNotes: newStatus === 'confirmed' ? 'Confirmado para o culto da semana' : undefined,
      }).catch(err => console.error(err));
    }
  };

  // Handle reason change
  const handleReasonChange = (contactId: string, reason: string) => {
    setEntries(prev =>
      prev.map(entry => {
        if (entry.contactId === contactId) {
          return {
            ...entry,
            absenceReason: reason,
            updatedAt: new Date().toISOString(),
          };
        }
        return entry;
      })
    );
    setHasUnsavedChanges(true);
  };

  // Handle responsible change
  const handleResponsibleChange = (contactId: string, memberId: string) => {
    const member = teamMembers.find(m => m.uid === memberId);
    setEntries(prev =>
      prev.map(entry => {
        if (entry.contactId === contactId) {
          return {
            ...entry,
            responsibleId: member?.uid,
            responsibleName: member?.name || 'Não atribuído',
            updatedAt: new Date().toISOString(),
          };
        }
        return entry;
      })
    );
    setHasUnsavedChanges(true);
  };

  // Remove contact from week's list
  const handleRemoveEntry = (contactId: string) => {
    setEntries(prev => prev.filter(e => e.contactId !== contactId));
    setHasUnsavedChanges(true);
  };

  // Save current week's confirmation report
  const handleSaveWeek = async () => {
    setIsSaving(true);
    try {
      const reportId = `report-${activeWeekRange.weekKey}-${selectedCongregation}`;
      const report: WeeklyConfirmationReport = {
        id: reportId,
        weekKey: activeWeekRange.weekKey,
        weekLabel: activeWeekRange.weekLabel,
        startDate: activeWeekRange.startDate,
        endDate: activeWeekRange.endDate,
        congregation: selectedCongregation,
        entries: entries,
        summary: summary,
        savedAt: new Date().toISOString(),
        savedBy: currentUser?.name || 'Equipe Pastoral',
      };

      await saveWeeklyReport(report);
      setHasUnsavedChanges(false);
      setSaveSuccessMessage('Relatório da semana gravado com sucesso no histórico!');
      setTimeout(() => {
        setSaveSuccessMessage(null);
      }, 3500);
    } catch (error) {
      console.error('Erro ao salvar relatório semanal:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    exportWeeklyConfirmationsToCSV(
      entries,
      activeWeekRange.weekLabel,
      selectedCongregation,
      summary
    );
  };

  // Navigation between weeks
  const handleNavigateWeek = (direction: 'prev' | 'next') => {
    const currentIndex = availableWeeks.findIndex(w => w.weekKey === selectedWeekKey);
    if (currentIndex === -1) return;

    // availableWeeks is sorted descending: index 0 is most future, index length-1 is oldest
    if (direction === 'prev' && currentIndex < availableWeeks.length - 1) {
      setSelectedWeekKey(availableWeeks[currentIndex + 1].weekKey);
    } else if (direction === 'next' && currentIndex > 0) {
      setSelectedWeekKey(availableWeeks[currentIndex - 1].weekKey);
    }
  };

  // Add existing contacts into weekly confirmation list
  const handleAddExistingContact = (contact: Contact) => {
    if (entries.some(e => e.contactId === contact.id)) return;

    const newEntry: WeeklyConfirmationEntry = {
      contactId: contact.id,
      name: contact.name,
      category: contact.category,
      phone: contact.phone,
      congregation: contact.congregation,
      responsibleId: contact.assignedToId,
      responsibleName: contact.assignedToName || 'Não atribuído',
      status: 'confirmed',
      updatedAt: new Date().toISOString(),
    };

    setEntries(prev => [newEntry, ...prev]);
    setHasUnsavedChanges(true);
  };

  // Add manual contact
  const handleAddManualGuest = () => {
    if (!quickManualName.trim() || !quickManualPhone.trim()) return;

    const dummyId = `manual-${Date.now()}`;
    const newEntry: WeeklyConfirmationEntry = {
      contactId: dummyId,
      name: quickManualName.trim(),
      category: quickManualCategory,
      phone: maskPhoneBR(quickManualPhone),
      congregation: quickManualCongregation,
      responsibleName: currentUser?.name || 'Equipe Pastoral',
      status: 'confirmed',
      updatedAt: new Date().toISOString(),
    };

    setEntries(prev => [newEntry, ...prev]);
    setHasUnsavedChanges(true);
    setQuickManualName('');
    setQuickManualPhone('');
    setShowManualForm(false);
    setIsAddModalOpen(false);
  };

  // Filtered entries for table rendering
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      // Search filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesName = entry.name.toLowerCase().includes(term);
        const matchesPhone = entry.phone.includes(term);
        const matchesResp = (entry.responsibleName || '').toLowerCase().includes(term);
        const matchesReason = (entry.absenceReason || '').toLowerCase().includes(term);
        if (!matchesName && !matchesPhone && !matchesResp && !matchesReason) return false;
      }

      // Status filter
      if (statusFilter !== 'all' && entry.status !== statusFilter) {
        return false;
      }

      // Category filter
      if (categoryFilter !== 'all' && entry.category !== categoryFilter) {
        return false;
      }

      return true;
    });
  }, [entries, searchTerm, statusFilter, categoryFilter]);

  // Candidates for Add Modal (contacts not already in entries)
  const candidateContacts = useMemo(() => {
    const existingIds = new Set(entries.map(e => e.contactId));
    return contacts.filter(c => {
      if (c.isArchived) return false;
      if (existingIds.has(c.id)) return false;
      if (selectedCongregation !== 'all' && c.congregation !== selectedCongregation) return false;

      if (addSearchTerm) {
        const term = addSearchTerm.toLowerCase();
        const matchesName = c.name.toLowerCase().includes(term);
        const matchesPhone = c.phone.includes(term);
        if (!matchesName && !matchesPhone) return false;
      }

      if (addCategoryFilter !== 'all' && c.category !== addCategoryFilter) {
        return false;
      }

      return true;
    });
  }, [contacts, entries, selectedCongregation, addSearchTerm, addCategoryFilter]);

  // Quick whatsapp messenger
  const handleOpenWhatsApp = (entry: WeeklyConfirmationEntry) => {
    const raw = getOnlyDigits(entry.phone);
    if (!raw) return;
    const phoneWithCountry = raw.startsWith('55') ? raw : `55${raw}`;
    const firstWord = entry.name.split(' ')[0];
    const text = encodeURIComponent(
      `Olá ${firstWord}! Paz do Senhor! Tudo bem? Passando para saber de você e confirmar sua presença no culto deste fim de semana na Casa de Deus (${entry.congregation}). Esperamos você!`
    );
    window.open(`https://wa.me/${phoneWithCountry}?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Week Selector Bar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-2 border-b border-[#222222]">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2.5">
              <span className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
                <CheckCheck className="w-5 h-5 md:w-6 md:h-6" />
              </span>
              Confirmados da Semana
            </h1>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#161616] text-[#BBBBBB] border border-[#2B2B2B]">
              Culto & Acompanhamento
            </span>
            {hasUnsavedChanges && (
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                Alterações não gravadas
              </span>
            )}
          </div>
          <p className="text-xs md:text-sm text-[#888888] mt-1.5">
            Acompanhe a presença confirmada de Convidados, Visitantes e Membros, registre motivos de ausência e audite o histórico semanal.
          </p>
        </div>

        {/* Action Buttons: Export & Save & Add */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs md:text-sm font-semibold bg-[#181818] hover:bg-[#222222] text-white border border-[#333333] transition-colors"
          >
            <UserPlus className="w-4 h-4 text-emerald-400" />
            <span>Adicionar à Lista</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs md:text-sm font-semibold bg-[#181818] hover:bg-[#222222] text-white border border-[#333333] transition-colors"
            title="Exportar para Excel / CSV"
          >
            <Download className="w-4 h-4 text-sky-400" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={handleSaveWeek}
            disabled={isSaving}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-all shadow-sm ${
              hasUnsavedChanges
                ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20'
                : 'bg-white hover:bg-neutral-200 text-black'
            }`}
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{hasUnsavedChanges ? 'Salvar Alterações' : 'Salvo no Histórico'}</span>
          </button>
        </div>
      </div>

      {/* Success banner if saved */}
      {saveSuccessMessage && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs text-emerald-300 animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{saveSuccessMessage}</span>
          </div>
        </div>
      )}

      {/* Control Bar: Week Selector & Congregation Selector */}
      <div className="p-4 bg-[#0A0A0A] border border-[#222222] rounded-xl flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Week Selector Section */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-1 bg-[#121212] border border-[#282828] rounded-lg p-1">
            <button
              onClick={() => handleNavigateWeek('prev')}
              className="p-1.5 text-[#888888] hover:text-white hover:bg-[#1E1E1E] rounded transition-colors"
              title="Semana anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 px-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <select
                value={selectedWeekKey}
                onChange={e => setSelectedWeekKey(e.target.value)}
                className="bg-transparent text-white text-xs md:text-sm font-semibold focus:outline-none cursor-pointer py-1"
              >
                {availableWeeks.map(w => (
                  <option key={w.weekKey} value={w.weekKey} className="bg-[#121212] text-white">
                    {w.displayLabel}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => handleNavigateWeek('next')}
              className="p-1.5 text-[#888888] hover:text-white hover:bg-[#1E1E1E] rounded transition-colors"
              title="Próxima semana"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setSelectedWeekKey(currentWeekRange.weekKey)}
            className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
              selectedWeekKey === currentWeekRange.weekKey
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-[#121212] text-[#888888] hover:text-white border-[#262626]'
            }`}
          >
            Semana Atual
          </button>
        </div>

        {/* Congregation Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-[#777777] font-medium flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" />
            {currentUser?.role === 'lider_familia' ? 'Família:' : 'Congregação:'}
          </span>
          {currentUser?.role === 'lider_familia' ? (
            <div className="px-3 py-1.5 rounded-lg bg-[#121212] border border-emerald-500/30 text-xs font-bold text-emerald-400">
              {currentUser.assignedCuricicaFamily === 'familia_1' ? 'Família 1' : currentUser.assignedCuricicaFamily === 'familia_2' ? 'Família 2' : 'Família 3'} (Curicica)
            </div>
          ) : authorizedCongregations.length > 1 ? (
            <div className="inline-flex rounded-lg bg-[#121212] p-1 border border-[#262626]">
              {currentUser?.role === 'admin' && (
                <button
                  onClick={() => setSelectedCongregation('all')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                    selectedCongregation === 'all'
                      ? 'bg-white text-black shadow-sm'
                      : 'text-[#888888] hover:text-white'
                  }`}
                >
                  Todas
                </button>
              )}
              {authorizedCongregations.map(cong => (
                <button
                  key={cong}
                  onClick={() => setSelectedCongregation(cong)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                    selectedCongregation === cong
                      ? 'bg-white text-black shadow-sm'
                      : 'text-[#888888] hover:text-white'
                  }`}
                >
                  {cong}
                </button>
              ))}
            </div>
          ) : (
            <div className="px-3 py-1.5 rounded-lg bg-[#121212] border border-[#262626] text-xs font-semibold text-white">
              {authorizedCongregations[0] || 'Recreio'}
            </div>
          )}
        </div>
      </div>

      {/* METRICS & PERFORMANCE CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total da Semana */}
        <div className="p-4 bg-[#0B0B0B] border border-[#222222] rounded-xl relative overflow-hidden group hover:border-[#333333] transition-colors">
          <div className="flex items-center justify-between text-[#888888] text-xs font-medium">
            <span>Total da Semana</span>
            <Users className="w-4 h-4 text-[#AAAAAA]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl md:text-3xl font-extrabold text-white">{summary.total}</span>
            <span className="text-xs text-[#888888]">pessoas na lista</span>
          </div>
          <div className="mt-3 pt-3 border-t border-[#1C1C1C] flex items-center gap-2 text-[11px] text-[#888888] flex-wrap">
            <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-medium">
              {summary.byCategory.convidados} Convidados
            </span>
            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-medium">
              {summary.byCategory.visitantes} Visitantes
            </span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium">
              {summary.byCategory.membros} Membros
            </span>
          </div>
        </div>

        {/* Metric 2: Taxa de Confirmação (%) */}
        <div className="p-4 bg-[#0B0B0B] border border-[#222222] rounded-xl relative overflow-hidden group hover:border-[#333333] transition-colors">
          <div className="flex items-center justify-between text-[#888888] text-xs font-medium">
            <span>Taxa de Confirmação</span>
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl md:text-3xl font-extrabold text-emerald-400">
              {summary.confirmationRate}%
            </span>
            <span className="text-xs text-[#888888]">
              ({summary.confirmed} de {summary.total})
            </span>
          </div>
          {/* Progress bar */}
          <div className="mt-3 w-full bg-[#1A1A1A] h-2 rounded-full overflow-hidden flex">
            <div
              className="bg-emerald-500 h-full transition-all duration-500"
              style={{ width: `${summary.confirmationRate}%` }}
              title={`Confirmados: ${summary.confirmed}`}
            />
            <div
              className="bg-rose-500/80 h-full transition-all duration-500"
              style={{ width: `${100 - summary.confirmationRate}%` }}
              title={`Ausentes: ${summary.unconfirmed}`}
            />
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-[#777777]">
            <span className="text-emerald-400 font-semibold">{summary.confirmed} Confirmados</span>
            <span className="text-rose-400 font-semibold">{summary.unconfirmed} Ausentes</span>
          </div>
        </div>

        {/* Metric 3: Confirmados vs Ausentes */}
        <div className="p-4 bg-[#0B0B0B] border border-[#222222] rounded-xl relative overflow-hidden group hover:border-[#333333] transition-colors">
          <div className="flex items-center justify-between text-[#888888] text-xs font-medium">
            <span>Status da Semana</span>
            <UserCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
              <span className="text-[10px] text-emerald-400 font-bold uppercase block">Confirmados</span>
              <span className="text-xl font-bold text-white mt-0.5 block">{summary.confirmed}</span>
            </div>
            <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-center">
              <span className="text-[10px] text-rose-400 font-bold uppercase block">Não Confirmados</span>
              <span className="text-xl font-bold text-white mt-0.5 block">{summary.unconfirmed}</span>
            </div>
          </div>
          <div className="mt-2.5 text-[10px] text-[#777777] text-center">
            {summary.unconfirmed === 0 ? 'Excelente! 100% de confirmações' : `${summary.unconfirmed} ausência(s) registrada(s)`}
          </div>
        </div>

        {/* Metric 4: Principais Motivos de Ausência */}
        <div className="p-4 bg-[#0B0B0B] border border-[#222222] rounded-xl relative overflow-hidden group hover:border-[#333333] transition-colors">
          <div className="flex items-center justify-between text-[#888888] text-xs font-medium">
            <span>Principais Motivos de Ausência</span>
            <UserX className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 min-h-[46px] flex flex-col justify-center">
            {summary.topReasons.length === 0 ? (
              <p className="text-xs text-[#777777] italic">Nenhuma ausência registrada para esta semana.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {summary.topReasons.slice(0, 3).map((item, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded text-[11px] font-medium bg-rose-500/10 text-rose-300 border border-rose-500/20"
                  >
                    {item.reason} <span className="font-bold">({item.count})</span>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="mt-2.5 pt-2 border-t border-[#1C1C1C] text-[10px] text-[#777777] flex items-center justify-between">
            <span>Motivos registrados:</span>
            <span className="font-medium text-white">
              {summary.topReasons.reduce((acc, curr) => acc + curr.count, 0)} no total
            </span>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH BAR WITHIN TABLE */}
      <div className="p-3 md:p-4 bg-[#0B0B0B] border border-[#222222] rounded-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative grow max-w-md">
          <Search className="w-4 h-4 text-[#777777] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, telefone, responsável ou motivo..."
            className="w-full pl-9 pr-3 py-2 bg-[#141414] border border-[#282828] rounded-lg text-white text-xs md:text-sm focus:outline-none focus:border-white transition-colors"
          />
        </div>

        {/* Quick Filter Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Filter */}
          <div className="inline-flex rounded-lg bg-[#141414] p-1 border border-[#282828]">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                statusFilter === 'all' ? 'bg-[#282828] text-white' : 'text-[#888888] hover:text-white'
              }`}
            >
              Todos ({entries.length})
            </button>
            <button
              onClick={() => setStatusFilter('confirmed')}
              className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-colors ${
                statusFilter === 'confirmed'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-[#888888] hover:text-emerald-400'
              }`}
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>Confirmados ({summary.confirmed})</span>
            </button>
            <button
              onClick={() => setStatusFilter('unconfirmed')}
              className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-colors ${
                statusFilter === 'unconfirmed'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'text-[#888888] hover:text-rose-400'
              }`}
            >
              <XCircle className="w-3 h-3 text-rose-400" />
              <span>Ausentes ({summary.unconfirmed})</span>
            </button>
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value as any)}
            className="bg-[#141414] border border-[#282828] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none cursor-pointer font-medium"
          >
            <option value="all">Todas Categorias</option>
            <option value="Novo contato">Convidados</option>
            <option value="Visitante">Visitantes</option>
            <option value="Membro">Membros</option>
          </select>
        </div>
      </div>

      {/* TABLE: CONFIRMADOS DA SEMANA (Desktop & Tablet) */}
      <div className="hidden lg:block bg-[#0B0B0B] border border-[#222222] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs md:text-sm">
            <thead>
              <tr className="border-b border-[#222222] bg-[#0E0E0E] text-[#888888] uppercase tracking-wider text-[11px] font-bold">
                <th className="py-3 px-4">Nome</th>
                <th className="py-3 px-4">Tipo / Categoria</th>
                <th className="py-3 px-4">Telefone / Contato</th>
                <th className="py-3 px-4">Responsável</th>
                <th className="py-3 px-4 text-center">Status Confirmação</th>
                <th className="py-3 px-4 min-w-[280px]">Motivo / Descrição da Ausência</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1C1C1C]">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#777777]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="w-8 h-8 text-[#444444]" />
                      <p className="font-medium text-white">Nenhum registro encontrado</p>
                      <p className="text-xs text-[#666666]">
                        {searchTerm
                          ? 'Tente ajustar os filtros de busca acima.'
                          : 'Clique em "Adicionar à Lista" para incluir contatos nesta semana.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEntries.map(entry => {
                  const isConfirmed = entry.status === 'confirmed';
                  const matchingContact = contacts.find(c => c.id === entry.contactId);

                  return (
                    <tr
                      key={entry.contactId}
                      className={`hover:bg-[#121212] transition-colors group ${
                        isConfirmed ? 'bg-emerald-950/5' : 'bg-rose-950/5'
                      }`}
                    >
                      {/* 1. Nome */}
                      <td className="py-3.5 px-4 font-medium text-white">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold uppercase shrink-0 ${
                              isConfirmed
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {entry.name.slice(0, 1)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                onClick={() => matchingContact && onOpenContactDetails?.(matchingContact)}
                                className={`font-semibold cursor-pointer hover:underline ${
                                  matchingContact ? 'text-white hover:text-emerald-300' : 'text-neutral-300'
                                }`}
                              >
                                {entry.name}
                              </span>
                              {matchingContact?.uniReino?.isEnrolled && (
                                <UniReinoBadge
                                  enrollment={matchingContact.uniReino}
                                  semester={matchingContact.uniReino.semester}
                                  size="xs"
                                />
                              )}
                            </div>
                            <span className="text-[10px] text-[#777777] block">
                              {entry.congregation}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 2. Tipo/Categoria */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            entry.category === 'Membro'
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                              : entry.category === 'Visitante'
                              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                              : 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                          }`}
                        >
                          {entry.category === 'Novo contato' ? 'Convidado' : entry.category}
                        </span>
                      </td>

                      {/* 3. Telefone / Contato */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#BBBBBB] font-mono whitespace-nowrap">
                            {entry.phone}
                          </span>
                          <button
                            onClick={() => handleOpenWhatsApp(entry)}
                            className="p-1 rounded-md text-emerald-400 hover:text-white hover:bg-emerald-600 transition-colors"
                            title="Conversar no WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* 4. Responsável / Consolidador */}
                      <td className="py-3.5 px-4">
                        <select
                          value={entry.responsibleId || ''}
                          onChange={e => handleResponsibleChange(entry.contactId, e.target.value)}
                          className="bg-[#141414] border border-[#262626] rounded px-2 py-1 text-xs text-[#CCCCCC] focus:outline-none focus:border-white cursor-pointer"
                        >
                          <option value="">{entry.responsibleName || 'Não atribuído'}</option>
                          {teamMembers.map(m => (
                            <option key={m.uid} value={m.uid}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* 5. Status de Confirmação (Check Verde/Vermelho) */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center p-1 bg-[#141414] border border-[#2B2B2B] rounded-lg gap-1">
                          <button
                            onClick={() => handleToggleStatus(entry.contactId, 'confirmed')}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                              isConfirmed
                                ? 'bg-emerald-500 text-black shadow-sm'
                                : 'text-[#777777] hover:text-emerald-400'
                            }`}
                            title="Marcar como Confirmado"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Confirmado</span>
                          </button>
                          <button
                            onClick={() => handleToggleStatus(entry.contactId, 'unconfirmed')}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                              !isConfirmed
                                ? 'bg-rose-500 text-white shadow-sm'
                                : 'text-[#777777] hover:text-rose-400'
                            }`}
                            title="Marcar como Ausente / Não Confirmado"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Ausente</span>
                          </button>
                        </div>
                      </td>

                      {/* 6. Motivo / Descrição da Ausência */}
                      <td className="py-3.5 px-4">
                        {isConfirmed ? (
                          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium bg-emerald-500/5 px-2.5 py-1.5 rounded-lg border border-emerald-500/10">
                            <Check className="w-3.5 h-3.5" />
                            <span>Presença confirmada no culto</span>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <div className="relative">
                              <input
                                type="text"
                                value={entry.absenceReason || ''}
                                onChange={e => handleReasonChange(entry.contactId, e.target.value)}
                                placeholder="Informe o motivo da ausência..."
                                className={`w-full px-2.5 py-1.5 bg-[#141414] border rounded-lg text-xs text-white placeholder-[#666666] focus:outline-none transition-colors ${
                                  !entry.absenceReason?.trim()
                                    ? 'border-rose-500/50 focus:border-rose-400'
                                    : 'border-[#333333] focus:border-white'
                                }`}
                              />
                            </div>
                            {/* Preset Reason Chips */}
                            <div className="flex items-center gap-1 flex-wrap">
                              {ABSENCE_PRESET_REASONS.slice(0, 4).map((preset, pIdx) => (
                                <button
                                  key={pIdx}
                                  onClick={() => handleReasonChange(entry.contactId, preset)}
                                  className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                                    entry.absenceReason?.startsWith(preset.split(' ')[0])
                                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-semibold'
                                      : 'bg-[#181818] text-[#888888] hover:text-white border-[#2A2A2A]'
                                  }`}
                                >
                                  {preset}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* 7. Ações */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {matchingContact && (
                            <button
                              onClick={() => onOpenContactDetails?.(matchingContact)}
                              className="p-1.5 text-[#888888] hover:text-white hover:bg-[#1E1E1E] rounded transition-colors"
                              title="Ver ficha pastoral"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleRemoveEntry(entry.contactId)}
                            className="p-1.5 text-[#666666] hover:text-rose-400 hover:bg-[#1E1E1E] rounded transition-colors"
                            title="Remover da lista desta semana"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MOBILE / TABLET CARDS VIEW (< lg) */}
      <div className="lg:hidden space-y-3">
        {filteredEntries.length === 0 ? (
          <div className="py-12 px-4 text-center bg-[#0B0B0B] border border-[#222222] rounded-xl text-xs text-[#777777]">
            Nenhum contato encontrado com os critérios selecionados.
          </div>
        ) : (
          filteredEntries.map(entry => {
            const isConfirmed = entry.status === 'confirmed';
            const matchingContact = contacts.find(c => c.id === entry.contactId);

            return (
              <div
                key={entry.contactId}
                className={`p-4 bg-[#0B0B0B] border rounded-xl space-y-3 transition-colors ${
                  isConfirmed ? 'border-emerald-500/30' : 'border-rose-500/30'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold uppercase shrink-0 ${
                        isConfirmed
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {entry.name.slice(0, 1)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3
                          onClick={() => matchingContact && onOpenContactDetails?.(matchingContact)}
                          className="font-semibold text-white text-sm cursor-pointer hover:underline"
                        >
                          {entry.name}
                        </h3>
                        {matchingContact?.uniReino?.isEnrolled && (
                          <UniReinoBadge
                            enrollment={matchingContact.uniReino}
                            semester={matchingContact.uniReino.semester}
                            size="xs"
                          />
                        )}
                      </div>
                      <span className="text-[10px] text-[#777777] block">
                        {entry.congregation} • {entry.phone}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                      entry.category === 'Membro'
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : entry.category === 'Visitante'
                        ? 'bg-amber-500/15 text-amber-300'
                        : 'bg-blue-500/15 text-blue-300'
                    }`}
                  >
                    {entry.category === 'Novo contato' ? 'Convidado' : entry.category}
                  </span>
                </div>

                {/* Status Toggle on Mobile */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#1C1C1C]">
                  <span className="text-xs text-[#777777] font-medium">Status:</span>
                  <div className="inline-flex p-1 bg-[#141414] border border-[#2B2B2B] rounded-lg gap-1">
                    <button
                      onClick={() => handleToggleStatus(entry.contactId, 'confirmed')}
                      className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-bold ${
                        isConfirmed
                          ? 'bg-emerald-500 text-black'
                          : 'text-[#777777]'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Confirmado</span>
                    </button>
                    <button
                      onClick={() => handleToggleStatus(entry.contactId, 'unconfirmed')}
                      className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-bold ${
                        !isConfirmed
                          ? 'bg-rose-500 text-white'
                          : 'text-[#777777]'
                      }`}
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Ausente</span>
                    </button>
                  </div>
                </div>

                {/* Absence Reason (if unconfirmed) */}
                {!isConfirmed && (
                  <div className="space-y-1.5 pt-1">
                    <label className="text-[11px] font-semibold text-rose-300 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Motivo da Ausência:
                    </label>
                    <input
                      type="text"
                      value={entry.absenceReason || ''}
                      onChange={e => handleReasonChange(entry.contactId, e.target.value)}
                      placeholder="Descreva o motivo (ex: Trabalho, Viagem)..."
                      className="w-full px-2.5 py-1.5 bg-[#141414] border border-rose-500/40 rounded-lg text-xs text-white focus:outline-none"
                    />
                    <div className="flex items-center gap-1 flex-wrap">
                      {ABSENCE_PRESET_REASONS.map((preset, pIdx) => (
                        <button
                          key={pIdx}
                          onClick={() => handleReasonChange(entry.contactId, preset)}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-[#181818] text-[#999999] hover:text-white border border-[#2A2A2A]"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions row */}
                <div className="flex items-center justify-between pt-2 border-t border-[#1C1C1C] text-xs">
                  <span className="text-[#777777]">Resp: {entry.responsibleName || 'Não atribuído'}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenWhatsApp(entry)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </button>
                    <button
                      onClick={() => handleRemoveEntry(entry.contactId)}
                      className="p-1 text-[#666666] hover:text-rose-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL: ADICIONAR CONTATO À LISTA DA SEMANA */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-2xl bg-[#0D0D0D] border border-[#262626] rounded-2xl p-5 md:p-6 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#222222]">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-emerald-400" />
                  Adicionar à Lista da Semana
                </h2>
                <p className="text-xs text-[#888888]">
                  Selecione pessoas do banco de dados ou cadastre um convidado rápido.
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-[#777777] hover:text-white rounded-lg hover:bg-[#1A1A1A]"
              >
                ✕
              </button>
            </div>

            {/* Switch: Existing Contacts or Manual Add */}
            <div className="flex items-center justify-between">
              <div className="inline-flex p-1 bg-[#141414] border border-[#282828] rounded-lg">
                <button
                  onClick={() => setShowManualForm(false)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                    !showManualForm ? 'bg-[#262626] text-white' : 'text-[#888888] hover:text-white'
                  }`}
                >
                  Contatos Existentes
                </button>
                <button
                  onClick={() => setShowManualForm(true)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                    showManualForm ? 'bg-[#262626] text-white' : 'text-[#888888] hover:text-white'
                  }`}
                >
                  Cadastro Rápido de Convidado
                </button>
              </div>
            </div>

            {showManualForm ? (
              /* Quick Manual Guest Form */
              <div className="space-y-4 py-2">
                <div>
                  <label className="text-xs font-semibold text-[#CCCCCC] block mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    value={quickManualName}
                    onChange={e => setQuickManualName(e.target.value)}
                    placeholder="Ex: Ana Clara Martins"
                    className="w-full px-3 py-2 bg-[#141414] border border-[#282828] rounded-lg text-white text-xs md:text-sm focus:outline-none focus:border-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-[#CCCCCC] block mb-1">
                      Telefone / WhatsApp *
                    </label>
                    <input
                      type="text"
                      value={quickManualPhone}
                      onChange={e => setQuickManualPhone(e.target.value)}
                      placeholder="(21) 99999-9999"
                      className="w-full px-3 py-2 bg-[#141414] border border-[#282828] rounded-lg text-white text-xs md:text-sm focus:outline-none focus:border-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#CCCCCC] block mb-1">
                      Categoria
                    </label>
                    <select
                      value={quickManualCategory}
                      onChange={e => setQuickManualCategory(e.target.value as ContactCategory)}
                      className="w-full px-3 py-2 bg-[#141414] border border-[#282828] rounded-lg text-white text-xs md:text-sm focus:outline-none cursor-pointer"
                    >
                      <option value="Novo contato">Convidado</option>
                      <option value="Visitante">Visitante</option>
                      <option value="Membro">Membro</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#CCCCCC] block mb-1">
                    Congregação
                  </label>
                  <select
                    value={quickManualCongregation}
                    onChange={e => setQuickManualCongregation(e.target.value as Congregation)}
                    className="w-full px-3 py-2 bg-[#141414] border border-[#282828] rounded-lg text-white text-xs md:text-sm focus:outline-none cursor-pointer"
                  >
                    <option value="Recreio">Recreio</option>
                    <option value="Curicica">Curicica</option>
                    <option value="Guaratiba">Guaratiba</option>
                  </select>
                </div>

                <div className="pt-3 flex justify-end gap-2">
                  <button
                    onClick={() => setShowManualForm(false)}
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#1C1C1C] text-[#AAAAAA] hover:text-white"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={handleAddManualGuest}
                    disabled={!quickManualName.trim() || !quickManualPhone.trim()}
                    className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-black disabled:opacity-50"
                  >
                    Inserir na Semana
                  </button>
                </div>
              </div>
            ) : (
              /* Search & Pick Existing Contacts */
              <div className="space-y-3 flex-1 flex flex-col min-h-0">
                <div className="flex items-center gap-2">
                  <div className="relative grow">
                    <Search className="w-4 h-4 text-[#777777] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={addSearchTerm}
                      onChange={e => setAddSearchTerm(e.target.value)}
                      placeholder="Pesquisar por nome ou telefone..."
                      className="w-full pl-9 pr-3 py-2 bg-[#141414] border border-[#282828] rounded-lg text-white text-xs focus:outline-none focus:border-white"
                    />
                  </div>

                  <select
                    value={addCategoryFilter}
                    onChange={e => setAddCategoryFilter(e.target.value as any)}
                    className="bg-[#141414] border border-[#282828] rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none cursor-pointer"
                  >
                    <option value="all">Todas</option>
                    <option value="Novo contato">Convidados</option>
                    <option value="Visitante">Visitantes</option>
                    <option value="Membro">Membros</option>
                  </select>
                </div>

                {/* Contacts List */}
                <div className="overflow-y-auto max-h-72 divide-y divide-[#1C1C1C] border border-[#222222] rounded-xl bg-[#080808] p-1">
                  {candidateContacts.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[#777777]">
                      Nenhum contato disponível para adicionar com os filtros atuais.
                    </div>
                  ) : (
                    candidateContacts.slice(0, 50).map(c => (
                      <div
                        key={c.id}
                        className="p-2.5 flex items-center justify-between hover:bg-[#141414] rounded-lg transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white text-xs">{c.name}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#1C1C1C] text-[#AAAAAA] border border-[#282828]">
                              {c.category === 'Novo contato' ? 'Convidado' : c.category}
                            </span>
                          </div>
                          <span className="text-[11px] text-[#777777] block mt-0.5">
                            {c.congregation} • {c.phone} • Resp: {c.assignedToName || 'Não atribuído'}
                          </span>
                        </div>
                        <button
                          onClick={() => handleAddExistingContact(c)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-black flex items-center gap-1 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Adicionar</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div className="pt-2 flex justify-between items-center text-xs text-[#777777]">
                  <span>Total disponíveis: {candidateContacts.length}</span>
                  <button
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#1C1C1C] text-white hover:bg-[#262626]"
                  >
                    Concluir
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Simple Plus icon helper if not imported
function Plus(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      viewBox="0 0 24 24"
      width={14}
      height={14}
      {...props}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}
