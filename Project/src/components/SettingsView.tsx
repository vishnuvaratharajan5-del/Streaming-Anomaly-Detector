/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Sliders, BookOpen, Trash2, Cpu, Database, Info } from 'lucide-react';
import { User, SystemSettings } from '../types.js';

interface SettingsProps {
  currentUser: User;
  settings: SystemSettings;
  onUpdateSimulationSettings: (speed: number, sensitivity: number, manualModeOnly?: boolean) => void;
  onResetDatabase: () => void;
}

export default function SettingsView({
  currentUser,
  settings,
  onUpdateSimulationSettings,
  onResetDatabase
}: SettingsProps) {
  const [sensitivityZ, setSensitivityZ] = useState<number>(settings.detectionSensitiveZScore);
  const [rollingWindow, setRollingWindow] = useState<number>(settings.rollingWindowSize);
  const [speedInterval, setSpeedInterval] = useState<number>(settings.streamIntervalMs);
  const [manualModeOnly, setManualModeOnly] = useState<boolean>(settings.manualModeOnly || false);
  const [actionStatus, setActionStatus] = useState<string>('');

  const handleSaveSettings = () => {
    if (currentUser.role === 'Viewer') {
      alert('Access Denied: Viewers do not have permission to modify system settings.');
      return;
    }
    if (sensitivityZ < 1.5 || sensitivityZ > 8.0) {
      alert('Sensitivity coefficient must operate inside standard [1.5, 8.0] values.');
      return;
    }
    onUpdateSimulationSettings(speedInterval, sensitivityZ, manualModeOnly);
    setActionStatus('System settings updated successfully.');
    setTimeout(() => setActionStatus(''), 4000);
  };

  const handleWipeData = () => {
    if (currentUser.role !== 'Admin') {
      alert('Forbidden: Data resets are restricted exclusively to administrators.');
      return;
    }
    if (confirm('Are you sure you want to permanently clear historical telemetry logs and reset baseline metrics?')) {
      onResetDatabase();
      setActionStatus('Historical data registers cleared completely.');
      setTimeout(() => setActionStatus(''), 4000);
    }
  };

  return (
    <div id="settings-view-container" className="flex-1 p-6 overflow-y-auto bg-[#f8fafc] font-sans flex flex-col space-y-6">
      
      {/* Title */}
      <div className="border-b border-gray-200 pb-5">
        <h2 className="text-xl font-bold tracking-tight text-slate-800 flex items-center space-x-2.5">
          <Sliders className="w-5 h-5 text-indigo-650" />
          <span>System Settings</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Configure statistical anomaly Z-score coefficients, perform buffer resets, and review forensic detection formulas.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Settings Form */}
        <div className="space-y-6">
          
          {/* Statistical coefficients */}
          <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-805 uppercase border-b border-gray-100 pb-2 flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-indigo-650" />
              <span>Statistical Anomaly Coefficients</span>
            </h3>

            {actionStatus && (
              <div className="p-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded-lg text-center animate-pulse">
                {actionStatus}
              </div>
            )}

            <div className="space-y-4">
              
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[11px] font-bold text-slate-600 select-none">
                  <label className="uppercase">Anomaly Sensitivity: {sensitivityZ} Z-score Std Dev</label>
                  <span className="text-slate-400">Normal Bounds: 2.5 - 3.5</span>
                </div>
                <input
                  id="range-settings-sensitivity"
                  type="range"
                  min="1.5"
                  max="5.5"
                  step="0.1"
                  value={sensitivityZ}
                  onChange={(e) => setSensitivityZ(parseFloat(e.target.value))}
                  disabled={currentUser.role === 'Viewer'}
                  className="w-full accent-indigo-600 bg-gray-100 h-1 rounded cursor-pointer mt-1"
                />
                <p className="text-[11px] text-slate-450 leading-relaxed mt-1">
                  Lower coefficients increase sensitivity to detect alerts (more false positives). Higher coefficients require massive spikes to trigger alarms.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase block">Rolling History Window Buffer</label>
                <input
                  id="num-settings-window"
                  type="number"
                  min="20"
                  max="150"
                  value={rollingWindow}
                  onChange={(e) => setRollingWindow(parseInt(e.target.value) || 50)}
                  disabled={true} 
                  className="w-full bg-slate-50 border border-gray-200 rounded-lg p-2 text-xs text-slate-405 font-medium opacity-70"
                />
                <p className="text-[11px] text-slate-450 leading-relaxed mt-1">
                  The number of past records computed to establish baseline Mean (μ) and Standard Deviation (σ). (LOCKED: {settings.rollingWindowSize} logs)
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase block">Ingestion Ingress rate (ms)</label>
                <input
                  id="num-settings-speed"
                  type="number"
                  min="100"
                  max="10000"
                  value={speedInterval}
                  onChange={(e) => setSpeedInterval(parseInt(e.target.value) || 1000)}
                  disabled={currentUser.role === 'Viewer'}
                  className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs text-slate-800"
                />
                <p className="text-[11px] text-slate-450 leading-relaxed mt-1">
                  The local simulated data stream tick rate. Lower values speed up simulated incoming telemetry cycles.
                </p>
              </div>

              <div className="space-y-1.5 border-t border-gray-100 pt-3 mt-3">
                <label className="text-[11px] font-bold text-slate-600 uppercase block">Telemetry Generation Source</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    id="btn-settings-mode-manual"
                    type="button"
                    onClick={() => setManualModeOnly(true)}
                    disabled={currentUser.role === 'Viewer'}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border cursor-pointer duration-150 ${
                      manualModeOnly
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold shadow-xs animate-none'
                        : 'bg-white border-gray-200 hover:bg-slate-50 text-slate-650'
                    }`}
                  >
                    Operator Manual Only
                  </button>
                  <button
                    id="btn-settings-mode-auto"
                    type="button"
                    onClick={() => setManualModeOnly(false)}
                    disabled={currentUser.role === 'Viewer'}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border cursor-pointer duration-150 ${
                      !manualModeOnly
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold shadow-xs animate-none'
                        : 'bg-white border-gray-200 hover:bg-slate-50 text-slate-655'
                    }`}
                  >
                    Continuous Simulation
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 leading-normal mt-1 leading-relaxed">
                  In <strong>Operator Manual Only</strong> mode, continuous background data ticks are strictly blocked. Baseline thresholds and system lines remain completely frozen until registered manually.
                </p>
              </div>

              <button
                id="btn-settings-save"
                onClick={handleSaveSettings}
                disabled={currentUser.role === 'Viewer'}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg duration-150 cursor-pointer uppercase shadow-sm mt-3"
              >
                Sync Operational Parameters
              </button>

            </div>

          </div>

          {/* Database management and hard purging */}
          <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-red-700 uppercase border-b border-gray-100 pb-2 flex items-center space-x-2">
              <Database className="w-4 h-4 text-red-550" />
              <span>Administrative Purges</span>
            </h3>

            <p className="text-xs text-slate-500 leading-normal">
              Permanently clear all logged historical deviations, baseline tracks, and active dashboard alerts lists.
            </p>

            <button
              id="btn-settings-wipe-data"
              onClick={handleWipeData}
              disabled={currentUser.role !== 'Admin'}
              className="px-4 py-2.5 bg-white hover:bg-red-50 text-red-600 border border-red-200 hover:border-red-300 font-semibold text-xs rounded-lg duration-150 cursor-pointer uppercase select-none w-full shadow-sm"
            >
              <Trash2 className="w-4 h-4 inline mr-1.5 text-red-500" />
              <span>Hard Purge System Telemetry</span>
            </button>
            <p className="text-[10px] text-slate-400 text-center font-bold">
              * This is a critical security action and requires Admin privileges.
            </p>
          </div>

        </div>

        {/* Math explanation & Documentation block */}
        <div className="space-y-6">
          
          {/* Rule documentation */}
          <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-805 uppercase border-b border-gray-100 pb-2 flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-emerald-600" />
              <span>Detection Mathematics Refresher</span>
            </h3>

            <div className="space-y-4 text-xs text-slate-600 leading-relaxed">
              
              <div>
                <h4 className="text-xs font-bold text-slate-800 border-l-2 border-indigo-650 pl-2 uppercase">1. Z-Score Deviation equation</h4>
                <div className="bg-slate-50 border border-gray-150 p-2.5 rounded-lg text-slate-700 select-all my-1.5 flex justify-center text-sm font-semibold font-mono">
                  Z = | x - μ | / σ
                </div>
                <p className="text-[11px] text-slate-500">
                  Where <span className="font-bold text-slate-700">x</span> represents live metric load, <span className="font-bold text-slate-700">μ (mean)</span> is the baseline rolling average, and <span className="font-bold text-slate-700">σ (sigma)</span> is standard deviation. Scores beyond threshold Z trigger deviation flags.
                </p>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-800 border-l-2 border-indigo-650 pl-2 uppercase">2. Standard Deviation Formula</h4>
                <div className="bg-slate-50 border border-gray-150 p-2.5 rounded-lg text-slate-705 select-all my-1.5 flex justify-center text-xs font-mono">
                  σ = Math.sqrt( Σ(xi - μ)² / (N - 1) )
                </div>
                <p className="text-[11px] text-slate-500">
                  Measures variance across <span className="font-bold text-slate-700">N (Window size {settings.rollingWindowSize})</span> sample cycles. Natural variations expand baseline boundaries to limit false alarms.
                </p>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-800 border-l-2 border-indigo-650 pl-2 uppercase">3. Alert Severity metrics limits</h4>
                <div className="p-3 bg-slate-50 rounded-lg border border-gray-150 space-y-1.5 font-sans">
                  <p className="text-xs text-slate-500 font-medium">• <span className="text-slate-700 font-bold block sm:inline">Z-Score &lt; 2.8:</span> 0% alarm threshold index (Normal range)</p>
                  <p className="text-xs text-slate-500 font-medium">• <span className="text-amber-600 font-bold block sm:inline">Z-Score ≈ 2.8:</span> 60% confidence baseline alarm (Medium alert)</p>
                  <p className="text-xs text-slate-500 font-medium">• <span className="text-red-650 font-bold block sm:inline">Z-Score &gt; 4.0:</span> 95% high confidence threshold reached (Critical severity)</p>
                </div>
              </div>

            </div>
          </div>

          {/* Security policy compliance display */}
          <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-805 uppercase border-b border-gray-100 pb-2 flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-indigo-650" />
              <span>Policy & Encryption Mandates</span>
            </h3>
            
            <div className="text-[11px] font-bold text-slate-450 space-y-2.5 uppercase">
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span>Password digest encryption</span>
                <span className="text-emerald-600">PBKDF2-SHA512</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span>Access tickets authentication</span>
                <span className="text-emerald-600">Secure Cryptographic Token</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span>Scope-based access limits</span>
                <span className="text-indigo-600">Enforced administratively</span>
              </div>
              <div className="flex justify-between pb-1">
                <span>Inactivity Session timeouts</span>
                <span className="text-amber-600">10 MINUTES MAX IDLE</span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
export type { SystemSettings };
