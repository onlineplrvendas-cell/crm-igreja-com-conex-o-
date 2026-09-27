import React, { useState, useMemo, useEffect } from 'react';
import { useCRM } from '../context/CRMContext';
import { useAuth } from '../context/AuthContext';
import { Contact, CuricicaFamily, CURICICA_FAMILIES } from '../types';
import { getUserPermissions } from '../utils/permissions';
import {
  Users,
  Home,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Phone,
  Search,
  Plus,
  Download,
  Calendar,
  MessageCircle,
  Eye,
  Crown,
  Sparkles,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { exportWeeklyConfirmationsToCSV } from '../utils/export';

interface CuricicaFamiliesPageProps {
  onOpenContactDetails: (contact: Contact) => void;
  onOpenNewContact: (defaultFamily?: CuricicaFamily) => void;
  onOpenNewInteraction: (contact: Contact) => void;
}

type CuricicaTab = 'visao_geral' | CuricicaFamily;

export const CuricicaFamiliesPage: React.FC<CuricicaFamiliesPageProps> = ({
  onOpenContactDetails,
  onOpenNewContact,
  onOpenNewInteraction,
}) => {
  const { contacts, updateContact } = useCRM();
  const { currentUser } = useAuth();
  const perms = getUserPermissions(currentUser);

  // Available tabs based on permissions
  const availableTabs = useMemo(() => {
    const tabs: { id: CuricicaTab; label: string; icon?: React.ComponentType<{ className?: string }> }[] = [];
    if (perms.isMaster || perms.isCuricicaAdmin) {
      tabs.push({ id: 'visao_geral', label: 'Visão Geral', icon: Crown });
    }
    if (perms.authorizedCuricicaFamilies.includes('familia_1')) {
      tabs.push({ id: 'familia_1', label: 'Família 1', icon: Home });
    }
    if (perms.authorizedCuricicaFamilies.includes('familia_2')) {
      tabs.push({ id: 'familia_2', label: 'Família 2', icon: Home });
    }
    if (perms.authorizedCuricicaFamilies.includes('familia_3')) {
      tabs.push({ id: 'familia_3', label: 'Família 3', icon: Home });
    }
    return tabs;
  }, [perms]);

  // Default active tab: first authorized tab
  const [activeTab, setActiveTab] = useState<CuricicaTab>(() => {
    if (perms.isFamilyLeader && perms.curicicaFamilyRestricted) {
      return perms.curicicaFamilyRestricted;
    }
    return 'visao_geral';
  });

  // Guard: if current tab is not authorized, switch to first available tab
  useEffect(() => {
    const tabExists = availableTabs.some(t => t.id === activeTab);
    if (!tabExists && availableTabs.length > 0) {
      setActiveTab(availableTabs[0].id);
    }
  }, [availableTabs, activeTab]);

  // Search and filters for the family view
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'Membro' | 'Visitante' | 'Novo contato'>('all');
  const [presenceFilter, setPresenceFilter] = useState<'all' | 'confirmed' | 'pending'>('all');
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  // Curicica scoped contacts
  const curicicaContacts = useMemo(() => {
    return contacts.filter(c => !c.isArchived && c.congregation === 'Curicica');
  }, [contacts]);

  // Stats for the 3 families
  const familyStats = useMemo(() => {
    const getStats = (fam: CuricicaFamily) => {
      const famContacts = curicicaContacts.filter(c => c.curicicaFamily === fam);
      const members = famContacts.filter(c => c.category === 'Membro');
      const visitors = famContacts.filter(c => c.category === 'Visitante' || c.category === 'Novo contato');
      const confirmed = famContacts.filter(c => c.confirmedThisWeek);
      const rate = famContacts.length > 0 ? Math.round((confirmed.length / famContacts.length) * 100) : 0;
      return {
        total: famContacts.length,
        members: members.length,
        visitors: visitors.length,
        confirmed: confirmed.length,
        rate,
        contacts: famContacts,
      };
    };

    return {
      familia_1: getStats('familia_1'),
      familia_2: getStats('familia_2'),
      familia_3: getStats('familia_3'),
      totalAll: curicicaContacts.length,
    };
  }, [curicicaContacts]);

  // Filtered contacts for active family tab
  const currentFamilyContacts = useMemo(() => {
    if (activeTab === 'visao_geral') return [];
    return curicicaContacts.filter(c => {
      if (c.curicicaFamily !== activeTab) return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesName = c.name.toLowerCase().includes(term);
        const matchesPhone = c.phone.includes(term);
        if (!matchesName && !matchesPhone) return false;
      }

      if (categoryFilter !== 'all' && c.category !== categoryFilter) {
        return false;
      }

      if (presenceFilter === 'confirmed' && !c.confirmedThisWeek) return false;
      if (presenceFilter === 'pending' && c.confirmedThisWeek) return false;

      return true;
    });
  }, [curicicaContacts, activeTab, searchTerm, categoryFilter, presenceFilter]);

  // Fast toggle confirmation
  const handleToggleConfirmation = async (contact: Contact) => {
    const nextStatus = !contact.confirmedThisWeek;
    await updateContact(contact.id, {
      confirmedThisWeek: nextStatus,
      confirmedNotes: nextStatus ? undefined : 'Sem confirmação',
    });
    setFeedbackNotice(
      nextStatus
        ? `Presença de ${contact.name} confirmada para o próximo culto!`
        : `Presença de ${contact.name} alterada para pendente.`
    );
    setTimeout(() => setFeedbackNotice(null), 3500);
  };

  // Open WhatsApp direct
  const handleOpenWhatsApp = (phone: string, name: string) => {
    const digits = phone.replace(/\D/g, '');
    const cleanNumber = digits.startsWith('55') ? digits : `55${digits}`;
    const text = encodeURIComponent(
      `Graça e Paz, ${name}! Tudo bem? Passando para confirmar sua presença no nosso culto deste fim de semana na Casa de Deus Curicica!`
    );
    window.open(`https://wa.me/${cleanNumber}?text=${text}`, '_blank');
  };

  // Export current family to CSV
  const handleExportFamily = (familyId: CuricicaFamily) => {
    const famObj = CURICICA_FAMILIES.find(f => f.id === familyId);
    const famName = famObj?.name || 'Família';
    const famContacts = curicicaContacts.filter(c => c.curicicaFamily === familyId);

    const entries = famContacts.map(c => ({
      contactId: c.id,
      name: c.name,
      category: c.category,
      phone: c.phone,
      congregation: c.congregation,
      responsibleName: c.assignedToName || famObj?.leaderName || 'Líder de Família',
      status: (c.confirmedThisWeek ? 'confirmed' : 'unconfirmed') as 'confirmed' | 'unconfirmed',
      absenceReason: c.confirmedThisWeek ? undefined : (c.confirmedNotes || 'Não informado'),
      weekStart: new Date().toISOString().slice(0, 10),
      weekEnd: new Date().toISOString().slice(0, 10),
      notes: `Família: ${famName}`,
      updatedAt: new Date().toISOString(),
    }));

    exportWeeklyConfirmationsToCSV(entries, `Curicica - ${famName}`, 'Curicica');
  };

  return (
    <div className="space-y-6 pb-14">
      {/* Feedback Notice */}
      {feedbackNotice && (
        <div className="p-3.5 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-300 text-xs font-semibold flex items-center justify-between shadow-lg animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{feedbackNotice}</span>
          </div>
          <button onClick={() => setFeedbackNotice(null)} className="text-emerald-400 hover:text-white">
            Fechar
          </button>
        </div>
      )}

      {/* Main Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#121212] via-[#161616] to-[#0A0A0A] border border-[#262626] p-6 md:p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-semibold backdrop-blur-sm border border-white/10">
              <Home className="w-3.5 h-3.5 text-white" />
              <span>Campus Curicica • Estrutura de Famílias</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight">
              Famílias da Curicica
            </h1>
            <p className="text-xs md:text-sm text-zinc-400 leading-relaxed">
              {perms.isFamilyLeader
                ? `Você está conectado como líder autorizado da ${
                    CURICICA_FAMILIES.find(f => f.id === perms.curicicaFamilyRestricted)?.name
                  }. Acompanhe e pastoreie os membros e visitantes sob sua responsabilidade.`
                : 'Acompanhamento pastoral das 3 Famílias ministeriais da congregação Curicica com isolamento e consolidação de membros.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="px-3 py-1.5 rounded-xl bg-black/60 border border-white/10 text-xs text-zinc-300 font-semibold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>
                {perms.isMaster
                  ? 'Master Geral'
                  : perms.isCuricicaAdmin
                  ? 'Coordenação Curicica'
                  : `Líder ${CURICICA_FAMILIES.find(f => f.id === perms.curicicaFamilyRestricted)?.name}`}
              </span>
            </span>

            <button
              onClick={() => onOpenNewContact(activeTab !== 'visao_geral' ? activeTab : 'familia_1')}
              className="px-4 py-2.5 bg-white hover:bg-zinc-200 text-black font-extrabold text-xs md:text-sm rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-white/10"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Membro na Família</span>
            </button>
          </div>
        </div>

        {/* Global summary count */}
        {(perms.isMaster || perms.isCuricicaAdmin) && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-[#222222]">
            <div className="p-3 bg-black/40 rounded-xl border border-white/5">
              <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Total em Curicica</span>
              <p className="text-lg font-black text-white">{curicicaContacts.length} pessoas</p>
            </div>
            <div className="p-3 bg-black/40 rounded-xl border border-white/5">
              <span className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider">Família 1</span>
              <p className="text-lg font-black text-emerald-300">{familyStats.familia_1.total} membros/visitantes</p>
            </div>
            <div className="p-3 bg-black/40 rounded-xl border border-white/5">
              <span className="text-[10px] text-blue-400 uppercase font-bold tracking-wider">Família 2</span>
              <p className="text-lg font-black text-blue-300">{familyStats.familia_2.total} membros/visitantes</p>
            </div>
            <div className="p-3 bg-black/40 rounded-xl border border-white/5">
              <span className="text-[10px] text-purple-400 uppercase font-bold tracking-wider">Família 3</span>
              <p className="text-lg font-black text-purple-300">{familyStats.familia_3.total} membros/visitantes</p>
            </div>
          </div>
        )}
      </div>

      {/* Tabs Navigation Bar (Apenas abas autorizadas aparecem!) */}
      {availableTabs.length > 1 && (
        <div className="bg-[#0D0D0D] border border-[#222222] p-1.5 rounded-2xl flex items-center gap-2 overflow-x-auto shadow-md">
          {availableTabs.map(tab => {
            const Icon = tab.icon || Home;
            const isActive = activeTab === tab.id;
            const badgeCount =
              tab.id === 'visao_geral'
                ? curicicaContacts.length
                : familyStats[tab.id as CuricicaFamily]?.total || 0;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-black shadow-lg font-extrabold shadow-white/10'
                    : 'text-zinc-400 hover:text-white hover:bg-[#1A1A1A]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                    isActive ? 'bg-black text-white' : 'bg-black/60 text-zinc-400'
                  }`}
                >
                  {badgeCount}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* TAB 1: VISÃO GERAL (Apenas visível para Master ou Coordenação Curicica) */}
      {activeTab === 'visao_geral' && (perms.isMaster || perms.isCuricicaAdmin) && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {CURICICA_FAMILIES.map(fam => {
              const stats = familyStats[fam.id];
              return (
                <div
                  key={fam.id}
                  className="bg-[#0B0B0B] border border-[#262626] rounded-2xl p-5 shadow-xl flex flex-col justify-between hover:border-zinc-500 transition-colors"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                          Curicica
                        </span>
                        <h3 className="text-xl font-black text-white">{fam.name}</h3>
                        <p className="text-xs text-zinc-400">Líder: <strong className="text-white">{fam.leaderName}</strong></p>
                      </div>
                      <span className="text-2xl font-black text-white">{stats.total}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-[#1C1C1C]">
                      <div className="p-2 bg-[#141414] rounded-lg">
                        <span className="text-[9px] uppercase text-zinc-500 font-bold block">Membros</span>
                        <span className="text-sm font-black text-white">{stats.members}</span>
                      </div>
                      <div className="p-2 bg-[#141414] rounded-lg">
                        <span className="text-[9px] uppercase text-zinc-500 font-bold block">Visitantes</span>
                        <span className="text-sm font-black text-amber-300">{stats.visitors}</span>
                      </div>
                      <div className="p-2 bg-[#141414] rounded-lg">
                        <span className="text-[9px] uppercase text-emerald-500 font-bold block">Confirmados</span>
                        <span className="text-sm font-black text-emerald-300">{stats.confirmed}</span>
                      </div>
                    </div>

                    {/* Confirmation progress */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-zinc-400">
                        <span>Taxa de Confirmação no Culto</span>
                        <span className="font-bold text-white">{stats.rate}%</span>
                      </div>
                      <div className="w-full h-2 bg-[#1A1A1A] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${stats.rate}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-[#1C1C1C] flex items-center justify-between">
                    <button
                      onClick={() => setActiveTab(fam.id)}
                      className="w-full py-2 px-3 bg-[#161616] hover:bg-white hover:text-black text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 group"
                    >
                      <span>Abrir {fam.name}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-black" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2, 3, 4: ESPAÇO EXCLUSIVO DA FAMÍLIA (Família 1, Família 2 ou Família 3) */}
      {activeTab !== 'visao_geral' && (
        <div className="space-y-6">
          {/* Family Banner */}
          {(() => {
            const famObj = CURICICA_FAMILIES.find(f => f.id === activeTab);
            const stats = familyStats[activeTab];
            return (
              <div className="bg-[#0B0B0B] border border-[#262626] rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-md shadow-emerald-400/50" />
                    <span className="text-xs uppercase tracking-widest font-black text-emerald-400">
                      GRUPO MINISTERIAL CURICICA
                    </span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-black text-white">{famObj?.name}</h2>
                  <p className="text-xs md:text-sm text-zinc-400">
                    Liderança responsável:{' '}
                    <strong className="text-white font-semibold">{famObj?.leaderName}</strong> • Grupo isolado da congregação Curicica.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-3 bg-[#141414] p-3 rounded-xl border border-[#222222]">
                    <div className="text-center px-3 border-r border-[#262626]">
                      <span className="text-[10px] uppercase font-bold text-zinc-500 block">Total</span>
                      <span className="text-lg font-black text-white">{stats.total}</span>
                    </div>
                    <div className="text-center px-3 border-r border-[#262626]">
                      <span className="text-[10px] uppercase font-bold text-zinc-500 block">Membros</span>
                      <span className="text-lg font-black text-white">{stats.members}</span>
                    </div>
                    <div className="text-center px-3">
                      <span className="text-[10px] uppercase font-bold text-emerald-400 block">Confirmados</span>
                      <span className="text-lg font-black text-emerald-300">{stats.confirmed}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleExportFamily(activeTab)}
                    className="py-2.5 px-4 bg-[#141414] hover:bg-[#1E1E1E] text-white border border-[#2A2A2A] rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shadow-sm"
                  >
                    <Download className="w-4 h-4 text-emerald-400" />
                    <span>Exportar Lista da {famObj?.name}</span>
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Filters Bar */}
          <div className="bg-[#0B0B0B] border border-[#222222] p-3 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-md">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar membro ou visitante nesta família..."
                className="w-full pl-9 pr-3 py-2 bg-[#141414] border border-[#262626] rounded-xl text-xs md:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-white transition-colors"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value as any)}
                className="px-3 py-2 bg-[#141414] border border-[#262626] rounded-xl text-xs text-white focus:outline-none focus:border-white"
              >
                <option value="all">Todas as Categorias</option>
                <option value="Membro">Apenas Membros</option>
                <option value="Visitante">Apenas Visitantes</option>
                <option value="Novo contato">Novos Contatos</option>
              </select>

              <select
                value={presenceFilter}
                onChange={e => setPresenceFilter(e.target.value as any)}
                className="px-3 py-2 bg-[#141414] border border-[#262626] rounded-xl text-xs text-white focus:outline-none focus:border-white"
              >
                <option value="all">Todos os Status de Culto</option>
                <option value="confirmed">Confirmados no Culto</option>
                <option value="pending">Pendentes</option>
              </select>
            </div>
          </div>

          {/* Members Table */}
          <div className="bg-[#0A0A0A] border border-[#222222] rounded-2xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="bg-[#121212] border-b border-[#222222] text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                  <tr>
                    <th className="py-3.5 px-4">Nome & Contato</th>
                    <th className="py-3.5 px-3">Categoria</th>
                    <th className="py-3.5 px-3">Telefone</th>
                    <th className="py-3.5 px-3">Responsável</th>
                    <th className="py-3.5 px-3">Presença no Culto</th>
                    <th className="py-3.5 px-4 text-right">Ações Rápidas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1A1A1A]">
                  {currentFamilyContacts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-zinc-500">
                        <Users className="w-8 h-8 text-zinc-600 mx-auto mb-2 opacity-50" />
                        <p className="font-semibold text-zinc-400">Nenhum membro encontrado nesta família.</p>
                        <p className="text-xs text-zinc-600 mt-1">
                          Utilize o botão acima para cadastrar um novo integrante nesta família.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    currentFamilyContacts.map(contact => {
                      const isConfirmed = contact.confirmedThisWeek;
                      return (
                        <tr key={contact.id} className="hover:bg-[#111111] transition-colors group">
                          {/* Nome */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-white text-xs shrink-0">
                                {contact.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <button
                                  onClick={() => onOpenContactDetails(contact)}
                                  className="font-bold text-white hover:text-emerald-400 transition-colors text-left block"
                                >
                                  {contact.name}
                                </button>
                                <span className="text-[10px] text-zinc-500 block">
                                  {contact.neighborhood || 'Curicica'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Categoria */}
                          <td className="py-3.5 px-3">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                contact.category === 'Membro'
                                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                                  : contact.category === 'Visitante'
                                  ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                                  : 'bg-blue-950/80 text-blue-300 border border-blue-800/60'
                              }`}
                            >
                              {contact.category}
                            </span>
                          </td>

                          {/* Telefone */}
                          <td className="py-3.5 px-3 font-mono text-zinc-300">
                            {contact.phone}
                          </td>

                          {/* Responsável */}
                          <td className="py-3.5 px-3 text-zinc-400">
                            {contact.assignedToName || 'Liderança da Família'}
                          </td>

                          {/* Status de Presença */}
                          <td className="py-3.5 px-3">
                            <button
                              onClick={() => handleToggleConfirmation(contact)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                                isConfirmed
                                  ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/60 hover:bg-emerald-900'
                                  : 'bg-red-950/60 text-red-300 border-red-800/50 hover:bg-red-900/60'
                              }`}
                              title={isConfirmed ? 'Presença confirmada! Clique para alterar' : 'Pendente de confirmação'}
                            >
                              {isConfirmed ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>Confirmado</span>
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-3.5 h-3.5 text-red-400" />
                                  <span>Ausente / Pendente</span>
                                </>
                              )}
                            </button>
                          </td>

                          {/* Ações */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenWhatsApp(contact.phone, contact.name)}
                                className="p-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-400 border border-emerald-800/60 transition-colors"
                                title="Enviar mensagem no WhatsApp"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => onOpenContactDetails(contact)}
                                className="p-1.5 rounded-lg bg-[#181818] hover:bg-[#242424] text-zinc-300 hover:text-white border border-[#2E2E2E] transition-colors"
                                title="Abrir ficha completa"
                              >
                                <Eye className="w-4 h-4" />
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
        </div>
      )}
    </div>
  );
};
