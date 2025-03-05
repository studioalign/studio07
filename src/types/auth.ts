import { ReactNode } from 'react';
import { StudioInfo } from './studio';

export type Role = "owner" | "teacher" | "parent" | "student";

export interface RoleOption {
  id: Role;
  title: string;
  description: string;
  icon: ReactNode;
}

export interface UserData {
  id: string;
  name: string;
  email: string;
  role: Role;
  studio: StudioInfo | null;
}

