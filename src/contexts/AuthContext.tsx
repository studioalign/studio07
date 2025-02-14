import { createContext, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { UserData } from "../types/auth";

interface AuthContextType {
	user: User | null;
	profile: UserData | null;
	loading: boolean;
	signOut: () => Promise<void>;
	signIn: (email: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
	user: null,
	profile: null,
	loading: true,
	signOut: async () => {},
	signIn: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [profile, setProfile] = useState<UserData | null>(null);
	const [loading, setLoading] = useState(true);

	// console.log(profile);

	useEffect(() => {
		let mounted = true;

		const loadProfile = async (userId: string) => {
			try {
				const { data, error } = await supabase
					.from("users")
					.select(
						`id, name, role, email,
						studio:studios!users_studio_id_fkey(
							id, name, address, phone, email
						)
					`
					)
					.eq("id", userId)
					.single();

				if (error) {
					console.error("Error loading profile:", error);
					if (mounted) setProfile(null);
				} else if (mounted) {
					setProfile(data);
				}
			} catch (err) {
				console.error("Unexpected error loading profile:", err);
				if (mounted) setProfile(null);
			}
		};

		const initializeSession = async () => {
			try {
				const {
					data: { session },
				} = await supabase.auth.getSession();
				const currentUser = session?.user || null;

				if (mounted) {
					setUser(currentUser);
					if (currentUser) {
						await loadProfile(currentUser.id);
					}
					setLoading(false);
				}
			} catch (error) {
				console.error("Error during session initialization:", error);
				if (mounted) setLoading(false);
			}
		};

		initializeSession();

		const authSubscription = supabase.auth.onAuthStateChange(
			(event, session) => {
				const currentUser = session?.user || null;
				setUser(currentUser);
				if (currentUser) {
					loadProfile(currentUser.id);
				} else {
					setProfile(null);
				}
			}
		);

		const handleVisibilityChange = () => {
			if (document.visibilityState === "visible") {
				initializeSession();
			}
		};

		document.addEventListener("visibilitychange", handleVisibilityChange);

		return () => {
			mounted = false;
			authSubscription.data.subscription?.unsubscribe?.(); // Ensure compatibility
			document.removeEventListener("visibilitychange", handleVisibilityChange);
		};
	}, []);

	const signIn = async (email: string, password: string) => {
		console.log("Signing in..."); // Add debugging

		const { error } = await supabase.auth.signInWithPassword({
			email,
			password,
		});

		if (error) {
			console.error("Sign in error:", error); // Add debugging
			throw new Error("Invalid email or password");
		}
	};

	const signOut = async () => {
		try {
			await supabase.auth.signOut();
			setUser(null);
			setProfile(null);
			window.location.href = "/";
		} catch (error) {
			console.error("Error signing out:", error);
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				loading...
			</div>
		);
	}

	return (
		<AuthContext.Provider value={{ user, profile, loading, signIn, signOut }}>
			{children}
		</AuthContext.Provider>
	);
}
