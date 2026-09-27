import React, { useState, useMemo } from 'react';
import {
  ConexaoParticipant,
  ConexaoFunnelStage,
  ConexaoColor,
  CongregationFilter,
} from '../types';
import { useCRM } from '../context/CRMContext';
import { useAuth } from '../context/AuthContext';
import { CONEXAO_COLORS, CONEXAO_COLOR_CONFIGS, getConexaoColorConfig } from '../utils/conexaoConfig';
import { FUNNEL_STAGES, ConexaoInteractionModal } from './ConexaoInteractionModal';
import { getWhatsAppUrl } from '../utils/phone';
import {
  Filter,
  AlertTriangle,
  CheckCircle2,
  ArrowDown,
  TrendingDown,
  TrendingUp,
  Users,
  Clock,
  MessageSquare,
  Calendar,
  ChevronRight,
  Phone,
  AlertCircle,
  Activity,
  Layers,
  Zap,
  Info,
  ExternalLink,
  Crown,
} from 'lucide-react';

interface ConexaoFunnelChartProps {
  participants: ConexaoParticipant[];
  activeColorView?: ConexaoColor | 'geral';
  selectedCongregation?: CongregationFilter;
  onOpenAddContact?: (defaultStage?: ConexaoFunnelStage) => void;
  onSelectStageFilter?: (stage: ConexaoFunnelStage) => void;
}

interface StageMetrics {
  stage: ConexaoFunnelStage;
  label: string;
  count: number;
  pctOfTotal: number;
  conversionFromPrev: number;
  dropFromPrev: number;
  overdueCount: number;
  stalledCount: number;
  participants: ConexaoParticipant[];
}

export const ConexaoFunnelChart: React.FC<ConexaoFunnelChartProps> = ({
  participants,
  activeColorView = 'geral',
  selectedCongregation,
  onOpenAddContact,
  onSelectStageFilter,
}) => {
  const { currentUser } = useAuth();
  const isTeamLeader = currentUser?.role === 'lider_equipe';
  const assignedTeamColor = currentUser?.assignedTeam as ConexaoColor | undefined;

  // Selected participant for timeline modal
  const [selectedParticipantForModal, setSelectedParticipantForModal] =
    useState<ConexaoParticipant | null>(null);

  // Selected stage filter inside chart
  const [selectedStage, setSelectedStage] = useState<ConexaoFunnelStage | null>(null);

  // Team filter if geral
  const [teamFilter, setTeamFilter] = useState<ConexaoColor | 'all'>('all');

  // Filter participants
  const filteredParticipants = useMemo(() => {
    return (participants || []).filter(p => {
      // Team restriction
      if (isTeamLeader && assignedTeamColor) {
        if (p.color !== assignedTeamColor) return false;
      } else if (activeColorView !== 'geral') {
        if (p.color !== activeColorView) return false;
      } else if (teamFilter !== 'all') {
        if (p.color !== teamFilter) return false;
      }

      // Congregation filter
      if (selectedCongregation && selectedCongregation !== 'all') {
        if (p.congregation !== selectedCongregation) return false;
      }

      return true;
    });
  }, [participants, isTeamLeader, assignedTeamColor, activeColorView, teamFilter, selectedCongregation]);

  // Normalize participants to safe funnel stage
  const normalizedParticipants = useMemo(() => {
    return filteredParticipants.map(p => {
      let stage = p.funnelStage;
      if (!stage) {
        if (p.role === 'convidado') {
          stage = p.confirmedNextCulto ? 'em_acompanhamento' : 'novo_contato';
        } else {
          stage = 'integrado';
        }
      }
      return {
        ...p,
        funnelStage: stage,
        responsibleName: p.responsibleName || p.baseLeaderName || p.invitedByName || 'Equipe Geral',
      };
    });
  }, [filteredParticipants]);

  const totalContacts = normalizedParticipants.length;
  const todayStr = new Date().toISOString().split('T')[0];

  // Stage configurations
  const stageDefs: {
    stage: ConexaoFunnelStage;
    label: string;
    sublabel: string;
    color: string;
    gradientFrom: string;
    gradientTo: string;
    strokeColor: string;
    description: string;
  }[] = [
    {
      stage: 'novo_contato',
      label: '1. Novo Contato',
      sublabel: 'Primeira entrada no Conexão',
      color: '#3B82F6',
      gradientFrom: '#1E40AF',
      gradientTo: '#2563EB',
      strokeColor: '#60A5FA',
      description: 'Visitantes e jovens recém-chegados aguardando primeira abordagem.',
    },
    {
      stage: 'em_contato',
      label: '2. Em Contato',
      sublabel: 'Conversa em andamento',
      color: '#F59E0B',
      gradientFrom: '#B45309',
      gradientTo: '#D97706',
      strokeColor: '#FBBF24',
      description: 'Líder iniciou contato via WhatsApp, ligação ou conversa pessoal.',
    },
    {
      stage: 'em_acompanhamento',
      label: '3. Em Acompanhamento',
      sublabel: 'Engajado e convidado',
      color: '#A855F7',
      gradientFrom: '#6B21A8',
      gradientTo: '#9333EA',
      strokeColor: '#C084FC',
      description: 'Participante convidado para cultos, eventos ou bases, confirmando presença.',
    },
    {
      stage: 'integrado',
      label: '4. Integrado',
      sublabel: 'Membro ou Base ativa',
      color: '#10B981',
      gradientFrom: '#065F46',
      gradientTo: '#059669',
      strokeColor: '#34D399',
      description: 'Jovem frequente, encaminhado para célula/base ou batizado/membro.',
    },
  ];

  // Compute metrics for each of the 4 stages
  const stageMetrics: StageMetrics[] = useMemo(() => {
    let runningCount = 0;

    return stageDefs.map((def, idx) => {
      const stageParticipants = normalizedParticipants.filter(p => p.funnelStage === def.stage);
      const count = stageParticipants.length;

      // Overdue returns
      const overdueCount = stageParticipants.filter(p => {
        if (!p.nextReturnDate) return false;
        return p.nextReturnDate < todayStr;
      }).length;

      // Stalled count (last interaction older than 7 days or no interaction)
      const stalledCount = stageParticipants.filter(p => {
        if (!p.lastInteraction && (!p.interactions || p.interactions.length === 0)) return true;
        const lastDateStr = p.interactions && p.interactions.length > 0
          ? p.interactions[p.interactions.length - 1].date
          : p.updatedAt || p.createdAt;
        if (!lastDateStr) return false;
        try {
          const datePart = lastDateStr.split('T')[0];
          const diffMs = new Date().getTime() - new Date(datePart).getTime();
          const diffDays = diffMs / (1000 * 60 * 60 * 24);
          return diffDays > 7;
        } catch {
          return false;
        }
      }).length;

      // Percentage of total entrants
      const pctOfTotal = totalContacts > 0 ? Math.round((count / totalContacts) * 100) : 0;

      // Calculate conversion from previous stage
      let conversionFromPrev = 0;
      let dropFromPrev = 0;

      if (idx === 0) {
        conversionFromPrev = 100;
        dropFromPrev = 0;
      } else {
        const prevMetrics = normalizedParticipants.filter(p => p.funnelStage === stageDefs[idx - 1].stage);
        const prevCount = prevMetrics.length;
        if (prevCount > 0) {
          conversionFromPrev = Math.min(100, Math.round((count / prevCount) * 100));
          dropFromPrev = Math.max(0, 100 - conversionFromPrev);
        } else if (count > 0) {
          conversionFromPrev = 100;
          dropFromPrev = 0;
        } else {
          conversionFromPrev = 0;
          dropFromPrev = 0;
        }
      }

      runningCount += count;

      return {
        stage: def.stage,
        label: def.label,
        count,
        pctOfTotal,
        conversionFromPrev,
        dropFromPrev,
        overdueCount,
        stalledCount,
        participants: stageParticipants,
      };
    });
  }, [normalizedParticipants, totalContacts, todayStr]);

  // Bottleneck detection between transitions (1->2, 2->3, 3->4)
  const transitions = useMemo(() => {
    return [
      {
        from: stageMetrics[0],
        to: stageMetrics[1],
        label: 'Novo Contato → Em Contato',
        lossCount: Math.max(0, stageMetrics[0].count - stageMetrics[1].count),
        rate: stageMetrics[0].count > 0 ? Math.round((stageMetrics[1].count / stageMetrics[0].count) * 100) : 0,
        dropRate: stageMetrics[0].count > 0 ? Math.max(0, 100 - Math.round((stageMetrics[1].count / stageMetrics[0].count) * 100)) : 0,
        tip: 'Gargalo no primeiro contato: agilize o envio da mensagem de boas-vindas nas primeiras 24h após o culto.',
      },
      {
        from: stageMetrics[1],
        to: stageMetrics[2],
        label: 'Em Contato → Em Acompanhamento',
        lossCount: Math.max(0, stageMetrics[1].count - stageMetrics[2].count),
        rate: stageMetrics[1].count > 0 ? Math.round((stageMetrics[2].count / stageMetrics[1].count) * 100) : 0,
        dropRate: stageMetrics[1].count > 0 ? Math.max(0, 100 - Math.round((stageMetrics[2].count / stageMetrics[1].count) * 100)) : 0,
        tip: 'Gargalo no engajamento: faça convite nominal para o culto de sábado ou combine ponto de encontro na igreja.',
      },
      {
        from: stageMetrics[2],
        to: stageMetrics[3],
        label: 'Em Acompanhamento → Integrado',
        lossCount: Math.max(0, stageMetrics[2].count - stageMetrics[3].count),
        rate: stageMetrics[2].count > 0 ? Math.round((stageMetrics[3].count / stageMetrics[2].count) * 100) : 0,
        dropRate: stageMetrics[2].count > 0 ? Math.max(0, 100 - Math.round((stageMetrics[3].count / stageMetrics[2].count) * 100)) : 0,
        tip: 'Gargalo na consolidação: apresente o jovem a um líder de base ou encaminhe para o Uni Reino / discipulado.',
      },
    ];
  }, [stageMetrics]);

  // Identify the most critical bottleneck
  const worstBottleneck = useMemo(() => {
    if (totalContacts === 0) return null;
    const sorted = [...transitions].sort((a, b) => b.dropRate - a.dropRate);
    if (sorted[0] && sorted[0].dropRate > 0) {
      return sorted[0];
    }
    return null;
  }, [transitions, totalContacts]);

  // Conversion from top to bottom
  const globalConversionRate = useMemo(() => {
    if (totalContacts === 0 || stageMetrics[0].count === 0) return 0;
    return Math.round((stageMetrics[3].count / totalContacts) * 100);
  }, [totalContacts, stageMetrics]);

  // Active participants to show in list (either selected stage or worst bottleneck stage)
  const displayStage = selectedStage || (worstBottleneck ? worstBottleneck.from.stage : 'novo_contato');
  const stageToDisplayObj = stageMetrics.find(m => m.stage === displayStage) || stageMetrics[0];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header and Controls */}
      <div className="p-6 bg-[#0E0E0E] border border-[#262626] rounded-2xl shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1F1F1F] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <Filter className="w-4 h-4" />
              </span>
              <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                Monitoramento Visual de Funil • Aspecto Real
              </span>
            </div>
            <h2 className="text-2xl font-black text-white mt-1.5 flex items-center gap-2">
              Gráfico de Funil do Conexão Jovem
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Visualize em formato de funil vertical as 4 etapas principais, identifique gargalos de retenção e acompanhe as taxas de conversão de ponta a ponta.
            </p>
          </div>

          {/* Quick Stats Banner */}
          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
            {!isTeamLeader && activeColorView === 'geral' && (
              <div className="flex items-center gap-1.5 bg-[#141414] border border-[#262626] px-3 py-1.5 rounded-xl text-xs">
                <span className="text-zinc-500 font-medium">Equipe:</span>
                <select
                  value={teamFilter}
                  onChange={e => setTeamFilter(e.target.value as ConexaoColor | 'all')}
                  className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer"
                >
                  <option value="all" className="bg-[#141414]">Todas as 6 Equipes</option>
                  {CONEXAO_COLORS.map(c => (
                    <option key={c} value={c} className="bg-[#141414]">
                      {CONEXAO_COLOR_CONFIGS[c].displayName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {onOpenAddContact && (
              <button
                onClick={() => onOpenAddContact('novo_contato')}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <span>+ Novo Contato</span>
              </button>
            )}
          </div>
        </div>

        {/* Real Mode Zeroed Banner when 0 records */}
        {totalContacts === 0 ? (
          <div className="p-4 bg-blue-950/20 border border-blue-500/30 rounded-xl flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-blue-200">
                Gráfico no teste real zerado (0 cadastros registrados)
              </h4>
              <p className="text-xs text-blue-300/80 leading-relaxed">
                Nenhum participante ou contato cadastrado no momento. O gráfico de funil e os indicadores de conversão estão zerados exatamente como solicitado. Conforme novos contatos forem adicionados pelo botão acima ou importados, o funil preencherá automaticamente as etapas e apontará gargalos em tempo real.
              </p>
            </div>
          </div>
        ) : worstBottleneck ? (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-500 text-black">
                  Gargalo Principal Identificado
                </span>
                <span className="text-xs font-bold text-amber-300">{worstBottleneck.label}</span>
                <span className="text-xs font-mono font-bold text-rose-400">
                  (-{worstBottleneck.dropRate}% de retenção)
                </span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                {worstBottleneck.tip}
              </p>
            </div>
          </div>
        ) : null}

        {/* Key Indicators Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-4 bg-[#141414] border border-[#262626] rounded-xl space-y-1">
            <span className="text-[10px] text-zinc-400 uppercase font-bold flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-blue-400" />
              Total de Contatos no Funil
            </span>
            <div className="text-3xl font-black text-white">{totalContacts}</div>
            <span className="text-[10px] text-zinc-500 block">Jovens monitorados</span>
          </div>

          <div className="p-4 bg-[#141414] border border-[#262626] rounded-xl space-y-1">
            <span className="text-[10px] text-zinc-400 uppercase font-bold flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              Taxa de Integração Final
            </span>
            <div className="text-3xl font-black text-emerald-400">{globalConversionRate}%</div>
            <span className="text-[10px] text-zinc-500 block">
              {stageMetrics[3].count} integrados com sucesso
            </span>
          </div>

          <div className="p-4 bg-[#141414] border border-[#262626] rounded-xl space-y-1">
            <span className="text-[10px] text-zinc-400 uppercase font-bold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              Retornos Vencidos
            </span>
            <div className={`text-3xl font-black ${stageMetrics.reduce((acc, s) => acc + s.overdueCount, 0) > 0 ? 'text-amber-400' : 'text-zinc-500'}`}>
              {stageMetrics.reduce((acc, s) => acc + s.overdueCount, 0)}
            </div>
            <span className="text-[10px] text-zinc-500 block">Data agendada expirada</span>
          </div>

          <div className="p-4 bg-[#141414] border border-[#262626] rounded-xl space-y-1">
            <span className="text-[10px] text-zinc-400 uppercase font-bold flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
              Parados há +7 dias
            </span>
            <div className={`text-3xl font-black ${stageMetrics.reduce((acc, s) => acc + s.stalledCount, 0) > 0 ? 'text-rose-400' : 'text-zinc-500'}`}>
              {stageMetrics.reduce((acc, s) => acc + s.stalledCount, 0)}
            </div>
            <span className="text-[10px] text-zinc-500 block">Sem interação recente</span>
          </div>
        </div>

        {/* ============================================================ */}
        {/* LITERAL FUNNEL VISUALIZATION SECTION                         */}
        {/* ============================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Visual Funnel Canvas (7 cols) */}
          <div className="lg:col-span-7 bg-[#121212] border border-[#222222] p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1E1E1E] pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-400" />
                  Aspecto Visual do Funil (4 Etapas)
                </h3>
                <span className="text-[11px] text-zinc-500">
                  Clique em qualquer camada do funil para inspecionar os participantes
                </span>
              </div>
              <span className="text-[10px] px-2.5 py-1 rounded-full font-bold bg-[#1A1A1A] text-zinc-400 border border-[#2A2A2A]">
                Topo Largo → Base Estreita
              </span>
            </div>

            {/* SVG Literal Funnel Graphic */}
            <div className="relative w-full flex flex-col items-center py-2 select-none">
              <svg
                viewBox="0 0 600 370"
                className="w-full h-auto max-h-[380px] drop-shadow-2xl"
                preserveAspectRatio="xMidYMid meet"
              >
                <defs>
                  {/* Linear gradients for each of the 4 funnel layers */}
                  <linearGradient id="funnelGrad0" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#2563EB" stopOpacity="0.95" />
                    <stop offset="100%" stopColor="#1D4ED8" stopOpacity="0.85" />
                  </linearGradient>
                  <linearGradient id="funnelGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#D97706" stopOpacity="0.95" />
                    <stop offset="100%" stopColor="#B45309" stopOpacity="0.85" />
                  </linearGradient>
                  <linearGradient id="funnelGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#9333EA" stopOpacity="0.95" />
                    <stop offset="100%" stopColor="#7E22CE" stopOpacity="0.85" />
                  </linearGradient>
                  <linearGradient id="funnelGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#059669" stopOpacity="0.95" />
                    <stop offset="100%" stopColor="#047857" stopOpacity="0.85" />
                  </linearGradient>

                  {/* Filter for glow */}
                  <filter id="glowEffect" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* --- STAGE 1: NOVO CONTATO (Top Widest Trapezoid) --- */}
                {/* Coordinates: Top 30..570 (width 540), Bottom 70..530 (width 460), Y: 10..85 */}
                <g
                  className="cursor-pointer transition-all duration-200"
                  onClick={() => setSelectedStage(selectedStage === 'novo_contato' ? null : 'novo_contato')}
                >
                  <polygon
                    points="30,10 570,10 520,85 80,85"
                    fill="url(#funnelGrad0)"
                    stroke={selectedStage === 'novo_contato' ? '#93C5FD' : '#3B82F6'}
                    strokeWidth={selectedStage === 'novo_contato' ? '3' : '1.5'}
                    className="hover:brightness-110 transition-all"
                  />
                  {/* Subtle top rim highlight */}
                  <line x1="30" y1="10" x2="570" y2="10" stroke="#93C5FD" strokeWidth="2.5" strokeOpacity="0.8" />
                  
                  {/* Text inside Stage 1 */}
                  <text x="300" y="38" textAnchor="middle" fill="#FFFFFF" fontSize="15" fontWeight="900" letterSpacing="0.5">
                    NOVO CONTATO
                  </text>
                  <text x="300" y="65" textAnchor="middle" fill="#DBEAFE" fontSize="18" fontWeight="800">
                    {stageMetrics[0].count} {stageMetrics[0].count === 1 ? 'contato' : 'contatos'} ({stageMetrics[0].pctOfTotal}%)
                  </text>
                </g>

                {/* Transition Indicator 1 -> 2 */}
                <g>
                  <polygon points="290,88 310,88 300,97" fill="#60A5FA" />
                  {transitions[0].dropRate > 0 && totalContacts > 0 && (
                    <text x="535" y="93" fill="#F87171" fontSize="11" fontWeight="bold">
                      ⚠️ -{transitions[0].dropRate}% gargalo
                    </text>
                  )}
                </g>

                {/* --- STAGE 2: EM CONTATO (Second Trapezoid) --- */}
                {/* Coordinates: Top 85..515 (width 430), Bottom 145..455 (width 310), Y: 100..175 */}
                <g
                  className="cursor-pointer transition-all duration-200"
                  onClick={() => setSelectedStage(selectedStage === 'em_contato' ? null : 'em_contato')}
                >
                  <polygon
                    points="85,100 515,100 455,175 145,175"
                    fill="url(#funnelGrad1)"
                    stroke={selectedStage === 'em_contato' ? '#FDE68A' : '#F59E0B'}
                    strokeWidth={selectedStage === 'em_contato' ? '3' : '1.5'}
                    className="hover:brightness-110 transition-all"
                  />
                  {/* Text inside Stage 2 */}
                  <text x="300" y="128" textAnchor="middle" fill="#FFFFFF" fontSize="15" fontWeight="900" letterSpacing="0.5">
                    EM CONTATO
                  </text>
                  <text x="300" y="155" textAnchor="middle" fill="#FEF3C7" fontSize="18" fontWeight="800">
                    {stageMetrics[1].count} {stageMetrics[1].count === 1 ? 'contato' : 'contatos'} ({stageMetrics[1].pctOfTotal}%)
                  </text>
                </g>

                {/* Transition Indicator 2 -> 3 */}
                <g>
                  <polygon points="290,178 310,178 300,187" fill="#FBBF24" />
                  {transitions[1].dropRate > 0 && totalContacts > 0 && (
                    <text x="470" y="183" fill="#F87171" fontSize="11" fontWeight="bold">
                      ⚠️ -{transitions[1].dropRate}% gargalo
                    </text>
                  )}
                </g>

                {/* --- STAGE 3: EM ACOMPANHAMENTO (Third Trapezoid) --- */}
                {/* Coordinates: Top 150..450 (width 300), Bottom 210..390 (width 180), Y: 190..265 */}
                <g
                  className="cursor-pointer transition-all duration-200"
                  onClick={() => setSelectedStage(selectedStage === 'em_acompanhamento' ? null : 'em_acompanhamento')}
                >
                  <polygon
                    points="150,190 450,190 390,265 210,265"
                    fill="url(#funnelGrad2)"
                    stroke={selectedStage === 'em_acompanhamento' ? '#E9D5FF' : '#A855F7'}
                    strokeWidth={selectedStage === 'em_acompanhamento' ? '3' : '1.5'}
                    className="hover:brightness-110 transition-all"
                  />
                  {/* Text inside Stage 3 */}
                  <text x="300" y="218" textAnchor="middle" fill="#FFFFFF" fontSize="14" fontWeight="900" letterSpacing="0.5">
                    EM ACOMPANHAMENTO
                  </text>
                  <text x="300" y="245" textAnchor="middle" fill="#F3E8FF" fontSize="17" fontWeight="800">
                    {stageMetrics[2].count} {stageMetrics[2].count === 1 ? 'contato' : 'contatos'} ({stageMetrics[2].pctOfTotal}%)
                  </text>
                </g>

                {/* Transition Indicator 3 -> 4 */}
                <g>
                  <polygon points="290,268 310,268 300,277" fill="#C084FC" />
                  {transitions[2].dropRate > 0 && totalContacts > 0 && (
                    <text x="405" y="273" fill="#F87171" fontSize="11" fontWeight="bold">
                      ⚠️ -{transitions[2].dropRate}% gargalo
                    </text>
                  )}
                </g>

                {/* --- STAGE 4: INTEGRADO (Bottom Spout / Cylinder) --- */}
                {/* Coordinates: Top 215..385 (width 170), Bottom 235..365 (width 130), Y: 280..355 */}
                <g
                  className="cursor-pointer transition-all duration-200"
                  onClick={() => setSelectedStage(selectedStage === 'integrado' ? null : 'integrado')}
                >
                  <polygon
                    points="215,280 385,280 360,355 240,355"
                    fill="url(#funnelGrad3)"
                    stroke={selectedStage === 'integrado' ? '#A7F3D0' : '#10B981'}
                    strokeWidth={selectedStage === 'integrado' ? '3' : '1.5'}
                    className="hover:brightness-110 transition-all"
                  />
                  {/* Base spout rim */}
                  <line x1="240" y1="355" x2="360" y2="355" stroke="#6EE7B7" strokeWidth="2.5" />

                  {/* Text inside Stage 4 */}
                  <text x="300" y="308" textAnchor="middle" fill="#FFFFFF" fontSize="14" fontWeight="900" letterSpacing="0.5">
                    INTEGRADO
                  </text>
                  <text x="300" y="335" textAnchor="middle" fill="#D1FAE5" fontSize="16" fontWeight="800">
                    {stageMetrics[3].count} ({stageMetrics[3].pctOfTotal}%)
                  </text>
                </g>
              </svg>
            </div>

            {/* Stage Selector Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#1C1C1C]">
              {stageDefs.map((def, idx) => {
                const metric = stageMetrics[idx];
                const isSelected = selectedStage === def.stage;
                return (
                  <button
                    key={def.stage}
                    onClick={() => setSelectedStage(isSelected ? null : def.stage)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#1C1C1C] shadow-md border-white/40'
                        : 'bg-[#141414] border-[#222222] hover:border-[#333333]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: def.color }} />
                      <span className="text-[10px] font-mono font-bold text-zinc-400">
                        {metric.count}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-white block mt-1 truncate">
                      {def.label.split('. ')[1]}
                    </span>
                    <span className="text-[10px] text-zinc-500 block truncate">
                      {metric.pctOfTotal}% do funil
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detailed Bottleneck Analysis (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Stage Transition & Drop Diagnostic */}
            <div className="bg-[#121212] border border-[#222222] p-5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#1E1E1E] pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-rose-400" />
                  Diagnóstico de Gargalos por Etapa
                </h3>
                <span className="text-[10px] uppercase font-bold text-zinc-400">
                  Perda vs Retenção
                </span>
              </div>

              <div className="space-y-3">
                {transitions.map((t, idx) => {
                  const isCritical = worstBottleneck?.label === t.label && totalContacts > 0;
                  return (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isCritical
                          ? 'bg-rose-950/20 border-rose-500/40'
                          : 'bg-[#161616] border-[#242424]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          {t.label}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-emerald-400">
                            {t.rate}% conversão
                          </span>
                          {t.dropRate > 0 && totalContacts > 0 && (
                            <span className="text-xs font-mono font-bold text-rose-400">
                              (-{t.dropRate}% perda)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Progress bar of transition */}
                      <div className="w-full h-1.5 bg-[#262626] rounded-full overflow-hidden mt-2">
                        <div
                          className={`h-full transition-all duration-500 rounded-full ${
                            t.dropRate > 40 && totalContacts > 0 ? 'bg-rose-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, t.rate)}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-zinc-400 mt-2">
                        <span>Entraram: <strong>{t.from.count}</strong></span>
                        <span>Avançaram: <strong>{t.to.count}</strong></span>
                        <span className={t.lossCount > 0 ? 'text-rose-400 font-semibold' : 'text-zinc-500'}>
                          Estagnados: <strong>{t.lossCount}</strong>
                        </span>
                      </div>

                      {isCritical && (
                        <div className="mt-2.5 pt-2 border-t border-rose-500/20 text-[11px] text-rose-300/90 flex items-start gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                          <span>{t.tip}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick action card for selected stage */}
            <div className="bg-[#121212] border border-[#222222] p-5 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor:
                        stageDefs.find(s => s.stage === stageToDisplayObj.stage)?.color || '#3B82F6',
                    }}
                  />
                  <h4 className="text-sm font-bold text-white">
                    Participantes em {stageToDisplayObj.label}
                  </h4>
                </div>
                <span className="text-xs font-mono font-bold text-zinc-300">
                  {stageToDisplayObj.count} jovens
                </span>
              </div>

              {stageToDisplayObj.participants.length === 0 ? (
                <div className="p-4 bg-[#161616] border border-[#262626] rounded-xl text-center text-xs text-zinc-500">
                  Nenhum jovem nesta etapa no momento.
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {stageToDisplayObj.participants.slice(0, 8).map(p => {
                    const cfg = getConexaoColorConfig(p.color);
                    const whatsappUrl = getWhatsAppUrl(p.phone, `Olá, ${p.name}! Graça e paz do Conexão Jovem Casa de Deus.`);
                    const isOverdue = p.nextReturnDate && p.nextReturnDate < todayStr;

                    return (
                      <div
                        key={p.id}
                        className="p-2.5 bg-[#161616] hover:bg-[#1C1C1C] border border-[#262626] rounded-xl flex items-center justify-between gap-2 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: cfg.hex }}
                              title={`Equipe ${cfg.displayName}`}
                            />
                            <span className="text-xs font-bold text-white truncate block">
                              {p.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-0.5">
                            <span>Resp: {p.responsibleName}</span>
                            {p.nextReturnDate && (
                              <span className={isOverdue ? 'text-amber-400 font-bold' : 'text-zinc-500'}>
                                Retorno: {p.nextReturnDate.split('-').reverse().slice(0, 2).join('/')}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {p.phone && (
                            <a
                              href={whatsappUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 rounded-lg text-xs transition-colors"
                              title="Enviar WhatsApp"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            onClick={() => setSelectedParticipantForModal(p)}
                            className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs transition-colors cursor-pointer"
                            title="Ver histórico e registrar interação"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {stageToDisplayObj.participants.length > 8 && (
                    <div className="text-center pt-1 text-[11px] text-zinc-500">
                      + {stageToDisplayObj.participants.length - 8} outros contatos nesta etapa
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Interaction Timeline Modal */}
      {selectedParticipantForModal && (
        <ConexaoInteractionModal
          isOpen={!!selectedParticipantForModal}
          onClose={() => setSelectedParticipantForModal(null)}
          participant={selectedParticipantForModal}
        />
      )}
    </div>
  );
};
