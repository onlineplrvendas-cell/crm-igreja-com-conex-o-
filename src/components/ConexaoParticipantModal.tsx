import React, { useState, useEffect, useMemo } from 'react';
import {
  ConexaoParticipant,
  ConexaoColor,
  ConexaoRole,
  Congregation,
  ConexaoFunnelStage,
} from '../types';
import {
  CONEXAO_COLORS,
  CONEXAO_COLOR_CONFIGS,
  CONEXAO_ROLE_META,
} from '../utils/conexaoConfig';
import { useCRM } from '../context/CRMContext';
import { useAuth } from '../context/AuthContext';
import { maskPhoneBR, cleanPhone } from '../utils/phone';
import {
  X,
  User,
  Phone,
  Church,
  Crown,
  Shield,
  Users,
  Sparkles,
  CheckCircle2,
  Calendar,
  Award,
  Search,
  UserCheck,
  AlertCircle,
  Layers,
  Clock,
} from 'lucide-react';

interface ConexaoParticipantModalProps {
  isOpen: boolean;
  onClose: () => void;
  participantToEdit?: ConexaoParticipant | null;
  defaultColor?: ConexaoColor;
  defaultRole?: ConexaoRole;
  defaultFunnelStage?: ConexaoFunnelStage;
}

export const ConexaoParticipantModal: React.FC<ConexaoParticipantModalProps> = ({
  isOpen,
  onClose,
  participantToEdit,
  defaultColor = 'verde',
  defaultRole = 'convidado',
  defaultFunnelStage = 'novo_contato',
}) => {
  const {
    contacts,
    conexaoParticipants,
    addConexaoParticipant,
    updateConexaoParticipant,
    selectedCongregation,
  } = useCRM();
  const { currentUser } = useAuth();
  const isTeamLeader = currentUser?.role === 'lider_equipe';
  const assignedTeamColor = currentUser?.assignedTeam as ConexaoColor | undefined;

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [color, setColor] = useState<ConexaoColor>(isTeamLeader && assignedTeamColor ? assignedTeamColor : defaultColor);
  const [role, setRole] = useState<ConexaoRole>(defaultRole);
  const [congregation, setCongregation] = useState<Congregation>('Recreio');
  const [baseName, setBaseName] = useState('');
  const [baseLeaderId, setBaseLeaderId] = useState('');
  const [invitedByName, setInvitedByName] = useState('');
  const [confirmedNextCulto, setConfirmedNextCulto] = useState(true);
  const [firstVisitDate, setFirstVisitDate] = useState('');
  const [notes, setNotes] = useState('');
  const [points, setPoints] = useState<number>(50);
  const [linkedContactId, setLinkedContactId] = useState<string>('');

  // Funnel 4 stages & follow-up states
  const [funnelStage, setFunnelStage] = useState<ConexaoFunnelStage>(defaultFunnelStage || 'novo_contato');
  const [responsibleName, setResponsibleName] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [nextReturnDate, setNextReturnDate] = useState('');

  // Quick link contact search
  const [contactSearch, setContactSearch] = useState('');
  const [showContactPicker, setShowContactPicker] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset or fill form when opening/editing
  useEffect(() => {
    if (!isOpen) return;

    if (participantToEdit) {
      setName(participantToEdit.name);
      setPhone(participantToEdit.phone);
      setColor(isTeamLeader && assignedTeamColor ? assignedTeamColor : participantToEdit.color);
      setRole(participantToEdit.role);
      setCongregation(participantToEdit.congregation);
      setBaseName(participantToEdit.baseName || '');
      setBaseLeaderId(participantToEdit.baseLeaderId || '');
      setInvitedByName(participantToEdit.invitedByName || '');
      setConfirmedNextCulto(participantToEdit.confirmedNextCulto ?? true);
      setFirstVisitDate(participantToEdit.firstVisitDate || '');
      setNotes(participantToEdit.notes || '');
      setPoints(participantToEdit.points ?? 50);
      setLinkedContactId(participantToEdit.contactId || '');
      setFunnelStage(participantToEdit.funnelStage || (participantToEdit.role === 'convidado' ? 'novo_contato' : 'integrado'));
      setResponsibleName(participantToEdit.responsibleName || participantToEdit.baseLeaderName || participantToEdit.invitedByName || '');
      setNextAction(participantToEdit.nextAction || '');
      setNextReturnDate(participantToEdit.nextReturnDate || '');
    } else {
      setName('');
      setPhone('');
      setColor(isTeamLeader && assignedTeamColor ? assignedTeamColor : defaultColor);
      setRole(defaultRole);
      setCongregation(
        selectedCongregation !== 'all' ? selectedCongregation : 'Recreio'
      );
      setBaseName('');
      setBaseLeaderId('');
      setInvitedByName('');
      setConfirmedNextCulto(true);
      setFirstVisitDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setPoints(defaultRole === 'convidado' ? 50 : 100);
      setLinkedContactId('');
      setFunnelStage(defaultFunnelStage || (defaultRole === 'convidado' ? 'novo_contato' : 'integrado'));
      setResponsibleName(currentUser?.name || '');
      setNextAction('');
      setNextReturnDate('');
    }
    setError(null);
    setShowContactPicker(false);
    setContactSearch('');
  }, [isOpen, participantToEdit, defaultColor, defaultRole, defaultFunnelStage, selectedCongregation, currentUser]);

  // Existing bases for the selected color to make it quick to pick
  const colorBases = useMemo(() => {
    return conexaoParticipants.filter(
      p => p.color === color && p.role === 'sublider_base'
    );
  }, [conexaoParticipants, color]);

  // Existing members or sub-leaders who can invite guests
  const potentialInviters = useMemo(() => {
    return conexaoParticipants.filter(
      p => p.color === color && (p.role === 'membro' || p.role === 'sublider_base' || p.role === 'lider')
    );
  }, [conexaoParticipants, color]);

  // Registered general church members ONLY (category === 'Membro')
  const eligibleChurchMembers = useMemo(() => {
    return contacts.filter(c => !c.isArchived && c.category === 'Membro');
  }, [contacts]);

  // Selected church member object if linked
  const selectedChurchMember = useMemo(() => {
    if (linkedContactId) {
      return eligibleChurchMembers.find(c => c.id === linkedContactId) || null;
    }
    const cleanCurrent = cleanPhone(phone);
    if (cleanCurrent && cleanCurrent.length >= 8) {
      return (
        eligibleChurchMembers.find(
          c => cleanPhone(c.phone) === cleanCurrent || c.name.toLowerCase() === name.trim().toLowerCase()
        ) || null
      );
    }
    return null;
  }, [eligibleChurchMembers, linkedContactId, phone, name]);

  // Filtered church members list for selector
  const filteredChurchMembers = useMemo(() => {
    if (!contactSearch.trim()) return eligibleChurchMembers.slice(0, 8);
    const q = contactSearch.toLowerCase();
    return eligibleChurchMembers
      .filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q))
      .slice(0, 10);
  }, [eligibleChurchMembers, contactSearch]);

  // Filtered church contacts for auto-filling guests
  const filteredContacts = useMemo(() => {
    if (!contactSearch.trim()) return [];
    const q = contactSearch.toLowerCase();
    return contacts
      .filter(c => !c.isArchived && (c.name.toLowerCase().includes(q) || c.phone.includes(q)))
      .slice(0, 5);
  }, [contacts, contactSearch]);

  const handleSelectChurchMember = (contact: (typeof contacts)[0]) => {
    setLinkedContactId(contact.id);
    setName(contact.name);
    setPhone(maskPhoneBR(contact.phone));
    setCongregation(contact.congregation);
    setError(null);
    setContactSearch('');
  };

  const handleSelectContact = (contact: (typeof contacts)[0]) => {
    setLinkedContactId(contact.id);
    setName(contact.name);
    setPhone(maskPhoneBR(contact.phone));
    setCongregation(contact.congregation);
    setShowContactPicker(false);
    setContactSearch('');
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(maskPhoneBR(e.target.value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Por favor informe o nome do jovem.');
      return;
    }
    if (!phone.trim()) {
      setError('Por favor informe um telefone de contato.');
      return;
    }

    // STRICT RULE: If role is team member, sub-leader or leader, must already be general member of the church
    let finalContactId = linkedContactId;
    if (role !== 'convidado') {
      const normInputPhone = cleanPhone(phone);
      const matchedMember = eligibleChurchMembers.find(
        c =>
          c.id === linkedContactId ||
          (normInputPhone && cleanPhone(c.phone) === normInputPhone) ||
          c.name.trim().toLowerCase() === name.trim().toLowerCase()
      );

      if (!matchedMember) {
        setError(
          'Regra Obrigatória: Equipes só conseguem cadastrar membros dentro dela caso já estejam como Membro Geral na igreja. Selecione um membro geral cadastrado da Casa de Deus.'
        );
        return;
      }
      finalContactId = matchedMember.id;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Find selected base leader name if baseLeaderId is set
      let leaderName = '';
      if (baseLeaderId) {
        const bl = colorBases.find(b => b.id === baseLeaderId);
        if (bl) {
          leaderName = bl.name;
          if (!baseName && bl.baseName) {
            setBaseName(bl.baseName);
          }
        }
      }

      if (participantToEdit) {
        await updateConexaoParticipant(participantToEdit.id, {
          name: name.trim(),
          phone: phone.trim(),
          color,
          role,
          congregation,
          baseName: baseName.trim() || undefined,
          baseLeaderId: baseLeaderId || undefined,
          baseLeaderName: leaderName || undefined,
          invitedByName: invitedByName.trim() || undefined,
          confirmedNextCulto,
          firstVisitDate: firstVisitDate || undefined,
          notes: notes.trim() || undefined,
          points: Number(points) || 50,
          contactId: finalContactId || undefined,
          funnelStage,
          responsibleName: responsibleName.trim() || undefined,
          nextAction: nextAction.trim() || undefined,
          nextReturnDate: nextReturnDate.trim() || undefined,
        });
      } else {
        await addConexaoParticipant({
          name: name.trim(),
          phone: phone.trim(),
          color,
          role,
          congregation,
          baseName: baseName.trim() || undefined,
          baseLeaderId: baseLeaderId || undefined,
          baseLeaderName: leaderName || undefined,
          invitedByName: invitedByName.trim() || undefined,
          confirmedNextCulto,
          firstVisitDate: firstVisitDate || new Date().toISOString().split('T')[0],
          notes: notes.trim() || undefined,
          points: Number(points) || (role === 'convidado' ? 50 : 100),
          contactId: finalContactId || undefined,
          funnelStage,
          responsibleName: responsibleName.trim() || undefined,
          nextAction: nextAction.trim() || undefined,
          nextReturnDate: nextReturnDate.trim() || undefined,
        });
      }

      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Erro ao salvar participante no Conexão Jovem.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const currentColorConfig = CONEXAO_COLOR_CONFIGS[color];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#0C0C0C] border border-[#262626] rounded-2xl shadow-2xl p-6 my-8 text-white">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#1F1F1F] pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center border ${currentColorConfig.badgeBg}`}
              style={{ boxShadow: `0 0 15px ${currentColorConfig.hex}40` }}
            >
              <Sparkles className="w-5 h-5" style={{ color: currentColorConfig.hex }} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {participantToEdit ? 'Editar Participante' : 'Novo Integrante / Convidado'}
                <span
                  className="text-xs px-2 py-0.5 rounded border font-semibold"
                  style={{
                    backgroundColor: `${currentColorConfig.hex}20`,
                    borderColor: `${currentColorConfig.hex}50`,
                    color: currentColorConfig.hex,
                  }}
                >
                  {currentColorConfig.displayName}
                </span>
              </h2>
              <p className="text-xs text-[#888888]">
                Conexão Jovem • Ministério de Jovens Casa de Deus
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#888888] hover:text-white rounded-lg hover:bg-[#1A1A1A] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-red-300 text-xs flex items-center gap-2">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Color Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
              1. Cor da Equipe
            </label>
            {isTeamLeader && assignedTeamColor ? (
              <div className="flex items-center gap-2.5 p-3 rounded-xl border border-white/20 bg-zinc-900">
                <span
                  className="w-4 h-4 rounded-full shadow-md"
                  style={{ backgroundColor: CONEXAO_COLOR_CONFIGS[assignedTeamColor].hex }}
                />
                <span className="text-xs font-bold text-white uppercase">
                  {CONEXAO_COLOR_CONFIGS[assignedTeamColor].displayName}
                </span>
                <span className="text-[10px] text-zinc-400 ml-auto">(Sua equipe designada)</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {CONEXAO_COLORS.map(cId => {
                  const cfg = CONEXAO_COLOR_CONFIGS[cId];
                  const isSelected = color === cId;
                  return (
                    <button
                      key={cId}
                      type="button"
                      onClick={() => setColor(cId)}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        isSelected
                          ? `bg-zinc-900 border-2 ${cfg.glowClass}`
                          : 'bg-[#111111] border-[#222222] hover:border-[#333333]'
                      }`}
                      style={{
                        borderColor: isSelected ? cfg.hex : undefined,
                      }}
                    >
                      <span
                        className="w-5 h-5 rounded-full mb-1.5 shadow-md flex items-center justify-center"
                        style={{ backgroundColor: cfg.hex }}
                      >
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-black stroke-[3]" />}
                      </span>
                      <span className="text-xs font-bold text-white capitalize">{cfg.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
              2. Papel na Equipe
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['convidado', 'membro', 'sublider_base', 'lider'] as ConexaoRole[]).map(r => {
                const meta = CONEXAO_ROLE_META[r];
                const isSelected = role === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-[#181818] border-white text-white shadow-md'
                        : 'bg-[#101010] border-[#222222] text-zinc-400 hover:text-white hover:border-[#333333]'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {r === 'lider' && <Crown className="w-4 h-4 text-purple-400" />}
                      {r === 'sublider_base' && <Shield className="w-4 h-4 text-indigo-400" />}
                      {r === 'membro' && <Users className="w-4 h-4 text-emerald-400" />}
                      {r === 'convidado' && <Sparkles className="w-4 h-4 text-amber-400" />}
                      <span className="text-xs font-bold text-white">{meta.shortLabel}</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-tight">{meta.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* If Role is Team Member / Leader: Enforce Church Member Linkage */}
          {role !== 'convidado' ? (
            <div className="bg-[#101713] border border-emerald-500/40 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                  <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Membro Geral da Casa de Deus (Obrigatório)</span>
                </div>
                {selectedChurchMember && !participantToEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      setLinkedContactId('');
                      setName('');
                      setPhone('');
                    }}
                    className="text-xs text-zinc-400 hover:text-white underline"
                  >
                    Selecionar Outro Membro
                  </button>
                )}
              </div>

              <p className="text-[11px] text-zinc-300">
                <strong>Regra Obrigatória:</strong> As equipes só conseguem cadastrar membros que já estejam cadastrados como <strong>Membro Geral</strong> no cadastro principal da igreja.
              </p>

              {selectedChurchMember ? (
                <div className="p-3 bg-[#0B120E] border border-emerald-500/40 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-300 font-bold flex items-center justify-center text-xs border border-emerald-500/40">
                      {selectedChurchMember.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{selectedChurchMember.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          Membro Geral da Igreja
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {selectedChurchMember.phone} • Congregação {selectedChurchMember.congregation}
                      </p>
                    </div>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
                    <input
                      type="text"
                      placeholder="Pesquisar membro geral da igreja por nome ou telefone..."
                      value={contactSearch}
                      onChange={e => setContactSearch(e.target.value)}
                      className="w-full bg-[#0A0A0A] border border-[#2E2E2E] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  <div className="bg-[#0A0A0A] border border-[#262626] rounded-xl divide-y divide-[#181818] max-h-48 overflow-y-auto">
                    {filteredChurchMembers.length === 0 ? (
                      <div className="p-3 text-center text-xs text-zinc-500">
                        Nenhum membro geral encontrado com o termo pesquisado. A pessoa deve ser cadastrada primeiro como "Membro" na aba de Contatos.
                      </div>
                    ) : (
                      filteredChurchMembers.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleSelectChurchMember(c)}
                          className="w-full p-2.5 text-left hover:bg-[#151515] flex items-center justify-between transition-colors text-xs"
                        >
                          <div>
                            <span className="font-bold text-white block">{c.name}</span>
                            <span className="text-[11px] text-zinc-400">{c.phone} • {c.congregation}</span>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-lg border border-emerald-500/40">
                            + Vincular Membro
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Convidado: Optional quick pre-fill from church contacts */
            !participantToEdit && (
              <div className="bg-[#141414] border border-[#222222] rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-zinc-500" />
                    Preencher a partir de contato existente da igreja?
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowContactPicker(!showContactPicker)}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                  >
                    {showContactPicker ? 'Fechar busca' : 'Buscar contato'}
                  </button>
                </div>

                {showContactPicker && (
                  <div className="space-y-2 pt-1">
                    <input
                      type="text"
                      placeholder="Digite o nome ou telefone para puxar dados..."
                      value={contactSearch}
                      onChange={e => setContactSearch(e.target.value)}
                      className="w-full bg-[#0A0A0A] border border-[#2E2E2E] rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                    />
                    {filteredContacts.length > 0 && (
                      <div className="bg-[#0A0A0A] border border-[#2E2E2E] rounded-lg divide-y divide-[#1A1A1A] max-h-36 overflow-y-auto">
                        {filteredContacts.map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => handleSelectContact(c)}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-[#161616] flex items-center justify-between transition-colors"
                          >
                            <div>
                              <p className="font-semibold text-white">{c.name}</p>
                              <p className="text-[11px] text-zinc-400">{c.phone} • {c.congregation}</p>
                            </div>
                            <span className="text-[10px] text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded">
                              {c.category}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          )}

          {/* Personal Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Nome Completo *
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
                <input
                  type="text"
                  required
                  placeholder="Nome do jovem..."
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-[#111111] border border-[#2B2B2B] rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                WhatsApp / Celular *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
                <input
                  type="text"
                  required
                  placeholder="(21) 90000-0000"
                  value={phone}
                  onChange={handlePhoneChange}
                  className="w-full bg-[#111111] border border-[#2B2B2B] rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Congregation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Congregação
              </label>
              <div className="relative">
                <Church className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
                <select
                  value={congregation}
                  onChange={e => setCongregation(e.target.value as Congregation)}
                  className="w-full bg-[#111111] border border-[#2B2B2B] rounded-xl pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-white transition-colors"
                >
                  <option value="Recreio">Recreio</option>
                  <option value="Curicica">Curicica</option>
                  <option value="Guaratiba">Guaratiba</option>
                </select>
              </div>
            </div>

            {/* Role Specific: Base assignment or name */}
            {role === 'sublider_base' ? (
              <div>
                <label className="block text-xs font-medium text-indigo-300 mb-1">
                  Nome da Base / Célula Jovem *
                </label>
                <div className="relative">
                  <Shield className="w-4 h-4 absolute left-3 top-2.5 text-indigo-400" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: Base Alfa, Base Resgate, Base Avivamento..."
                    value={baseName}
                    onChange={e => setBaseName(e.target.value)}
                    className="w-full bg-[#111111] border border-indigo-500/50 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-400 transition-colors"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Vincular à Base da Equipe (Sub-líder)
                </label>
                <select
                  value={baseLeaderId}
                  onChange={e => {
                    setBaseLeaderId(e.target.value);
                    const b = colorBases.find(x => x.id === e.target.value);
                    if (b?.baseName) setBaseName(b.baseName);
                  }}
                  className="w-full bg-[#111111] border border-[#2B2B2B] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-white transition-colors"
                >
                  <option value="">Nenhuma / Sem base definida</option>
                  {colorBases.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.baseName ? `${b.baseName} (${b.name})` : b.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Guest Specific Fields */}
          {role === 'convidado' && (
            <div className="p-4 bg-amber-950/20 border border-amber-500/30 rounded-xl space-y-4">
              <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold">
                <Sparkles className="w-4 h-4" />
                Dados do Convidado (Foco do Conexão Jovem)
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Quem Convidou este Jovem?
                  </label>
                  <input
                    type="text"
                    list="inviters-list"
                    placeholder="Nome do membro ou sub-líder..."
                    value={invitedByName}
                    onChange={e => setInvitedByName(e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-[#2E2E2E] rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-400 transition-colors"
                  />
                  <datalist id="inviters-list">
                    {potentialInviters.map(p => (
                      <option key={p.id} value={`${p.name} (${CONEXAO_ROLE_META[p.role].shortLabel})`} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Data da 1ª Visita / Culto
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
                    <input
                      type="date"
                      value={firstVisitDate}
                      onChange={e => setFirstVisitDate(e.target.value)}
                      className="w-full bg-[#0A0A0A] border border-[#2E2E2E] rounded-xl pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Confirmation for Next Culto */}
              <label className="flex items-center gap-3 p-2.5 bg-black/40 border border-amber-500/20 rounded-lg cursor-pointer hover:bg-black/60 transition-colors">
                <input
                  type="checkbox"
                  checked={confirmedNextCulto}
                  onChange={e => setConfirmedNextCulto(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
                <div>
                  <span className="text-xs font-semibold text-white">
                    Presença confirmada para o próximo Culto Conexão Jovem?
                  </span>
                  <p className="text-[11px] text-zinc-400">
                    Marca o convidado como presença confirmada no relatório semanal da cor.
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* Funil do Conexão Jovem (4 Etapas Principais) */}
          <div className="p-4 bg-[#141417] border border-[#272730] rounded-xl space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                Funil de Acompanhamento (4 Etapas Principais)
              </span>
              <span className="text-[10px] text-zinc-400 font-mono">Conexão Jovem</span>
            </div>

            {/* 4 stage selector buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'novo_contato', label: 'Novo contato', color: 'border-sky-500 bg-sky-500/10 text-sky-300' },
                { id: 'em_contato', label: 'Em contato', color: 'border-amber-500 bg-amber-500/10 text-amber-300' },
                { id: 'em_acompanhamento', label: 'Em acompanhamento', color: 'border-indigo-500 bg-indigo-500/10 text-indigo-300' },
                { id: 'integrado', label: 'Integrado', color: 'border-emerald-500 bg-emerald-500/10 text-emerald-300' },
              ].map(stg => (
                <button
                  key={stg.id}
                  type="button"
                  onClick={() => setFunnelStage(stg.id as ConexaoFunnelStage)}
                  className={`p-2 rounded-lg border text-center transition-all ${
                    funnelStage === stg.id
                      ? `${stg.color} ring-1 ring-white/30 font-bold shadow`
                      : 'bg-[#18181B] border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <p className="text-xs font-bold">{stg.label}</p>
                </button>
              ))}
            </div>

            {/* Follow-up Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="block text-zinc-400 text-[11px] font-medium mb-1">
                  Responsável pelo Contato
                </label>
                <input
                  type="text"
                  placeholder="Nome do líder ou voluntário"
                  value={responsibleName}
                  onChange={e => setResponsibleName(e.target.value)}
                  className="w-full bg-[#18181B] border border-zinc-700/80 rounded-lg px-2.5 py-1.5 text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 text-[11px] font-medium mb-1">
                  Próxima Ação
                </label>
                <input
                  type="text"
                  placeholder="Ex: Ligar na sexta-feira"
                  value={nextAction}
                  onChange={e => setNextAction(e.target.value)}
                  className="w-full bg-[#18181B] border border-zinc-700/80 rounded-lg px-2.5 py-1.5 text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-amber-500"
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
                  className="w-full bg-[#18181B] border border-zinc-700/80 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Observações / Detalhes Adicionais
            </label>
            <input
              type="text"
              placeholder="Ex: Quer participar do louvor, amigo de escola, pediu oração..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full bg-[#111111] border border-[#2B2B2B] rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white transition-colors"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1F1F1F]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white rounded-xl hover:bg-[#1A1A1A] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-semibold rounded-xl text-black bg-white hover:bg-zinc-200 transition-colors shadow-md flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? 'Salvando...' : participantToEdit ? 'Atualizar Participante' : 'Salvar no Conexão'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
