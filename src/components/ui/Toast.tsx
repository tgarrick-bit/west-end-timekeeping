'use client';
import { useState, useEffect, createContext, useContext, useCallback, useRef } from 'react';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  exiting?: boolean;
}

interface ToastContextValue {
  toast: (type: Toast['type'], message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

const TYPE_COLORS: Record<Toast['type'], string> = {
  success: '#2d9b6e',
  error: '#b91c1c',
  warning: '#c4983a',
  info: '#1a1a1a',
};

function ToastItem({ t, onDismiss }: { t: Toast; onDismiss: (id: string) => void }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: '#fff',
        border: '0.5px solid #e8e4df',
        borderRadius: 10,
        padding: '12px 18px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        minWidth: 260,
        maxWidth: 400,
        animation: t.exiting ? 'toast-out 0.25s ease forwards' : 'toast-in 0.25s ease forwards',
        cursor: 'pointer',
        fontFamily: 'var(--font-montserrat), Montserrat, sans-serif',
      }}
      onClick={() => onDismiss(t.id)}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: TYPE_COLORS[t.type],
          flexShrink: 0,
        }}
      />
      <span style={{ fontSize: 12.5, fontWeight: 500, color: '#1a1a1a', lineHeight: 1.4 }}>
        {t.message}
      </span>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const dismiss = useCallback((id: string) => {
    // Mark as exiting for animation
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
    // Remove after animation
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 250);
    // Clear any existing timer
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const addToast = useCallback(
    (type: Toast['type'], message: string) => {
      const id = crypto.randomUUID();
      setToasts((prev) => {
        // Enforce max 3 visible: if already 3, remove the oldest
        const next = [...prev, { id, type, message }];
        if (next.length > 3) {
          const oldest = next[0];
          // Start exit animation on oldest
          setTimeout(() => dismiss(oldest.id), 0);
        }
        return next;
      });
      // Auto-dismiss after 4s
      const timer = setTimeout(() => dismiss(id), 4000);
      timersRef.current.set(id, timer);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      {/* Inject keyframes once */}
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateX(80px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes toast-out {
          from { opacity: 1; transform: translateX(0); }
          to   { opacity: 0; transform: translateX(80px); }
        }
      `}</style>
      {/* Toast container - bottom right */}
      {toasts.length > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column-reverse',
            gap: 8,
            pointerEvents: 'auto',
          }}
        >
          {toasts.map((t) => (
            <ToastItem key={t.id} t={t} onDismiss={dismiss} />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}
