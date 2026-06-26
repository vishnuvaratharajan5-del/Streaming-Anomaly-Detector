/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Play, Pause, Search, SlidersHorizontal, Trash2, Cpu, Database, TrendingUp, Activity, ShieldCheck } from 'lucide-react';
import { User, StreamEvent, MetricType, SystemSettings } from '../types.js';

interface MonitorProps {
  currentUser: User;
  events: StreamEvent[];
  streamRunning: boolean;
  settings: SystemSettings;
  onToggleStream: () => void;
  onUpdateSimulationSettings: (speed: number, sensitivity: number) => void;
  onResetDatabase: () => void;
}

export default function MonitorView({
  currentUser,
  events,
  streamRunning,
  settings,
  onToggleStream,
  onUpdateSimulationSettings,
  onResetDatabase
}: MonitorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMetric, setSelectedMetric] = useState<MetricType | 'all'>('all');
  const [anomaliesOnly, setAnomaliesOnly] = useState(false);
  const [speedInput, setSpeedInput] = useState<number>(settings.streamIntervalMs);
  const [sensitivityInput, setSensitivityInput] = useState<number>(settings.detectionSensitiveZScore);
  const [saveStatus, setSaveStatus] = useState('');

  const metricsInfo: Record<MetricType, { name: string; icon: any; color: string; unit: string }> = {
    api_latency: { name: 'Response Latency', icon: Activity, color: 'text-indigo-600 border-indigo-200 bg-indigo-50', unit: 'ms' },
    auth_failures: { name: 'Login Failures', icon: ShieldCheck, color: 'text-amber-600 border-amber-200 bg-amber-50', unit: '/s' },
    db_connections: { name: 'DB Connection Load', icon: Database, color: 'text-blue-600 border-blue-200 bg-blue-50', unit: '%' },
    cpu_usage: { name: 'Host Server CPU', icon: Cpu, color: 'text-emerald-600 border-emerald-200 bg-emerald-50', unit: '%' },
    payment_volume: { name: 'Request velocity', icon: TrendingUp, color: 'text-rose-600 border-rose-200 bg-rose-50', unit: 'rps' }
  };

  const handleUpdate = () => {
    if (currentUser.role === 'Viewer') {
      alert('Access Denied: Viewers do not have authorization to modify stream constants.');
      return;
    }
    if (speedInput < 100 || speedInput > 10000) {
      alert('Tick rate must fall between 100ms and 10000ms.');
      return;
    }
    if (sensitivityInput < 1.5 || sensitivityInput > 8.0) {
      alert('Z-Score sensitive boundaries must operate between 1.5 and 8.0.');
      return;
    }
    onUpdateSimulationSettings(speedInput, sensitivityInput);
    setSaveStatus('Loop parameters synchronized.');
    setTimeout(() => setSaveStatus(''), 3000);
  };

  const handleWipe = () => {
    if (currentUser.role !== 'Admin') {
      alert('Forbidden: Master resets are restricted exclusively to administrators.');
      return;
    }
    if (confirm('Are you sure you want to clear historical log telemetry? This action resets the monitoring buffer.')) {
      onResetDatabase();
    }
  };

  // Filter Event Logs list
  const filteredEvents = events.filter(e => {
    const matchesSearch = e.metricType.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          e.value.toString().includes(searchTerm) ||
                          (e.anomalyScore && e.anomalyScore.toString().includes(searchTerm));
    const matchesMetric = selectedMetric === 'all' || e.metricType === selectedMetric;
    const matchesAnomaly = !anomaliesOnly || e.isAnomaly;

    return matchesSearch && matchesMetric && matchesAnomaly;
  });

  return (
    <div id="monitor-view-container" className="flex-1 p-6 overflow-y-auto bg-[#f8fafc] font-sans flex flex-col space-y-6">
      
      {/* Title section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800 flex items-center space-x-2.5">
            <span>Continuous Stream Monitor</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Standard historical telemetry log table. Inspect baseline drifts, package payloads, and continuous alarms.
          </p>
        </div>

        {/* Administration quick actions */}
        {currentUser.role === 'Admin' && (
          <button
            id="btn-hard-reset-data"
            onClick={handleWipe}
            className="flex items-center space-x-1.5 px-3 py-2 rounded bg-white hover:bg-red-50 text-red-650 border border-gray-200 text-xs font-semibold shadow-sm duration-150 cursor-pointer"
          >
            <Trash2 className="w-4 h-4 text-red-500" />
            <span>Master Reset History</span>
          </button>
        )}
      </div>

      {/* Controller Configuration Row */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
        
        {/* Toggle Stream */}
        <div className="flex flex-col justify-center space-y-1">
          <span className="text-[11px] text-slate-400 font-bold tracking-wider uppercase block">STREAM CONTROLS</span>
          <button
            id="btn-monitor-stream-toggle"
            onClick={onToggleStream}
            disabled={currentUser.role === 'Viewer'}
            className={`w-full py-2.5 px-4 rounded font-semibold text-xs flex items-center justify-center space-x-2 cursor-pointer duration-150 relative overflow-hidden ${
              streamRunning 
                ? 'bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100' 
                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
            } disabled:opacity-50`}
          >
            {streamRunning ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>PAUSE STREAM</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>RESUME STREAMING</span>
              </>
            )}
          </button>
        </div>

        {/* Dynamic interval configuration */}
        <div className="space-y-1">
          <label className="text-[11px] text-slate-450 font-bold block">TICK FREQUENCY RATE</label>
          <div className="flex items-center space-x-2">
            <input
              id="num-stream-speed"
              type="number"
              min="100"
              max="10000"
              value={speedInput}
              onChange={(e) => setSpeedInput(parseInt(e.target.value) || 1000)}
              disabled={currentUser.role === 'Viewer'}
              className="w-full bg-white border border-gray-200 rounded p-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
            />
            <span className="text-xs text-slate-400 font-medium">ms</span>
          </div>
        </div>

        {/* Z-Score threshold customization */}
        <div className="space-y-1">
          <label className="text-[11px] text-slate-450 font-bold block">TRIGGER SENSITIVITY (Z-SCORE)</label>
          <div className="flex items-center space-x-2">
            <input
              id="num-stream-sensitivity"
              type="number"
              min="1.5"
              max="8.0"
              step="0.1"
              value={sensitivityInput}
              onChange={(e) => setSensitivityInput(parseFloat(e.target.value) || 2.8)}
              disabled={currentUser.role === 'Viewer'}
              className="w-full bg-white border border-gray-200 rounded p-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
            />
            <span className="text-xs text-slate-400 font-medium">Std Dev</span>
          </div>
        </div>

        {/* Save/Sync triggers */}
        <div className="flex flex-col justify-end space-y-1">
          {saveStatus && <span className="text-[10px] text-center font-semibold text-emerald-600 mb-1">{saveStatus}</span>}
          <button
            id="btn-sync-simulation"
            onClick={handleUpdate}
            disabled={currentUser.role === 'Viewer'}
            className="w-full py-2.5 px-4 bg-white border border-gray-250 hover:bg-gray-50 rounded text-slate-700 font-semibold text-xs duration-150 cursor-pointer uppercase flex items-center justify-center space-x-1.5 shadow-sm"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
            <span>Apply Loop Constant</span>
          </button>
        </div>

      </div>

      {/* Advanced search and filters */}
      <div className="flex flex-col md:flex-row items-center gap-4 justify-between bg-[#f1f5f9]/60 p-4 rounded-xl border border-gray-200">
        
        {/* Metric channels selection */}
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <label className="text-xs text-slate-600 font-bold uppercase">Filter Node:</label>
          <select
            id="select-filter-channel"
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value as any)}
            className="bg-white border border-gray-200 p-2 text-xs text-slate-700 font-sans rounded select-none cursor-pointer"
          >
            <option value="all">ALL METRICS</option>
            {Object.entries(metricsInfo).map(([key, info]) => (
              <option key={key} value={key}>{info.name}</option>
            ))}
          </select>
        </div>

        {/* Search bar */}
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
          <input
            id="search-monitor-logs"
            type="text"
            placeholder="Search telemetry..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-gray-200 pl-8 pr-3 py-2 text-xs rounded text-slate-700 font-sans placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Anomaly only toggle */}
        <div className="flex items-center space-x-2">
          <input
            id="checkbox-filter-anomalies"
            type="checkbox"
            checked={anomaliesOnly}
            onChange={() => setAnomaliesOnly(!anomaliesOnly)}
            className="accent-indigo-600 w-4 h-4 cursor-pointer"
          />
          <label htmlFor="checkbox-filter-anomalies" className="text-xs text-slate-600 font-bold cursor-pointer select-none">
            FILTER DEVIATIONS/ALARMS ONLY
          </label>
        </div>

      </div>

      {/* Terminal Dense Table Logs */}
      <div className="flex-1 bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col justify-between max-h-[500px] shadow-sm">
        
        {/* Table/Header */}
        <div className="border-b border-gray-200 bg-slate-50 p-3 flex justify-between items-center text-[11px] font-bold tracking-wider text-slate-500">
          <div className="w-[18%]">TIMESTAMP</div>
          <div className="w-[20%]">METRIC VECTOR</div>
          <div className="w-[15%] text-right">VALUE</div>
          <div className="w-[20%] text-center">NORMAL THRESHOLD RANGE</div>
          <div className="w-[15%] text-right">Z-SCORE DIFFERENCE</div>
          <div className="w-[12%] text-center">ALARM FLAG</div>
        </div>

        {/* Live List Stream */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100 font-sans text-xs bg-white">
          {filteredEvents.length > 0 ? (
            filteredEvents.map((e) => {
              const info = metricsInfo[e.metricType] || { name: e.metricType, icon: Activity, color: 'text-slate-400', unit: '' };
              const Icon = info.icon;

              return (
                <div 
                  key={e.id} 
                  id={`log-entry-${e.id}`}
                  className={`p-3.5 flex justify-between items-center duration-100 ${
                    e.isAnomaly 
                      ? 'bg-rose-50/50 hover:bg-rose-50 border-l-2 border-red-500 text-rose-800' 
                      : 'hover:bg-slate-50/50 text-slate-700'
                  }`}
                >
                  <span className="w-[18%] text-[11px] text-slate-400 font-medium">
                    {new Date(e.timestamp).toLocaleTimeString()}
                  </span>
                  <div className="w-[20%] flex items-center space-x-1.5">
                    <Icon className="w-3.5 h-3.5 opacity-60 text-slate-400" />
                    <span className="font-medium">{info.name}</span>
                  </div>
                  <span className="w-[15%] text-right font-bold text-slate-800">
                    {e.value}
                    <span className="text-[10px] font-normal text-slate-400 ml-0.5">{info.unit}</span>
                  </span>
                  <div className="w-[20%] text-center text-[10px] text-slate-400 truncate">
                    {e.baselineMean ? `${e.baselineMean} ± ${e.baselineStd}` : 'Configuring...'}
                  </div>
                  <span className={`w-[15%] text-right font-bold ${e.isAnomaly ? 'text-red-650' : 'text-slate-550'}`}>
                    {e.anomalyScore ? `${e.anomalyScore}z Dev` : '0.00z'}
                  </span>
                  <div className="w-[12%] flex items-center justify-center">
                    {e.isAnomaly ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 border border-red-200 text-red-700">
                        THRESHOLD EXCEEDED
                      </span>
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-200"></span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-12 text-center text-slate-400 text-xs font-semibold">
              No matching records found. Verify active parameters or wait for simulation iterations.
            </div>
          )}
        </div>

        {/* Footer info counts */}
        <div className="p-3 bg-slate-50 border-t border-gray-250 text-[10px] font-bold text-slate-400 flex justify-between items-center rounded-b-xl">
          <span>Active Monitor Buffer: {filteredEvents.length} items parsed</span>
          <span>Simulation Buffer: STABLE</span>
        </div>

      </div>

    </div>
  );
}
