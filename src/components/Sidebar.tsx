import React from 'react';
import {
  LayoutDashboard,
  Church,
  Users,
  CalendarCheck,
  Shield,
  Sparkles,
  ShieldCheck,
  KeyRound,
  Crown,
  CheckCheck,
} from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { useAuth } from '../context/AuthContext';
import { MainTab } from '../types';
import { ConexaoLogo } from './ConexaoLogo';
import { CONEXAO_COLOR_CONFIGS } from '../utils/conexaoConfig';

import { getUserPermissions } from '../utils/permissions';
import { Home } from 'lucide-react';

interface SidebarProps {
  activeTab: MainTab;
  setActiveTab: (tab: MainTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { metrics, uniReinoStudents, conexaoParticipants, contacts } = useCRM();
  const { isDemoMode, currentUser, toggleDemoMode } = useAuth();
  const perms = getUserPermissions(currentUser);

  const confirmedCount = contacts.filter(c => c.confirmedThisWeek && !c.isArchived).length;

  type NavItem = {
    id: MainTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    isConexao?: boolean;
    badge?: number | string;
    badgeType?: 'overdue' | 'today' | 'master' | 'unireino' | 'conexaojovem' | 'confirmados';
  };

  const navItems: NavItem[] = [];

  // Dashboard (only for Master, Curicica Admin, or Staff)
  if (perms.canAccessDashboard) {
    navItems.push({
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    });
  }

  // Igrejas (only Master)
  if (perms.canAccessChurches) {
    navItems.push({
      id: 'igrejas',
      label: 'Igrejas',
      icon: Church,
      badge: '3 sedes',
      badgeType: 'today',
    });
  }

  // Curicica Famílias (only Curicica assigned or Master)
  if (perms.canAccessCuricicaPage) {
    const familyBadge = perms.isFamilyLeader
      ? (perms.curicicaFamilyRestricted === 'familia_1' ? 'Família 1' : perms.curicicaFamilyRestricted === 'familia_2' ? 'Família 2' : 'Família 3')
      : '3 Famílias';
    navItems.push({
      id: 'curicica',
      label: perms.isFamilyLeader ? 'Minha Família' : 'Curicica (Famílias)',
      icon: Home,
      badge: familyBadge,
      badgeType: 'today',
    });
  }

  // Conexão Jovem (only Conexão leaders or Master)
  if (perms.canAccessConexao) {
    const conexaoBadge = perms.isTeamLeader
      ? (currentUser?.assignedTeam ? `Equipe ${currentUser.assignedTeam.toUpperCase()}` : undefined)
      : (conexaoParticipants.length > 0 ? `${conexaoParticipants.length}` : undefined);
    navItems.push({
      id: 'conexaojovem',
      label: perms.isTeamLeader ? `Conexão • Equipe ${currentUser?.assignedTeam?.toUpperCase()}` : 'Conexão Jovem',
      icon: Sparkles,
      isConexao: true,
      badge: conexaoBadge,
      badgeType: 'conexaojovem',
    });
  }

  // Confirmados da Semana (not team leader)
  if (perms.canAccessConfirmados) {
    navItems.push({
      id: 'confirmados',
      label: 'Confirmados da Semana',
      icon: CheckCheck,
      badge: confirmedCount > 0 ? `${confirmedCount}` : undefined,
      badgeType: 'confirmados',
    });
  }

  // Contatos (not team leader)
  if (perms.canAccessContacts) {
    navItems.push({
      id: 'contacts',
      label: perms.isFamilyLeader ? 'Membros da Família' : 'Contatos',
      icon: Users,
    });
  }

  // Uni Reino (only Master or Recreio Staff)
  if (perms.canAccessUniReino) {
    navItems.push({
      id: 'unireino',
      label: 'Uni Reino',
      icon: Crown,
      badge: uniReinoStudents.length > 0 ? uniReinoStudents.length : undefined,
      badgeType: 'unireino',
    });
  }

  // Acompanhamento / Follow-up
  if (perms.canAccessFollowup) {
    navItems.push({
      id: 'followup',
      label: 'Acompanhamento',
      icon: CalendarCheck,
      badge: metrics.pendingReturnsTotal > 0 ? metrics.pendingReturnsTotal : undefined,
      badgeType: metrics.pendingReturnsOverdue > 0 ? ('overdue' as const) : ('today' as const),
    });
  }

  // Acessos da Equipe (only Master)
  if (perms.canAccessTeam) {
    navItems.push({
      id: 'team',
      label: 'Acessos da Equipe',
      icon: ShieldCheck,
      badge: 'Master',
      badgeType: 'master',
    });
  }

  // Alterar Senha
  navItems.push({
    id: 'security',
    label: 'Alterar Senha',
    icon: KeyRound,
  });

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-[#070707] border-r border-[#262626] shrink-0 min-h-[calc(100vh-4rem)] p-4 justify-between">
      <div className="space-y-6">
        {/* Navigation Section */}
        <div>
          <div className="px-3 mb-2 text-[10px] uppercase font-bold tracking-widest text-[#555555]">
            Navegação Principal
          </div>
          <nav className="space-y-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors font-medium group ${
                    isActive
                      ? 'bg-[#141414] text-white border border-[#2B2B2B]'
                      : 'text-[#999999] hover:text-white hover:bg-[#0E0E0E]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {item.isConexao ? (
                      <ConexaoLogo size="xs" />
                    ) : (
                      <Icon
                        className={`w-4 h-4 transition-colors ${
                          isActive ? 'text-white' : 'text-[#777777] group-hover:text-white'
                        }`}
                      />
                    )}
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        item.badgeType === 'confirmados'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : item.badgeType === 'unireino'
                          ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-black font-black shadow-sm shadow-amber-500/30'
                          : item.badgeType === 'conexaojovem'
                          ? 'bg-gradient-to-r from-amber-400 via-rose-400 to-cyan-400 text-black font-black shadow-sm'
                          : item.badgeType === 'master'
                          ? 'bg-white text-black'
                          : item.badgeType === 'overdue'
                          ? 'bg-neutral-800 text-white border border-neutral-600'
                          : 'bg-[#1A1A1A] text-[#CCCCCC] border border-[#2A2A2A]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Access scope indicator */}
        <div className="p-3 bg-[#0C0C0C] border border-[#1F1F1F] rounded-xl text-xs space-y-2">
          <div className="flex items-center gap-2 text-white font-medium">
            <Shield className="w-3.5 h-3.5 text-[#AAAAAA]" />
            <span>Escopo de Acesso</span>
          </div>
          <p className="text-[11px] text-[#888888] leading-relaxed">
            {currentUser?.role === 'admin'
              ? 'Administrador Geral: Acesso liberado a Recreio, Curicica e Guaratiba.'
              : currentUser?.role === 'lider_equipe'
              ? `Líder ${CONEXAO_COLOR_CONFIGS[currentUser.assignedTeam || 'verde'].displayName}: Acesso restrito à sua equipe.`
              : currentUser?.role === 'lider_conexao'
              ? 'Líder Geral do Conexão Jovem: Acesso liberado às 6 equipes.'
              : `Equipe de Atendimento: Restrito a ${currentUser?.assignedCongregations?.join(', ')}.`}
          </p>
        </div>
      </div>

      {/* Footer Info */}
      <div className="pt-4 border-t border-[#1C1C1C] space-y-2">
        {/* Footer Demo Toggle Box */}
        <div className="p-2.5 bg-[#101010] border border-[#222222] rounded-xl space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
              <Sparkles className="w-3.5 h-3.5 text-white" />
              <span>Modo Demo</span>
            </div>
            <button
              type="button"
              onClick={toggleDemoMode}
              className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out ${
                isDemoMode ? 'bg-white' : 'bg-[#222222]'
              }`}
              title={isDemoMode ? 'Desligar modo demo' : 'Ligar modo demo'}
            >
              <span
                className={`pointer-events-none inline-block h-3 w-3 transform rounded-full shadow transition duration-200 ease-in-out ${
                  isDemoMode ? 'translate-x-4 bg-black' : 'translate-x-0 bg-[#666666]'
                }`}
              />
            </button>
          </div>
          <p className="text-[10px] text-[#777777]">
            {isDemoMode ? '30 contatos de teste' : 'Ambiente real ativo'}
          </p>
        </div>
        <div className="text-[10px] text-[#555555] px-1">
          Casa de Deus CRM • v1.0.0
        </div>
      </div>
    </aside>
  );
};
