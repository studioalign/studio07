import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import DashboardCard from './DashboardCard';
import AddTeacherForm from './AddTeacherForm';
import { useData } from '../../contexts/DataContext';

interface Teacher {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

export default function Teachers() {
  const [showAddForm, setShowAddForm] = useState(false);
  const { teachers, isLoading, error } = useData();

  // Show skeleton loading state instead of "Loading..."
  if (isLoading) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-brand-primary">Teachers</h1>
          <div className="w-32 h-10 bg-gray-200 rounded-md animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-4" />
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-brand-primary">Teachers</h1>
        <button 
          onClick={() => setShowAddForm(true)}
          className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Teacher
        </button>
      </div>
      
      {showAddForm && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-brand-primary mb-4">Add New Teacher</h2>
          <AddTeacherForm
            onSuccess={() => {
              setShowAddForm(false);
              // In real implementation, this would refresh the teachers list
            }}
            onCancel={() => setShowAddForm(false)}
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teachers.map((teacher) => (
          <DashboardCard
            key={teacher.id}
            title={teacher.name}
            items={[
              { label: 'Email', value: teacher.email },
              { label: 'Joined', value: new Date(teacher.created_at).toLocaleDateString() }
            ]}
          />
        ))}
      </div>
      {teachers.length === 0 && !isLoading && (
        <p className="text-center text-gray-500 mt-8">No teachers found</p>
      )}
    </div>
  );
}