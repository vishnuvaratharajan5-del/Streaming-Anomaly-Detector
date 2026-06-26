/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { FileText, Download, Copy, Check, Search, Calendar, BookOpen } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { secureFetch } from '../utils/api.js';

interface DocumentInfo {
  id: string;
  name: string;
  displayName: string;
  size: number;
  updatedAt: string;
  type: string;
}

interface SelectedDocument {
  id: string;
  displayName: string;
  content: string;
}

interface DocumentsViewProps {
  token: string | null;
}

export default function DocumentsView({ token }: DocumentsViewProps) {
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [selectedContent, setSelectedContent] = useState<SelectedDocument | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch documents list on mount
  useEffect(() => {
    async function fetchDocs() {
      try {
        setIsLoadingList(true);
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        const res = await secureFetch('/api/documents', { headers });
        if (!res.ok) {
          throw new Error('Could not retrieve project SOP documentation list');
        }
        const data = await res.json();
        setDocuments(data);
        if (data.length > 0) {
          setSelectedDocId(data[0].id);
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Error occurred loading documents list.');
      } finally {
        setIsLoadingList(false);
      }
    }
    fetchDocs();
  }, [token]);

  // Fetch document contents when selectedDocId changes
  useEffect(() => {
    if (!selectedDocId) return;

    async function fetchDocContent() {
      try {
        setIsLoadingContent(true);
        setErrorMsg('');
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await secureFetch(`/api/documents/${selectedDocId}`, { headers });
        if (!res.ok) {
          throw new Error('Failed to load document content');
        }
        const data = await res.json();
        setSelectedContent(data);
      } catch (err: any) {
        setErrorMsg(err.message || 'Error loading document content.');
      } finally {
        setIsLoadingContent(false);
      }
    }
    fetchDocContent();
  }, [selectedDocId, token]);

  const handleCopy = () => {
    if (!selectedContent) return;
    navigator.clipboard.writeText(selectedContent.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const cleanBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const handleDownloadPDF = async () => {
    if (!selectedContent) return;
    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await secureFetch(`/api/documents/${selectedContent.id}/download`, { headers });
      if (!response.ok) {
        throw new Error('Failed to download source PDF from server archive');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${selectedContent.displayName}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error downloading PDF file.');
    }
  };

  const filteredDocs = documents.filter(doc => 
    doc.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div id="documents-view" className="flex flex-col h-full bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      
      {/* Top Banner Header */}
      <div className="p-4 border-b border-gray-200 bg-slate-50 flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-sm font-bold text-slate-800 flex items-center space-x-2 uppercase tracking-wide">
            <BookOpen className="w-4 h-4 text-indigo-650" />
            <span>SOP Standards & System Documentation</span>
          </h2>
          <p className="text-xs text-slate-450 mt-0.5">
            Access secure local standards, validation guidelines, and structural telemetry blueprints.
          </p>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Hand Document Directory List */}
        <div className="w-80 border-r border-gray-200 bg-slate-50/50 flex flex-col shrink-0">
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
              <input
                id="doc-search-input"
                type="text"
                placeholder="Search metrics manual index..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg py-1.5 pl-9 pr-3 text-xs text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {isLoadingList ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-2">
                <span className="w-5 h-5 rounded-full border-2 border-slate-300 border-t-indigo-600 animate-spin"></span>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Scanning manual files...</p>
              </div>
            ) : filteredDocs.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6 font-semibold">No matching manuals found.</p>
            ) : (
              filteredDocs.map((doc) => {
                const isSelected = doc.id === selectedDocId;
                return (
                  <button
                    key={doc.id}
                    id={`doc-item-${doc.id}`}
                    onClick={() => setSelectedDocId(doc.id)}
                    className={`w-full text-left p-3 rounded-xl transition-all border flex items-start space-x-3 group ${
                      isSelected 
                        ? 'bg-indigo-600 border-indigo-700 text-white shadow-sm' 
                        : 'bg-transparent border-transparent hover:bg-slate-100/50 text-slate-600 hover:text-slate-800'
                    }`}
                  >
                    <FileText className={`w-4 h-4 mt-0.5 shrink-0 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate tracking-wide">{doc.displayName}</p>
                      <div className="flex items-center space-x-2 mt-1.5 text-[9px] font-bold uppercase">
                        <span className={`px-1 py-0.5 rounded border ${isSelected ? 'bg-indigo-700 border-indigo-800 text-indigo-100' : 'bg-slate-100 border-gray-200 text-slate-500'}`}>
                          {cleanBytes(doc.size)}
                        </span>
                        <span className={isSelected ? 'text-indigo-200' : 'text-slate-400'}>•</span>
                        <span className={isSelected ? 'text-indigo-200' : 'text-slate-400'}>{doc.type}</span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Hand Document Viewer Panel */}
        <div className="flex-1 bg-[#f8fafc]/40 flex flex-col overflow-hidden">
          {errorMsg && (
            <div className="m-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-semibold">
              {errorMsg}
            </div>
          )}

          {isLoadingContent ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-3">
              <span className="w-8 h-8 rounded-full border-2 border-slate-200 border-l-indigo-600 animate-spin"></span>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Rendering manual body...</p>
            </div>
          ) : selectedContent ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              
              {/* Document Sub-Header Control Bar */}
              <div className="px-4 py-3 bg-white border-b border-gray-200 flex justify-between items-center shrink-0 shadow-sm z-10">
                <div className="flex items-center space-x-3.5">
                  <div className="text-left">
                    <h3 className="text-xs font-bold text-slate-800 tracking-wide select-text">
                      {selectedContent.displayName}.pdf
                    </h3>
                    <p className="text-[10px] text-slate-450 font-bold mt-0.5 flex items-center space-x-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 grayscale" />
                      <span>Last system synchronization: Today (2026-06-09)</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    id="doc-btn-copy"
                    onClick={handleCopy}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-gray-200 rounded-lg text-[11px] font-semibold text-slate-650 transition-all cursor-pointer shadow-sm"
                    title="Copy Source text"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>

                  <button
                    id="doc-btn-download"
                    onClick={handleDownloadPDF}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-semibold transition-all cursor-pointer shadow-sm"
                    title="Download raw manual"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-200" />
                    <span>Download PDF</span>
                  </button>
                </div>
              </div>

              {/* Real Content Scope Rendering */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8 select-text bg-[#f8fafc]/40">
                <div id="sop-document-container" className="max-w-3xl mx-auto prose prose-slate prose-sm text-slate-700 leading-relaxed font-sans select-text">
                  <div className="markdown-body">
                    <ReactMarkdown>{selectedContent.content}</ReactMarkdown>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <FileText className="w-10 h-10 text-slate-305 stroke-[1.5] mb-2" />
              <p className="text-xs font-semibold text-slate-400">
                Select a standard SOP artifact from the index directory to view instruction guidelines.
              </p>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
