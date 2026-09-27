import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { useCRM } from '../context/CRMContext';
import { useAuth } from '../context/AuthContext';
import { Contact, ConexaoColor, ConexaoRole, ConexaoMembership } from '../types';
import { CONEXAO_COLORS, CONEXAO_COLOR_CONFIGS, CONEXAO_ROLE_META } from '../utils/conexaoConfig';
import { ConexaoColorBadge } from './ConexaoColorBadge';
import { ConexaoLogo } from './ConexaoLogo';
import {
  Search,
  CheckCircle2,
  Crown,
  Shield,
  Users,
  Sparkles,
  AlertTriangle,
  User,
  X,
  Lock,
} from 'lucide-react';

interface EnrollConexaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  contactToEdit?: Contact | null;
  defaultColor?: ConexaoColor;
  defaultRole?: ConexaoRole;
}

export const EnrollConexaoModal: React.FC<EnrollConexaoModalProps> = ({
  isOpen,
  onClose,
  contactToEdit,
  defaultColor = 'verde',
  defaultRole = 'membro',
}) => {
  const { contacts, conexaoParticipants, enrollInConexao, unenrollFromConexao } = useCRM();
  const { currentUser } = useAuth();
  const isTeamLeader = currentUser?.role === 'lider_equipe';
  const assignedTeamColor = (currentUser?.assignedTeam as ConexaoColor) || undefined;

  const isEditing = !!contactToEdit && !!contactToEdit.conexaoJovem;

  // Selected contact
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Conexão Fields
  const [color, setColor] = useState<ConexaoColor>(
    isTeamLeader && assignedTeamColor ? assignedTeamColor : defaultColor
  );
  const [role, setRole] = useState<ConexaoRole>(defaultRole);
  const [baseName, setBaseName] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmUnenroll, setConfirmUnenroll] = useState(false);

  useEffect(() => {
    const targetColor = isTeamLeader && assignedTeamColor ? assignedTeamColor : defaultColor;
    if (contactToEdit) {
      setSelectedContactId(contactToEdit.id);
      if (contactToEdit.conexaoJovem) {
        setColor(isTeamLeader && assignedTeamColor ? assignedTeamColor : (contactToEdit.conexaoJovem.color || defaultColor));
        setRole(contactToEdit.conexaoJovem.role || defaultRole);
        setBaseName(contactToEdit.conexaoJovem.baseName || '');
      } else {
        setColor(targetColor);
        setRole(contactToEdit.category === 'Membro' ? 'membro' : 'convidado');
        setBaseName('');
      }
    } else {
      setSelectedContactId('');
      setSearchQuery('');
      setColor(targetColor);
      setRole(defaultRole);
      setBaseName('');
    }
    setConfirmUnenroll(false);
    setErrorMsg(null);
    setSuccessMsg(null);
  }, [contactToEdit, isOpen, defaultColor, defaultRole, isTeamLeader, assignedTeamColor]);

  if (!isOpen) return null;

  // Target contact object
  const activeContact = contactToEdit || contacts.find(c => c.id === selectedContactId);

  // Candidate contacts for linking - STRICT RULE: ONLY general church members (category === 'Membro')
  const candidateContacts = contacts.filter(c => {
    if (c.isArchived) return false;
    if (c.category !== 'Membro') return false; // Enforce: must already be a general member in church
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.phone.includes(q);
  });

  // Existing bases for the picked color
  const existingBases = Array.from(
    new Set(
      conexaoParticipants
        .filter(p => p.color === color && p.baseName)
        .map(p => p.baseName as string)
    )
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeContact) {
      setErrorMsg('Selecione um membro geral da igreja para cadastrar na equipe.');
      return;
    }

    if (activeContact.category !== 'Membro') {
      setErrorMsg('Apenas membros já cadastrados no rol de Membros Geral da Casa de Deus podem ser vinculados à equipe.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const finalColor = isTeamLeader && assignedTeamColor ? assignedTeamColor : color;
      const membership: ConexaoMembership = {
        color: finalColor,
        role,
        baseName: baseName.trim() || undefined,
      };

      await enrollInConexao(activeContact.id, membership);
      setSuccessMsg(
        isEditing
          ? 'Dados do Conexão Jovem atualizados com sucesso!'
          : `${activeContact.name} foi vinculado à Equipe ${CONEXAO_COLOR_CONFIGS[finalColor].name.toUpperCase()} do Conexão Jovem!`
      );

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || 'Erro ao vincular membro ao Conexão Jovem.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnenroll = async () => {
    if (!activeContact) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await unenrollFromConexao(activeContact.id);
      setSuccessMsg('Membro desvinculado do Conexão Jovem com sucesso.');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || 'Erro ao desvincular.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedColorCfg = CONEXAO_COLOR_CONFIGS[color];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isEditing
          ? 'Gerenciar Participação no Conexão Jovem'
          : 'Vincular Membro ao Conexão Jovem'
      }
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Banner with youth ministry context */}
        <div className="p-4 bg-gradient-to-r from-[#140E04] via-[#1A1208] to-[#0A0A0A] border border-amber-500/30 rounded-xl flex items-start gap-3">
          <div className="shrink-0 mt-0.5">
            <ConexaoLogo size="sm" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300">
              Conexão Jovem • Cadastro de Membros nas Equipes
            </h3>
            <p className="text-[11px] text-zinc-300 leading-relaxed">
              <strong>Regra Obrigatória:</strong> Apenas pessoas que já são <strong>Membros Gerais da Casa de Deus</strong> podem ser cadastradas e integradas nas equipes por cores (Verde, Vermelha, Laranja, Azul, Amarela e Turquesa).
            </p>
          </div>
        </div>

        {/* Feedback banners */}
        {successMsg && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-rose-950/80 border border-rose-500/50 rounded-xl text-rose-200 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 1. Member Identification */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-300 block">
            Membro da Igreja Principal:
          </label>

          {activeContact ? (
            <div className="p-3 bg-[#111111] border border-[#262626] rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white text-xs font-bold">
                  {activeContact.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{activeContact.name}</span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-zinc-800 text-zinc-300 rounded border border-zinc-700">
                      {activeContact.category}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-zinc-900 text-zinc-400 rounded">
                      {activeContact.congregation}
                    </span>
                  </div>
                  <span className="text-xs text-zinc-400">{activeContact.phone}</span>
                </div>
              </div>

              {!contactToEdit && (
                <button
                  type="button"
                  onClick={() => setSelectedContactId('')}
                  className="text-xs text-zinc-400 hover:text-white underline"
                >
                  Trocar
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Buscar membro por nome ou telefone..."
                  className="w-full pl-9 pr-3 py-2 bg-[#141414] border border-[#2B2B2B] rounded-xl text-white text-xs focus:outline-none focus:border-white transition-colors"
                />
              </div>

              <div className="max-h-40 overflow-y-auto divide-y divide-[#1A1A1A] border border-[#262626] rounded-xl bg-[#0D0D0D]">
                {candidateContacts.slice(0, 6).map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedContactId(c.id);
                      if (c.conexaoJovem) {
                        setColor(c.conexaoJovem.color);
                        setRole(c.conexaoJovem.role);
                        setBaseName(c.conexaoJovem.baseName || '');
                      }
                    }}
                    className="w-full p-2.5 text-left hover:bg-[#161616] transition-colors flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-white block">{c.name}</span>
                      <span className="text-zinc-500 text-[11px]">{c.phone} • {c.congregation}</span>
                    </div>
                    {c.conexaoJovem ? (
                      <ConexaoColorBadge color={c.conexaoJovem.color} role={c.conexaoJovem.role} size="xs" />
                    ) : (
                      <span className="text-[10px] text-zinc-500">Sem equipe</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 2. Color Selection (6 Cores ou Exclusivo da Equipe) */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-300 block">
            Cor da Equipe no Conexão Jovem:
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
              <span className="text-[10px] text-zinc-400 ml-auto flex items-center gap-1">
                <Lock className="w-3 h-3 text-amber-400" />
                Sua equipe autorizada
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CONEXAO_COLORS.map(cId => {
                const cfg = CONEXAO_COLOR_CONFIGS[cId];
                const isSelected = color === cId;
                return (
                  <button
                    key={cId}
                    type="button"
                    onClick={() => setColor(cId)}
                    className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                      isSelected
                        ? `bg-[#141414] border-2 ${cfg.glowClass}`
                        : 'bg-[#0B0B0B] border-[#222222] hover:border-[#383838]'
                    }`}
                    style={{ borderColor: isSelected ? cfg.hex : undefined }}
                  >
                    <span
                      className="w-4 h-4 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: cfg.hex }}
                    />
                    <div className="min-w-0">
                      <span className="text-xs font-black text-white capitalize block leading-tight">
                        {cfg.displayName}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. Role Selection */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-300 block">
            Função / Papel na Equipe:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(['lider', 'sublider_base', 'membro', 'convidado'] as ConexaoRole[]).map(r => {
              const meta = CONEXAO_ROLE_META[r];
              const isSelected = role === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-[#181818] border-white text-white'
                      : 'bg-[#0B0B0B] border-[#222222] text-zinc-400 hover:text-white hover:border-[#333333]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    {r === 'lider' && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                    {r === 'sublider_base' && <Shield className="w-3.5 h-3.5 text-indigo-400" />}
                    {r === 'membro' && <Users className="w-3.5 h-3.5 text-zinc-400" />}
                    {r === 'convidado' && <Sparkles className="w-3.5 h-3.5 text-amber-300" />}
                    <span className="text-xs font-bold">{meta.label}</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 leading-tight">
                    {r === 'lider' && 'Liderança Geral'}
                    {r === 'sublider_base' && 'Sub-líder de Célula/Base'}
                    {r === 'membro' && 'Jovem Integrado'}
                    {r === 'convidado' && 'Visitante em Acolhimento'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Base Name (Optional) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-zinc-300">
              Nome da Base / Célula (Opcional):
            </label>
            {existingBases.length > 0 && (
              <span className="text-[10px] text-zinc-500">
                Bases ativas nesta cor: {existingBases.join(', ')}
              </span>
            )}
          </div>
          <input
            type="text"
            value={baseName}
            onChange={e => setBaseName(e.target.value)}
            placeholder="Ex: Base Conquistadores, Base Leão de Judá, etc."
            className="w-full px-3 py-2 bg-[#141414] border border-[#2B2B2B] rounded-xl text-white text-xs focus:outline-none focus:border-white transition-colors"
          />
        </div>

        {/* Preview Badge */}
        <div className="p-3 bg-[#0A0A0A] border border-[#202020] rounded-xl flex items-center justify-between text-xs">
          <span className="text-zinc-400">Prévia do Selo de Cor:</span>
          <ConexaoColorBadge color={color} role={role} baseName={baseName.trim() || undefined} showRole={true} />
        </div>

        {/* Actions Footer */}
        <div className="pt-3 border-t border-[#222222] flex items-center justify-between gap-3 flex-wrap">
          {isEditing && (
            <div>
              {confirmUnenroll ? (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-rose-400">Confirmar saída?</span>
                  <button
                    type="button"
                    onClick={handleUnenroll}
                    disabled={isSubmitting}
                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs"
                  >
                    Sim, desvincular
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmUnenroll(false)}
                    className="px-2 py-1 text-zinc-400 hover:text-white text-xs"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmUnenroll(true)}
                  className="px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-lg transition-colors border border-rose-900/40"
                >
                  Desvincular do Conexão Jovem
                </button>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#141414] hover:bg-[#1E1E1E] text-zinc-300 text-xs font-medium rounded-xl border border-[#2B2B2B] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !activeContact}
              className="px-5 py-2 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 disabled:opacity-50 text-black font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
            >
              <ConexaoLogo size="xs" />
              <span>{isSubmitting ? 'Salvando...' : 'Salvar no Conexão Jovem'}</span>
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
