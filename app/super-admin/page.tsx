'use client';

import React, { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Users,
  Building2,
  Plus,
  Edit2,
  Trash2,
  Shield,
  LogOut,
  Save,
  X,
  Settings,
  ChevronDown,
  ChevronUp,
  ArrowLeft
} from 'lucide-react';
import { UserPermissions, PERMISSION_LABELS, DEFAULT_PERMISSIONS_BY_ROLE } from '@/lib/types/auth';

interface User {
  id: string;
  email: string;
  name: string;
  jobRole?: string;
  role: 'super_admin' | 'admin' | 'viewer';
  airportId: string | null;
  airportName?: string;
  isActive: boolean;
  createdAt: string;
  permissions?: UserPermissions | null;
}

interface Airport {
  id: string;
  name: string;
  icaoCode: string;
  isActive: boolean;
}

export default function SuperAdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [airports, setAirports] = useState<Airport[]>([]);
  const [showUserForm, setShowUserForm] = useState(false);
  const [showAirportForm, setShowAirportForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingAirport, setEditingAirport] = useState<Airport | null>(null);
  const [editingPermissionsUserId, setEditingPermissionsUserId] = useState<string | null>(null);
  const [editingPermissions, setEditingPermissions] = useState<UserPermissions | null>(null);
  const [useCustomPermissions, setUseCustomPermissions] = useState(false);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  const [userForm, setUserForm] = useState({
    email: '',
    name: '',
    jobRole: '',
    password: '',
    role: 'viewer' as 'super_admin' | 'admin' | 'viewer',
    airportId: '',
    useCustomPermissions: false,
    permissions: null as UserPermissions | null
  });

  const [airportForm, setAirportForm] = useState({
    name: '',
    icaoCode: '',
    iataCode: '',
    country: '',
    timezone: 'UTC'
  });

  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (session?.user?.role !== 'super_admin') {
      router.push('/');
      return;
    }

    loadData();
  }, [status, session, router]);

  const loadData = async () => {
    try {
      const [usersRes, airportsRes] = await Promise.all([
        fetch('/api/super-admin/users'),
        fetch('/api/super-admin/airports')
      ]);

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData);
      }

      if (airportsRes.ok) {
        const airportsData = await airportsRes.json();
        setAirports(airportsData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const payload = {
        email: userForm.email,
        name: userForm.name,
        jobRole: userForm.jobRole,
        password: userForm.password,
        role: userForm.role,
        airportId: userForm.airportId,
        permissions: userForm.useCustomPermissions ? userForm.permissions : null
      };

      const response = await fetch('/api/super-admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        await loadData();
        resetUserForm();
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error || 'Failed to create user'}`);
      }
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Failed to create user');
    }
  };

  const handleCreateAirport = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/super-admin/airports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(airportForm)
      });

      if (response.ok) {
        await loadData();
        resetAirportForm();
      } else {
        const error = await response.json();
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error('Error creating airport:', error);
      alert('Failed to create airport');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const response = await fetch(`/api/super-admin/users/${userId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadData();
      } else {
        alert('Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    }
  };

  const resetUserForm = () => {
    setUserForm({
      email: '',
      name: '',
      jobRole: '',
      password: '',
      role: 'viewer',
      airportId: '',
      useCustomPermissions: false,
      permissions: null
    });
    setShowUserForm(false);
    setEditingUser(null);
  };

  const handleUpdateUserPermissions = async (userId: string, permissions: UserPermissions | null) => {
    try {
      const response = await fetch(`/api/super-admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions })
      });

      if (response.ok) {
        await loadData();
        setEditingPermissionsUserId(null);
        setEditingPermissions(null);
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Failed to update permissions'}`);
      }
    } catch (error) {
      console.error('Error updating permissions:', error);
      alert('Failed to update permissions');
    }
  };

  const startEditingPermissions = (user: User) => {
    setEditingPermissionsUserId(user.id);
    // If user has custom permissions, use those; otherwise use role defaults
    const perms = user.permissions || DEFAULT_PERMISSIONS_BY_ROLE[user.role];
    setEditingPermissions({ ...perms });
    setUseCustomPermissions(!!user.permissions);
  };

  const toggleUserExpanded = (userId: string) => {
    setExpandedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const getEffectivePermissions = (user: User): UserPermissions => {
    return user.permissions || DEFAULT_PERMISSIONS_BY_ROLE[user.role];
  };

  const resetAirportForm = () => {
    setAirportForm({
      name: '',
      icaoCode: '',
      iataCode: '',
      country: '',
      timezone: 'UTC'
    });
    setShowAirportForm(false);
    setEditingAirport(null);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-purple-600 text-white';
      case 'admin': return 'bg-blue-600 text-white';
      case 'viewer': return 'bg-gray-600 text-white';
      default: return 'bg-gray-600 text-white';
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <Shield className="w-10 h-10 text-purple-400" />
            <div>
              <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
              <p className="text-slate-400">System-wide management</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>
            <div className="text-right">
              <p className="text-sm text-slate-400">Logged in as</p>
              <p className="font-semibold">{session?.user?.name}</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Airports Section */}
          <div className="bg-slate-800 rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Building2 className="w-6 h-6 text-blue-400" />
                <h2 className="text-xl font-bold">Airports</h2>
              </div>
              <button
                onClick={() => setShowAirportForm(!showAirportForm)}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                {showAirportForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {showAirportForm ? 'Cancel' : 'Add Airport'}
              </button>
            </div>

            {showAirportForm && (
              <form onSubmit={handleCreateAirport} className="bg-slate-700 rounded-lg p-4 mb-4 space-y-3">
                <input
                  type="text"
                  placeholder="Airport Name"
                  value={airportForm.name}
                  onChange={(e) => setAirportForm({ ...airportForm, name: e.target.value })}
                  className="w-full bg-slate-600 text-white px-3 py-2 rounded border border-slate-500"
                  required
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="ICAO Code"
                    value={airportForm.icaoCode}
                    onChange={(e) => setAirportForm({ ...airportForm, icaoCode: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-600 text-white px-3 py-2 rounded border border-slate-500"
                    maxLength={4}
                    required
                  />
                  <input
                    type="text"
                    placeholder="IATA Code"
                    value={airportForm.iataCode}
                    onChange={(e) => setAirportForm({ ...airportForm, iataCode: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-600 text-white px-3 py-2 rounded border border-slate-500"
                    maxLength={3}
                  />
                </div>
                <input
                  type="text"
                  placeholder="Country"
                  value={airportForm.country}
                  onChange={(e) => setAirportForm({ ...airportForm, country: e.target.value })}
                  className="w-full bg-slate-600 text-white px-3 py-2 rounded border border-slate-500"
                />
                <button
                  type="submit"
                  className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold"
                >
                  Create Airport
                </button>
              </form>
            )}

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {airports.map(airport => (
                <div key={airport.id} className="bg-slate-700 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg">{airport.name}</h3>
                      <p className="text-sm text-slate-400">
                        ICAO: {airport.icaoCode}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Users Section */}
          <div className="bg-slate-800 rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-6 h-6 text-green-400" />
                <h2 className="text-xl font-bold">Users</h2>
              </div>
              <button
                onClick={() => setShowUserForm(!showUserForm)}
                className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                {showUserForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {showUserForm ? 'Cancel' : 'Add User'}
              </button>
            </div>

            {showUserForm && (
              <form onSubmit={handleCreateUser} className="bg-slate-700 rounded-lg p-4 mb-4 space-y-3">
                <input
                  type="email"
                  placeholder="Email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  className="w-full bg-slate-600 text-white px-3 py-2 rounded border border-slate-500"
                  required
                />
                <input
                  type="text"
                  placeholder="Name"
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  className="w-full bg-slate-600 text-white px-3 py-2 rounded border border-slate-500"
                  required
                />
                <input
                  type="text"
                  placeholder="Job Role (e.g., ATC Supervisor, Tower Controller)"
                  value={userForm.jobRole}
                  onChange={(e) => setUserForm({ ...userForm, jobRole: e.target.value })}
                  className="w-full bg-slate-600 text-white px-3 py-2 rounded border border-slate-500"
                />
                <input
                  type="password"
                  placeholder="Password (min 8 characters)"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  className="w-full bg-slate-600 text-white px-3 py-2 rounded border border-slate-500"
                  required
                  minLength={8}
                />
                <div>
                  <label className="block text-sm font-semibold mb-1 text-slate-300">Access Level</label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value as any })}
                    className="w-full bg-slate-600 text-white px-3 py-2 rounded border border-slate-500"
                  >
                    <option value="viewer">Viewer (Read-only access)</option>
                    <option value="admin">Admin (Full ATC access)</option>
                    <option value="super_admin">Super Admin (System-wide)</option>
                  </select>
                </div>
                {userForm.role !== 'super_admin' && (
                  <div>
                    <label className="block text-sm font-semibold mb-1 text-slate-300">Airport</label>
                    <select
                      value={userForm.airportId}
                      onChange={(e) => setUserForm({ ...userForm, airportId: e.target.value })}
                      className="w-full bg-slate-600 text-white px-3 py-2 rounded border border-slate-500"
                      required
                    >
                      <option value="">Select Airport</option>
                      {airports.map(airport => (
                        <option key={airport.id} value={airport.id}>
                          {airport.name} ({airport.icaoCode})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Custom Operational Authority Section */}
                {userForm.role !== 'super_admin' && (
                  <div className="border-t border-slate-600 pt-3 mt-3">
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="checkbox"
                        id="useCustomPermissions"
                        checked={userForm.useCustomPermissions}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setUserForm({
                            ...userForm,
                            useCustomPermissions: checked,
                            permissions: checked ? { ...DEFAULT_PERMISSIONS_BY_ROLE[userForm.role] } : null
                          });
                        }}
                        className="w-4 h-4 rounded"
                      />
                      <label htmlFor="useCustomPermissions" className="text-sm font-semibold text-slate-300">
                        Set custom operational authority (override role defaults)
                      </label>
                    </div>

                    {userForm.useCustomPermissions && userForm.permissions && (
                      <div className="bg-slate-800 rounded p-3 space-y-2">
                        <p className="text-xs text-slate-400 mb-2">Select what this user is authorised to do:</p>
                        {(Object.keys(PERMISSION_LABELS) as (keyof UserPermissions)[]).map(key => (
                          <label key={key} className="flex items-start gap-2 cursor-pointer hover:bg-slate-700 p-1 rounded">
                            <input
                              type="checkbox"
                              checked={userForm.permissions![key]}
                              onChange={(e) => setUserForm({
                                ...userForm,
                                permissions: { ...userForm.permissions!, [key]: e.target.checked }
                              })}
                              className="w-4 h-4 mt-0.5 rounded"
                            />
                            <div>
                              <span className="text-sm font-medium">{PERMISSION_LABELS[key].label}</span>
                              <p className="text-xs text-slate-400">{PERMISSION_LABELS[key].description}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold"
                >
                  Create User
                </button>
              </form>
            )}

            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {users.map(user => {
                const isExpanded = expandedUsers.has(user.id);
                const isEditingPerms = editingPermissionsUserId === user.id;
                const effectivePerms = getEffectivePermissions(user);

                return (
                <div key={user.id} className="bg-slate-700 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="font-bold">{user.name}</h3>
                      {user.jobRole && (
                        <p className="text-sm text-green-400">{user.jobRole}</p>
                      )}
                      <p className="text-sm text-slate-400">{user.email}</p>
                      {user.airportName && (
                        <p className="text-xs text-blue-400 mt-1">{user.airportName}</p>
                      )}
                    </div>
                    <div className="flex gap-2 items-center">
                      <span className={`text-xs px-2 py-1 rounded font-bold ${getRoleBadgeColor(user.role)}`}>
                        {user.role.replace('_', ' ').toUpperCase()}
                      </span>
                      {user.permissions && (
                        <span className="text-xs px-2 py-1 rounded font-bold bg-amber-600 text-white">
                          CUSTOM
                        </span>
                      )}
                      {user.role !== 'super_admin' && (
                        <button
                          onClick={() => toggleUserExpanded(user.id)}
                          className="text-slate-400 hover:text-slate-300"
                          title="View/Edit Permissions"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-red-400 hover:text-red-300"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Operational Authority View/Edit */}
                  {isExpanded && user.role !== 'super_admin' && (
                    <div className="mt-3 pt-3 border-t border-slate-600">
                      {isEditingPerms ? (
                        /* Editing Mode */
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 mb-2">
                            <input
                              type="checkbox"
                              id={`useCustom-${user.id}`}
                              checked={useCustomPermissions}
                              onChange={(e) => {
                                setUseCustomPermissions(e.target.checked);
                                if (!e.target.checked) {
                                  setEditingPermissions(null);
                                } else {
                                  setEditingPermissions({ ...DEFAULT_PERMISSIONS_BY_ROLE[user.role] });
                                }
                              }}
                              className="w-4 h-4 rounded"
                            />
                            <label htmlFor={`useCustom-${user.id}`} className="text-sm font-semibold">
                              Set custom operational authority
                            </label>
                          </div>

                          {useCustomPermissions && editingPermissions && (
                            <div className="bg-slate-800 rounded p-3 space-y-2">
                              {(Object.keys(PERMISSION_LABELS) as (keyof UserPermissions)[]).map(key => (
                                <label key={key} className="flex items-start gap-2 cursor-pointer hover:bg-slate-600 p-1 rounded">
                                  <input
                                    type="checkbox"
                                    checked={editingPermissions[key]}
                                    onChange={(e) => setEditingPermissions({
                                      ...editingPermissions,
                                      [key]: e.target.checked
                                    })}
                                    className="w-4 h-4 mt-0.5 rounded"
                                  />
                                  <div>
                                    <span className="text-sm font-medium">{PERMISSION_LABELS[key].label}</span>
                                    <p className="text-xs text-slate-400">{PERMISSION_LABELS[key].description}</p>
                                  </div>
                                </label>
                              ))}
                            </div>
                          )}

                          {!useCustomPermissions && (
                            <p className="text-sm text-slate-400">Using default authority for {user.role} role</p>
                          )}

                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUpdateUserPermissions(user.id, useCustomPermissions ? editingPermissions : null)}
                              className="bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded text-sm font-semibold flex items-center gap-1"
                            >
                              <Save className="w-3 h-3" /> Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingPermissionsUserId(null);
                                setEditingPermissions(null);
                              }}
                              className="bg-slate-600 hover:bg-slate-500 px-3 py-1.5 rounded text-sm font-semibold"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* View Mode */
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <p className="text-xs font-semibold text-slate-300">
                              Operational Authority {user.permissions ? '(Custom)' : `(${user.role} defaults)`}
                            </p>
                            <button
                              onClick={() => startEditingPermissions(user)}
                              className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1"
                            >
                              <Settings className="w-3 h-3" /> Edit
                            </button>
                          </div>
                          <div className="grid grid-cols-1 gap-1">
                            {(Object.keys(PERMISSION_LABELS) as (keyof UserPermissions)[]).map(key => (
                              <div key={key} className="flex items-center gap-2 text-xs">
                                <span className={effectivePerms[key] ? 'text-green-400' : 'text-red-400'}>
                                  {effectivePerms[key] ? '✓' : '✗'}
                                </span>
                                <span className={effectivePerms[key] ? 'text-slate-200' : 'text-slate-500'}>
                                  {effectivePerms[key] ? PERMISSION_LABELS[key].label : `Not authorised: ${PERMISSION_LABELS[key].shortLabel}`}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
