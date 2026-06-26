/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { 
  AlertOctagon, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  Brain, 
  MessageSquare, 
  Activity,
  Cpu,
  Database,
  ShieldCheck,
  TrendingUp,
  X
} from 'lucide-react';
import { Anomaly, UserRole, MetricType, AnomalyStatus } from '../types.js';
import { secureFetch } from '../utils/api.js';

interface ExplorerProps {
  currentUser: { name: string; role: UserRole };
  anomalies: Anomaly[];
  onUpdateStatus: (id: string, status: AnomalyStatus, note: string) => void;
  geminiApiKeyConfigured: boolean;
}

export default function ExplorerView({
  currentUser,
  anomalies,
  onUpdateStatus,
  geminiApiKeyConfigured
}: ExplorerProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<MetricType | 'all'>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Modal / Drawer state for AI analysis
  const [aiReportModelOpen, setAiReportModelOpen] = useState(false);
  const [targetAnomId, setTargetAnomId] = useState<string>('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiText, setAiText] = useState('');

  // Troubleshooting form note state
  const [customNote, setCustomNote] = useState('');
  const [revisedStatus, setRevisedStatus] = useState<AnomalyStatus>('Active');

  const metricsInfo: Record<MetricType, { name: string; icon: any; color: string; unit: string }> = {
    api_latency: { name: 'Response Latency', icon: Activity, color: 'text-indigo-600', unit: 'ms' },
    auth_failures: { name: 'Login Failures', icon: ShieldCheck, color: 'text-orange-650', unit: '/s' },
    db_connections: { name: 'DB Connection Load', icon: Database, color: 'text-blue-600', unit: '%' },
    cpu_usage: { name: 'Host Server CPU', icon: Cpu, color: 'text-emerald-600', unit: '%' },
    payment_volume: { name: 'Request Velocity', icon: TrendingUp, color: 'text-rose-600', unit: 'rps' }
  };

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'text-red-700 bg-red-50 border-red-200';
      case 'High': return 'text-orange-700 bg-orange-50 border-orange-200';
      case 'Medium': return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'Low': return 'text-blue-700 bg-blue-50 border-blue-200';
      default: return 'text-slate-700 bg-slate-50 border-slate-200';
    }
  };

  const getStatusColor = (status: AnomalyStatus) => {
    switch (status) {
      case 'Active': return 'bg-red-50 text-red-700 border-red-200';
      case 'Investigating': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Resolved': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-50 text-slate-500 border-gray-250';
    }
  };

  // Launch Gemini to Analyze specific anomaly
  const triggerAiExplain = async (anom: Anomaly) => {
    setAiLoading(true);
    setAiText('');
    setTargetAnomId(anom.id);
    setAiReportModelOpen(true);

    try {
      const token = localStorage.getItem('anomaly_secure_token');
      const response = await secureFetch('/api/ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          detailedAnomaly: anom
        })
      });

      const data = await response.json();
      setAiText(data.summary || 'An analysis could not be prepared.');
    } catch (e: any) {
      setAiText(`Failed to generate AI forensics: ${e.message}`);
    } finally {
      setAiLoading(false);
    }
  };

  // Action status revisions (Save note + change state)
  const handleSubmitRevision = (id: string) => {
    if (currentUser.role === 'Viewer') {
      alert('Access Denied: Viewers do not have permission to modify trace logs.');
      return;
    }
    onUpdateStatus(id, revisedStatus, customNote);
    setCustomNote('');
    setExpandedId(null);
  };

  // Filter List anomalies
  const filteredAnoms = anomalies.filter(a => {
    const matchesMetric = selectedMetric === 'all' || a.metricType === selectedMetric;
    const matchesSeverity = selectedSeverity === 'all' || a.severity === selectedSeverity;
    const matchesStatus = selectedStatus === 'all' || a.status === selectedStatus;

    return matchesMetric && matchesSeverity && matchesStatus;
  });

  return (
    <div id="explorer-view-container" className="flex-1 p-6 overflow-y-auto bg-[#f8fafc] font-sans flex flex-col space-y-6">
      
      {/* Title */}
      <div className="border-b border-gray-200 pb-5">
        <h2 className="text-xl font-bold tracking-tight text-slate-800 flex items-center space-x-2">
          <span>Incident & Deviation Library</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Explore complete historical records of threshold deviations, track baseline changes, and trigger Gemini Copilot explanations.
        </p>
      </div>

      {/* Advanced filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#f1f5f9]/60 p-4 rounded-xl border border-gray-200 shadow-sm">
        
        {/* Metric selection thread */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">Measurement Channel</label>
          <select
            id="select-explorer-metric"
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value as any)}
            className="w-full bg-white border border-gray-200 p-2 text-xs text-slate-700 font-sans rounded cursor-pointer"
          >
            <option value="all">ALL METRIC CHANNELS</option>
            {Object.entries(metricsInfo).map(([key, info]) => (
              <option key={key} value={key}>{info.name}</option>
            ))}
          </select>
        </div>

        {/* Severity selection */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">Priority Level</label>
          <select
            id="select-explorer-severity"
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="w-full bg-white border border-gray-200 p-2 text-xs text-slate-700 font-sans rounded cursor-pointer"
          >
            <option value="all">ALL SEVERITY LEVELS</option>
            <option value="Critical">Critical Priorities</option>
            <option value="High">High Priorities</option>
            <option value="Medium">Medium Alarms</option>
            <option value="Low">Low Fluctuations</option>
          </select>
        </div>

        {/* Status filtration */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">Incident State</label>
          <select
            id="select-explorer-status"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full bg-white border border-gray-200 p-2 text-xs text-slate-700 font-sans rounded cursor-pointer"
          >
            <option value="all">ALL STATES</option>
            <option value="Active">Active Alarms</option>
            <option value="Investigating">Under Investigation</option>
            <option value="Resolved">Resolved Issues</option>
            <option value="False Positive">False Positives</option>
          </select>
        </div>

      </div>

      {/* Anomalies List */}
      <div className="space-y-3">
        {filteredAnoms.length > 0 ? (
          filteredAnoms.map((anom) => {
            const isExpanded = expandedId === anom.id;
            const info = metricsInfo[anom.metricType] || { name: anom.metricType, icon: AlertOctagon, color: 'text-slate-400', unit: '' };
            const Icon = info.icon;

            return (
              <div 
                key={anom.id}
                id={`anomaly-card-${anom.id}`}
                className={`bg-white border ${
                  isExpanded ? 'border-indigo-500 bg-indigo-50/5' : 'border-gray-200 hover:border-gray-300'
                } rounded-xl duration-150 overflow-hidden shadow-sm`}
              >
                {/* Header section */}
                <div 
                  onClick={() => {
                    setExpandedId(isExpanded ? null : anom.id);
                    if (!isExpanded) {
                      setRevisedStatus(anom.status);
                    }
                  }}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                >
                  <div className="flex items-center space-x-3.5">
                    <div className="p-2 bg-slate-50 border border-gray-150 rounded-lg">
                      <Icon className={`w-4 h-4 ${info.color}`} />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-slate-800">{info.name} Deviation</span>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${getSeverityBadgeColor(anom.severity)}`}>
                          {anom.severity}
                        </span>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${getStatusColor(anom.status)}`}>
                          {anom.status}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-1 font-medium">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{new Date(anom.timestamp).toLocaleString()}</span>
                        <span>•</span>
                        <span>ID: {anom.id.slice(0, 8)}...</span>
                      </div>
                    </div>
                  </div>

                  {/* Math deviation counters */}
                  <div className="flex items-center space-x-6">
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">MEASURED</p>
                      <h4 className="text-sm font-bold text-slate-800 mt-0.5">
                        {anom.value}
                        <span className="text-[10px] text-slate-500 font-normal ml-0.5">{info.unit}</span>
                      </h4>
                    </div>

                    <div className="text-right hidden md:block font-mono">
                      <p className="text-[10px] text-slate-404 font-bold uppercase tracking-wider font-sans">DEVIATION</p>
                      <h4 className={`text-sm font-bold mt-0.5 ${anom.deviationPercentage > 0 ? 'text-red-650' : 'text-blue-600'}`}>
                        {anom.deviationPercentage > 0 ? `+${anom.deviationPercentage}` : anom.deviationPercentage}%
                      </h4>
                    </div>

                    <div className="p-1.5 rounded hover:bg-slate-50">
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-405" /> : <ChevronDown className="w-4 h-4 text-slate-405" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Detailed view */}
                {isExpanded && (
                  <div className="border-t border-gray-200 bg-slate-50/40 p-5 space-y-6">
                    
                    {/* Deep Statistics Math Matrix */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      
                      <div className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                        <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider block">Expected Normal Baseline</span>
                        <span className="text-sm font-bold text-slate-700 mt-1 block">
                          {anom.expectedValue} <span className="text-[11px] font-normal text-slate-400">{info.unit}</span>
                        </span>
                        <p className="text-[10px] text-slate-400 mt-1 leading-normal">Rolling Mean (μ) calculated from recent normal sliding cycles.</p>
                      </div>

                      <div className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                        <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider block">Standard Deviation Width</span>
                        <span className="text-sm font-bold text-slate-700 mt-1 block">
                          ± {anom.metricsAtTime.std} <span className="text-[11px] font-normal text-slate-400">{info.unit}</span>
                        </span>
                        <p className="text-[10px] text-slate-400 mt-1 leading-normal">Dispersion Scale (σ) value within monitored telemetry bounds.</p>
                      </div>

                      <div className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                        <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider block">Z-Score Deviation Value</span>
                        <span className="text-sm font-bold text-red-650 mt-1 block">
                          {anom.metricsAtTime.zScore} σ-units
                        </span>
                        <p className="text-[10px] text-slate-400 mt-1 leading-normal">Z-score deviations. Values exceeding 2.8z trigger security Alarms.</p>
                      </div>

                    </div>

                    {/* Operational controls and timeline log */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                      
                      {/* Interactive form to revise status */}
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold tracking-wider text-slate-800 uppercase border-b border-gray-200 pb-1.5 flex items-center space-x-1.5">
                          <MessageSquare className="w-4 h-4 text-indigo-650" />
                          <span>Incident Annotation & Diagnostics</span>
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-500 uppercase">Revise Status</label>
                            <select
                              id={`select-status-${anom.id}`}
                              value={revisedStatus}
                              onChange={(e) => setRevisedStatus(e.target.value as AnomalyStatus)}
                              disabled={currentUser.role === 'Viewer'}
                              className="w-full bg-white border border-gray-200 p-2 text-xs text-slate-705 font-sans rounded focus:ring-1 focus:ring-indigo-500 select-none cursor-pointer"
                            >
                              <option value="Active">Active Alarm</option>
                              <option value="Investigating">Under Investigation</option>
                              <option value="Resolved">Resolved Issue</option>
                              <option value="False Positive">False Positive</option>
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-500 uppercase">Lead Analyst Assigned</label>
                            <span className="w-full bg-slate-100 border border-gray-200 px-3 py-2 text-xs text-slate-500 rounded block truncate font-medium">
                              @{currentUser.name.toLowerCase()} ({currentUser.role})
                            </span>
                          </div>
                        </div>

                        {/* Mitigation description note */}
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-550 uppercase">Analysis / SOP Action notes</label>
                          <textarea
                             id={`textarea-notes-${anom.id}`}
                            value={customNote}
                            onChange={(e) => setCustomNote(e.target.value)}
                            disabled={currentUser.role === 'Viewer'}
                            placeholder="Describe root cause find, system corrections, or compliance protocols..."
                            className="w-full h-16 bg-white border border-gray-250 p-2 text-xs text-slate-700 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded font-sans"
                          />
                        </div>

                        <div className="flex justify-between items-center flex-wrap pt-1 gap-2">
                          
                          {/* Brain Gemini trigger button */}
                          <button
                            id={`btn-gemini-analyze-${anom.id}`}
                            onClick={() => triggerAiExplain(anom)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 py-2 rounded-lg duration-200 shadow-sm flex items-center space-x-1.5 cursor-pointer uppercase"
                          >
                            <Brain className="w-4 h-4 text-white" />
                            <span>Run AI Trace Analysis</span>
                          </button>

                          <button
                            id={`btn-submit-revision-${anom.id}`}
                            onClick={() => handleSubmitRevision(anom.id)}
                            disabled={currentUser.role === 'Viewer'}
                            className="bg-white hover:bg-slate-50 text-slate-700 border border-gray-200 font-semibold text-xs px-4 py-2 rounded-lg duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed uppercase shadow-sm"
                          >
                            Save incident log
                          </button>
                        </div>
                      </div>

                      {/* Notes Logs chronological panel */}
                      <div className="space-y-3 flex flex-col justify-between">
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold tracking-wider text-slate-800 uppercase border-b border-gray-200 pb-1.5 flex items-center space-x-1.5">
                            <Clock className="w-4 h-4 text-emerald-600" />
                            <span>Audit Annotation Log</span>
                          </h4>
                          <div className="space-y-2 overflow-y-auto max-h-[160px] pr-1 scrollbar-thin">
                            {anom.notes.map((note, index) => (
                              <div key={index} className="text-xs text-slate-600 bg-white p-2 rounded-lg border border-gray-150 shadow-sm leading-normal">
                                {note}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="p-2.5 rounded bg-slate-50 border border-gray-150 flex justify-between items-center text-[11px] font-bold text-slate-450 uppercase">
                          <span>Alarm confidence: {anom.confidenceScore}%</span>
                          <span>deviation score: {anom.metricsAtTime.zScore}z</span>
                        </div>
                      </div>

                    </div>

                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="bg-white border border-gray-200 p-10 rounded-xl text-center text-slate-400 text-xs font-semibold shadow-sm">
            No incident records found. Modify your metric filter selections above.
          </div>
        )}
      </div>

      {/* AI Explain Modal */}
      {aiReportModelOpen && (
        <div id="ai-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm pr-2">
          <div id="ai-modal-box" className="w-full max-w-2xl bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col max-h-[80vh] shadow-xl animate-in duration-200">
            
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2 text-indigo-600">
                <Brain className="w-5 h-5 text-indigo-600 font-semibold" />
                <h3 className="text-xs font-bold tracking-wider uppercase">Forensic AI incident briefing</h3>
              </div>
              <button 
                onClick={() => setAiReportModelOpen(false)}
                className="p-1.5 rounded hover:bg-gray-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Markdown Text Body */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4 text-xs select-text">
              {aiLoading ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-3">
                  <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin"></div>
                  <p className="text-xs text-indigo-650 font-bold tracking-wider animate-pulse uppercase">Retrieving forensic analysis logs...</p>
                </div>
              ) : (
                <div className="text-slate-700 leading-relaxed whitespace-pre-wrap select-text markdown-body font-sans pr-2">
                  {aiText}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3.5 border-t border-gray-200 bg-slate-50 flex justify-between items-center text-[10px] font-bold text-slate-400">
              <span>Model Context: {geminiApiKeyConfigured ? 'Gemini 3.5 Active via Proxy' : 'Offline Heuristic Engine default'}</span>
              <button 
                onClick={() => setAiReportModelOpen(false)}
                className="px-3.5 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-lg duration-150 cursor-pointer uppercase text-[10px] font-semibold shadow-sm"
              >
                Close briefing
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
export type { AnomalyStatus };
