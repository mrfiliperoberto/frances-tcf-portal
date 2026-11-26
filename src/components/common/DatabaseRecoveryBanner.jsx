import React, { useState } from 'react';
import { AlertTriangle, Download, RefreshCw } from 'lucide-react';
import { downloadDatabaseAsJson } from '../../services/dbBackup';
import { DB_NAME } from '../../services/db';

/**
 * Exibido quando o IndexedDB não pôde ser aberto ou migrado.
 * Recuperação controlada: os dados NUNCA são apagados automaticamente; o usuário pode
 * exportar uma cópia e tentar novamente.
 */
export function DatabaseRecoveryBanner({ status, onRetry }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [exported, setExported] = useState(false);

  if (!status || status.state !== 'error') return null;

  const isBackupFailure = status.errorKind === 'backup';

  const handleExport = async () => {
    setBusy(true);
    setMessage('');
    try {
      const counts = await downloadDatabaseAsJson(DB_NAME);
      const total = Object.values(counts || {}).reduce((a, b) => a + b, 0);
      setExported(true);
      setMessage(`Cópia exportada (${total} registros).`);
    } catch (err) {
      setMessage(`Não foi possível exportar: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const handleRetry = async (skipBackup = false) => {
    setBusy(true);
    setMessage('');
    try {
      await onRetry({ skipBackup });
    } catch (err) {
      setMessage(`Nova tentativa falhou: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="alert"
      className="mb-6 p-4 sm:p-5 rounded-2xl border border-amber-500/40 bg-amber-50 text-amber-900 dark:bg-amber-500/10 dark:text-amber-100 space-y-3"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="space-y-1 text-sm">
          <p className="font-bold">
            {isBackupFailure
              ? 'Atualização do banco adiada: não foi possível criar o backup de segurança.'
              : 'Não foi possível abrir o banco de dados local.'}
          </p>
          <p className="text-xs opacity-90">
            Seus dados <strong>não foram apagados</strong>. Exporte uma cópia antes de qualquer outra ação.
            Algumas telas podem mostrar conteúdo padrão e não salvar progresso até o banco abrir.
          </p>
          <p className="text-[11px] font-mono opacity-75 break-all">Diagnóstico: {status.error}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={handleExport}
          className="px-3 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-white inline-flex items-center gap-1.5 disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5" /> Exportar dados (JSON)
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => handleRetry(false)}
          className="px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-amber-500/40 inline-flex items-center gap-1.5 disabled:opacity-50"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Tentar novamente
        </button>
        {isBackupFailure && exported && (
          <button
            type="button"
            disabled={busy}
            onClick={() => handleRetry(true)}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-amber-500/40 disabled:opacity-50"
          >
            Atualizar usando a cópia exportada como backup
          </button>
        )}
      </div>
      {message && <p className="text-xs">{message}</p>}
    </div>
  );
}

export default DatabaseRecoveryBanner;
