'use client';

import React, { useState, useEffect, use } from 'react';
import {
  Users,
  UserPlus,
  ShieldCheck,
  Phone,
  Trash2,
  Lock,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Building2,
  Search,
  KeyRound,
  X,
  Check,
  Plus
} from 'lucide-react';

interface AssignedWardSummary {
  id: string;
  name: string;
  ward_number: string;
}

interface StaffMember {
  id: string;
  full_name: string;
  phone: string;
  role: 'ADMIN' | 'VOLUNTEER';
  is_active: boolean;
  created_at: string;
  assigned_ward_id: string | null;
  assigned_ward_ids?: string[];
  assigned_wards?: AssignedWardSummary[];
  ward?: {
    id: string;
    name: string;
    ward_number: string;
  };
}

interface Ward {
  id: string;
  ward_number: string;
  name: string;
}

export default function StaffManagementPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const resolvedParams = use(params);
  const orgParam = resolvedParams.orgId;

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Add Member Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'VOLUNTEER'>('VOLUNTEER');
  const [selectedWardIds, setSelectedWardIds] = useState<string[]>([]);
  const [pin, setPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch staff list and wards
  const loadData = async () => {
    try {
      setLoading(true);
      const [sRes, wRes] = await Promise.all([
        fetch(`/api/management/staff?orgId=${orgParam}`),
        fetch(`/api/organizations/${orgParam}`),
      ]);
      const sData = await sRes.json();
      const wData = await wRes.json();

      if (sData.staff) setStaff(sData.staff);
      if (wData.wards) {
        setWards(wData.wards);
      }
    } catch (e) {
      console.error('Failed to load staff roster:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [orgParam]);

  // Toggle single ward in multi-select
  const toggleWard = (wardId: string) => {
    setSelectedWardIds((prev) =>
      prev.includes(wardId)
        ? prev.filter((id) => id !== wardId)
        : [...prev, wardId]
    );
  };

  // Select / Deselect all wards
  const toggleSelectAllWards = () => {
    if (selectedWardIds.length === wards.length) {
      setSelectedWardIds([]);
    } else {
      setSelectedWardIds(wards.map((w) => w.id));
    }
  };

  // Handle Add Staff
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!fullName.trim() || !phone.trim() || !pin.trim()) {
      setFormError('Please fill in all required fields');
      return;
    }

    if (pin.length !== 4 || isNaN(Number(pin))) {
      setFormError('PIN must be exactly 4 digits');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/management/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          phone: phone.replace(/\D/g, '').slice(-10),
          role,
          pin,
          assignedWardIds: role === 'VOLUNTEER' ? selectedWardIds : [],
          organizationId: orgParam,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Reset & Reload
      setShowAddModal(false);
      setFullName('');
      setPhone('');
      setPin('');
      setSelectedWardIds([]);
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to add staff member');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Staff
  const handleDeleteMember = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to revoke access for ${name}?`)) return;

    try {
      const res = await fetch(`/api/management/staff?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadData();
      } else {
        alert('Failed to delete staff member');
      }
    } catch {
      alert('Network error while deleting staff member');
    }
  };

  const filteredStaff = staff.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return s.full_name.toLowerCase().includes(q) || s.phone.includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">
                  Add Staff or Field Volunteer
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAddMember} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Mobile Number (WhatsApp)
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                    +91
                  </div>
                  <input
                    type="tel"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="9848012345"
                    className="w-full h-10 pl-11 pr-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Role & Permissions
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('VOLUNTEER')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      role === 'VOLUNTEER'
                        ? 'bg-blue-50 border-blue-600 text-blue-700'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    <span>Field Volunteer</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('ADMIN')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      role === 'ADMIN'
                        ? 'bg-blue-50 border-blue-600 text-blue-700'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    <span>Secretariat Admin</span>
                  </button>
                </div>
              </div>

              {/* N-Ward Multi-Selection Matrix */}
              {role === 'VOLUNTEER' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Assigned Wards / Areas ({selectedWardIds.length === 0 ? 'All' : selectedWardIds.length})
                    </label>
                    <button
                      type="button"
                      onClick={toggleSelectAllWards}
                      className="text-[11px] text-blue-600 hover:underline font-bold"
                    >
                      {selectedWardIds.length === wards.length ? 'Deselect All' : 'Select All Wards'}
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-500 mb-2">
                    Select one or multiple wards this volunteer covers. Leaving empty grants access to all wards.
                  </p>

                  <div className="max-h-48 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                    {wards.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-2">No wards configured yet</p>
                    ) : (
                      wards.map((w) => {
                        const isSelected = selectedWardIds.includes(w.id);
                        return (
                          <div
                            key={w.id}
                            onClick={() => toggleWard(w.id)}
                            className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-xs transition border ${
                              isSelected
                                ? 'bg-blue-50 border-blue-300 text-blue-900 font-semibold'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/70'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300 shrink-0">
                                {w.ward_number || '#'}
                              </span>
                              <span className="truncate">{w.name}</span>
                            </div>
                            <div
                              className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                                isSelected
                                  ? 'bg-blue-600 border-blue-600 text-white'
                                  : 'border-slate-300 bg-white'
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  4-Digit Login PIN
                </label>
                <input
                  type="password"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="e.g. 1234"
                  className="w-full h-10 px-3 font-mono font-bold tracking-widest text-center text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  The staff member will use this PIN to log into their dashboard.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Adding...' : 'Grant Access'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Top Title & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold uppercase tracking-wider border border-blue-200">
            ZERO-TRUST ACCESS CONTROL
          </span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Staff & Field Volunteer Whitelist
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Only pre-whitelisted phone numbers can log in and view grievance assignments.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Volunteer / Staff</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search staff by name or phone..."
            className="w-full h-9 pl-9 pr-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="text-xs font-semibold text-slate-500 pr-2">
          {filteredStaff.length} Member{filteredStaff.length === 1 ? '' : 's'}
        </div>
      </div>

      {/* Staff List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3.5">Staff Name</th>
                <th className="px-5 py-3.5">Mobile (Login)</th>
                <th className="px-5 py-3.5">Role</th>
                <th className="px-5 py-3.5">Assigned Wards</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                    Loading staff directory...
                  </td>
                </tr>
              ) : filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                    No staff members found matching your search.
                  </td>
                </tr>
              ) : (
                filteredStaff.map((member) => {
                  const assignedWards = member.assigned_wards || (member.ward ? [member.ward] : []);
                  return (
                    <tr key={member.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                            {member.full_name.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-bold text-slate-900">{member.full_name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono text-slate-600">
                        +91 {member.phone}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            member.role === 'ADMIN'
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}
                        >
                          {member.role === 'ADMIN' ? 'Chief Admin' : 'Field Volunteer'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {assignedWards.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {assignedWards.map((w) => (
                              <span
                                key={w.id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-semibold"
                              >
                                <MapPin className="w-2.5 h-2.5 text-blue-600" />
                                {w.ward_number ? `Ward ${w.ward_number}` : w.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold">
                            All Wards (Constituency-wide)
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Active & PIN Verified
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => handleDeleteMember(member.id, member.full_name)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                          title="Revoke Whitelist Access"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
