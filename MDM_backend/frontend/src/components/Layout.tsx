// Force reload: v1.0.1
import { Link, Outlet, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { LayoutDashboard, FileSearch, MessageSquare, Bell, Database, LogOut, Waves } from "lucide-react";
import { cn } from "../lib/utils";
import { getToken, clearToken } from "../api/client";

const nav = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/analyze", label: "Analyze", icon: FileSearch },
  { path: "/chat", label: "Chat", icon: MessageSquare },
  { path: "/alerts", label: "Alerts", icon: Bell },
  { path: "/rag", label: "Knowledge Base", icon: Database },
];

export function Layout() {
  const location = useLocation();
  const isAuthenticated = !!getToken();
  const isLoginPage = location.pathname === "/";

  const handleLogout = () => {
    clearToken();
    window.location.href = "/";
  };

  if (isLoginPage) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-950">
        {/* Animated Background Gradients */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-600/10 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="relative z-10 w-full max-w-md">
          <Outlet />
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100 selection:bg-cyan-500/30">
      {/* Sidebar Navigation */}
      <aside className="w-72 glass-panel border-r border-white/5 flex flex-col fixed inset-y-0 left-0 z-50 overflow-hidden">
        {/* Background glow for sidebar */}
        <div className="absolute top-0 left-0 w-full h-64 bg-cyan-500/5 blur-[80px] -z-10" />
        
        <div className="p-8 flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-cyan-600 to-blue-700 rounded-2xl shadow-lg shadow-cyan-900/40">
            <Waves className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tighter uppercase">
              CoralGuard
            </h1>
            <p className="text-[10px] font-black text-cyan-500 uppercase tracking-widest leading-none">Intelligence Swarm</p>
          </div>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto scrollbar-none">
          <p className="px-4 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-4">Core Systems</p>
          {nav.map(({ path, label, icon: Icon }) => {
            const isActive = location.pathname === path;
            return (
              <Link 
                key={path} 
                to={path}
                className={cn(
                  "flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group relative",
                  isActive 
                    ? "bg-white/5 text-cyan-400 border border-white/5 shadow-xl" 
                    : "text-slate-500 hover:bg-white/[0.03] hover:text-slate-200"
                )}
              >
                {isActive && (
                  <motion.div 
                    layoutId="active-nav"
                    className="absolute left-0 w-1.5 h-6 bg-cyan-500 rounded-r-full shadow-[4px_0_12px_rgba(6,182,212,0.6)]" 
                  />
                )}
                <Icon className={cn("w-5 h-5 transition-transform duration-300 group-hover:scale-110", isActive ? "text-cyan-400" : "text-slate-600 group-hover:text-slate-300")} />
                <span className="font-black text-xs uppercase tracking-widest">{label}</span>
              </Link>
            )
          })}
        </nav>

        {isAuthenticated && (
          <div className="p-6 mt-auto">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 mb-4">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center font-black text-cyan-500">
                    AD
                 </div>
                 <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-slate-200 uppercase truncate">Administrator</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Lead Scientist</p>
                 </div>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-4 px-4 py-3.5 w-full text-left text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-2xl transition-all duration-300 font-black text-[10px] uppercase tracking-widest"
            >
              <LogOut className="w-5 h-5" />
              <span>Terminate Session</span>
            </button>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 pl-72 min-h-screen flex flex-col relative">
        {/* Header */}
        <header className="h-24 glass-panel border-x-0 border-t-0 border-b border-white/5 flex items-center justify-between px-10 sticky top-0 z-40">
           <div className="flex flex-col">
             <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
               <LayoutDashboard className="w-3 h-3" />
               <span className="opacity-50">Platform</span>
               <span className="opacity-30">/</span>
               <span className="text-cyan-500">{nav.find(n => n.path === location.pathname)?.label || "Interface"}</span>
             </div>
             <h2 className="text-lg font-black text-white uppercase tracking-tighter mt-1">
               {nav.find(n => n.path === location.pathname)?.label || "System Interface"}
             </h2>
           </div>

           {isAuthenticated && (
             <div className="flex items-center gap-6">
                <div className="flex flex-col items-end">
                   <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                      <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Nodes Operational</span>
                   </div>
                   <p className="text-[9px] font-bold text-slate-600 uppercase tracking-tight mt-0.5">Latency: 14.2ms</p>
                </div>
                <div className="h-10 w-px bg-white/5" />
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 flex items-center justify-center shadow-2xl relative group cursor-pointer">
                    <Bell className="w-5 h-5 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-slate-950 flex items-center justify-center text-[8px] font-black text-white">3</span>
                  </div>
                </div>
             </div>
           )}
        </header>

        {/* Content Outlet */}
        <div className="p-10 w-full flex-1 relative overflow-hidden">
           {/* Decorative background glow for content */}
           <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-cyan-600/5 rounded-full blur-[160px] -z-10" />
           <Outlet />
        </div>
      </main>
    </div>
  );
}
