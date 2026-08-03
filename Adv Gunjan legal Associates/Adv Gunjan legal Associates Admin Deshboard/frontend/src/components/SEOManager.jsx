import React, { useState, useEffect } from 'react';
import { supabase, backendUrl } from '../supabaseClient';
import {
  FileText,
  AlertTriangle,
  Code,
  CheckCircle,
  Plus,
  Trash2,
  Save,
  Globe,
  Settings
} from 'lucide-react';

export default function SEOManager({ session }) {
  const [seoConfigs, setSeoConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form State
  const [selectedPage, setSelectedPage] = useState(null); // page object or null
  const [isEditing, setIsEditing] = useState(false);
  const [pagePath, setPagePath] = useState('');
  const [title, setTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [ogImage, setOgImage] = useState('');

  // Structured Data (LocalBusiness) State
  const [businessName, setBusinessName] = useState('ADV GUNJAN YADAV & LAW ASSOCIATES');
  const [streetAddress, setStreetAddress] = useState('Civil Court, Raj Nagar');
  const [locality, setLocality] = useState('Ghaziabad');
  const [region, setRegion] = useState('Uttar Pradesh');
  const [postalCode, setPostalCode] = useState('201001');
  const [country, setCountry] = useState('IN');
  const [phone, setPhone] = useState('+919454072550');
  const [latitude, setLatitude] = useState('28.6790798');
  const [longitude, setLongitude] = useState('77.4805055');
  const [barStatus, setBarStatus] = useState('Registered Advocate (UP Bar Council)');
  const [opens, setOpens] = useState('08:00');
  const [closes, setCloses] = useState('21:00');
  const [days, setDays] = useState(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);

  const fetchSEOConfigs = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${backendUrl}/api/admin/seo-config`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load SEO configs');
      }
      setSeoConfigs(data || []);
      
      // Auto-select first page if available
      if (data && data.length > 0 && !selectedPage) {
        selectPage(data[0]);
      }
    } catch (err) {
      setError(err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSEOConfigs();
  }, [session]);

  const selectPage = (page) => {
    setSelectedPage(page);
    setPagePath(page.page_path);
    setTitle(page.title);
    setMetaDescription(page.meta_description);
    setOgImage(page.og_image || '');
    setIsEditing(true);

    // Load structured data if exists
    if (page.structured_data) {
      const sd = page.structured_data;
      setBusinessName(sd.name || 'ADV GUNJAN YADAV & LAW ASSOCIATES');
      if (sd.address) {
        setStreetAddress(sd.address.streetAddress || '');
        setLocality(sd.address.addressLocality || '');
        setRegion(sd.address.addressRegion || '');
        setPostalCode(sd.address.postalCode || '');
        setCountry(sd.address.addressCountry || 'IN');
      }
      setPhone(sd.telephone || '');
      if (sd.geo) {
        setLatitude(sd.geo.latitude || '');
        setLongitude(sd.geo.longitude || '');
      }
      setBarStatus(sd.award || sd.description || '');
      if (sd.openingHoursSpecification) {
        setOpens(sd.openingHoursSpecification.opens || '08:00');
        setCloses(sd.openingHoursSpecification.closes || '21:00');
        setDays(sd.openingHoursSpecification.dayOfWeek || []);
      }
    } else {
      // Set defaults for a new setup
      setStreetAddress('Civil Court, Raj Nagar');
      setLocality('Ghaziabad');
      setRegion('Uttar Pradesh');
      setPostalCode('201001');
      setPhone('+919454072550');
      setLatitude('28.6790798');
      setLongitude('77.4805055');
    }
  };

  const handleAddNew = () => {
    setSelectedPage(null);
    setIsEditing(false);
    setPagePath('/new-page.html');
    setTitle('');
    setMetaDescription('');
    setOgImage('');
  };

  // Generate the JSON-LD schema markup dynamically from states
  const generatedJsonLd = {
    "@context": "https://schema.org",
    "@type": "LegalService",
    "@id": `https://advocategunjanyadav.in${pagePath}#legal-service`,
    "name": businessName,
    "legalName": businessName,
    "image": ogImage || "images/placeholder_advocate.png",
    "url": `https://advocategunjanyadav.in${pagePath}`,
    "telephone": phone,
    "priceRange": "$$",
    "award": barStatus,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": streetAddress,
      "addressLocality": locality,
      "addressRegion": region,
      "postalCode": postalCode,
      "addressCountry": country
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": latitude,
      "longitude": longitude
    },
    "openingHoursSpecification": {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": days,
      "opens": opens,
      "closes": closes
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${backendUrl}/api/admin/seo-config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          page_path: pagePath,
          title,
          meta_description: metaDescription,
          og_image: ogImage,
          structured_data: generatedJsonLd
        })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to save configuration');
      }

      setSuccess(`SEO Config for "${pagePath}" saved successfully.`);
      fetchSEOConfigs();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (pathToDelete) => {
    if (!window.confirm(`Are you sure you want to delete the SEO configuration for ${pathToDelete}?`)) {
      return;
    }

    setError('');
    setSuccess('');
    try {
      const response = await fetch(`${backendUrl}/api/admin/seo-config`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ page_path: pathToDelete })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete configuration');
      }

      setSuccess(`Configuration for ${pathToDelete} deleted.`);
      setSelectedPage(null);
      setIsEditing(false);
      fetchSEOConfigs();
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleDay = (day) => {
    if (days.includes(day)) {
      setDays(days.filter(d => d !== day));
    } else {
      setDays([...days, day]);
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-8 bg-[#031712] min-h-screen text-stone-100 font-sans">
      
      {/* Header */}
      <div className="border-b border-gold-500/10 pb-6">
        <h1 className="text-3xl font-bold font-serif text-white flex items-center gap-2">
          SEO &amp; Schema Manager
        </h1>
        <p className="text-sm text-stone-400 mt-1">
          Configure page titles, descriptions, open graph shares, and LocalBusiness structured data schemas.
        </p>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 bg-red-950/40 border border-red-500/20 rounded-xl text-red-200 text-sm flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-400" />
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-[#115243]/30 border border-gold-500/30 rounded-xl text-gold-400 text-sm flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-gold-400" />
          {success}
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Pages List */}
        <div className="bg-[#072C22]/20 border border-gold-500/10 p-6 rounded-2xl shadow-xl flex flex-col h-[600px]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold font-serif text-white flex items-center gap-2">
              <Globe className="h-5 w-5 text-gold-400" /> Web Pages
            </h3>
            <button
              onClick={handleAddNew}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gold-500/40 text-xs font-semibold text-[#031712] bg-gold-400 hover:bg-gold-500 transition"
            >
              <Plus className="h-3.5 w-3.5" /> Add New
            </button>
          </div>

          <div className="flex-grow overflow-y-auto space-y-2 pr-1">
            {seoConfigs.length > 0 ? (
              seoConfigs.map((page) => (
                <div
                  key={page.page_path}
                  onClick={() => selectPage(page)}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition flex justify-between items-start ${
                    selectedPage && selectedPage.page_path === page.page_path
                      ? 'bg-gold-500/10 border-gold-500/50'
                      : 'bg-[#031712]/50 border-stone-800 hover:border-gold-500/20'
                  }`}
                >
                  <div className="truncate max-w-[80%]">
                    <h4 className="font-semibold text-xs text-white font-mono">{page.page_path}</h4>
                    <p className="text-[11px] text-stone-400 truncate mt-1">{page.title}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(page.page_path);
                    }}
                    className="p-1 text-stone-500 hover:text-red-400 rounded transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            ) : (
              <div className="h-full flex items-center justify-center text-stone-500 text-sm py-12">
                No configurations found. Add one!
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Form Editor (Takes up 2 cols) */}
        <div className="lg:col-span-2 space-y-8 overflow-y-auto max-h-[700px] pr-2">
          
          <form onSubmit={handleSave} className="bg-[#072C22]/20 border border-gold-500/10 p-6 rounded-2xl shadow-2xl space-y-6">
            
            <div className="border-b border-gold-500/10 pb-4 mb-4 flex justify-between items-center">
              <h3 className="text-lg font-bold font-serif text-white flex items-center gap-2">
                <Settings className="h-5 w-5 text-gold-400" />
                {isEditing ? `Edit SEO Configuration: ${pagePath}` : 'Create New SEO Configuration'}
              </h3>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-[#031712] bg-gold-400 hover:bg-gold-500 transition shadow-lg"
              >
                <Save className="h-4 w-4" /> Save Page SEO
              </button>
            </div>

            {/* Page Path & Title */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-gold-400 uppercase tracking-wider mb-2">
                  Page File Path
                </label>
                <input
                  type="text"
                  required
                  placeholder="/index.html"
                  value={pagePath}
                  onChange={(e) => setPagePath(e.target.value)}
                  disabled={isEditing}
                  className="appearance-none rounded-xl relative block w-full px-3 py-2.5 border border-stone-850 bg-[#031712]/50 placeholder-stone-600 text-white text-sm focus:outline-none focus:ring-1 focus:ring-gold-500 disabled:opacity-50"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-semibold text-gold-400 uppercase tracking-wider">
                    SEO Meta Title
                  </label>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                    title.length > 60 ? 'bg-amber-950/40 text-amber-400 border border-amber-500/20' : 'text-stone-400'
                  }`}>
                    {title.length} / 60 chars
                  </span>
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. Criminal Defense Lawyer in Ghaziabad | Advocate Gunjan Yadav"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="appearance-none rounded-xl relative block w-full px-3 py-2.5 border border-stone-850 bg-[#031712]/50 placeholder-stone-600 text-white text-sm focus:outline-none focus:ring-1 focus:ring-gold-500"
                />
                {title.length > 60 && (
                  <p className="text-[10px] text-amber-400 mt-1 flex items-center gap-1 font-sans">
                    ⚠️ Title exceeds optimal SEO size (60 chars) and might be truncated in Google search.
                  </p>
                )}
              </div>
            </div>

            {/* Meta Description */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold text-gold-400 uppercase tracking-wider">
                  Meta Description
                </label>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                  metaDescription.length > 160 ? 'bg-amber-950/40 text-amber-400 border border-amber-500/20' : 'text-stone-400'
                }`}>
                  {metaDescription.length} / 160 chars
                </span>
              </div>
              <textarea
                required
                rows={3}
                placeholder="Write a concise overview of the page content including services, locations, and call-to-actions..."
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                className="appearance-none rounded-xl relative block w-full px-3 py-2.5 border border-stone-850 bg-[#031712]/50 placeholder-stone-600 text-white text-sm focus:outline-none focus:ring-1 focus:ring-gold-500 font-sans"
              />
              {metaDescription.length > 160 && (
                <p className="text-[10px] text-amber-400 mt-1 flex items-center gap-1 font-sans">
                  ⚠️ Meta description exceeds optimal size (160 chars). Try to make it shorter for best CTR.
                </p>
              )}
            </div>

            {/* Open Graph Image */}
            <div>
              <label className="block text-xs font-semibold text-gold-400 uppercase tracking-wider mb-2">
                Social Share Image (OG Image URL)
              </label>
              <input
                type="text"
                placeholder="e.g. images/advocate-portrait.png"
                value={ogImage}
                onChange={(e) => setOgImage(e.target.value)}
                className="appearance-none rounded-xl relative block w-full px-3 py-2.5 border border-stone-850 bg-[#031712]/50 placeholder-stone-600 text-white text-sm focus:outline-none focus:ring-1 focus:ring-gold-500 font-sans"
              />
            </div>

            {/* Structured Data Section */}
            <div className="border-t border-gold-500/10 pt-6 space-y-6">
              <div>
                <h4 className="text-md font-bold font-serif text-white flex items-center gap-2">
                  <Code className="h-5 w-5 text-gold-400" />
                  LocalBusiness Structured Schema Generator
                </h4>
                <p className="text-xs text-stone-400 mt-1">
                  Fill out this schema card to automate high-ranking LocalBusiness JSON-LD markup on this page.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[11px] font-bold text-stone-300 uppercase tracking-wider mb-1">
                    Business / Law Practice Name
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-stone-850 bg-[#031712]/50 text-stone-200 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-300 uppercase tracking-wider mb-1">
                    Bar Association Status
                  </label>
                  <input
                    type="text"
                    value={barStatus}
                    onChange={(e) => setBarStatus(e.target.value)}
                    className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-stone-850 bg-[#031712]/50 text-stone-200 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-stone-300 uppercase tracking-wider mb-1">
                    Street Address (Office Suite)
                  </label>
                  <input
                    type="text"
                    value={streetAddress}
                    onChange={(e) => setStreetAddress(e.target.value)}
                    className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-stone-850 bg-[#031712]/50 text-stone-200 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-300 uppercase tracking-wider mb-1">
                    Business Phone
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-stone-850 bg-[#031712]/50 text-stone-200 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-stone-300 uppercase tracking-wider mb-1">
                    City / Locality
                  </label>
                  <input
                    type="text"
                    value={locality}
                    onChange={(e) => setLocality(e.target.value)}
                    className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-stone-850 bg-[#031712]/50 text-stone-200 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-300 uppercase tracking-wider mb-1">
                    State / Region
                  </label>
                  <input
                    type="text"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-stone-850 bg-[#031712]/50 text-stone-200 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-300 uppercase tracking-wider mb-1">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-stone-850 bg-[#031712]/50 text-stone-200 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-300 uppercase tracking-wider mb-1">
                    Country Code
                  </label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-stone-850 bg-[#031712]/50 text-stone-200 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-stone-300 uppercase tracking-wider mb-1">
                    Office Latitude
                  </label>
                  <input
                    type="text"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-stone-850 bg-[#031712]/50 text-stone-200 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-300 uppercase tracking-wider mb-1">
                    Office Longitude
                  </label>
                  <input
                    type="text"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-stone-850 bg-[#031712]/50 text-stone-200 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-300 uppercase tracking-wider mb-1">
                    Opens At
                  </label>
                  <input
                    type="time"
                    value={opens}
                    onChange={(e) => setOpens(e.target.value)}
                    className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-stone-850 bg-[#031712]/50 text-stone-200 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-300 uppercase tracking-wider mb-1">
                    Closes At
                  </label>
                  <input
                    type="time"
                    value={closes}
                    onChange={(e) => setCloses(e.target.value)}
                    className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-stone-850 bg-[#031712]/50 text-stone-200 text-xs focus:outline-none"
                  />
                </div>
              </div>

              {/* Day Selection */}
              <div>
                <label className="block text-[11px] font-bold text-stone-300 uppercase tracking-wider mb-2">
                  Operating Days
                </label>
                <div className="flex flex-wrap gap-2">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                    const active = days.includes(day);
                    return (
                      <button
                        type="button"
                        key={day}
                        onClick={() => toggleDay(day)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                          active
                            ? 'bg-gold-500/10 border-gold-500 text-gold-400'
                            : 'bg-[#031712]/40 border-stone-800 text-stone-400'
                        }`}
                      >
                        {day.substring(0, 3)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* JSON LD Live Code Preview */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-gold-400 uppercase tracking-wider">
                    Generated JSON-LD Schema Snippet
                  </label>
                  <span className="text-[10px] text-stone-400 font-sans">Automatically injected into site script tag</span>
                </div>
                <div className="relative">
                  <pre className="bg-[#031712] border border-stone-800 p-4 rounded-xl text-stone-300 font-mono text-[10px] overflow-x-auto max-h-48 leading-normal">
                    {JSON.stringify(generatedJsonLd, null, 2)}
                  </pre>
                </div>
              </div>

            </div>

          </form>

        </div>

      </div>

    </div>
  );
}
