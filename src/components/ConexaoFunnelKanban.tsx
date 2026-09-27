import React, { useState, useMemo } from 'react';
import {
  ConexaoParticipant,
  ConexaoFunnelStage,
  ConexaoColor,
  ConexaoRole,
} from '../types';
import { useCRM } from '../context/CRMContext';
import { useAuth } from '../context/AuthContext';
import { getConexaoColorConfig, CONEXAO_COLORS } from '../utils/conexaoConfig';
import { getWhatsAppUrl } from '../utils/phone';
import {
  FUNNEL_STAGES,
  ConexaoInteractionModal,
} from './ConexaoInteractionModal';
import {
  Sparkles,
  Users,
  Search,
  Filter,
  Plus,
  Phone,
  Calendar,
  Clock,
  User,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  MessageSquare,
  Shield,
  Layers,
  Flame,
  HelpCircle,
} from 'lucide-react';

interface ConexaoFunnelKanbanProps {
  participants: ConexaoParticipant[];
  activeColorView?: ConexaoColor | 'geral';
  onOpenAddContact?: (defaultStage?: ConexaoFunnelStage) => void;
  onEditParticipant?: (participant: ConexaoParticipant) => void;
}

export const ConexaoFunnelKanban: React.FC<ConexaoFunnelKanbanProps> = ({
  participants,
  activeColorView = 'geral',
  onOpenAddContact,
  onEditParticipant,
}) => {
  const { updateConexaoParticipant } = useCRM();
  const { currentUser } = useAuth();
  const isTeamLeader = currentUser?.role === 'lider_equipe';
  const assignedTeamColor = currentUser?.assignedTeam as ConexaoColor | undefined;

  // Selected participant for full timeline / interaction modal
  const [selectedParticipantForModal, setSelectedParticipantForModal] =
    useState<ConexaoParticipant | null>(null);

  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterReturnStatus, setFilterReturnStatus] = useState<
    'all' | 'today' | 'overdue' | 'upcoming'
  >('all');
  const [filterTeam, setFilterTeam] = useState<ConexaoColor | 'all'>('all');
  const [filterResponsible, setFilterResponsible] = useState<string>('all');

  // Drag and drop state
  const [draggedParticipantId, setDraggedParticipantId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ConexaoFunnelStage | null>(null);

  // Normalize participants to guarantee 4-stage funnel presence
  const normalizedParticipants = useMemo(() => {
    return (participants || []).map(p => {
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
        responsibleName:
          p.responsibleName || p.baseLeaderName || p.invitedByName || 'Equipe Geral',
      };
    });
  }, [participants]);

  // Extract unique responsible names for filtering
  const responsibleOptions = useMemo(() => {
    const set = new Set<string>();
    normalizedParticipants.forEach(p => {
      if (p.responsibleName) set.add(p.responsibleName);
    });
    return Array.from(set).sort();
  }, [normalizedParticipants]);

  // Filtered participants list
  const filteredParticipants = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];

    return normalizedParticipants.filter(p => {
      // Team restriction: if team leader, strictly their color
      if (isTeamLeader && assignedTeamColor) {
        if (p.color !== assignedTeamColor) return false;
      } else if (activeColorView !== 'geral') {
        if (p.color !== activeColorView) return false;
      } else if (filterTeam !== 'all') {
        if (p.color !== filterTeam) return false;
      }

      // Filter by responsible
      if (filterResponsible !== 'all' && p.responsibleName !== filterResponsible) {
        return false;
      }

      // Filter by return date status
      if (filterReturnStatus !== 'all') {
        if (!p.nextReturnDate) return false;
        if (filterReturnStatus === 'today') {
          if (p.nextReturnDate !== todayStr) return false;
        } else if (filterReturnStatus === 'overdue') {
          if (p.nextReturnDate >= todayStr) return false;
        } else if (filterReturnStatus === 'upcoming') {
          if (p.nextReturnDate <= todayStr) return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesPhone = p.phone.includes(q);
        const matchesBase = p.baseName?.toLowerCase().includes(q) || false;
        const matchesResp = p.responsibleName?.toLowerCase().includes(q) || false;
        const matchesAction = p.nextAction?.toLowerCase().includes(q) || false;
        const matchesLast = p.lastInteraction?.toLowerCase().includes(q) || false;
        return matchesName || matchesPhone || matchesBase || matchesResp || matchesAction || matchesLast;
      }

      return true;
    });
  }, [
    normalizedParticipants,
    isTeamLeader,
    assignedTeamColor,
    activeColorView,
    filterTeam,
    filterResponsible,
    filterReturnStatus,
    searchQuery,
  ]);

  // Group participants by the 4 stages
  const stageGroups = useMemo(() => {
    const groups: Record<ConexaoFunnelStage, ConexaoParticipant[]> = {
      novo_contato: [],
      em_contato: [],
      em_acompanhamento: [],
      integrado: [],
    };

    filteredParticipants.forEach(p => {
      const stage = p.funnelStage || 'novo_contato';
      if (groups[stage]) {
        groups[stage].push(p);
      } else {
        groups.novo_contato.push(p);
      }
    });

    return groups;
  }, [filteredParticipants]);

  // Handle stage change (via drag-and-drop or advance buttons)
  const handleMoveStage = async (
    participantId: string,
    newStage: ConexaoFunnelStage
  ) => {
    try {
      await updateConexaoParticipant(participantId, {
        funnelStage: newStage,
      });
    } catch (e) {
      console.error('Erro ao mover etapa:', e);
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    setDraggedParticipantId(id);
  };

  const handleDragOver = (e: React.DragEvent, stage: ConexaoFunnelStage) => {
    e.preventDefault();
    if (dragOverColumn !== stage) {
      setDragOverColumn(stage);
    }
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStage: ConexaoFunnelStage) => {
    e.preventDefault();
    setDragOverColumn(null);
    const participantId = e.dataTransfer.getData('text/plain') || draggedParticipantId;
    if (participantId) {
      await handleMoveStage(participantId, targetStage);
    }
    setDraggedParticipantId(null);
  };

  // Helper to get return date badge status
  const getReturnDateBadge = (dateStr?: string) => {
    if (!dateStr) return null;
    const today = new Date().toISOString().split('T')[0];
    if (dateStr === today) {
      return {
        label: 'Retorno Hoje!',
        className: 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse',
      };
    }
    if (dateStr < today) {
      return {
        label: `Atrasado (${dateStr.split('-').reverse().slice(0, 2).join('/')})`,
        className: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      };
    }
    return {
      label: `Retorno: ${dateStr.split('-').reverse().slice(0, 2).join('/')}`,
      className: 'bg-zinc-800 text-zinc-300 border-zinc-700',
    };
  };

  // Calculate funnel conversions
  const total = filteredParticipants.length;
  const countNovo = stageGroups.novo_contato.length;
  const countContato = stageGroups.em_contato.length;
  const countAcomp = stageGroups.em_acompanhamento.length;
  const countIntegrado = stageGroups.integrado.length;
  const conversionRate = total > 0 ? Math.round((countIntegrado / total) * 100) : 0;

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Funnel Concept Banner */}
      <div className="p-4 bg-gradient-to-r from-[#141417] to-[#181820] border border-[#272730] rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">
                Funil de Acompanhamento (4 Etapas Principais)
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-black">
                Simplificado
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              O contato avança apenas pelas 4 etapas principais. Eventos como <em>não respondeu, convidado, compareceu</em> são registrados na timeline sem sobrecarregar o funil.
            </p>
          </div>
        </div>

        {onOpenAddContact && (
          <button
            onClick={() => onOpenAddContact('novo_contato')}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl text-xs flex items-center gap-1.5 shrink-0 transition-colors shadow-md self-start md:self-center"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Contato no Funil</span>
          </button>
        )}
      </div>

      {/* Funnel Progress Flow Header */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {FUNNEL_STAGES.map((stg, idx) => {
          const count = stageGroups[stg.id].length;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;

          return (
            <div
              key={stg.id}
              className={`p-3.5 bg-[#0F0F12] border rounded-xl relative overflow-hidden flex flex-col justify-between ${stg.borderClass}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-400 flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${stg.dotColor}`} />
                  {stg.label}
                </span>
                <span className="text-xs font-mono text-zinc-500 font-semibold">{pct}%</span>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-black text-white">{count}</span>
                <span className="text-[10px] text-zinc-500">contatos</span>
              </div>
              {/* Progress mini-bar */}
              <div className="w-full h-1 bg-zinc-800 rounded-full mt-2 overflow-hidden">
                <div
                  className={`h-full ${stg.dotColor}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}

        {/* Total & Conversion Rate Card */}
        <div className="p-3.5 bg-[#141418] border border-zinc-800 rounded-xl flex flex-col justify-between col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-zinc-400 text-[11px] font-bold">
            <span>Taxa de Integração</span>
            <Flame className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-400">{conversionRate}%</span>
            <span className="text-[10px] text-zinc-400">
              <strong className="text-white">{total}</strong> no total
            </span>
          </div>
          <div className="text-[10px] text-zinc-500 truncate mt-1">
            {countIntegrado} integrados na equipe
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-3 bg-[#0F0F12] border border-[#222226] rounded-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome, telefone, base, responsável ou última interação..."
            className="w-full bg-[#16161A] border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Filter by return date status */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <span className="text-[11px] text-zinc-500 whitespace-nowrap flex items-center gap-1">
            <Filter className="w-3 h-3" /> Retorno:
          </span>
          <button
            onClick={() => setFilterReturnStatus('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              filterReturnStatus === 'all'
                ? 'bg-zinc-700 text-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilterReturnStatus('today')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              filterReturnStatus === 'today'
                ? 'bg-amber-500 text-black font-bold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Para Hoje
          </button>
          <button
            onClick={() => setFilterReturnStatus('overdue')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              filterReturnStatus === 'overdue'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Atrasados
          </button>
        </div>

        {/* Responsible filter */}
        {responsibleOptions.length > 0 && (
          <select
            value={filterResponsible}
            onChange={e => setFilterResponsible(e.target.value)}
            className="bg-[#16161A] border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-300 text-xs focus:outline-none focus:border-amber-500"
          >
            <option value="all">Todos os Responsáveis</option>
            {responsibleOptions.map(resp => (
              <option key={resp} value={resp}>
                {resp}
              </option>
            ))}
          </select>
        )}

        {/* Team Color filter if in 'geral' view and not locked to team leader */}
        {activeColorView === 'geral' && !isTeamLeader && (
          <select
            value={filterTeam}
            onChange={e => setFilterTeam(e.target.value as any)}
            className="bg-[#16161A] border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-300 text-xs focus:outline-none focus:border-amber-500"
          >
            <option value="all">Todas as Equipes</option>
            {CONEXAO_COLORS.map(c => {
              const cfg = getConexaoColorConfig(c);
              return (
                <option key={c} value={c}>
                  Equipe {cfg.displayName}
                </option>
              );
            })}
          </select>
        )}
      </div>

      {/* 4-COLUMN KANBAN BOARD */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
        {FUNNEL_STAGES.map((column, colIdx) => {
          const items = stageGroups[column.id];
          const isOver = dragOverColumn === column.id;

          return (
            <div
              key={column.id}
              onDragOver={e => handleDragOver(e, column.id)}
              onDragLeave={handleDragLeave}
              onDrop={e => handleDrop(e, column.id)}
              className={`bg-[#0C0C0E] border rounded-2xl flex flex-col min-h-[580px] max-h-[820px] transition-all ${
                isOver
                  ? 'border-amber-500 bg-amber-500/5 ring-2 ring-amber-500/20'
                  : 'border-[#202024]'
              }`}
            >
              {/* Column Header */}
              <div className="p-3.5 border-b border-[#1E1E22] bg-[#121215] rounded-t-2xl flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${column.dotColor}`} />
                  <div>
                    <h3 className="text-xs font-bold text-white tracking-wide">
                      {column.label}
                    </h3>
                    <p className="text-[10px] text-zinc-500">{column.desc}</p>
                  </div>
                </div>

                <span className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-300 text-xs font-bold flex items-center justify-center border border-zinc-700">
                  {items.length}
                </span>
              </div>

              {/* Column Cards Container */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {items.length === 0 ? (
                  <div className="h-44 border-2 border-dashed border-zinc-800/80 rounded-xl flex flex-col items-center justify-center text-center p-4">
                    <p className="text-xs text-zinc-600 font-medium">Nenhum contato nesta etapa</p>
                    <p className="text-[10px] text-zinc-700 mt-1">
                      Arraste um card para cá ou registre novo
                    </p>
                  </div>
                ) : (
                  items.map(participant => {
                    const colorCfg = getConexaoColorConfig(participant.color);
                    const returnBadge = getReturnDateBadge(participant.nextReturnDate);
                    const interactionCount = participant.interactions?.length || 0;

                    return (
                      <div
                        key={participant.id}
                        draggable
                        onDragStart={e => handleDragStart(e, participant.id)}
                        className="bg-[#141417] border border-[#26262B] hover:border-zinc-600 rounded-xl p-3.5 shadow-md hover:shadow-lg transition-all cursor-grab active:cursor-grabbing group space-y-2.5"
                      >
                        {/* Card Header: Name & Color Team Badge */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
                                {participant.name}
                              </h4>
                            </div>
                            {participant.baseName && (
                              <span className="text-[10px] text-zinc-400 flex items-center gap-1 mt-0.5">
                                <Shield className="w-2.5 h-2.5 text-zinc-500" />
                                {participant.baseName}
                              </span>
                            )}
                          </div>

                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shrink-0 border ${colorCfg.badgeBg}`}
                          >
                            {colorCfg.displayName}
                          </span>
                        </div>

                        {/* Phone & WhatsApp Action */}
                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-zinc-800/60">
                          <a
                            href={getWhatsAppUrl(participant.phone)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 hover:underline font-mono"
                            onClick={e => e.stopPropagation()}
                          >
                            <Phone className="w-3 h-3" />
                            <span>{participant.phone}</span>
                          </a>

                          <span className="text-[10px] text-zinc-500 font-medium">
                            {participant.congregation}
                          </span>
                        </div>

                        {/* Responsible Person */}
                        <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 bg-[#18181D] px-2.5 py-1.5 rounded-lg border border-zinc-800/80">
                          <User className="w-3 h-3 text-indigo-400 shrink-0" />
                          <span className="truncate">
                            Resp: <strong className="text-zinc-200">{participant.responsibleName || 'Não definido'}</strong>
                          </span>
                        </div>

                        {/* Last Interaction Highlight */}
                        <div className="text-[11px] space-y-0.5">
                          <div className="text-zinc-500 text-[10px] flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5 text-amber-400" />
                              Última interação:
                            </span>
                            <span className="text-zinc-600 font-mono">
                              {interactionCount} evento{interactionCount !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <p className="text-zinc-300 font-medium text-[11px] line-clamp-1 bg-[#191920] px-2 py-1 rounded border border-zinc-800/60">
                            {participant.lastInteraction || 'Sem interação recente'}
                          </p>
                        </div>

                        {/* Next Action & Next Return Date */}
                        {(participant.nextAction || participant.nextReturnDate) && (
                          <div className="pt-1.5 border-t border-zinc-800/60 space-y-1">
                            {participant.nextAction && (
                              <p className="text-[11px] text-zinc-400 line-clamp-1">
                                <span className="text-zinc-500 font-semibold">Próx: </span>
                                {participant.nextAction}
                              </p>
                            )}

                            {returnBadge && (
                              <div className="flex items-center justify-between">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${returnBadge.className}`}>
                                  {returnBadge.label}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Card Actions: Open Timeline Modal & Move Stage */}
                        <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between gap-1.5">
                          {/* Previous Stage Button */}
                          {colIdx > 0 ? (
                            <button
                              type="button"
                              onClick={() =>
                                handleMoveStage(
                                  participant.id,
                                  FUNNEL_STAGES[colIdx - 1].id
                                )
                              }
                              title={`Voltar para ${FUNNEL_STAGES[colIdx - 1].label}`}
                              className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
                            >
                              <ArrowLeft className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <div className="w-5" />
                          )}

                          {/* Open Complete Timeline / History Button */}
                          <button
                            type="button"
                            onClick={() => setSelectedParticipantForModal(participant)}
                            className="flex-1 py-1 px-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white rounded-lg text-[10px] font-bold transition-colors flex items-center justify-center gap-1"
                          >
                            <MessageSquare className="w-3 h-3 text-amber-400" />
                            <span>Histórico & Timeline</span>
                          </button>

                          {/* Next Stage Button */}
                          {colIdx < FUNNEL_STAGES.length - 1 ? (
                            <button
                              type="button"
                              onClick={() =>
                                handleMoveStage(
                                  participant.id,
                                  FUNNEL_STAGES[colIdx + 1].id
                                )
                              }
                              title={`Avançar para ${FUNNEL_STAGES[colIdx + 1].label}`}
                              className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <div className="w-5" />
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Interaction & Timeline Modal */}
      {selectedParticipantForModal && (
        <ConexaoInteractionModal
          isOpen={true}
          onClose={() => setSelectedParticipantForModal(null)}
          participant={selectedParticipantForModal}
          onParticipantUpdated={updated => {
            setSelectedParticipantForModal(updated);
          }}
        />
      )}
    </div>
  );
};
