import React, { useState } from 'react';
import { Logo } from './Logo';
import { useCRM } from '../context/CRMContext';
import { useAuth } from '../context/AuthContext';
import { Congregation, CongregationFilter, MainTab } from '../types';
import {
  Menu,
  Plus,
  ChevronDown,
  User,
  LogOut,
  RefreshCw,
  SlidersHorizontal,
  HelpCircle,
  ShieldCheck,
  KeyRound,
} from 'lucide-react';

import { getUserPermissions, getUserRoleDisplayLabel } from '../utils/permissions';

interface NavbarProps {
  onOpenMobileMenu: () => void;
  onOpenNewContact: () => void;
  onOpenSetupInstructions: () => void;
  activeTab: MainTab;
  setActiveTab: (tab: MainTab) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenMobileMenu,
  onOpenNewContact,
  onOpenSetupInstructions,
  activeTab,
  setActiveTab,
}) => {
  const {
    selectedCongregation,
    setSelectedCongregation,
    authorizedCongregations,
    resetDemoData,
  } = useCRM();

  const { currentUser, isDemoMode, logout, switchDemoUser, enterDemoMode, toggleDemoMode } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isCongDropdownOpen, setIsCongDropdownOpen] = useState(false);

  const perms = getUserPermissions(currentUser);
  const isAdmin = perms.isMaster;

  // Only Master can see 'all' (Todas as congregações / visão consolidada)
  const congregationOptions: { value: CongregationFilter; label: string }[] = [];
  if (perms.canAccessAllCongregationsOverview) {
    congregationOptions.push({ value: 'all', label: 'Todas (Consolidada)' });
  }

  authorizedCongregations.forEach(cong => {
    congregationOptions.push({ value: cong, label: cong });
  });

  // Check if dropdown should be interactive (only if master or user has more than 1 authorized congregation)
  const isSelectorInteractive =
    currentUser?.role !== 'lider_equipe' &&
    currentUser?.role !== 'lider_familia' &&
    (perms.canAccessAllCongregationsOverview || authorizedCongregations.length > 1);

  const getSelectorBadgeContent = () => {
    if (currentUser?.role === 'lider_equipe') {
      const teamName = currentUser.assignedTeam ? currentUser.assignedTeam.toUpperCase() : 'AZUL';
      return { label: 'Conexão', value: `Equipe ${teamName}` };
    }
    if (currentUser?.role === 'lider_familia') {
      const famMap: Record<string, string> = {
        familia_1: 'Família 1',
        familia_2: 'Família 2',
        familia_3: 'Família 3',
      };
      const famName = currentUser.assignedCuricicaFamily ? famMap[currentUser.assignedCuricicaFamily] || 'Família' : 'Família';
      return { label: 'Curicica', value: famName };
    }
    if (selectedCongregation === 'all') {
      return { label: 'Congregação', value: 'Todas (Consolidada)' };
    }
    return { label: 'Congregação', value: selectedCongregation };
  };

  const badgeContent = getSelectorBadgeContent();

  return (
    <header className="sticky top-0 z-30 bg-[#000000]/95 backdrop-blur-md border-b border-[#262626] h-16 px-4 md:px-6 flex items-center justify-between">
      {/* Left: Mobile Menu Trigger + Logo */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-lg text-[#CCCCCC] hover:text-white hover:bg-[#141414] transition-colors focus:outline-none"
          aria-label="Abrir menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <Logo size="sm" showText={true} />
        </div>
      </div>

      {/* Middle: Congregation Selector */}
      <div className="flex items-center gap-3">
        <div className="relative">
          {isSelectorInteractive ? (
            <button
              onClick={() => setIsCongDropdownOpen(!isCongDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs md:text-sm font-medium bg-[#0B0B0B] border border-[#262626] rounded-lg text-white hover:border-[#383838] transition-colors focus:outline-none cursor-pointer"
              aria-haspopup="listbox"
              aria-expanded={isCongDropdownOpen}
            >
              <span className="text-[#888888] hidden sm:inline">{badgeContent.label}:</span>
              <span className="font-semibold text-white tracking-wide">{badgeContent.value}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-[#999999] transition-transform ${isCongDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 text-xs md:text-sm font-medium bg-[#0B0B0B] border border-[#262626] rounded-lg text-white">
              <span className="text-[#888888] hidden sm:inline">{badgeContent.label}:</span>
              <span className="font-semibold text-white tracking-wide">{badgeContent.value}</span>
            </div>
          )}

          {isSelectorInteractive && isCongDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsCongDropdownOpen(false)}
              />
              <div className="absolute left-0 mt-1.5 w-56 bg-[#0B0B0B] border border-[#262626] rounded-lg shadow-xl py-1 z-50 text-xs md:text-sm">
                <div className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider text-[#666666] border-b border-[#1A1A1A]">
                  Alternar congregação
                </div>
                {congregationOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setSelectedCongregation(opt.value);
                      setIsCongDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-[#141414] transition-colors cursor-pointer ${
                      selectedCongregation === opt.value ? 'text-white font-medium bg-[#141414]' : 'text-[#CCCCCC]'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {selectedCongregation === opt.value && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Demo Mode ON / OFF Switch */}
        <div className="flex items-center gap-2 px-2.5 py-1 bg-[#0F0F0F] border border-[#262626] rounded-lg">
          <span className="text-[11px] text-[#AAAAAA] hidden sm:inline font-medium">
            Modo Demo:
          </span>
          <button
            type="button"
            onClick={toggleDemoMode}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              isDemoMode ? 'bg-white' : 'bg-[#222222]'
            }`}
            role="switch"
            aria-checked={isDemoMode}
            title={isDemoMode ? 'Desligar Modo Demonstração' : 'Ligar Modo Demonstração'}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full shadow-lg ring-0 transition duration-200 ease-in-out ${
                isDemoMode ? 'translate-x-4 bg-black' : 'translate-x-0 bg-[#666666]'
              }`}
            />
          </button>
          <span className={`text-[10px] uppercase font-bold tracking-wider ${isDemoMode ? 'text-white' : 'text-[#666666]'}`}>
            {isDemoMode ? 'LIGADO' : 'DESLIGADO'}
          </span>
        </div>
      </div>

      {/* Right: Quick Action, Instructions, User Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Setup instructions button */}
        <button
          onClick={onOpenSetupInstructions}
          title="Instruções de Configuração e Firebase"
          className="p-2 rounded-lg text-[#999999] hover:text-white hover:bg-[#141414] transition-colors"
          aria-label="Ajuda e Configuração"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* Highlighted CTA "Novo Contato" */}
        <button
          onClick={onOpenNewContact}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-black font-semibold text-xs md:text-sm rounded-lg hover:bg-neutral-200 transition-colors shadow-sm focus:outline-none focus:ring-1 focus:ring-white"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Novo contato</span>
          <span className="sm:hidden">Novo</span>
        </button>

        {/* User Menu Trigger */}
        <div className="relative">
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-[#141414] border border-transparent hover:border-[#262626] transition-colors text-white focus:outline-none"
            aria-label="Perfil do usuário"
          >
            <div className="w-7 h-7 rounded-full bg-[#1A1A1A] border border-[#333333] flex items-center justify-center text-xs font-semibold">
              {currentUser?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-medium text-white truncate max-w-[110px]">
                {currentUser?.name}
              </span>
              <span className="text-[10px] text-[#888888] uppercase tracking-wider">
                {currentUser?.role === 'admin' ? 'Administrador' : 'Equipe'}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#888888] hidden md:block" />
          </button>

          {/* User dropdown menu */}
          {isUserMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsUserMenuOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-64 bg-[#0B0B0B] border border-[#262626] rounded-xl shadow-2xl py-2 z-50 text-xs">
                {/* User info header */}
                <div className="px-4 py-3 border-b border-[#1A1A1A]">
                  <p className="text-sm font-semibold text-white leading-tight">
                    {currentUser?.name}
                  </p>
                  <p className="text-xs text-[#888888] truncate mt-0.5">
                    {currentUser?.email}
                  </p>
                  <div className="mt-2">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${getUserRoleDisplayLabel(currentUser).badgeColor}`}>
                      {getUserRoleDisplayLabel(currentUser).subtitle}
                    </span>
                  </div>
                </div>

                {/* Mode Toggle Row */}
                <div className="px-3 py-2.5 border-b border-[#1A1A1A] flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-white block">Modo Demonstração</span>
                    <span className="text-[10px] text-[#777777]">
                      {isDemoMode ? 'Ativo com 30 dados fictícios' : 'Desativado (Modo Firebase)'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      toggleDemoMode();
                      setIsUserMenuOpen(false);
                    }}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                      isDemoMode ? 'bg-white' : 'bg-[#222222]'
                    }`}
                    title={isDemoMode ? 'Desligar modo demo' : 'Ligar modo demo'}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full shadow-lg transition duration-200 ease-in-out ${
                        isDemoMode ? 'translate-x-4 bg-black' : 'translate-x-0 bg-[#666666]'
                      }`}
                    />
                  </button>
                </div>

                {/* Demo profile switcher (if demo mode) */}
                {isDemoMode && (
                  <div className="px-3 py-2 border-b border-[#1A1A1A]">
                    <div className="text-[10px] font-bold text-[#666666] uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <SlidersHorizontal className="w-3 h-3 text-amber-400" />
                        Simular Perfil:
                      </span>
                      <span className="text-[9px] text-zinc-500">1 clique</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto pr-0.5">
                      <button
                        onClick={() => {
                          switchDemoUser('admin-1');
                          setIsUserMenuOpen(false);
                        }}
                        className={`px-2 py-1.5 rounded text-[11px] text-left transition-colors cursor-pointer ${
                          currentUser?.uid === 'admin-1'
                            ? 'bg-amber-400 text-black font-bold'
                            : 'bg-[#141414] text-[#CCCCCC] hover:text-white border border-[#262626]'
                        }`}
                      >
                        Pr. Bruno (Master)
                      </button>
                      <button
                        onClick={() => {
                          switchDemoUser('admin-curicica');
                          setIsUserMenuOpen(false);
                        }}
                        className={`px-2 py-1.5 rounded text-[11px] text-left transition-colors cursor-pointer ${
                          currentUser?.uid === 'admin-curicica'
                            ? 'bg-purple-400 text-black font-bold'
                            : 'bg-[#141414] text-[#CCCCCC] hover:text-white border border-[#262626]'
                        }`}
                      >
                        Coord. Curicica
                      </button>
                      <button
                        onClick={() => {
                          switchDemoUser('lider-familia-1');
                          setIsUserMenuOpen(false);
                        }}
                        className={`px-2 py-1.5 rounded text-[11px] text-left transition-colors cursor-pointer ${
                          currentUser?.uid === 'lider-familia-1'
                            ? 'bg-emerald-400 text-black font-bold'
                            : 'bg-[#141414] text-[#CCCCCC] hover:text-white border border-[#262626]'
                        }`}
                      >
                        Líder Família 1
                      </button>
                      <button
                        onClick={() => {
                          switchDemoUser('lider-familia-2');
                          setIsUserMenuOpen(false);
                        }}
                        className={`px-2 py-1.5 rounded text-[11px] text-left transition-colors cursor-pointer ${
                          currentUser?.uid === 'lider-familia-2'
                            ? 'bg-emerald-400 text-black font-bold'
                            : 'bg-[#141414] text-[#CCCCCC] hover:text-white border border-[#262626]'
                        }`}
                      >
                        Líder Família 2
                      </button>
                      <button
                        onClick={() => {
                          switchDemoUser('lider-equipe-azul');
                          setIsUserMenuOpen(false);
                        }}
                        className={`px-2 py-1.5 rounded text-[11px] text-left transition-colors cursor-pointer ${
                          currentUser?.uid === 'lider-equipe-azul'
                            ? 'bg-blue-400 text-black font-bold'
                            : 'bg-[#141414] text-[#CCCCCC] hover:text-white border border-[#262626]'
                        }`}
                      >
                        Líder Equipe Azul
                      </button>
                      <button
                        onClick={() => {
                          switchDemoUser('equipe-recreio');
                          setIsUserMenuOpen(false);
                        }}
                        className={`px-2 py-1.5 rounded text-[11px] text-left transition-colors cursor-pointer ${
                          currentUser?.uid === 'equipe-recreio'
                            ? 'bg-white text-black font-bold'
                            : 'bg-[#141414] text-[#CCCCCC] hover:text-white border border-[#262626]'
                        }`}
                      >
                        Equipe Recreio
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        resetDemoData();
                        setIsUserMenuOpen(false);
                      }}
                      className="mt-2 w-full flex items-center justify-center gap-1.5 px-2 py-1 text-[11px] text-[#999999] hover:text-white bg-[#141414] hover:bg-[#1A1A1A] rounded border border-[#262626] transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Restaurar dados fictícios
                    </button>
                  </div>
                )}

                {/* Team Access (Admin/Master only) */}
                {isAdmin && (
                  <div className="p-1 border-b border-[#1A1A1A]">
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setActiveTab('team');
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-white hover:bg-[#141414] transition-colors text-left"
                    >
                      <ShieldCheck className="w-4 h-4 text-white" />
                      <span>Acessos da Equipe (Master)</span>
                    </button>
                  </div>
                )}

                {/* Change Password (for all logged in users) */}
                <div className="p-1 border-b border-[#1A1A1A]">
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setActiveTab('security');
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-white hover:bg-[#141414] transition-colors text-left"
                  >
                    <KeyRound className="w-4 h-4 text-white" />
                    <span>Alterar Minha Senha</span>
                  </button>
                </div>

                {/* Logout */}
                <div className="p-1">
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[#CCCCCC] hover:text-white hover:bg-[#141414] transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4 text-[#888888]" />
                    <span>Sair da conta</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
