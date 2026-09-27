import React, { useState, useMemo, useEffect } from 'react';
import { useCRM } from '../context/CRMContext';
import { useAuth } from '../context/AuthContext';
import {
  Contact,
  ConexaoColor,
  ConexaoParticipant,
  ConexaoRole,
  ConexaoTeamGoal,
  ConexaoMonthlyResult,
  CongregationFilter,
  ConexaoFunnelStage,
} from '../types';
import {
  CONEXAO_COLORS,
  CONEXAO_COLOR_CONFIGS,
  CONEXAO_ROLE_META,
  getConexaoColorConfig,
} from '../utils/conexaoConfig';
import { ConexaoLogo } from '../components/ConexaoLogo';
import { ConexaoColorBadge } from '../components/ConexaoColorBadge';
import { ConexaoParticipantModal } from '../components/ConexaoParticipantModal';
import { ConexaoColorReportModal } from '../components/ConexaoColorReportModal';
import { ConexaoGoalModal } from '../components/ConexaoGoalModal';
import { EnrollConexaoModal } from '../components/EnrollConexaoModal';
import { ConexaoFunnelKanban } from '../components/ConexaoFunnelKanban';
import { ConexaoFunnelChart } from '../components/ConexaoFunnelChart';
import { ConexaoInteractionModal, FUNNEL_STAGES } from '../components/ConexaoInteractionModal';
import { formatDateBR } from '../utils/date';
import { getWhatsAppUrl, normalizePhone } from '../utils/phone';
import {
  Sparkles,
  Users,
  Shield,
  Crown,
  Search,
  Filter,
  Plus,
  Printer,
  CheckCircle2,
  Clock,
  Phone,
  MessageSquare,
  Award,
  ChevronRight,
  TrendingUp,
  Target,
  ArrowRight,
  Trash2,
  Edit,
  ExternalLink,
  User,
  UserPlus,
  UserCheck,
  Lock,
  BarChart3,
  Calendar,
  AlertCircle,
  Layers,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

interface ConexaoJovemPageProps {
  onOpenContactDetails?: (contact: Contact) => void;
}

type ConexaoViewMode = ConexaoColor | 'geral';
type ColorSubTab = 'funil' | 'grafico_funil' | 'convidados' | 'bases' | 'membros' | 'resultados' | 'metas' | 'relatorio';
type GeralSubTab = 'funil_geral' | 'grafico_funil_geral' | 'comparativo' | 'membros_igreja' | 'metas_gerais' | 'equipes';

export type UnifiedConexaoParticipant = ConexaoParticipant & {
  churchContact?: Contact;
};

export const ConexaoJovemPage: React.FC<ConexaoJovemPageProps> = ({ onOpenContactDetails }) => {
  const {
    contacts,
    conexaoParticipants,
    selectedCongregation,
    toggleConexaoCultoConfirmation,
    deleteConexaoParticipant,
    enrollInConexao,
    conexaoGoals,
    updateConexaoGoal,
    conexaoMonthlyResults,
    updateConexaoMonthlyResult,
  } = useCRM();
  const { currentUser } = useAuth();

  // Role permissions: Team Leader is restricted strictly to their assigned team
  const isTeamLeader = currentUser?.role === 'lider_equipe';
  const assignedTeamColor: ConexaoColor = (currentUser?.assignedTeam as ConexaoColor) || 'verde';
  const isAdminOrConexaoLeader = currentUser?.role === 'admin' || currentUser?.role === 'lider_conexao';

  // Active view: either a specific color team (e.g. 'verde') or 'geral' (Coordenação Geral)
  const [activeColorView, setActiveColorView] = useState<ConexaoViewMode>(() => {
    if (isTeamLeader) return assignedTeamColor;
    return 'verde';
  });

  // Enforce team leader restriction if logged in as team leader
  useEffect(() => {
    if (isTeamLeader && activeColorView !== assignedTeamColor) {
      setActiveColorView(assignedTeamColor);
    }
  }, [isTeamLeader, assignedTeamColor, activeColorView]);

  // Sub-tab inside a color workspace - default to 4-stage funnel
  const [activeSubTab, setActiveSubTab] = useState<ColorSubTab>('funil');

  // Sub-tab inside Visão Geral - default to general funnel
  const [activeGeralSubTab, setActiveGeralSubTab] = useState<GeralSubTab>('funil_geral');

  // Metric selector for comparative all-teams chart
  const [comparativeMetric, setComparativeMetric] = useState<'guests' | 'attendance' | 'newMembers'>('guests');

  // Filters & search
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | ConexaoRole>('all');
  const [churchMemberFilter, setChurchMemberFilter] = useState<'all' | 'membros_igreja' | 'visitantes'>('all');
  const [statusPresenceFilter, setStatusPresenceFilter] = useState<'all' | 'confirmado' | 'pendente'>('all');
  const [geralChurchMemberTeamFilter, setGeralChurchMemberTeamFilter] = useState<ConexaoColor | 'all'>('all');

  // Modals state
  const [isParticipantModalOpen, setIsParticipantModalOpen] = useState(false);
  const [participantToEdit, setParticipantToEdit] = useState<ConexaoParticipant | null>(null);
  const [modalDefaultColor, setModalDefaultColor] = useState<ConexaoColor>('verde');
  const [modalDefaultRole, setModalDefaultRole] = useState<ConexaoRole>('convidado');
  const [modalDefaultFunnelStage, setModalDefaultFunnelStage] = useState<ConexaoFunnelStage>('novo_contato');

  // Interactive Timeline/History modal for specific contact
  const [interactionModalParticipant, setInteractionModalParticipant] = useState<ConexaoParticipant | null>(null);

  // Modal for linking church members from main panel into a color team
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [enrollModalRole, setEnrollModalRole] = useState<ConexaoRole>('membro');

  // Modal for editing team goals (exclusivo adm/master)
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [goalModalColor, setGoalModalColor] = useState<ConexaoColor>('verde');

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportTargetColor, setReportTargetColor] = useState<ConexaoColor>('verde');

  // Feedback notifications
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  // Unify conexaoParticipants with church contacts (contacts that have conexaoJovem)
  const unifiedParticipants = useMemo(() => {
    const list: UnifiedConexaoParticipant[] = [];
    const seenContactIds = new Set<string>();
    const seenPhones = new Set<string>();

    // 1. From conexaoParticipants
    (conexaoParticipants || []).forEach(p => {
      const normPhone = p.phone ? normalizePhone(p.phone) : '';
      const churchContact = contacts.find(
        c => c.id === p.contactId || (c.phone && normalizePhone(c.phone) === normPhone)
      );
      if (churchContact) {
        seenContactIds.add(churchContact.id);
      }
      if (normPhone) {
        seenPhones.add(normPhone);
      }
      list.push({
        ...p,
        churchContact,
      });
    });

    // 2. From contacts with conexaoJovem not yet in conexaoParticipants
    (contacts || []).forEach(c => {
      if (!c.conexaoJovem || c.isArchived) return;
      const normPhone = c.phone ? normalizePhone(c.phone) : '';
      if (seenContactIds.has(c.id) || (normPhone && seenPhones.has(normPhone))) return;

      const dateStr = c.createdAt ? c.createdAt.split('T')[0].split('-').reverse().slice(0, 2).join('/') : '12/09';
      list.push({
        id: `cx-ct-${c.id}`,
        name: c.name,
        phone: c.phone,
        color: c.conexaoJovem.color,
        role: c.conexaoJovem.role,
        congregation: c.congregation,
        baseName: c.conexaoJovem.baseName,
        confirmedNextCulto: c.confirmedThisWeek || false,
        contactId: c.id,
        churchContact: c,
        funnelStage: c.conexaoJovem.role === 'convidado' ? (c.confirmedThisWeek ? 'em_acompanhamento' : 'novo_contato') : 'integrado',
        responsibleName: c.conexaoJovem.baseName ? `Base ${c.conexaoJovem.baseName}` : 'Equipe Geral',
        lastInteraction: `${dateStr} - Novo contato`,
        nextAction: 'Acompanhar integração na equipe',
        interactions: [
          {
            id: `cx-int-${c.id}`,
            date: dateStr,
            situation: 'Novo contato',
            notes: 'Vinculado da membresia geral',
            registeredBy: 'Sistema',
            createdAt: c.createdAt,
          },
        ],
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      });
    });

    return list;
  }, [conexaoParticipants, contacts]);

  // Group participants by color
  const colorStats = useMemo(() => {
    const stats: Record<
      ConexaoColor,
      {
        total: number;
        leader?: UnifiedConexaoParticipant;
        bases: UnifiedConexaoParticipant[];
        members: UnifiedConexaoParticipant[];
        guests: UnifiedConexaoParticipant[];
        confirmedGuests: number;
        churchMembers: UnifiedConexaoParticipant[]; // Membros da igreja dentro desta equipe
      }
    > = {
      verde: { total: 0, bases: [], members: [], guests: [], confirmedGuests: 0, churchMembers: [] },
      vermelho: { total: 0, bases: [], members: [], guests: [], confirmedGuests: 0, churchMembers: [] },
      laranja: { total: 0, bases: [], members: [], guests: [], confirmedGuests: 0, churchMembers: [] },
      azul: { total: 0, bases: [], members: [], guests: [], confirmedGuests: 0, churchMembers: [] },
      amarelo: { total: 0, bases: [], members: [], guests: [], confirmedGuests: 0, churchMembers: [] },
      turquesa: { total: 0, bases: [], members: [], guests: [], confirmedGuests: 0, churchMembers: [] },
    };

    unifiedParticipants.forEach(p => {
      const c = stats[p.color];
      if (!c) return;
      c.total += 1;

      // Check if this participant is a confirmed church member
      const isChurchMember = p.churchContact?.category === 'Membro' || p.role === 'lider' || p.role === 'sublider_base' || p.role === 'membro';
      if (isChurchMember && (p.churchContact?.category === 'Membro' || p.role === 'membro' || p.role === 'lider' || p.role === 'sublider_base')) {
        c.churchMembers.push(p);
      }

      if (p.role === 'lider') {
        c.leader = p;
      } else if (p.role === 'sublider_base') {
        c.bases.push(p);
      } else if (p.role === 'membro') {
        c.members.push(p);
      } else if (p.role === 'convidado') {
        c.guests.push(p);
        if (p.confirmedNextCulto) {
          c.confirmedGuests += 1;
        }
      }
    });

    return stats;
  }, [unifiedParticipants]);

  // Overall totals across Conexão (or strictly for assigned team if team leader)
  const overallTotals = useMemo(() => {
    const list = isTeamLeader
      ? unifiedParticipants.filter(p => p.color === assignedTeamColor)
      : unifiedParticipants;
    const totalParticipants = list.length;
    const totalBases = list.filter(p => p.role === 'sublider_base').length;
    const totalMembers = list.filter(p => p.role === 'membro').length;
    const totalGuests = list.filter(p => p.role === 'convidado').length;
    const confirmedGuests = list.filter(p => p.role === 'convidado' && p.confirmedNextCulto).length;
    const totalChurchMembers = list.filter(
      p => p.churchContact?.category === 'Membro' || p.role === 'membro' || p.role === 'lider' || p.role === 'sublider_base'
    ).length;

    return {
      totalParticipants,
      totalBases,
      totalMembers,
      totalGuests,
      confirmedGuests,
      totalChurchMembers,
    };
  }, [unifiedParticipants, isTeamLeader, assignedTeamColor]);

  // Current active color config (if not in 'geral')
  const currentColorConfig = useMemo(() => {
    if (activeColorView === 'geral') return null;
    return getConexaoColorConfig(activeColorView);
  }, [activeColorView]);

  // Filtered list based on active color and local search/subtab
  const displayedParticipants = useMemo(() => {
    let list = unifiedParticipants;

    // Filter by color if not 'geral'
    if (activeColorView !== 'geral') {
      list = list.filter(p => p.color === activeColorView);

      // Filter by subtab inside color view
      if (activeSubTab === 'convidados') {
        list = list.filter(p => p.role === 'convidado');
      } else if (activeSubTab === 'bases') {
        list = list.filter(p => p.role === 'sublider_base');
      } else if (activeSubTab === 'membros') {
        list = list.filter(p => p.role === 'membro');
      }
    } else {
      // In 'geral', if user selected role filter
      if (roleFilter !== 'all') {
        list = list.filter(p => p.role === roleFilter);
      }
    }

    // Filter by confirmation status
    if (statusPresenceFilter !== 'all') {
      if (statusPresenceFilter === 'confirmado') {
        list = list.filter(p => p.confirmedNextCulto);
      } else {
        list = list.filter(p => !p.confirmedNextCulto);
      }
    }

    // Filter by church member status
    if (churchMemberFilter !== 'all') {
      if (churchMemberFilter === 'membros_igreja') {
        list = list.filter(p => p.churchContact?.category === 'Membro' || p.role === 'membro');
      } else {
        list = list.filter(p => p.role === 'convidado');
      }
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => {
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesPhone = p.phone.includes(q);
        const matchesBase = p.baseName?.toLowerCase().includes(q) || false;
        const matchesInvited = p.invitedByName?.toLowerCase().includes(q) || false;
        return matchesName || matchesPhone || matchesBase || matchesInvited;
      });
    }

    return list;
  }, [
    unifiedParticipants,
    activeColorView,
    activeSubTab,
    roleFilter,
    statusPresenceFilter,
    churchMemberFilter,
    searchQuery,
  ]);

  // All church members inside all teams for the 'membros_igreja' tab
  const allChurchMembers = useMemo(() => {
    return unifiedParticipants.filter(p => {
      const isMember = p.churchContact?.category === 'Membro' || p.role === 'membro' || p.role === 'lider' || p.role === 'sublider_base';
      if (!isMember) return false;
      if (geralChurchMemberTeamFilter !== 'all' && p.color !== geralChurchMemberTeamFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.phone.includes(q) ||
          p.congregation.toLowerCase().includes(q) ||
          (p.baseName && p.baseName.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [unifiedParticipants, geralChurchMemberTeamFilter, searchQuery]);

  // Comparative data for all 6 teams (Janeiro a Dezembro)
  const comparativeMonthlyData = useMemo(() => {
    const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return MONTHS.map((monthKey, idx) => {
      const row: Record<string, any> = { monthKey, monthIndex: idx };
      let monthTotal = 0;
      CONEXAO_COLORS.forEach(color => {
        const results = conexaoMonthlyResults[color] || [];
        const monthItem = results[idx];
        const val = monthItem ? monthItem[comparativeMetric] || 0 : 0;
        row[color] = val;
        monthTotal += val;
      });
      row.total = monthTotal;
      return row;
    });
  }, [conexaoMonthlyResults, comparativeMetric]);

  // Handlers
  const handleOpenAddParticipant = (
    color: ConexaoColor = activeColorView !== 'geral' ? activeColorView : 'verde',
    role: ConexaoRole = 'convidado',
    stage: ConexaoFunnelStage = 'novo_contato'
  ) => {
    setParticipantToEdit(null);
    setModalDefaultColor(color);
    setModalDefaultRole(role);
    setModalDefaultFunnelStage(stage);
    setIsParticipantModalOpen(true);
  };

  const handleEditParticipant = (participant: ConexaoParticipant) => {
    setParticipantToEdit(participant);
    setModalDefaultColor(participant.color);
    setModalDefaultRole(participant.role);
    setModalDefaultFunnelStage(participant.funnelStage || 'novo_contato');
    setIsParticipantModalOpen(true);
  };

  const handleToggleConfirmation = async (id: string, name: string) => {
    try {
      const updated = await toggleConexaoCultoConfirmation(id);
      setFeedbackNotice(
        updated.confirmedNextCulto
          ? `Presença de ${name} confirmada para o próximo culto!`
          : `Presença de ${name} alterada para pendente.`
      );
      setTimeout(() => setFeedbackNotice(null), 3500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Tem certeza que deseja remover ${name} do Conexão Jovem?`)) {
      await deleteConexaoParticipant(id);
    }
  };

  const handleOpenReport = (color: ConexaoColor) => {
    setReportTargetColor(color);
    setIsReportModalOpen(true);
  };

  const handleOpenEditGoal = (color: ConexaoColor) => {
    setGoalModalColor(color);
    setIsGoalModalOpen(true);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Feedback Alert */}
      {feedbackNotice && (
        <div className="p-3.5 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-300 text-xs font-semibold flex items-center justify-between shadow-lg animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{feedbackNotice}</span>
          </div>
          <button
            onClick={() => setFeedbackNotice(null)}
            className="text-emerald-400 hover:text-white"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Main Page Header with Authentic Conexão Logo */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-[#0F0F0F] via-[#141414] to-[#0A0A0A] p-6 rounded-2xl border border-[#222222] shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <ConexaoLogo size="sm" />
            <span className="text-[11px] uppercase tracking-widest font-extrabold text-amber-400">
              MINISTÉRIO DE JOVENS • CASA DE DEUS
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            CONEXÃO JOVEM
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 font-semibold hidden sm:inline-block">
              6 Cores / Tribos
            </span>
          </h1>
          <p className="text-xs md:text-sm text-zinc-400 max-w-2xl">
            Gestão estratégica das equipes por cores: acompanhamento de resultados de Janeiro a Dezembro, metas da equipe, bases e membros integrados.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {activeColorView !== 'geral' && (
            <button
              onClick={() => handleOpenReport(activeColorView)}
              className="px-4 py-2.5 bg-[#181818] hover:bg-[#222222] text-white border border-[#333333] rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-sm"
            >
              <Printer className="w-4 h-4 text-zinc-400" />
              <span>Relatório da Equipe</span>
            </button>
          )}

          <button
            onClick={() =>
              handleOpenAddParticipant(
                activeColorView !== 'geral' ? activeColorView : 'verde',
                'convidado'
              )
            }
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg hover:shadow-amber-500/20"
          >
            <Sparkles className="w-4 h-4" />
            <span>+ Novo Convidado</span>
          </button>

          <button
            onClick={() =>
              handleOpenAddParticipant(
                activeColorView !== 'geral' ? activeColorView : 'verde',
                'sublider_base'
              )
            }
            className="px-4 py-2.5 bg-white hover:bg-zinc-200 text-black rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg"
          >
            <Shield className="w-4 h-4" />
            <span>+ Nova Base</span>
          </button>
        </div>
      </div>

      {/* Team Leader Restriction Notice Banner */}
      {isTeamLeader && currentColorConfig && (
        <div className="p-4 bg-gradient-to-r from-amber-500/15 via-black to-black border border-amber-500/40 rounded-2xl flex items-center gap-3 text-xs text-amber-200 shadow-md">
          <Lock className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <span className="font-bold text-white block sm:inline">
              Acesso Exclusivo de Líder da Equipe:
            </span>{' '}
            Você está conectado como <strong>{currentUser?.name}</strong> e possui permissão restrita para gerenciar exclusivamente as informações, convidados, bases, resultados e metas da{' '}
            <strong className="text-amber-300">{currentColorConfig.displayName}</strong>.
          </div>
        </div>
      )}

      {/* Top Overall Counters Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-[#0A0A0A] border border-[#222222] rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-400 block">
              {isTeamLeader ? `Total ${currentColorConfig?.displayName}` : 'Total de Jovens'}
            </span>
            <span className="text-2xl font-black text-white">{overallTotals.totalParticipants}</span>
            <span className="text-[10px] text-zinc-500 block mt-0.5">
              {isTeamLeader ? 'Na sua equipe' : 'Nas 6 cores'}
            </span>
          </div>
          <Users className="w-6 h-6 text-zinc-600" />
        </div>

        <div className="p-4 bg-[#0A0A0A] border border-[#222222] rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-amber-400 block">Convidados</span>
            <span className="text-2xl font-black text-amber-300">{overallTotals.totalGuests}</span>
            <span className="text-[10px] text-zinc-500 block mt-0.5">
              {overallTotals.confirmedGuests} confirmados no culto
            </span>
          </div>
          <Sparkles className="w-6 h-6 text-amber-500/40" />
        </div>

        <div className="p-4 bg-[#0A0A0A] border border-[#222222] rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-indigo-400 block">Bases Jovens</span>
            <span className="text-2xl font-black text-indigo-300">{overallTotals.totalBases}</span>
            <span className="text-[10px] text-zinc-500 block mt-0.5">Sub-líderes ativos</span>
          </div>
          <Shield className="w-6 h-6 text-indigo-500/40" />
        </div>

        <div className="p-4 bg-[#0A0A0A] border border-[#222222] rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-emerald-400 block">Membros Integrados</span>
            <span className="text-2xl font-black text-emerald-300">{overallTotals.totalChurchMembers}</span>
            <span className="text-[10px] text-zinc-500 block mt-0.5">Casa de Deus integrados</span>
          </div>
          <UserCheck className="w-6 h-6 text-emerald-500/40" />
        </div>
      </div>

      {/* Team Tabs Navigation Bar (Seletor de Equipes ou Geral) */}
      {!isTeamLeader ? (
        <div className="bg-[#0D0D0D] border border-[#222222] p-2 rounded-2xl flex items-center gap-1.5 overflow-x-auto shadow-md">
          <button
            onClick={() => setActiveColorView('geral')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all whitespace-nowrap ${
              activeColorView === 'geral'
                ? 'bg-white text-black shadow-lg shadow-white/10'
                : 'text-zinc-400 hover:text-white hover:bg-[#1A1A1A]'
            }`}
          >
            <Crown className="w-4 h-4" />
            <span>Visão Geral & Gráficos</span>
          </button>

          <div className="h-5 w-[1px] bg-zinc-800 mx-1 shrink-0" />

          {CONEXAO_COLORS.map(color => {
            const config = CONEXAO_COLOR_CONFIGS[color];
            const stats = colorStats[color];
            const isActive = activeColorView === color;

            return (
              <button
                key={color}
                onClick={() => {
                  setActiveColorView(color);
                  setActiveSubTab('convidados');
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap border ${
                  isActive
                    ? `${config.badgeBg} border-current ring-1 ring-white/20 shadow-md scale-[1.02]`
                    : 'border-transparent text-zinc-400 hover:text-white hover:bg-[#161616]'
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${config.dotBg} shrink-0`} />
                <span>{config.displayName}</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-black/40 rounded-full font-mono">
                  {stats.total}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="bg-[#0D0D0D] border border-amber-500/40 p-3 rounded-2xl flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2.5">
            <span className={`w-3.5 h-3.5 rounded-full ${currentColorConfig?.dotBg} shrink-0`} />
            <span className="text-sm font-extrabold text-white">{currentColorConfig?.displayName}</span>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
            Sua Equipe Autorizada
          </span>
        </div>
      )}

      {/* ======================================================== */}
      {/* ESPAÇO DE TRABALHO DA EQUIPE SELECIONADA                */}
      {/* ======================================================== */}
      {activeColorView !== 'geral' && currentColorConfig && (
        <div className="space-y-6">
          {/* Team Banner */}
          <div
            className={`p-6 rounded-2xl border ${currentColorConfig.borderClass} bg-gradient-to-br ${currentColorConfig.gradientBg} shadow-2xl relative overflow-hidden`}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3.5 h-3.5 rounded-full shadow-lg"
                    style={{ backgroundColor: currentColorConfig.hex }}
                  />
                  <span className="text-xs uppercase tracking-widest font-black text-white/90">
                    {currentColorConfig.displayName}
                  </span>
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-white">
                  {currentColorConfig.displayName}
                </h2>
                <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-300 pt-1">
                  <span>
                    Líder Geral:{' '}
                    <strong className="text-white">
                      {colorStats[activeColorView].leader?.name || 'A designar pelo pastor'}
                    </strong>
                  </span>
                  <span>•</span>
                  <span>{colorStats[activeColorView].bases.length} Bases Jovens</span>
                  <span>•</span>
                  <span>{colorStats[activeColorView].guests.length} Convidados</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isAdminOrConexaoLeader && (
                  <button
                    onClick={() => handleOpenEditGoal(activeColorView)}
                    className="px-3.5 py-2 bg-black/60 hover:bg-black text-white border border-white/20 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
                  >
                    <Target className="w-3.5 h-3.5 text-amber-400" />
                    <span>Editar Metas</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setEnrollModalRole('membro');
                    setIsEnrollModalOpen(true);
                  }}
                  className="px-3.5 py-2 bg-black/60 hover:bg-black text-white border border-white/20 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
                >
                  <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Vincular Membro da Igreja</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-white/10">
              <div className="p-2.5 bg-black/40 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block">
                  Bases (Sub-líderes)
                </span>
                <p className="text-xl font-black text-white">
                  {colorStats[activeColorView].bases.length}
                </p>
                <span className="text-[10px] text-zinc-400">Células da Cor</span>
              </div>

              <div className="p-2.5 bg-black/40 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block">
                  Membros da Equipe
                </span>
                <p className="text-xl font-black text-white">
                  {colorStats[activeColorView].members.length}
                </p>
                <span className="text-[10px] text-zinc-400">Integrados</span>
              </div>

              <div className="p-2.5 bg-black/40 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-amber-400 block">
                  Convidados
                </span>
                <p className="text-xl font-black text-amber-300">
                  {colorStats[activeColorView].guests.length}
                </p>
                <span className="text-[10px] text-zinc-400">
                  {colorStats[activeColorView].confirmedGuests} confirmados no culto
                </span>
              </div>

              <div className="p-2.5 bg-black/40 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-emerald-400 block">
                  Meta Presença Culto
                </span>
                <p className="text-xl font-black text-emerald-300">
                  {conexaoGoals[activeColorView]?.targetWeeklyAttendance || 45} Jovens
                </p>
                <span className="text-[10px] text-zinc-400">Alvo no sábado</span>
              </div>
            </div>
          </div>

          {/* Sub-tabs inside Color Workspace */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#222222] pb-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setActiveSubTab('funil')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
                  activeSubTab === 'funil'
                    ? 'bg-amber-500 text-black shadow-md'
                    : 'bg-[#111111] text-zinc-400 hover:text-white hover:bg-[#1A1A1A]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Funil Kanban ({unifiedParticipants.filter(p => p.color === activeColorView).length})</span>
              </button>

              <button
                onClick={() => setActiveSubTab('grafico_funil')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
                  activeSubTab === 'grafico_funil'
                    ? 'bg-amber-500 text-black shadow-md font-black'
                    : 'bg-[#111111] text-zinc-400 hover:text-white hover:bg-[#1A1A1A]'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Gráfico de Funil (Gargalos)</span>
              </button>

              <button
                onClick={() => setActiveSubTab('convidados')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
                  activeSubTab === 'convidados'
                    ? 'bg-amber-500 text-black shadow-md'
                    : 'bg-[#111111] text-zinc-400 hover:text-white hover:bg-[#1A1A1A]'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Convidados & Visitantes ({colorStats[activeColorView].guests.length})</span>
              </button>

              <button
                onClick={() => setActiveSubTab('bases')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
                  activeSubTab === 'bases'
                    ? 'bg-indigo-500 text-white shadow-md'
                    : 'bg-[#111111] text-zinc-400 hover:text-white hover:bg-[#1A1A1A]'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Bases & Sub-líderes ({colorStats[activeColorView].bases.length})</span>
              </button>

              <button
                onClick={() => setActiveSubTab('membros')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
                  activeSubTab === 'membros'
                    ? 'bg-white text-black shadow-md'
                    : 'bg-[#111111] text-zinc-400 hover:text-white hover:bg-[#1A1A1A]'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Membros da Equipe ({colorStats[activeColorView].members.length})</span>
              </button>

              <button
                onClick={() => setActiveSubTab('resultados')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
                  activeSubTab === 'resultados'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-[#111111] text-zinc-400 hover:text-white hover:bg-[#1A1A1A]'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Resultados (Jan a Dez)</span>
              </button>

              <button
                onClick={() => setActiveSubTab('metas')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
                  activeSubTab === 'metas'
                    ? 'bg-emerald-500 text-black shadow-md'
                    : 'bg-[#111111] text-zinc-400 hover:text-white hover:bg-[#1A1A1A]'
                }`}
              >
                <Target className="w-3.5 h-3.5" />
                <span>Metas da Equipe</span>
              </button>

              <button
                onClick={() => setActiveSubTab('relatorio')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
                  activeSubTab === 'relatorio'
                    ? 'bg-zinc-200 text-black shadow-md'
                    : 'bg-[#111111] text-zinc-400 hover:text-white hover:bg-[#1A1A1A]'
                }`}
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Ficha de Relatório</span>
              </button>
            </div>
          </div>

          {/* =================================================== */}
          {/* SUBTAB FUNIL: FUNIL KANBAN COM 4 ETAPAS PRINCIPAIS */}
          {/* =================================================== */}
          {activeSubTab === 'funil' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-[#111111] border border-[#242424] rounded-xl text-xs">
                <div className="flex items-center gap-2 text-zinc-300">
                  <Layers className="w-4 h-4 text-amber-400" />
                  <span className="font-bold">Quadro Kanban do Funil:</span>
                  <span className="text-zinc-400">4 colunas principais (Novo contato → Em contato → Em acompanhamento → Integrado)</span>
                </div>
                <button
                  onClick={() => setActiveSubTab('grafico_funil')}
                  className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>Ver Gráfico de Funil & Gargalos</span>
                </button>
              </div>

              <ConexaoFunnelKanban
                participants={unifiedParticipants.filter(p => p.color === activeColorView)}
                activeColorView={activeColorView}
                onOpenAddContact={(defaultStage) => {
                  handleOpenAddParticipant(activeColorView as ConexaoColor, 'convidado', defaultStage || 'novo_contato');
                }}
                onEditParticipant={(p) => {
                  handleEditParticipant(p);
                }}
              />
            </div>
          )}

          {/* =================================================== */}
          {/* SUBTAB GRAFICO FUNIL: GRÁFICO LITERAL DE FUNIL     */}
          {/* =================================================== */}
          {activeSubTab === 'grafico_funil' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-[#111111] border border-[#242424] rounded-xl text-xs">
                <div className="flex items-center gap-2 text-zinc-300">
                  <Filter className="w-4 h-4 text-amber-400" />
                  <span className="font-bold">Gráfico de Funil (Gargalos de Conversão):</span>
                  <span className="text-zinc-400">Aspecto de funil vertical com diagnóstico de retenção</span>
                </div>
                <button
                  onClick={() => setActiveSubTab('funil')}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
                >
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  <span>Alternar para Quadro Kanban</span>
                </button>
              </div>

              <ConexaoFunnelChart
                participants={unifiedParticipants.filter(p => p.color === activeColorView)}
                activeColorView={activeColorView}
                selectedCongregation={selectedCongregation}
                onOpenAddContact={(defaultStage) => {
                  handleOpenAddParticipant(activeColorView as ConexaoColor, 'convidado', defaultStage || 'novo_contato');
                }}
              />
            </div>
          )}

          {/* =================================================== */}
          {/* SUBTAB 4: RESULTADOS DE JANEIRO A DEZEMBRO (GRÁFICO)*/}
          {/* =================================================== */}
          {activeSubTab === 'resultados' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="p-6 bg-[#0E0E0E] border border-[#262626] rounded-2xl shadow-xl space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1F1F1F] pb-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider flex items-center gap-1.5">
                      <BarChart3 className="w-3.5 h-3.5" />
                      Painel de Monitoramento de Resultados (Jan - Dez)
                    </span>
                    <h3 className="text-xl font-black text-white mt-1">
                      Desempenho Anual da {currentColorConfig.displayName}
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Evolução mensal de convidados trazidos, frequência média nos cultos de sábado e novos membros integrados.
                    </p>
                  </div>
                </div>

                {/* Key indicators of the year */}
                {(() => {
                  const monthlyList = conexaoMonthlyResults[activeColorView] || [];
                  const totalGuests = monthlyList.reduce((acc, m) => acc + (m.guests || 0), 0);
                  const avgAttendance = Math.round(monthlyList.reduce((acc, m) => acc + (m.attendance || 0), 0) / 12);
                  const totalNewMembers = monthlyList.reduce((acc, m) => acc + (m.newMembers || 0), 0);
                  const bestMonth = totalGuests > 0 
                    ? [...monthlyList].sort((a, b) => (b.guests || 0) - (a.guests || 0))[0]?.monthKey || '-'
                    : '-';

                  return (
                    <>
                      {totalGuests === 0 && (
                        <div className="p-3.5 bg-blue-950/20 border border-blue-500/30 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2 text-blue-300">
                            <Info className="w-4 h-4 text-blue-400 shrink-0" />
                            <span>
                              <strong>Gráfico zerado no teste real:</strong> Nenhum cadastro registrado para esta equipe. O gráfico e os acumulados estão zerados e começarão a computar conforme novos contatos entrarem no funil.
                            </span>
                          </div>
                          <button
                            onClick={() => setActiveSubTab('grafico_funil')}
                            className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg font-bold text-[11px] whitespace-nowrap cursor-pointer transition-colors self-start sm:self-auto"
                          >
                            Ver Gráfico de Funil
                          </button>
                        </div>
                      )}

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-4 bg-[#141414] border border-[#262626] rounded-xl">
                          <span className="text-[10px] text-zinc-400 uppercase font-bold block">Total Convidados no Ano</span>
                          <span className="text-2xl font-black" style={{ color: currentColorConfig.hex }}>
                            {totalGuests}
                          </span>
                          <span className="text-[10px] text-zinc-500 block mt-0.5">Soma de Jan a Dez</span>
                        </div>

                        <div className="p-4 bg-[#141414] border border-[#262626] rounded-xl">
                          <span className="text-[10px] text-zinc-400 uppercase font-bold block">Média de Presença / Culto</span>
                          <span className="text-2xl font-black text-purple-300">
                            {avgAttendance}
                          </span>
                          <span className="text-[10px] text-zinc-500 block mt-0.5">Jovens por sábado</span>
                        </div>

                        <div className="p-4 bg-[#141414] border border-[#262626] rounded-xl">
                          <span className="text-[10px] text-zinc-400 uppercase font-bold block">Novos Membros Integrados</span>
                          <span className="text-2xl font-black text-white">
                            {totalNewMembers}
                          </span>
                          <span className="text-[10px] text-zinc-500 block mt-0.5">Permaneceram na igreja</span>
                        </div>

                        <div className="p-4 bg-[#141414] border border-[#262626] rounded-xl">
                          <span className="text-[10px] text-zinc-400 uppercase font-bold block">Melhor Mês</span>
                          <span className="text-2xl font-black text-amber-300">{bestMonth}</span>
                          <span className="text-[10px] text-zinc-500 block mt-0.5">
                            {totalGuests > 0 ? 'Pico de convidados' : 'Sem registros'}
                          </span>
                        </div>
                      </div>
                    </>
                  );
                })()}

                {/* Main Team Chart */}
                <div className="p-4 bg-[#121212] border border-[#222222] rounded-xl space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-purple-400" />
                      Gráfico de Resultados Mensais (Janeiro a Dezembro)
                    </span>
                    <div className="flex items-center gap-3 text-[11px] text-zinc-400">
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: currentColorConfig.hex }} />
                        <span>Convidados</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-purple-500" />
                        <span>Presença Culto</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-white" />
                        <span>Novos Membros</span>
                      </div>
                    </div>
                  </div>

                  <div className="h-72 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={conexaoMonthlyResults[activeColorView] || []}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id={`grad-team-${activeColorView}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={currentColorConfig.hex} stopOpacity={0.4} />
                            <stop offset="95%" stopColor={currentColorConfig.hex} stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="#1F1F1F" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="monthKey" stroke="#666666" tick={{ fill: '#888888', fontSize: 11 }} />
                        <YAxis stroke="#666666" tick={{ fill: '#888888', fontSize: 11 }} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0F0F0F',
                            borderColor: '#262626',
                            borderRadius: '8px',
                            color: '#FFFFFF',
                            fontSize: '12px',
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="guests"
                          name="Convidados Trazidos"
                          stroke={currentColorConfig.hex}
                          fill={`url(#grad-team-${activeColorView})`}
                          strokeWidth={2.5}
                        />
                        <Line
                          type="monotone"
                          dataKey="attendance"
                          name="Presença no Culto"
                          stroke="#A855F7"
                          strokeWidth={2}
                          dot={{ r: 3.5, fill: '#A855F7' }}
                        />
                        <Line
                          type="monotone"
                          dataKey="newMembers"
                          name="Novos Membros"
                          stroke="#FFFFFF"
                          strokeWidth={2}
                          dot={{ r: 3, fill: '#FFFFFF' }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Table of Monthly Results */}
                <div className="overflow-x-auto bg-[#111111] border border-[#222222] rounded-xl">
                  <table className="w-full text-left text-xs text-zinc-300">
                    <thead className="bg-[#161616] text-zinc-400 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Mês</th>
                        <th className="py-2.5 px-3 text-right">Convidados</th>
                        <th className="py-2.5 px-3 text-right">Presença Culto</th>
                        <th className="py-2.5 px-3 text-right">Novos Membros</th>
                        <th className="py-2.5 px-3 text-right">Status do Mês</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1F1F1F]">
                      {(conexaoMonthlyResults[activeColorView] || []).map(m => (
                        <tr key={m.monthKey} className="hover:bg-[#181818] transition-colors">
                          <td className="py-2.5 px-3 font-bold text-white">{m.monthKey}</td>
                          <td className="py-2.5 px-3 text-right font-black" style={{ color: currentColorConfig.hex }}>
                            {m.guests}
                          </td>
                          <td className="py-2.5 px-3 text-right text-purple-300 font-semibold">{m.attendance}</td>
                          <td className="py-2.5 px-3 text-right text-white font-semibold">{m.newMembers}</td>
                          <td className="py-2.5 px-3 text-right">
                            {m.guests === 0 && m.attendance === 0 ? (
                              <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-zinc-800 text-zinc-500 border border-zinc-700/50">
                                Sem registros
                              </span>
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                Meta Atingida
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =================================================== */}
          {/* SUBTAB 5: METAS DA EQUIPE (EDITADAS PELO ADM)       */}
          {/* =================================================== */}
          {activeSubTab === 'metas' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="p-6 bg-[#0E0E0E] border border-[#262626] rounded-2xl shadow-xl space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1F1F1F] pb-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5" />
                      Planejamento Estratégico & Metas da Cor
                    </span>
                    <h3 className="text-xl font-black text-white mt-1">
                      Metas da {currentColorConfig.displayName}
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Alvos definidos pela liderança pastoral para crescimento e retenção da juventude.
                    </p>
                  </div>

                  {isAdminOrConexaoLeader && (
                    <button
                      onClick={() => handleOpenEditGoal(activeColorView)}
                      className="px-4 py-2 bg-white text-black hover:bg-zinc-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-lg self-start sm:self-auto"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Editar Metas (Admin)</span>
                    </button>
                  )}
                </div>

                {/* Progress bars comparing Actual vs Goal */}
                {(() => {
                  const goal = conexaoGoals[activeColorView] || {
                    targetGuests: 100,
                    targetGuestsMonth: 10,
                    targetMembers: 40,
                    targetBases: 4,
                    targetWeeklyAttendance: 45,
                  };

                  const actualYearGuests = (conexaoMonthlyResults[activeColorView] || []).reduce((acc, m) => acc + (m.guests || 0), 0);
                  const guestsPct = Math.min(100, Math.round((actualYearGuests / (goal.targetGuests || 1)) * 100));

                  const actualMembers = colorStats[activeColorView].members.length;
                  const membersPct = Math.min(100, Math.round((actualMembers / (goal.targetMembers || 1)) * 100));

                  const actualBases = colorStats[activeColorView].bases.length;
                  const basesPct = Math.min(100, Math.round((actualBases / (goal.targetBases || 1)) * 100));

                  const avgAttendance = Math.round(
                    (conexaoMonthlyResults[activeColorView] || []).reduce((acc, m) => acc + (m.attendance || 0), 0) / 12
                  );
                  const attendancePct = Math.min(100, Math.round((avgAttendance / (goal.targetWeeklyAttendance || 1)) * 100));

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Meta de Convidados */}
                      <div className="p-4 bg-[#141414] border border-[#242424] rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-amber-400" />
                            Meta de Convidados no Ano
                          </span>
                          <span className="text-xs font-black text-amber-300">{guestsPct}%</span>
                        </div>
                        <div className="flex items-baseline justify-between text-xs">
                          <span className="text-zinc-400">
                            Realizado: <strong className="text-white text-sm">{actualYearGuests}</strong>
                          </span>
                          <span className="text-zinc-400">
                            Alvo: <strong className="text-white text-sm">{goal.targetGuests}</strong>
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-black/60 rounded-full overflow-hidden border border-[#2B2B2B]">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-500"
                            style={{ width: `${guestsPct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-zinc-500 block">
                          Meta mensal esperada: <strong>{goal.targetGuestsMonth || 10} convidados/mês</strong>
                        </span>
                      </div>

                      {/* Meta de Membros Integrados */}
                      <div className="p-4 bg-[#141414] border border-[#242424] rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Users className="w-4 h-4 text-emerald-400" />
                            Meta de Membros Integrados
                          </span>
                          <span className="text-xs font-black text-emerald-300">{membersPct}%</span>
                        </div>
                        <div className="flex items-baseline justify-between text-xs">
                          <span className="text-zinc-400">
                            Realizado: <strong className="text-white text-sm">{actualMembers}</strong>
                          </span>
                          <span className="text-zinc-400">
                            Alvo: <strong className="text-white text-sm">{goal.targetMembers}</strong>
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-black/60 rounded-full overflow-hidden border border-[#2B2B2B]">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                            style={{ width: `${membersPct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-zinc-500 block">
                          Jovens frequentes e ativos nos ministérios
                        </span>
                      </div>

                      {/* Meta de Bases Ativas */}
                      <div className="p-4 bg-[#141414] border border-[#242424] rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Shield className="w-4 h-4 text-indigo-400" />
                            Meta de Bases (Sub-líderes)
                          </span>
                          <span className="text-xs font-black text-indigo-300">{basesPct}%</span>
                        </div>
                        <div className="flex items-baseline justify-between text-xs">
                          <span className="text-zinc-400">
                            Realizado: <strong className="text-white text-sm">{actualBases}</strong>
                          </span>
                          <span className="text-zinc-400">
                            Alvo: <strong className="text-white text-sm">{goal.targetBases}</strong>
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-black/60 rounded-full overflow-hidden border border-[#2B2B2B]">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-400 rounded-full transition-all duration-500"
                            style={{ width: `${basesPct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-zinc-500 block">
                          Células e grupos caseiros de jovens da cor
                        </span>
                      </div>

                      {/* Meta de Presença Média no Culto */}
                      <div className="p-4 bg-[#141414] border border-[#242424] rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 text-purple-400" />
                            Meta de Presença Média no Culto
                          </span>
                          <span className="text-xs font-black text-purple-300">{attendancePct}%</span>
                        </div>
                        <div className="flex items-baseline justify-between text-xs">
                          <span className="text-zinc-400">
                            Realizado: <strong className="text-white text-sm">{avgAttendance}</strong>
                          </span>
                          <span className="text-zinc-400">
                            Alvo: <strong className="text-white text-sm">{goal.targetWeeklyAttendance}</strong>
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-black/60 rounded-full overflow-hidden border border-[#2B2B2B]">
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                            style={{ width: `${attendancePct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-zinc-500 block">
                          Jovens da equipe presentes no culto de sábado
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Orientações Pastorais / Notas */}
                <div className="p-4 bg-[#121212] border border-[#262626] rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                      Diretrizes Pastorais para a Equipe
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      Atualizado por {conexaoGoals[activeColorView]?.updatedBy || 'Pr. Bruno Bitencourt'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed bg-[#0A0A0A] p-3 rounded-lg border border-[#1C1C1C]">
                    {conexaoGoals[activeColorView]?.notes ||
                      'Foco no acolhimento pós-culto, evangelismo universitário e fortalecimento dos sub-líderes de base nas terças e quintas-feiras.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Subtabs Convidados, Bases, Membros, Relatório */}
          {activeSubTab === 'convidados' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Convidados da {currentColorConfig.displayName}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Jovens visitantes trazidos para os cultos de sábado. Acompanhe a confirmação de presença.
                  </p>
                </div>
                <button
                  onClick={() => handleOpenAddParticipant(activeColorView, 'convidado')}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg text-xs flex items-center gap-1.5 shadow"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Novo Convidado</span>
                </button>
              </div>

              {/* Table of Guests */}
              <div className="overflow-x-auto bg-[#0E0E0E] border border-[#262626] rounded-xl">
                <table className="w-full text-left text-xs text-zinc-300">
                  <thead className="bg-[#141414] text-zinc-400 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Nome do Convidado</th>
                      <th className="py-3 px-4">Telefone / WhatsApp</th>
                      <th className="py-3 px-4">Etapa do Funil</th>
                      <th className="py-3 px-4">Última Interação / Resp.</th>
                      <th className="py-3 px-4">Base Vinculada</th>
                      <th className="py-3 px-4 text-center">Presença Culto</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1C1C1C]">
                    {displayedParticipants.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-zinc-500 italic">
                          Nenhum convidado cadastrado nesta categoria.
                        </td>
                      </tr>
                    ) : (
                      displayedParticipants.map(p => (
                        <tr key={p.id} className="hover:bg-[#141414] transition-colors">
                          <td className="py-3 px-4 font-bold text-white">
                            <div className="flex items-center gap-2">
                              <span>{p.name}</span>
                              {p.churchContact && (
                                <span className="text-[9px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded font-semibold border border-emerald-500/30">
                                  Membro Igreja
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <a
                              href={getWhatsAppUrl(p.phone)}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-400 hover:underline flex items-center gap-1 font-mono"
                            >
                              <Phone className="w-3 h-3" />
                              <span>{p.phone}</span>
                            </a>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              p.funnelStage === 'integrado'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : p.funnelStage === 'em_acompanhamento'
                                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                                : p.funnelStage === 'em_contato'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                            }`}>
                              {FUNNEL_STAGES.find(s => s.id === (p.funnelStage || 'novo_contato'))?.label || 'Novo contato'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <p className="text-[11px] text-zinc-300 truncate max-w-[170px]" title={p.lastInteraction}>
                              {p.lastInteraction || 'Sem interação'}
                            </p>
                            <span className="text-[10px] text-zinc-500 block truncate max-w-[170px]">
                              Resp: {p.responsibleName || 'Não definido'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-zinc-400">{p.baseName || 'Sem Base'}</td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handleToggleConfirmation(p.id, p.name)}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors ${
                                p.confirmedNextCulto
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                  : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                              }`}
                            >
                              {p.confirmedNextCulto ? '✓ Confirmado no Culto' : 'Aguardando'}
                            </button>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setInteractionModalParticipant(p)}
                                className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded text-[10px] font-bold flex items-center gap-1 transition-colors"
                                title="Abrir Histórico e Registrar Interação"
                              >
                                <MessageSquare className="w-3 h-3" />
                                <span>Histórico</span>
                              </button>
                              {p.churchContact && onOpenContactDetails && (
                                <button
                                  onClick={() => onOpenContactDetails(p.churchContact!)}
                                  className="p-1 text-zinc-400 hover:text-white"
                                  title="Ver ficha pastoral completa"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => handleEditParticipant(p)}
                                className="p-1 text-zinc-400 hover:text-white"
                                title="Editar"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(p.id, p.name)}
                                className="p-1 text-zinc-400 hover:text-red-400"
                                title="Excluir"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeSubTab === 'bases' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Shield className="w-4 h-4 text-indigo-400" />
                    Bases & Sub-líderes da {currentColorConfig.displayName}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Células e sub-líderes que acolhem e discipulam os jovens da cor.
                  </p>
                </div>
                <button
                  onClick={() => handleOpenAddParticipant(activeColorView, 'sublider_base')}
                  className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nova Base</span>
                </button>
              </div>

              {/* Grid of Bases */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {displayedParticipants.map(b => (
                  <div key={b.id} className="p-4 bg-[#0E0E0E] border border-[#262626] rounded-xl space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                          {b.baseName || 'Base Jovem'}
                        </span>
                        <h4 className="text-sm font-bold text-white mt-1">{b.name}</h4>
                        <p className="text-xs text-zinc-400">{b.phone} • {b.congregation}</p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-indigo-500/20 text-indigo-300">
                        Sub-líder
                      </span>
                    </div>

                    <p className="text-xs text-zinc-400 italic">
                      {b.notes || 'Sub-líder responsável pela acolhida da base.'}
                    </p>

                    <div className="pt-2 border-t border-[#1C1C1C] flex items-center justify-between">
                      <a
                        href={getWhatsAppUrl(b.phone)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3" />
                        <span>WhatsApp</span>
                      </a>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEditParticipant(b)}
                          className="p-1 text-zinc-400 hover:text-white"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(b.id, b.name)}
                          className="p-1 text-zinc-400 hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSubTab === 'membros' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-white" />
                    Membros Integrados da {currentColorConfig.displayName}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Jovens ativos, batizados e fixos na equipe.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEnrollModalRole('membro');
                    setIsEnrollModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-white hover:bg-zinc-200 text-black font-bold rounded-lg text-xs flex items-center gap-1.5 shadow"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ Vincular Membro da Igreja</span>
                </button>
              </div>

              {/* Table of Members */}
              <div className="overflow-x-auto bg-[#0E0E0E] border border-[#262626] rounded-xl">
                <table className="w-full text-left text-xs text-zinc-300">
                  <thead className="bg-[#141414] text-zinc-400 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Nome do Membro</th>
                      <th className="py-3 px-4">Telefone</th>
                      <th className="py-3 px-4">Sede</th>
                      <th className="py-3 px-4">Base Pertencente</th>
                      <th className="py-3 px-4">Membro Casa de Deus</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1C1C1C]">
                    {displayedParticipants.map(m => (
                      <tr key={m.id} className="hover:bg-[#141414] transition-colors">
                        <td className="py-3 px-4 font-bold text-white">{m.name}</td>
                        <td className="py-3 px-4 text-zinc-400">{m.phone}</td>
                        <td className="py-3 px-4 text-zinc-400">{m.congregation}</td>
                        <td className="py-3 px-4 text-zinc-400">{m.baseName || 'Geral da Cor'}</td>
                        <td className="py-3 px-4">
                          <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            Membro da Igreja
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {m.churchContact && onOpenContactDetails && (
                              <button
                                onClick={() => onOpenContactDetails(m.churchContact!)}
                                className="p-1 text-zinc-400 hover:text-white"
                                title="Ver ficha pastoral completa"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => handleEditParticipant(m)}
                              className="p-1 text-zinc-400 hover:text-white"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(m.id, m.name)}
                              className="p-1 text-zinc-400 hover:text-red-400"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeSubTab === 'relatorio' && (
            <div className="space-y-4 bg-[#0A0A0A] border border-[#262626] rounded-2xl p-6 md:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#222222] pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: currentColorConfig.hex }}
                    />
                    <span className="text-xs uppercase font-extrabold text-zinc-400 tracking-wider">
                      CASA DE DEUS • CONEXÃO JOVEM
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-white mt-1">
                    Relatório Oficial da {currentColorConfig.displayName}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Prestação de contas pastoral com foco em convidados e retenção.
                  </p>
                </div>

                <button
                  onClick={() => handleOpenReport(activeColorView)}
                  className="px-4 py-2 bg-white text-black hover:bg-zinc-200 text-xs font-bold rounded-xl flex items-center gap-2 transition-colors shadow-lg"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir / Salvar PDF</span>
                </button>
              </div>

              {/* Quick Summary Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-[#111111] rounded-xl border border-[#222222]">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold">Sub-líderes (Bases)</span>
                  <p className="text-xl font-bold text-white">{colorStats[activeColorView].bases.length}</p>
                </div>
                <div className="p-3 bg-[#111111] rounded-xl border border-[#222222]">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold">Membros Ativos</span>
                  <p className="text-xl font-bold text-white">{colorStats[activeColorView].members.length}</p>
                </div>
                <div className="p-3 bg-[#111111] rounded-xl border border-[#222222]">
                  <span className="text-[10px] text-amber-500 uppercase font-bold">Convidados Trazidos</span>
                  <p className="text-xl font-bold text-amber-300">{colorStats[activeColorView].guests.length}</p>
                </div>
                <div className="p-3 bg-[#111111] rounded-xl border border-[#222222]">
                  <span className="text-[10px] text-emerald-500 uppercase font-bold">Presenças Confirmadas</span>
                  <p className="text-xl font-bold text-emerald-300">{colorStats[activeColorView].confirmedGuests}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* COORDENAÇÃO GERAL (VISÃO TOTAL DE TODAS AS 6 CORES)     */}
      {/* ======================================================== */}
      {activeColorView === 'geral' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Subtabs for Geral */}
          <div className="flex items-center gap-2 border-b border-[#222222] pb-3 overflow-x-auto">
            <button
              onClick={() => setActiveGeralSubTab('funil_geral')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
                activeGeralSubTab === 'funil_geral'
                  ? 'bg-amber-500 text-black shadow-lg font-black'
                  : 'bg-[#111111] text-zinc-400 hover:text-white hover:bg-[#1A1A1A]'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Funil Kanban (4 Etapas)</span>
            </button>

            <button
              onClick={() => setActiveGeralSubTab('grafico_funil_geral')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
                activeGeralSubTab === 'grafico_funil_geral'
                  ? 'bg-amber-500 text-black shadow-lg font-black'
                  : 'bg-[#111111] text-zinc-400 hover:text-white hover:bg-[#1A1A1A]'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span>Gráfico de Funil Geral (Gargalos)</span>
            </button>

            <button
              onClick={() => setActiveGeralSubTab('comparativo')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all whitespace-nowrap ${
                activeGeralSubTab === 'comparativo'
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'bg-[#111111] text-zinc-400 hover:text-white hover:bg-[#1A1A1A]'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Gráfico Comparativo (Jan a Dez)</span>
            </button>

            <button
              onClick={() => setActiveGeralSubTab('membros_igreja')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all whitespace-nowrap ${
                activeGeralSubTab === 'membros_igreja'
                  ? 'bg-emerald-500 text-black shadow-lg font-black'
                  : 'bg-[#111111] text-zinc-400 hover:text-white hover:bg-[#1A1A1A]'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Membros da Igreja por Equipe ({overallTotals.totalChurchMembers})</span>
            </button>

            <button
              onClick={() => setActiveGeralSubTab('metas_gerais')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all whitespace-nowrap ${
                activeGeralSubTab === 'metas_gerais'
                  ? 'bg-amber-500 text-black shadow-lg font-black'
                  : 'bg-[#111111] text-zinc-400 hover:text-white hover:bg-[#1A1A1A]'
              }`}
            >
              <Target className="w-4 h-4" />
              <span>Painel Geral de Metas</span>
            </button>

            <button
              onClick={() => setActiveGeralSubTab('equipes')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all whitespace-nowrap ${
                activeGeralSubTab === 'equipes'
                  ? 'bg-white text-black shadow-lg'
                  : 'bg-[#111111] text-zinc-400 hover:text-white hover:bg-[#1A1A1A]'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Visão das 6 Equipes</span>
            </button>
          </div>

          {/* =================================================== */}
          {/* GERAL SUBTAB 0: FUNIL GERAL DE CONTATOS (4 ETAPAS)  */}
          {/* =================================================== */}
          {activeGeralSubTab === 'funil_geral' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-[#111111] border border-[#242424] rounded-xl text-xs">
                <div className="flex items-center gap-2 text-zinc-300">
                  <Layers className="w-4 h-4 text-amber-400" />
                  <span className="font-bold">Quadro Kanban Geral:</span>
                  <span className="text-zinc-400">Contatos distribuídos pelas 4 etapas principais</span>
                </div>
                <button
                  onClick={() => setActiveGeralSubTab('grafico_funil_geral')}
                  className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>Ver Gráfico de Funil & Gargalos</span>
                </button>
              </div>

              <ConexaoFunnelKanban
                participants={unifiedParticipants}
                activeColorView="geral"
                onOpenAddContact={(defaultStage) => {
                  handleOpenAddParticipant('verde', 'convidado', defaultStage || 'novo_contato');
                }}
                onEditParticipant={(p) => {
                  handleEditParticipant(p);
                }}
              />
            </div>
          )}

          {/* ========================================================= */}
          {/* GERAL SUBTAB FUNIL GRAFICO: GRÁFICO LITERAL DE FUNIL GERAL */}
          {/* ========================================================= */}
          {activeGeralSubTab === 'grafico_funil_geral' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-[#111111] border border-[#242424] rounded-xl text-xs">
                <div className="flex items-center gap-2 text-zinc-300">
                  <Filter className="w-4 h-4 text-amber-400" />
                  <span className="font-bold">Gráfico de Funil Geral:</span>
                  <span className="text-zinc-400">Aspecto de funil vertical com identificação de gargalos de retenção</span>
                </div>
                <button
                  onClick={() => setActiveGeralSubTab('funil_geral')}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
                >
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  <span>Alternar para Quadro Kanban</span>
                </button>
              </div>

              <ConexaoFunnelChart
                participants={unifiedParticipants}
                activeColorView="geral"
                selectedCongregation={selectedCongregation}
                onOpenAddContact={(defaultStage) => {
                  handleOpenAddParticipant('verde', 'convidado', defaultStage || 'novo_contato');
                }}
              />
            </div>
          )}

          {/* =================================================== */}
          {/* GERAL SUBTAB 1: GRÁFICO COMPARATIVO (JAN A DEZ)     */}
          {/* =================================================== */}
          {activeGeralSubTab === 'comparativo' && (
            <div className="space-y-6">
              <div className="p-6 bg-[#0E0E0E] border border-[#262626] rounded-2xl shadow-xl space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1F1F1F] pb-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider flex items-center gap-1.5">
                      <BarChart3 className="w-3.5 h-3.5" />
                      Monitoramento Geral das 6 Equipes (Janeiro a Dezembro)
                    </span>
                    <h2 className="text-2xl font-black text-white mt-1">
                      Gráfico Comparativo de Todas as Equipes
                    </h2>
                    <p className="text-xs text-zinc-400">
                      Compare o desempenho mensal das 6 cores da Casa de Deus ao longo do ano inteiro.
                    </p>
                  </div>

                  {/* Metric Switcher */}
                  <div className="flex items-center gap-1 p-1 bg-[#141414] border border-[#242424] rounded-xl self-start md:self-auto">
                    <button
                      onClick={() => setComparativeMetric('guests')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        comparativeMetric === 'guests'
                          ? 'bg-amber-500 text-black shadow-sm'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Convidados Trazidos
                    </button>
                    <button
                      onClick={() => setComparativeMetric('attendance')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        comparativeMetric === 'attendance'
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Presença nos Cultos
                    </button>
                    <button
                      onClick={() => setComparativeMetric('newMembers')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        comparativeMetric === 'newMembers'
                          ? 'bg-white text-black shadow-sm'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Novos Membros
                    </button>
                  </div>
                </div>

                {/* Team Legend */}
                <div className="flex flex-wrap items-center gap-4 text-xs">
                  {CONEXAO_COLORS.map(c => {
                    const cfg = CONEXAO_COLOR_CONFIGS[c];
                    return (
                      <div key={c} className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: cfg.hex }} />
                        <span className="font-semibold text-zinc-300">{cfg.displayName}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Real Test Empty Banner */}
                {comparativeMonthlyData.every(row => row.total === 0) && (
                  <div className="p-3.5 bg-blue-950/20 border border-blue-500/30 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 text-blue-300">
                      <Info className="w-4 h-4 text-blue-400 shrink-0" />
                      <span>
                        <strong>Gráfico no teste real zerado:</strong> Não há contatos ou participantes cadastrados no momento. As 6 equipes constam zeradas aguardando novos registros de participantes.
                      </span>
                    </div>
                    <button
                      onClick={() => setActiveGeralSubTab('grafico_funil_geral')}
                      className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg font-bold text-[11px] whitespace-nowrap cursor-pointer transition-colors self-start sm:self-auto"
                    >
                      Ver Gráfico de Funil Geral
                    </button>
                  </div>
                )}

                {/* Big Multi-Line Chart comparing all 6 teams */}
                <div className="h-80 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={comparativeMonthlyData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid stroke="#1F1F1F" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="monthKey" stroke="#666666" tick={{ fill: '#888888', fontSize: 11 }} />
                      <YAxis stroke="#666666" tick={{ fill: '#888888', fontSize: 11 }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0F0F0F',
                          borderColor: '#262626',
                          borderRadius: '8px',
                          color: '#FFFFFF',
                          fontSize: '12px',
                        }}
                      />
                      {CONEXAO_COLORS.map(c => {
                        const cfg = CONEXAO_COLOR_CONFIGS[c];
                        return (
                          <Line
                            key={c}
                            type="monotone"
                            dataKey={c}
                            name={cfg.displayName}
                            stroke={cfg.hex}
                            strokeWidth={2.5}
                            dot={{ r: 3.5, fill: cfg.hex }}
                            activeDot={{ r: 5 }}
                          />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Consolidated Comparative Table */}
                <div className="overflow-x-auto bg-[#111111] border border-[#222222] rounded-xl">
                  <table className="w-full text-left text-xs text-zinc-300">
                    <thead className="bg-[#161616] text-zinc-400 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Mês</th>
                        {CONEXAO_COLORS.map(c => (
                          <th key={c} className="py-2.5 px-3 text-right" style={{ color: CONEXAO_COLOR_CONFIGS[c].hex }}>
                            {CONEXAO_COLOR_CONFIGS[c].name}
                          </th>
                        ))}
                        <th className="py-2.5 px-3 text-right text-white">Total Conexão</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1F1F1F]">
                      {comparativeMonthlyData.map(row => (
                        <tr key={row.monthKey} className="hover:bg-[#181818] transition-colors">
                          <td className="py-2 px-3 font-bold text-white">{row.monthKey}</td>
                          {CONEXAO_COLORS.map(c => (
                            <td key={c} className="py-2 px-3 text-right font-mono text-zinc-300">
                              {row[c]}
                            </td>
                          ))}
                          <td className="py-2 px-3 text-right font-black text-amber-300">{row.total}</td>
                        </tr>
                      ))}
                      {/* Total row */}
                      <tr className="bg-[#181818] font-black text-white">
                        <td className="py-3 px-3 uppercase">Total Acumulado</td>
                        {CONEXAO_COLORS.map(c => {
                          const totalCol = (conexaoMonthlyResults[c] || []).reduce(
                            (acc, m) => acc + (m[comparativeMetric] || 0),
                            0
                          );
                          return (
                            <td key={c} className="py-3 px-3 text-right" style={{ color: CONEXAO_COLOR_CONFIGS[c].hex }}>
                              {totalCol}
                            </td>
                          );
                        })}
                        <td className="py-3 px-3 text-right text-amber-400 text-sm">
                          {CONEXAO_COLORS.reduce((acc, c) => {
                            return (
                              acc +
                              (conexaoMonthlyResults[c] || []).reduce((subAcc, m) => subAcc + (m[comparativeMetric] || 0), 0)
                            );
                          }, 0)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =================================================== */}
          {/* GERAL SUBTAB 2: MEMBROS DA IGREJA POR EQUIPE        */}
          {/* =================================================== */}
          {activeGeralSubTab === 'membros_igreja' && (
            <div className="space-y-6">
              <div className="p-6 bg-[#0E0E0E] border border-[#262626] rounded-2xl shadow-xl space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1F1F1F] pb-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5" />
                      Mapeamento de Jovens Integrados na Igreja
                    </span>
                    <h2 className="text-2xl font-black text-white mt-1">
                      Membros da Casa de Deus Dentro de Cada Equipe
                    </h2>
                    <p className="text-xs text-zinc-400">
                      Identificação precisa de quem já é membro ativo da igreja em cada equipe do Conexão Jovem.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setEnrollModalRole('membro');
                      setIsEnrollModalOpen(true);
                    }}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md self-start sm:self-auto"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Vincular Membro ao Conexão</span>
                  </button>
                </div>

                {/* Team distribution counters */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {CONEXAO_COLORS.map(c => {
                    const cfg = CONEXAO_COLOR_CONFIGS[c];
                    const count = colorStats[c].churchMembers.length;
                    return (
                      <button
                        key={c}
                        onClick={() => setGeralChurchMemberTeamFilter(geralChurchMemberTeamFilter === c ? 'all' : c)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          geralChurchMemberTeamFilter === c
                            ? `${cfg.badgeBg} border-current ring-1 ring-white/30 scale-105`
                            : 'bg-[#141414] border-[#242424] text-zinc-400 hover:border-zinc-600'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`w-2.5 h-2.5 rounded-full ${cfg.dotBg}`} />
                          <span className="text-[11px] font-bold text-white truncate">{cfg.name}</span>
                        </div>
                        <p className="text-xl font-black text-white">{count}</p>
                        <span className="text-[10px] text-zinc-500">Membros da igreja</span>
                      </button>
                    );
                  })}
                </div>

                {/* Search & Team Filter Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Buscar por nome, telefone ou base..."
                      className="w-full pl-9 pr-4 py-2 bg-[#121212] border border-[#2B2B2B] rounded-xl text-white text-xs placeholder-zinc-600 focus:outline-none focus:border-white transition-colors"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setGeralChurchMemberTeamFilter('all')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                        geralChurchMemberTeamFilter === 'all'
                          ? 'bg-white text-black'
                          : 'bg-[#141414] text-zinc-400 hover:text-white'
                      }`}
                    >
                      Todas as Equipes
                    </button>
                  </div>
                </div>

                {/* Table of Church Members */}
                <div className="overflow-x-auto bg-[#111111] border border-[#222222] rounded-xl">
                  <table className="w-full text-left text-xs text-zinc-300">
                    <thead className="bg-[#161616] text-zinc-400 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="py-3 px-4">Nome do Membro</th>
                        <th className="py-3 px-4">Equipe / Cor</th>
                        <th className="py-3 px-4">Papel no Conexão</th>
                        <th className="py-3 px-4">Sede / Congregação</th>
                        <th className="py-3 px-4">Telefone / WhatsApp</th>
                        <th className="py-3 px-4 text-right">Ficha Pastoral</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1F1F1F]">
                      {allChurchMembers.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-zinc-500 italic">
                            Nenhum membro da igreja encontrado com os filtros selecionados.
                          </td>
                        </tr>
                      ) : (
                        allChurchMembers.map(m => {
                          const cfg = CONEXAO_COLOR_CONFIGS[m.color];
                          return (
                            <tr key={m.id} className="hover:bg-[#181818] transition-colors">
                              <td className="py-3 px-4 font-bold text-white">
                                <div className="flex items-center gap-2">
                                  <span>{m.name}</span>
                                  <span className="text-[9px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded font-semibold border border-emerald-500/30">
                                    Membro Casa de Deus
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold border" style={{ backgroundColor: `${cfg.hex}15`, borderColor: `${cfg.hex}40`, color: cfg.hex }}>
                                  <span className={`w-2 h-2 rounded-full ${cfg.dotBg}`} />
                                  <span>{cfg.displayName}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-zinc-300 font-medium">
                                {m.role === 'lider'
                                  ? 'Líder da Equipe'
                                  : m.role === 'sublider_base'
                                  ? `Sub-líder (${m.baseName || 'Base'})`
                                  : 'Membro Integrado'}
                              </td>
                              <td className="py-3 px-4 text-zinc-400">{m.congregation}</td>
                              <td className="py-3 px-4">
                                <a
                                  href={getWhatsAppUrl(m.phone)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-emerald-400 hover:underline flex items-center gap-1"
                                >
                                  <Phone className="w-3 h-3" />
                                  <span>{m.phone}</span>
                                </a>
                              </td>
                              <td className="py-3 px-4 text-right">
                                {m.churchContact && onOpenContactDetails ? (
                                  <button
                                    onClick={() => onOpenContactDetails(m.churchContact!)}
                                    className="px-2.5 py-1 bg-[#1C1C1C] hover:bg-[#282828] text-white rounded text-[11px] font-semibold border border-[#333333] inline-flex items-center gap-1"
                                  >
                                    <span>Ver Ficha</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </button>
                                ) : (
                                  <span className="text-zinc-600 text-[10px]">Sem ficha geral</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =================================================== */}
          {/* GERAL SUBTAB 3: PAINEL GERAL DE METAS               */}
          {/* =================================================== */}
          {activeGeralSubTab === 'metas_gerais' && (
            <div className="space-y-6">
              <div className="p-6 bg-[#0E0E0E] border border-[#262626] rounded-2xl shadow-xl space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1F1F1F] pb-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5" />
                      Metas Estratégicas Consolidadas (Admin Master)
                    </span>
                    <h2 className="text-2xl font-black text-white mt-1">
                      Metas de Todas as Equipes do Conexão
                    </h2>
                    <p className="text-xs text-zinc-400">
                      Metas estabelecidas e editadas pelo Pr. Bruno Bitencourt para as 6 equipes.
                    </p>
                  </div>
                </div>

                {/* Table of all 6 teams goals */}
                <div className="overflow-x-auto bg-[#111111] border border-[#222222] rounded-xl">
                  <table className="w-full text-left text-xs text-zinc-300">
                    <thead className="bg-[#161616] text-zinc-400 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="py-3 px-4">Equipe</th>
                        <th className="py-3 px-4 text-right">Meta Convidados (Ano)</th>
                        <th className="py-3 px-4 text-right">Meta Mensal</th>
                        <th className="py-3 px-4 text-right">Meta Membros</th>
                        <th className="py-3 px-4 text-right">Meta Bases</th>
                        <th className="py-3 px-4 text-right">Meta Presença Culto</th>
                        <th className="py-3 px-4 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1F1F1F]">
                      {CONEXAO_COLORS.map(c => {
                        const cfg = CONEXAO_COLOR_CONFIGS[c];
                        const goal = conexaoGoals[c] || {
                          targetGuests: 100,
                          targetGuestsMonth: 10,
                          targetMembers: 40,
                          targetBases: 4,
                          targetWeeklyAttendance: 45,
                        };

                        return (
                          <tr key={c} className="hover:bg-[#181818] transition-colors">
                            <td className="py-3.5 px-4 font-bold text-white">
                              <div className="flex items-center gap-2">
                                <span className={`w-3 h-3 rounded-full ${cfg.dotBg}`} />
                                <span>{cfg.displayName}</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-right font-black text-amber-300 text-sm">
                              {goal.targetGuests}
                            </td>
                            <td className="py-3.5 px-4 text-right font-semibold text-zinc-200">
                              {goal.targetGuestsMonth || 10}/mês
                            </td>
                            <td className="py-3.5 px-4 text-right font-semibold text-emerald-300">
                              {goal.targetMembers}
                            </td>
                            <td className="py-3.5 px-4 text-right font-semibold text-indigo-300">
                              {goal.targetBases}
                            </td>
                            <td className="py-3.5 px-4 text-right font-semibold text-purple-300">
                              {goal.targetWeeklyAttendance} jovens
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              {isAdminOrConexaoLeader && (
                                <button
                                  onClick={() => handleOpenEditGoal(c)}
                                  className="px-3 py-1 bg-[#1F1F1F] hover:bg-white hover:text-black rounded text-[11px] font-bold text-white transition-colors"
                                >
                                  Editar
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =================================================== */}
          {/* GERAL SUBTAB 4: CARDS DAS 6 EQUIPES (SEM PONTOS)   */}
          {/* =================================================== */}
          {activeGeralSubTab === 'equipes' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {CONEXAO_COLORS.map(cId => {
                const cfg = CONEXAO_COLOR_CONFIGS[cId];
                const stats = colorStats[cId];
                return (
                  <div
                    key={cId}
                    className="p-5 bg-[#080808] border border-[#222222] rounded-2xl hover:border-[#383838] transition-all flex flex-col justify-between space-y-4 shadow-lg relative overflow-hidden"
                  >
                    <div
                      className="absolute top-0 left-0 right-0 h-1"
                      style={{ backgroundColor: cfg.hex }}
                    />

                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span
                          className="w-4 h-4 rounded-full shadow-md"
                          style={{ backgroundColor: cfg.hex }}
                        />
                        <div>
                          <h3 className="text-base font-bold text-white capitalize">
                            {cfg.displayName}
                          </h3>
                          <p className="text-xs text-zinc-400">
                            Líder: <strong className="text-zinc-200">{stats.leader?.name || 'A definir'}</strong>
                          </p>
                        </div>
                      </div>

                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded shadow-sm"
                        style={{
                          backgroundColor: `${cfg.hex}25`,
                          color: cfg.hex,
                        }}
                      >
                        {stats.total} Jovens
                      </span>
                    </div>

                    {/* Stats metrics */}
                    <div className="grid grid-cols-3 gap-2 p-3 bg-[#111111] rounded-xl text-center border border-[#1A1A1A]">
                      <div>
                        <span className="text-[10px] text-zinc-500 uppercase font-bold block">
                          Bases
                        </span>
                        <span className="text-base font-black text-indigo-400">
                          {stats.bases.length}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 uppercase font-bold block">
                          Membros
                        </span>
                        <span className="text-base font-black text-emerald-400">
                          {stats.members.length}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 uppercase font-bold block">
                          Convidados
                        </span>
                        <span className="text-base font-black text-amber-300">
                          {stats.guests.length}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-zinc-400">
                      <span>
                        Confirmados culto: <strong className="text-emerald-400">{stats.confirmedGuests}</strong>
                      </span>
                      <span>
                        Membros igreja: <strong className="text-white">{stats.churchMembers.length}</strong>
                      </span>
                    </div>

                    <div className="pt-2 border-t border-[#1C1C1C] flex items-center justify-between gap-2">
                      <button
                        onClick={() => {
                          setActiveColorView(cId);
                          setActiveSubTab('convidados');
                        }}
                        className="flex-1 py-1.5 bg-[#141414] hover:bg-[#202020] text-white border border-[#2A2A2A] rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <span>Acessar Equipe</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleOpenReport(cId)}
                        className="p-1.5 bg-[#141414] hover:bg-[#202020] text-zinc-400 hover:text-white border border-[#2A2A2A] rounded-lg transition-colors"
                        title="Ver Relatório Oficial da Cor"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <ConexaoParticipantModal
        isOpen={isParticipantModalOpen}
        onClose={() => {
          setIsParticipantModalOpen(false);
          setParticipantToEdit(null);
        }}
        participantToEdit={participantToEdit}
        defaultColor={modalDefaultColor}
        defaultRole={modalDefaultRole}
        defaultFunnelStage={modalDefaultFunnelStage}
      />

      {interactionModalParticipant && (
        <ConexaoInteractionModal
          isOpen={true}
          onClose={() => setInteractionModalParticipant(null)}
          participant={interactionModalParticipant}
          onParticipantUpdated={updated => {
            setInteractionModalParticipant(updated);
          }}
        />
      )}

      <EnrollConexaoModal
        isOpen={isEnrollModalOpen}
        onClose={() => setIsEnrollModalOpen(false)}
        defaultColor={activeColorView === 'geral' ? 'verde' : activeColorView}
        defaultRole={enrollModalRole}
      />

      <ConexaoColorReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        color={reportTargetColor}
        participants={unifiedParticipants}
      />

      <ConexaoGoalModal
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        color={goalModalColor}
        currentGoal={conexaoGoals[goalModalColor]}
        onSave={async (col, updates) => {
          await updateConexaoGoal(col, updates);
        }}
      />
    </div>
  );
};
