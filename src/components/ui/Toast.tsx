import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextValue {
  toast: (type: ToastType, title: string, message?: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="w-5 h-5 text-accent-400" />,
  error: <XCircle className="w-5 h-5 text-danger-400" />,
  warning: <AlertTriangle className="w-5 h-5 text-warning-400" />,
  info: <Info className="w-5 h-5 text-primary-400" />,
};

const borderColors: Record<ToastType, string> = {
  success: 'border-l-4 border-l-accent-500',
  error: 'border-l-4 border-l-danger-500',
  warning: 'border-l-4 border-l-warning-500',
  info: 'border-l-4 border-l-primary-500',
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev.slice(-3), { id, type, title, message }]);
    setTimeout(() => dismiss(id), 5000);
  }, [dismiss]);

  const success = useCallback((title: string, message?: string) => toast('success', title, message), [toast]);
  const error = useCallback((title: string, message?: string) => toast('error', title, message), [toast]);
  const warning = useCallback((title: string, message?: string) => toast('warning', title, message), [toast]);
  const info = useCallback((title: string, message?: string) => toast('info', title, message), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info }}>
      {children}
      <div className="fixed top-5 right-5 z-[200] flex flex-col gap-3 pointer-events-none" style={{ maxWidth: '360px' }}>
        <AnimatePresence mode="popLayout">
          {toasts.map(t => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 32, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 32, scale: 0.95 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className={`
                pointer-events-auto
                bg-dark-900/95 backdrop-blur-xl
                border border-white/10 rounded-xl
                shadow-[0_16px_48px_rgba(0,0,0,0.6)]
                overflow-hidden
                ${borderColors[t.type]}
              `}
            >
              <div className="flex items-start gap-3 p-4">
                <div className="shrink-0 mt-0.5">{icons[t.type]}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm">{t.title}</p>
                  {t.message && <p className="text-dark-400 text-xs mt-0.5 leading-relaxed">{t.message}</p>}
                </div>
                <button
                  onClick={() => dismiss(t.id)}
                  className="shrink-0 text-dark-500 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};
