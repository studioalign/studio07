import React from 'react';
import { Role, RoleOption } from '../types/auth';

interface RoleCardProps {
  role: RoleOption;
  isSelected: boolean;
  onSelect: (role: Role) => void;
}

export default function RoleCard({ role, isSelected, onSelect }: RoleCardProps) {
  return (
    <button
      onClick={() => onSelect(role.id)}
      className={`p-6 rounded-xl border-2 transition-all ${
        isSelected
          ? 'border-brand-accent bg-brand-secondary-100/10'
          : 'border-gray-200 hover:border-brand-secondary-100 hover:bg-gray-50'
      }`}
    >
      <div className={`w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-4 ${
        isSelected ? 'bg-brand-primary text-white' : 'bg-gray-100 text-brand-secondary-400'
      }`}>
        {role.icon}
      </div>
      <h3 className="text-lg font-semibold mb-2 text-brand-primary text-center">{role.title}</h3>
      <p className="text-brand-secondary-400 text-sm text-center">{role.description}</p>
    </button>
  );
}