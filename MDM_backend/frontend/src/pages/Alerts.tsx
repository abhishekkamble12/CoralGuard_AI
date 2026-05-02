import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../api/client";
import { Card, CardContent } from "../components/ui/Card";
import { BellRing, CheckCircle, XCircle, Mail, Globe, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import type { AlertItem } from "../types";

const riskColors: Record<string, string> = {
  Low: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  Elevated: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  Critical: "bg-red-500/20 text-red-400 border-red-500/30",
};

export function Alerts() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newCount, setNewCount] = useState(0);

  const fetchAlerts = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const res = await api.get("/alerts");
      const incoming: AlertItem[] = res.data.alerts || [];
      setAlerts((prev) => {
        const diff = incoming.length - prev.length;
        if (diff > 0) setNewCount((n) => n + diff);
        return incoming;
      });
    } catch {
      // keep existing alerts on error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Poll every 10 seconds for new alerts dispatched after analysis
  useEffect(() => {
    const interval = setInterval(() => fetchAlerts(true), 10_000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  // Clear new-alert badge after 5 seconds
  useEffect(() => {
    if (newCount > 0) {
      const t = setTimeout(() => setNewCount(0), 5000);
      return () => clearTimeout(t);
    }
  }, [newCount]);

  if (loading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-cyan-500" />
        <p className="text-slate-500 font-mono text-xs uppercase tracking-widest">Querying Dispatch Logs...</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 max-w-6xl mx-auto px-4 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tighter">Dispatch Logs</h2>
          <p className="text-slate-400 mt-2 text-lg font-medium">Historical audit of autonomous agent alerts.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* New alert flash badge */}
          <AnimatePresence>
            {newCount > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-2 px-3 py-2 bg-amber-500/20 border border-amber-500/40 rounded-2xl"
              >
                <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                <span className="text-xs font-bold text-amber-400">+{newCount} New Alert{newCount > 1 ? "s" : ""}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={() => fetchAlerts()}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors disabled:opacity-50"
            title="Refresh alerts"
          >
            <RefreshCw className={`w-4 h-4 text-slate-400 ${refreshing ? "animate-spin" : ""}`} />
          </button>

          <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-2xl">
            <BellRing className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-slate-300">{alerts.length} Records Detected</span>
          </div>
        </div>
      </div>

      {alerts.length > 0 ? (
        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-cyan-500/50 via-slate-800 to-transparent" />

          <div className="space-y-6">
            <AnimatePresence initial={false}>
              {alerts.map((alert, idx) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(idx * 0.05, 0.3) }}
                  className="relative pl-20"
                >
                  {/* Timeline Dot */}
                  <div className={`absolute left-8 -translate-x-1/2 top-8 w-4 h-4 rounded-full border-2 border-slate-900 z-10 shadow-[0_0_15px_rgba(6,182,212,0.5)] ${alert.risk_level === "Critical" ? "bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]" :
                      alert.risk_level === "Elevated" ? "bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]" :
                        "bg-cyan-500"
                    }`} />

                  <Card className="glass-panel border-slate-700/50 overflow-hidden hover:border-cyan-500/30 transition-all duration-300 group">
                    <CardContent className="p-0">
                      <div className="flex flex-col md:flex-row md:items-center">
                        {/* Left Side: Risk Indicator */}
                        <div className={`md:w-32 p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-white/5 bg-white/5 ${alert.risk_level === "Critical" ? "text-red-400" :
                            alert.risk_level === "Elevated" ? "text-amber-400" :
                              "text-emerald-400"
                          }`}>
                          <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">Risk Level</p>
                          <p className="text-sm font-black uppercase tracking-tighter">{alert.risk_level}</p>
                          <p className="text-[10px] font-bold opacity-50 mt-1">{(alert.confidence * 100).toFixed(0)}%</p>
                        </div>

                        {/* Middle: Details */}
                        <div className="flex-1 p-6 flex flex-col gap-1">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-xs font-black text-slate-100 uppercase tracking-widest">
                              Analysis Sequence #{alert.analysis_id}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border flex items-center gap-1.5 ${alert.channel === "email"
                                ? "bg-blue-500/10 border-blue-500/20 text-blue-400"
                                : "bg-purple-500/10 border-purple-500/20 text-purple-400"
                              }`}>
                              {alert.channel === "email" ? <Mail className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                              {alert.channel === "email" ? "SMTP RELAY" : "WEBHOOK DISPATCH"}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 font-medium mt-1">
                            Target: <span className="text-slate-300 italic">{alert.target}</span>
                          </p>
                        </div>

                        {/* Right: Status & Time */}
                        <div className="p-6 md:w-64 border-t md:border-t-0 md:border-l border-white/5 bg-black/20 flex flex-col items-end justify-center">
                          <div className="flex items-center gap-2 mb-2">
                            {alert.status === "sent" ? (
                              <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                                <CheckCircle className="w-3 h-3 text-emerald-400" />
                                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Transmitted</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
                                <XCircle className="w-3 h-3 text-red-400" />
                                <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">Failed</span>
                              </div>
                            )}
                          </div>
                          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                            {new Date(alert.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      ) : (
        <Card className="glass-panel border-dashed border-2 border-slate-800 p-20 text-center">
          <div className="relative inline-block mb-8">
            <div className="absolute inset-0 bg-cyan-500/10 blur-3xl rounded-full" />
            <BellRing className="w-20 h-20 mx-auto text-slate-800 relative z-10" />
          </div>
          <h3 className="text-2xl font-black text-slate-300 tracking-tighter">No Dispatches Recorded</h3>
          <p className="text-slate-500 max-w-sm mx-auto mt-2 mb-8 leading-relaxed font-medium">
            The autonomous dispatch agent is currently on standby. Alerts will trigger automatically when high-risk reef anomalies are validated.
          </p>
          <div className="flex justify-center gap-4">
            <div className="px-4 py-2 bg-slate-900 rounded-xl border border-white/5 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Threshold: Elevated+</span>
            </div>
          </div>
        </Card>
      )}
    </motion.div>
  );
}
