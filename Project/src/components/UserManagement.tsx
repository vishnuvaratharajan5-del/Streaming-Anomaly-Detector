/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Users, ShieldAlert, UserMinus, ShieldCheck, Mail, Eye, Activity } from 'lucide-react';
import { User, UserRole, SecurityLog } from '../types.js';
import { secureFetch } from '../utils/api.js';

interface UserManagementProps {
  currentUser: User;
}

export default function UserManagement({ currentUser }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [actionStatus, setActionStatus] = useState('');

  const fetchUsers = async () => {
    if (currentUser.role !== 'Admin') return;
    setLoadingUsers(true);
    try {
      const token = localStorage.getItem('anomaly_secure_token');
      const res = await secureFetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(data);
      }
    } catch (e) {
      console.error('Error fetching registered keys:', e);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const token = localStorage.getItem('anomaly_secure_token');
      const res = await secureFetch('/api/security-logs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setSecurityLogs(data);
      }
    } catch (e) {
      console.error('Error fetching audit logs:', e);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchLogs();
  }, []);

  const handleUpdateRole = async (userId: string, newRole: UserRole) => {
    if (currentUser.role !== 'Admin') return;
    try {
      const token = localStorage.getItem('anomaly_secure_token');
      const res = await secureFetch(`/api/users/${userId}/role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) {
        setActionStatus(`Authority privilege updated to ${newRole}`);
        fetchUsers();
        fetchLogs();
        setTimeout(() => setActionStatus(''), 3000);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to modify privileges.');
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (currentUser.role !== 'Admin') return;
    if (userId === currentUser.id) {
      alert('Security Protection: You cannot delete your current active administrative session.');
      return;
    }
    if (!confirm('Are you sure you want to revoke access keys for this operator account immediately?')) return;
    
    try {
      const token = localStorage.getItem('anomaly_secure_token');
      const res = await secureFetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setActionStatus('Operator record removed successfully.');
        fetchUsers();
        fetchLogs();
        setTimeout(() => setActionStatus(''), 3000);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to purge account.');
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const getLogSeverityColor = (sev: string) => {
    switch (sev) {
      case 'high': return 'text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded text-[10px] font-bold';
      case 'medium': return 'text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded text-[10px] font-semibold';
      default: return 'text-slate-550 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded text-[10px] font-medium';
    }
  };

  return (
    <div id="user-management-view" className="flex-1 p-6 overflow-y-auto bg-[#f8fafc] font-sans flex flex-col space-y-6">
      
      {/* Title */}
      <div className="border-b border-gray-200 pb-5">
        <h2 className="text-xl font-bold tracking-tight text-slate-800 flex items-center space-x-2.5">
          <ShieldCheck className="w-5 h-5 text-indigo-600" />
          <span>Access Management & Security Audits</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Review authentic access logs, adjust user role memberships, and inspect chronological trace audits.
        </p>
      </div>

      {currentUser.role === 'Admin' ? (
        /* Admin Interactive Control Panel */
        <div className="bg-white border border-gray-200 p-5 rounded-xl space-y-4 shadow-sm">
          <div className="flex justify-between items-center border-b border-gray-100 pb-3 flex-wrap gap-2">
            <div>
              <h3 className="text-xs font-bold text-slate-705 uppercase flex items-center space-x-2">
                <Users className="w-4 h-4 text-indigo-650" />
                <span>Operator Privileges Index</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Edit system access rules and modify authorization credentials live.</p>
            </div>
            {actionStatus && (
              <span className="text-[11px] text-emerald-705 bg-emerald-50 px-2 py-1 rounded border border-emerald-200 font-semibold animate-pulse">
                {actionStatus}
              </span>
            )}
          </div>

          {loadingUsers ? (
            <div className="text-center py-8 text-xs font-semibold text-slate-400">Querying identity directory...</div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
              <table className="w-full text-left text-xs border-collapse divide-y divide-gray-200">
                <thead className="bg-[#f8fafc] font-bold text-slate-500 text-[11px] tracking-wider uppercase">
                  <tr>
                    <th className="p-3">OPERATOR</th>
                    <th className="p-3">EMAIL ADDRESS</th>
                    <th className="p-3">CREATED ON</th>
                    <th className="p-3">AUTHORITY ROLE</th>
                    <th className="p-3 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150 text-slate-700 bg-white">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50/50">
                      <td className="p-3 flex items-center space-x-2.5">
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center">
                          {u.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{u.name}</p>
                          <p className="text-[10px] text-slate-400 font-medium">ID: {u.id.slice(0,8)}...</p>
                        </div>
                      </td>
                      <td className="p-3 text-slate-600 font-medium">
                        <div className="flex items-center space-x-1.5">
                          <Mail className="w-4 h-4 text-slate-400" />
                          <span>{u.email}</span>
                        </div>
                      </td>
                      <td className="p-3 text-slate-450 font-medium">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        <select
                          id={`select-user-role-${u.id}`}
                          value={u.role}
                          onChange={(e) => handleUpdateRole(u.id, e.target.value as UserRole)}
                          className="bg-white border border-gray-200 text-slate-700 rounded p-1.5 focus:ring-1 focus:ring-indigo-500 cursor-pointer text-xs"
                        >
                          <option value="Admin">Admin</option>
                          <option value="Operator">Operator</option>
                          <option value="Viewer">Viewer</option>
                        </select>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          id={`btn-purge-user-${u.id}`}
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-1.5 px-3 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-200 cursor-pointer transition-all duration-150 font-semibold"
                        >
                          <UserMinus className="w-3.5 h-3.5 inline mr-1" />
                          <span>Revoke</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Non-Admin Security Warning block */
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start space-x-3 text-amber-800 shadow-sm">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wide">Identity Registry Restricted</h4>
            <p className="text-xs text-amber-700 mt-1 leading-relaxed">
              Your active operator profile is configured with **{currentUser.role}** credentials. Modifying registered keyrings or purging operators is restricted. Kindly ask your Chief Administrator if credentials configuration revisions are necessary.
            </p>
          </div>
        </div>
      )}

      {/* Security Audit logs window */}
      <div className="bg-white border border-gray-200 p-5 rounded-xl flex flex-col justify-between space-y-4 max-h-[450px] shadow-sm">
        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-xs font-bold text-slate-705 uppercase flex items-center space-x-1.5">
              <Eye className="w-4 h-4 text-emerald-600" />
              <span>Identity & Security Audit chronolog</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Continuous live audit logs tracking operator authentication and parameters modifications.</p>
          </div>
          <button 
            onClick={fetchLogs}
            className="text-xs font-semibold p-1.5 px-3 rounded-lg bg-white border border-gray-250 text-slate-700 hover:bg-slate-50 cursor-pointer duration-150 flex items-center space-x-1.5 shadow-sm"
          >
            <Activity className="w-3.5 h-3.5 text-slate-500" />
            <span>Sync Audit Logs</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto rounded-xl border border-gray-150 bg-slate-50/50 divide-y divide-gray-150 text-xs max-h-[280px]">
          {loadingLogs ? (
            <div className="text-center py-8 text-slate-400 font-semibold uppercase tracking-wider animate-pulse">Retrieving audit buffers...</div>
          ) : securityLogs.length > 0 ? (
            securityLogs.map(log => (
              <div 
                key={log.id} 
                id={`security-log-${log.id}`}
                className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-white text-[11px] leading-normal"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 flex-wrap text-slate-400 font-medium">
                    <span>
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span>•</span>
                    <span className="text-indigo-600 font-semibold">{log.userEmail}</span>
                    <span>•</span>
                    <span className="text-[10px] font-bold">IP: {log.ipAddress}</span>
                  </div>
                  <p className="text-slate-705 font-semibold text-xs">{log.action}</p>
                </div>
                <div>
                  <span className={getLogSeverityColor(log.severity)}>
                    {log.severity.toUpperCase()}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-slate-400 font-bold">No operational security logs created.</div>
          )}
        </div>
      </div>

    </div>
  );
}
export type { SecurityLog };
