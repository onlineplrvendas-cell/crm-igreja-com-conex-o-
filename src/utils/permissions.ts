import { UserProfile, Congregation, ConexaoColor, CuricicaFamily } from '../types';
import { CONEXAO_COLORS } from './conexaoConfig';

export interface UserPermissions {
  isMaster: boolean;
  role: string;
  authorizedCongregations: Congregation[];
  canAccessCongregation: (cong: Congregation) => boolean;
  canAccessAllCongregationsOverview: boolean;

  // Curicica Famílias
  hasCuricicaAccess: boolean;
  isCuricicaAdmin: boolean;
  isFamilyLeader: boolean;
  curicicaFamilyRestricted: CuricicaFamily | null;
  authorizedCuricicaFamilies: CuricicaFamily[];

  // Conexão Jovem
  canAccessConexao: boolean;
  isConexaoGeneralLeader: boolean;
  isTeamLeader: boolean;
  conexaoTeamRestricted: ConexaoColor | null;
  authorizedConexaoColors: ConexaoColor[];

  // Modulos / Abas
  canAccessDashboard: boolean;
  canAccessChurches: boolean;
  canAccessCuricicaPage: boolean;
  canAccessConfirmados: boolean;
  canAccessContacts: boolean;
  canAccessUniReino: boolean;
  canAccessFollowup: boolean;
  canAccessTeam: boolean;
}

export function getUserPermissions(user: UserProfile | null): UserPermissions {
  if (!user) {
    return {
      isMaster: false,
      role: 'guest',
      authorizedCongregations: [],
      canAccessCongregation: () => false,
      canAccessAllCongregationsOverview: false,
      hasCuricicaAccess: false,
      isCuricicaAdmin: false,
      isFamilyLeader: false,
      curicicaFamilyRestricted: null,
      authorizedCuricicaFamilies: [],
      canAccessConexao: false,
      isConexaoGeneralLeader: false,
      isTeamLeader: false,
      conexaoTeamRestricted: null,
      authorizedConexaoColors: [],
      canAccessDashboard: false,
      canAccessChurches: false,
      canAccessCuricicaPage: false,
      canAccessConfirmados: false,
      canAccessContacts: false,
      canAccessUniReino: false,
      canAccessFollowup: false,
      canAccessTeam: false,
    };
  }

  const isMaster = user.role === 'admin';
  const isCuricicaAdmin = user.role === 'admin_curicica';
  const isFamilyLeader = user.role === 'lider_familia';
  const isConexaoGeneralLeader = user.role === 'lider_conexao';
  const isTeamLeader = user.role === 'lider_equipe';
  const isStaff = user.role === 'equipe';

  // Congregations
  const authorizedCongregations: Congregation[] = isMaster
    ? ['Recreio', 'Curicica', 'Guaratiba']
    : (user.assignedCongregations && user.assignedCongregations.length > 0)
    ? user.assignedCongregations
    : ['Recreio'];

  const canAccessCongregation = (cong: Congregation) => {
    if (isMaster) return true;
    return authorizedCongregations.includes(cong);
  };

  // Only Master can see 'all' (Todas as congregações / visão consolidada)
  const canAccessAllCongregationsOverview = isMaster;

  // Curicica Famílias
  const hasCuricicaAccess = authorizedCongregations.includes('Curicica');
  let curicicaFamilyRestricted: CuricicaFamily | null = null;
  let authorizedCuricicaFamilies: CuricicaFamily[] = [];

  if (hasCuricicaAccess) {
    if (isMaster || isCuricicaAdmin || isStaff) {
      authorizedCuricicaFamilies = ['familia_1', 'familia_2', 'familia_3'];
    } else if (isFamilyLeader) {
      curicicaFamilyRestricted = user.assignedCuricicaFamily || 'familia_1';
      authorizedCuricicaFamilies = [curicicaFamilyRestricted];
    }
  }

  // Conexão Jovem
  const canAccessConexao = isMaster || isConexaoGeneralLeader || isTeamLeader;
  let conexaoTeamRestricted: ConexaoColor | null = null;
  let authorizedConexaoColors: ConexaoColor[] = [];

  if (canAccessConexao) {
    if (isMaster || isConexaoGeneralLeader) {
      authorizedConexaoColors = [...CONEXAO_COLORS];
    } else if (isTeamLeader) {
      conexaoTeamRestricted = (user.assignedTeam as ConexaoColor) || 'verde';
      authorizedConexaoColors = [conexaoTeamRestricted];
    }
  }

  // Modulos / Abas: Strictly show ONLY permitted modules
  // Team Leader ONLY accesses Conexão Jovem
  // Family Leader accesses Curicica Famílias, Confirmados da Família, Contatos da Família, Acompanhamento
  // Curicica Admin accesses Dashboard (Curicica), Curicica Famílias, Confirmados, Contatos, Acompanhamento
  // Staff accesses their church Dashboard, Confirmados, Contatos, Acompanhamento (+ Uni Reino if Recreio)
  // Master accesses everything
  const canAccessDashboard = isMaster || isCuricicaAdmin || isStaff;
  const canAccessChurches = isMaster; // Only Master manages multi-church unit directory
  const canAccessCuricicaPage = hasCuricicaAccess && (isMaster || isCuricicaAdmin || isFamilyLeader || (isStaff && authorizedCongregations.includes('Curicica')));
  const canAccessConfirmados = isMaster || isCuricicaAdmin || isFamilyLeader || isStaff;
  const canAccessContacts = isMaster || isCuricicaAdmin || isFamilyLeader || isStaff;
  const canAccessUniReino = isMaster || (isStaff && authorizedCongregations.includes('Recreio'));
  const canAccessFollowup = isMaster || isStaff || isCuricicaAdmin || isFamilyLeader;
  const canAccessTeam = isMaster; // Only Master manages user accounts and permissions

  return {
    isMaster,
    role: user.role,
    authorizedCongregations,
    canAccessCongregation,
    canAccessAllCongregationsOverview,
    hasCuricicaAccess,
    isCuricicaAdmin,
    isFamilyLeader,
    curicicaFamilyRestricted,
    authorizedCuricicaFamilies,
    canAccessConexao,
    isConexaoGeneralLeader,
    isTeamLeader,
    conexaoTeamRestricted,
    authorizedConexaoColors,
    canAccessDashboard,
    canAccessChurches,
    canAccessCuricicaPage,
    canAccessConfirmados,
    canAccessContacts,
    canAccessUniReino,
    canAccessFollowup,
    canAccessTeam,
  };
}

export function getAllowedTabsForUser(user: UserProfile | null): string[] {
  if (!user) return [];
  const perms = getUserPermissions(user);
  const tabs: string[] = [];

  if (perms.canAccessDashboard) tabs.push('dashboard');
  if (perms.canAccessChurches) tabs.push('igrejas');
  if (perms.canAccessCuricicaPage) tabs.push('curicica');
  if (perms.canAccessConexao) tabs.push('conexaojovem');
  if (perms.canAccessConfirmados) tabs.push('confirmados');
  if (perms.canAccessContacts) tabs.push('contacts');
  if (perms.canAccessUniReino) tabs.push('unireino');
  if (perms.canAccessFollowup) tabs.push('followup');
  if (perms.canAccessTeam) tabs.push('team');
  tabs.push('security');

  return tabs;
}

export function getDefaultTabForUser(user: UserProfile | null): any {
  if (!user) return 'dashboard';
  if (user.role === 'lider_equipe') return 'conexaojovem';
  if (user.role === 'lider_familia') return 'curicica';
  if (user.role === 'lider_conexao') return 'conexaojovem';
  return 'dashboard';
}

export function getUserRoleDisplayLabel(user: UserProfile | null): { title: string; subtitle: string; badgeColor: string } {
  if (!user) {
    return { title: 'Visitante', subtitle: 'Não autenticado', badgeColor: 'bg-zinc-800 text-zinc-400' };
  }

  if (user.role === 'admin') {
    return {
      title: 'Pr. Bruno Bitencourt',
      subtitle: 'Pastor Presidente • Master Geral',
      badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
    };
  }

  if (user.role === 'admin_curicica') {
    return {
      title: user.name,
      subtitle: 'Coordenação Geral • Curicica (3 Famílias)',
      badgeColor: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
    };
  }

  if (user.role === 'lider_familia') {
    const famMap: Record<string, string> = {
      familia_1: 'Família 1',
      familia_2: 'Família 2',
      familia_3: 'Família 3',
    };
    const famName = user.assignedCuricicaFamily ? famMap[user.assignedCuricicaFamily] || user.assignedCuricicaFamily : 'Família';
    return {
      title: user.name,
      subtitle: `Líder de Grupo • Curicica (${famName})`,
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
    };
  }

  if (user.role === 'lider_conexao') {
    return {
      title: user.name,
      subtitle: 'Liderança Geral • Conexão Jovem',
      badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
    };
  }

  if (user.role === 'lider_equipe') {
    const teamMap: Record<string, string> = {
      azul: 'Equipe Azul',
      verde: 'Equipe Verde',
      vermelho: 'Equipe Vermelha',
      amarelo: 'Equipe Amarela',
      laranja: 'Equipe Laranja',
      turquesa: 'Equipe Turquesa',
    };
    const teamName = user.assignedTeam ? teamMap[user.assignedTeam] || user.assignedTeam : 'Equipe';
    return {
      title: user.name,
      subtitle: `Líder de Cor • Conexão (${teamName})`,
      badgeColor: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
    };
  }

  const cong = user.assignedCongregations[0] || 'Igreja';
  return {
    title: user.name,
    subtitle: `Equipe Pastoral • ${cong}`,
    badgeColor: 'bg-zinc-800 text-zinc-300 border border-zinc-700',
  };
}
