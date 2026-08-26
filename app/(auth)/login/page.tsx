'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Cpu, ShieldCheck, Lock, Mail, AlertCircle, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!identifier || !password) {
      setErrorMsg('Please enter both your email/username and password.');
      return;
    }

    startTransition(async () => {
      try {
        const res = await signIn('credentials', {
          identifier,
          password,
          redirect: false,
        });

        if (res?.error) {
          if (res.error.includes('USER_INACTIVE')) {
            setErrorMsg('Your account has been deactivated. Please contact the administrator.');
          } else {
            setErrorMsg('Invalid email/username or password. Please try again.');
          }
          toast.error('Authentication failed');
          return;
        }

        toast.success('Signed in successfully');
        router.push('/dashboard');
        router.refresh();
      } catch (err: any) {
        setErrorMsg('An unexpected error occurred during sign in.');
        toast.error('Sign in error');
      }
    });
  };

  const handleQuickFill = (emailVal: string, passVal: string) => {
    setIdentifier(emailVal);
    setPassword(passVal);
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-slate-900 text-slate-100 p-4 sm:p-6 relative overflow-hidden">
      {/* Subtle Background Glow Elements */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 shadow-xl shadow-indigo-500/25 border border-indigo-400/30 text-white mb-2">
            <Cpu className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            SLIMS Inventory
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xs mx-auto">
            School Network Equipment & Lab Facility Management System
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-800/80 backdrop-blur-md border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          {errorMsg && (
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-red-950/60 border border-red-800/60 text-red-200 text-xs animate-in fade-in slide-in-from-top-1">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="identifier"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-300"
              >
                Email or Username
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="identifier"
                  type="text"
                  required
                  disabled={isPending}
                  placeholder="admin@slims.edu"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all disabled:opacity-60"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-300"
                >
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="password"
                  type="password"
                  required
                  disabled={isPending}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all disabled:opacity-60"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-60 cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Fill Test Accounts (For Seamless Verification) */}
          <div className="pt-4 border-t border-slate-700/60 space-y-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Quick Test Credentials:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('admin@slims.edu', 'admin123')}
                className="px-2.5 py-1.5 bg-slate-700/60 hover:bg-slate-700 border border-slate-600 rounded-lg text-left text-xs transition-colors"
              >
                <div className="font-semibold text-indigo-300">Admin</div>
                <div className="text-[10px] text-slate-400">admin123</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('teacher@slims.edu', 'teacher123')}
                className="px-2.5 py-1.5 bg-slate-700/60 hover:bg-slate-700 border border-slate-600 rounded-lg text-left text-xs transition-colors"
              >
                <div className="font-semibold text-amber-300">Teacher+Tech</div>
                <div className="text-[10px] text-slate-400">teacher123</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('student@slims.edu', 'student123')}
                className="px-2.5 py-1.5 bg-slate-700/60 hover:bg-slate-700 border border-slate-600 rounded-lg text-left text-xs transition-colors"
              >
                <div className="font-semibold text-emerald-300">Student</div>
                <div className="text-[10px] text-slate-400">student123</div>
              </button>
            </div>
          </div>
        </div>

        {/* Security / PRD Compliance Notice */}
        <div className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
          <span>Accounts are provisioned by Administrator (BR-001)</span>
        </div>
      </div>
    </div>
  );
}
