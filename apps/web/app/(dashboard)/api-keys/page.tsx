"use client";

import { useEffect, useState } from "react";

interface ApiKeyInfo {
  id: string;
  name: string;
  key_prefix: string;
  rate_limit_per_hour: number;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);

  const loadKeys = async () => {
    try {
      const res = await fetch("/api/api-keys");
      const data = await res.json();
      setKeys(data.keys ?? []);
    } catch {
      setKeys([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKeys();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    setCreating(true);

    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });
      const data = await res.json();
      if (data.key) {
        setNewKeyValue(data.key);
        setNewKeyName("");
        loadKeys();
      }
    } catch {
      // ignore
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (id: string, active: boolean) => {
    await fetch("/api/api-keys", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, is_active: !active }),
    });
    loadKeys();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить API-ключ? Это действие необратимо.")) return;
    await fetch("/api/api-keys", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    loadKeys();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">API-ключи</h1>
      <p className="text-sm text-gray-500 mb-6">
        Используйте API для доступа к данным экспертов и статей.{" "}
        <a
          href="/api/v1/docs"
          className="text-blue-600 hover:text-blue-700"
          target="_blank"
        >
          Документация API
        </a>
      </p>

      {/* New key alert */}
      {newKeyValue && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
          <p className="text-sm font-medium text-yellow-800 mb-2">
            Скопируйте ключ — он больше не будет показан!
          </p>
          <div className="flex gap-2">
            <code className="flex-1 bg-white border rounded px-3 py-2 text-sm font-mono break-all">
              {newKeyValue}
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(newKeyValue);
                alert("Скопировано!");
              }}
              className="px-3 py-2 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
            >
              Копировать
            </button>
          </div>
          <button
            onClick={() => setNewKeyValue(null)}
            className="mt-2 text-xs text-yellow-700 hover:text-yellow-900"
          >
            Закрыть
          </button>
        </div>
      )}

      {/* Create key form */}
      <div className="bg-white rounded-xl border p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-3">
          Создать новый ключ
        </h2>
        <form onSubmit={handleCreate} className="flex gap-3">
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="Название (например: Production App)"
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={creating || !newKeyName.trim()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {creating ? "..." : "Создать"}
          </button>
        </form>
      </div>

      {/* Keys list */}
      <div className="bg-white rounded-xl border overflow-hidden">
        {keys.length === 0 ? (
          <p className="p-6 text-gray-500 text-center">
            У вас пока нет API-ключей
          </p>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                  Название
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                  Ключ
                </th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                  Лимит/час
                </th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                  Последнее использование
                </th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {keys.map((k) => (
                <tr key={k.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {k.name}
                  </td>
                  <td className="px-4 py-4">
                    <code className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {k.key_prefix}...
                    </code>
                  </td>
                  <td className="text-center px-4 py-4 text-sm text-gray-600">
                    {k.rate_limit_per_hour}
                  </td>
                  <td className="text-center px-4 py-4 text-xs text-gray-400">
                    {k.last_used_at
                      ? new Date(k.last_used_at).toLocaleString("ru-RU")
                      : "Никогда"}
                  </td>
                  <td className="text-right px-6 py-4">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => handleToggle(k.id, k.is_active)}
                        className={`text-xs px-2 py-1 rounded ${
                          k.is_active
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {k.is_active ? "Активен" : "Выключен"}
                      </button>
                      <button
                        onClick={() => handleDelete(k.id)}
                        className="text-xs text-red-600 hover:text-red-700"
                      >
                        Удалить
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
