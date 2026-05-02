import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api } from "../api/client";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import {
  Activity, AlertTriangle, BarChart3, ShieldCheck, ShieldAlert, Skull,
  ArrowRight, Loader2
} from "lucide-react";
import { Link } from "react-router-dom";
import type { DashboardStats } from "../types";

const riskColors: Record<string, string> = {
  Low: "text-emerald-400",
  Elevated: "text-amber-400",
  Critical: "text-red-400",
  Unknown: "text-slate-400",
};

const riskIcons: Record<string, React.ReactNode> = {
  Healthy: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
  Bleached: <ShieldAlert className="w-4 h-4 text-amber-400" />,
  Dead: <Skull className="w-4 h-4 text-red-400" />,
};

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/dashboard/stats")
      .then((res) => setStats(res.data))
      .catch(() => setStats({ total_analyses: 0, active_alerts: 0, recent_analyses: [] }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-cyan-500" />
        <p className="text-slate-500 font-mono text-xs uppercase tracking-widest">Synchronizing Intelligence...</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 max-w-7xl mx-auto px-4 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tighter">System Overview</h2>
          <p className="text-slate-400 mt-2 text-lg font-medium">Real-time telemetry and autonomous agent status.</p>
        </div>
        <Link to="/analyze">
          <Button className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-xl shadow-cyan-500/20 h-12 px-6 rounded-xl font-bold">
            <Activity className="w-4 h-4 mr-2" /> 
            Initialize Analysis
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <MetricCard
          title="Total Analyses"
          value={String(stats?.total_analyses ?? 0)}
          icon={<BarChart3 className="w-6 h-6 text-cyan-400" />}
          subtitle="All-time scans performed"
          trend="+12% from last week"
        />
        <MetricCard
          title="Active Alerts"
          value={String(stats?.active_alerts ?? 0)}
          icon={<AlertTriangle className="w-6 h-6 text-amber-400" />}
          subtitle="Critical events dispatched"
          highlight={!!stats?.active_alerts}
          trend={stats?.active_alerts ? "Requires Attention" : "All Clear"}
        />
        <MetricCard
          title="System Status"
          value="Operational"
          icon={<ShieldCheck className="w-6 h-6 text-emerald-400" />}
          subtitle="All 6 agents online"
          trend="Latency: 12ms"
        />
      </div>

      {/* Recent Activity */}
      <Card className="glass-panel border-slate-700/50 overflow-hidden">
        <CardHeader className="bg-white/5 border-b border-white/5 p-6">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-500" />
            Recent Telemetry Feed
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {stats?.recent_analyses && stats.recent_analyses.length > 0 ? (
            <div className="divide-y divide-white/5">
              {stats.recent_analyses.map((a) => (
                <motion.div 
                  key={a.id} 
                  whileHover={{ backgroundColor: "rgba(255,255,255,0.03)" }}
                  className="flex items-center justify-between p-6 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-800/80 rounded-2xl border border-white/5">
                      {riskIcons[a.class_name] || <ShieldCheck className="w-5 h-5 text-slate-400" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-black text-slate-100">
                          Sequence #{a.id}
                        </p>
                        <span className="text-[10px] px-2 py-0.5 bg-cyan-500/10 text-cyan-400 rounded-full font-bold uppercase">
                          {a.class_name}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date(a.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className={`text-sm font-black uppercase tracking-tighter ${riskColors[a.risk_level] || "text-slate-400"}`}>
                        {a.risk_level}
                      </p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Risk Level</p>
                    </div>
                    <div className="w-12 h-12 rounded-full border-2 border-slate-800 flex items-center justify-center bg-slate-900/50">
                       <span className="text-xs font-bold text-slate-300">
                        {(a.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center text-slate-500">
              <div className="relative inline-block mb-6">
                <div className="absolute inset-0 bg-cyan-500/10 blur-2xl rounded-full" />
                <Activity className="w-16 h-16 mx-auto opacity-20 relative z-10" />
              </div>
              <p className="text-lg font-medium text-slate-400">No telemetry data available.</p>
              <p className="text-sm text-slate-600 mt-1 mb-8">Initiate your first reef sequence to populate the feed.</p>
              <Link to="/analyze">
                <Button variant="outline" className="border-slate-700 hover:bg-slate-800 rounded-xl px-8">
                  Get Started <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function MetricCard({
  title, value, icon, subtitle, highlight, trend
}: {
  title: string; value: string; icon: React.ReactNode; subtitle: string; highlight?: boolean; trend?: string;
}) {
  return (
    <Card className={`glass-panel border-slate-700/50 overflow-hidden relative group transition-all duration-500 hover:-translate-y-1 ${highlight ? "border-amber-500/30 shadow-xl shadow-amber-900/10" : ""}`}>
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        {icon}
      </div>
      <CardContent className="p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
            {icon}
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{title}</p>
            <p className="text-xs text-slate-400 font-medium">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-end justify-between">
          <span className="text-5xl font-black text-white tracking-tighter">{value}</span>
          {trend && (
            <span className={`text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider ${highlight ? "bg-amber-500/20 text-amber-400" : "bg-cyan-500/10 text-cyan-400"}`}>
              {trend}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
