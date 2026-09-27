import React, { useState } from 'react';
import {
  ConexaoParticipant,
  ConexaoFunnelStage,
  ConexaoInteraction,
} from '../types';
import { useCRM } from '../context/CRMContext';
import { useAuth } from '../context/AuthContext';
import { getConexaoColorConfig } from '../utils/conexaoConfig';
import { getWhatsAppUrl } from '../utils/phone';
import {
  X,
  Clock,
  Calendar,
  User,
  Phone,
  MessageSquare,
  ArrowRight,
  Plus,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Send,
  Trash2,
  ExternalLink,
  ChevronRight,
  Tag,
} from 'lucide-react';

interface ConexaoInteractionModalProps {
  isOpen: boolean;
  onClose: () => void;
  participant: ConexaoParticipant | null;
  onParticipantUpdated?: (updated: ConexaoParticipant) => void;
}

export const FUNNEL_STAGES: {
  id: ConexaoFunnelStage;
  label: string;
  desc: string;
  badgeClass: string;
  borderClass: string;
  dotColor: string;
}[] = [
  {
    id: 'novo_contato',
    label: 'Novo contato',
    desc: 'Primeiro registro na base ou indicação',
    badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    borderClass: 'border-sky-500/50',
    dotColor: 'bg-sky-400',
  },
  {
    id: 'em_contato',
    label: 'Em contato',
    desc: 'Conversa iniciada, convite ou mensagens ativas',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    borderClass: 'border-amber-500/50',
    dotColor: 'bg-amber-400',
  },
  {
    id: 'em_acompanhamento',
    label: 'Em acompanhamento',
    desc: 'Interesse mútuo, presença em cultos ou alinhamento',
    badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    borderClass: 'border-indigo-500/50',
    dotColor: 'bg-indigo-400',
  },
  {
    id: 'integrado',
    label: 'Integrado',
    desc: 'Participando ativamente da base e cultos da equipe',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    borderClass: 'border-emerald-500/50',
    dotColor: 'bg-emerald-400',
  },
];

// Presets requested by user
export const SITUATION_PRESETS: {
  id: string;
  label: string;
  iconName: string;
  colorClass: string;
}[] = [
  { id: 'nao_respondeu', label: 'não respondeu', iconName: 'bell-off', colorClass: 'bg-rose-500/10 text-rose-300 border-rose-500/30' },
  { id: 'respondeu', label: 'respondeu', iconName: 'message-circle', colorClass: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' },
  { id: 'convidado_culto', label: 'convidado para o culto', iconName: 'send', colorClass: 'bg-blue-500/10 text-blue-300 border-blue-500/30' },
  { id: 'confirmou_presenca', label: 'confirmou presença', iconName: 'check', colorClass: 'bg-amber-500/10 text-amber-300 border-amber-500/30' },
  { id: 'faltou', label: 'faltou', iconName: 'x-circle', colorClass: 'bg-red-500/10 text-red-300 border-red-500/30' },
  { id: 'compareceu', label: 'compareceu', iconName: 'sparkles', colorClass: 'bg-teal-500/10 text-teal-300 border-teal-500/30' },
  { id: 'demonstrou_interesse', label: 'demonstrou interesse', iconName: 'star', colorClass: 'bg-purple-500/10 text-purple-300 border-purple-500/30' },
  { id: 'retorno_agendado', label: 'retorno agendado', iconName: 'calendar', colorClass: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30' },
  { id: 'sem_interesse', label: 'sem interesse', iconName: 'slash', colorClass: 'bg-zinc-800 text-zinc-400 border-zinc-700' },
  { id: 'whatsapp_enviado', label: 'WhatsApp enviado', iconName: 'phone', colorClass: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' },
  { id: 'visita_base', label: 'visita na base', iconName: 'home', colorClass: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30' },
];

export const ConexaoInteractionModal: React.FC<ConexaoInteractionModalProps> = ({
  isOpen,
  onClose,
  participant,
  onParticipantUpdated,
}) => {
  const { updateConexaoParticipant } = useCRM();
  const { currentUser } = useAuth();

  const [currentStage, setCurrentStage] = useState<ConexaoFunnelStage>('novo_contato');
  const [responsibleName, setResponsibleName] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [nextReturnDate, setNextReturnDate] = useState('');

  // Form to record new situation/interaction
  const [selectedSituation, setSelectedSituation] = useState('respondeu');
  const [customSituation, setCustomSituation] = useState('');
  const [interactionDate, setInteractionDate] = useState('');
  const [interactionNotes, setInteractionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Sync state whenever participant changes
  React.useEffect(() => {
    if (!participant) return;
    setCurrentStage(
      participant.funnelStage || (participant.role === 'convidado' ? 'novo_contato' : 'integrado')
    );
    setResponsibleName(
      participant.responsibleName || participant.baseLeaderName || participant.invitedByName || currentUser?.name || ''
    );
    setNextAction(participant.nextAction || '');
    setNextReturnDate(participant.nextReturnDate || '');

    // Default interaction date to current day in DD/MM
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    setInteractionDate(`${day}/${month}`);
    setSelectedSituation('respondeu');
    setCustomSituation('');
    setInteractionNotes('');
    setSuccessNotice(null);
  }, [participant, currentUser]);

  if (!isOpen || !participant) return null;

  const colorConfig = getConexaoColorConfig(participant.color);
  const interactions = participant.interactions || [];

  const handleStageChange = async (newStage: ConexaoFunnelStage) => {
    try {
      setCurrentStage(newStage);
      const updated = await updateConexaoParticipant(participant.id, {
        funnelStage: newStage,
      });
      if (onParticipantUpdated) onParticipantUpdated(updated);
      setSuccessNotice(`Etapa alterada para: ${FUNNEL_STAGES.find(s => s.id === newStage)?.label}`);
      setTimeout(() => setSuccessNotice(null), 3000);
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleSaveDetails = async () => {
    try {
      setIsSubmitting(true);
      const updated = await updateConexaoParticipant(participant.id, {
        funnelStage: currentStage,
        responsibleName: responsibleName.trim() || undefined,
        nextAction: nextAction.trim() || undefined,
        nextReturnDate: nextReturnDate.trim() || undefined,
      });
      if (onParticipantUpdated) onParticipantUpdated(updated);
      setSuccessNotice('Dados de acompanhamento salvos!');
      setTimeout(() => setSuccessNotice(null), 3000);
    } catch (e: any) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddInteraction = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalSituation = selectedSituation === 'custom' ? customSituation.trim() : selectedSituation;
    if (!finalSituation) return;

    try {
      setIsSubmitting(true);
      const newInteraction: ConexaoInteraction = {
        id: `int-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        date: interactionDate.trim() || 'Hoje',
        situation: finalSituation,
        notes: interactionNotes.trim() || undefined,
        registeredBy: currentUser?.name || responsibleName || 'Líder',
        createdAt: new Date().toISOString(),
      };

      const updatedHistory = [...(participant.interactions || []), newInteraction];
      const lastSummary = `${newInteraction.date} - ${newInteraction.situation}`;

      const updates: Partial<ConexaoParticipant> = {
        interactions: updatedHistory,
        lastInteraction: lastSummary,
        funnelStage: currentStage,
        responsibleName: responsibleName.trim() || undefined,
        nextAction: nextAction.trim() || undefined,
        nextReturnDate: nextReturnDate.trim() || undefined,
      };

      const updated = await updateConexaoParticipant(participant.id, updates);
      if (onParticipantUpdated) onParticipantUpdated(updated);

      setInteractionNotes('');
      setCustomSituation('');
      setSuccessNotice(`Interação registrada no histórico: "${finalSituation}"!`);
      setTimeout(() => setSuccessNotice(null), 3500);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteInteraction = async (interactionId: string) => {
    try {
      const updatedHistory = (participant.interactions || []).filter(i => i.id !== interactionId);
      const last = updatedHistory.length > 0 ? updatedHistory[updatedHistory.length - 1] : null;
      const lastSummary = last ? `${last.date} - ${last.situation}` : '';

      const updated = await updateConexaoParticipant(participant.id, {
        interactions: updatedHistory,
        lastInteraction: lastSummary,
      });
      if (onParticipantUpdated) onParticipantUpdated(updated);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#0F0F10] border border-[#27272A] rounded-2xl shadow-2xl overflow-hidden my-6 max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#222225] bg-[#141416] flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-md border ${colorConfig.badgeBg}`}>
              {participant.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">{participant.name}</h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${colorConfig.badgeBg}`}>
                  Equipe {colorConfig.displayName}
                </span>
                {participant.baseName && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
                    Base: {participant.baseName}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1">
                <a
                  href={getWhatsAppUrl(participant.phone)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 hover:underline"
                >
                  <Phone className="w-3 h-3" />
                  <span>{participant.phone}</span>
                </a>
                <span>•</span>
                <span>Congregação: <strong className="text-zinc-300">{participant.congregation}</strong></span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success alert banner */}
        {successNotice && (
          <div className="px-4 py-2 bg-emerald-500/10 border-b border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Modal Body: Two columns layout */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN: 4 Funnel Stages & Next Actions (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            {/* 4 Funnel Stages Selector */}
            <div className="bg-[#141416] border border-[#242428] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Etapa Atual do Funil (4 Etapas)
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">Clique para alterar</span>
              </div>

              <div className="space-y-2">
                {FUNNEL_STAGES.map((stg, idx) => {
                  const isActive = currentStage === stg.id;
                  return (
                    <button
                      key={stg.id}
                      type="button"
                      onClick={() => handleStageChange(stg.id)}
                      className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                        isActive
                          ? `${stg.badgeClass} ring-1 ring-white/20 shadow-md`
                          : 'bg-[#18181B] border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          isActive ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-400'
                        }`}>
                          {idx + 1}
                        </span>
                        <div>
                          <p className={`text-xs font-bold ${isActive ? 'text-white' : 'text-zinc-300'}`}>
                            {stg.label}
                          </p>
                          <p className="text-[10px] text-zinc-500 leading-tight">
                            {stg.desc}
                          </p>
                        </div>
                      </div>
                      {isActive && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Follow-up Fields (Responsável, Próxima Ação, Próxima Data) */}
            <div className="bg-[#141416] border border-[#242428] rounded-xl p-4 space-y-3.5">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-400" />
                Dados do Acompanhamento
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-zinc-400 text-[11px] font-medium mb-1">
                    Responsável pelo Contato
                  </label>
                  <input
                    type="text"
                    value={responsibleName}
                    onChange={e => setResponsibleName(e.target.value)}
                    placeholder="Nome do líder ou voluntário responsável"
                    className="w-full bg-[#18181B] border border-zinc-700/80 rounded-lg px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] font-medium mb-1">
                    Próxima Ação Planejada
                  </label>
                  <input
                    type="text"
                    value={nextAction}
                    onChange={e => setNextAction(e.target.value)}
                    placeholder="Ex: Ligar na sexta-feira para alinhar carona"
                    className="w-full bg-[#18181B] border border-zinc-700/80 rounded-lg px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] font-medium mb-1">
                    Próxima Data de Retorno
                  </label>
                  <input
                    type="date"
                    value={nextReturnDate}
                    onChange={e => setNextReturnDate(e.target.value)}
                    className="w-full bg-[#18181B] border border-zinc-700/80 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 text-xs"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSaveDetails}
                  disabled={isSubmitting}
                  className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Salvar Dados de Acompanhamento</span>
                </button>
              </div>
            </div>

            {/* Quick WhatsApp Contact Link */}
            <a
              href={getWhatsAppUrl(
                participant.phone,
                `Olá ${participant.name.split(' ')[0]}! Aqui é da equipe Conexão Jovem da Casa de Deus. Como você está?`
              )}
              target="_blank"
              rel="noreferrer"
              className="w-full py-2.5 px-4 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 rounded-xl text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 transition-all"
            >
              <Phone className="w-4 h-4 text-emerald-400" />
              <span>Abrir Conversa no WhatsApp</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </a>
          </div>

          {/* RIGHT COLUMN: Register Interaction & Full Timeline History (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            {/* Register New Interaction Box */}
            <div className="bg-[#141416] border border-[#242428] rounded-xl p-4 sm:p-5 space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                  Registrar Nova Situação no Histórico
                </h3>
                <span className="text-[10px] text-zinc-500">Mantém a etapa principal limpa</span>
              </div>

              <form onSubmit={handleAddInteraction} className="space-y-3">
                {/* Situation Preset Buttons */}
                <div>
                  <label className="block text-zinc-400 text-[11px] font-medium mb-1.5">
                    Selecione a situação da interação:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {SITUATION_PRESETS.map(preset => {
                      const isSelected = selectedSituation === preset.label;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            setSelectedSituation(preset.label);
                            setCustomSituation('');
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                            isSelected
                              ? 'bg-amber-500 text-black border-amber-400 font-bold shadow-sm'
                              : 'bg-[#18181B] text-zinc-400 border-zinc-800 hover:text-white hover:bg-zinc-800'
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setSelectedSituation('custom')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                        selectedSituation === 'custom'
                          ? 'bg-amber-500 text-black border-amber-400 font-bold shadow-sm'
                          : 'bg-[#18181B] text-zinc-400 border-zinc-800 hover:text-white hover:bg-zinc-800'
                      }`}
                    >
                      Outra situação...
                    </button>
                  </div>
                </div>

                {/* Custom situation input if selected */}
                {selectedSituation === 'custom' && (
                  <div>
                    <input
                      type="text"
                      value={customSituation}
                      onChange={e => setCustomSituation(e.target.value)}
                      placeholder="Digite a situação (ex: Reagendou para próxima semana, etc.)"
                      className="w-full bg-[#18181B] border border-amber-500/50 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none"
                      autoFocus
                    />
                  </div>
                )}

                {/* Date & Note */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-1">
                    <label className="block text-zinc-400 text-[11px] font-medium mb-1">
                      Data (ex: 20/09)
                    </label>
                    <input
                      type="text"
                      value={interactionDate}
                      onChange={e => setInteractionDate(e.target.value)}
                      placeholder="DD/MM"
                      className="w-full bg-[#18181B] border border-zinc-700/80 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-zinc-400 text-[11px] font-medium mb-1">
                      Detalhes adicionais (opcional)
                    </label>
                    <input
                      type="text"
                      value={interactionNotes}
                      onChange={e => setInteractionNotes(e.target.value)}
                      placeholder="Ex: Disse que vai com o amigo no culto das 19h30"
                      className="w-full bg-[#18181B] border border-zinc-700/80 rounded-lg px-3 py-1.5 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Adicionar ao Histórico</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Complete Timeline / Interaction History */}
            <div className="bg-[#141416] border border-[#242428] rounded-xl p-4 sm:p-5 space-y-3.5">
              <div className="flex items-center justify-between border-b border-[#222225] pb-2.5">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  Histórico Completo de Interações ({interactions.length})
                </h3>
                <span className="text-[10px] text-zinc-400">Linha do tempo cronológica</span>
              </div>

              {interactions.length === 0 ? (
                <div className="py-8 text-center text-zinc-500 text-xs italic">
                  Nenhuma interação registrada ainda. Use o formulário acima para registrar o histórico.
                </div>
              ) : (
                <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-800">
                  {interactions.map((item, idx) => (
                    <div key={item.id || idx} className="relative group">
                      {/* Timeline dot */}
                      <div className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-amber-500 ring-4 ring-[#141416]" />

                      <div className="p-3 bg-[#18181B] border border-zinc-800/80 rounded-xl hover:border-zinc-700 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-baseline gap-2">
                            <span className="text-xs font-bold text-amber-400 font-mono">
                              {item.date}
                            </span>
                            <span className="text-zinc-500 text-[10px]">•</span>
                            <span className="text-xs font-semibold text-white capitalize">
                              {item.situation}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteInteraction(item.id)}
                            className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-rose-400 transition-opacity p-0.5"
                            title="Remover evento do histórico"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {item.notes && (
                          <p className="text-xs text-zinc-300 mt-1 pl-1 border-l-2 border-zinc-700">
                            {item.notes}
                          </p>
                        )}

                        {item.registeredBy && (
                          <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 mt-1.5">
                            <User className="w-2.5 h-2.5" />
                            <span>Registrado por: {item.registeredBy}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#222225] bg-[#141416] flex items-center justify-between">
          <p className="text-[11px] text-zinc-500 hidden sm:block">
            Todas as alterações são sincronizadas com a equipe {colorConfig.displayName}.
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-white hover:bg-zinc-200 text-black font-bold rounded-xl text-xs transition-colors ml-auto shadow"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
