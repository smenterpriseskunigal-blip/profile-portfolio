import React, { useState } from 'react';
import { ArrowLeft, Lock, LogIn, LogOut, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { ADMIN_OWNER_EMAIL } from '../../lib/firebase.ts';

interface AdminLoginViewProps {
  onBackPublic: () => void;
  onEnterDashboard: () => void;
}

export function AdminLoginView({ onBackPublic, onEnterDashboard }: AdminLoginViewProps) {
  const { user, loading, isOwnerAdmin, signInWithGoogle, logout } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setBusy(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google authentication failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-dvh blueprint-grid-canvas blueprint-paper-grain flex items-center justify-center p-6">
      <div className="w-full max-w-md border border-[var(--bp-line-strong)] bg-[var(--bp-surface-solid)] p-6 sm:p-8 space-y-6">
        <div className="border-b border-[var(--bp-line)] pb-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] text-[var(--bp-accent)]">
              PROTECTED CMS GATE
            </span>
            <Lock className="h-4 w-4 text-[var(--bp-accent)]" />
          </div>
          <h1 className="mt-2 font-display text-2xl font-bold text-[var(--bp-ink)]">
            Portfolio Admin Portal
          </h1>
          <p className="mt-1 text-sm text-[var(--bp-ink-muted)]">
            Sign in with the verified portfolio owner account to manage sheets, ATS resume builds, and AI media assets.
          </p>
        </div>

        {loading ? (
          <p className="font-mono text-xs text-[var(--bp-ink-muted)] py-4">
            VERIFYING AUTHENTICATION SESSION...
          </p>
        ) : isOwnerAdmin ? (
          <div className="space-y-4">
            <div className="border border-emerald-500/40 bg-emerald-500/10 p-3 font-mono text-xs text-emerald-300">
              Authenticated as {user?.email}
            </div>
            <button
              type="button"
              onClick={onEnterDashboard}
              className="w-full bg-[var(--bp-accent)] px-4 py-3 font-mono text-xs font-semibold text-[var(--bp-accent-fg)] hover:opacity-90 min-h-[44px]"
            >
              Open Admin Dashboard
            </button>
          </div>
        ) : user ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 border border-rose-500/50 bg-rose-500/10 p-4 text-xs text-rose-300">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-mono font-semibold">UNAUTHORIZED ACCOUNT</p>
                <p>
                  Signed in as <span className="font-mono">{user.email}</span>, which does not match owner access ({ADMIN_OWNER_EMAIL}).
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => logout()}
              className="w-full inline-flex items-center justify-center gap-2 border border-[var(--bp-line-strong)] px-4 py-3 font-mono text-xs text-[var(--bp-ink)] hover:border-[var(--bp-accent)] min-h-[44px]"
            >
              <LogOut className="h-4 w-4" />
              Sign Out &amp; Switch Account
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {error && (
              <div className="border border-rose-500/50 bg-rose-500/10 p-3 font-mono text-xs text-rose-300">
                {error}
              </div>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={handleGoogleSignIn}
              className="w-full inline-flex items-center justify-center gap-2 bg-[var(--bp-accent)] px-4 py-3 font-mono text-xs font-semibold text-[var(--bp-accent-fg)] hover:opacity-90 disabled:opacity-60 min-h-[44px]"
            >
              <LogIn className="h-4 w-4" />
              {busy ? 'Authenticating...' : 'Continue with Google'}
            </button>
          </div>
        )}

        <div className="border-t border-[var(--bp-line)] pt-4">
          <button
            type="button"
            onClick={onBackPublic}
            className="inline-flex items-center gap-2 font-mono text-xs text-[var(--bp-ink-muted)] hover:text-[var(--bp-ink)] min-h-[36px]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Return to Public Portfolio
          </button>
        </div>
      </div>
    </div>
  );
}
