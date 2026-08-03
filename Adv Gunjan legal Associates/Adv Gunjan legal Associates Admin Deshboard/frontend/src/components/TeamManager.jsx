import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Edit,
  Trash2,
  Search,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Upload,
  ArrowUp,
  ArrowDown,
  X,
  Plus,
  GraduationCap,
  Award,
  Eye,
  EyeOff
} from 'lucide-react';

export default function TeamManager({ session }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Notification Toast state
  const [toast, setToast] = useState(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  
  // Delete Confirm State
  const [deletingMember, setDeletingMember] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Image Upload State
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    bio: '',
    image: 'images/advocate-portrait.png',
    education: '',
    expertise: '',
    facebook: '#',
    instagram: '#',
    twitter: '#',
    linkedin: '#',
    category: 'lawyer',
    active: true
  });

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const getAuthHeader = () => {
    const token = session?.access_token || localStorage.getItem('admin_custom_session_token') || 'superadmin-local-access-token';
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const fetchTeamMembers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/admin/team`, {
        headers: getAuthHeader()
      });
      const data = await res.json();
      if (data.success) {
        setMembers(data.members || []);
      } else {
        showToast(data.error || 'Failed to load team members', 'error');
      }
    } catch (err) {
      console.error('Error fetching team:', err);
      showToast('Error connecting to backend server', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingMember(null);
    setFormData({
      name: '',
      role: 'Associate',
      bio: '',
      image: 'images/advocate-portrait.png',
      education: 'LL.B.',
      expertise: 'Civil Litigation, Criminal Defense',
      facebook: '#',
      instagram: '#',
      twitter: '#',
      linkedin: '#',
      category: 'lawyer',
      active: true
    });
    setImagePreview('images/advocate-portrait.png');
    setImageFile(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (member) => {
    setEditingMember(member);
    const eduStr = Array.isArray(member.education) ? member.education.join(', ') : (member.education || '');
    const expStr = Array.isArray(member.expertise) ? member.expertise.join(', ') : (member.expertise || '');
    
    setFormData({
      name: member.name || '',
      role: member.role || '',
      bio: member.bio || '',
      image: member.image || 'images/advocate-portrait.png',
      education: eduStr,
      expertise: expStr,
      facebook: member.socialLinks?.facebook || '#',
      instagram: member.socialLinks?.instagram || '#',
      twitter: member.socialLinks?.twitter || '#',
      linkedin: member.socialLinks?.linkedin || '#',
      category: member.category || 'lawyer',
      active: member.active !== false
    });
    setImagePreview(member.image || 'images/advocate-portrait.png');
    setImageFile(null);
    setShowModal(true);
  };

  const handleImageFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadImageFile = async () => {
    if (!imageFile) return formData.image;
    setUploadingImage(true);
    try {
      const reader = new FileReader();
      const base64Promise = new Promise((resolve) => {
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(imageFile);
      });
      const base64Data = await base64Promise;

      const res = await fetch(`${backendUrl}/api/admin/team/upload-image`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify({
          imageData: base64Data,
          filename: imageFile.name
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Image uploaded successfully', 'success');
        return data.imagePath;
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (err) {
      console.error('Image upload error:', err);
      showToast('Image upload failed: ' + err.message, 'error');
      return formData.image;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Please enter a team member name', 'error');
      return;
    }

    setSubmitting(true);
    try {
      let finalImagePath = formData.image;
      if (imageFile) {
        finalImagePath = await handleUploadImageFile();
      }

      const payload = {
        name: formData.name.trim(),
        role: formData.role.trim(),
        bio: formData.bio.trim(),
        image: finalImagePath,
        education: formData.education.split(',').map(s => s.trim()).filter(Boolean),
        expertise: formData.expertise.split(',').map(s => s.trim()).filter(Boolean),
        socialLinks: {
          facebook: formData.facebook.trim() || '#',
          instagram: formData.instagram.trim() || '#',
          twitter: formData.twitter.trim() || '#',
          linkedin: formData.linkedin.trim() || '#'
        },
        category: formData.category,
        active: formData.active
      };

      let res, data;
      if (editingMember) {
        res = await fetch(`${backendUrl}/api/admin/team/${editingMember.id}`, {
          method: 'PUT',
          headers: getAuthHeader(),
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch(`${backendUrl}/api/admin/team`, {
          method: 'POST',
          headers: getAuthHeader(),
          body: JSON.stringify(payload)
        });
      }

      data = await res.json();
      if (data.success) {
        showToast(editingMember ? 'Team member updated & website synced!' : 'New team member added & website synced!', 'success');
        setShowModal(false);
        fetchTeamMembers();
      } else {
        showToast(data.error || 'Failed to save member', 'error');
      }
    } catch (err) {
      console.error('Save error:', err);
      showToast('Error saving team member: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMember = async (id) => {
    setSubmitting(true);
    try {
      const res = await fetch(`${backendUrl}/api/admin/team/${id}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });
      const data = await res.json();
      if (data.success) {
        showToast('Team member removed from website!', 'success');
        setDeletingMember(null);
        fetchTeamMembers();
      } else {
        showToast(data.error || 'Failed to delete team member', 'error');
      }
    } catch (err) {
      console.error('Delete error:', err);
      showToast('Error deleting team member: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (member) => {
    try {
      const updatedActive = !member.active;
      const res = await fetch(`${backendUrl}/api/admin/team/${member.id}`, {
        method: 'PUT',
        headers: getAuthHeader(),
        body: JSON.stringify({ active: updatedActive })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Member status changed to ${updatedActive ? 'Active' : 'Inactive'}`, 'success');
        fetchTeamMembers();
      }
    } catch (err) {
      showToast('Error toggling member status', 'error');
    }
  };

  const handleMoveMember = async (index, direction) => {
    const newMembers = [...members];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newMembers.length) return;

    // Swap items
    const temp = newMembers[index];
    newMembers[index] = newMembers[targetIndex];
    newMembers[targetIndex] = temp;

    setMembers(newMembers);

    // Call backend reorder API
    try {
      const orderedIds = newMembers.map(m => m.id);
      const res = await fetch(`${backendUrl}/api/admin/team/reorder`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify({ orderedIds })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Team order updated & website synced!', 'success');
      }
    } catch (err) {
      showToast('Failed to save team reordering', 'error');
      fetchTeamMembers();
    }
  };

  // Filtered members list
  const filteredMembers = members.filter(m => {
    const matchesSearch = (m.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (m.role || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (m.bio || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || m.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border text-sm font-semibold transition-all duration-300 animate-slide-in ${
          toast.type === 'error'
            ? 'bg-red-950/90 border-red-500/40 text-red-200'
            : 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="h-5 w-5 text-red-400" /> : <CheckCircle className="h-5 w-5 text-emerald-400" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#072C22] via-[#0B3B2E] to-[#031712] p-6 md:p-8 rounded-2xl border border-gold-500/20 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gold-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-gold-500/10 border border-gold-400/30 rounded-xl flex items-center justify-center">
              <Users className="h-5 w-5 text-gold-400" />
            </div>
            <h1 className="font-serif text-2xl md:text-3xl font-bold text-white tracking-tight">Team Members Control</h1>
          </div>
          <p className="text-stone-300 text-xs md:text-sm font-sans max-w-2xl">
            Add, update, or remove legal advocates &amp; support staff. Changes auto-sync to <code className="text-gold-400 bg-black/40 px-1.5 py-0.5 rounded">team.html</code> on the website.
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={fetchTeamMembers}
            className="p-3 bg-white/5 border border-gold-500/20 rounded-xl text-stone-300 hover:text-white hover:bg-white/10 transition"
            title="Refresh Team List"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2.5 px-6 py-3 bg-gradient-to-r from-gold-500 to-amber-500 text-[#031712] font-bold text-xs md:text-sm uppercase tracking-wider rounded-xl shadow-lg hover:from-gold-400 hover:to-amber-400 transition-all transform hover:-translate-y-0.5"
          >
            <UserPlus className="h-4 w-4" />
            Add New Member
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-[#072C22]/30 p-4 rounded-xl border border-gold-500/10">
        {/* Search */}
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-stone-400" />
          <input
            type="text"
            placeholder="Search by name, role or expertise..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#031712] border border-gold-500/20 rounded-xl pl-10 pr-4 py-2.5 text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:border-gold-400 transition"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          {['all', 'lawyer', 'support_staff'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                selectedCategory === cat
                  ? 'bg-gold-500 text-[#031712]'
                  : 'bg-white/5 text-stone-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {cat === 'all' ? 'All Team' : cat === 'lawyer' ? 'Advocates' : 'Support Staff'}
            </button>
          ))}
        </div>
      </div>

      {/* Team Members Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gold-400"></div>
          <p className="text-stone-400 text-sm">Loading team roster...</p>
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="bg-[#072C22]/20 border border-gold-500/10 rounded-2xl p-12 text-center space-y-4">
          <Users className="h-12 w-12 text-stone-500 mx-auto" />
          <h3 className="text-lg font-serif text-white font-bold">No Team Members Found</h3>
          <p className="text-stone-400 text-xs max-w-md mx-auto">
            {searchQuery ? 'No member matched your search query.' : 'Click "Add New Member" to add advocates or support staff to the team page.'}
          </p>
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold-500 text-[#031712] font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-gold-400 transition"
          >
            <Plus className="h-4 w-4" /> Add Team Member
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMembers.map((member, index) => (
            <div
              key={member.id}
              className={`bg-[#072C22]/30 border rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 hover:border-gold-500/40 hover:shadow-xl ${
                member.active === false ? 'opacity-50 border-red-500/20' : 'border-gold-500/15'
              }`}
            >
              <div className="space-y-4">
                {/* Top Bar: Reorder Controls + Status Badge */}
                <div className="flex items-center justify-between border-b border-gold-500/10 pb-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleMoveMember(index, 'up')}
                      disabled={index === 0}
                      className="p-1 text-stone-400 hover:text-gold-400 disabled:opacity-20 disabled:hover:text-stone-400 transition"
                      title="Move Up"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleMoveMember(index, 'down')}
                      disabled={index === filteredMembers.length - 1}
                      className="p-1 text-stone-400 hover:text-gold-400 disabled:opacity-20 disabled:hover:text-stone-400 transition"
                      title="Move Down"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <span className="text-[10px] text-stone-500 font-mono ml-1">#{index + 1}</span>
                  </div>

                  <button
                    onClick={() => handleToggleActive(member)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition ${
                      member.active !== false
                        ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                        : 'bg-red-500/10 border border-red-500/30 text-red-400'
                    }`}
                  >
                    {member.active !== false ? (
                      <>
                        <Eye className="h-3 w-3" /> Visible
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-3 w-3" /> Hidden
                      </>
                    )}
                  </button>
                </div>

                {/* Member Profile Info */}
                <div className="flex gap-4 items-start">
                  <img
                    src={member.image ? (member.image.startsWith('http') ? member.image : `/${member.image}`) : '/images/advocate-portrait.png'}
                    alt={member.name}
                    className="w-20 h-20 rounded-xl object-cover border-2 border-gold-500/30 bg-black/40 flex-shrink-0"
                    onError={(e) => {
                      e.target.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(member.name) + '&background=072C22&color=C5A059';
                    }}
                  />

                  <div className="space-y-1 overflow-hidden">
                    <h3 className="font-serif text-lg font-bold text-white truncate" title={member.name}>
                      {member.name}
                    </h3>
                    <p className="text-gold-400 text-xs font-semibold truncate" title={member.role}>
                      {member.role || 'Associate'}
                    </p>
                    <span className="inline-block text-[10px] uppercase font-bold text-stone-400 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                      {member.category === 'support_staff' ? 'Support Staff' : 'Advocate'}
                    </span>
                  </div>
                </div>

                {/* Bio text */}
                <p className="text-stone-300 text-xs line-clamp-3 leading-relaxed border-t border-gold-500/10 pt-3">
                  {member.bio || 'No biography details provided.'}
                </p>

                {/* Education & Expertise Badges */}
                <div className="space-y-2 text-[11px]">
                  {member.education && member.education.length > 0 && (
                    <div className="flex items-start gap-1.5">
                      <GraduationCap className="h-3.5 w-3.5 text-gold-400 flex-shrink-0 mt-0.5" />
                      <div className="flex flex-wrap gap-1">
                        {(Array.isArray(member.education) ? member.education : [member.education]).map((edu, idx) => (
                          <span key={idx} className="bg-white/5 text-stone-300 px-2 py-0.5 rounded text-[10px] border border-white/5">
                            {edu}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {member.expertise && member.expertise.length > 0 && (
                    <div className="flex items-start gap-1.5">
                      <Award className="h-3.5 w-3.5 text-gold-400 flex-shrink-0 mt-0.5" />
                      <div className="flex flex-wrap gap-1">
                        {(Array.isArray(member.expertise) ? member.expertise : [member.expertise]).map((exp, idx) => (
                          <span key={idx} className="bg-gold-500/10 text-gold-300 px-2 py-0.5 rounded text-[10px] border border-gold-500/20">
                            {exp}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 border-t border-gold-500/10 pt-4 mt-4">
                <button
                  onClick={() => handleOpenEditModal(member)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-gold-500/10 hover:bg-gold-500/20 border border-gold-500/30 text-gold-400 font-bold text-xs rounded-xl transition"
                >
                  <Edit className="h-3.5 w-3.5" /> Edit Data
                </button>

                <button
                  onClick={() => setDeletingMember(member)}
                  className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl transition"
                  title="Remove from Team"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADD / EDIT MEMBER MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#072C22] border border-gold-500/30 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 space-y-6 shadow-2xl animate-fade-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gold-500/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 bg-gold-500/10 border border-gold-400/30 rounded-xl flex items-center justify-center">
                  <UserPlus className="h-5 w-5 text-gold-400" />
                </div>
                <div>
                  <h3 className="font-serif text-xl font-bold text-white">
                    {editingMember ? 'Edit Team Member' : 'Add New Team Member'}
                  </h3>
                  <p className="text-stone-400 text-xs">
                    {editingMember ? 'Update details for ' + editingMember.name : 'Fill in the details to publish a new advocate to website'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-stone-400 hover:text-white p-1"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitForm} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-stone-300 text-xs font-bold uppercase tracking-wider mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Adv. John Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-[#031712] border border-gold-500/20 rounded-xl px-4 py-2.5 text-sm text-stone-100 placeholder-stone-500 focus:border-gold-400 focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-stone-300 text-xs font-bold uppercase tracking-wider mb-1">
                    Role / Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Senior Associate (Civil & Revenue)"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full bg-[#031712] border border-gold-500/20 rounded-xl px-4 py-2.5 text-sm text-stone-100 placeholder-stone-500 focus:border-gold-400 focus:outline-none transition"
                  />
                </div>
              </div>

              {/* Category & Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-stone-300 text-xs font-bold uppercase tracking-wider mb-1">
                    Team Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-[#031712] border border-gold-500/20 rounded-xl px-4 py-2.5 text-sm text-stone-100 focus:border-gold-400 focus:outline-none transition"
                  >
                    <option value="lawyer">Advocate / Legal Counsel</option>
                    <option value="support_staff">Support Staff (Clerk / Paralegal)</option>
                  </select>
                </div>

                <div className="flex items-center gap-3 pt-6">
                  <input
                    type="checkbox"
                    id="active-check"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="w-5 h-5 accent-gold-500 rounded cursor-pointer"
                  />
                  <label htmlFor="active-check" className="text-stone-300 text-xs font-bold uppercase tracking-wider cursor-pointer">
                    Show Member on Team Page
                  </label>
                </div>
              </div>

              {/* Biography */}
              <div>
                <label className="block text-stone-300 text-xs font-bold uppercase tracking-wider mb-1">
                  Biography / Summary
                </label>
                <textarea
                  rows="3"
                  placeholder="Describe member background, experience, and courtroom strategy..."
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  className="w-full bg-[#031712] border border-gold-500/20 rounded-xl px-4 py-2.5 text-sm text-stone-100 placeholder-stone-500 focus:border-gold-400 focus:outline-none transition"
                ></textarea>
              </div>

              {/* Image Input Section */}
              <div className="space-y-2 border-t border-gold-500/10 pt-4">
                <label className="block text-stone-300 text-xs font-bold uppercase tracking-wider">
                  Profile Photo (Upload or URL)
                </label>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Preview Image */}
                  <img
                    src={imagePreview || 'images/advocate-portrait.png'}
                    alt="Preview"
                    className="w-16 h-16 rounded-xl object-cover border-2 border-gold-500/30 bg-black/40 flex-shrink-0"
                    onError={(e) => {
                      e.target.src = 'https://ui-avatars.com/api/?name=Member&background=072C22&color=C5A059';
                    }}
                  />

                  <div className="space-y-2 flex-grow w-full">
                    {/* File Upload Button */}
                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-gold-500/20 rounded-xl text-xs font-bold text-stone-300 transition">
                        <Upload className="h-3.5 w-3.5 text-gold-400" />
                        Choose File to Upload
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageFileChange}
                          className="hidden"
                        />
                      </label>
                      {imageFile && <span className="text-xs text-gold-400 font-mono truncate">{imageFile.name}</span>}
                    </div>

                    {/* Or URL input */}
                    <input
                      type="text"
                      placeholder="Or paste image relative path (e.g. images/adv-ram-laxman-tiwari.png)"
                      value={formData.image}
                      onChange={(e) => {
                        setFormData({ ...formData, image: e.target.value });
                        if (!imageFile) setImagePreview(e.target.value);
                      }}
                      className="w-full bg-[#031712] border border-gold-500/20 rounded-xl px-4 py-2 text-xs text-stone-200 placeholder-stone-500 focus:border-gold-400 focus:outline-none transition"
                    />
                  </div>
                </div>
              </div>

              {/* Education & Expertise */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gold-500/10 pt-4">
                <div>
                  <label className="block text-stone-300 text-xs font-bold uppercase tracking-wider mb-1">
                    Education (Comma-Separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. LL.M (Criminal Law), LL.B"
                    value={formData.education}
                    onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                    className="w-full bg-[#031712] border border-gold-500/20 rounded-xl px-4 py-2.5 text-sm text-stone-100 placeholder-stone-500 focus:border-gold-400 focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-stone-300 text-xs font-bold uppercase tracking-wider mb-1">
                    Expertise Areas (Comma-Separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Civil Litigation, Revenue Appeals"
                    value={formData.expertise}
                    onChange={(e) => setFormData({ ...formData, expertise: e.target.value })}
                    className="w-full bg-[#031712] border border-gold-500/20 rounded-xl px-4 py-2.5 text-sm text-stone-100 placeholder-stone-500 focus:border-gold-400 focus:outline-none transition"
                  />
                </div>
              </div>

              {/* Social Links */}
              <div className="space-y-3 border-t border-gold-500/10 pt-4">
                <label className="block text-stone-300 text-xs font-bold uppercase tracking-wider">
                  Social Links (Optional)
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Facebook Profile URL"
                    value={formData.facebook}
                    onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                    className="bg-[#031712] border border-gold-500/20 rounded-xl px-3 py-2 text-xs text-stone-200 placeholder-stone-500 focus:border-gold-400 focus:outline-none transition"
                  />
                  <input
                    type="text"
                    placeholder="Instagram Profile URL"
                    value={formData.instagram}
                    onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                    className="bg-[#031712] border border-gold-500/20 rounded-xl px-3 py-2 text-xs text-stone-200 placeholder-stone-500 focus:border-gold-400 focus:outline-none transition"
                  />
                  <input
                    type="text"
                    placeholder="Twitter/X Profile URL"
                    value={formData.twitter}
                    onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                    className="bg-[#031712] border border-gold-500/20 rounded-xl px-3 py-2 text-xs text-stone-200 placeholder-stone-500 focus:border-gold-400 focus:outline-none transition"
                  />
                  <input
                    type="text"
                    placeholder="LinkedIn Profile URL"
                    value={formData.linkedin}
                    onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                    className="bg-[#031712] border border-gold-500/20 rounded-xl px-3 py-2 text-xs text-stone-200 placeholder-stone-500 focus:border-gold-400 focus:outline-none transition"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 border-t border-gold-500/10 pt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-stone-600 text-stone-300 font-bold text-xs uppercase tracking-wider hover:bg-white/5 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || uploadingImage}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-gold-500 to-amber-500 text-[#031712] font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg hover:from-gold-400 hover:to-amber-400 disabled:opacity-50 transition"
                >
                  {submitting || uploadingImage ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" /> Saving &amp; Syncing Website...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" /> Save &amp; Sync Website
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {deletingMember && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#072C22] border border-red-500/30 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-white">Delete Team Member</h3>
                <p className="text-stone-400 text-xs">Confirm removing from website roster</p>
              </div>
            </div>

            <p className="text-stone-300 text-sm leading-relaxed">
              Are you sure you want to delete <strong className="text-white font-bold">{deletingMember.name}</strong>? This will remove their profile card from the team page on the website.
            </p>

            <div className="flex items-center justify-end gap-3 border-t border-gold-500/10 pt-4">
              <button
                onClick={() => setDeletingMember(null)}
                className="px-4 py-2 rounded-xl border border-stone-600 text-stone-300 font-bold text-xs uppercase tracking-wider hover:bg-white/5 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteMember(deletingMember.id)}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-5 py-2 bg-red-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg hover:bg-red-600 disabled:opacity-50 transition"
              >
                {submitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
