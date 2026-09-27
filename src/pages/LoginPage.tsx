import React, { useState } from 'react';
import { Logo } from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Lock, Mail, ArrowRight, ShieldCheck, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

interface LoginPageProps {
  onOpenSetupInstructions: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onOpenSetupInstructions }) => {
  const { login, enterDemoMode, sendResetPassword, authError, clearAuthError, isLoading, isDemoMode, toggleDemoMode } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    try {
      await login(email, password);
    } catch {
      // Handled in AuthContext
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      setResetError('Informe o e-mail cadastrado');
      return;
    }
    setResetLoading(true);
    setResetError('');
    try {
      await sendResetPassword(resetEmail);
      setResetSuccess(true);
      setTimeout(() => {
        setIsResetModalOpen(false);
        setResetSuccess(false);
        setResetEmail('');
      }, 2500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao enviar e-mail de recuperação';
      setResetError(msg);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#000000] text-white flex flex-col justify-center items-center p-4 sm:p-6 relative select-none">
      {/* Background subtle radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.02)_0%,transparent_70%)] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md bg-[#0B0B0B] border border-[#262626] rounded-2xl p-6 sm:p-8 shadow-2xl relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          <Logo size="lg" showText={false} />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-heading uppercase">
              CASA DE DEUS
            </h1>
          </div>
          <div className="pt-1">
            <h2 className="text-sm font-semibold text-white">
              Painel de Gestão & Acompanhamento
            </h2>
            <p className="text-xs text-[#888888] mt-0.5">
              Entre com suas credenciais autorizadas
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {authError && (
          <div className="p-3 bg-red-950/80 border border-red-700 rounded-lg text-xs text-red-200 flex items-start justify-between gap-2 shadow-lg animate-fadeIn">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block text-red-100">Acesso Bloqueado</span>
                <span className="text-[11px] text-red-200 leading-tight block mt-0.5">{authError}</span>
              </div>
            </div>
            <button
              onClick={clearAuthError}
              className="text-red-400 hover:text-white font-bold text-sm ml-2"
              title="Fechar aviso"
            >
              ×
            </button>
          </div>
        )}

        {/* Email & Password Form */}
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          {/* Email / Username */}
          <div>
            <label className="block text-xs font-medium text-[#CCCCCC] mb-1.5" htmlFor="login-email">
              Login ou E-mail
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#777777] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="login-email"
                type="text"
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  if (authError) clearAuthError();
                }}
                placeholder="Digite seu login ou e-mail"
                required
                className="w-full pl-9 pr-3 py-2.5 bg-[#141414] border border-[#262626] rounded-lg text-white text-sm focus:outline-none focus:border-white transition-colors"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-[#CCCCCC]" htmlFor="login-password">
                Senha
              </label>
              <button
                type="button"
                onClick={() => {
                  setResetEmail(email);
                  setIsResetModalOpen(true);
                }}
                className="text-[11px] text-[#888888] hover:text-white transition-colors"
              >
                Esqueceu a senha?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#777777] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  if (authError) clearAuthError();
                }}
                placeholder="••••••••"
                required
                className={`w-full pl-9 pr-10 py-2.5 bg-[#141414] border ${
                  authError ? 'border-red-600 focus:border-red-500' : 'border-[#262626] focus:border-white'
                } rounded-lg text-white text-sm focus:outline-none transition-colors`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#777777] hover:text-white transition-colors focus:outline-none"
                aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-white text-black font-semibold text-sm rounded-lg hover:bg-neutral-200 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 mt-2 cursor-pointer"
          >
            <span>{isLoading ? 'Entrando...' : 'Entrar no Painel'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="border-t border-[#222222] w-full" />
          <span className="bg-[#0B0B0B] px-3 text-[10px] uppercase tracking-wider text-[#666666] relative font-bold">
            Simulador de Perfis & Permissões
          </span>
        </div>

        {/* Quick Roles & Permissions Selector */}
        <div className="space-y-2.5 bg-[#111111] p-3 rounded-xl border border-[#222222]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Entrar com Perfil de Teste:</span>
            </span>
            <span className="text-[10px] text-zinc-500">1 clique</span>
          </div>

          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {/* Master */}
            <button
              type="button"
              onClick={() => enterDemoMode('admin-1')}
              className="w-full p-2 bg-[#171717] hover:bg-[#202020] border border-amber-500/30 rounded-lg text-left transition-colors flex items-center justify-between group"
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-amber-300">Pr. Bruno Bitencourt</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded border border-amber-500/30 uppercase">Master Geral</span>
                </div>
                <p className="text-[10px] text-zinc-400">Acesso completo: 3 congregações, 3 famílias, todas as cores</p>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white shrink-0 ml-2" />
            </button>

            {/* Curicica Coordenação */}
            <button
              type="button"
              onClick={() => enterDemoMode('admin-curicica')}
              className="w-full p-2 bg-[#171717] hover:bg-[#202020] border border-[#2A2A2A] rounded-lg text-left transition-colors flex items-center justify-between group"
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white">Pr. Marcos Silveira</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 bg-zinc-800 text-zinc-300 rounded border border-zinc-700 uppercase">Coord. Curicica</span>
                </div>
                <p className="text-[10px] text-zinc-400">Administra Curicica: vê e gerencia as 3 Famílias</p>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white shrink-0 ml-2" />
            </button>

            {/* Curicica Líder Família 1 */}
            <button
              type="button"
              onClick={() => enterDemoMode('lider-familia-1')}
              className="w-full p-2 bg-[#171717] hover:bg-[#202020] border border-emerald-900/40 rounded-lg text-left transition-colors flex items-center justify-between group"
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-emerald-300">Priscila Ramos</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 bg-emerald-950 text-emerald-400 rounded border border-emerald-800/50 uppercase">Líder Família 1</span>
                </div>
                <p className="text-[10px] text-zinc-400">Restrita à Família 1 (não vê Família 2 nem Família 3)</p>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white shrink-0 ml-2" />
            </button>

            {/* Curicica Líder Família 2 */}
            <button
              type="button"
              onClick={() => enterDemoMode('lider-familia-2')}
              className="w-full p-2 bg-[#171717] hover:bg-[#202020] border border-emerald-900/40 rounded-lg text-left transition-colors flex items-center justify-between group"
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-emerald-300">Carlos Eduardo</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 bg-emerald-950 text-emerald-400 rounded border border-emerald-800/50 uppercase">Líder Família 2</span>
                </div>
                <p className="text-[10px] text-zinc-400">Restrito à Família 2 (não vê Família 1 nem Família 3)</p>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white shrink-0 ml-2" />
            </button>

            {/* Curicica Líder Família 3 */}
            <button
              type="button"
              onClick={() => enterDemoMode('lider-familia-3')}
              className="w-full p-2 bg-[#171717] hover:bg-[#202020] border border-emerald-900/40 rounded-lg text-left transition-colors flex items-center justify-between group"
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-emerald-300">Vanessa Mello</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 bg-emerald-950 text-emerald-400 rounded border border-emerald-800/50 uppercase">Líder Família 3</span>
                </div>
                <p className="text-[10px] text-zinc-400">Restrita à Família 3 (não vê Família 1 nem Família 2)</p>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white shrink-0 ml-2" />
            </button>

            {/* Conexão Líder Geral */}
            <button
              type="button"
              onClick={() => enterDemoMode('lider-conexao-geral')}
              className="w-full p-2 bg-[#171717] hover:bg-[#202020] border border-amber-900/30 rounded-lg text-left transition-colors flex items-center justify-between group"
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-amber-300">Lucas Martins</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 bg-amber-950 text-amber-300 rounded border border-amber-800 uppercase">Líder Geral Conexão</span>
                </div>
                <p className="text-[10px] text-zinc-400">Acesso a todas as 6 cores e visão geral comparativa</p>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white shrink-0 ml-2" />
            </button>

            {/* Conexão Líder Equipe Azul */}
            <button
              type="button"
              onClick={() => enterDemoMode('lider-equipe-azul')}
              className="w-full p-2 bg-[#171717] hover:bg-[#202020] border border-blue-900/40 rounded-lg text-left transition-colors flex items-center justify-between group"
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-blue-300">Thiago Nogueira</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 bg-blue-950 text-blue-400 rounded border border-blue-800/60 uppercase">Líder Equipe Azul</span>
                </div>
                <p className="text-[10px] text-zinc-400">Restrito à Equipe Azul (sem Amarelo, Verde ou Vermelho)</p>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white shrink-0 ml-2" />
            </button>

            {/* Conexão Líder Equipe Verde */}
            <button
              type="button"
              onClick={() => enterDemoMode('lider-equipe-verde')}
              className="w-full p-2 bg-[#171717] hover:bg-[#202020] border border-emerald-900/40 rounded-lg text-left transition-colors flex items-center justify-between group"
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-emerald-300">Matheus Lima Rocha</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 bg-emerald-950 text-emerald-400 rounded border border-emerald-800/60 uppercase">Líder Equipe Verde</span>
                </div>
                <p className="text-[10px] text-zinc-400">Restrito à Equipe Verde (sem Azul, Amarelo ou Vermelho)</p>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white shrink-0 ml-2" />
            </button>

            {/* Equipe Recreio */}
            <button
              type="button"
              onClick={() => enterDemoMode('equipe-recreio')}
              className="w-full p-2 bg-[#171717] hover:bg-[#202020] border border-[#262626] rounded-lg text-left transition-colors flex items-center justify-between group"
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white">Mariana Souza</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 bg-zinc-800 text-zinc-300 rounded border border-zinc-700 uppercase">Equipe Recreio</span>
                </div>
                <p className="text-[10px] text-zinc-400">Acesso restrito exclusivamente ao Recreio</p>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white shrink-0 ml-2" />
            </button>

            {/* Equipe Guaratiba */}
            <button
              type="button"
              onClick={() => enterDemoMode('equipe-guaratiba')}
              className="w-full p-2 bg-[#171717] hover:bg-[#202020] border border-[#262626] rounded-lg text-left transition-colors flex items-center justify-between group"
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white">Camila Duarte</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 bg-zinc-800 text-zinc-300 rounded border border-zinc-700 uppercase">Equipe Guaratiba</span>
                </div>
                <p className="text-[10px] text-zinc-400">Acesso restrito exclusivamente a Guaratiba</p>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white shrink-0 ml-2" />
            </button>
          </div>
        </div>

        {/* Footer info & help */}
        <div className="pt-2 border-t border-[#1C1C1C] flex items-center justify-between text-[11px] text-[#777777]">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Sistema com Permissões Reais</span>
          </div>
          <button
            type="button"
            onClick={onOpenSetupInstructions}
            className="hover:text-white underline transition-colors"
          >
            Instruções Firebase
          </button>
        </div>
      </div>

      {/* Reset Password Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#0C0C0C] border border-[#262626] rounded-xl p-5 shadow-2xl text-white space-y-4">
            <h3 className="text-sm font-semibold font-heading">
              Recuperação de Senha
            </h3>
            {resetSuccess ? (
              <div className="p-3 bg-neutral-900 border border-neutral-700 rounded-lg text-xs text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>E-mail com instruções de redefinição enviado!</span>
              </div>
            ) : (
              <form onSubmit={handleResetSubmit} className="space-y-3">
                <p className="text-xs text-[#888888]">
                  Digite o e-mail cadastrado para receber as instruções de redefinição de senha.
                </p>
                {resetError && (
                  <p className="text-xs text-red-400 bg-red-950/40 p-2 rounded border border-red-900">
                    {resetError}
                  </p>
                )}
                <div>
                  <label className="block text-[11px] text-[#AAAAAA] mb-1">E-mail</label>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={e => setResetEmail(e.target.value)}
                    required
                    placeholder="seu.email@casadedeus.org"
                    className="w-full px-3 py-2 bg-[#141414] border border-[#262626] rounded-lg text-white text-xs focus:outline-none focus:border-white"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsResetModalOpen(false)}
                    className="px-3 py-1.5 text-xs text-[#AAAAAA] hover:text-white bg-[#141414] rounded-lg border border-[#262626]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="px-4 py-1.5 text-xs font-semibold text-black bg-white hover:bg-neutral-200 rounded-lg"
                  >
                    {resetLoading ? 'Enviando...' : 'Enviar Link'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
