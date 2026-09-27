import React from 'react';
import { useCRM } from '../context/CRMContext';
import { useAuth } from '../context/AuthContext';
import { Congregation, MainTab } from '../types';
import {
  Church,
  MapPin,
  Clock,
  Users,
  Crown,
  ArrowRight,
  Sparkles,
  Phone,
  Shield,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Layers,
  HeartHandshake,
  Music,
  Smile,
  ExternalLink,
} from 'lucide-react';
import { ConexaoLogo } from '../components/ConexaoLogo';
import { CONEXAO_COLORS, CONEXAO_COLOR_CONFIGS } from '../utils/conexaoConfig';

interface ChurchesPageProps {
  onNavigateToTab: (tab: MainTab) => void;
  onOpenNewContact: () => void;
}

interface ChurchUnitData {
  id: Congregation;
  name: string;
  tagline: string;
  address: string;
  neighborhood: string;
  pastoralLeaders: string;
  contactPhone: string;
  services: { day: string; time: string; title: string }[];
  accentColor: string;
  isHeadquarters?: boolean;
}

const CHURCH_UNITS: ChurchUnitData[] = [
  {
    id: 'Recreio',
    name: 'Casa de Deus - Recreio',
    tagline: 'Sede Principal • Base Apostólica e Ministerial',
    address: 'Av. das Américas, Recreio dos Bandeirantes',
    neighborhood: 'Recreio dos Bandeirantes, Rio de Janeiro - RJ',
    pastoralLeaders: 'Pastores Sêniores & Coordenação Geral',
    contactPhone: '(21) 98888-0001',
    isHeadquarters: true,
    accentColor: 'from-zinc-900 via-neutral-900 to-black',
    services: [
      { day: 'Domingo', time: '10:00 & 18:00', title: 'Culto da Família & Celebração' },
      { day: 'Quarta-feira', time: '20:00', title: 'Quarta do Avivamento & Palavra' },
      { day: 'Sábado', time: '19:30', title: 'Culto do Conexão Jovem (6 Cores)' },
    ],
  },
  {
    id: 'Curicica',
    name: 'Casa de Deus - Curicica',
    tagline: 'Campus Curicica • Comunidade Viva e Acolhedora',
    address: 'Estrada dos Bandeirantes, Curicica',
    neighborhood: 'Curicica, Jacarepaguá, Rio de Janeiro - RJ',
    pastoralLeaders: 'Pastores Locais & Presbíteros',
    contactPhone: '(21) 98888-0002',
    accentColor: 'from-neutral-950 via-zinc-900 to-black',
    services: [
      { day: 'Domingo', time: '10:00 & 18:30', title: 'Culto da Família' },
      { day: 'Quinta-feira', time: '20:00', title: 'Culto de Oração & Clamor' },
      { day: 'Sábado', time: '19:30', title: 'Conexão Jovem Curicica' },
    ],
  },
  {
    id: 'Guaratiba',
    name: 'Casa de Deus - Guaratiba',
    tagline: 'Campus Guaratiba • Expansão & Missões',
    address: 'Estrada da Ilha, Guaratiba',
    neighborhood: 'Guaratiba, Zona Oeste, Rio de Janeiro - RJ',
    pastoralLeaders: 'Pastores Locais & Diáconos',
    contactPhone: '(21) 98888-0003',
    accentColor: 'from-stone-950 via-neutral-900 to-black',
    services: [
      { day: 'Domingo', time: '09:00 & 18:00', title: 'Culto de Celebração' },
      { day: 'Terça-feira', time: '20:00', title: 'Terça da Fé & Ensino' },
      { day: 'Sábado', time: '19:30', title: 'Conexão Jovem Guaratiba' },
    ],
  },
];

export const ChurchesPage: React.FC<ChurchesPageProps> = ({
  onNavigateToTab,
  onOpenNewContact,
}) => {
  const {
    contacts,
    conexaoParticipants,
    uniReinoStudents,
    selectedCongregation,
    setSelectedCongregation,
    authorizedCongregations,
  } = useCRM();
  const { currentUser } = useAuth();

  const visibleUnits = CHURCH_UNITS.filter(unit =>
    authorizedCongregations.includes(unit.id)
  );

  // Helper to compute unit statistics
  const getUnitMetrics = (congregation: Congregation) => {
    const unitContacts = contacts.filter(
      c => !c.isArchived && c.congregation === congregation
    );
    const members = unitContacts.filter(c => c.category === 'Membro');
    const visitors = unitContacts.filter(
      c => c.category === 'Visitante' || c.category === 'Novo contato'
    );
    const unitJovens = conexaoParticipants.filter(
      p => p.congregation === congregation
    );
    const unitUniReino = uniReinoStudents.filter(
      c => c.congregation === congregation
    );

    return {
      total: unitContacts.length,
      members: members.length,
      visitors: visitors.length,
      jovens: unitJovens.length,
      uniReino: unitUniReino.length,
    };
  };

  const totalAllMembers = contacts.filter(
    c => !c.isArchived && c.category === 'Membro'
  ).length;
  const totalAllVisitors = contacts.filter(
    c => !c.isArchived && (c.category === 'Visitante' || c.category === 'Novo contato')
  ).length;

  return (
    <div className="space-y-8 pb-14">
      {/* Top Banner Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#111111] via-[#161616] to-[#0A0A0A] border border-[#262626] p-6 md:p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-semibold backdrop-blur-sm border border-white/10">
              <Church className="w-3.5 h-3.5 text-white" />
              <span>Visão das Igrejas & Ministérios • Casa de Deus</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight">
              Nossas Igrejas & Ministérios
            </h1>
            <p className="text-xs md:text-sm text-zinc-400 leading-relaxed">
              Acompanhamento centralizado das 3 congregações da Casa de Deus (Recreio, Curicica e Guaratiba)
              e dos seus ministérios integrados, com destaque especial para o{' '}
              <strong className="text-amber-400 font-semibold">Conexão Jovem (6 Cores)</strong> e a{' '}
              <strong className="text-yellow-400 font-semibold">Escola Uni Reino</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigateToTab('conexaojovem')}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-black font-extrabold text-xs md:text-sm rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-amber-500/20"
            >
              <ConexaoLogo size="xs" />
              <span>Abrir Conexão Jovem</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => onNavigateToTab('unireino')}
              className="px-4 py-2.5 bg-[#1C1C1C] hover:bg-[#252525] text-white border border-[#333333] font-bold text-xs md:text-sm rounded-xl flex items-center gap-2 transition-colors"
            >
              <Crown className="w-4 h-4 text-amber-400" />
              <span>Abrir Uni Reino</span>
            </button>
          </div>
        </div>

        {/* Global Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-[#222222]">
          <div className="p-3 bg-black/40 rounded-xl border border-white/5">
            <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">
              3 Congregações
            </span>
            <p className="text-lg font-black text-white">Recreio • Curicica • Guaratiba</p>
          </div>

          <div className="p-3 bg-black/40 rounded-xl border border-white/5">
            <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">
              Membros Totais
            </span>
            <p className="text-lg font-black text-white">{totalAllMembers} membros ativos</p>
          </div>

          <div className="p-3 bg-black/40 rounded-xl border border-white/5">
            <span className="text-[10px] text-amber-400 uppercase font-bold tracking-wider">
              Conexão Jovem
            </span>
            <p className="text-lg font-black text-amber-300">
              {conexaoParticipants.length} jovens nas 6 cores
            </p>
          </div>

          <div className="p-3 bg-black/40 rounded-xl border border-white/5">
            <span className="text-[10px] text-yellow-400 uppercase font-bold tracking-wider">
              Alunos Uni Reino
            </span>
            <p className="text-lg font-black text-yellow-300">
              {uniReinoStudents.length} matriculados
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SEÇÃO 1: CARDS DETALHADOS DAS 3 IGREJAS                   */}
      {/* ========================================================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Church className="w-4 h-4 text-zinc-400" />
              Unidades da Casa de Deus
            </h2>
            <p className="text-xs text-zinc-400">
              Selecione uma igreja para filtrar todo o painel ou visualizar os cultos e liderança local.
            </p>
          </div>

          {selectedCongregation !== 'all' && (
            <button
              onClick={() => setSelectedCongregation('all')}
              className="text-xs text-zinc-400 hover:text-white underline underline-offset-4"
            >
              Voltar para visão de todas
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {visibleUnits.map(unit => {
            const m = getUnitMetrics(unit.id);
            const isCurrentlySelected = selectedCongregation === unit.id;

            return (
              <div
                key={unit.id}
                className={`rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden ${
                  isCurrentlySelected
                    ? 'bg-[#121212] border-white shadow-xl'
                    : 'bg-[#0A0A0A] border-[#222222] hover:border-[#383838]'
                }`}
              >
                {/* Header Card */}
                <div className="p-5 md:p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-white" />
                        <span className="text-[10px] uppercase tracking-widest font-extrabold text-zinc-400">
                          {unit.isHeadquarters ? 'SEDE MATRIZ' : 'CAMPUS'}
                        </span>
                      </div>
                      <h3 className="text-xl font-black text-white mt-1">
                        {unit.name}
                      </h3>
                      <p className="text-xs text-zinc-400 mt-0.5">{unit.tagline}</p>
                    </div>

                    {isCurrentlySelected && (
                      <span className="px-2 py-0.5 bg-white text-black text-[10px] font-black rounded-full uppercase tracking-wider">
                        Ativa no CRM
                      </span>
                    )}
                  </div>

                  {/* Location & Pastors */}
                  <div className="space-y-2 text-xs text-zinc-300 bg-[#121212] p-3 rounded-xl border border-[#1E1E1E]">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                      <span>{unit.neighborhood}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span>Liderança: {unit.pastoralLeaders}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span>Contato: {unit.contactPhone}</span>
                    </div>
                  </div>

                  {/* Metrics Row */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-[#141414] rounded-lg border border-[#222222]">
                      <span className="text-[9px] uppercase font-bold text-zinc-500 block">
                        Membros
                      </span>
                      <span className="text-base font-black text-white">{m.members}</span>
                    </div>
                    <div className="p-2 bg-[#141414] rounded-lg border border-[#222222]">
                      <span className="text-[9px] uppercase font-bold text-amber-500 block">
                        Conexão
                      </span>
                      <span className="text-base font-black text-amber-300">{m.jovens}</span>
                    </div>
                    <div className="p-2 bg-[#141414] rounded-lg border border-[#222222]">
                      <span className="text-[9px] uppercase font-bold text-yellow-500 block">
                        Uni Reino
                      </span>
                      <span className="text-base font-black text-yellow-300">{m.uniReino}</span>
                    </div>
                  </div>

                  {/* Schedule */}
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase font-extrabold text-zinc-400 tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-zinc-500" />
                      Programação dos Cultos:
                    </span>
                    <div className="space-y-1.5">
                      {unit.services.map((svc, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between text-xs py-1 px-2.5 rounded bg-[#101010] border border-[#1A1A1A]"
                        >
                          <span className="text-zinc-300 font-medium">{svc.day} ({svc.time})</span>
                          <span className="text-zinc-500 text-[11px] truncate max-w-[130px]">{svc.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="p-4 bg-[#0E0E0E] border-t border-[#1C1C1C] flex items-center gap-2">
                  <button
                    onClick={() => setSelectedCongregation(unit.id)}
                    className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 ${
                      isCurrentlySelected
                        ? 'bg-zinc-800 text-white hover:bg-zinc-700'
                        : 'bg-white text-black hover:bg-zinc-200'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isCurrentlySelected ? 'Filtrando esta Igreja' : 'Filtrar no CRM'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedCongregation(unit.id);
                      onNavigateToTab('contacts');
                    }}
                    className="p-2 text-zinc-400 hover:text-white bg-[#141414] hover:bg-[#1E1E1E] rounded-xl border border-[#262626] transition-colors"
                    title="Ver contatos desta unidade"
                  >
                    <Users className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================= */}
      {/* SEÇÃO 2: OS MINISTÉRIOS DA CASA DE DEUS                   */}
      {/* ========================================================= */}
      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <h2 className="text-base font-bold text-white uppercase tracking-wider">
              Ministérios em Ação na Casa de Deus
            </h2>
          </div>
          <p className="text-xs text-zinc-400">
            A estrutura ministerial que impulsiona o crescimento pastoral nas unidades:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card Especial: Conexão Jovem */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-[#120E05] via-[#141414] to-[#0A0A0A] border border-amber-500/30 shadow-xl relative overflow-hidden flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1 bg-black rounded-lg border border-white/10">
                    <ConexaoLogo size="xs" />
                  </span>
                  <span className="text-[11px] uppercase tracking-widest font-black text-amber-400">
                    MINISTÉRIO OFICIAL
                  </span>
                </div>
                <span className="text-xs font-bold text-white bg-zinc-800 px-2 py-0.5 rounded-full border border-zinc-700">
                  6 Equipes / Cores
                </span>
              </div>

              <div>
                <h3 className="text-xl font-black text-white">CONEXÃO JOVEM</h3>
                <p className="text-xs text-zinc-300 leading-relaxed mt-1">
                  O Ministério de Jovens da Casa de Deus é controlado estrategicamente por <strong>cores</strong>.
                  Cada cor possui seu <strong>líder de cor</strong>, suas <strong>bases (sub-líderes de células)</strong>,
                  seus <strong>membros</strong> e seu foco absoluto em <strong>convidados</strong> para os cultos de sábado.
                </p>
              </div>

              {/* 6 Colors Preview */}
              <div className="space-y-2 pt-2">
                <span className="text-[10px] text-zinc-400 uppercase font-extrabold tracking-wider block">
                  As 6 Cores do Conexão Jovem:
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {CONEXAO_COLORS.map(cId => {
                    const cfg = CONEXAO_COLOR_CONFIGS[cId];
                    const count = conexaoParticipants.filter(p => p.color === cId).length;
                    return (
                      <div
                        key={cId}
                        className="p-2 rounded-xl border border-white/10 text-center flex flex-col items-center justify-between"
                        style={{ backgroundColor: `${cfg.hex}15` }}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full mb-1"
                          style={{ backgroundColor: cfg.hex }}
                        />
                        <span className="text-[10px] font-bold text-white capitalize leading-tight">
                          {cfg.name}
                        </span>
                        <span className="text-[9px] text-zinc-400 mt-0.5">{count} jovens</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Highlights */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10 text-[11px] text-zinc-300">
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Bases & Sub-líderes</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Convidados & Cultos</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Relatórios Isolados</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs text-zinc-400">
                Total:{' '}
                <strong className="text-white">{conexaoParticipants.length} participantes</strong>
              </span>
              <button
                onClick={() => onNavigateToTab('conexaojovem')}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-black text-xs font-black rounded-xl flex items-center gap-1.5 transition-all shadow-md"
              >
                <span>Acessar Conexão Jovem</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Card Especial: Uni Reino */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-[#121004] via-[#141414] to-[#0A0A0A] border border-yellow-500/30 shadow-xl relative overflow-hidden flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-yellow-400 text-black rounded-lg">
                    <Crown className="w-4 h-4 stroke-[2.5]" />
                  </span>
                  <span className="text-[11px] uppercase tracking-widest font-black text-yellow-400">
                    ESCOLA MINISTERIAL
                  </span>
                </div>
                <span className="text-xs font-bold text-white bg-zinc-800 px-2 py-0.5 rounded-full border border-zinc-700">
                  8 Semestres
                </span>
              </div>

              <div>
                <h3 className="text-xl font-black text-white">UNI REINO</h3>
                <p className="text-xs text-zinc-300 leading-relaxed mt-1">
                  A universidade da fé da Casa de Deus. Formação bíblica, teológica e ministerial contínua
                  em 8 módulos, capacitando os membros para a maturidade cristã, liderança de células e ministério.
                </p>
              </div>

              {/* Semesters pill list */}
              <div className="space-y-2 pt-2">
                <span className="text-[10px] text-zinc-400 uppercase font-extrabold tracking-wider block">
                  Grade de Semestres (1 ao 8):
                </span>
                <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] font-semibold">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(s => {
                    const count = uniReinoStudents.filter(st => st.uniReino?.semester === s).length;
                    return (
                      <div
                        key={s}
                        className="py-1.5 px-1 bg-[#141414] border border-[#242424] rounded-lg text-zinc-300"
                      >
                        <span className="text-yellow-400 font-bold block">{s}º Sem.</span>
                        <span className="text-[9px] text-zinc-500">{count} alunos</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs text-zinc-400">
                Total:{' '}
                <strong className="text-white">{uniReinoStudents.length} matriculados</strong>
              </span>
              <button
                onClick={() => onNavigateToTab('unireino')}
                className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-black text-xs font-black rounded-xl flex items-center gap-1.5 transition-colors shadow-md"
              >
                <span>Acessar Uni Reino</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Demais Ministérios em Formato Compacto */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          <div className="p-4 bg-[#0A0A0A] border border-[#202020] rounded-xl space-y-1.5">
            <div className="flex items-center gap-2 text-white text-xs font-bold">
              <HeartHandshake className="w-4 h-4 text-emerald-400" />
              <span>Acolhimento & Integração</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Recepção calorosa de primeiros visitantes nos cultos e acompanhamento pastoral imediato.
            </p>
          </div>

          <div className="p-4 bg-[#0A0A0A] border border-[#202020] rounded-xl space-y-1.5">
            <div className="flex items-center gap-2 text-white text-xs font-bold">
              <Shield className="w-4 h-4 text-indigo-400" />
              <span>Bases & Pequenos Grupos</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Células nos lares que promovem comunhão, oração mútua e discipulado contínuo semanal.
            </p>
          </div>

          <div className="p-4 bg-[#0A0A0A] border border-[#202020] rounded-xl space-y-1.5">
            <div className="flex items-center gap-2 text-white text-xs font-bold">
              <Music className="w-4 h-4 text-purple-400" />
              <span>Louvor & Adoração</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Ministros de louvor, músicos e equipe de áudio e transmissão em todas as 3 unidades.
            </p>
          </div>

          <div className="p-4 bg-[#0A0A0A] border border-[#202020] rounded-xl space-y-1.5">
            <div className="flex items-center gap-2 text-white text-xs font-bold">
              <Smile className="w-4 h-4 text-pink-400" />
              <span>Casa Kids (Infantil)</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Cuidado das crianças durante os cultos com metodologia lúdica e ensino da Palavra de Deus.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
