import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../api/client";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import {
  Search, Loader2, BookOpen, AlertCircle, FileText, Phone, Shield,
  Siren, Leaf, ChevronRight,
} from "lucide-react";

const categoryIcons: Record<string, React.ReactNode> = {
  "Standard Operating Procedures": <FileText className="w-5 h-5 text-cyan-400" />,
  "Authority Contacts": <Phone className="w-5 h-5 text-blue-400" />,
  "Precautionary Measures": <Shield className="w-5 h-5 text-amber-400" />,
  "Reef Ecology": <Leaf className="w-5 h-5 text-emerald-400" />,
  "Emergency Response": <Siren className="w-5 h-5 text-red-400" />,
};

type ViewMode = "browse" | "search";

interface SearchResult {
  id: string;
  title: string;
  content: string;
  source: string;
  category: string;
  score?: number;
}

export function Rag() {
  const [mode, setMode] = useState<ViewMode>("browse");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [categories, setCategories] = useState<Record<string, SearchResult[]>>({});
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);

  const loadCategories = async () => {
    if (categoriesLoaded) return;
    setLoading(true);
    try {
      const res = await api.get("/rag/categories");
      setCategories(res.data.categories || {});
      setCategoriesLoaded(true);
    } catch (err: any) {
      setError("Failed to load knowledge base. Ensure data has been ingested.");
    } finally {
      setLoading(false);
    }
  };

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setError("");
    setLoading(true);
    setMode("search");
    try {
      const res = await api.post("/rag/search", { session_id: 1, query, top_k: 8 });
      setSearchResults(res.data.results || []);
    } catch (err: any) {
      setError(`Error: ${err?.response?.data?.detail ?? err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!categoriesLoaded && !loading) {
    loadCategories();
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-10 max-w-6xl mx-auto px-4 pb-20">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full mb-2">
          <BookOpen className="w-4 h-4 text-cyan-400" />
          <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Knowledge Repository</span>
        </div>
        <h2 className="text-5xl font-black text-white tracking-tighter">
          Scientific Knowledge Base
        </h2>
        <p className="text-slate-400 max-w-2xl mx-auto text-lg">
          Access Standard Operating Procedures, emergency protocols, and authoritative guidelines for coral reef conservation.
        </p>
      </div>

      {/* Search Bar */}
      <Card className="glass-panel border-slate-700/50 p-2 rounded-3xl overflow-hidden shadow-2xl">
        <form onSubmit={search} className="flex gap-2 p-1">
          <div className="relative flex-1">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-16 pl-14 glass-input border-none bg-transparent text-lg focus:ring-0 focus:border-none w-full"
              placeholder="Search protocols, contacts, or guidelines..."
            />
          </div>
          <Button type="submit" className="h-14 px-10 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-cyan-500/20" disabled={loading}>
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Query Database"}
          </Button>
        </form>
      </Card>

      <div className="space-y-8">
        {/* Toggle Switch */}
        <div className="flex justify-center">
          <div className="flex p-1 bg-slate-900/50 backdrop-blur-md rounded-2xl border border-white/5">
            <button
              onClick={() => setMode("browse")}
              className={`text-[10px] font-black uppercase tracking-widest px-6 py-2.5 rounded-xl transition-all ${
                mode === "browse" ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/20" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              Browse Categories
            </button>
            <button
              onClick={() => setMode("search")}
              className={`text-[10px] font-black uppercase tracking-widest px-6 py-2.5 rounded-xl transition-all ${
                mode === "search" ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/20" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              Search Results
            </button>
          </div>
        </div>

        {error && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-3 text-sm text-red-400 bg-red-400/10 p-5 rounded-2xl border border-red-400/20 max-w-2xl mx-auto">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="font-medium">{error}</p>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {mode === "browse" ? (
            <motion.div key="browse" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.keys(categories).length > 0 ? (
                Object.entries(categories).map(([cat, docs], idx) => (
                  <Card key={cat} className="glass-panel border-slate-700/30 overflow-hidden group hover:border-cyan-500/30 transition-all duration-500">
                    <button
                      onClick={() => setExpandedCat(expandedCat === cat ? null : cat)}
                      className="w-full text-left p-6 flex items-center gap-4 hover:bg-white/[0.03] transition-all"
                    >
                      <div className="p-3 bg-slate-800/80 rounded-2xl border border-white/5 group-hover:scale-110 transition-transform">
                        {categoryIcons[cat] || <BookOpen className="w-5 h-5 text-slate-400" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-md font-black text-slate-100 uppercase tracking-tight">{cat}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{docs.length} Entries Available</p>
                      </div>
                      <ChevronRight className={`w-5 h-5 text-slate-600 transition-transform duration-500 ${expandedCat === cat ? "rotate-90 text-cyan-400" : ""}`} />
                    </button>
                    <AnimatePresence>
                      {expandedCat === cat && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden border-t border-white/5 bg-black/20"
                        >
                          <div className="p-6 space-y-4 max-h-[500px] overflow-y-auto scrollbar-thin">
                            {docs.map((doc, i) => (
                              <div key={doc.id || i} className="p-5 rounded-2xl bg-slate-900/60 border border-white/5 text-sm text-slate-400 leading-relaxed hover:border-white/10 transition-colors">
                                {doc.content}
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                ))
              ) : loading ? (
                <div className="col-span-full py-20 text-center text-slate-500">
                  <div className="relative inline-block mb-4">
                    <div className="absolute inset-0 bg-cyan-500/20 blur-2xl rounded-full animate-pulse" />
                    <Loader2 className="w-12 h-12 animate-spin mx-auto text-cyan-400 relative z-10" />
                  </div>
                  <p className="font-mono text-xs uppercase tracking-widest">Querying Knowledge Base...</p>
                </div>
              ) : (
                <Card className="col-span-full glass-panel border-dashed border-2 border-slate-800 p-20 text-center">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-slate-500/10 blur-3xl rounded-full" />
                    <BookOpen className="w-20 h-20 mx-auto text-slate-800 relative z-10" />
                  </div>
                  <p className="text-xl font-bold text-slate-600 mb-2">Knowledge Base Uninitialized</p>
                  <p className="text-slate-700 max-w-sm mx-auto mb-8">Execute the ingestion sequence to synchronize scientific documents with the RAG engine.</p>
                  <code className="px-4 py-2 bg-black/40 rounded-lg text-cyan-500 font-mono text-xs border border-white/5">
                    python -m app.rag.ingest --force
                  </code>
                </Card>
              )}
            </motion.div>
          ) : (
            <motion.div key="search" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="grid grid-cols-1 gap-6 max-w-4xl mx-auto">
              {searchResults.length > 0 ? (
                searchResults.map((res, idx) => (
                  <Card key={res.id || idx} className="glass-panel border-slate-700/30 overflow-hidden hover:border-cyan-500/30 transition-all duration-300">
                    <CardContent className="p-8">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-slate-800 rounded-xl border border-white/5">
                            {categoryIcons[res.category] || <BookOpen className="w-4 h-4 text-slate-400" />}
                          </div>
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{res.category}</span>
                        </div>
                        {res.score !== undefined && (
                          <div className="flex items-center gap-2 px-3 py-1 bg-cyan-500/10 rounded-full border border-cyan-500/20">
                            <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">
                              Match: {(res.score * 100).toFixed(0)}%
                            </span>
                          </div>
                        )}
                      </div>
                      <p className="text-md text-slate-300 leading-relaxed whitespace-pre-wrap font-medium">{res.content}</p>
                      <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Source: {res.source}</span>
                        <Button variant="ghost" className="text-[10px] font-black uppercase text-cyan-500 hover:bg-cyan-500/10">Copy Reference</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card className="glass-panel border-dashed border-2 border-slate-800 p-20 text-center">
                  <Search className="w-16 h-16 mx-auto mb-4 text-slate-800 opacity-30" />
                  <p className="text-slate-500 font-bold">No matches found for your query.</p>
                  <p className="text-xs text-slate-600 mt-1">Try refining your search terms or browsing categories.</p>
                </Card>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
