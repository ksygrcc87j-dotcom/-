import React from 'react';
import { Bell, X, ArrowRight, CheckCircle2, AlertTriangle } from 'lucide-react';
import { TriggeredAlert } from '../types/stock';

interface LiveToastAlertsProps {
  alerts: TriggeredAlert[];
  onDismiss: (id: string) => void;
  onSelectStock: (symbol: string) => void;
}

export const LiveToastAlerts: React.FC<LiveToastAlertsProps> = ({
  alerts,
  onDismiss,
  onSelectStock,
}) => {
  if (alerts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-2.5 max-w-sm w-full pointer-events-none">
      {alerts.slice(-3).map((alert) => {
        const isSuccess = alert.severity === 'success';
        const isDanger = alert.severity === 'danger';
        const cardBg = isSuccess
          ? 'bg-emerald-950/95 border-emerald-500/60 text-emerald-100'
          : isDanger
          ? 'bg-red-950/95 border-red-500/60 text-red-100'
          : 'bg-slate-900/95 border-blue-500/60 text-slate-100';

        return (
          <div
            key={alert.id}
            className={`pointer-events-auto p-4 rounded-2xl border shadow-2xl backdrop-blur-md transition-all transform translate-y-0 opacity-100 flex items-start space-x-3 ${cardBg}`}
          >
            <div className="mt-0.5">
              {isSuccess ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <Bell className="w-5 h-5 text-amber-400 animate-bounce" />
              )}
            </div>

            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs sm:text-sm">{alert.title}</span>
                <span className="text-[10px] opacity-75 font-mono">{alert.timestamp}</span>
              </div>
              <p className="text-xs opacity-90 leading-snug">{alert.message}</p>

              <button
                onClick={() => {
                  onSelectStock(alert.symbol);
                  onDismiss(alert.id);
                }}
                className="pt-1 text-[11px] font-bold text-blue-300 hover:text-white flex items-center space-x-1"
              >
                <span>前往該股行情</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <button
              onClick={() => onDismiss(alert.id)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
