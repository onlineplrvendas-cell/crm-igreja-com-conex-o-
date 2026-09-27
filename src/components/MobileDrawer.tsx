import React from 'react';
import { Logo } from './Logo';
import { ConexaoLogo } from './ConexaoLogo';
import {
  LayoutDashboard,
  Church,
  Users,
  CalendarCheck,
  X,
  Shield,
  Plus,
  ShieldCheck,
  KeyRound,
  Crown,
  CheckCheck,
} from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { useAuth } from '../context/AuthContext';
import { MainTab } from '../types';

import { getUserPermissions } from '../utils/permissions';
import { Home, Sparkles } from 'lucide-react';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: MainTab;
  setActiveTab: (tab: MainTab) => void;
  onOpenNewContact: () => void;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  onOpenNewContact,
}) => {
  const { metrics, uniReinoStudents, conexaoParticipants, contacts } = useCRM();
  const { currentUser, isDemoMode, logout, toggleDemoMode } = useAuth();
  const perms = getUserPermissions(currentUser);
  const confirmedCount = contacts.filter(c => c.confirmedThisWeek && !c.isArchived).length;

  if (!isOpen) return null;

  type NavItem = {
    id: MainTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number | string;
    isGoldBadge?: boolean;
    isConexaoBadge?: boolean;
    isConfirmadosBadge?: boolean;
  };

  const navItems: NavItem[] = [];

  if (perms.canAccessDashboard) {
    navItems.push({ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard });
  }

  if (perms.canAccessChurches) {
    navItems.push({ id: 'igrejas', label: 'Igrejas', icon: Church, badge: '3 sedes' });
  }

  if (perms.canAccessCuricicaPage) {
    const familyBadge = perms.isFamilyLeader
      ? (perms.curicicaFamilyRestricted === 'familia_1' ? 'Família 1' : perms.curicicaFamilyRestricted === 'familia_2' ? 'Família 2' : 'Família 3')
      : '3 Famílias';
    navItems.push({
      id: 'curicica',
      label: perms.isFamilyLeader ? 'Minha Família' : 'Curicica (Famílias)',
      icon: Home,
      badge: familyBadge,
    });
  }

  if (perms.canAccessConexao) {
    const conexaoBadge = perms.isTeamLeader
      ? (currentUser?.assignedTeam ? `Equipe ${currentUser.assignedTeam.toUpperCase()}` : undefined)
      : (conexaoParticipants.length > 0 ? `${conexaoParticipants.length} jovens` : undefined);
    navItems.push({
      id: 'conexaojovem',
      label: perms.isTeamLeader ? `Conexão • Equipe ${currentUser?.assignedTeam?.toUpperCase()}` : 'Conexão Jovem',
      icon: Sparkles,
      badge: conexaoBadge,
      isConexaoBadge: true,
    });
  }

  if (perms.canAccessConfirmados) {
    navItems.push({
      id: 'confirmados',
      label: 'Confirmados da Semana',
      icon: CheckCheck,
      badge: confirmedCount > 0 ? `${confirmedCount}` : undefined,
      isConfirmadosBadge: true,
    });
  }

  if (perms.canAccessContacts) {
    navItems.push({
      id: 'contacts',
      label: perms.isFamilyLeader ? 'Membros da Família' : 'Contatos',
      icon: Users,
    });
  }

  if (perms.canAccessUniReino) {
    navItems.push({
      id: 'unireino',
      label: 'Uni Reino',
      icon: Crown,
      badge: uniReinoStudents.length > 0 ? `${uniReinoStudents.length} alunos` : undefined,
      isGoldBadge: true,
    });
  }

  if (perms.canAccessFollowup) {
    navItems.push({
      id: 'followup',
      label: 'Acompanhamento',
      icon: CalendarCheck,
      badge: metrics.pendingReturnsTotal > 0 ? metrics.pendingReturnsTotal : undefined,
    });
  }

  if (perms.canAccessTeam) {
    navItems.push({
      id: 'team',
      label: 'Acessos da Equipe',
      icon: ShieldCheck,
      badge: 'Master',
    });
  }

  navItems.push({
    id: 'security',
    label: 'Alterar Senha',
    icon: KeyRound,
  });

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 max-w-xs w-full bg-[#0A0A0A] border-r border-[#262626] p-5 shadow-2xl flex flex-col justify-between z-50">
        <div className="space-y-6">
          {/* Top */}
          <div className="flex items-center justify-between border-b border-[#1F1F1F] pb-4">
            <Logo size="sm" showText={true} />
            <button
              onClick={onClose}
              className="p-1.5 text-[#999999] hover:text-white rounded-lg hover:bg-[#141414]"
              aria-label="Fechar menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Action Button */}
          <button
            onClick={() => {
              onClose();
              onOpenNewContact();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-white text-black font-semibold text-sm rounded-lg hover:bg-neutral-200 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Novo Contato</span>
          </button>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#181818] text-white border border-[#333333]'
                      : 'text-[#999999] hover:text-white hover:bg-[#121212]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {item.id === 'conexaojovem' ? (
                      <ConexaoLogo size="xs" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                        item.isGoldBadge
                          ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-black shadow-sm'
                          : item.isConexaoBadge
                          ? 'bg-gradient-to-r from-amber-400 via-rose-400 to-cyan-400 text-black shadow-sm'
                          : 'bg-neutral-800 text-white border border-neutral-700'
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

        {/* User Card, Demo Toggle & Logout */}
        <div className="border-t border-[#1F1F1F] pt-4 space-y-3">
          {/* Demo Mode Toggle in Mobile */}
          <div className="p-3 bg-[#111111] rounded-xl border border-[#222222] flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-white block">Modo Demonstração</span>
              <span className="text-[10px] text-[#777777]">
                {isDemoMode ? '30 registros fictícios' : 'Desligado (Modo real)'}
              </span>
            </div>
            <button
              type="button"
              onClick={toggleDemoMode}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                isDemoMode ? 'bg-white' : 'bg-[#222222]'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full shadow-lg transition duration-200 ease-in-out ${
                  isDemoMode ? 'translate-x-4 bg-black' : 'translate-x-0 bg-[#666666]'
                }`}
              />
            </button>
          </div>

          <div className="p-3 bg-[#111111] rounded-xl border border-[#222222]">
            <p className="text-sm font-semibold text-white">{currentUser?.name}</p>
            <p className="text-xs text-[#888888]">{currentUser?.email}</p>
            <span className="inline-block mt-2 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-[#1F1F1F] text-[#CCCCCC] rounded">
              {currentUser?.role === 'admin' ? 'Administrador Geral' : 'Equipe de Atendimento'}
            </span>
          </div>

          <button
            onClick={() => {
              onClose();
              logout();
            }}
            className="w-full py-2 px-3 text-center text-xs text-[#AAAAAA] hover:text-white bg-[#141414] hover:bg-[#1A1A1A] rounded-lg border border-[#262626] transition-colors"
          >
            Sair da conta
          </button>
        </div>
      </div>
    </div>
  );
};
