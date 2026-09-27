import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  Contact,
  Interaction,
  Task,
  UserProfile,
  Congregation,
  CongregationFilter,
  ContactsFilterState,
  DashboardMetrics,
  MonthlyTrendData,
  ContactViewTab,
  UniReinoEnrollment,
  UniReinoSemester,
  UniReinoStatus,
  ConexaoParticipant,
  ConexaoMembership,
  ConexaoColor,
  ConexaoTeamGoal,
  ConexaoMonthlyResult,
  WeeklyConfirmationReport,
  WeeklyConfirmationEntry,
} from '../types';
import { useAuth } from './AuthContext';
import { CRMService, demoManager, realManager } from '../services/storage';
import { isCurrentMonthInSP, getTaskDueState, getLast6Months } from '../utils/date';
import { getOnlyDigits, normalizePhone } from '../utils/phone';
import { generateEmptyConexaoMonthlyResults } from '../data/mockData';

interface CRMContextType {
  contacts: Contact[];
  tasks: Task[];
  interactions: Interaction[];
  teamMembers: UserProfile[];
  selectedCongregation: CongregationFilter;
  setSelectedCongregation: (cong: CongregationFilter) => void;
  authorizedCongregations: Congregation[];
  filterState: ContactsFilterState;
  setFilterState: React.Dispatch<React.SetStateAction<ContactsFilterState>>;
  resetFilters: () => void;
  metrics: DashboardMetrics;
  monthlyTrends: MonthlyTrendData[];
  upcomingReturns: Task[];
  recentContacts: Contact[];
  filteredContacts: Contact[];
  activeViewTab: ContactViewTab;
  setActiveViewTab: (tab: ContactViewTab) => void;
  toggleWeeklyConfirmation: (contactId: string) => Promise<void>;
  tabCounts: { all: number; membros: number; convidados: number; confirmados: number };
  createContact: (
    contactData: Omit<Contact, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'isArchived' | 'normalizedPhone'>,
    firstReturn?: { description: string; dueDate: string; assignedToId?: string; assignedToName?: string }
  ) => Promise<Contact>;
  updateContact: (id: string, updates: Partial<Contact>) => Promise<void>;
  archiveContact: (id: string) => Promise<void>;
  restoreContact: (id: string) => Promise<void>;
  deleteContactPermanent: (id: string) => Promise<void>;
  addInteraction: (
    interactionData: Omit<Interaction, 'id' | 'createdAt' | 'userId' | 'userName'>,
    newStage?: Contact['stage']
  ) => Promise<void>;
  createTask: (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'createdById' | 'status'>) => Promise<Task>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  toggleTaskStatus: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  checkDuplicatePhone: (phone: string, excludeContactId?: string) => Contact | undefined;
  resetDemoData: () => void;
  users: UserProfile[];
  createUser: (userData: Omit<UserProfile, 'uid' | 'createdAt'>) => Promise<UserProfile>;
  updateUser: (uid: string, updates: Partial<UserProfile>) => Promise<UserProfile>;
  deleteUser: (uid: string) => Promise<void>;
  selectedContact: Contact | null;
  setSelectedContact: (contact: Contact | null) => void;
  isContactDrawerOpen: boolean;
  setIsContactDrawerOpen: (open: boolean) => void;
  openContactDetails: (contact: Contact) => void;
  uniReinoStudents: Contact[];
  enrollInUniReino: (
    contactId: string,
    enrollment: {
      semester?: UniReinoSemester;
      matricula?: string;
      turma?: string;
      notes?: string;
      status?: UniReinoStatus;
    }
  ) => Promise<Contact>;
  updateUniReino: (contactId: string, updates: Partial<UniReinoEnrollment>) => Promise<Contact>;
  advanceUniReinoSemester: (contactId: string) => Promise<Contact>;
  unenrollFromUniReino: (contactId: string) => Promise<Contact>;
  conexaoMembers: Contact[];
  enrollInConexao: (contactId: string, membership: ConexaoMembership) => Promise<Contact>;
  unenrollFromConexao: (contactId: string) => Promise<Contact>;
  conexaoParticipants: ConexaoParticipant[];
  addConexaoParticipant: (
    participant: Omit<ConexaoParticipant, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<ConexaoParticipant>;
  updateConexaoParticipant: (
    id: string,
    updates: Partial<ConexaoParticipant>
  ) => Promise<ConexaoParticipant>;
  deleteConexaoParticipant: (id: string) => Promise<void>;
  toggleConexaoCultoConfirmation: (id: string) => Promise<ConexaoParticipant>;
  addConexaoPoints: (id: string, additionalPoints: number) => Promise<ConexaoParticipant>;
  conexaoGoals: Record<ConexaoColor, ConexaoTeamGoal>;
  updateConexaoGoal: (color: ConexaoColor, updates: Partial<ConexaoTeamGoal>) => Promise<ConexaoTeamGoal>;
  conexaoMonthlyResults: Record<ConexaoColor, ConexaoMonthlyResult[]>;
  updateConexaoMonthlyResult: (color: ConexaoColor, monthIndex: number, updates: Partial<ConexaoMonthlyResult>) => Promise<void>;
  weeklyReports: WeeklyConfirmationReport[];
  saveWeeklyReport: (report: WeeklyConfirmationReport) => Promise<WeeklyConfirmationReport>;
  getWeeklyReport: (weekKey: string, cong?: CongregationFilter) => WeeklyConfirmationReport | undefined;
  deleteWeeklyReport: (id: string) => Promise<void>;
}

const CRMContext = createContext<CRMContextType | undefined>(undefined);

const initialFilterState: ContactsFilterState = {
  search: '',
  category: 'all',
  stage: 'all',
  assignedTo: 'all',
  startDate: '',
  endDate: '',
  showArchived: false,
};

export const CRMProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isDemoMode } = useAuth();

  const [rawContacts, setRawContacts] = useState<Contact[]>([]);
  const [rawTasks, setRawTasks] = useState<Task[]>([]);
  const [rawInteractions, setRawInteractions] = useState<Interaction[]>([]);
  const [rawUsers, setRawUsers] = useState<UserProfile[]>([]);
  const [rawConexaoParticipants, setRawConexaoParticipants] = useState<ConexaoParticipant[]>([]);
  const [rawConexaoGoals, setRawConexaoGoals] = useState<Record<ConexaoColor, ConexaoTeamGoal>>({} as any);
  const [rawConexaoMonthlyResults, setRawConexaoMonthlyResults] = useState<Record<ConexaoColor, ConexaoMonthlyResult[]>>({} as any);
  const [rawWeeklyReports, setRawWeeklyReports] = useState<WeeklyConfirmationReport[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isContactDrawerOpen, setIsContactDrawerOpen] = useState(false);

  // Compute authorized congregations for current user
  const authorizedCongregations: Congregation[] = useMemo(() => {
    if (!currentUser) return ['Recreio', 'Curicica', 'Guaratiba'];
    if (currentUser.role === 'admin') {
      return ['Recreio', 'Curicica', 'Guaratiba'];
    }
    return currentUser.assignedCongregations.length > 0
      ? currentUser.assignedCongregations
      : ['Recreio'];
  }, [currentUser]);

  // Selected congregation filter: Non-master users CANNOT select 'all'
  const [selectedCongregation, setSelectedCongregationState] = useState<CongregationFilter>(() => {
    if (!currentUser || currentUser.role !== 'admin') {
      return authorizedCongregations[0] || 'Curicica';
    }
    return 'all';
  });

  const setSelectedCongregation = (cong: CongregationFilter) => {
    if (!currentUser || currentUser.role !== 'admin') {
      // Non-master cannot choose 'all' or unauthorized congregations
      if (cong === 'all' || !authorizedCongregations.includes(cong as Congregation)) {
        setSelectedCongregationState(authorizedCongregations[0] || 'Curicica');
        return;
      }
    }
    setSelectedCongregationState(cong);
  };

  // Ensure selectedCongregation is strictly aligned with user's permissions
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') {
      if (selectedCongregation === 'all' || !authorizedCongregations.includes(selectedCongregation as Congregation)) {
        setSelectedCongregationState(authorizedCongregations[0] || 'Curicica');
      }
    }
  }, [currentUser, authorizedCongregations, selectedCongregation]);

  const [filterState, setFilterState] = useState<ContactsFilterState>(initialFilterState);
  const [activeViewTab, setActiveViewTab] = useState<ContactViewTab>('all');

  const resetFilters = () => {
    setFilterState(initialFilterState);
    setActiveViewTab('all');
  };

  // Subscribe to active manager (demoManager in demo mode, realManager in real mode)
  useEffect(() => {
    const activeManager = isDemoMode ? demoManager : realManager;
    const loadData = () => {
      const contacts = activeManager.getContacts();
      setRawContacts(contacts);
      setRawTasks(activeManager.getTasks());
      setRawInteractions(activeManager.getInteractions());
      setRawUsers(activeManager.getUsers());
      const participants = activeManager.getConexaoParticipants();
      setRawConexaoParticipants(participants);
      setRawConexaoGoals(activeManager.getConexaoGoals());
      if (!isDemoMode && (!participants || participants.length === 0)) {
        setRawConexaoMonthlyResults(generateEmptyConexaoMonthlyResults());
      } else {
        setRawConexaoMonthlyResults(activeManager.getConexaoMonthlyResults());
      }
      setRawWeeklyReports(activeManager.getWeeklyReports());

      // If a contact was open in the drawer, verify it exists in current dataset
      setSelectedContact(prev => {
        if (!prev) return null;
        const exists = contacts.find(c => c.id === prev.id);
        if (!exists) {
          setIsContactDrawerOpen(false);
          return null;
        }
        return exists;
      });
    };
    loadData();
    const unsub = activeManager.subscribe(loadData);
    return () => unsub();
  }, [isDemoMode]);

  // Filter raw data by user authorization first (strict security & privacy boundary)
  const scopedContacts = useMemo(() => {
    return rawContacts.filter(c => {
      // 1. Congregation boundary
      if (!authorizedCongregations.includes(c.congregation)) {
        return false;
      }
      // 2. Curicica Family boundary: Líder de Família ONLY sees their own family
      if (currentUser?.role === 'lider_familia' && currentUser.assignedCuricicaFamily) {
        if (c.congregation !== 'Curicica' || c.curicicaFamily !== currentUser.assignedCuricicaFamily) {
          return false;
        }
      }
      return true;
    });
  }, [rawContacts, authorizedCongregations, currentUser]);

  const scopedContactIds = useMemo(() => new Set(scopedContacts.map(c => c.id)), [scopedContacts]);

  const scopedTasks = useMemo(() => {
    return rawTasks.filter(t => {
      if (!authorizedCongregations.includes(t.congregation)) return false;
      if (currentUser?.role === 'lider_familia') {
        return scopedContactIds.has(t.contactId);
      }
      return true;
    });
  }, [rawTasks, authorizedCongregations, currentUser, scopedContactIds]);

  const scopedInteractions = useMemo(() => {
    return rawInteractions.filter(i => {
      if (!authorizedCongregations.includes(i.congregation)) return false;
      if (currentUser?.role === 'lider_familia') {
        return scopedContactIds.has(i.contactId);
      }
      return true;
    });
  }, [rawInteractions, authorizedCongregations, currentUser, scopedContactIds]);

  // Apply selected Congregation filter
  const congregationFilteredContacts = useMemo(() => {
    if (selectedCongregation === 'all') return scopedContacts;
    return scopedContacts.filter(c => c.congregation === selectedCongregation);
  }, [scopedContacts, selectedCongregation]);

  const congregationFilteredTasks = useMemo(() => {
    if (selectedCongregation === 'all') return scopedTasks;
    return scopedTasks.filter(t => t.congregation === selectedCongregation);
  }, [scopedTasks, selectedCongregation]);

  const congregationFilteredInteractions = useMemo(() => {
    if (selectedCongregation === 'all') return scopedInteractions;
    return scopedInteractions.filter(i => i.congregation === selectedCongregation);
  }, [scopedInteractions, selectedCongregation]);

  // Conexão Participants: Team leader only sees their color; others filtered by congregation
  const scopedConexaoParticipants = useMemo(() => {
    return rawConexaoParticipants.filter(p => {
      // 1. Team Leader strictly restricted to their assigned team color
      if (currentUser?.role === 'lider_equipe' && currentUser.assignedTeam) {
        if (p.color !== currentUser.assignedTeam) {
          return false;
        }
      }
      // 2. Congregation check if applicable
      if (currentUser?.role !== 'admin' && currentUser?.role !== 'lider_conexao' && currentUser?.role !== 'lider_equipe') {
        if (!authorizedCongregations.includes(p.congregation)) {
          return false;
        }
      }
      return true;
    });
  }, [rawConexaoParticipants, authorizedCongregations, currentUser]);

  const conexaoParticipants = useMemo(() => {
    if (currentUser?.role === 'lider_equipe') return scopedConexaoParticipants;
    if (selectedCongregation === 'all') return scopedConexaoParticipants;
    return scopedConexaoParticipants.filter(p => p.congregation === selectedCongregation);
  }, [scopedConexaoParticipants, selectedCongregation, currentUser]);

  // Weekly reports scoped by congregation and family
  const scopedWeeklyReports = useMemo(() => {
    return rawWeeklyReports
      .filter(r => {
        if (currentUser?.role === 'admin') return true;
        if (r.congregation === 'all') return false; // Non-master cannot see consolidated report
        return authorizedCongregations.includes(r.congregation as Congregation);
      })
      .map(r => {
        if (currentUser?.role === 'lider_familia' && currentUser.assignedCuricicaFamily) {
          const familyContactIds = new Set(scopedContacts.map(c => c.id));
          const filteredEntries = r.entries.filter(e => familyContactIds.has(e.contactId));
          return {
            ...r,
            entries: filteredEntries,
            summary: {
              ...r.summary,
              total: filteredEntries.length,
              confirmed: filteredEntries.filter(e => e.status === 'confirmed').length,
              unconfirmed: filteredEntries.filter(e => e.status === 'unconfirmed').length,
            },
          };
        }
        return r;
      });
  }, [rawWeeklyReports, currentUser, authorizedCongregations, scopedContacts]);

  // Tab counts for the congregation tabs: Membros, Convidados/Visitantes, Confirmados da Semana
  const tabCounts = useMemo(() => {
    const active = congregationFilteredContacts.filter(c => !c.isArchived);
    return {
      all: active.length,
      membros: active.filter(c => c.category === 'Membro').length,
      convidados: active.filter(c => c.category === 'Visitante' || c.category === 'Novo contato').length,
      confirmados: active.filter(c => c.confirmedThisWeek).length,
    };
  }, [congregationFilteredContacts]);

  // Team members list
  const teamMembers = useMemo(() => {
    const activeManager = isDemoMode ? demoManager : realManager;
    return activeManager.getUsers().filter(u => {
      if (selectedCongregation === 'all') return true;
      return u.role === 'admin' || u.assignedCongregations.includes(selectedCongregation as Congregation);
    });
  }, [selectedCongregation, isDemoMode]);

  // Filtered contacts for table and search
  const filteredContacts = useMemo(() => {
    return congregationFilteredContacts.filter(contact => {
      // Archive filter
      if (!filterState.showArchived && contact.isArchived) return false;
      if (filterState.showArchived && !contact.isArchived) return false;

      // Text search (name or phone)
      if (filterState.search.trim()) {
        const queryTerm = filterState.search.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const normName = contact.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const rawDigits = getOnlyDigits(filterState.search);
        const contactDigits = getOnlyDigits(contact.phone);

        const nameMatch = normName.includes(queryTerm);
        const phoneMatch = rawDigits ? contactDigits.includes(rawDigits) : false;

        if (!nameMatch && !phoneMatch) return false;
      }

      // Category filter
      if (filterState.category !== 'all' && contact.category !== filterState.category) {
        return false;
      }

      // Stage filter
      if (filterState.stage !== 'all' && contact.stage !== filterState.stage) {
        return false;
      }

      // Assigned To filter
      if (filterState.assignedTo !== 'all') {
        if (contact.assignedToId !== filterState.assignedTo && contact.assignedToName !== filterState.assignedTo) {
          return false;
        }
      }

      // Date range filter (createdAt)
      if (filterState.startDate) {
        const cDate = contact.createdAt.slice(0, 10);
        if (cDate < filterState.startDate) return false;
      }
      if (filterState.endDate) {
        const cDate = contact.createdAt.slice(0, 10);
        if (cDate > filterState.endDate) return false;
      }

      // Congregation Sub-Tab Filter: Membros, Convidados/Visitantes, Confirmados da Semana
      if (activeViewTab === 'membros' && contact.category !== 'Membro') {
        return false;
      }
      if (activeViewTab === 'convidados' && contact.category !== 'Visitante' && contact.category !== 'Novo contato') {
        return false;
      }
      if (activeViewTab === 'confirmados' && !contact.confirmedThisWeek) {
        return false;
      }

      return true;
    });
  }, [congregationFilteredContacts, filterState, activeViewTab]);

  // Dashboard Metrics calculation
  const metrics: DashboardMetrics = useMemo(() => {
    const activeContacts = congregationFilteredContacts.filter(c => !c.isArchived);

    // 1. Membros ativos: não arquivados cuja categoria seja "Membro"
    const activeMembers = activeContacts.filter(c => c.category === 'Membro').length;

    // 2. Novos visitantes neste mês: cuja primeira visita ocorreu no mês atual
    const newVisitorsThisMonth = activeContacts.filter(c => isCurrentMonthInSP(c.firstVisitDate)).length;

    // 3. Novos cadastros neste mês: todos os contatos cadastrados no mês atual
    const newContactsThisMonth = activeContacts.filter(c => isCurrentMonthInSP(c.createdAt)).length;

    // 4. Retornos pendentes: tarefas abertas hoje ou atrasadas de contatos não arquivados
    const activeContactIds = new Set(activeContacts.map(c => c.id));
    const openTasks = congregationFilteredTasks.filter(
      t => t.status === 'pending' && activeContactIds.has(t.contactId)
    );

    let todayCount = 0;
    let overdueCount = 0;

    openTasks.forEach(t => {
      const state = getTaskDueState(t.dueDate);
      if (state === 'today') todayCount++;
      if (state === 'overdue') overdueCount++;
    });

    return {
      activeMembers,
      newVisitorsThisMonth,
      newContactsThisMonth,
      pendingReturnsTotal: todayCount + overdueCount,
      pendingReturnsToday: todayCount,
      pendingReturnsOverdue: overdueCount,
    };
  }, [congregationFilteredContacts, congregationFilteredTasks]);

  // Monthly trends for 6-month chart
  const monthlyTrends: MonthlyTrendData[] = useMemo(() => {
    const months = getLast6Months();
    const activeContacts = congregationFilteredContacts.filter(c => !c.isArchived);

    return months.map(m => {
      // First visits in this month
      const firstVisits = activeContacts.filter(c => {
        if (!c.firstVisitDate) return false;
        return c.firstVisitDate.startsWith(m.key);
      }).length;

      // Member entries in this month
      const memberEntries = activeContacts.filter(c => {
        if (!c.memberSinceDate) return false;
        return c.memberSinceDate.startsWith(m.key);
      }).length;

      return {
        monthKey: m.key,
        monthLabel: m.label,
        firstVisits,
        memberEntries,
      };
    });
  }, [congregationFilteredContacts]);

  // Upcoming and overdue returns for dashboard list
  const upcomingReturns: Task[] = useMemo(() => {
    const activeContactIds = new Set(congregationFilteredContacts.filter(c => !c.isArchived).map(c => c.id));
    return congregationFilteredTasks
      .filter(t => t.status === 'pending' && activeContactIds.has(t.contactId))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 6);
  }, [congregationFilteredContacts, congregationFilteredTasks]);

  // 5 Most recent contacts
  const recentContacts: Contact[] = useMemo(() => {
    return [...congregationFilteredContacts]
      .filter(c => !c.isArchived)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5);
  }, [congregationFilteredContacts]);

  // Duplicate phone check
  const checkDuplicatePhone = (phone: string, excludeContactId?: string): Contact | undefined => {
    const normalized = normalizePhone(phone);
    if (!normalized || normalized.length < 10) return undefined;

    return scopedContacts.find(c => {
      if (excludeContactId && c.id === excludeContactId) return false;
      return c.normalizedPhone === normalized || normalizePhone(c.phone) === normalized;
    });
  };

  // Actions
  const createContact = async (
    contactData: Omit<Contact, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'isArchived' | 'normalizedPhone'>,
    firstReturn?: { description: string; dueDate: string; assignedToId?: string; assignedToName?: string }
  ): Promise<Contact> => {
    // Enforce congregation & family permissions on create
    let finalCongregation = contactData.congregation;
    let finalFamily = contactData.curicicaFamily;

    if (currentUser?.role === 'lider_familia' && currentUser.assignedCuricicaFamily) {
      finalCongregation = 'Curicica';
      finalFamily = currentUser.assignedCuricicaFamily;
    } else if (currentUser?.role !== 'admin' && authorizedCongregations.length === 1) {
      finalCongregation = authorizedCongregations[0];
    }

    const normalizedPhone = normalizePhone(contactData.phone);
    const newContact = await CRMService.createContact(
      {
        ...contactData,
        congregation: finalCongregation,
        curicicaFamily: finalFamily,
        normalizedPhone,
        isArchived: false,
        createdBy: currentUser?.uid || 'user',
      },
      isDemoMode
    );

    // If first return scheduled, create initial task
    if (firstReturn && firstReturn.description && firstReturn.dueDate) {
      await CRMService.createTask(
        {
          contactId: newContact.id,
          contactName: newContact.name,
          congregation: newContact.congregation,
          description: firstReturn.description,
          assignedToId: firstReturn.assignedToId || newContact.assignedToId,
          assignedToName: firstReturn.assignedToName || newContact.assignedToName,
          dueDate: firstReturn.dueDate,
          status: 'pending',
          createdById: currentUser?.uid || 'user',
        },
        isDemoMode
      );
    }

    return newContact;
  };

  const updateContact = async (id: string, updates: Partial<Contact>): Promise<void> => {
    if (updates.phone) {
      updates.normalizedPhone = normalizePhone(updates.phone);
    }
    await CRMService.updateContact(id, updates, isDemoMode);

    if (selectedContact && selectedContact.id === id) {
      setSelectedContact(prev => (prev ? { ...prev, ...updates } : null));
    }
  };

  const archiveContact = async (id: string): Promise<void> => {
    await CRMService.archiveContact(id, isDemoMode);
    if (selectedContact?.id === id) {
      setSelectedContact(prev => (prev ? { ...prev, isArchived: true } : null));
    }
  };

  const restoreContact = async (id: string): Promise<void> => {
    await CRMService.restoreContact(id, isDemoMode);
    if (selectedContact?.id === id) {
      setSelectedContact(prev => (prev ? { ...prev, isArchived: false } : null));
    }
  };

  const deleteContactPermanent = async (id: string): Promise<void> => {
    if (currentUser?.role !== 'admin') {
      throw new Error('Apenas administradores podem excluir contatos permanentemente.');
    }
    await CRMService.deleteContactPermanent(id, isDemoMode);
    if (selectedContact?.id === id) {
      setSelectedContact(null);
      setIsContactDrawerOpen(false);
    }
  };

  const addInteraction = async (
    interactionData: Omit<Interaction, 'id' | 'createdAt' | 'userId' | 'userName'>,
    newStage?: Contact['stage']
  ): Promise<void> => {
    await CRMService.createInteraction(
      {
        ...interactionData,
        userId: currentUser?.uid || 'user',
        userName: currentUser?.name || 'Equipe',
      },
      isDemoMode
    );

    // If stage changed, update contact stage and record
    if (newStage) {
      await updateContact(interactionData.contactId, { stage: newStage });
    }
  };

  const createTask = async (
    taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'createdById' | 'status'>
  ): Promise<Task> => {
    return CRMService.createTask(
      {
        ...taskData,
        status: 'pending',
        createdById: currentUser?.uid || 'user',
      },
      isDemoMode
    );
  };

  const updateTask = async (id: string, updates: Partial<Task>): Promise<void> => {
    await CRMService.updateTask(id, updates, isDemoMode);
  };

  const toggleTaskStatus = async (id: string): Promise<void> => {
    const task = rawTasks.find(t => t.id === id);
    if (!task) return;

    const newStatus = task.status === 'pending' ? 'completed' : 'pending';
    const now = new Date().toISOString();

    await CRMService.updateTask(
      id,
      {
        status: newStatus,
        completedAt: newStatus === 'completed' ? now : undefined,
        completedBy: newStatus === 'completed' ? currentUser?.name || 'Equipe' : undefined,
      },
      isDemoMode
    );
  };

  const deleteTask = async (id: string): Promise<void> => {
    await CRMService.deleteTask(id, isDemoMode);
  };

  const resetDemoData = () => {
    demoManager.resetDemoData();
  };

  const toggleWeeklyConfirmation = async (contactId: string): Promise<void> => {
    const updated = await CRMService.toggleWeeklyConfirmation(contactId, isDemoMode);
    if (selectedContact?.id === contactId) {
      setSelectedContact(updated);
    }
  };

  const createUser = async (userData: Omit<UserProfile, 'uid' | 'createdAt'>): Promise<UserProfile> => {
    return CRMService.createUser(userData, isDemoMode);
  };

  const updateUser = async (uid: string, updates: Partial<UserProfile>): Promise<UserProfile> => {
    return CRMService.updateUser(uid, updates, isDemoMode);
  };

  const deleteUser = async (uid: string): Promise<void> => {
    return CRMService.deleteUser(uid, isDemoMode);
  };

  const openContactDetails = (contact: Contact) => {
    setSelectedContact(contact);
    setIsContactDrawerOpen(true);
  };

  // Uni Reino enrolled students
  const uniReinoStudents: Contact[] = useMemo(() => {
    return congregationFilteredContacts.filter(
      c => c.uniReino && c.uniReino.isEnrolled && !c.isArchived
    );
  }, [congregationFilteredContacts]);

  const enrollInUniReino = async (
    contactId: string,
    enrollment: {
      semester?: UniReinoSemester;
      matricula?: string;
      turma?: string;
      notes?: string;
      status?: UniReinoStatus;
    }
  ): Promise<Contact> => {
    const updated = await CRMService.enrollInUniReino(contactId, enrollment, isDemoMode);
    if (selectedContact?.id === contactId) {
      setSelectedContact(updated);
    }
    return updated;
  };

  const updateUniReino = async (
    contactId: string,
    updates: Partial<UniReinoEnrollment>
  ): Promise<Contact> => {
    const updated = await CRMService.updateUniReino(contactId, updates, isDemoMode);
    if (selectedContact?.id === contactId) {
      setSelectedContact(updated);
    }
    return updated;
  };

  const advanceUniReinoSemester = async (contactId: string): Promise<Contact> => {
    const updated = await CRMService.advanceUniReinoSemester(contactId, isDemoMode);
    if (selectedContact?.id === contactId) {
      setSelectedContact(updated);
    }
    return updated;
  };

  const unenrollFromUniReino = async (contactId: string): Promise<Contact> => {
    const updated = await CRMService.unenrollFromUniReino(contactId, isDemoMode);
    if (selectedContact?.id === contactId) {
      setSelectedContact(updated);
    }
    return updated;
  };

  // Conexão Jovem church members
  const conexaoMembers: Contact[] = useMemo(() => {
    return congregationFilteredContacts.filter(
      c => c.conexaoJovem && !c.isArchived
    );
  }, [congregationFilteredContacts]);

  const enrollInConexao = async (
    contactId: string,
    membership: ConexaoMembership
  ): Promise<Contact> => {
    const updated = await CRMService.enrollInConexao(contactId, membership, isDemoMode);
    if (selectedContact?.id === contactId) {
      setSelectedContact(updated);
    }
    return updated;
  };

  const unenrollFromConexao = async (contactId: string): Promise<Contact> => {
    const updated = await CRMService.unenrollFromConexao(contactId, isDemoMode);
    if (selectedContact?.id === contactId) {
      setSelectedContact(updated);
    }
    return updated;
  };

  // Conexão Jovem Handlers
  const addConexaoParticipant = async (
    participant: Omit<ConexaoParticipant, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ConexaoParticipant> => {
    let finalColor = participant.color;
    if (currentUser?.role === 'lider_equipe' && currentUser.assignedTeam) {
      finalColor = currentUser.assignedTeam as ConexaoColor;
    }
    return CRMService.addConexaoParticipant({
      ...participant,
      color: finalColor,
    }, isDemoMode);
  };

  const updateConexaoParticipant = async (
    id: string,
    updates: Partial<ConexaoParticipant>
  ): Promise<ConexaoParticipant> => {
    return CRMService.updateConexaoParticipant(id, updates, isDemoMode);
  };

  const deleteConexaoParticipant = async (id: string): Promise<void> => {
    return CRMService.deleteConexaoParticipant(id, isDemoMode);
  };

  const toggleConexaoCultoConfirmation = async (id: string): Promise<ConexaoParticipant> => {
    return CRMService.toggleConexaoCultoConfirmation(id, isDemoMode);
  };

  const addConexaoPoints = async (id: string, additionalPoints: number): Promise<ConexaoParticipant> => {
    return CRMService.addConexaoPoints(id, additionalPoints, isDemoMode);
  };

  const updateConexaoGoal = async (
    color: ConexaoColor,
    updates: Partial<ConexaoTeamGoal>
  ): Promise<ConexaoTeamGoal> => {
    return CRMService.updateConexaoGoal(color, updates, isDemoMode);
  };

  const updateConexaoMonthlyResult = async (
    color: ConexaoColor,
    monthIndex: number,
    updates: Partial<ConexaoMonthlyResult>
  ): Promise<void> => {
    return CRMService.updateConexaoMonthlyResult(color, monthIndex, updates, isDemoMode);
  };

  const saveWeeklyReport = async (report: WeeklyConfirmationReport): Promise<WeeklyConfirmationReport> => {
    const saved = await CRMService.saveWeeklyReport(report, isDemoMode);
    setRawWeeklyReports(prev => {
      const idx = prev.findIndex(
        r => r.id === saved.id || (r.weekKey === saved.weekKey && r.congregation === saved.congregation)
      );
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = saved;
        return copy;
      }
      return [saved, ...prev];
    });
    return saved;
  };

  const getWeeklyReport = (weekKey: string, cong?: CongregationFilter): WeeklyConfirmationReport | undefined => {
    const targetCong = cong || selectedCongregation;
    return scopedWeeklyReports.find(r => r.weekKey === weekKey && (r.congregation === targetCong || r.congregation === 'all'));
  };

  const deleteWeeklyReport = async (id: string): Promise<void> => {
    await CRMService.deleteWeeklyReport(id, isDemoMode);
    setRawWeeklyReports(prev => prev.filter(r => r.id !== id));
  };

  return (
    <CRMContext.Provider
      value={{
        contacts: scopedContacts,
        tasks: scopedTasks,
        interactions: scopedInteractions,
        teamMembers,
        selectedCongregation,
        setSelectedCongregation,
        authorizedCongregations,
        filterState,
        setFilterState,
        resetFilters,
        metrics,
        monthlyTrends,
        upcomingReturns,
        recentContacts,
        filteredContacts,
        activeViewTab,
        setActiveViewTab,
        weeklyReports: scopedWeeklyReports,
        saveWeeklyReport,
        getWeeklyReport,
        deleteWeeklyReport,
        tabCounts,
        toggleWeeklyConfirmation,
        createContact,
        updateContact,
        archiveContact,
        restoreContact,
        deleteContactPermanent,
        addInteraction,
        createTask,
        updateTask,
        toggleTaskStatus,
        deleteTask,
        checkDuplicatePhone,
        resetDemoData,
        users: rawUsers,
        createUser,
        updateUser,
        deleteUser,
        selectedContact,
        setSelectedContact,
        isContactDrawerOpen,
        setIsContactDrawerOpen,
        openContactDetails,
        uniReinoStudents,
        enrollInUniReino,
        updateUniReino,
        advanceUniReinoSemester,
        unenrollFromUniReino,
        conexaoMembers,
        enrollInConexao,
        unenrollFromConexao,
        conexaoParticipants,
        addConexaoParticipant,
        updateConexaoParticipant,
        deleteConexaoParticipant,
        toggleConexaoCultoConfirmation,
        addConexaoPoints,
        conexaoGoals: rawConexaoGoals,
        updateConexaoGoal,
        conexaoMonthlyResults: rawConexaoMonthlyResults,
        updateConexaoMonthlyResult,
      }}
    >
      {children}
    </CRMContext.Provider>
  );
};

export const useCRM = () => {
  const context = useContext(CRMContext);
  if (!context) {
    throw new Error('useCRM must be used within a CRMProvider');
  }
  return context;
};
