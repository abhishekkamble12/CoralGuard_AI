import React from 'react';
import { ReasoningStep } from '../types';
import { motion } from 'framer-motion';
import { CheckCircle, Search, ShieldCheck, AlertTriangle, Send, RefreshCw, Eye } from 'lucide-react';

interface Props {
  steps: ReasoningStep[];
}

const getAgentIcon = (name: string) => {
  switch (name) {
    case 'VisionAgent': return <Eye className="w-5 h-5 text-blue-400" />;
    case 'EnvironmentAgent': return <Search className="w-5 h-5 text-indigo-400" />;
    case 'FusionAgent': return <RefreshCw className="w-5 h-5 text-cyan-400" />;
    case 'AnalystAgent': return <Search className="w-5 h-5 text-emerald-400" />;
    case 'CriticAgent': return <ShieldCheck className="w-5 h-5 text-purple-400" />;
    case 'DispatchAgent': return <Send className="w-5 h-5 text-amber-400" />;
    default: return <AlertTriangle className="w-5 h-5 text-slate-400" />;
  }
};

const ReasoningTimeline: React.FC<Props> = ({ steps }) => {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gradient flex items-center gap-2">
        <RefreshCw className="w-6 h-6 animate-spin-slow" />
        Autonomous Reasoning Loop
      </h3>
      
      <div className="relative pl-8 space-y-8 before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-700/50">
        {steps.map((step, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.15 }}
            className="relative"
          >
            <div className="absolute -left-[31px] top-1 p-1 bg-slate-900 border border-slate-700 rounded-full z-10">
              {getAgentIcon(step.agent_name)}
            </div>
            
            <div className="glass-card p-4 hover:border-cyan-500/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                  {step.agent_name}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {new Date(step.timestamp).toLocaleTimeString()}
                </span>
              </div>
              
              <div className="text-xs font-semibold text-cyan-400 mb-1">
                {step.action}
              </div>
              
              <p className="text-sm text-slate-400 leading-relaxed">
                {step.output}
              </p>
              
              {step.agent_name === 'CriticAgent' && step.output.includes('Valid: true') && (
                <div className="mt-2 flex items-center gap-2 text-[10px] text-emerald-400 font-bold uppercase">
                  <CheckCircle className="w-3 h-3" />
                  Validation Passed
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default ReasoningTimeline;
