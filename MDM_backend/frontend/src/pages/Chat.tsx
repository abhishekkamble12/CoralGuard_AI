import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { Send, Loader2, Bot, User, Info, Sparkles, MessageSquare } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function Chat() {
  const [sessionId] = useState(1);
  const [userId] = useState(1);
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hello! I'm the CoralGuard Reef Assistant. I can help you interpret reef analysis results, recommend scientific actions, and provide precautionary guidance based on current SOPs. How can I assist your monitoring today?",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [hasContext, setHasContext] = useState<boolean | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, loading]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const newMsg = message;
    setMessage("");
    setHistory((prev) => [...prev, { role: "user", content: newMsg }]);
    setLoading(true);

    try {
      const res = await api.post("/chat", { session_id: sessionId, user_id: userId, message: newMsg });
      setHistory((prev) => [...prev, { role: "assistant", content: res.data.answer }]);
      if (hasContext === null) {
        setHasContext(res.data.has_analysis_context ?? false);
      }
    } catch (err: any) {
      setHistory((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${err?.response?.data?.detail ?? err.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="h-[calc(100vh-12rem)] max-w-5xl mx-auto px-4">
      <Card className="h-full flex flex-col glass-panel border-slate-700/50 shadow-2xl overflow-hidden rounded-3xl">
        <CardHeader className="border-b border-white/5 bg-white/5 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-500/20 rounded-xl">
                <Bot className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold tracking-tight">Reef Assistant</CardTitle>
                <CardDescription className="text-xs text-slate-500 font-medium uppercase tracking-widest mt-0.5">
                  Scientific RAG Engine Active
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Connected</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden bg-slate-950/20">
          {/* Context Banner */}
          <AnimatePresence>
            {hasContext !== null && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }} 
                animate={{ height: "auto", opacity: 1 }}
                className={`px-6 py-3 text-xs flex items-center justify-between border-b border-white/5 ${hasContext ? "bg-cyan-500/10 text-cyan-300" : "bg-slate-800/20 text-slate-500"}`}
              >
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  <span className="font-medium tracking-wide">
                    {hasContext
                      ? "Intelligence feed synced with latest reef analysis."
                      : "No active analysis found. Responses will use global knowledge base."}
                  </span>
                </div>
                {hasContext && (
                  <span className="text-[10px] font-black uppercase tracking-widest bg-cyan-500/20 px-2 py-0.5 rounded">Context Aware</span>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-8 scroll-smooth">
            {history.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 border shadow-lg ${
                    msg.role === "user" 
                      ? "bg-gradient-to-br from-cyan-600 to-blue-700 border-cyan-400/30" 
                      : "bg-slate-800/80 border-slate-700"
                  }`}
                >
                  {msg.role === "user" ? (
                    <User className="w-5 h-5 text-white" />
                  ) : (
                    <Sparkles className="w-5 h-5 text-cyan-400" />
                  )}
                </div>
                <div
                  className={`p-5 rounded-2xl max-w-[80%] text-sm leading-relaxed shadow-sm ${
                    msg.role === "user"
                      ? "bg-cyan-600/10 text-cyan-50 border border-cyan-500/20 rounded-tr-none"
                      : "bg-slate-900/40 text-slate-200 border border-slate-800 rounded-tl-none backdrop-blur-sm"
                  }`}
                >
                  {msg.content}
                </div>
              </motion.div>
            ))}
            {loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 bg-slate-800/80 border border-slate-700">
                  <Bot className="w-5 h-5 text-cyan-400 animate-pulse" />
                </div>
                <div className="p-5 rounded-2xl bg-slate-900/40 text-slate-400 border border-slate-800 rounded-tl-none flex items-center gap-3 italic">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce" />
                  </div>
                  Synthesizing knowledge base...
                </div>
              </motion.div>
            )}
          </div>

          {/* Quick Prompts */}
          {history.length <= 2 && (
            <div className="px-6 py-4 flex gap-3 flex-wrap border-t border-white/5 bg-slate-900/40 backdrop-blur-md">
              {[
                "Interpret my latest results",
                "Authority contact protocols",
                "Bleaching SSTA thresholds",
                "Standard precautionary steps",
              ].map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => {
                    setMessage(prompt);
                  }}
                  className="text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl bg-slate-800/50 text-slate-400 hover:bg-cyan-500/10 hover:text-cyan-300 transition-all border border-slate-700/50 hover:border-cyan-500/30"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="p-6 border-t border-white/5 bg-white/5 backdrop-blur-xl">
            <form onSubmit={send} className="flex gap-3">
              <div className="relative flex-1">
                <MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ask about reef health, actions, or protocols..."
                  className="flex-1 h-14 pl-12 glass-input border-slate-700/50 focus:border-cyan-500/50 text-md rounded-2xl"
                  disabled={loading}
                />
              </div>
              <Button type="submit" disabled={loading || !message.trim()} className="h-14 px-10 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-cyan-500/20">
                <Send className="w-4 h-4 mr-2" />
                Submit
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
