import React, { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CRMProvider, useCRM } from './context/CRMContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { MobileDrawer } from './components/MobileDrawer';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ContactsPage } from './pages/ContactsPage';
import { FollowUpPage } from './pages/FollowUpPage';
import { TeamAccessPage } from './pages/TeamAccessPage';
import { ChangePasswordPage } from './pages/ChangePasswordPage';
import { ChurchesPage } from './pages/ChurchesPage';
import { ConfirmadosSemanaPage } from './pages/ConfirmadosSemanaPage';
import { UniReinoPage } from './pages/UniReinoPage';
import { ConexaoJovemPage } from './pages/ConexaoJovemPage';
import { CuricicaFamiliesPage } from './pages/CuricicaFamiliesPage';
import { ContactFormModal } from './components/ContactFormModal';
import { ContactDetailsDrawer } from './components/ContactDetailsDrawer';
import { InteractionModal } from './components/InteractionModal';
import { TaskModal } from './components/TaskModal';
import { TeamMemberModal } from './components/TeamMemberModal';
import { DeleteConfirmationModal } from './components/DeleteConfirmationModal';
import { SetupInstructionsModal } from './components/SetupInstructionsModal';
import { Contact, Task, MainTab, UserProfile } from './types';
import { getAllowedTabsForUser, getDefaultTabForUser } from './utils/permissions';

const MainCRMApp: React.FC = () => {
  const { currentUser, isLoading, isDemoMode } = useAuth();
  const {
    archiveContact,
    restoreContact,
    deleteContactPermanent,
    selectedContact,
    setSelectedContact,
    isContactDrawerOpen,
    setIsContactDrawerOpen,
    openContactDetails,
  } = useCRM();

  // Mode change notification
  const [modeNotice, setModeNotice] = useState<string | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setModeNotice(
      isDemoMode
        ? 'Modo Demonstração ativado (exibindo dados de teste)'
        : 'Modo Real ativado (exibindo dados oficiais da igreja)'
    );
    const timer = setTimeout(() => {
      setModeNotice(null);
    }, 3200);
    return () => clearTimeout(timer);
  }, [isDemoMode]);

  // Permissions & Allowed tabs for current user
  const allowedTabs = React.useMemo(() => getAllowedTabsForUser(currentUser), [currentUser]);

  // Navigation state persisted across mode changes and page reloads
  const [activeTab, setActiveTabState] = useState<MainTab>(() => {
    const saved = localStorage.getItem('casadedeus_active_tab') as MainTab | null;
    const defaultTab = getDefaultTabForUser(currentUser);
    const validTabs: MainTab[] = [
      'dashboard',
      'igrejas',
      'curicica',
      'confirmados',
      'conexaojovem',
      'contacts',
      'unireino',
      'followup',
      'team',
      'security',
    ];
    if (saved && validTabs.includes(saved)) {
      return saved;
    }
    return defaultTab;
  });

  const setActiveTab = (tab: MainTab) => {
    localStorage.setItem('casadedeus_active_tab', tab);
    setActiveTabState(tab);
  };

  // Enforce access control guard: If activeTab is not permitted, immediately redirect to default allowed tab
  useEffect(() => {
    if (currentUser && allowedTabs.length > 0) {
      if (!allowedTabs.includes(activeTab)) {
        const defaultTab = getDefaultTabForUser(currentUser);
        setActiveTab(defaultTab);
      }
    }
  }, [currentUser, allowedTabs, activeTab]);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Modals state
  const [isNewContactOpen, setIsNewContactOpen] = useState(false);
  const [contactToEdit, setContactToEdit] = useState<Contact | null>(null);

  const [isInteractionModalOpen, setIsInteractionModalOpen] = useState(false);
  const [targetContactForInteraction, setTargetContactForInteraction] = useState<Contact | null>(null);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [targetContactForTask, setTargetContactForTask] = useState<Contact | null>(null);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  // Team Access Modal state
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<UserProfile | null>(null);

  const [isSetupInstructionsOpen, setIsSetupInstructionsOpen] = useState(false);

  // Deletion / Archiving confirmation modal state
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmContact, setConfirmContact] = useState<Contact | null>(null);
  const [confirmActionType, setConfirmActionType] = useState<'archive' | 'restore' | 'deletePermanent'>('archive');
  const [isConfirmSubmitting, setIsConfirmSubmitting] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span className="text-xs uppercase tracking-widest text-[#888888]">Carregando Casa de Deus CRM...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <LoginPage
        onOpenSetupInstructions={() => setIsSetupInstructionsOpen(true)}
      />
    );
  }

  // Handlers for modal interactions
  const handleOpenEditContact = (contact: Contact) => {
    setContactToEdit(contact);
    setIsNewContactOpen(true);
  };

  const handleOpenNewInteraction = (contact: Contact) => {
    setTargetContactForInteraction(contact);
    setIsInteractionModalOpen(true);
  };

  const handleOpenNewTask = (contact?: Contact) => {
    setTargetContactForTask(contact || null);
    setTaskToEdit(null);
    setIsTaskModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setTaskToEdit(task);
    setIsTaskModalOpen(true);
  };

  const handleRequestArchive = (contact: Contact) => {
    setConfirmContact(contact);
    setConfirmActionType('archive');
    setIsConfirmModalOpen(true);
  };

  const handleRequestRestore = (contact: Contact) => {
    setConfirmContact(contact);
    setConfirmActionType('restore');
    setIsConfirmModalOpen(true);
  };

  const handleOpenNewMember = () => {
    setUserToEdit(null);
    setIsTeamModalOpen(true);
  };

  const handleEditMember = (user: UserProfile) => {
    setUserToEdit(user);
    setIsTeamModalOpen(true);
  };

  const handleRequestDeletePermanent = (contact: Contact) => {
    setConfirmContact(contact);
    setConfirmActionType('deletePermanent');
    setIsConfirmModalOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!confirmContact) return;
    setIsConfirmSubmitting(true);
    try {
      if (confirmActionType === 'archive') {
        await archiveContact(confirmContact.id);
      } else if (confirmActionType === 'restore') {
        await restoreContact(confirmContact.id);
      } else if (confirmActionType === 'deletePermanent') {
        await deleteContactPermanent(confirmContact.id);
      }
      setIsConfirmModalOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsConfirmSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#000000] text-white flex flex-col">
      {/* Top Navbar */}
      <Navbar
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        onOpenNewContact={() => {
          setContactToEdit(null);
          setIsNewContactOpen(true);
        }}
        onOpenSetupInstructions={() => setIsSetupInstructionsOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Layout Area */}
      <div className="flex grow">
        {/* Desktop Sidebar */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Mobile Navigation Drawer */}
        <MobileDrawer
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenNewContact={() => {
            setContactToEdit(null);
            setIsNewContactOpen(true);
          }}
        />

        {/* Primary Page Content */}
        <main className="grow p-4 md:p-6 lg:p-8 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <DashboardPage
              onOpenNewContact={() => {
                setContactToEdit(null);
                setIsNewContactOpen(true);
              }}
              onNavigateToContacts={() => setActiveTab('contacts')}
              onNavigateToFollowUp={() => setActiveTab('followup')}
              onOpenContactDetails={openContactDetails}
              onNavigateToIgrejas={() => setActiveTab('igrejas')}
              onNavigateToConexao={() => setActiveTab('conexaojovem')}
              onNavigateToConfirmados={() => setActiveTab('confirmados')}
            />
          )}

          {activeTab === 'igrejas' && (
            <ChurchesPage
              onNavigateToTab={(tab) => setActiveTab(tab)}
              onOpenNewContact={() => {
                setContactToEdit(null);
                setIsNewContactOpen(true);
              }}
            />
          )}

          {activeTab === 'curicica' && (
            <CuricicaFamiliesPage
              onOpenContactDetails={openContactDetails}
              onOpenNewContact={(defaultFamily) => {
                setContactToEdit(null);
                setIsNewContactOpen(true);
              }}
              onOpenNewInteraction={handleOpenNewInteraction}
            />
          )}

          {activeTab === 'confirmados' && (
            <ConfirmadosSemanaPage
              onOpenContactDetails={openContactDetails}
              onOpenNewContact={() => {
                setContactToEdit(null);
                setIsNewContactOpen(true);
              }}
            />
          )}

          {activeTab === 'contacts' && (
            <ContactsPage
              onOpenNewContact={() => {
                setContactToEdit(null);
                setIsNewContactOpen(true);
              }}
              onOpenContactDetails={openContactDetails}
              onOpenNewInteraction={handleOpenNewInteraction}
              onOpenNewTask={handleOpenNewTask}
              onOpenEditContact={handleOpenEditContact}
              onRequestArchive={handleRequestArchive}
              onRequestRestore={handleRequestRestore}
              onRequestDeletePermanent={handleRequestDeletePermanent}
            />
          )}

          {activeTab === 'unireino' && (
            <UniReinoPage onOpenContactDetails={openContactDetails} />
          )}

          {activeTab === 'conexaojovem' && (
            <ConexaoJovemPage onOpenContactDetails={openContactDetails} />
          )}

          {activeTab === 'followup' && (
            <FollowUpPage
              onOpenNewTask={handleOpenNewTask}
              onOpenContactDetails={openContactDetails}
              onEditTask={handleEditTask}
            />
          )}

          {activeTab === 'team' && (
            <TeamAccessPage
              onOpenNewMember={handleOpenNewMember}
              onEditMember={handleEditMember}
            />
          )}

          {activeTab === 'security' && (
            <ChangePasswordPage />
          )}
        </main>
      </div>

      {/* Modals and Slide-over Drawers */}
      <ContactFormModal
        isOpen={isNewContactOpen}
        onClose={() => {
          setIsNewContactOpen(false);
          setContactToEdit(null);
        }}
        contactToEdit={contactToEdit}
      />

      <ContactDetailsDrawer
        contact={selectedContact}
        isOpen={isContactDrawerOpen}
        onClose={() => {
          setIsContactDrawerOpen(false);
          setSelectedContact(null);
        }}
        onOpenEdit={handleOpenEditContact}
        onOpenNewInteraction={handleOpenNewInteraction}
        onOpenNewTask={handleOpenNewTask}
        onRequestArchive={handleRequestArchive}
        onRequestRestore={handleRequestRestore}
        onRequestDeletePermanent={handleRequestDeletePermanent}
      />

      <InteractionModal
        isOpen={isInteractionModalOpen}
        onClose={() => {
          setIsInteractionModalOpen(false);
          setTargetContactForInteraction(null);
        }}
        contact={targetContactForInteraction}
      />

      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setTargetContactForTask(null);
          setTaskToEdit(null);
        }}
        contact={targetContactForTask}
        taskToEdit={taskToEdit}
      />

      <TeamMemberModal
        isOpen={isTeamModalOpen}
        onClose={() => {
          setIsTeamModalOpen(false);
          setUserToEdit(null);
        }}
        userToEdit={userToEdit}
      />

      <DeleteConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        contact={confirmContact}
        actionType={confirmActionType}
        onConfirm={handleConfirmAction}
        isSubmitting={isConfirmSubmitting}
      />

      <SetupInstructionsModal
        isOpen={isSetupInstructionsOpen}
        onClose={() => setIsSetupInstructionsOpen(false)}
      />

      {/* Floating mode switch feedback: confirms current view updated without changing screen */}
      {modeNotice && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 bg-[#111111] border border-white/20 rounded-xl shadow-2xl text-xs font-semibold text-white animate-fadeIn">
          <span className={`w-2.5 h-2.5 rounded-full ${isDemoMode ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
          <span>{modeNotice}</span>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <CRMProvider>
        <MainCRMApp />
      </CRMProvider>
    </AuthProvider>
  );
}
