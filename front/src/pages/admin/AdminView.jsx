import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AuthContext } from '@/contexts/AuthContext';
import { getAdminStats, getAgentsPerformance, getAgentsList, getAllTickets, exportPDF, exportExcel, getSessionHistory } from '@/api/admin';
import { AdminOverview } from '@/components/features/admin/AdminOverview';
import { AgentManagement } from '@/components/features/admin/AgentManagement';
import { AdminAssignment } from '@/components/features/admin/AdminAssignment';
import { AdminHistory } from '@/components/features/admin/AdminHistory';
import { AdminSessions } from '@/components/features/admin/AdminSessions';
import { Cpu, Activity, Search, UserCircle, Filter, Calendar as CalendarIcon, X, FileDown, FileSpreadsheet, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AdminView() {
  const { user } = useContext(AuthContext);
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'stats';
  const [stats, setStats] = useState(null);
  const [performances, setPerformances] = useState([]);
  const [agents, setAgents] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Toolbar filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterService, setFilterService] = useState('all');
  const [filterAgent, setFilterAgent] = useState('all');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [assignmentMode, setAssignmentMode] = useState('auto');


  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const filters = {};
      if (filterService !== 'all' && activeTab !== 'sessions') filters.service = filterService;
      if (filterAgent !== 'all' && activeTab !== 'sessions') filters.agent_id = filterAgent;
      if (filterStartDate) filters.start_date = filterStartDate;
      if (filterEndDate) filters.end_date = filterEndDate;

      const sessionFilters = {
        search: searchTerm,
        start_date: filterStartDate,
        end_date: filterEndDate,
      };
      if (filterAgent !== 'all' && activeTab === 'sessions') {
        sessionFilters.role = filterAgent;
      }

      const [s, p, a, t, sess] = await Promise.all([
        getAdminStats(filters).catch(() => null),
        getAgentsPerformance(filters).catch(() => []),
        getAgentsList().catch(() => []),
        getAllTickets(filters).catch(() => []),
        getSessionHistory(sessionFilters).catch(() => []),
      ]);
      setStats(s);
      setPerformances(p);
      setAgents(a);
      setSessions(sess);
      
      // Local search filtering for tickets (frontend only)
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        setTickets(t.filter(ticket => 
          ticket.numero_ticket?.toLowerCase().includes(q) ||
          ticket.client_nom?.toLowerCase().includes(q) ||
          ticket.client_prenom?.toLowerCase().includes(q)
        ));
      } else {
        setTickets(t);
      }
    } catch (err) {
      console.error('Admin fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [filterService, filterAgent, filterStartDate, filterEndDate, searchTerm, activeTab]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleExportPDF = async () => {
    setExporting(true);
    try { await exportPDF(); } catch (e) { alert('Erreur export PDF'); }
    finally { setExporting(false); }
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try { await exportExcel(); } catch (e) { alert('Erreur export Excel'); }
    finally { setExporting(false); }
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterService('all');
    setFilterAgent('all');
    setFilterStartDate('');
    setFilterEndDate('');
  };

  const hasFilters = searchTerm || filterService !== 'all' || filterAgent !== 'all' || filterStartDate || filterEndDate;

  // Get unique services from tickets for filter dropdown
  const serviceTypes = [...new Set(tickets.map(t => t.type_service_libelle).filter(Boolean))];

  return (
    <div className="space-y-10">
      {/* ─── Toolbar ──────────────────────────────────────────── */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8 bg-white p-8 rounded-3xl border shadow-xl">
        {/* Left side - Branding */}
        <div className="flex items-center gap-6">
          <div className="bg-[#0055A4]/5 p-4 rounded-3xl border border-[#0055A4]/10 text-[#0055A4]">
            <Cpu className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">Console Direction Générale</h1>
            <p className="text-emerald-600 font-black text-[10px] uppercase tracking-widest mt-3 flex items-center gap-2">
              <Activity className="w-4 h-4 animate-pulse" /> Supervision Nationale Temps Réel
            </p>
          </div>
        </div>

        {/* Right side - Filters */}
        <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
          {/* Search */}
          <div className="relative flex-1 xl:w-64 min-w-[200px]">
            <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
            <input
              placeholder="Réf / Client / Expert…"
              className="pl-12 h-12 w-full rounded-2xl text-xs font-bold bg-slate-50/50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0055A4]/20 transition-all shadow-inner"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Service filter */}
          {activeTab !== 'sessions' && (
            <div className="flex items-center gap-2">
              <select value={filterService} onChange={(e) => setFilterService(e.target.value)}
                className="h-12 min-w-[12rem] text-[10px] font-black uppercase rounded-2xl shadow-sm bg-white border border-slate-200 px-4 focus:outline-none focus:ring-2 focus:ring-[#0055A4]/20 cursor-pointer">
                <option value="all">Tous Services</option>
                {serviceTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          )}

          {/* Agent filter */}
          <div className="flex items-center gap-2">
            {activeTab === 'sessions' ? (
              <select value={filterAgent} onChange={(e) => setFilterAgent(e.target.value)}
                className="h-12 min-w-[12rem] text-[10px] font-black uppercase rounded-2xl shadow-sm bg-white border border-slate-200 px-4 focus:outline-none focus:ring-2 focus:ring-[#0055A4]/20 cursor-pointer">
                <option value="all">Tous Utilisateurs</option>
                <option value="clients">Clients</option>
                <option value="staff">Staff (Experts, Admins...)</option>
              </select>
            ) : (
              <select value={filterAgent} onChange={(e) => setFilterAgent(e.target.value)}
                className="h-12 min-w-[12rem] text-[10px] font-black uppercase rounded-2xl shadow-sm bg-white border border-slate-200 px-4 focus:outline-none focus:ring-2 focus:ring-[#0055A4]/20 cursor-pointer">
                <option value="all">Tous Experts</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.prenom} {a.nom}</option>)}
              </select>
            )}
          </div>

          {/* Date range */}
          <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-2xl border shadow-inner">
            <CalendarIcon className="w-4 h-4 text-[#0055A4]" />
            <input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)}
              className="h-8 w-32 text-[10px] bg-transparent border-none shadow-none focus:outline-none font-bold p-0" />
            <span className="text-slate-300 font-black text-xs">à</span>
            <input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)}
              className="h-8 w-32 text-[10px] bg-transparent border-none shadow-none focus:outline-none font-bold p-0" />
          </div>

          {/* Reset filters */}
          {hasFilters && (
            <button onClick={handleResetFilters}
              className="h-12 w-12 rounded-2xl text-slate-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center cursor-pointer transition-colors">
              <X className="w-5 h-5" />
            </button>
          )}

          {/* Export buttons (Stats tab only) */}
          {activeTab === 'stats' && (
            <div className="flex items-center gap-2 pl-6 border-l h-12">
              <button 
                onClick={handleExportPDF} disabled={exporting}
                className="flex items-center gap-2 h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#0055A4] bg-[#0055A4]/5 hover:bg-[#0055A4]/10 transition-colors"
              >
                {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                Rapport PDF
              </button>
              <button 
                onClick={handleExportExcel} disabled={exporting}
                className="flex items-center gap-2 h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-colors"
              >
                {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                Export Excel
              </button>
            </div>
          )}

          {/* Assignment mode toggle */}
          <div className="flex items-center gap-4 pl-6 border-l h-12">
            <div className="text-right">
              <label className="text-[9px] font-black uppercase text-slate-400 block tracking-widest">Attribution Auto</label>
              <p className={cn("text-[10px] font-black mt-0.5",
                assignmentMode === 'auto' ? "text-emerald-600" : "text-amber-500"
              )}>
                {assignmentMode === 'auto' ? 'ACTIVÉE' : 'MANUELLE'}
              </p>
            </div>
            <button
              onClick={() => setAssignmentMode(prev => prev === 'auto' ? 'manual' : 'auto')}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer",
                assignmentMode === 'auto' ? "bg-[#0055A4]" : "bg-slate-300"
              )}
            >
              <span className={cn(
                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm",
                assignmentMode === 'auto' ? "translate-x-6" : "translate-x-1"
              )} />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Tab Content ──────────────────────────────────────── */}
      {activeTab === 'stats' && (
        <AdminOverview stats={stats} performances={performances} tickets={tickets} />
      )}

      {activeTab === 'assignment' && assignmentMode === 'manual' && (
        <AdminAssignment tickets={tickets} agents={agents} onRefresh={fetchAll} />
      )}

      {activeTab === 'assignment' && assignmentMode === 'auto' && (
        <div className="bg-white rounded-3xl shadow-xl border p-16 text-center">
          <div className="bg-emerald-50 p-6 rounded-3xl inline-block mb-6">
            <Activity className="w-12 h-12 text-emerald-500" />
          </div>
          <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900 mb-3">Mode Automatique Activé</h2>
          <p className="text-sm font-bold text-slate-400 max-w-lg mx-auto">
            Les tickets sont automatiquement assignés à l'expert le moins chargé. Désactivez le mode auto dans la barre d'outils pour passer en assignation manuelle.
          </p>
        </div>
      )}

      {activeTab === 'agents' && (
        <AgentManagement agents={agents} performances={performances} onRefresh={fetchAll} />
      )}

      {activeTab === 'history' && (
        <AdminHistory tickets={tickets} />
      )}

      {activeTab === 'sessions' && (
        <AdminSessions sessions={sessions} />
      )}
    </div>
  );
}
