import React from 'react';
import { useCRM } from '../context/CRMContext';
import { formatDateBR, getTaskDueState } from '../utils/date';
import { Contact, Task } from '../types';
import {
  Users,
  UserCheck,
  UserPlus,
  Clock,
  ArrowRight,
  Plus,
  AlertCircle,
  Calendar,
  ChevronRight,
  Crown,
  Church,
  CheckCheck,
} from 'lucide-react';
import { ConexaoLogo } from '../components/ConexaoLogo';
import { UniReinoBadge } from '../components/UniReinoBadge';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';

interface DashboardPageProps {
  onOpenNewContact: () => void;
  onNavigateToContacts: () => void;
  onNavigateToFollowUp: () => void;
  onOpenContactDetails: (contact: Contact) => void;
  onNavigateToIgrejas?: () => void;
  onNavigateToConexao?: () => void;
  onNavigateToConfirmados?: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onOpenNewContact,
  onNavigateToContacts,
  onNavigateToFollowUp,
  onOpenContactDetails,
  onNavigateToIgrejas,
  onNavigateToConexao,
  onNavigateToConfirmados,
}) => {
  const {
    metrics,
    monthlyTrends,
    upcomingReturns,
    recentContacts,
    selectedCongregation,
    contacts,
    conexaoParticipants,
  } = useCRM();

  const confirmedCount = contacts.filter(c => c.confirmedThisWeek && !c.isArchived).length;

  const getCongregationTitle = () => {
    if (selectedCongregation === 'all') return 'Todas as Congregações (Visão Consolidada)';
    return `Congregação ${selectedCongregation}`;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner / Headline */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#1F1F1F]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white font-heading tracking-tight">
            Painel Geral de Cuidado
          </h1>
          <p className="text-xs sm:text-sm text-[#888888] mt-0.5">
            {getCongregationTitle()}
          </p>
        </div>

        <button
          onClick={onOpenNewContact}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white text-black font-semibold text-xs sm:text-sm rounded-lg hover:bg-neutral-200 transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Novo Contato</span>
        </button>
      </div>

      {/* 4 Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Membros Ativos */}
        <div className="p-4 bg-[#0B0B0B] border border-[#262626] rounded-xl space-y-2 hover:border-[#383838] transition-colors">
          <div className="flex items-center justify-between text-[#888888]">
            <span className="text-xs uppercase font-bold tracking-wider font-sans">
              Membros Ativos
            </span>
            <UserCheck className="w-4 h-4 text-white" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white font-heading">
            {metrics.activeMembers}
          </div>
          <p className="text-[11px] text-[#777777]">
            Integrados e atuantes na congregação
          </p>
        </div>

        {/* 2. Novos Visitantes neste mês */}
        <div className="p-4 bg-[#0B0B0B] border border-[#262626] rounded-xl space-y-2 hover:border-[#383838] transition-colors">
          <div className="flex items-center justify-between text-[#888888]">
            <span className="text-xs uppercase font-bold tracking-wider font-sans">
              Novos Visitantes (Mês)
            </span>
            <Users className="w-4 h-4 text-white" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white font-heading">
            {metrics.newVisitorsThisMonth}
          </div>
          <p className="text-[11px] text-[#777777]">
            Primeira visita registrada no mês atual
          </p>
        </div>

        {/* 3. Novos Cadastros neste mês */}
        <div className="p-4 bg-[#0B0B0B] border border-[#262626] rounded-xl space-y-2 hover:border-[#383838] transition-colors">
          <div className="flex items-center justify-between text-[#888888]">
            <span className="text-xs uppercase font-bold tracking-wider font-sans">
              Cadastros no Mês
            </span>
            <UserPlus className="w-4 h-4 text-white" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white font-heading">
            {metrics.newContactsThisMonth}
          </div>
          <p className="text-[11px] text-[#777777]">
            Entradas no CRM no mês corrente
          </p>
        </div>

        {/* 4. Retornos Pendentes (com separação Hoje vs Atrasados) */}
        <div
          onClick={onNavigateToFollowUp}
          className="p-4 bg-[#0B0B0B] border border-[#262626] rounded-xl space-y-2 hover:border-[#383838] transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between text-[#888888]">
            <span className="text-xs uppercase font-bold tracking-wider font-sans group-hover:text-white transition-colors">
              Retornos Pendentes
            </span>
            <Clock className="w-4 h-4 text-white" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white font-heading">
            {metrics.pendingReturnsTotal}
          </div>
          <div className="flex items-center gap-2 pt-0.5 text-[11px]">
            <span className="inline-flex items-center gap-1 text-[#CCCCCC] bg-[#141414] px-1.5 py-0.5 rounded border border-[#262626]">
              Hoje: <strong>{metrics.pendingReturnsToday}</strong>
            </span>
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border ${
                metrics.pendingReturnsOverdue > 0
                  ? 'bg-neutral-900 text-white font-semibold border-neutral-700'
                  : 'bg-[#141414] text-[#777777] border-[#222222]'
              }`}
            >
              Atrasados: <strong>{metrics.pendingReturnsOverdue}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Quick Weekly Confirmation Banner */}
      <div
        onClick={onNavigateToConfirmados}
        className="p-4 bg-gradient-to-r from-[#0C1510] via-[#0E0E0E] to-[#0A0A0A] border border-emerald-500/25 hover:border-emerald-500/50 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition-all group shadow-sm hover:shadow-emerald-950/20"
      >
        <div className="flex items-center gap-3.5">
          <span className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 group-hover:scale-105 transition-transform shrink-0">
            <CheckCheck className="w-5 h-5" />
          </span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                Confirmados da Semana para o Culto
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {confirmedCount} confirmados
              </span>
            </div>
            <p className="text-xs text-[#888888] mt-0.5">
              Acompanhe a lista de membros, visitantes e convidados para o culto, registre justificativas de ausência e audite o histórico.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs font-semibold text-emerald-400 shrink-0 self-end sm:self-center">
          <span>Abrir Painel</span>
          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>

      {/* Chart: Evolução dos Últimos 6 Meses */}
      <div className="p-5 bg-[#0B0B0B] border border-[#262626] rounded-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-white font-heading">
              Evolução dos Últimos 6 Meses
            </h2>
            <p className="text-xs text-[#888888]">
              Comparativo entre primeiras visitas e entradas como membro
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-[#888888]">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-white inline-block" />
              <span>Primeiras Visitas</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-[#888888] inline-block" />
              <span>Entrada como Membro</span>
            </div>
          </div>
        </div>

        <div className="h-64 sm:h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={monthlyTrends}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid stroke="#1C1C1C" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="monthLabel"
                stroke="#666666"
                tick={{ fill: '#888888', fontSize: 11 }}
                axisLine={{ stroke: '#262626' }}
                tickLine={false}
              />
              <YAxis
                stroke="#666666"
                tick={{ fill: '#888888', fontSize: 11 }}
                axisLine={{ stroke: '#262626' }}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0F0F0F',
                  borderColor: '#262626',
                  borderRadius: '8px',
                  color: '#FFFFFF',
                  fontSize: '12px',
                }}
                labelStyle={{ color: '#AAAAAA', fontWeight: 600, marginBottom: '4px' }}
              />
              <Line
                type="monotone"
                dataKey="firstVisits"
                name="Primeiras Visitas"
                stroke="#FFFFFF"
                strokeWidth={2}
                dot={{ fill: '#000000', stroke: '#FFFFFF', strokeWidth: 2, r: 3.5 }}
                activeDot={{ r: 5, fill: '#FFFFFF' }}
              />
              <Line
                type="monotone"
                dataKey="memberEntries"
                name="Entrada como Membro"
                stroke="#888888"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{ fill: '#000000', stroke: '#888888', strokeWidth: 2, r: 3.5 }}
                activeDot={{ r: 5, fill: '#888888' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Destaque das Igrejas e Ministérios */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card Igrejas */}
        <div className="p-5 bg-gradient-to-br from-[#0F0F0F] via-[#121212] to-[#0A0A0A] border border-[#222222] rounded-xl flex items-center justify-between gap-4 shadow-lg hover:border-[#333333] transition-colors">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-white shrink-0">
              <Church className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#888888]">
                Congregações & Sedes
              </span>
              <h4 className="text-sm font-bold text-white">Nossas Igrejas</h4>
              <p className="text-xs text-[#999999]">Recreio (Sede), Curicica e Guaratiba</p>
            </div>
          </div>
          {onNavigateToIgrejas && (
            <button
              onClick={onNavigateToIgrejas}
              className="px-3 py-1.5 bg-[#1C1C1C] hover:bg-[#252525] text-white border border-[#333333] text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shrink-0"
            >
              <span>Ver Igrejas</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Card Conexão Jovem */}
        <div className="p-5 bg-gradient-to-br from-[#120E05] via-[#14120A] to-[#0A0A0A] border border-amber-500/30 rounded-xl flex items-center justify-between gap-4 shadow-lg hover:border-amber-500/50 transition-colors">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-black border border-white/10 flex items-center justify-center shrink-0 font-bold shadow-md shadow-amber-500/20">
              <ConexaoLogo size="sm" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-extrabold tracking-widest text-amber-400">
                Ministério Oficial
              </span>
              <h4 className="text-sm font-bold text-white">Conexão Jovem • 6 Cores</h4>
              <p className="text-xs text-[#AAAAAA]">
                {conexaoParticipants.length} jovens • Bases, Membros e Convidados
              </p>
            </div>
          </div>
          {onNavigateToConexao && (
            <button
              onClick={onNavigateToConexao}
              className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-black text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all shrink-0 shadow-sm"
            >
              <span>Acessar Conexão</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Dual Column: Próximos Retornos + Cadastros Recentes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Próximos Retornos */}
        <div className="p-5 bg-[#0B0B0B] border border-[#262626] rounded-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white font-heading">
                  Próximos Retornos Agendados
                </h3>
                <p className="text-xs text-[#888888]">
                  Tarefas abertas com vencimento próximo
                </p>
              </div>
              <button
                onClick={onNavigateToFollowUp}
                className="text-xs text-[#CCCCCC] hover:text-white flex items-center gap-1 font-medium transition-colors"
              >
                <span>Ver todos</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {upcomingReturns.length === 0 ? (
              <div className="py-8 text-center bg-[#0E0E0E] rounded-xl border border-[#1A1A1A] text-xs text-[#777777]">
                Nenhum retorno pendente no momento.
              </div>
            ) : (
              <div className="space-y-2.5">
                {upcomingReturns.map(task => {
                  const state = getTaskDueState(task.dueDate);
                  const linkedContact = contacts.find(c => c.id === task.contactId);

                  return (
                    <div
                      key={task.id}
                      onClick={() => linkedContact && onOpenContactDetails(linkedContact)}
                      className="p-3 bg-[#111111] hover:bg-[#161616] border border-[#222222] hover:border-[#333333] rounded-xl transition-colors cursor-pointer flex items-center justify-between gap-3"
                    >
                      <div className="space-y-1 truncate">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-white truncate">
                            {task.contactName}
                          </span>
                          <span className="text-[10px] text-[#777777] bg-[#1A1A1A] px-1.5 py-0.2 rounded">
                            {task.congregation}
                          </span>
                        </div>
                        <p className="text-xs text-[#AAAAAA] truncate">
                          {task.description}
                        </p>
                        <div className="text-[10px] text-[#777777]">
                          Resp: {task.assignedToName || 'Não atribuído'}
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide ${
                            state === 'overdue'
                              ? 'bg-neutral-800 text-white border border-neutral-600'
                              : state === 'today'
                              ? 'bg-white text-black font-bold'
                              : 'bg-[#1C1C1C] text-[#AAAAAA] border border-[#2B2B2B]'
                          }`}
                        >
                          {state === 'overdue'
                            ? 'Atrasado'
                            : state === 'today'
                            ? 'Hoje'
                            : formatDateBR(task.dueDate)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 5 Cadastros Mais Recentes */}
        <div className="p-5 bg-[#0B0B0B] border border-[#262626] rounded-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white font-heading">
                  Cadastros Mais Recentes
                </h3>
                <p className="text-xs text-[#888888]">
                  Últimas 5 pessoas adicionadas ao sistema
                </p>
              </div>
              <button
                onClick={onNavigateToContacts}
                className="text-xs text-[#CCCCCC] hover:text-white flex items-center gap-1 font-medium transition-colors"
              >
                <span>Ver todos os contatos</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {recentContacts.length === 0 ? (
              <div className="py-8 text-center bg-[#0E0E0E] rounded-xl border border-[#1A1A1A] text-xs text-[#777777]">
                Nenhum contato cadastrado ainda.
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentContacts.map(c => (
                  <div
                    key={c.id}
                    onClick={() => onOpenContactDetails(c)}
                    className="p-3 bg-[#111111] hover:bg-[#161616] border border-[#222222] hover:border-[#333333] rounded-xl transition-colors cursor-pointer flex items-center justify-between gap-3"
                  >
                    <div className="space-y-1 truncate">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold text-white truncate">
                          {c.name}
                        </span>
                        {c.uniReino && c.uniReino.isEnrolled && (
                          <UniReinoBadge
                            enrollment={c.uniReino}
                            semester={c.uniReino.semester}
                            size="xs"
                          />
                        )}
                        <span className="text-[10px] text-[#777777] bg-[#1A1A1A] px-1.5 py-0.2 rounded">
                          {c.congregation}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-[#888888]">
                        <span>{c.phone}</span>
                        <span>•</span>
                        <span>{c.category}</span>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <span className="text-[10px] text-[#888888] block">
                        Cadastrado em
                      </span>
                      <span className="text-xs font-medium text-white">
                        {formatDateBR(c.createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
