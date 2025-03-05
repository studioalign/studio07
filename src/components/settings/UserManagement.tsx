import React, { useState, useEffect } from 'react';
import { Users, Edit2, Save, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Role } from '../../types/auth';

interface StudioUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  created_at: string;
}

export default function UserManagement() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<StudioUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<Role>('parent');

  // Sort users to put current user first
  const sortedUsers = users.sort((a, b) => {
    if (a.id === profile?.id) return -1;
    if (b.id === profile?.id) return 1;
    return 0;
  });

  useEffect(() => {
    if (profile?.studio?.id) {
      fetchUsers();
    }
  }, [profile?.studio?.id]);

  const fetchUsers = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('studio_id', profile?.studio?.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({ role: editRole })
        .eq('id', userId);

      if (updateError) throw updateError;

      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: editRole } : user
      ));
      setEditingUser(null);
      setEditRole('parent');
    } catch (err) {
      console.error('Error updating user role:', err);
      setError(err instanceof Error ? err.message : 'Failed to update user role');
    }
  };

  if (loading) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-brand-primary">User Management</h1>
        </div>
        <div className="bg-white rounded-lg shadow">
          <div className="animate-pulse p-6 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-brand-primary">User Management</h1>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <div className="flex items-center text-brand-secondary-400">
            <Users className="w-5 h-5 mr-2" />
            <span>Studio Users</span>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border-b">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th scope="col" className="hidden sm:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th scope="col" className="hidden sm:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                <th scope="col" className="relative px-3 sm:px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedUsers.map((user) => (
                <tr key={user.id}>
                  <td className="px-3 sm:px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{user.name}
                      <div className="sm:hidden text-xs text-gray-500 mt-1">{user.email}</div>
                    </div>
                  </td>
                  <td className="hidden sm:table-cell px-3 sm:px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                    {editingUser === user.id ? (
                      <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value as Role)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-brand-accent focus:border-brand-accent sm:text-sm rounded-md"
                      >
                        <option value="owner">Studio Owner</option>
                        <option value="teacher">Teacher</option>
                        <option value="parent">Parent</option>
                      </select>
                    ) : (
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${user.role === 'owner' ? 'bg-purple-100 text-purple-800' : 
                          user.role === 'teacher' ? 'bg-blue-100 text-blue-800' : 
                          'bg-green-100 text-green-800'}`}
                      >
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </span>
                    )}
                  </td>
                  <td className="hidden sm:table-cell px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {editingUser === user.id ? (
                      <div className="flex justify-end space-x-2">
                        {user.id !== profile?.id && (
                        <button
                          onClick={() => handleRoleChange(user.id)}
                          className="text-brand-primary hover:text-brand-secondary-400"
                        >
                          <Save className="w-5 h-5" />
                        </button>
                        )}
                        <button
                          onClick={() => {
                            setEditingUser(null);
                            setEditRole('parent');
                          }}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ) : (
                      user.id !== profile?.id && (
                      <button
                        onClick={() => {
                          setEditingUser(user.id);
                          setEditRole(user.role);
                        }}
                        className="text-brand-primary hover:text-brand-secondary-400"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      )
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by inviting teachers and parents to your studio.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}