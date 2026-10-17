import React from 'react';
import { X, Bell, Trash2, Clock, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';
import { TriggeredAlert } from '../types/stock';

interface AlertHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  history: TriggeredAlert[];
  onClearHistory: () => void;
  onSelectStock: (symbol: string) => void;
}

export const AlertHistoryDrawer: React.FC<AlertHistoryDrawerProps> = ({
  isOpen,
  onClose,
  history,
  onClearHistory,
  onSelectStock,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">
                  即時推播警示紀錄
                </h3>
                <p className="text-xs text-slate-400">盤中即時觸發紀錄日誌 ({history.length})</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {history.length > 0 && (
                <button
                  onClick={onClearHistory}
                  className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 text-xs flex items-center space-x-1 transition-colors"
                  title="清除全部紀錄"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {history.length === 0 ? (
              <div className="py-20 text-center text-slate-500 text-xs space-y-2">
                <Bell className="w-8 h-8 mx-auto opacity-30" />
                <p>目前尚無觸發的警示紀錄</p>
                <p className="text-[11px] text-slate-600">當即時行情符合目標價、特大單或周轉率規則時將在此通知</p>
              </div>
            ) : (
              history.map((alert) => {
                const isSuccess = alert.severity === 'success';
                const isDanger = alert.severity === 'danger';
                const borderCol = isSuccess
                  ? 'border-emerald-500/40 bg-emerald-950/20'
                  : isDanger
                  ? 'border-red-500/40 bg-red-950/20'
                  : 'border-blue-500/40 bg-blue-950/20';

                return (
                  <div
                    key={alert.id}
                    className={`p-3.5 rounded-2xl border ${borderCol} space-y-1.5 shadow-md`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-1.5 font-bold text-slate-200">
                        {isSuccess ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-400" />
                        )}
                        <span>{alert.title}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono flex items-center">
                        <Clock className="w-3 h-3 mr-1 opacity-70" /> {alert.timestamp}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      {alert.message}
                    </p>

                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => {
                          onSelectStock(alert.symbol);
                          onClose();
                        }}
                        className="text-[11px] font-bold text-blue-400 hover:text-blue-300 flex items-center space-x-1"
                      >
                        <span>查看 {alert.stockName} ({alert.symbol})</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
