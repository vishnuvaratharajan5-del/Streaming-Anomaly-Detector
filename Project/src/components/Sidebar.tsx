/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  LayoutDashboard, 
  Activity, 
  AlertTriangle, 
  Database, 
  ShieldAlert, 
  Brain, 
  Users, 
  Settings, 
  LogOut,
  UserCheck,
  FileText
} from 'lucide-react';
import { User, UserRole } from '../types.js';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  currentUser: User;
  onLogout: () => void;
  streamRunning: boolean;
}

export default function Sidebar({ currentTab, setCurrentTab, currentUser, onLogout, streamRunning }: SidebarProps) {
  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'Admin': return 'bg-red-50 text-red-700 border-red-200';
      case 'Operator': return 'bg-amber-50 text-amber-700 border-amber-200';
      default: return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
  };

  const navItems = [
    { id: 'dashboard', name: 'Service Dashboard', icon: LayoutDashboard, limit: [] },
    { id: 'monitor', name: 'Live Stream Monitor', icon: Activity, limit: [] },
    { id: 'explorer', name: 'Telemetry Logs', icon: Database, limit: [] },
    { id: 'alerts', name: 'Alerts & Incidents', icon: AlertTriangle, limit: [] },
    { id: 'analytics', name: 'System Reports', icon: Brain, limit: [] },
    { id: 'documents', name: 'SOP Documentation', icon: FileText, limit: [] },
    { id: 'users', name: 'Identity & Access', icon: Users, limit: ['Admin'] },
    { id: 'security', name: 'System Audit Logs', icon: ShieldAlert, limit: [] },
    { id: 'settings', name: 'System Settings', icon: Settings, limit: [] },
  ];

  return (
    <aside id="sidebar-container" className="w-64 bg-[#0f172a] border-r border-[#1e293b] flex flex-col justify-between select-none">
      <div className="flex flex-col flex-1">
        
        {/* Header Branding */}
        <div className="p-5 border-b border-[#1e293b] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded bg-indigo-500"></span>
            <h1 className="text-sm font-bold tracking-wide text-slate-100 uppercase">
              Telemetry Server
            </h1>
          </div>
          <div className="flex items-center space-x-1.5 font-sans">
            <span className={`w-2 h-2 rounded-full ${streamRunning ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
            <span className="text-[10px] text-slate-400 font-sans tracking-wide">
              {streamRunning ? 'ONLINE' : 'STOPPED'}
            </span>
          </div>
        </div>

        {/* User Identity Banner */}
        <div className="p-4 border-b border-[#1e293b] bg-slate-900/20 flex flex-col items-center space-y-2">
          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-bold border border-slate-700 uppercase">
            {currentUser.name.slice(0, 2)}
          </div>
          <div className="text-center">
            <h3 className="text-sm font-semibold text-slate-200">{currentUser.name}</h3>
            <p className="text-[11px] text-slate-400 truncate max-w-[200px]">{currentUser.email}</p>
          </div>
          <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${getRoleBadgeColor(currentUser.role)}`}>
            {currentUser.role}
          </span>
        </div>

        {/* Navigation Elements */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const hasAccess = item.limit.length === 0 || item.limit.includes(currentUser.role);
            if (!hasAccess) return null;

            const Icon = item.icon;
            const isSelected = currentTab === item.id;

            return (
              <button
                key={item.id}
                id={`btn-nav-${item.id}`}
                onClick={() => setCurrentTab(item.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-md text-xs font-semibold tracking-wide transition-all ${
                  isSelected 
                    ? 'bg-slate-800 text-white border-l-2 border-indigo-500 font-bold' 
                    : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? 'text-indigo-400' : 'text-slate-500'}`} />
                <span className="flex-1 text-left">{item.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Secured Logout Section */}
      <div className="p-3 border-t border-[#1e293b] bg-slate-950/40">
        <button
          id="btn-secure-logout"
          onClick={onLogout}
          className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-md text-xs font-semibold text-slate-400 hover:bg-slate-800/60 hover:text-white transition-all cursor-pointer"
        >
          <LogOut className="w-4 h-4 text-red-400" />
          <span className="flex-1 text-left font-bold">Log Out</span>
        </button>
        <p className="text-[10px] text-slate-500 text-center mt-3 tracking-wider uppercase font-semibold">
          Active Authorization
        </p>
      </div>
    </aside>
  );
}
