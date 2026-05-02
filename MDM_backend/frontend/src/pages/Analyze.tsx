import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../api/client";
import type { AnalysisResult } from "../types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import ReasoningTimeline from "../components/ReasoningTimeline";
import {
  UploadCloud, Loader2, AlertCircle, CheckCircle2, ShieldAlert,
  Skull, Phone, Shield, BellRing, FileText, ChevronDown, ChevronUp, ImageIcon,
  Zap, Database, Target, BrainCircuit, Eye, Search, ShieldCheck
} from "lucide-react";

const riskGradients: Record<string, string> = {
  Low: "from-emerald-500/20 to-emerald-600/5 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.1)]",
  Elevated: "from-amber-500/20 to-amber-600/5 border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.1)]",
  Critical: "from-red-500/20 to-red-600/5 border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.1)]",
};

export function Analyze() {
  const [sessionId, setSessionId] = useState(1);
  const [ssta, setSsta] = useState(0.2);
  const [tsa, setTsa] = useState(4);
  const [depth, setDepth] = useState(12);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showFullReport, setShowFullReport] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (f) {
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target?.result as string);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  };

  const runAnalysis = async () => {
    setError("");
    setLoading(true);
    setResult(null);
    try {
      const form = new FormData();
      form.append("session_id", String(sessionId));
      form.append("ssta", String(ssta));
      form.append("tsa", String(tsa));
      form.append("depth", String(depth));
      if (file) form.append("file", file);
      const res = await api.post("/analyze", form);
      setResult(res.data);
    } catch (err: any) {
      setError(`Error: ${err?.response?.data?.detail ?? err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const riskLevel = result?.fusion?.final_risk || "Low";

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 max-w-7xl mx-auto px-4 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-cyan-500/20 rounded-lg">
              <BrainCircuit className="w-6 h-6 text-cyan-400" />
            </div>
            <span className="text-sm font-bold text-cyan-500 uppercase tracking-widest">Autonomous Pipeline</span>
          </div>
          <h2 className="text-4xl font-black text-white tracking-tight">Coral Health Analysis</h2>
          <p className="text-slate-400 mt-2 text-lg">Multi-agent reasoning engine for marine ecosystem diagnostics.</p>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono text-slate-500">
          <div className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-500" /> Groq Inference: Active
          </div>
          <div className="flex items-center gap-1">
            <Database className="w-3 h-3 text-cyan-500" /> Qdrant RAG: Online
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Left Panel: Inputs */}
        <div className="xl:col-span-4 space-y-6">
          <Card className="glass-panel border-slate-700/50 overflow-hidden">
            <CardHeader className="border-b border-white/5 bg-white/5">
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="w-5 h-5 text-cyan-400" />
                Input Parameters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Session ID</label>
                  <Input type="number" value={sessionId} onChange={(e) => setSessionId(Number(e.target.value))} className="glass-input" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Depth (m)</label>
                  <Input type="number" value={depth} onChange={(e) => setDepth(Number(e.target.value))} className="glass-input" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">SSTA (°C)</label>
                  <Input type="number" step="0.1" value={ssta} onChange={(e) => setSsta(Number(e.target.value))} className="glass-input" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">TSA</label>
                  <Input type="number" step="0.1" value={tsa} onChange={(e) => setTsa(Number(e.target.value))} className="glass-input" />
                </div>
              </div>

              {/* Image Upload */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Reef Imagery</label>
                <div
                  className="mt-2 flex justify-center rounded-2xl border-2 border-dashed border-slate-700/50 px-6 py-10 hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all group cursor-pointer relative overflow-hidden"
                  onClick={() => document.getElementById("file-upload")?.click()}
                >
                  {preview ? (
                    <div className="relative w-full group">
                      <img src={preview} alt="Preview" className="w-full h-48 object-cover rounded-xl" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <p className="text-white text-xs font-bold uppercase">Change Image</p>
                      </div>
                      <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md text-[10px] text-white px-2 py-1 rounded-lg flex items-center gap-1">
                        <ImageIcon className="w-3 h-3" /> {file?.name}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="mx-auto h-16 w-16 bg-slate-800/50 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <UploadCloud className="h-8 w-8 text-slate-500 group-hover:text-cyan-400" />
                      </div>
                      <p className="text-sm text-slate-300 font-semibold">Drop reef imagery here</p>
                      <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest">JPEG, PNG up to 10MB</p>
                    </div>
                  )}
                  <input id="file-upload" type="file" className="sr-only" accept="image/*" onChange={handleFileChange} />
                </div>
              </div>

              <Button onClick={runAnalysis} className="w-full h-12 text-md font-bold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-lg shadow-cyan-500/20" disabled={loading}>
                {loading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Sequencing Loop...</> : "Initialize Analysis"}
              </Button>

              {error && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2 text-sm text-red-400 bg-red-400/10 p-4 rounded-xl border border-red-400/20">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <p>{error}</p>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Panel: Results & Reasoning */}
        <div className="xl:col-span-8 space-y-8">
          <AnimatePresence mode="wait">
            {result ? (
              <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-8">
                  {/* Risk Level Banner */}
                  <div className={`rounded-3xl border-2 bg-gradient-to-br p-8 ${riskGradients[riskLevel]}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl">
                          {riskLevel === "Critical" ? <Skull className="w-10 h-10 text-red-400" /> :
                           riskLevel === "Elevated" ? <ShieldAlert className="w-10 h-10 text-amber-400" /> :
                           <CheckCircle2 className="w-10 h-10 text-emerald-400" />}
                        </div>
                        <div>
                          <p className="text-xs font-black text-white/50 uppercase tracking-widest mb-1">Threat Level</p>
                          <p className="text-4xl font-black text-white tracking-tighter">{riskLevel}</p>
                          <div className="mt-4 inline-flex items-center px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-bold text-white uppercase tracking-wider">
                            Confidence: {(result.fusion.confidence * 100).toFixed(0)}%
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-8 grid grid-cols-2 gap-4">
                      <div className="p-4 bg-black/20 rounded-2xl border border-white/5">
                        <p className="text-[10px] font-bold text-white/40 uppercase mb-1">Vision Classification</p>
                        <p className="text-xl font-bold text-white">{result.vision.class_name}</p>
                      </div>
                      <div className="p-4 bg-black/20 rounded-2xl border border-white/5">
                        <p className="text-[10px] font-bold text-white/40 uppercase mb-1">Environmental Cluster</p>
                        <p className="text-xl font-bold text-white">{result.environment.cluster}</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Measures */}
                  <div className="space-y-4">
                    <Card className="glass-panel border-slate-700/30">
                      <CardContent className="p-6 space-y-6">
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-cyan-500/10 rounded-xl">
                            <Shield className="w-6 h-6 text-cyan-400" />
                          </div>
                          <div>
                            <p className="text-sm font-black text-white uppercase tracking-wider">Strategic Response</p>
                            <p className="text-slate-300 mt-2 leading-relaxed italic border-l-2 border-cyan-500/50 pl-4">{result.report.recommended_action}</p>
                          </div>
                        </div>

                        {result.report.precautionary_measures && (
                          <div className="pt-6 border-t border-white/5 flex items-start gap-4">
                            <div className="p-3 bg-blue-500/10 rounded-xl">
                              <FileText className="w-6 h-6 text-blue-400" />
                            </div>
                            <div>
                              <p className="text-sm font-black text-white uppercase tracking-wider">Precautionary Measures</p>
                              <p className="text-slate-400 mt-2 text-sm leading-relaxed">{result.report.precautionary_measures}</p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {result.alerts && result.alerts.length > 0 && (
                      <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="p-6 bg-red-500/10 border border-red-500/20 rounded-3xl">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-red-500/20 rounded-2xl">
                            <BellRing className="w-6 h-6 text-red-400 animate-pulse" />
                          </div>
                          <div>
                            <p className="text-sm font-black text-red-400 uppercase tracking-widest">Authority Escallation</p>
                            <div className="flex gap-2 mt-2">
                              {result.alerts.map((a) => (
                                <span key={a.id} className="text-[10px] font-bold px-3 py-1 bg-red-500/20 text-red-300 rounded-full border border-red-500/30">
                                  {a.channel} // {a.status}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Full Report Collapsible */}
                  <Card className="glass-panel overflow-hidden">
                    <button
                      onClick={() => setShowFullReport(!showFullReport)}
                      className="flex items-center justify-between w-full p-6 text-left hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-slate-400" />
                        <span className="font-bold text-slate-200">Extended Scientific Briefing</span>
                      </div>
                      {showFullReport ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
                    </button>
                    <AnimatePresence>
                      {showFullReport && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden border-t border-white/5"
                        >
                          <div className="p-6 space-y-6 text-sm">
                            <div className="space-y-2">
                              <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Executive Summary</p>
                              <p className="text-slate-300 leading-relaxed font-medium">{result.report.summary}</p>
                            </div>
                            <div className="space-y-2">
                              <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Scientific Reasoning</p>
                              <div className="text-slate-400 leading-relaxed space-y-4">
                                {result.report.scientific_reasoning.split('\n\n').map((para, i) => (
                                  <p key={i}>{para}</p>
                                ))}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </div>

                {/* Reasoning Timeline */}
                <div className="space-y-4">
                  <div className="p-6 glass-panel rounded-3xl border-slate-700/50">
                    <ReasoningTimeline steps={result.reasoning_log || []} />
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div key="empty" className="h-full">
                <Card className="glass-panel h-full border-dashed border-2 border-slate-800">
                  <CardContent className="h-[600px] flex flex-col items-center justify-center text-slate-500">
                    <div className="relative mb-8">
                      <div className="absolute inset-0 bg-cyan-500/20 blur-3xl rounded-full animate-pulse-slow" />
                      <BrainCircuit className="w-24 h-24 text-slate-800 relative z-10" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-400 mb-2">Awaiting Intelligence Sequence</h3>
                    <p className="text-slate-500 max-w-xs text-center">
                      Once triggered, the multi-agent swarm will begin researching, validating, and routing health data.
                    </p>
                    <div className="mt-12 grid grid-cols-3 gap-8 w-full max-w-lg opacity-30 grayscale">
                       <div className="text-center space-y-2">
                          <Eye className="w-8 h-8 mx-auto" />
                          <p className="text-[10px] font-bold uppercase tracking-widest">Vision</p>
                       </div>
                       <div className="text-center space-y-2">
                          <Search className="w-8 h-8 mx-auto" />
                          <p className="text-[10px] font-bold uppercase tracking-widest">Analyst</p>
                       </div>
                       <div className="text-center space-y-2">
                          <ShieldCheck className="w-8 h-8 mx-auto" />
                          <p className="text-[10px] font-bold uppercase tracking-widest">Critic</p>
                       </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
