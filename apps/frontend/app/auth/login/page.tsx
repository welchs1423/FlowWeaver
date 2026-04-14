'use client';

import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { login } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth, init, token } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (token) router.replace('/dashboard');
  }, [token, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await login(email, password);
      setAuth(res.token, res.user);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인 실패');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-zinc-100">FlowWeaver</h1>
          <p className="mt-1 text-sm text-zinc-400">로그인</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">
              이메일
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-violet-500 focus:outline-none"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">
              비밀번호
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-violet-500 focus:outline-none"
              placeholder="••••••"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-xs text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500">
          계정이 없으신가요?{' '}
          <Link href="/auth/register" className="text-violet-400 hover:text-violet-300">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}
