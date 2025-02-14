import { Building2, Music2, Users } from 'lucide-react';
import { RoleOption } from '../types/auth';

export const roles: RoleOption[] = [
  {
    id: 'owner',
    title: 'Studio Owner',
    description: 'Manage your studio, teachers and students',
    icon: <Building2 className="w-6 h-6" />,
  },
  {
    id: 'teacher',
    title: 'Dance Teacher',
    description: 'Manage attendance and track student progress',
    icon: <Music2 className="w-6 h-6" />,
  },
  {
    id: 'parent',
    title: 'Parent/Guardian',
    description: 'Includes dancers over the age of 18 years old',
    icon: <Users className="w-6 h-6" />,
  },
];