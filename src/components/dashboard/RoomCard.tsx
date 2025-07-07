import React from 'react';
import { MapPin, Trash2 } from 'lucide-react';

interface RoomCardProps {
  name: string;
  description?: string | null;
  address?: string | null;
export default function RoomCard({ name, description, address, onDelete }: RoomCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-start">
        <div className="flex items-start space-x-3">
          <MapPin className="w-5 h-5 text-brand-accent mt-1" />
            <h3 className="text-lg font-semibold text-brand-primary">{name}</h3>
            {description && (
              <p className="text-sm text-brand-secondary-400 mt-1">{description}</p>
              <p className="text-sm text-brand-secondary-400 mt-1">{description}</p>
            {address && (
              <p className="text-sm text-gray-500 mt-1">{address}</p>
              <p className="text-sm text-gray-500 mt-1">{address}</p>
            )}
          </div>
        </div>
        <button
          onClick={onDelete}
          title="Delete location"
          title="Delete room"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
    </div>
}
export default function RoomCard({ name, description, address, onDelete }: RoomCardProps) {