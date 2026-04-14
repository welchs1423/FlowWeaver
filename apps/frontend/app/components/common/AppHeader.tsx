'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';

interface AppHeaderProps {
  backHref?: string;
  backLabel?: string;
  title: string;
}

export default function AppHeader({ backHref, backLabel, title }: AppHeaderProps) {
  const router = useRouter();
  const { user, token, clearAuth, init } = useAuthStore();

  useEffect(() => {
    init();
  }, [init]);

  function handleLogout() {
    clearAuth();
    router.push('/auth/login');
  }

  return (
    <header className="border-b border-zinc-800 px-6 py-4">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <div className="flex items-center gap-4">
          {backHref && (
            <Link
              href={backHref}
              className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              ← {backLabel ?? 'Back'}
            </Link>
          )}
          <h1 className="text-lg font-semibold text-zinc-100">{title}</h1>
        </div>

        <div className="flex items-center gap-3">
          {token && user && (
            <span className="text-xs text-zinc-500">{user.email}</span>
          )}
          <Link
            href="/canvas"
            className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-500 transition-colors"
          >
            + 새 워크플로우
          </Link>
          <button
            onClick={handleLogout}
            className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 transition-colors"
          >
            로그아웃
          </button>
        </div>
      </div>
    </header>
  );
}
