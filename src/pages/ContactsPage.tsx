import React, { useState, useMemo } from 'react';
import { useCRM } from '../context/CRMContext';
import { useAuth } from '../context/AuthContext';
import { Contact, ContactCategory, ContactStage } from '../types';
import { formatDateBR, getTaskDueState } from '../utils/date';
import { getWhatsAppUrl } from '../utils/phone';
import { exportContactsToCSV } from '../utils/export';
import {
  Search,
  Filter,
  Download,
  Plus,
  RotateCcw,
  MessageSquare,
  Clock,
  Send,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Archive,
  RefreshCw,
  Edit2,
  Trash2,
  Info,
  UserCheck,
  Users,
  CheckCheck,
  CalendarCheck,
  Crown,
} from 'lucide-react';
import { ConexaoLogo } from '../components/ConexaoLogo';
import { UniReinoBadge } from '../components/UniReinoBadge';
import { ConexaoColorBadge } from '../components/ConexaoColorBadge';
import { EnrollConexaoModal } from '../components/EnrollConexaoModal';
import { ConfirmadosSemanaPage } from './ConfirmadosSemanaPage';
import { ConexaoColor } from '../types';
import { CONEXAO_COLORS, CONEXAO_COLOR_CONFIGS } from '../utils/conexaoConfig';

interface ContactsPageProps {
  onOpenNewContact: () => void;
  onOpenContactDetails: (contact: Contact) => void;
  onOpenNewInteraction: (contact: Contact) => void;
  onOpenNewTask: (contact: Contact) => void;
  onOpenEditContact: (contact: Contact) => void;
  onRequestArchive: (contact: Contact) => void;
  onRequestRestore: (contact: Contact) => void;
  onRequestDeletePermanent: (contact: Contact) => void;
}

export const ContactsPage: React.FC<ContactsPageProps> = ({
  onOpenNewContact,
  onOpenContactDetails,
  onOpenNewInteraction,
  onOpenNewTask,
  onOpenEditContact,
  onRequestArchive,
  onRequestRestore,
  onRequestDeletePermanent,
}) => {
  const {
    filteredContacts,
    filterState,
    setFilterState,
    resetFilters,
    selectedCongregation,
    teamMembers,
    tasks,
    activeViewTab,
    setActiveViewTab,
    tabCounts,
    toggleWeeklyConfirmation,
    uniReinoStudents,
    conexaoMembers,
  } = useCRM();

  const { isDemoMode, currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';

  // Sorting & Pagination
  const [sortField, setSortField] = useState<'createdAt' | 'name' | 'congregation' | 'category' | 'stage'>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [filterOnlyUniReino, setFilterOnlyUniReino] = useState(false);
  const [filterOnlyConexao, setFilterOnlyConexao] = useState(false);
  const [filterConexaoColor, setFilterConexaoColor] = useState<ConexaoColor | 'all'>('all');
  const [isEnrollConexaoOpen, setIsEnrollConexaoOpen] = useState(false);
  const [conexaoTargetContact, setConexaoTargetContact] = useState<Contact | null>(null);
  const [demoNotice, setDemoNotice] = useState<string | null>(null);

  const itemsPerPage = 10;

  // Sorting
  const sortedContacts = useMemo(() => {
    let list = filteredContacts;
    if (filterOnlyUniReino) {
      list = list.filter(c => c.uniReino && c.uniReino.isEnrolled);
    }
    if (filterOnlyConexao) {
      list = list.filter(c => c.conexaoJovem);
      if (filterConexaoColor !== 'all') {
        list = list.filter(c => c.conexaoJovem?.color === filterConexaoColor);
      }
    }

    return [...list].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'createdAt') {
        comparison = a.createdAt.localeCompare(b.createdAt);
      } else if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name, 'pt-BR');
      } else if (sortField === 'congregation') {
        comparison = a.congregation.localeCompare(b.congregation);
      } else if (sortField === 'category') {
        comparison = a.category.localeCompare(b.category);
      } else if (sortField === 'stage') {
        comparison = a.stage.localeCompare(b.stage);
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredContacts, filterOnlyUniReino, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedContacts.length / itemsPerPage));
  const paginatedContacts = sortedContacts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleExportCSV = () => {
    exportContactsToCSV(sortedContacts, selectedCongregation, filterState);
  };

  const handleWhatsApp = (phone: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDemoMode) {
      setDemoNotice('WhatsApp externo desativado no modo demonstração para proteção de números reais.');
      setTimeout(() => setDemoNotice(null), 4000);
      return;
    }
    window.open(getWhatsAppUrl(phone), '_blank', 'noopener,noreferrer');
  };

  const getNextReturnDate = (contactId: string) => {
    const contactTasks = tasks
      .filter(t => t.contactId === contactId && t.status === 'pending')
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    return contactTasks[0]?.dueDate;
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#1F1F1F]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white font-heading tracking-tight">
            Gestão de Contatos & Membros
          </h1>
          <p className="text-xs sm:text-sm text-[#888888] mt-0.5">
            Total de {filteredContacts.length} {filteredContacts.length === 1 ? 'registro encontrado' : 'registros encontrados'}
            {filterState.showArchived && ' (Visualizando Arquivados)'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#141414] hover:bg-[#1A1A1A] border border-[#2B2B2B] rounded-lg text-xs font-medium text-white transition-colors"
            title="Exportar registros filtrados para CSV compatível com Excel"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={onOpenNewContact}
            className="flex items-center gap-1.5 px-4 py-2 bg-white text-black font-semibold text-xs sm:text-sm rounded-lg hover:bg-neutral-200 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Contato</span>
          </button>
        </div>
      </div>

      {demoNotice && (
        <div className="p-3 bg-[#18150D] border border-[#443818] rounded-xl text-xs text-amber-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{demoNotice}</span>
          </div>
          <button onClick={() => setDemoNotice(null)} className="text-amber-400 hover:text-white font-bold ml-2">
            ×
          </button>
        </div>
      )}

      {/* Congregation Sub-Tabs: Todos, Membros, Convidados, Confirmados da Semana */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-[#1E1E1E]">
        <button
          onClick={() => {
            setActiveViewTab('all');
            setCurrentPage(1);
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
            activeViewTab === 'all'
              ? 'bg-[#1C1C1C] text-white border border-[#333333]'
              : 'text-[#888888] hover:text-white hover:bg-[#121212]'
          }`}
        >
          <span>Todos</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#141414] text-[#CCCCCC] border border-[#2B2B2B]">
            {tabCounts.all}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveViewTab('membros');
            setCurrentPage(1);
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
            activeViewTab === 'membros'
              ? 'bg-[#1C1C1C] text-white border border-[#333333]'
              : 'text-[#888888] hover:text-white hover:bg-[#121212]'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>Membros</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#141414] text-[#CCCCCC] border border-[#2B2B2B]">
            {tabCounts.membros}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveViewTab('convidados');
            setCurrentPage(1);
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
            activeViewTab === 'convidados'
              ? 'bg-[#1C1C1C] text-white border border-[#333333]'
              : 'text-[#888888] hover:text-white hover:bg-[#121212]'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Convidados & Visitantes</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#141414] text-[#CCCCCC] border border-[#2B2B2B]">
            {tabCounts.convidados}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveViewTab('confirmados');
            setCurrentPage(1);
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
            activeViewTab === 'confirmados'
              ? 'bg-white text-black font-bold shadow-sm'
              : 'text-[#888888] hover:text-white hover:bg-[#121212]'
          }`}
        >
          <CheckCheck className="w-3.5 h-3.5" />
          <span>Confirmados da Semana</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeViewTab === 'confirmados'
                ? 'bg-black text-white'
                : 'bg-neutral-800 text-white border border-neutral-700'
            }`}
          >
            {tabCounts.confirmados}
          </span>
        </button>
      </div>

      {activeViewTab === 'confirmados' ? (
        <ConfirmadosSemanaPage
          onOpenContactDetails={onOpenContactDetails}
          onOpenNewContact={onOpenNewContact}
        />
      ) : (
        <>
      {/* Search and Filters Bar */}
      <div className="p-4 bg-[#0B0B0B] border border-[#262626] rounded-xl space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Input */}
          <div className="relative grow">
            <Search className="w-4 h-4 text-[#777777] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={filterState.search}
              onChange={e => {
                setFilterState(prev => ({ ...prev, search: e.target.value }));
                setCurrentPage(1);
              }}
              placeholder="Buscar por nome ou telefone..."
              className="w-full pl-9 pr-3 py-2 bg-[#141414] border border-[#262626] rounded-lg text-white text-xs sm:text-sm focus:outline-none focus:border-white transition-colors"
            />
          </div>

          {/* Quick Filter Toggles */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowFiltersPanel(!showFiltersPanel)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                showFiltersPanel ||
                filterState.category !== 'all' ||
                filterState.stage !== 'all' ||
                filterState.assignedTo !== 'all' ||
                filterState.startDate ||
                filterState.endDate ||
                filterState.showArchived
                  ? 'bg-white text-black border-white'
                  : 'bg-[#141414] text-[#CCCCCC] border-[#2B2B2B] hover:text-white'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filtros Avançados</span>
            </button>

            <button
              onClick={() => {
                setFilterOnlyUniReino(!filterOnlyUniReino);
                setCurrentPage(1);
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border transition-all ${
                filterOnlyUniReino
                  ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-black border-amber-300 shadow-md shadow-amber-500/25 font-black'
                  : 'bg-[#141414] text-amber-300/90 border-[#2B2B2B] hover:text-white hover:border-amber-500/40'
              }`}
              title="Filtrar membros que possuem o selo dourado UN (Uni Reino)"
            >
              <Crown className="w-3.5 h-3.5 fill-current" />
              <span>Selo UN</span>
              <span
                className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${
                  filterOnlyUniReino
                    ? 'bg-black text-amber-300'
                    : 'bg-amber-500/20 text-amber-300'
                }`}
              >
                {uniReinoStudents.length}
              </span>
            </button>

            <button
              onClick={() => {
                setFilterOnlyConexao(!filterOnlyConexao);
                setCurrentPage(1);
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border transition-all ${
                filterOnlyConexao
                  ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-black border-amber-400 shadow-md shadow-amber-500/25 font-black'
                  : 'bg-[#141414] text-amber-400 border-[#2B2B2B] hover:text-white hover:border-amber-500/40'
              }`}
              title="Filtrar membros e contatos que fazem parte do Conexão Jovem"
            >
              <ConexaoLogo size="xs" />
              <span>Conexão Jovem</span>
              <span
                className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${
                  filterOnlyConexao
                    ? 'bg-black text-amber-300'
                    : 'bg-amber-500/20 text-amber-300'
                }`}
              >
                {conexaoMembers.length}
              </span>
            </button>

            {(filterState.search ||
              filterState.category !== 'all' ||
              filterState.stage !== 'all' ||
              filterState.assignedTo !== 'all' ||
              filterState.startDate ||
              filterState.endDate ||
              filterState.showArchived) && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#141414] hover:bg-[#1A1A1A] border border-[#2B2B2B] rounded-lg text-xs text-[#999999] hover:text-white transition-colors"
                title="Limpar todos os filtros"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Limpar filtros</span>
              </button>
            )}
          </div>
        </div>

        {/* Expandable Advanced Filters Panel */}
        {showFiltersPanel && (
          <div className="pt-3 border-t border-[#1C1C1C] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Categoria */}
            <div>
              <label className="block text-[11px] font-medium text-[#AAAAAA] mb-1">
                Categoria
              </label>
              <select
                value={filterState.category}
                onChange={e => {
                  setFilterState(prev => ({ ...prev, category: e.target.value as any }));
                  setCurrentPage(1);
                }}
                className="w-full px-2.5 py-1.5 bg-[#141414] border border-[#262626] rounded-lg text-white text-xs focus:outline-none focus:border-white"
              >
                <option value="all">Todas as categorias</option>
                <option value="Novo contato">Novo contato</option>
                <option value="Visitante">Visitante</option>
                <option value="Membro">Membro</option>
              </select>
            </div>

            {/* Etapa */}
            <div>
              <label className="block text-[11px] font-medium text-[#AAAAAA] mb-1">
                Etapa de Acompanhamento
              </label>
              <select
                value={filterState.stage}
                onChange={e => {
                  setFilterState(prev => ({ ...prev, stage: e.target.value as any }));
                  setCurrentPage(1);
                }}
                className="w-full px-2.5 py-1.5 bg-[#141414] border border-[#262626] rounded-lg text-white text-xs focus:outline-none focus:border-white"
              >
                <option value="all">Todas as etapas</option>
                <option value="Aguardando primeiro contato">Aguardando primeiro contato</option>
                <option value="1º contato feito">1º contato feito</option>
                <option value="Em acompanhamento">Em acompanhamento</option>
                <option value="Integrado">Integrado</option>
                <option value="Acompanhamento pausado">Acompanhamento pausado</option>
              </select>
            </div>

            {/* Responsável */}
            <div>
              <label className="block text-[11px] font-medium text-[#AAAAAA] mb-1">
                Responsável
              </label>
              <select
                value={filterState.assignedTo}
                onChange={e => {
                  setFilterState(prev => ({ ...prev, assignedTo: e.target.value }));
                  setCurrentPage(1);
                }}
                className="w-full px-2.5 py-1.5 bg-[#141414] border border-[#262626] rounded-lg text-white text-xs focus:outline-none focus:border-white"
              >
                <option value="all">Todos os responsáveis</option>
                {teamMembers.map(u => (
                  <option key={u.uid} value={u.uid}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Data Inicial */}
            <div>
              <label className="block text-[11px] font-medium text-[#AAAAAA] mb-1">
                Cadastrado a partir de
              </label>
              <input
                type="date"
                value={filterState.startDate || ''}
                onChange={e => {
                  setFilterState(prev => ({ ...prev, startDate: e.target.value }));
                  setCurrentPage(1);
                }}
                className="w-full px-2.5 py-1.5 bg-[#141414] border border-[#262626] rounded-lg text-white text-xs focus:outline-none focus:border-white"
              />
            </div>

            {/* Data Final & Toggle Arquivados */}
            <div>
              <label className="block text-[11px] font-medium text-[#AAAAAA] mb-1">
                Cadastrado até
              </label>
              <input
                type="date"
                value={filterState.endDate || ''}
                onChange={e => {
                  setFilterState(prev => ({ ...prev, endDate: e.target.value }));
                  setCurrentPage(1);
                }}
                className="w-full px-2.5 py-1.5 bg-[#141414] border border-[#262626] rounded-lg text-white text-xs focus:outline-none focus:border-white"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-5 pt-2 flex items-center justify-between border-t border-[#181818]">
              <label className="flex items-center gap-2 text-xs text-[#CCCCCC] cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterState.showArchived}
                  onChange={e => {
                    setFilterState(prev => ({ ...prev, showArchived: e.target.checked }));
                    setCurrentPage(1);
                  }}
                  className="rounded bg-[#1A1A1A] border-[#333333] text-white focus:ring-0"
                />
                <span>Visualizar contatos arquivados</span>
              </label>
            </div>
          </div>
        )}

        {filterOnlyConexao && (
          <div className="pt-2.5 border-t border-[#1F1F1F] flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-zinc-400 font-semibold mr-1 flex items-center gap-1">
              <ConexaoLogo size="xs" />
              <span>Filtrar por Cor da Equipe:</span>
            </span>
            <button
              onClick={() => {
                setFilterConexaoColor('all');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                filterConexaoColor === 'all'
                  ? 'bg-white text-black'
                  : 'bg-[#161616] text-zinc-400 hover:text-white border border-[#2B2B2B]'
              }`}
            >
              Todas as 6 Cores ({conexaoMembers.length})
            </button>
            {CONEXAO_COLORS.map(cId => {
              const cfg = CONEXAO_COLOR_CONFIGS[cId];
              const isPicked = filterConexaoColor === cId;
              const count = filteredContacts.filter(c => c.conexaoJovem?.color === cId).length;
              return (
                <button
                  key={cId}
                  onClick={() => {
                    setFilterConexaoColor(cId);
                    setCurrentPage(1);
                  }}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                    isPicked
                      ? 'bg-zinc-800 text-white border-2'
                      : 'bg-[#141414] text-zinc-400 hover:text-white border border-[#262626]'
                  }`}
                  style={{ borderColor: isPicked ? cfg.hex : undefined }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.hex }} />
                  <span className="capitalize">{cfg.name}</span>
                  <span className="text-[9px] opacity-75">({count})</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Desktop Table View (>= lg screens) */}
      <div className="hidden lg:block bg-[#0B0B0B] border border-[#262626] rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0F0F0F] border-b border-[#262626] text-[#888888] uppercase tracking-wider font-semibold">
              <tr>
                <th
                  onClick={() => toggleSort('createdAt')}
                  className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Cadastro</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('name')}
                  className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Nome Completo</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4">Telefone / WhatsApp</th>
                <th
                  onClick={() => toggleSort('congregation')}
                  className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Congregação</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('category')}
                  className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Categoria</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('stage')}
                  className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Etapa</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4">Responsável</th>
                <th className="py-3 px-4">Próximo Retorno</th>
                <th className="py-3 px-4">Culto da Semana</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A1A1A]">
              {paginatedContacts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-[#777777]">
                    Nenhum contato encontrado com os critérios selecionados.
                  </td>
                </tr>
              ) : (
                paginatedContacts.map(contact => {
                  const nextDue = getNextReturnDate(contact.id);
                  const state = nextDue ? getTaskDueState(nextDue) : null;

                  return (
                    <tr
                      key={contact.id}
                      onClick={() => onOpenContactDetails(contact)}
                      className={`hover:bg-[#121212] transition-colors cursor-pointer group ${
                        contact.isArchived ? 'opacity-60 bg-[#080808]' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 text-[#888888] whitespace-nowrap">
                        {formatDateBR(contact.createdAt)}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-white">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span>{contact.name}</span>
                          {contact.uniReino && contact.uniReino.isEnrolled && (
                            <UniReinoBadge
                              enrollment={contact.uniReino}
                              semester={contact.uniReino.semester}
                              size="xs"
                              showSemester={true}
                            />
                          )}
                          {contact.isArchived && (
                            <span className="text-[10px] text-neutral-400 bg-neutral-800 px-1.5 rounded">
                              Arquivado
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-[#CCCCCC] whitespace-nowrap">
                        {contact.phone}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#141414] text-white border border-[#2B2B2B]">
                          {contact.congregation}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-xs text-[#DDDDDD]">{contact.category}</span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-xs text-[#AAAAAA]">{contact.stage}</span>
                      </td>
                      <td className="py-3.5 px-4 text-[#888888] whitespace-nowrap">
                        {contact.assignedToName || 'Não atribuído'}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {nextDue ? (
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              state === 'overdue'
                                ? 'bg-neutral-800 text-white border border-neutral-600'
                                : state === 'today'
                                ? 'bg-white text-black'
                                : 'bg-[#161616] text-[#AAAAAA]'
                            }`}
                          >
                            {formatDateBR(nextDue)}
                          </span>
                        ) : (
                          <span className="text-[#666666]">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => toggleWeeklyConfirmation(contact.id)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-colors ${
                            contact.confirmedThisWeek
                              ? 'bg-white text-black border border-white shadow-sm'
                              : 'bg-[#141414] hover:bg-[#1C1C1C] text-[#888888] hover:text-white border border-[#262626]'
                          }`}
                          title={
                            contact.confirmedThisWeek
                              ? 'Presença confirmada no culto (clique para alternar)'
                              : 'Clique para confirmar presença no próximo culto'
                          }
                        >
                          {contact.confirmedThisWeek ? (
                            <>
                              <CheckCheck className="w-3.5 h-3.5 text-black" />
                              <span>Confirmado</span>
                            </>
                          ) : (
                            <>
                              <CalendarCheck className="w-3.5 h-3.5 text-[#777777]" />
                              <span>Confirmar</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={e => handleWhatsApp(contact.phone, e)}
                            className="p-1.5 text-[#888888] hover:text-white rounded hover:bg-[#1A1A1A] transition-colors"
                            title="Abrir WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onOpenNewInteraction(contact)}
                            className="p-1.5 text-[#888888] hover:text-white rounded hover:bg-[#1A1A1A] transition-colors"
                            title="Registrar interação"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onOpenNewTask(contact)}
                            className="p-1.5 text-[#888888] hover:text-white rounded hover:bg-[#1A1A1A] transition-colors"
                            title="Agendar retorno"
                          >
                            <Clock className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setConexaoTargetContact(contact);
                              setIsEnrollConexaoOpen(true);
                            }}
                            className={`p-1.5 rounded transition-colors ${
                              contact.conexaoJovem
                                ? 'text-amber-400 hover:text-amber-300 hover:bg-[#1A1A1A]'
                                : 'text-[#666666] hover:text-amber-400 hover:bg-[#1A1A1A]'
                            }`}
                            title={contact.conexaoJovem ? 'Gerenciar equipe no Conexão Jovem' : 'Vincular ao Conexão Jovem'}
                          >
                            <ConexaoLogo size="xs" />
                          </button>
                          <button
                            onClick={() => onOpenEditContact(contact)}
                            className="p-1.5 text-[#888888] hover:text-white rounded hover:bg-[#1A1A1A] transition-colors"
                            title="Editar cadastro"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
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

      {/* Mobile & Tablet Card View (< lg screens) */}
      <div className="lg:hidden space-y-3">
        {paginatedContacts.length === 0 ? (
          <div className="py-12 px-4 text-center bg-[#0B0B0B] border border-[#262626] rounded-xl text-xs text-[#777777] leading-relaxed">
            Nenhum contato encontrado com os critérios selecionados.
          </div>
        ) : (
          paginatedContacts.map(contact => {
            const nextDue = getNextReturnDate(contact.id);
            const state = nextDue ? getTaskDueState(nextDue) : null;

            return (
              <div
                key={contact.id}
                onClick={() => onOpenContactDetails(contact)}
                className={`p-4 bg-[#0B0B0B] border border-[#262626] rounded-xl space-y-3 cursor-pointer ${
                  contact.isArchived ? 'opacity-60 bg-[#080808]' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="text-sm font-semibold text-white">
                        {contact.name}
                      </h3>
                      {contact.uniReino && contact.uniReino.isEnrolled && (
                        <UniReinoBadge
                          enrollment={contact.uniReino}
                          semester={contact.uniReino.semester}
                          size="xs"
                        />
                      )}
                    </div>
                    <p className="text-xs text-[#888888] mt-0.5">
                      {contact.phone}
                    </p>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 bg-[#141414] text-white border border-[#2B2B2B] rounded">
                    {contact.congregation}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-[#1C1C1C]">
                  <div>
                    <span className="text-[10px] text-[#777777] block">Categoria</span>
                    <span className="text-white font-medium">{contact.category}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#777777] block">Etapa</span>
                    <span className="text-white font-medium">{contact.stage}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#777777] block">Responsável</span>
                    <span className="text-[#AAAAAA]">{contact.assignedToName || 'Não atribuído'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#777777] block">Próximo Retorno</span>
                    {nextDue ? (
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.2 rounded inline-block ${
                          state === 'overdue'
                            ? 'bg-neutral-800 text-white'
                            : state === 'today'
                            ? 'bg-white text-black'
                            : 'text-white'
                        }`}
                      >
                        {formatDateBR(nextDue)}
                      </span>
                    ) : (
                      <span className="text-[#666666]">-</span>
                    )}
                  </div>
                </div>

                {/* Mobile Quick Actions */}
                <div
                  className="flex items-center justify-between pt-2 border-t border-[#1C1C1C] flex-wrap gap-2"
                  onClick={e => e.stopPropagation()}
                >
                  <button
                    onClick={() => toggleWeeklyConfirmation(contact.id)}
                    className={`px-2 py-1 rounded text-[10px] font-semibold flex items-center gap-1 transition-colors ${
                      contact.confirmedThisWeek
                        ? 'bg-white text-black'
                        : 'bg-[#141414] text-[#888888] border border-[#2B2B2B]'
                    }`}
                  >
                    {contact.confirmedThisWeek ? (
                      <>
                        <CheckCheck className="w-3 h-3 text-black" />
                        <span>Confirmado</span>
                      </>
                    ) : (
                      <>
                        <CalendarCheck className="w-3 h-3" />
                        <span>Confirmar culto</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      onClick={e => handleWhatsApp(contact.phone, e)}
                      className="p-1.5 text-[#888888] hover:text-white bg-[#141414] rounded border border-[#262626]"
                      title="WhatsApp"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onOpenNewInteraction(contact)}
                      className="p-1.5 text-[#888888] hover:text-white bg-[#141414] rounded border border-[#262626]"
                      title="Registrar interação"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onOpenNewTask(contact)}
                      className="p-1.5 text-[#888888] hover:text-white bg-[#141414] rounded border border-[#262626]"
                      title="Agendar retorno"
                    >
                      <Clock className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setConexaoTargetContact(contact);
                        setIsEnrollConexaoOpen(true);
                      }}
                      className={`p-1.5 bg-[#141414] rounded border border-[#262626] transition-colors ${
                        contact.conexaoJovem
                          ? 'text-amber-400 hover:text-amber-300'
                          : 'text-[#888888] hover:text-amber-400'
                      }`}
                      title={contact.conexaoJovem ? 'Gerenciar equipe no Conexão Jovem' : 'Vincular ao Conexão Jovem'}
                    >
                      <ConexaoLogo size="xs" />
                    </button>
                    <button
                      onClick={() => onOpenEditContact(contact)}
                      className="p-1.5 text-[#888888] hover:text-white bg-[#141414] rounded border border-[#262626]"
                      title="Editar"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 text-xs text-[#888888]">
          <span>
            Página {currentPage} de {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg bg-[#0B0B0B] border border-[#262626] text-white disabled:opacity-30 hover:border-[#383838] transition-colors"
            >
              Anterior
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg bg-[#0B0B0B] border border-[#262626] text-white disabled:opacity-30 hover:border-[#383838] transition-colors"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
        </>
      )}

      {/* Enroll in Conexão Jovem Modal */}
      <EnrollConexaoModal
        isOpen={isEnrollConexaoOpen}
        onClose={() => {
          setIsEnrollConexaoOpen(false);
          setConexaoTargetContact(null);
        }}
        contactToEdit={conexaoTargetContact}
      />
    </div>
  );
};
