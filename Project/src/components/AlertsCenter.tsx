/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { ShieldAlert, AlertTriangle, Activity, Cpu, Database, ShieldCheck, TrendingUp, Clock } from 'lucide-react';
import { Anomaly, UserRole, MetricType, AnomalyStatus } from '../types.js';

interface AlertsCenterProps {
  currentUser: { name: string; role: UserRole };
  anomalies: Anomaly[];
  onUpdateStatus: (id: string, status: AnomalyStatus, note: string) => void;
}

export default function AlertsCenter({
  currentUser,
  anomalies,
  onUpdateStatus
}: AlertsCenterProps) {
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedChannel, setSelectedChannel] = useState<MetricType | 'all'>('all');
  const [quickResolutionNote, setQuickResolutionNote] = useState<Record<string, string>>({});

  const metricsInfo: Record<MetricType, { name: string; icon: any; color: string; unit: string }> = {
    api_latency: { name: 'Response Latency', icon: Activity, color: 'text-indigo-600', unit: 'ms' },
    auth_failures: { name: 'Login Failures', icon: ShieldCheck, color: 'text-orange-600', unit: '/s' },
    db_connections: { name: 'DB Connection Load', icon: Database, color: 'text-blue-600', unit: '%' },
    cpu_usage: { name: 'Host Server CPU', icon: Cpu, color: 'text-emerald-600', unit: '%' },
    payment_volume: { name: 'Request Velocity', icon: TrendingUp, color: 'text-rose-600', unit: 'rps' }
  };

  const activeAlerts = anomalies.filter(a => a.status === 'Active' || a.status === 'Investigating');

  const getSeverityBadgeColor = (sev: string) => {
    switch (sev) {
      case 'Critical': return 'text-red-700 bg-red-50 border-red-200';
      case 'High': return 'text-orange-700 bg-orange-50 border-orange-200';
      case 'Medium': return 'text-amber-700 bg-amber-50 border-amber-200';
      default: return 'text-blue-700 bg-blue-50 border-blue-200';
    }
  };

  const handleAction = (id: string, status: AnomalyStatus) => {
    if (currentUser.role === 'Viewer') {
      alert('Access Denied: Viewers do not have permission to change alert parameters.');
      return;
    }
    const note = quickResolutionNote[id] || '';
    onUpdateStatus(id, status, note || `Toggled status to ${status}.`);
    // Clear form notes
    setQuickResolutionNote(prev => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  // Filter Active alarms
  const filteredAlerts = activeAlerts.filter(a => {
    const matchesSeverity = selectedSeverity === 'all' || a.severity === selectedSeverity;
    const matchesChannel = selectedChannel === 'all' || a.metricType === selectedChannel;
    return matchesSeverity && matchesChannel;
  });

  return (
    <div id="alerts-center-container" className="flex-1 p-6 overflow-y-auto bg-[#f8fafc] font-sans flex flex-col space-y-6">
      
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800 flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />
            <span>Alerts & System Incidents</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Review active system deviations, confirm baseline violations, and submit resolution triages.
          </p>
        </div>

        {/* Dynamic Unresolved alarm counters */}
        <div className="flex items-center space-x-3 text-xs bg-white border border-gray-200 px-3 py-2 rounded-lg shadow-sm">
          <span className="flex items-center space-x-1.5 text-red-600 font-bold">
            <ShieldAlert className="w-4 h-4 text-red-500" />
            <span>{activeAlerts.length} Active System Alarms</span>
          </span>
        </div>
      </div>

      {/* Advanced Filters ROW */}
      <div className="flex flex-col sm:flex-row items-center gap-4 justify-between bg-[#f1f5f9]/60 p-4 rounded-xl border border-gray-200">
        
        {/* Severity selection */}
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <label className="text-xs text-slate-600 font-bold uppercase">Severity Level:</label>
          <select
            id="select-alert-severity"
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="bg-white border border-gray-200 p-2 text-xs text-slate-700 font-sans rounded select-none cursor-pointer"
          >
            <option value="all">ALL SEVERITIES</option>
            <option value="Critical">Critical Priorities</option>
            <option value="High">High Priorities</option>
            <option value="Medium">Medium Alarms</option>
            <option value="Low">Low Fluctuations</option>
          </select>
        </div>

        {/* Metric selection channels */}
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <label className="text-xs text-slate-600 font-bold uppercase">Service Metric:</label>
          <select
            id="select-alert-channel"
            value={selectedChannel}
            onChange={(e) => setSelectedChannel(e.target.value as any)}
            className="bg-white border border-gray-200 p-2 text-xs text-slate-700 font-sans rounded select-none cursor-pointer"
          >
            <option value="all">ALL MEASUREMENT CHANNELS</option>
            {Object.entries(metricsInfo).map(([key, info]) => (
              <option key={key} value={key}>{info.name}</option>
            ))}
          </select>
        </div>

      </div>

      {/* Unresolved Alarm List Card board */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredAlerts.length > 0 ? (
          filteredAlerts.map((alert) => {
            const info = metricsInfo[alert.metricType] || { name: alert.metricType, icon: AlertTriangle, unit: '' };
            const Icon = info.icon;

            return (
              <div 
                key={alert.id}
                id={`alert-board-card-${alert.id}`}
                className="bg-white border border-gray-200 p-4 rounded-xl flex flex-col justify-between space-y-4 shadow-sm relative overflow-hidden pl-5"
               >
                {/* Color flash indicator on left side */}
                <div className={`absolute top-0 bottom-0 left-0 w-1.5 ${
                  alert.severity === 'Critical' ? 'bg-red-500' : 
                  alert.severity === 'High' ? 'bg-orange-550' : 
                  alert.severity === 'Medium' ? 'bg-amber-450' : 'bg-blue-500'
                }`}></div>

                {/* Header */}
                <div className="flex justify-between items-start">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-slate-50 border border-gray-150 rounded-lg">
                      <Icon className="w-4 h-4 text-slate-500" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
                        <span>{info.name}</span>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${getSeverityBadgeColor(alert.severity)}`}>
                          {alert.severity}
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-1 flex items-center space-x-1 font-medium">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{new Date(alert.timestamp).toLocaleString()}</span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-405 block uppercase font-bold tracking-wider">STATE</span>
                    <span className={`text-[11px] uppercase font-bold ${alert.status === 'Investigating' ? 'text-amber-600' : 'text-red-650'}`}>
                      {alert.status}
                    </span>
                  </div>
                </div>

                {/* Middle Math block */}
                <div className="bg-slate-50/70 border border-gray-150 p-3 rounded-lg grid grid-cols-3 gap-2 text-center">
                  <div className="font-sans">
                    <span className="text-[10px] text-slate-404 uppercase font-bold block">Live value</span>
                    <span className="text-xs font-bold text-slate-800 block mt-0.5">{alert.value}{info.unit}</span>
                  </div>
                  <div className="font-sans border-x border-gray-200">
                    <span className="text-[10px] text-slate-404 uppercase font-bold block">Normal Baseline</span>
                    <span className="text-xs font-bold text-slate-500 block mt-0.5">{alert.expectedValue}{info.unit}</span>
                  </div>
                  <div className="font-sans">
                    <span className="text-[10px] text-slate-404 uppercase font-bold block">z-dev score</span>
                    <span className="text-xs font-bold text-red-600 block mt-0.5">{alert.metricsAtTime.zScore}z</span>
                  </div>
                </div>

                {/* Mitigation Forms notes */}
                <div className="space-y-2">
                  <input
                    id={`input-alert-note-${alert.id}`}
                    type="text"
                    placeholder="Enter quick triage logging or mitigation remarks..."
                    value={quickResolutionNote[alert.id] || ''}
                    onChange={(e) => setQuickResolutionNote(prev => ({ ...prev, [alert.id]: e.target.value }))}
                    disabled={currentUser.role === 'Viewer'}
                    className="w-full bg-white border border-gray-250 p-2 text-xs placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded font-sans text-slate-700"
                  />

                  {/* Operational triage button triggers */}
                  <div className="flex gap-2 justify-end pt-1 flex-wrap">
                    {alert.status === 'Active' && (
                      <button
                        id={`btn-ack-alert-${alert.id}`}
                        onClick={() => handleAction(alert.id, 'Investigating')}
                        disabled={currentUser.role === 'Viewer'}
                        className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 font-semibold text-xs rounded duration-150 cursor-pointer uppercase"
                      >
                        Acknowledge
                      </button>
                    )}
                    <button
                      id={`btn-resolve-alert-${alert.id}`}
                      onClick={() => handleAction(alert.id, 'Resolved')}
                      disabled={currentUser.role === 'Viewer'}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded duration-150 cursor-pointer shadow-sm uppercase"
                    >
                      Resolve Alarm
                    </button>
                    <button
                      id={`btn-dismiss-alert-${alert.id}`}
                      onClick={() => handleAction(alert.id, 'False Positive')}
                      disabled={currentUser.role === 'Viewer'}
                      className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-500 font-semibold text-xs border border-gray-200 rounded duration-150 cursor-pointer uppercase"
                    >
                      False Positive
                    </button>
                  </div>
                </div>

              </div>
            );
          })
        ) : (
          <div className="col-span-1 lg:col-span-2 bg-white border border-gray-200 p-10 rounded-xl text-center text-slate-400 text-xs font-semibold shadow-sm">
            Excellent! No critical system threshold alerts are active currently.
          </div>
        )}
      </div>

    </div>
  );
}
export type { Anomaly };
