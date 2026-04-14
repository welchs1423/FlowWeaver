'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  fetchSecrets,
  createSecret,
  deleteSecret,
  type SecretRecord,
} from '../lib/api';
import { useAuthStore } from '../store/authStore';
import AppHeader from '../components/common/AppHeader';

export default function CredentialsPage() {
  const router = useRouter();
  const { init } = useAuthStore();
  const [secrets, setSecrets] = useState<SecretRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    init();
  }, [init]);

  async function load() {
    try {
      const data = await fetchSecrets();
      setSecrets(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '불러오기 실패');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !value.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await createSecret(name.trim(), value.trim());
      setName('');
      setValue('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '등록 실패');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('이 자격 증명을 삭제하시겠습니까?')) return;
    setDeletingId(id);
    try {
      await deleteSecret(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '삭제 실패');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <AppHeader title="자격 증명 (Credentials)" />

      <main className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-2 flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            ← 대시보드
          </button>
        </div>

        <p className="mb-8 text-sm text-zinc-500">
          API 키, 토큰 등 민감한 값을 안전하게 저장합니다. 저장된 값은 AES-256
          암호화되어 보관됩니다.
        </p>

        {/* 등록 폼 */}
        <div className="mb-8 rounded-lg border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="mb-4 text-sm font-semibold text-zinc-300">
            새 자격 증명 등록
          </h2>
          <form onSubmit={handleCreate} className="flex flex-col gap-3">
            <div className="flex gap-3">
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-xs text-zinc-400">이름</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: My Discord Token"
                  required
                  className="rounded bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500"
                />
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-xs text-zinc-400">값 (Secret Value)</label>
                <input
                  type="password"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="토큰 또는 키 입력"
                  required
                  className="rounded bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={creating || !name.trim() || !value.trim()}
                className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 transition-colors disabled:opacity-40"
              >
                {creating ? '등록 중…' : '등록'}
              </button>
            </div>
          </form>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* 목록 */}
        <div className="rounded-lg border border-zinc-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900">
            <h2 className="text-sm font-semibold text-zinc-300">
              등록된 자격 증명 ({secrets.length})
            </h2>
          </div>

          {loading ? (
            <div className="px-4 py-6 text-center text-sm text-zinc-500">
              불러오는 중…
            </div>
          ) : secrets.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-zinc-500">
              등록된 자격 증명이 없습니다.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/50">
                  <th className="px-4 py-3 text-left font-medium text-zinc-400">이름</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-400">값</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-400">등록일</th>
                  <th className="px-4 py-3 text-right font-medium text-zinc-400" />
                </tr>
              </thead>
              <tbody>
                {secrets.map((s, idx) => (
                  <tr
                    key={s.id}
                    className={`border-b border-zinc-800/60 hover:bg-zinc-900/40 ${
                      idx === secrets.length - 1 ? 'border-b-0' : ''
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-zinc-200">{s.name}</td>
                    <td className="px-4 py-3 font-mono text-zinc-500 tracking-widest">
                      ••••••••
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">
                      {new Date(s.createdAt).toLocaleString('ko-KR', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(s.id)}
                        disabled={deletingId === s.id}
                        className="text-xs text-zinc-500 hover:text-red-400 transition-colors disabled:opacity-40"
                      >
                        {deletingId === s.id ? '…' : '삭제'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
