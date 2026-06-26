/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Brain, FileText, Sparkles } from 'lucide-react';
import { User, Anomaly, StreamEvent } from '../types.js';
import { secureFetch } from '../utils/api.js';

interface AnalyticsProps {
  currentUser: User;
  anomalies: Anomaly[];
  events: StreamEvent[];
  geminiApiKeyConfigured: boolean;
}

export default function AnalyticsView({
  currentUser,
  anomalies,
  events
}: AnalyticsProps) {
  const [reportText, setReportText] = useState<string>('');
  const [generating, setGenerating] = useState<boolean>(false);

  const criticalCount = anomalies.filter(a => a.severity === 'Critical').length;
  const highCount = anomalies.filter(a => a.severity === 'High').length;

  const handleGenerateReport = async () => {
    setGenerating(true);
    setReportText('');

    try {
      const token = localStorage.getItem('anomaly_secure_token');
      const response = await secureFetch('/api/ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          summaryType: 'overall_report'
        })
      });

      const data = await response.json();
      setReportText(data.summary || 'A summary report could not be generated at this moment.');
    } catch (e: any) {
      setReportText(`Operational failure during AI report compilation: ${e.message}`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div id="analytics-view-container" className="flex-1 p-6 overflow-y-auto bg-[#f8fafc] font-sans flex flex-col space-y-6">
      
      {/* Title */}
      <div className="border-b border-gray-200 pb-5">
        <h2 className="text-xl font-bold tracking-tight text-slate-800 flex items-center space-x-2">
          <span>AI Telemetry Analytics</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Generate comprehensive service-wide audit reports analyzing baseline metrics and security anomalies via our server-side secure Gemini integration.
        </p>
      </div>

      {/* Advanced performance KPI cards row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
          <span className="text-[11px] text-slate-450 font-bold uppercase tracking-wider block">Anomaly Density Ratio</span>
          <div className="flex items-baseline space-x-1.5 mt-2">
            <span className="text-2xl font-bold text-red-600">
              {events.length > 0 ? ((anomalies.length / events.length) * 100).toFixed(2) : '0.00'}%
            </span>
            <span className="text-xs text-slate-500">of total metrics flagged</span>
          </div>
          <div className="w-full bg-gray-150 h-2 rounded mt-3.5">
            <div 
              className="bg-red-500 h-full duration-500" 
              style={{ width: `${events.length > 0 ? (anomalies.length / events.length) * 100 : 0}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm col-span-1">
          <span className="text-[11px] text-slate-450 font-bold uppercase tracking-wider block">Average Update Frequency</span>
          <div className="flex items-baseline space-x-1.5 mt-2">
            <span className="text-2xl font-bold text-slate-800">~ 12.5 seconds</span>
            <span className="text-xs text-slate-500">continuous collection</span>
          </div>
          <div className="w-full bg-gray-150 h-2 rounded mt-3.5">
            <div className="bg-indigo-600 h-full" style={{ width: '80%' }}></div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm col-span-1">
          <span className="text-[11px] text-slate-450 font-bold uppercase tracking-wider block">Current Service Threat Level</span>
          <div className="flex items-baseline space-x-1.5 mt-2">
            <span className={`text-2xl font-bold ${criticalCount > 0 ? 'text-red-650 animate-pulse' : 'text-emerald-600'}`}>
              {criticalCount > 0 ? 'CRITICAL RISK' : 'STABLE BOUNDS'}
            </span>
          </div>
          <div className="w-full bg-gray-150 h-2 rounded mt-3.5 flex overflow-hidden">
            <div className="bg-red-500 h-full duration-150" style={{ width: `${criticalCount > 0 ? Math.min(100, criticalCount * 15) : 0}%` }}></div>
            <div className="bg-orange-500 h-full duration-155" style={{ width: `${highCount > 0 ? Math.min(100, highCount * 10) : 0}%` }}></div>
            <div className="bg-emerald-500 h-full flex-1"></div>
          </div>
        </div>

      </div>

      {/* Report generation panel */}
      <div className="bg-white border border-gray-200 p-5 rounded-xl flex flex-col justify-between space-y-4 shadow-sm">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div className="space-y-1">
            <h1 className="text-sm font-bold text-slate-800 uppercase flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Gemini Telemetry Copilot & Audit Report compiler</span>
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed">
              Consolidate system performance deviations, track multi-stream anomalies, and prepare standard operational remediations instantly.
            </p>
          </div>

          <button
            id="btn-generate-ai-report"
            onClick={handleGenerateReport}
            disabled={generating}
            className="px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded duration-200 shadow-sm flex items-center space-x-2 cursor-pointer uppercase select-none active:scale-95 disabled:opacity-40"
          >
            <Brain className="w-4 h-4 text-white" />
            <span>{generating ? 'Compiling Metrics...' : 'Compile System Report'}</span>
          </button>
        </div>

        {/* Output window representing full audit report */}
        <div className="flex-1 min-h-[300px] bg-slate-50/70 border border-gray-200 rounded-lg p-5 flex flex-col justify-start relative select-text">
          {reportText ? (
            <div className="space-y-4 font-sans text-xs text-slate-700 leading-relaxed max-w-none overflow-y-auto max-h-[450px] pr-2 select-text text-left markdown-body">
              {reportText}
            </div>
          ) : generating ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4">
              <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin"></div>
              <p className="text-xs text-indigo-600 font-semibold tracking-wider animate-pulse">Assembling system performance statistics...</p>
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3 text-center px-4">
              <FileText className="w-8 h-8 text-slate-400" />
              <div>
                <p className="text-xs font-bold text-slate-700 uppercase">Report Compiler Standby</p>
                <p className="text-[11px] text-slate-450 mt-1 max-w-md">
                  Click 'Compile System Report' to build standard multi-metric logs, trace recent deviation clusters, and generate structural SOP mitigation workflows.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Report parameters metadata */}
        <div className="flex justify-between items-center text-[10px] text-slate-400 pt-2 flex-wrap gap-2">
          <span>Engine Model: Gemini 3.5 Flash server proxy</span>
          <span>Access Scope: Role permission {currentUser.role} aligned</span>
        </div>

      </div>

    </div>
  );
}
export type { StreamEvent };
