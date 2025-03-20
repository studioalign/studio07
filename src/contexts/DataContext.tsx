import React, { createContext, useContext, useState, ReactNode } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";

interface Teacher {
	id: string;
	name: string;
	email: string;
	role?: string; // Add role field to distinguish owners from teachers
	created_at: string;
}

interface Location {
	id: string;
	name: string;
	address: string | null;
}

interface DataContextType {
	teachers: Teacher[];
	locations: Location[];
	students: any[]; // TODO: Add proper type once students table is available
	isLoading: boolean;
	error: string | null;
	initialized: boolean;
	refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
	const [teachers, setTeachers] = useState<Teacher[]>([]);
	const [locations, setLocations] = useState<Location[]>([]);
	const [students, setStudents] = useState<any[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const { profile } = useAuth();
	const [initialized, setInitialized] = useState(false);

	React.useEffect(() => {
		if (profile) {
			fetchData();
		}
	}, [profile]);

	const fetchData = async () => {
		setIsLoading(true);
		setError(null);

		try {
			if (profile?.role === "owner") {
				// Fetch teachers for the studio - UPDATED to include owners
				const { data: teachersData, error: teachersError } = await supabase
					.from("users")
					.select(
						`*,
					studio:studios!users_studio_id_fkey(
						id, name, address, phone, email
					)
				`
					)
					.eq("studio_id", profile.studio?.id + "")
					.in("role", ["teacher", "owner"]); // Include both teachers and owners

				if (teachersError) throw teachersError;
				setTeachers(teachersData);

				// Fetch locations for the studio
				const { data: locationsData, error: locationsError } = await supabase
					.from("locations")
					.select("id, name, address")
					.eq("studio_id", profile.studio?.id + "")
					.order("name");

				if (locationsError) throw locationsError;
				setLocations(locationsData || []);
				// TODO: Fetch students once the table is available
			} else if (profile?.role === "teacher" || profile?.role === "parent") {
				// Fetch teachers for the studio - UPDATED to include owners
				const { data: teachersData, error: teachersError } = await supabase
					.from("users")
					.select("id, name, email, role, created_at") // Explicitly select role
					.eq("studio_id", profile.studio?.id + "")
					.in("role", ["teacher", "owner"]); // Include both teachers and owners

				if (teachersError) throw teachersError;
				setTeachers(teachersData || []);

				// Fetch locations for the studio
				const { data: locationsData, error: locationsError } = await supabase
					.from("locations")
					.select("id, name, address")
					.eq("studio_id", profile.studio?.id + "")
					.order("name");

				if (locationsError) throw locationsError;
				setLocations(locationsData || []);
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to fetch data");
		} finally {
			setIsLoading(false);
			setInitialized(true);
		}
	};

	return (
		<DataContext.Provider
			value={{
				teachers,
				locations,
				students,
				isLoading,
				error,
				initialized,
				refreshData: fetchData,
			}}
		>
			{children}
		</DataContext.Provider>
	);
}
