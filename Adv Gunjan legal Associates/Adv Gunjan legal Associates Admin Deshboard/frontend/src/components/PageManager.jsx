import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Save, 
  Plus, 
  Trash2, 
  Search, 
  Globe, 
  Code, 
  Eye, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw,
  ExternalLink,
  Layers,
  Edit3
} from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export default function PageManager({ session }) {
  const [pages, setPages] = useState([]);
  const [selectedFilename, setSelectedFilename] = useState('index.html');
  const [activeTab, setActiveTab] = useState('fields'); // 'fields', 'code', 'preview'
  const [searchQuery, setSearchQuery] = useState('');
  
  // Page Data State
  const [pageData, setPageData] = useState({
    filename: '',
    title: '',
    metaDescription: '',
    ogTitle: '',
    ogDescription: '',
    ogImage: '',
    content: ''
  });

  const [loadingList, setLoadingList] = useState(true);
  const [loadingPage, setLoadingPage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Modal State for New Page Creation
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPageForm, setNewPageForm] = useState({
    filename: '',
    title: '',
    metaDescription: '',
    pageHeading: ''
  });

  // Get Auth Token
  const getAuthToken = () => {
    return session?.access_token || 'superadmin-local-access-token';
  };

  // Fetch list of pages from backend
  const fetchPages = async () => {
    setLoadingList(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/pages`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setPages(data.pages);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to load pages' });
      }
    } catch (err) {
      console.error('Error fetching pages:', err);
      setMessage({ type: 'error', text: 'Could not connect to backend server' });
    } finally {
      setLoadingList(false);
    }
  };

  // Fetch details of selected page
  const fetchPageDetails = async (filename) => {
    setLoadingPage(true);
    setMessage({ type: '', text: '' });
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/pages/read?filename=${encodeURIComponent(filename)}`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setPageData({
          filename: data.filename,
          title: data.title || '',
          metaDescription: data.metaDescription || '',
          ogTitle: data.ogTitle || '',
          ogDescription: data.ogDescription || '',
          ogImage: data.ogImage || '',
          content: data.content || ''
        });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to load page content' });
      }
    } catch (err) {
      console.error('Error reading page:', err);
      setMessage({ type: 'error', text: 'Error connecting to server' });
    } finally {
      setLoadingPage(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, []);

  useEffect(() => {
    if (selectedFilename) {
      fetchPageDetails(selectedFilename);
    }
  }, [selectedFilename]);

  // Save changes to current page
  const handleSavePage = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const payload = {
        filename: pageData.filename,
        content: activeTab === 'code' ? pageData.content : null,
        title: pageData.title,
        metaDescription: pageData.metaDescription,
        ogTitle: pageData.ogTitle,
        ogDescription: pageData.ogDescription,
        ogImage: pageData.ogImage
      };

      const res = await fetch(`${BACKEND_URL}/api/admin/pages/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        setMessage({ type: 'success', text: `Page ${data.filename} saved and updated successfully!` });
        fetchPages();
        // Reload details if saved via fields tab
        if (activeTab === 'fields') {
          fetchPageDetails(pageData.filename);
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save page' });
      }
    } catch (err) {
      console.error('Save error:', err);
      setMessage({ type: 'error', text: 'Failed to connect to backend server' });
    } finally {
      setSaving(false);
    }
  };

  // Create New Page
  const handleCreatePage = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/pages/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify(newPageForm)
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: `Created page ${data.filename} successfully!` });
        setShowCreateModal(false);
        setNewPageForm({ filename: '', title: '', metaDescription: '', pageHeading: '' });
        await fetchPages();
        setSelectedFilename(data.filename);
      } else {
        alert(data.error || 'Error creating page');
      }
    } catch (err) {
      alert('Failed to connect to backend server');
    } finally {
      setSaving(false);
    }
  };

  // Delete Page
  const handleDeletePage = async () => {
    if (selectedFilename === 'index.html') {
      alert('The home page (index.html) cannot be deleted.');
      return;
    }
    if (!window.confirm(`Are you sure you want to permanently delete ${selectedFilename}?`)) {
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/pages/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({ filename: selectedFilename })
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: `Page ${selectedFilename} deleted.` });
        await fetchPages();
        setSelectedFilename('index.html');
      } else {
        alert(data.error || 'Error deleting page');
      }
    } catch (err) {
      alert('Failed to connect to server');
    }
  };

  // Filtered list
  const filteredPages = pages.filter(p => 
    p.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#072C22]/60 backdrop-blur-xl p-6 rounded-2xl border border-gold-500/20 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 bg-gold-500/10 border border-gold-400/30 rounded-xl flex items-center justify-center">
            <Layers className="h-6 w-6 text-gold-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-serif text-white flex items-center gap-3">
              Dynamic Website Page Manager
              <span className="text-xs font-mono font-bold bg-gold-500/20 text-gold-300 px-3 py-1 rounded-full border border-gold-500/30">
                {pages.length} Active Pages
              </span>
            </h1>
            <p className="text-xs text-stone-400 font-sans mt-0.5">
              Edit page meta tags, Open Graph previews, and HTML content across your entire site dynamically
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-[#031712] font-bold text-xs transition shadow-lg"
          >
            <Plus className="h-4 w-4" />
            Create New Page
          </button>
          
          <button
            onClick={fetchPages}
            className="p-2.5 rounded-xl bg-[#031712]/60 border border-stone-800 text-stone-300 hover:text-white hover:border-gold-500/30 transition"
            title="Refresh Pages List"
          >
            <RefreshCw className={`h-4 w-4 ${loadingList ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Pages List Browser (4 cols) */}
        <div className="lg:col-span-4 bg-[#072C22]/40 backdrop-blur-xl rounded-2xl border border-gold-500/20 p-4 space-y-4 flex flex-col h-[750px]">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-stone-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search 49 website pages..."
              className="w-full pl-9 pr-3 py-2 bg-[#031712]/80 border border-stone-800 rounded-xl text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-gold-500"
            />
          </div>

          {/* List Scroll Area */}
          <div className="flex-grow overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {loadingList ? (
              <div className="flex flex-col items-center justify-center h-48 space-y-2 text-stone-400 text-xs">
                <RefreshCw className="h-6 w-6 animate-spin text-gold-400" />
                <span>Loading pages...</span>
              </div>
            ) : filteredPages.length === 0 ? (
              <div className="text-center py-12 text-stone-500 text-xs font-sans">
                No matching pages found.
              </div>
            ) : (
              filteredPages.map((page) => {
                const isSelected = selectedFilename === page.filename;
                return (
                  <button
                    key={page.filename}
                    onClick={() => setSelectedFilename(page.filename)}
                    className={`w-full text-left p-3 rounded-xl border transition flex items-start justify-between gap-3 ${
                      isSelected
                        ? 'bg-gold-500/15 border-gold-500/60 shadow-lg'
                        : 'bg-[#031712]/40 border-stone-800/80 hover:border-gold-500/30 hover:bg-[#031712]/80'
                    }`}
                  >
                    <div className="space-y-1 truncate">
                      <div className="flex items-center gap-2">
                        <FileText className={`h-3.5 w-3.5 flex-shrink-0 ${isSelected ? 'text-gold-400' : 'text-stone-400'}`} />
                        <span className={`text-xs font-mono font-bold truncate ${isSelected ? 'text-gold-300' : 'text-white'}`}>
                          {page.filename}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-400 font-sans truncate pl-5">
                        {page.title}
                      </p>
                    </div>

                    <span className="text-[10px] font-mono text-stone-500 bg-stone-900/60 px-2 py-0.5 rounded border border-stone-800 flex-shrink-0">
                      {(page.sizeBytes / 1024).toFixed(0)}KB
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Page Content & Editor (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Notifications Alert */}
          {message.text && (
            <div className={`p-4 rounded-xl text-xs font-bold flex items-center justify-between border ${
              message.type === 'success' 
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' 
                : 'bg-red-950/40 border-red-500/40 text-red-300'
            }`}>
              <div className="flex items-center gap-2">
                {message.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <span>{message.text}</span>
              </div>
              <button onClick={() => setMessage({ type: '', text: '' })} className="text-stone-400 hover:text-white">✕</button>
            </div>
          )}

          {/* Top Bar for Selected Page */}
          <div className="bg-[#072C22]/40 backdrop-blur-xl rounded-2xl border border-gold-500/20 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gold-400" />
                  {pageData.filename}
                </h2>
                <a
                  href={`https://upcop-ravi.github.io/advgunjanyadav/${pageData.filename}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-gold-400 hover:underline inline-flex items-center gap-1 font-sans"
                >
                  Live Link <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                Path: <code className="text-stone-300 font-mono text-[11px]">{pageData.filename}</code>
              </p>
            </div>

            {/* Action Buttons & Tab Switcher */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
              <div className="flex bg-[#031712]/80 p-1 rounded-xl border border-stone-800">
                <button
                  onClick={() => setActiveTab('fields')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                    activeTab === 'fields' ? 'bg-gold-500 text-[#031712] font-bold shadow' : 'text-stone-400 hover:text-white'
                  }`}
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  Visual Form
                </button>

                <button
                  onClick={() => setActiveTab('code')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                    activeTab === 'code' ? 'bg-gold-500 text-[#031712] font-bold shadow' : 'text-stone-400 hover:text-white'
                  }`}
                >
                  <Code className="h-3.5 w-3.5" />
                  Source Code
                </button>

                <button
                  onClick={() => setActiveTab('preview')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                    activeTab === 'preview' ? 'bg-gold-500 text-[#031712] font-bold shadow' : 'text-stone-400 hover:text-white'
                  }`}
                >
                  <Eye className="h-3.5 w-3.5" />
                  Preview
                </button>
              </div>

              <button
                onClick={handleSavePage}
                disabled={saving || loadingPage}
                className="flex items-center gap-2 px-4 py-2 bg-gold-400 hover:bg-gold-500 text-[#031712] font-bold text-xs rounded-xl transition shadow-lg disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" />
                {saving ? 'Saving...' : 'Save & Publish'}
              </button>

              {selectedFilename !== 'index.html' && (
                <button
                  onClick={handleDeletePage}
                  className="p-2 bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-400 rounded-xl transition"
                  title="Delete Page"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Main Content Card */}
          <div className="bg-[#072C22]/40 backdrop-blur-xl rounded-2xl border border-gold-500/20 p-6 min-h-[600px]">
            {loadingPage ? (
              <div className="flex flex-col items-center justify-center h-96 space-y-3 text-stone-400">
                <RefreshCw className="h-8 w-8 animate-spin text-gold-400" />
                <span className="text-xs font-sans">Reading page contents and meta tags...</span>
              </div>
            ) : activeTab === 'fields' ? (
              
              /* Visual Form Editor */
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-serif font-bold text-gold-400 border-b border-gold-500/20 pb-2 mb-4">
                    SEO & Page Header Meta Tags
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-stone-300 mb-1">
                        Page Title (&lt;title&gt;)
                      </label>
                      <input
                        type="text"
                        value={pageData.title}
                        onChange={(e) => setPageData({ ...pageData, title: e.target.value })}
                        className="w-full px-3 py-2 bg-[#031712]/80 border border-stone-800 rounded-xl text-xs text-white focus:outline-none focus:border-gold-500"
                        placeholder="Page Title"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-300 mb-1">
                        Meta Description
                      </label>
                      <textarea
                        rows={3}
                        value={pageData.metaDescription}
                        onChange={(e) => setPageData({ ...pageData, metaDescription: e.target.value })}
                        className="w-full px-3 py-2 bg-[#031712]/80 border border-stone-800 rounded-xl text-xs text-white focus:outline-none focus:border-gold-500"
                        placeholder="Meta Description..."
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-serif font-bold text-gold-400 border-b border-gold-500/20 pb-2 mb-4">
                    Open Graph & Social Media Share Meta
                  </h3>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-stone-300 mb-1">
                          OG Title (og:title)
                        </label>
                        <input
                          type="text"
                          value={pageData.ogTitle}
                          onChange={(e) => setPageData({ ...pageData, ogTitle: e.target.value })}
                          className="w-full px-3 py-2 bg-[#031712]/80 border border-stone-800 rounded-xl text-xs text-white focus:outline-none focus:border-gold-500"
                          placeholder="Open Graph Title"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-stone-300 mb-1">
                          OG Image URL (og:image)
                        </label>
                        <input
                          type="text"
                          value={pageData.ogImage}
                          onChange={(e) => setPageData({ ...pageData, ogImage: e.target.value })}
                          className="w-full px-3 py-2 bg-[#031712]/80 border border-stone-800 rounded-xl text-xs text-white focus:outline-none focus:border-gold-500 font-mono text-[11px]"
                          placeholder="https://..."
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-300 mb-1">
                        OG Description (og:description)
                      </label>
                      <textarea
                        rows={2}
                        value={pageData.ogDescription}
                        onChange={(e) => setPageData({ ...pageData, ogDescription: e.target.value })}
                        className="w-full px-3 py-2 bg-[#031712]/80 border border-stone-800 rounded-xl text-xs text-white focus:outline-none focus:border-gold-500"
                        placeholder="Open Graph Description..."
                      />
                    </div>
                  </div>
                </div>

                {/* Open Graph Card Social Preview */}
                {pageData.ogImage && (
                  <div className="bg-[#031712] p-4 rounded-xl border border-gold-500/20 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-gold-400 tracking-wider">Social Share Card Preview</span>
                    <div className="border border-stone-800 rounded-xl overflow-hidden max-w-sm bg-stone-900">
                      <img src={pageData.ogImage} alt="OG Preview" className="w-full h-40 object-cover" onError={(e) => e.target.style.display = 'none'} />
                      <div className="p-3 space-y-1">
                        <p className="text-xs font-bold text-white truncate">{pageData.ogTitle || pageData.title}</p>
                        <p className="text-[11px] text-stone-400 line-clamp-2">{pageData.ogDescription || pageData.metaDescription}</p>
                        <p className="text-[9px] font-mono text-gold-500">upcop-ravi.github.io</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

            ) : activeTab === 'code' ? (
              
              /* Code Editor */
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs text-stone-400 font-mono">
                  <span>HTML Source Editor ({pageData.content.split('\n').length} Lines)</span>
                  <span>UTF-8 Encoding</span>
                </div>
                <textarea
                  value={pageData.content}
                  onChange={(e) => setPageData({ ...pageData, content: e.target.value })}
                  className="w-full h-[520px] bg-[#031712] border border-stone-800 rounded-xl p-4 text-xs font-mono text-stone-200 focus:outline-none focus:border-gold-500 leading-relaxed resize-none"
                  spellCheck={false}
                />
              </div>

            ) : (

              /* Live Preview */
              <div className="space-y-2 h-[560px]">
                <div className="flex justify-between items-center text-xs text-stone-400 font-mono">
                  <span>Live Sandbox Render Frame</span>
                  <a 
                    href={`https://upcop-ravi.github.io/advgunjanyadav/${pageData.filename}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-gold-400 hover:underline flex items-center gap-1"
                  >
                    Open Live in New Tab <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <iframe
                  srcDoc={pageData.content}
                  title="Page Preview"
                  className="w-full h-[520px] bg-white rounded-xl border border-stone-800 shadow-inner"
                />
              </div>

            )}
          </div>

        </div>

      </div>

      {/* Modal: Create New Page */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-[#072C22] border border-gold-500/30 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center border-b border-gold-500/20 pb-3">
              <h3 className="text-lg font-serif font-bold text-white flex items-center gap-2">
                <Plus className="h-5 w-5 text-gold-400" />
                Create New Page
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-stone-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreatePage} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gold-400 uppercase tracking-wider mb-1">
                  Filename (.html)
                </label>
                <input
                  type="text"
                  required
                  value={newPageForm.filename}
                  onChange={(e) => setNewPageForm({ ...newPageForm, filename: e.target.value })}
                  placeholder="e.g. corporate-lawyer-noida.html"
                  className="w-full px-3 py-2 bg-[#031712] border border-stone-800 rounded-xl text-xs text-white focus:outline-none focus:border-gold-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gold-400 uppercase tracking-wider mb-1">
                  Page Title (&lt;title&gt;)
                </label>
                <input
                  type="text"
                  required
                  value={newPageForm.title}
                  onChange={(e) => setNewPageForm({ ...newPageForm, title: e.target.value })}
                  placeholder="e.g. Best Corporate Lawyer in Noida | Advocate Gunjan Yadav"
                  className="w-full px-3 py-2 bg-[#031712] border border-stone-800 rounded-xl text-xs text-white focus:outline-none focus:border-gold-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gold-400 uppercase tracking-wider mb-1">
                  Meta Description
                </label>
                <textarea
                  rows={2}
                  value={newPageForm.metaDescription}
                  onChange={(e) => setNewPageForm({ ...newPageForm, metaDescription: e.target.value })}
                  placeholder="Comprehensive corporate legal consultancy in Noida..."
                  className="w-full px-3 py-2 bg-[#031712] border border-stone-800 rounded-xl text-xs text-white focus:outline-none focus:border-gold-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gold-400 uppercase tracking-wider mb-1">
                  Hero Page Heading (H1)
                </label>
                <input
                  type="text"
                  value={newPageForm.pageHeading}
                  onChange={(e) => setNewPageForm({ ...newPageForm, pageHeading: e.target.value })}
                  placeholder="e.g. Corporate Law Services"
                  className="w-full px-3 py-2 bg-[#031712] border border-stone-800 rounded-xl text-xs text-white focus:outline-none focus:border-gold-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gold-500/20">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-gold-400 hover:bg-gold-500 text-[#031712] font-bold text-xs rounded-xl shadow-lg"
                >
                  {saving ? 'Creating...' : 'Create Page'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
