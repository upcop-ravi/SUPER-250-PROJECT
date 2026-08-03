import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import {
  Users,
  Activity,
  MousePointer,
  MapPin,
  TrendingUp,
  Globe,
  Radio,
  FileText,
  Clock,
  PhoneCall,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';

export default function Dashboard() {
  const [trafficLogs, setTrafficLogs] = useState([]);
  const [intentClicks, setIntentClicks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [geoFilter, setGeoFilter] = useState('All'); // 'All', 'Ghaziabad', 'Lucknow'
  const [realtimeEvents, setRealtimeEvents] = useState([]);

  // Fetch initial data
  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: logs, error: logsError } = await supabase
        .from('traffic_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (logsError) throw logsError;

      const { data: clicks, error: clicksError } = await supabase
        .from('intent_clicks')
        .select('*')
        .order('created_at', { ascending: false });

      if (clicksError) throw clicksError;

      setTrafficLogs(logs || []);
      setIntentClicks(clicks || []);

      // Seed initial realtime events from recent activity
      const initialEvents = [];
      const recentLogs = (logs || []).slice(0, 10);
      const recentClicks = (clicks || []).slice(0, 10);
      
      recentLogs.forEach(l => {
        initialEvents.push({
          id: `log-${l.id}`,
          type: 'pageview',
          page_url: l.page_url,
          city: l.city,
          created_at: l.created_at,
          details: `Visited ${l.page_url}`
        });
      });
      recentClicks.forEach(c => {
        const log = (logs || []).find(l => l.id === c.traffic_log_id);
        initialEvents.push({
          id: `click-${c.id}`,
          type: 'click',
          page_url: log ? log.page_url : 'Unknown Page',
          city: log ? log.city : 'Unknown',
          created_at: c.created_at,
          details: `Clicked ${c.service_category || c.element_id} (${c.element_id})`
        });
      });

      // Sort by time descending
      initialEvents.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setRealtimeEvents(initialEvents.slice(0, 15));

    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Subscribe to real-time events on Supabase
    const logsChannel = supabase.channel('traffic-logs-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'traffic_logs' }, (payload) => {
        const newLog = payload.new;
        setTrafficLogs(prev => [newLog, ...prev]);
        setRealtimeEvents(prev => [
          {
            id: `log-${newLog.id}`,
            type: 'pageview',
            page_url: newLog.page_url,
            city: newLog.city,
            created_at: newLog.created_at,
            details: `Visited ${newLog.page_url}`
          },
          ...prev
        ].slice(0, 15));
      })
      .subscribe();

    const clicksChannel = supabase.channel('intent-clicks-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'intent_clicks' }, (payload) => {
        const newClick = payload.new;
        setIntentClicks(prev => [newClick, ...prev]);

        // Find associated page view path if cached
        setRealtimeEvents(prev => [
          {
            id: `click-${newClick.id}`,
            type: 'click',
            page_url: 'Active Session Link',
            city: 'Active Visitor',
            created_at: newClick.created_at,
            details: `Clicked ${newClick.service_category || newClick.element_id}`
          },
          ...prev
        ].slice(0, 15));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(logsChannel);
      supabase.removeChannel(clicksChannel);
    };
  }, []);

  // Filter logs and clicks based on geographic selection
  const filteredData = useMemo(() => {
    if (geoFilter === 'All') {
      return { logs: trafficLogs, clicks: intentClicks };
    }
    const filteredLogs = trafficLogs.filter(l => l.city && l.city.toLowerCase() === geoFilter.toLowerCase());
    const logIds = new Set(filteredLogs.map(l => l.id));
    const filteredClicks = intentClicks.filter(c => logIds.has(c.traffic_log_id) || (c.session_id && filteredLogs.some(l => l.session_id === c.session_id)));
    
    return { logs: filteredLogs, clicks: filteredClicks };
  }, [trafficLogs, intentClicks, geoFilter]);

  // Compute KPI metrics
  const stats = useMemo(() => {
    const logs = filteredData.logs;
    const clicks = filteredData.clicks;

    const totalPageViews = logs.length;
    const uniqueSessions = new Set(logs.map(l => l.session_id)).size;
    const uniqueVisitors = new Set(logs.map(l => l.ip_address)).size;

    // High value conversion rate: unique sessions with click / total unique sessions
    const clickSessions = new Set(clicks.map(c => c.session_id)).size;
    const conversionRate = uniqueSessions > 0 ? (clickSessions / uniqueSessions) * 100 : 0;

    return {
      totalPageViews,
      uniqueSessions,
      uniqueVisitors,
      conversionRate: conversionRate.toFixed(1)
    };
  }, [filteredData]);

  // Compute Visitor Requirements Matrix (Practice area stats)
  const serviceMatrix = useMemo(() => {
    const clicks = filteredData.clicks;
    const counts = {};

    clicks.forEach(c => {
      if (c.service_category) {
        counts[c.service_category] = (counts[c.service_category] || 0) + 1;
      }
    });

    const totalClicks = Object.values(counts).reduce((a, b) => a + b, 0);

    return Object.keys(counts).map(category => {
      const count = counts[category];
      const percentage = totalClicks > 0 ? ((count / totalClicks) * 100).toFixed(0) : 0;
      return {
        category,
        count,
        percentage: Number(percentage)
      };
    }).sort((a, b) => b.count - a.count);
  }, [filteredData]);

  // Chart data aggregation: traffic over time (last 7 days)
  const chartData = useMemo(() => {
    const logs = filteredData.logs;
    const dailyData = {};

    // Group logs by date (local timezone format YYYY-MM-DD)
    logs.forEach(l => {
      const date = new Date(l.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
      if (!dailyData[date]) {
        dailyData[date] = { date, pageViews: 0, sessions: new Set() };
      }
      dailyData[date].pageViews += 1;
      dailyData[date].sessions.add(l.session_id);
    });

    return Object.keys(dailyData).map(date => ({
      date,
      "Page Views": dailyData[date].pageViews,
      "Sessions": dailyData[date].sessions.size
    })).reverse().slice(-7); // take last 7 days
  }, [filteredData]);

  // Colors for service category bar charts
  const barColors = ['#D4AF37', '#C5A059', '#856A32', '#115243', '#1e8e72'];

  if (loading) {
    return (
      <div className="p-8 space-y-8 animate-pulse bg-[#031712]">
        {/* Metric Skeletons */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="h-28 bg-[#072C22]/30 rounded-2xl border border-gold-500/10"></div>
          ))}
        </div>
        {/* Main Section Skeletons */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 h-96 bg-[#072C22]/30 rounded-2xl border border-gold-500/10"></div>
          <div className="h-96 bg-[#072C22]/30 rounded-2xl border border-gold-500/10"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 space-y-8 bg-[#031712] min-h-screen text-stone-100">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gold-500/10 pb-6">
        <div>
          <h1 className="text-3xl font-bold font-serif text-white flex items-center gap-2">
            Analytics Overview
          </h1>
          <p className="text-sm text-stone-400 font-sans mt-1">
            Real-time visual telemetry and service category demand tracker
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 bg-[#072C22]/40 border border-gold-500/20 p-1.5 rounded-xl self-end sm:self-auto shadow-inner">
          <button
            onClick={() => setGeoFilter('All')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg font-sans transition-all ${
              geoFilter === 'All'
                ? 'bg-gold-500 text-[#031712] shadow-md'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            All Areas
          </button>
          <button
            onClick={() => setGeoFilter('Ghaziabad')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg font-sans transition-all flex items-center gap-1.5 ${
              geoFilter === 'Ghaziabad'
                ? 'bg-gold-500 text-[#031712] shadow-md'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <MapPin className="h-3.5 w-3.5" /> Ghaziabad
          </button>
          <button
            onClick={() => setGeoFilter('Lucknow')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg font-sans transition-all flex items-center gap-1.5 ${
              geoFilter === 'Lucknow'
                ? 'bg-gold-500 text-[#031712] shadow-md'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <MapPin className="h-3.5 w-3.5" /> Lucknow
          </button>
          <button
            onClick={fetchData}
            title="Refresh statistics"
            className="p-2 text-stone-400 hover:text-white hover:bg-gold-500/10 rounded-lg transition"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#072C22]/30 border border-gold-500/10 p-6 rounded-2xl shadow-xl flex items-center gap-4 transition hover:border-gold-500/30">
          <div className="p-3.5 bg-gold-500/10 border border-gold-500/20 text-gold-400 rounded-xl">
            <Globe className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider font-sans">Total Page Views</p>
            <h3 className="text-2xl font-bold text-white mt-1 font-serif">{stats.totalPageViews}</h3>
          </div>
        </div>

        <div className="bg-[#072C22]/30 border border-gold-500/10 p-6 rounded-2xl shadow-xl flex items-center gap-4 transition hover:border-gold-500/30">
          <div className="p-3.5 bg-gold-500/10 border border-gold-500/20 text-gold-400 rounded-xl">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider font-sans">Unique Sessions</p>
            <h3 className="text-2xl font-bold text-white mt-1 font-serif">{stats.uniqueSessions}</h3>
          </div>
        </div>

        <div className="bg-[#072C22]/30 border border-gold-500/10 p-6 rounded-2xl shadow-xl flex items-center gap-4 transition hover:border-gold-500/30">
          <div className="p-3.5 bg-gold-500/10 border border-gold-500/20 text-gold-400 rounded-xl">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider font-sans">Unique Visitors</p>
            <h3 className="text-2xl font-bold text-white mt-1 font-serif">{stats.uniqueVisitors}</h3>
          </div>
        </div>

        <div className="bg-[#072C22]/30 border border-gold-500/10 p-6 rounded-2xl shadow-xl flex items-center gap-4 transition hover:border-gold-500/30">
          <div className="p-3.5 bg-gold-500/10 border border-gold-500/20 text-gold-400 rounded-xl">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider font-sans">Conversion Rate</p>
            <h3 className="text-2xl font-bold text-white mt-1 font-serif">{stats.conversionRate}%</h3>
          </div>
        </div>
      </div>

      {/* Main Charts & Analytics Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Line Chart Section */}
        <div className="lg:col-span-2 bg-[#072C22]/20 border border-gold-500/10 p-6 rounded-2xl shadow-2xl flex flex-col justify-between">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold font-serif text-white flex items-center gap-2">
              Traffic Trends
            </h2>
            <span className="text-xs font-sans text-stone-400 bg-[#072C22]/40 px-3 py-1.5 rounded-lg border border-gold-500/10">Last 7 Days</span>
          </div>

          <div className="h-72 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C5A059" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#C5A059" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1e8e72" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#1e8e72" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#072C22/30" opacity={0.2} />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#072C22', borderColor: '#C5A059', borderRadius: '12px' }}
                    labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="Page Views" stroke="#C5A059" strokeWidth={2} fillOpacity={1} fill="url(#colorPv)" />
                  <Area type="monotone" dataKey="Sessions" stroke="#1e8e72" strokeWidth={2} fillOpacity={1} fill="url(#colorSessions)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-stone-500 text-sm font-sans">
                No traffic data recorded in this period.
              </div>
            )}
          </div>
        </div>

        {/* Visitor Requirements Matrix */}
        <div className="bg-[#072C22]/20 border border-gold-500/10 p-6 rounded-2xl shadow-2xl flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold font-serif text-white flex items-center gap-2 mb-2">
              <FolderOpen className="h-5 w-5 text-gold-400" /> Legal Intent Matrix
            </h2>
            <p className="text-xs text-stone-400 font-sans mb-4">
              Breakdown of practice areas capturing high-value user clicks and inquiries
            </p>
          </div>

          <div className="space-y-4 flex-grow overflow-y-auto max-h-72 pr-1">
            {serviceMatrix.length > 0 ? (
              serviceMatrix.map((item, index) => (
                <div key={item.category} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-sans">
                    <span className="font-semibold text-stone-200">{item.category}</span>
                    <span className="text-gold-400 font-medium">{item.count} clicks ({item.percentage}%)</span>
                  </div>
                  <div className="w-full bg-[#031712] rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${item.percentage}%`,
                        backgroundColor: barColors[index % barColors.length]
                      }}
                    ></div>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex items-center justify-center text-stone-500 text-sm font-sans py-12">
                No click actions captured yet.
              </div>
            )}
          </div>

          {serviceMatrix.length > 0 && (
            <div className="border-t border-gold-500/10 pt-4 mt-4 text-[11px] text-stone-400 leading-relaxed font-sans">
              💡 <span className="font-semibold text-stone-300">{serviceMatrix[0].category}</span> represents {serviceMatrix[0].percentage}% of total legal inquiries in this segment.
            </div>
          )}
        </div>
      </div>

      {/* Real-time Telemetry Stream & User Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Real-Time Live Feed */}
        <div className="bg-[#072C22]/20 border border-gold-500/10 p-6 rounded-2xl shadow-2xl lg:col-span-1 flex flex-col h-[400px]">
          <div className="flex justify-between items-center mb-4 border-b border-gold-500/10 pb-3">
            <h2 className="text-lg font-bold font-serif text-white flex items-center gap-2">
              <Radio className="h-5 w-5 text-red-500 animate-pulse" /> Live Stream
            </h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-950/40 text-red-400 border border-red-500/20 font-sans">
              REALTIME
            </span>
          </div>

          <div className="flex-grow overflow-y-auto space-y-3 pr-1 font-sans">
            {realtimeEvents.length > 0 ? (
              realtimeEvents.map((evt) => (
                <div
                  key={evt.id}
                  className={`p-3 rounded-xl border text-xs leading-relaxed transition ${
                    evt.type === 'click'
                      ? 'bg-gold-500/5 border-gold-500/20'
                      : 'bg-[#031712]/50 border-stone-800'
                  }`}
                >
                  <div className="flex justify-between text-[10px] text-stone-400 mb-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-stone-500" /> {evt.city || 'Unknown Location'}
                    </span>
                    <span>{new Date(evt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                  </div>
                  <div className="text-white font-medium break-all">{evt.details}</div>
                  <div className="text-[10px] text-stone-500 mt-0.5 font-mono truncate">{evt.page_url}</div>
                </div>
              ))
            ) : (
              <div className="h-full flex items-center justify-center text-stone-500 text-sm py-12">
                Waiting for web traffic activity...
              </div>
            )}
          </div>
        </div>

        {/* Visitor Device & Browser Metrics */}
        <div className="bg-[#072C22]/20 border border-gold-500/10 p-6 rounded-2xl shadow-2xl lg:col-span-2 flex flex-col h-[400px]">
          <div className="flex justify-between items-center mb-4 border-b border-gold-500/10 pb-3">
            <h2 className="text-lg font-bold font-serif text-white flex items-center gap-2">
              <MousePointer className="h-5 w-5 text-gold-400" /> Logged Activities
            </h2>
            <span className="text-xs text-stone-400 font-sans">All Page Requests</span>
          </div>

          <div className="flex-grow overflow-y-auto pr-1">
            <table className="min-w-full divide-y divide-gold-500/10 font-sans">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-stone-400 uppercase tracking-wider">Time</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-stone-400 uppercase tracking-wider">Page URL</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-stone-400 uppercase tracking-wider">City</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold text-stone-400 uppercase tracking-wider">Device / Browser</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold-500/5 text-xs">
                {filteredData.logs.length > 0 ? (
                  filteredData.logs.slice(0, 100).map((log) => (
                    <tr key={log.id} className="hover:bg-gold-500/5 transition">
                      <td className="px-3 py-2.5 text-stone-400 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })} at{' '}
                        {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-3 py-2.5 text-white font-medium truncate max-w-[200px]" title={log.page_url}>
                        {log.page_url}
                      </td>
                      <td className="px-3 py-2.5 text-stone-300 whitespace-nowrap">
                        {log.city || 'Unknown'}, {log.region || ''}
                      </td>
                      <td className="px-3 py-2.5 text-stone-400 whitespace-nowrap">
                        <span className="px-1.5 py-0.5 rounded bg-[#031712] border border-stone-800 text-[10px] font-mono mr-1">
                          {log.device_type}
                        </span>
                        {log.browser} on {log.os}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center py-12 text-stone-500 text-sm">
                      No logs found matching selection.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
