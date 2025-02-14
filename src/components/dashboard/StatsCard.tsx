import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend: string;
  description: string;
}

export default function StatsCard({ title, value, icon: Icon, trend, description }: StatsCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-brand-accent/10 flex items-center justify-center">
          <Icon className="w-6 h-6 text-brand-accent" />
        </div>
        <span className="text-xs md:text-sm font-medium text-brand-secondary-400">
          {trend} <span className="text-gray-500">{description}</span>
        </span>
      </div>
      <h3 className="mt-4 text-base md:text-lg font-medium text-gray-900">{title}</h3>
      <p className="mt-2 text-2xl md:text-3xl font-bold text-brand-primary">{value}</p>
    </div>
  );
}