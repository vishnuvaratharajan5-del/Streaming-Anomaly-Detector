/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Shield, 
  Eye, 
  EyeOff, 
  Lock, 
  Mail, 
  UserPlus, 
  FileWarning, 
  ArrowRight, 
  CheckCircle2, 
  Link2, 
  Wifi, 
  Save, 
  Server, 
  Info, 
  AlertCircle, 
  HelpCircle, 
  Key, 
  Activity, 
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { UserRole } from '../types.js';
import { secureFetch, getBackendUrl, setBackendUrl } from '../utils/api.js';

interface LoginProps {
  onLoginSuccess: (token: string, user: any) => void;
}

export default function LoginView({ onLoginSuccess }: LoginProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('Viewer');
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Operational backend bridge configuration states
  const [backendInput, setBackendInput] = useState(localStorage.getItem('anomaly_backend_url') || '');
  const [showBridgeConfig, setShowBridgeConfig] = useState((getBackendUrl() !== '') || errorMessage.includes('Tunnel'));
  const [bridgeSavedMsg, setBridgeSavedMsg] = useState('');

  const handleSaveBridge = (e: React.FormEvent) => {
    e.preventDefault();
    const inputCleaned = backendInput.trim();
    if (inputCleaned.includes('...') || inputCleaned.includes('…')) {
      setErrorMessage('Validation Failure: The URL entered is truncated with "..." ellipses. Please copy the complete, non-truncated Development or Shared App URL from AI Studio.');
      setBridgeSavedMsg('');
      return;
    }
    setBackendUrl(inputCleaned || null);
    setBridgeSavedMsg('Secure tunnel endpoint updated successfully!');
    setTimeout(() => setBridgeSavedMsg(''), 3000);
    setErrorMessage('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMsg('');

    if (!email || !password) {
      setErrorMessage('Please fill in all secure login fields.');
      return;
    }

    setLoading(true);
    try {
      const response = await secureFetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.error || 'Identity evaluation failure.');
      } else {
        localStorage.setItem('anomaly_secure_token', data.token);
        setSuccessMsg(`Session established successfully. Welcome back, ${data.user.name}!`);
        setTimeout(() => {
          onLoginSuccess(data.token, data.user);
        }, 1200);
      }
    } catch (err: any) {
      console.error(err);
      if (err.message.includes('TUNNEL_HTML_ERROR') || err.message.includes('Unexpected token') || err.message.includes('is not valid JSON')) {
        setErrorMessage(`Tunnel connection error: Your static runner (Vercel) cannot reach the Express API. Please configure your live Container Backend Tunnel at the bottom of this page.`);
        setShowBridgeConfig(true);
      } else {
        setErrorMessage(`Tunnel connection error: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMsg('');

    if (!email || !password || !name) {
      setErrorMessage('Name, email, and secure credentials must be completed.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Standard Requirement: passcode must contain at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const response = await secureFetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password, name, role })
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.error || 'System registration rejected.');
      } else {
        setSuccessMsg('Account registered successfully. Proceeding with credentials evaluation...');
        
        // Auto-login registered account immediately
        setTimeout(async () => {
          try {
            const loginRes = await secureFetch('/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password })
            });
            const loginData = await loginRes.json();
            if (loginRes.ok) {
              localStorage.setItem('anomaly_secure_token', loginData.token);
              onLoginSuccess(loginData.token, loginData.user);
            } else {
              setIsRegistering(false);
              setSuccessMsg('');
            }
          } catch {
            setIsRegistering(false);
            setSuccessMsg('');
          }
        }, 1500);
      }
    } catch (err: any) {
      console.error(err);
      if (err.message.includes('TUNNEL_HTML_ERROR') || err.message.includes('Unexpected token') || err.message.includes('is not valid JSON')) {
        setErrorMessage(`Tunnel connection error: Your static runner (Vercel) cannot reach the Express API. Please configure your live Container Backend Tunnel at the bottom of this page.`);
        setShowBridgeConfig(true);
      } else {
        setErrorMessage(`Tunnel connection error: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Helper function to fill-in credentials instantly
  const handleQuickFill = (presetEmail: string, presetPass: string) => {
    setEmail(presetEmail);
    setPassword(presetPass);
    setErrorMessage('');
    setSuccessMsg('');
  };

  return (
    <div id="login-container" className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 font-sans relative overflow-y-auto">
      
      {/* Background visual graphics */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.12),transparent_35%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(30,41,59,0.9),slate-950)] pointer-events-none" />
      
      {/* Upper Status Bar decor */}
      <div className="w-full max-w-lg mb-4 px-2 flex justify-between items-center text-[10px] text-slate-500 font-mono tracking-wider">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
          <span>SECURE PROTOCOL INTERFACE</span>
        </div>
        <div>SYS_REV: v4.1.2-LIVE</div>
      </div>

      {/* Main Container Card */}
      <div className="w-full max-w-lg bg-slate-950/80 backdrop-blur-xl border border-slate-800/80 p-6 sm:p-8 rounded-2xl shadow-2xl relative overflow-hidden transition-all duration-300">
        
        {/* Glow Top Accent */}
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-80" />

        {/* Portal Branding Section */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="p-3.5 bg-indigo-950/40 border border-indigo-500/30 rounded-2xl shadow-inner mb-3 relative group">
            <Shield className="w-7 h-7 text-indigo-400 group-hover:scale-110 duration-300 animate-none" />
            <div className="absolute -inset-1 bg-indigo-500/10 rounded-2xl blur-lg pointer-events-none" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white font-sans sm:text-2xl">
              Telemetry Monitor Portal
            </h1>
            <p className="text-[11px] text-indigo-450 tracking-wider font-bold uppercase mt-1 flex items-center justify-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>Live Service Observability Platform</span>
            </p>
          </div>
        </div>

        {/* Dynamic Warning Alerts tailored for easy troubleshooting */}
        {errorMessage && (
          <div id="banner-login-error" className="mb-5 p-4 rounded-xl bg-red-950/50 text-red-250 border border-red-500/35 text-xs font-sans space-y-2 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-start space-x-2.5">
              <FileWarning className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <div className="space-y-1">
                <span className="font-extrabold text-red-300 tracking-wide block uppercase text-[10px]">Security / Gateway Alarm</span>
                <p className="leading-relaxed text-red-200">{errorMessage}</p>
              </div>
            </div>

            {errorMessage.includes('Tunnel') && (
              <div className="mt-2.5 pt-2.5 border-t border-red-500/20 text-[11px] text-red-300/90 leading-relaxed bg-red-950/30 p-2 rounded-lg space-y-1.5">
                <p className="font-semibold">💡 What is this error and how to fix it?</p>
                <p>
                  Since this presentation workspace is running in a static runner (like a Vercel hosting partition), the app lacks an adjacent server to route standard API payloads. 
                  To connect perfectly with the container's relational database and live Express endpoints:
                </p>
                <ol className="list-decimal list-inside space-y-1 pl-1 text-[10px] text-red-200/80">
                  <li>Find your active <strong>Development App URL</strong> or <strong>Shared App URL</strong> at the top-right margins of Google AI Studio.</li>
                  <li>Scroll to the <strong>Backend Link Tunnel</strong> form at the bottom.</li>
                  <li>Paste that link directly, save, and then try signing in again!</li>
                </ol>
              </div>
            )}
          </div>
        )}

        {successMsg && (
          <div id="banner-login-success" className="mb-5 p-3.5 rounded-xl bg-emerald-950/40 text-emerald-200 border border-emerald-500/30 text-xs font-sans flex items-start space-x-2.5 animate-in slide-in-from-top-1 duration-150">
            <CheckCircle2 className="w-4.5 h-4.5 shrink-0 mt-0.5 text-emerald-450" />
            <div className="space-y-0.5">
              <span className="font-bold text-emerald-400 tracking-wide block uppercase text-[10px]">Gateway Verified</span>
              <p className="leading-relaxed text-emerald-100">{successMsg}</p>
            </div>
          </div>
        )}

        {/* Dynamic Login Form */}
        <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-4">
          
          {isRegistering && (
            <div className="space-y-1">
              <label htmlFor="reg-name-input" className="text-[10px] text-slate-400 font-bold tracking-wider uppercase block">Full Name</label>
              <input
                id="reg-name-input"
                type="text"
                placeholder="Jane Doe"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 text-white placeholder:text-slate-600 p-3 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-all duration-150"
              />
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor="auth-email-input" className="text-[10px] text-slate-400 font-bold tracking-wider uppercase block">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                id="auth-email-input"
                type="email"
                placeholder="developer@company.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 pl-10 pr-3-py-3 text-white placeholder:text-slate-600 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none py-3"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label htmlFor="auth-pass-input" className="text-[10px] text-slate-400 font-bold tracking-wider uppercase block">Password</label>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                id="auth-pass-input"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 pl-10 pr-10 py-3 text-white placeholder:text-slate-600 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 px-1 text-slate-500 hover:text-slate-300 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
              </button>
            </div>
          </div>

          {isRegistering && (
            <div className="space-y-1">
              <label htmlFor="select-reg-role" className="text-[10px] text-slate-400 font-bold tracking-wider uppercase block">Assigned Account Role</label>
              <select
                id="select-reg-role"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full bg-slate-900 border border-slate-800 text-slate-200 p-3 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none cursor-pointer"
              >
                <option value="Viewer">Viewer (Dashboard logs read-only)</option>
                <option value="Operator">Operator (Triage alarms, inject stress)</option>
                <option value="Admin">Admin (Access control, system settings override)</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            id="btn-auth-submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-650 hover:bg-indigo-600 active:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/10 font-bold text-white duration-150 rounded-lg text-xs uppercase flex items-center justify-center space-x-2 tracking-wider cursor-pointer mt-5 disabled:opacity-45 disabled:cursor-not-allowed border border-indigo-500/20"
          >
            <span>{loading ? 'Verifying authentication...' : isRegistering ? 'Register Account' : 'Authenticate Credentials'}</span>
            {!loading && <ArrowRight className="w-4 h-4 text-white" />}
          </button>

        </form>

        {/* Quick Credentials Profiles Picker - Amazing DX/UX addition */}
        {!isRegistering && (
          <div className="mt-5 pt-4 border-t border-slate-900">
            <span className="text-[10px] text-slate-500 font-extrabold tracking-widest block uppercase mb-2">
              QUICK SECURITY DEMO ACCOUNTS
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('admin@anomaly.io', 'admin123')}
                className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-indigo-500/30 hover:bg-slate-900 text-[10px] text-slate-350 hover:text-white font-semibold flex flex-col items-center justify-center space-y-0.5 cursor-pointer duration-150"
              >
                <span className="text-indigo-400 font-extrabold">Admin</span>
                <span className="text-[8px] text-slate-600">Chief Officer</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('operator@anomaly.io', 'operator123')}
                className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-indigo-500/30 hover:bg-slate-900 text-[10px] text-slate-350 hover:text-white font-semibold flex flex-col items-center justify-center space-y-0.5 cursor-pointer duration-150"
              >
                <span className="text-amber-400 font-extrabold">Operator</span>
                <span className="text-[8px] text-slate-600">Stress Control</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('viewer@anomaly.io', 'viewer123')}
                className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-indigo-500/30 hover:bg-slate-900 text-[10px] text-slate-350 hover:text-white font-semibold flex flex-col items-center justify-center space-y-0.5 cursor-pointer duration-150"
              >
                <span className="text-sky-400 font-extrabold">Viewer</span>
                <span className="text-[8px] text-slate-600">Audit logs</span>
              </button>
            </div>
          </div>
        )}

        {/* Pivot button to register/login & custom tunnel settings trigger */}
        <div className="mt-5 text-center text-xs flex flex-col items-center space-y-3">
          <button
            type="button"
            onClick={() => {
              setIsRegistering(!isRegistering);
              setErrorMessage('');
              setSuccessMsg('');
            }}
            className="text-slate-400 hover:text-indigo-400 font-bold cursor-pointer duration-150 text-[11px]"
          >
            {isRegistering ? 'Have account credentials? Sign In' : 'Request Security Credentials'}
          </button>

          <button
            type="button"
            onClick={() => setShowBridgeConfig(!showBridgeConfig)}
            className="text-[11px] text-slate-500 hover:text-indigo-300 font-medium flex items-center space-x-1.5 duration-150 cursor-pointer p-1"
          >
            <Link2 className="w-3.5 h-3.5 text-slate-500" />
            <span>{showBridgeConfig ? 'Hide Backend Tunnel settings' : 'Configure Backend Tunnel'}</span>
          </button>
        </div>

        {/* Visual Tunnel Configuration Drawer */}
        {showBridgeConfig && (
          <div className="mt-6 pt-5 border-t border-slate-900 animate-in fade-in slide-in-from-bottom-2 duration-250">
            <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-4 space-y-3 relative">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <div className="flex items-center space-x-2 text-indigo-400">
                  <Wifi className="w-4 h-4 text-indigo-400 animate-pulse" />
                  <h4 className="text-[11px] uppercase font-black tracking-wider font-sans">
                    Backend Link Tunnel
                  </h4>
                </div>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold ${
                  localStorage.getItem('anomaly_backend_url')?.includes('...') 
                    ? 'bg-red-950 text-red-400 border border-red-900 animate-pulse'
                    : getBackendUrl() 
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' 
                      : 'bg-slate-850 text-slate-400 border border-slate-800'
                }`}>
                  {localStorage.getItem('anomaly_backend_url')?.includes('...') 
                    ? 'INVALID OVERRIDE (TRUNCATED)' 
                    : getBackendUrl() 
                      ? 'OVERRIDE BRIDGE ACTIVE' 
                      : 'DEFAULT RELATIVE ORIGIN'}
                </span>
              </div>
              
              <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                By default, this React interface queries its hosting origin. If you are already inside AI Studio, you <strong>do not need any tunnel settings</strong>—just click <strong>Clear Override</strong> below to reset to the default direct link. Only paste a complete, continuous URL if you are running this panel on a separate custom domain.
              </p>

              {localStorage.getItem('anomaly_backend_url')?.includes('...') && (
                <div className="p-3 rounded bg-red-950/40 border border-red-900 text-[10px] text-red-200 leading-relaxed font-sans">
                  ⚠️ <strong>Truncated URL Detected:</strong> The stored backend link contains ellipses <code>"..."</code>. This breaks connection requests. Please click <strong>Clear Override</strong> below to restore normal functionality!
                </div>
              )}

              {bridgeSavedMsg && (
                <div className="p-2 rounded bg-emerald-950/40 border border-emerald-900 text-[10px] text-emerald-300 text-center animate-in zoom-in-95 duration-150">
                  {bridgeSavedMsg}
                </div>
              )}

              <form onSubmit={handleSaveBridge} className="space-y-3">
                <div className="space-y-1.5">
                  <label htmlFor="input-backend-url" className="text-[9px] font-bold text-slate-500 block uppercase tracking-wide">
                    Active Container URL
                  </label>
                  <input
                    id="input-backend-url"
                    type="url"
                    placeholder="https://ais-...run.app"
                    value={backendInput}
                    onChange={(e) => setBackendInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2.5 text-xs text-slate-200 placeholder:text-slate-700 font-mono focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                  <div className="text-[10px] text-slate-500 leading-normal font-sans py-0.5">
                    <span>Example: Go to AI Studio, copy your Development or Shared App URL and paste it here.</span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2.5 border-t border-slate-850">
                  <button
                    type="button"
                    onClick={() => {
                      setBackendUrl('');
                      setBackendInput('');
                      setBridgeSavedMsg('Reset to relative origin endpoints.');
                      setTimeout(() => setBridgeSavedMsg(''), 3000);
                    }}
                    className="text-[10px] text-slate-500 hover:text-red-400 font-bold tracking-wide duration-150 cursor-pointer uppercase py-1"
                  >
                    Clear Override
                  </button>
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center space-x-1.5 duration-150 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Endpoint</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
export type { UserRole };
