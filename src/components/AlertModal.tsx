import React, { useState } from 'react';
import { 
  X, 
  Bell, 
  Plus, 
  Trash2, 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  Activity,
  Sparkles
} from 'lucide-react';
import { AlertRule, AlertType, StockData } from '../types/stock';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  stock: StockData;
  rules: AlertRule[];
  onAddRule: (rule: Omit<AlertRule, 'id' | 'triggerCount'>) => void;
  onToggleRule: (id: string) => void;
  onDeleteRule: (id: string) => void;
}

export const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  onClose,
  stock,
  rules,
  onAddRule,
  onToggleRule,
  onDeleteRule,
}) => {
  if (!isOpen) return null;

  const [alertType, setAlertType] = useState<AlertType>('price_above');
  const [targetValue, setTargetValue] = useState<number>(Number((stock.price * 1.02).toFixed(1)));
  const [note, setNote] = useState<string>('突破波段目標');

  const handleTypeChange = (type: AlertType) => {
    setAlertType(type);
    switch (type) {
      case 'price_above':
        setTargetValue(Number((stock.price * 1.025).toFixed(1)));
        setNote('突破波段壓力');
        break;
      case 'price_below':
        setTargetValue(Number((stock.price * 0.975).toFixed(1)));
        setNote('回測支撐停損');
        break;
      case 'change_percent_above':
        setTargetValue(3.0);
        setNote('盤中強勢大漲3%');
        break;
      case 'change_percent_below':
        setTargetValue(-2.5);
        setNote('急殺跌破2.5%警戒');
        break;
      case 'super_large_order':
        setTargetValue(100);
        setNote('單筆特大買單湧入');
        break;
      case 'turnover_above':
        setTargetValue(6.0);
        setNote('換手爆量過熱');
        break;
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetValue) return;

    onAddRule({
      symbol: stock.symbol,
      stockName: stock.name,
      type: alertType,
      targetValue: Number(targetValue),
      note: note.trim() || '自訂即時警示',
      enabled: true,
    });
  };

  // Pre-configured 1-click presets
  const handleApplyPreset = (type: AlertType, val: number, n: string) => {
    onAddRule({
      symbol: stock.symbol,
      stockName: stock.name,
      type,
      targetValue: val,
      note: n,
      enabled: true,
    });
  };

  const currentStockRules = rules.filter((r) => r.symbol === stock.symbol);
  const otherRules = rules.filter((r) => r.symbol !== stock.symbol);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                設定即時推播警示 · {stock.name} ({stock.symbol})
              </h3>
              <p className="text-xs text-slate-400">現價: ${stock.price} | 主力成本: ${stock.majorCost}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Quick 1-Click Presets */}
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
            <div className="text-xs font-bold text-amber-400 flex items-center space-x-1 mb-2.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>三竹推薦快捷警示：</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() =>
                  handleApplyPreset(
                    'price_above',
                    stock.resistanceLevel,
                    `突破關鍵壓力 $${stock.resistanceLevel}`
                  )
                }
                className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-left text-xs transition-all"
              >
                <div className="font-bold text-red-400">突破壓力 ${stock.resistanceLevel}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">多頭表態進攻訊號</div>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleApplyPreset(
                    'price_below',
                    stock.majorCost,
                    `跌破主力成本線 $${stock.majorCost}`
                  )
                }
                className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-left text-xs transition-all"
              >
                <div className="font-bold text-emerald-400">跌破主力成本 ${stock.majorCost}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">主力護盤防守警戒</div>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleApplyPreset(
                    'super_large_order',
                    150,
                    '特大單瞬間買超 150 張'
                  )
                }
                className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-left text-xs transition-all"
              >
                <div className="font-bold text-blue-400">特大單湧入 ≥ 150張</div>
                <div className="text-[10px] text-slate-400 mt-0.5">盤中主力手筆掃貨</div>
              </button>
            </div>
          </div>

          {/* Form to Add New Rule */}
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="text-xs font-bold text-slate-200">自訂警示規則條件：</div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { type: 'price_above' as AlertType, label: '目標價突破 (>=)', icon: TrendingUp },
                { type: 'price_below' as AlertType, label: '目標價跌破 (<=)', icon: TrendingDown },
                { type: 'change_percent_above' as AlertType, label: '漲幅超過 (%)', icon: Zap },
                { type: 'change_percent_below' as AlertType, label: '跌幅超過 (%)', icon: AlertTriangle },
                { type: 'super_large_order' as AlertType, label: '特大買單湧入 (張)', icon: Activity },
                { type: 'turnover_above' as AlertType, label: '周轉率過熱 (%>)', icon: Sparkles },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = alertType === item.type;
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => handleTypeChange(item.type)}
                    className={`p-2.5 rounded-xl border text-left text-xs font-medium flex items-center space-x-2 transition-all ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                        : 'bg-slate-950/60 text-slate-300 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  觸發數值門檻 ({alertType.includes('percent') || alertType.includes('turnover') ? '%' : alertType === 'super_large_order' ? '張' : '元'})
                </label>
                <input
                  type="number"
                  step="any"
                  value={targetValue}
                  onChange={(e) => setTargetValue(Number(e.target.value))}
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  警示備註名稱
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="例如：短線獲利目標、主力防守"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>建立並啟用此警示規則</span>
            </button>
          </form>

          {/* Current Stock Active Rules */}
          <div className="space-y-3 pt-2">
            <div className="text-xs font-bold text-slate-300 flex justify-between items-center">
              <span>{stock.name} ({stock.symbol}) 目前設定的警示規則 ({currentStockRules.length})</span>
            </div>

            {currentStockRules.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800/40">
                尚未替 {stock.name} 建立警示規則，可點選上方推薦快捷或自訂規則。
              </div>
            ) : (
              <div className="space-y-2">
                {currentStockRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-200 flex items-center space-x-2">
                        <span>{rule.note}</span>
                        <span className="font-mono text-amber-400">
                          {rule.type.includes('price') ? `$${rule.targetValue}` : `${rule.targetValue}${rule.type === 'super_large_order' ? '張' : '%'}`}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        已觸發 {rule.triggerCount} 次 {rule.lastTriggeredAt && `· 最近觸發: ${rule.lastTriggeredAt}`}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => onToggleRule(rule.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                          rule.enabled
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        {rule.enabled ? '監控中' : '已暫停'}
                      </button>

                      <button
                        type="button"
                        onClick={() => onDeleteRule(rule.id)}
                        className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                        title="刪除警示"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};
