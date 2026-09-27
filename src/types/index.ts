export type Congregation = 'Recreio' | 'Curicica' | 'Guaratiba';

export type CongregationFilter = 'all' | Congregation;

export type ContactCategory = 'Novo contato' | 'Visitante' | 'Membro';

export type ContactStage =
  | 'Aguardando primeiro contato'
  | '1º contato feito'
  | 'Em acompanhamento'
  | 'Integrado'
  | 'Acompanhamento pausado';

export type ContactSource =
  | 'Culto'
  | 'Indicação'
  | 'Instagram'
  | 'Site'
  | 'Evento'
  | 'Outro';

export type InteractionChannel = 'WhatsApp' | 'Ligação' | 'Presencial' | 'Outro';

export type TaskStatus = 'pending' | 'completed';

export type CuricicaFamily = 'familia_1' | 'familia_2' | 'familia_3';

export const CURICICA_FAMILIES: { id: CuricicaFamily; name: string; leaderName: string }[] = [
  { id: 'familia_1', name: 'Família 1', leaderName: 'Priscila Ramos' },
  { id: 'familia_2', name: 'Família 2', leaderName: 'Carlos Eduardo' },
  { id: 'familia_3', name: 'Família 3', leaderName: 'Vanessa Mello' },
];

export type UserRole =
  | 'admin'
  | 'equipe'
  | 'lider_equipe'
  | 'lider_conexao'
  | 'lider_familia'
  | 'admin_curicica';

export type ConexaoAccessRole = 'lider_geral' | ConexaoColor;

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  username?: string;
  password?: string;
  role: UserRole;
  assignedTeam?: ConexaoColor; // Specific team color when role is 'lider_equipe'
  assignedCuricicaFamily?: CuricicaFamily; // Specific family when role is 'lider_familia'
  assignedCongregations: Congregation[];
  conexaoAccessRole?: ConexaoAccessRole; // Specific role for Conexão Jovem
  active: boolean;
  avatarUrl?: string;
  createdAt?: string;
}

export type MainTab =
  | 'dashboard'
  | 'igrejas'
  | 'curicica'
  | 'confirmados'
  | 'contacts'
  | 'unireino'
  | 'conexaojovem'
  | 'followup'
  | 'team'
  | 'security';

export type ContactViewTab = 'all' | 'membros' | 'convidados' | 'confirmados';

export type UniReinoSemester = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type UniReinoStatus = 'matriculado' | 'trancado' | 'concluido';

export interface UniReinoEnrollment {
  isEnrolled: boolean;
  semester: UniReinoSemester; // 1 to 8
  enrolledAt: string;
  status: UniReinoStatus;
  matricula?: string;
  turma?: string;
  notes?: string;
  completedAt?: string;
}

export type ConexaoColor =
  | 'verde'
  | 'vermelho'
  | 'laranja'
  | 'azul'
  | 'amarelo'
  | 'turquesa';

export type ConexaoRole =
  | 'lider'          // Líder Geral da Cor
  | 'sublider_base'  // Base da Equipe (Sub-líder responsável pela base de jovens)
  | 'membro'         // Membro ativo da Cor
  | 'convidado';     // Jovem Convidado / Visitante

export type ConexaoFunnelStage =
  | 'novo_contato'
  | 'em_contato'
  | 'em_acompanhamento'
  | 'integrado';

export interface ConexaoInteraction {
  id: string;
  date: string;
  situation: string; // Ex: 'não respondeu', 'respondeu', 'convidado para o culto', 'confirmou presença', 'faltou', 'compareceu', 'demonstrou interesse', 'retorno agendado', 'sem interesse', 'WhatsApp enviado', etc.
  notes?: string;
  registeredBy?: string;
  createdAt: string;
}

export interface ConexaoParticipant {
  id: string;
  name: string;
  phone: string;
  color: ConexaoColor;
  role: ConexaoRole;
  congregation: Congregation;
  baseName?: string;         // Ex: "Base Conquistadores", "Base Leão de Judá", "Base Avivamento"
  baseLeaderId?: string;     // ID da base / sub-líder responsável
  baseLeaderName?: string;   // Nome da base / sub-líder responsável
  invitedById?: string;      // ID de quem convidou
  invitedByName?: string;    // Nome de quem convidou (membro ou sub-líder)
  confirmedNextCulto?: boolean; // Presença confirmada no próximo Culto do Conexão Jovem
  firstVisitDate?: string;   // Data do primeiro culto / evento
  points?: number;           // Pontos na gincana/conexão da cor
  notes?: string;            // Observações pastorais/integração
  contactId?: string;        // ID vinculado na tabela de contatos geral

  // Funil de 4 etapas do Conexão Jovem
  funnelStage?: ConexaoFunnelStage;   // 'novo_contato' | 'em_contato' | 'em_acompanhamento' | 'integrado'
  responsibleName?: string;          // Responsável pelo acompanhamento
  lastInteraction?: string;          // Última interação (ex: "20/09 - Compareceu ao culto")
  nextAction?: string;               // Próxima ação (ex: "Ligar para saber do culto")
  nextReturnDate?: string;           // Próxima data de retorno (ex: "2026-09-30")
  interactions?: ConexaoInteraction[]; // Histórico completo de interações

  createdAt: string;
  updatedAt: string;
}

export interface ConexaoMembership {
  color: ConexaoColor;
  role: ConexaoRole;
  baseName?: string;
}

export interface ConexaoTeamGoal {
  color: ConexaoColor;
  year: number;
  targetGuests: number;           // Meta de convidados alcançados no ano
  targetGuestsMonth: number;      // Meta mensal de convidados
  targetBases: number;            // Meta de bases ativas
  targetMembers: number;          // Meta de membros integrados
  targetWeeklyAttendance: number; // Meta média de presença nos cultos de sábado
  notes?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface ConexaoMonthlyResult {
  monthKey: string;   // 'Jan', 'Fev', 'Mar', ...
  monthIndex: number; // 0 to 11
  guests: number;
  attendance: number;
  newMembers: number;
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  normalizedPhone: string;
  email?: string;
  neighborhood?: string;
  congregation: Congregation;
  category: ContactCategory;
  stage: ContactStage;
  source: ContactSource;
  assignedToId?: string;
  assignedToName?: string;
  firstVisitDate?: string;
  memberSinceDate?: string;
  initialNotes?: string;
  confirmedThisWeek?: boolean;
  confirmedNotes?: string;
  isArchived: boolean;
  archivedAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  uniReino?: UniReinoEnrollment;
  conexaoJovem?: ConexaoMembership;
  curicicaFamily?: CuricicaFamily;
}

export interface Interaction {
  id: string;
  contactId: string;
  congregation: Congregation;
  channel: InteractionChannel;
  notes: string;
  userId: string;
  userName: string;
  stageAtInteraction: ContactStage;
  date: string;
  createdAt: string;
}

export interface Task {
  id: string;
  contactId: string;
  contactName: string;
  congregation: Congregation;
  description: string;
  assignedToId?: string;
  assignedToName?: string;
  dueDate: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm
  status: TaskStatus;
  completedAt?: string;
  completedBy?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContactsFilterState {
  search: string;
  category: 'all' | ContactCategory;
  stage: 'all' | ContactStage;
  assignedTo: 'all' | string;
  startDate?: string;
  endDate?: string;
  showArchived: boolean;
}

export interface DashboardMetrics {
  activeMembers: number;
  newVisitorsThisMonth: number;
  newContactsThisMonth: number;
  pendingReturnsTotal: number;
  pendingReturnsToday: number;
  pendingReturnsOverdue: number;
}

export interface MonthlyTrendData {
  monthKey: string; // e.g. "2026-04"
  monthLabel: string; // e.g. "Abr 26"
  firstVisits: number;
  memberEntries: number;
}

export type WeeklyConfirmationStatus = 'confirmed' | 'unconfirmed';

export interface WeeklyConfirmationEntry {
  contactId: string;
  name: string;
  category: ContactCategory; // 'Novo contato' (Convidado) | 'Visitante' | 'Membro'
  phone: string;
  congregation: Congregation;
  responsibleId?: string;
  responsibleName?: string;
  status: WeeklyConfirmationStatus; // 'confirmed' (Verde) | 'unconfirmed' (Vermelho)
  absenceReason?: string; // Motivo obrigatório/destacado se 'unconfirmed'
  notes?: string;
  updatedAt: string;
}

export interface WeeklyConfirmationSummary {
  total: number;
  confirmed: number;
  unconfirmed: number;
  confirmationRate: number; // 0 to 100
  byCategory: {
    membros: number;
    visitantes: number;
    convidados: number;
  };
  topReasons: { reason: string; count: number }[];
}

export interface WeeklyConfirmationReport {
  id: string; // e.g. "report-2026-09-21-all"
  weekKey: string; // YYYY-MM-DD representing the Monday
  weekLabel: string; // e.g. "Semana de 21/09 a 27/09/2026"
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  congregation: CongregationFilter;
  entries: WeeklyConfirmationEntry[];
  summary: WeeklyConfirmationSummary;
  savedAt: string;
  savedBy?: string;
}

