import React, { useState } from 'react';
import { authApi } from '../api/client';
import { Compass, Lock, Mail, User, AlertCircle, ArrowRight } from 'lucide-react';

interface AuthModalProps {
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isRegister) {
        await authApi.register(email.trim(), password, displayName.trim());
      } else {
        await authApi.login(email.trim(), password);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Nepodařilo se přihlásit.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await authApi.login('demo@taktudy.app', 'heslo123');
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Chyba přihlášení k demo účtu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-outdoor-bg dark:bg-outdoor-dark-bg">
      <div className="w-full max-w-md bg-white dark:bg-outdoor-dark-card rounded-3xl shadow-xl border border-stone-200 dark:border-stone-800 p-6 sm:p-8 space-y-6">
        {/* Logo & Headline */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-outdoor-teal-dark mx-auto flex items-center justify-center text-white shadow-md">
            <Compass className="w-8 h-8 text-outdoor-coral" />
          </div>
          <h1 className="font-heading font-black text-2xl sm:text-3xl text-outdoor-teal-dark dark:text-white">
            Tak tudy!
          </h1>
          <p className="text-xs sm:text-sm text-outdoor-text-secondary dark:text-stone-300 font-medium">
            „Plánuji, abych měla svobodu.“
          </p>
        </div>

        {/* Demo Fast Login Button */}
        <div className="p-4 bg-outdoor-teal/5 border border-outdoor-teal/20 rounded-2xl text-center space-y-2">
          <p className="text-xs text-stone-600 dark:text-stone-300 font-medium">
            Pro rychlé vyzkoušení kompletní cesty po Srí Lance:
          </p>
          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={loading}
            className="w-full py-2.5 px-4 bg-outdoor-teal hover:bg-outdoor-teal-dark active:scale-95 text-white text-xs font-bold rounded-xl shadow transition-all flex items-center justify-center gap-1.5"
          >
            <span>Vstoupit do Demo účtu (Cestovatelka Jana)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-stone-200 dark:border-stone-800 w-full" />
          <span className="bg-white dark:bg-outdoor-dark-card px-3 text-[11px] font-bold text-stone-400 uppercase tracking-wider absolute">
            Nebo vlastní e-mail
          </span>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-600 dark:text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Login / Register Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-bold text-stone-600 dark:text-stone-300 mb-1">
                Tvé jméno / přezdívka
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Např. Jana Cestovatelka"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 dark:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-outdoor-teal"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-stone-600 dark:text-stone-300 mb-1">
              E-mailová adresa
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tvuj@email.cz"
                className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 dark:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-outdoor-teal"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-600 dark:text-stone-300 mb-1">
              Heslo
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Alespoň 6 znaků"
                className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-stone-200 dark:border-stone-700 dark:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-outdoor-teal"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-outdoor-teal-dark hover:bg-outdoor-teal active:scale-95 text-white text-sm font-bold rounded-xl shadow-md transition-all"
          >
            {loading ? 'Přihlašuji...' : isRegister ? 'Vytvořit účet' : 'Přihlásit se'}
          </button>
        </form>

        {/* Switch mode */}
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
            }}
            className="text-xs text-outdoor-teal hover:underline font-semibold"
          >
            {isRegister
              ? 'Již máš účet? Přihlas se zde'
              : 'Nemáš ještě účet? Zaregistruj se'}
          </button>
        </div>
      </div>
    </div>
  );
};
