/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { 
  Database, 
  Activity, 
  AlertTriangle, 
  TrendingUp, 
  Zap, 
  ShieldCheck, 
  Play,
  Pause,
  Server,
  Network,
  Cpu,
  Info
} from 'lucide-react';
import { User, DashboardMetrics, Anomaly, MetricType, StreamEvent, SystemSettings } from '../types.js';

interface DashboardViewProps {
  token: string;
  currentUser: User;
  stats: DashboardMetrics;
  streamRunning: boolean;
  onToggleStream: () => void;
  recentAnomalies: Anomaly[];
  events: StreamEvent[];
  onInjectAnomaly: (metricType: MetricType, type: 'spike' | 'drop' | 'drift' | 'burst', multiplier: number) => void;
  settings: SystemSettings;
  onRegisterMetric: (metricType: MetricType, value: number) => Promise<{ success: boolean; error?: string }>;
  onUpdateSimulationSettings: (speed: number, sensitivity: number, manualModeOnly?: boolean) => void;
}

export default function DashboardView({
  currentUser,
  stats,
  streamRunning,
  onToggleStream,
  recentAnomalies,
  events,
  onInjectAnomaly,
  settings,
  onRegisterMetric,
  onUpdateSimulationSettings
}: DashboardViewProps) {
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('cpu_usage');
  const [selectedInjectType, setSelectedInjectType] = useState<'spike' | 'drop' | 'drift' | 'burst'>('spike');
  const [multiplier, setMultiplier] = useState<number>(5);
  const [injectingStatus, setInjectingStatus] = useState<string>('');

  // Manual Ingress registration form states
  const [registerMetric, setRegisterMetric] = useState<MetricType>('cpu_usage');
  const [registerValue, setRegisterValue] = useState<string>('');
  const [registerStatus, setRegisterStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const metricsInfo: Record<MetricType, { name: string; icon: any; color: string; unit: string }> = {
    api_latency: { name: 'Response Latency', icon: Activity, color: 'text-indigo-600 bg-indigo-50 border-indigo-100', unit: 'ms' },
    auth_failures: { name: 'Login Failure Rates', icon: ShieldCheck, color: 'text-amber-600 bg-amber-50 border-amber-100', unit: '/s' },
    db_connections: { name: 'DB Connection Latency', icon: Database, color: 'text-blue-600 bg-blue-50 border-blue-100', unit: '%' },
    cpu_usage: { name: 'Host Server CPU', icon: Cpu, color: 'text-emerald-600 bg-emerald-50 border-emerald-100', unit: '%' },
    payment_volume: { name: 'API Request Rate', icon: TrendingUp, color: 'text-rose-600 bg-rose-50 border-rose-100', unit: 'rps' }
  };

  const handleInject = () => {
    if (currentUser.role === 'Viewer') {
      alert('Access Denied: Viewers do not have permission to trigger simulation stress.');
      return;
    }
    setInjectingStatus('Triggering simulated load spikes...');
    onInjectAnomaly(selectedMetric, selectedInjectType, multiplier);
    setTimeout(() => {
      setInjectingStatus(`Successfully introduced simulated ${selectedInjectType.toUpperCase()} on ${metricsInfo[selectedMetric].name}.`);
      setTimeout(() => setInjectingStatus(''), 4000);
    }, 800);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser.role === 'Viewer') {
      setRegisterStatus({ type: 'error', message: 'Viewer accounts are restricted to view-only mode.' });
      return;
    }

    const val = parseFloat(registerValue);
    if (isNaN(val) || val < 0) {
      setRegisterStatus({ type: 'error', message: 'Please input a valid positive telemetry number.' });
      return;
    }

    setIsSubmitting(true);
    setRegisterStatus(null);
    try {
      const res = await onRegisterMetric(registerMetric, val);
      if (res.success) {
        setRegisterStatus({ type: 'success', message: `Telemetry registered successfully on ${metricsInfo[registerMetric].name} with value: ${val}` });
        setRegisterValue('');
      } else {
        setRegisterStatus({ type: 'error', message: res.error || 'Failed to submit.' });
      }
    } catch {
      setRegisterStatus({ type: 'error', message: 'Failed to communicate with secure telemetry servers.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Build high-performance SVG path for events timeline widget
  const getTimelinePoints = () => {
    const sorted = [...events].slice(-50); // Get latest 50 events
    if (sorted.length < 2) return '';

    const width = 600;
    const height = 110;
    const maxVal = Math.max(...sorted.map(e => e.value), 10);
    const minVal = Math.min(...sorted.map(e => e.value), 0);
    const range = maxVal - minVal || 1;

    return sorted.map((e, index) => {
      const x = (index / (sorted.length - 1)) * (width - 20) + 10;
      const y = height - ((e.value - minVal) / range) * (height - 20) - 10;
      return `${x},${y}`;
    }).join(' ');
  };

  // Severity Distribution Calculator
  const getSeverityCounts = () => {
    const counts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    recentAnomalies.forEach(a => {
      if (a.severity in counts) {
        counts[a.severity as keyof typeof counts]++;
      }
    });
    return counts;
  };

  const severityCounts = getSeverityCounts();
  const totalAnomaliesCount = recentAnomalies.length;

  return (
    <div id="dashboard-view-container" className="flex-1 p-6 overflow-y-auto bg-[#f8fafc] font-sans space-y-6">
      
      {/* Title section with quick controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800 flex items-center space-x-2">
            <span>Operational Telemetry Center</span>
            <span className="text-[11px] bg-indigo-50 text-indigo-700 border border-indigo-150 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
              {settings.manualModeOnly ? 'Manual Input Mode' : 'Simulating Thread'}
            </span>
          </h2>
          <p className="text-xs text-slate-550 mt-1 leading-relaxed">
            Real-time analytics and telemetry tracking of live operational performance metrics, baselines, and safety thresholds.
          </p>
        </div>

        {/* Real-Time Control Node */}
        <div className="flex items-center space-x-3">
          {/* Work Mode Switcher */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg border border-gray-200 shadow-xs">
            <button
              id="btn-mode-manual"
              type="button"
              disabled={currentUser.role === 'Viewer'}
              onClick={() => onUpdateSimulationSettings(settings.streamIntervalMs, settings.detectionSensitiveZScore, true)}
              className={`px-3 py-1.5 text-[11px] font-bold rounded-md duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                settings.manualModeOnly 
                  ? 'bg-indigo-650 text-white shadow-xs' 
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              Manual Input Only
            </button>
            <button
              id="btn-mode-auto"
              type="button"
              disabled={currentUser.role === 'Viewer'}
              onClick={() => onUpdateSimulationSettings(settings.streamIntervalMs, settings.detectionSensitiveZScore, false)}
              className={`px-3 py-1.5 text-[11px] font-bold rounded-md duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                !settings.manualModeOnly 
                  ? 'bg-indigo-650 text-white shadow-xs' 
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              Automated Simulation
            </button>
          </div>

          <div className={`flex items-center bg-white border rounded-lg shadow-sm transition-all duration-200 hover:border-gray-300 h-10 ${
            settings.manualModeOnly 
              ? 'px-4 py-1.5 border-indigo-200 bg-indigo-50/20' 
              : 'p-1.5 pl-3.5 space-x-3 border-gray-200'
          }`}>
            <div className={`flex flex-col justify-center ${settings.manualModeOnly ? 'items-center text-center' : 'items-end text-right'}`}>
              <span className="text-[8px] text-slate-400 font-bold tracking-wider leading-none mb-1 uppercase">
                TELEMETRY LOOP
              </span>
              <span className={`text-[10px] font-extrabold leading-tight flex items-center space-x-1.5 ${
                streamRunning && !settings.manualModeOnly ? 'text-emerald-600' : 'text-amber-600'
              }`}>
                <span className="relative flex h-1.5 w-1.5 shrink-0">
                  {streamRunning && !settings.manualModeOnly ? (
                    <>
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                    </>
                  ) : (
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                  )}
                </span>
                <span>
                  {streamRunning && !settings.manualModeOnly ? 'RUNNING (ACTIVE)' : 'HALTED (PAUSED)'}
                </span>
              </span>
            </div>
            {!settings.manualModeOnly && (
              <div className="h-5 w-px bg-slate-200" />
            )}
            {!settings.manualModeOnly && (
              <button
                id="btn-stream-toggle"
                onClick={onToggleStream}
                disabled={currentUser.role === 'Viewer'}
                className={`cursor-pointer w-7 h-7 rounded duration-150 flex items-center justify-center ${
                  streamRunning 
                    ? 'bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100' 
                    : 'bg-indigo-600 border border-indigo-750 hover:bg-indigo-700 text-white shadow-sm'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                title={currentUser.role === 'Viewer' ? 'Viewer access restricted' : ''}
              >
                {streamRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 pointer-events-none" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Active Work Mode Informational Alert */}
      {settings.manualModeOnly ? (
        <div className="bg-indigo-50 border border-indigo-150 rounded-xl p-4 flex items-start space-x-3 text-xs text-indigo-900 shadow-xs animate-none">
          <Info className="w-4 h-4 text-indigo-650 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <h4 className="font-extrabold uppercase tracking-wide">Manual Data Registration Active</h4>
            <p className="text-indigo-700 leading-relaxed">
              Continuous simulated data loops are stopped. Graphs, metrics cards, and alarms only advance when you explicitly key-in and register performance data points. Use the <strong>Manual Telemetry Registration Node</strong> form below to submit data.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-150 rounded-xl p-4 flex items-start space-x-3 text-xs text-yellow-900 shadow-xs animate-none">
          <Info className="w-4 h-4 text-yellow-650 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <h4 className="font-extrabold uppercase tracking-wide">Automated Simulation Stream Working</h4>
            <p className="text-yellow-750 leading-relaxed">
              The dashboard is updating dynamically on a 1-second interval with random statistical fluctuations. Choose <strong>Manual Input Only</strong> at the top right to completely freeze automated ticks and manage data manually.
            </p>
          </div>
        </div>
      )}

      {/* Primary KPI Grid Dashboard Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1 */}
        <div id="widget-total-processed" className="bg-white border border-gray-200 p-4 rounded-xl shadow-xs flex flex-col justify-between h-28 relative">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">Telemetry Packages</p>
              <h4 className="text-2xl font-bold text-slate-800">{stats.totalEventsProcessed}</h4>
            </div>
            <div className="p-2 rounded bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center space-x-1.5 text-[11px] text-emerald-600 border-t border-gray-100 pt-2 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Package Rate: {settings.manualModeOnly ? '0 (Stopped)' : `${stats.ingestionRate} metrics/sec`}</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div id="widget-active-streams" className="bg-white border border-gray-200 p-4 rounded-xl shadow-xs flex flex-col justify-between h-28 relative">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">Monitored Services</p>
              <h4 className="text-2xl font-bold text-slate-800">{stats.activeStreamsCount}</h4>
            </div>
            <div className="p-2 rounded bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Network className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center space-x-1.5 text-[11px] text-indigo-650 border-t border-gray-100 pt-2 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
            <span>Metrics processes OK</span>
          </div>
        </div>

        {/* KPI 3 */}
        <div id="widget-detected-anomalies" className="bg-white border border-gray-200 p-4 rounded-xl shadow-xs flex flex-col justify-between h-28 relative">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">Active Incidents</p>
              <h4 className="text-2xl font-bold text-rose-600">{stats.detectedAnomaliesCount}</h4>
            </div>
            <div className="p-2 rounded bg-rose-50 text-rose-650 border border-rose-100">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            </div>
          </div>
          <div className="flex items-center space-x-1.5 text-[11px] text-rose-500 border-t border-gray-100 pt-2 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
            <span>Unresolved Flags: {stats.activeAlertsCount} instances</span>
          </div>
        </div>

        {/* KPI 4 */}
        <div id="widget-avg-confidence" className="bg-white border border-gray-200 p-4 rounded-xl shadow-xs flex flex-col justify-between h-28 relative">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">Average Alarm confidence</p>
              <h4 className="text-2xl font-bold text-amber-600">{stats.avgConfidence}%</h4>
            </div>
            <div className="p-2 rounded bg-amber-50 text-amber-600 border border-amber-100">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center space-x-1.5 text-[11px] text-amber-600 border-t border-gray-100 pt-2 font-medium">
            <span>Threshold Coefficient: {settings.detectionSensitiveZScore}z (Std Dev)</span>
          </div>
        </div>

      </div>

      {/* Main Panel grid: Timeline & Severity Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Event Timeline (Custom Line Path SVG Widget) */}
        <div id="widget-event-timeline" className="lg:col-span-2 bg-white border border-gray-200 p-5 rounded-xl shadow-xs flex flex-col justify-between h-72">
          <div className="flex justify-between items-center border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-xs font-bold text-slate-700 uppercase">Real-Time Performance Feed</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Aggregated latest 50 metric incoming events line visualization.</p>
            </div>
            <span className="text-[10px] bg-slate-50 px-2.5 py-1 border border-gray-200 text-indigo-650 font-semibold rounded">
              Standardized Scale
            </span>
          </div>

          {/* Canvas SVG representing interactive timeline */}
          <div className="flex-1 py-4 flex items-center justify-center relative bg-slate-50/50 rounded-lg my-2 border border-dashed border-gray-150">
            {events.length > 1 ? (
              <svg className="w-full h-full max-h-[140px] px-2" viewBox="0 0 600 110" preserveAspectRatio="none">
                {/* Background Grid Horizontal Lines */}
                <line x1="0" y1="18" x2="600" y2="18" stroke="#e2e8f0" strokeWidth="0.75" strokeDasharray="4 2" />
                <line x1="0" y1="45" x2="600" y2="45" stroke="#e2e8f0" strokeWidth="0.75" strokeDasharray="4 2" />
                <line x1="0" y1="72" x2="600" y2="72" stroke="#e2e8f0" strokeWidth="0.75" strokeDasharray="4 2" />
                <line x1="0" y1="100" x2="600" y2="100" stroke="#cbd5e1" strokeWidth="1" />

                {/* Line Path */}
                <polyline
                  fill="none"
                  stroke="#4f46e5"
                  strokeWidth="2"
                  points={getTimelinePoints()}
                />
              </svg>
            ) : (
              <div className="text-xs text-slate-400">Awaiting live telemetry streams...</div>
            )}
          </div>

          <div className="flex justify-between items-center text-[10px] text-slate-400 border-t border-gray-100 pt-2.5">
            <span>t -50s</span>
            <span>Continuous live Standard Z-score detection active</span>
            <span>Now</span>
          </div>
        </div>

        {/* Severity Distribution Donut Widget */}
        <div id="widget-severity-distribution" className="bg-white border border-gray-200 p-5 rounded-xl shadow-xs flex flex-col justify-between h-72">
          <div className="border-b border-gray-100 pb-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase">Alert Severity Distribution</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Summary of historical alerts triggered by priority level.</p>
          </div>

          <div className="flex-1 py-2 flex items-center justify-around gap-2">
            
            {/* Visual breakdown bars representation */}
            <div className="space-y-2 flex-1 max-w-[140px]">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-red-750 font-bold">Critical</span>
                <span className="text-slate-800 font-bold">{severityCounts.Critical}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded overflow-hidden">
                <div className="bg-red-500 h-full duration-500" style={{ width: `${totalAnomaliesCount > 0 ? (severityCounts.Critical / totalAnomaliesCount) * 100 : 0}%` }}></div>
              </div>

              <div className="flex justify-between items-center text-[11px]">
                <span className="text-orange-750 font-bold">High Priority</span>
                <span className="text-slate-800 font-bold">{severityCounts.High}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded overflow-hidden">
                <div className="bg-orange-500 h-full duration-500" style={{ width: `${totalAnomaliesCount > 0 ? (severityCounts.High / totalAnomaliesCount) * 100 : 0}%` }}></div>
              </div>

              <div className="flex justify-between items-center text-[11px]">
                <span className="text-amber-750 font-bold">Medium</span>
                <span className="text-slate-800 font-bold">{severityCounts.Medium}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded overflow-hidden">
                <div className="bg-amber-500 h-full duration-500" style={{ width: `${totalAnomaliesCount > 0 ? (severityCounts.Medium / totalAnomaliesCount) * 105 : 0}%` }}></div>
              </div>

              <div className="flex justify-between items-center text-[11px]">
                <span className="text-sky-750 font-bold font-sans">Low Priority</span>
                <span className="text-slate-800 font-bold">{severityCounts.Low}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded overflow-hidden">
                <div className="bg-sky-550 h-full duration-500" style={{ width: `${totalAnomaliesCount > 0 ? (severityCounts.Low / totalAnomaliesCount) * 100 : 0}%` }}></div>
              </div>
            </div>

            {/* Circular summary container */}
            <div className="w-24 h-24 rounded-full border-4 border-slate-50 flex flex-col items-center justify-center bg-slate-50 relative">
              <span className="text-3xl font-extrabold text-slate-800">{totalAnomaliesCount}</span>
              <span className="text-[9px] text-slate-400 font-bold tracking-widest mt-0.5">ALARMS</span>
            </div>

          </div>

          <p className="text-[10px] text-slate-400 text-center border-t border-gray-100 pt-2">
            Historical incident alarm indices
          </p>
        </div>

      </div>

      {/* Playability & Simulated Anomaly Injector Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Dynamic Widget showing either the manual entry form or the stress cockpit based on selected work type */}
        {settings.manualModeOnly ? (
          
          /* PRIMARY FORM: Manual Telemetry Packet Entry Node */
          <div id="manual-telemetry-packet-entry" className="lg:col-span-2 bg-white border border-gray-200 p-5 rounded-xl shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-indigo-755 uppercase flex items-center space-x-2">
                <Network className="w-4 h-4 text-indigo-650" />
                <span>Manual Telemetry Registration Node</span>
              </h3>
              <p className="text-xs text-slate-550 mt-1 leading-relaxed">
                Submit raw operational performance measurements manually. Telemetry is saved instantly, standard deviation models are computed dynamically, and alerts are fired if the value triggers anomalous bounds.
              </p>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-4 my-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Metric Channel Selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">1. Select Measurement Link</label>
                  <select
                    id="select-register-metric"
                    value={registerMetric}
                    onChange={(e) => setRegisterMetric(e.target.value as MetricType)}
                    className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans cursor-pointer h-10 shadow-xs"
                  >
                    {Object.entries(metricsInfo).map(([key, info]) => (
                      <option key={key} value={key}>{info.name} ({info.unit})</option>
                    ))}
                  </select>
                </div>

                {/* Metric Value Input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">
                    2. Input Value ({metricsInfo[registerMetric].unit})
                  </label>
                  <input
                    id="input-register-value"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={registerValue}
                    onChange={(e) => setRegisterValue(e.target.value)}
                    placeholder={`e.g. ${registerMetric === 'cpu_usage' ? '35' : registerMetric === 'api_latency' ? '85' : '15'}`}
                    className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono h-10 shadow-xs placeholder-slate-300"
                  />
                </div>

              </div>

              <div className="flex items-center justify-between gap-4 border-t border-gray-100 pt-3.5 flex-wrap">
                <div>
                  {registerStatus ? (
                    <span className={`text-xs font-bold ${
                      registerStatus.type === 'success' ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                      {registerStatus.message}
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400 font-medium">
                      Alert Trigger Limit: Z-score &gt; {settings.detectionSensitiveZScore} std dev (Baseline evaluates dynamically).
                    </span>
                  )}
                </div>
                <button
                  id="btn-register-submit"
                  type="submit"
                  disabled={isSubmitting || currentUser.role === 'Viewer'}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded duration-150 shadow-xs cursor-pointer uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Registering...' : 'Register Metric Value'}
                </button>
              </div>

            </form>
          </div>

        ) : (
          
          /* AUTOMATED: Stream Simulator Cockpit widget */
          <div id="simulated-stress-injector" className="lg:col-span-2 bg-white border border-gray-200 p-5 rounded-xl shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-700 uppercase flex items-center space-x-2">
                <Zap className="w-4 h-4 text-indigo-650 animate-pulse" />
                <span>Simulated Load Injector (Control Interface)</span>
              </h3>
              <p className="text-xs text-slate-550 mt-1 leading-relaxed">
                Force-inject temporary load spikes or system blackouts onto local telemetry metrics. Use this during testing to verify how alert models, notification centers, and automated anomaly detectors react under heavy stress.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4">
              
              {/* Thread selector */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase block">1. Target Performance Thread</label>
                <select
                  id="select-inject-metric"
                  value={selectedMetric}
                  onChange={(e) => setSelectedMetric(e.target.value as MetricType)}
                  className="w-full bg-white border border-gray-200 rounded p-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans cursor-pointer"
                >
                  {Object.entries(metricsInfo).map(([key, info]) => (
                    <option key={key} value={key}>{info.name} ({info.unit})</option>
                  ))}
                </select>
              </div>

              {/* Injection type */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase block">2. Stress Pattern</label>
                <select
                  id="select-inject-type"
                  value={selectedInjectType}
                  onChange={(e) => setSelectedInjectType(e.target.value as any)}
                  className="w-full bg-white border border-gray-200 rounded p-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans cursor-pointer"
                >
                  <option value="spike">Sudden Load Spike (Z-Score &gt; 4.0)</option>
                  <option value="drop">System Connection Dropout (Zero Value)</option>
                  <option value="drift">Steady Drift (Upward scaling trend)</option>
                  <option value="burst">High Volatility Noise Burst (Unstable Values)</option>
                </select>
              </div>

              {/* Severity multiplier */}
              <div className="space-y-1.5 col-span-1 sm:col-span-2">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-bold text-slate-550 uppercase">3. Stress Intensity Multiplier: {multiplier}x</label>
                  <span className="text-[10px] text-amber-605 font-bold">Elevates metrics beyond standard deviation bounds</span>
                </div>
                <input
                  id="range-inject-multiplier"
                  type="range"
                  min="2.5"
                  max="8.0"
                  step="0.5"
                  value={multiplier}
                  onChange={(e) => setMultiplier(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600 bg-gray-100 h-1 rounded cursor-pointer mt-1"
                />
              </div>

            </div>

            <div className="flex items-center justify-between gap-4 border-t border-gray-100 pt-3 flex-wrap">
              <span className="text-xs text-amber-650 font-medium">
                {injectingStatus || 'Telemetry metrics loop stable.'}
              </span>
              <button
                id="btn-trigger-inject"
                onClick={handleInject}
                disabled={currentUser.role === 'Viewer'}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded duration-250 shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed uppercase"
              >
                Trigger System Stress
              </button>
            </div>
          </div>
        )}

        {/* Microservices Board widget */}
        <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-xs flex flex-col justify-between">
          <div className="border-b border-gray-100 pb-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase">System Service Status</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Status directories of connected operational runtimes.</p>
          </div>

          <div className="space-y-3 flex-1 py-4 flex flex-col justify-center">
            
            <div className="flex justify-between items-center bg-slate-50 p-2.5 border border-gray-150 rounded-md">
              <div className="flex items-center space-x-2 text-xs text-slate-600 font-sans">
                <Server className="w-3.5 h-3.5 text-slate-400" />
                <span>api-gateway-service</span>
              </div>
              <span className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[10px] text-slate-400 font-bold block">ACTIVE</span>
              </span>
            </div>

            <div className="flex justify-between items-center bg-slate-50 p-2.5 border border-gray-150 rounded-md">
              <div className="flex items-center space-x-2 text-xs text-slate-600 font-sans">
                <Server className="w-3.5 h-3.5 text-slate-400" />
                <span>database-pool-manager</span>
              </div>
              <span className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[10px] text-slate-400 font-bold block">ACTIVE</span>
              </span>
            </div>

            <div className="flex justify-between items-center bg-slate-50 p-2.5 border border-gray-150 rounded-md">
              <div className="flex items-center space-x-2 text-xs text-slate-600 font-sans">
                <Server className="w-3.5 h-3.5 text-slate-400" />
                <span>oauth-authentication-bridge</span>
              </div>
              <span className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[10px] text-slate-400 font-bold block">ACTIVE</span>
              </span>
            </div>

          </div>

          <div className="bg-slate-50 border border-gray-150 p-2 rounded text-center text-[10px] text-indigo-650 font-bold">
            Health Check: Consolidated OK
          </div>
        </div>

      </div>

    </div>
  );
}
export type { MetricType };
