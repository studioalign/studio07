// src/components/dashboard/Header.tsx
import React from "react";
import { Bell, Settings, LogOut, User, CreditCard } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import NotificationDropdown from "../notifications/NotificationDropdown";
import { useNotifications } from "../../hooks/useNotifications";

interface DropdownItem {
	label: string;
	icon: React.ReactNode;
	href: string;
}

export default function Header() {
	const { signOut, profile } = useAuth();
	const [showDropdown, setShowDropdown] = useState(false);
	const [showNotifications, setShowNotifications] = useState(false);
	const { unreadCount } = useNotifications();
	const navigate = useNavigate();

	const dropdownItems: DropdownItem[] = [
		{
			label: "Profile",
			icon: <User className="w-4 h-4" />,
			href: "/dashboard/profile",
		},
		{
			label: "Settings",
			icon: <Settings className="w-4 h-4" />,
			href: "/dashboard/settings",
		},
		...(profile?.role === "owner"
			? [
					{
						label: "Billing",
						icon: <CreditCard className="w-4 h-4" />,
						href: "/dashboard/billing",
					},
			  ]
			: []),
	];

	const handleSignOut = async () => {
		await signOut();
		navigate("/");
	};

	// const displayName =
	// 	profile?.role === "owner" ? profile?.studio?.name : profile?.studio?.name;

	return (
		<header className="h-16 bg-white border-b border-gray-200 px-16 lg:px-8 flex items-center justify-between">
			<div className="flex items-center">
				<h2 className="text-lg md:text-xl lg:text-2xl font-semibold text-brand-primary truncate">
					{profile?.studio?.name || ""}
				</h2>
			</div>
			<div className="flex items-center space-x-4">
				<button
					onClick={() => setShowNotifications(!showNotifications)}
					className="p-2 text-gray-500 hover:text-brand-primary relative z-20"
				>
					<Bell className="w-5 h-5" />
					{unreadCount > 0 && (
						<span className="absolute top-0 right-0 w-4 h-4 bg-brand-primary text-white text-xs rounded-full flex items-center justify-center transform translate-x-1 -translate-y-1">
							{unreadCount}
						</span>
					)}
				</button>
				{showNotifications && (
					<>
						<div
							className="fixed inset-0 z-10"
							onClick={() => setShowNotifications(false)}
						/>
						<div className="absolute right-0 top-12 z-20">
							<NotificationDropdown
								onClose={() => setShowNotifications(false)}
							/>
						</div>
					</>
				)}
				<div className="relative">
					<button
						onClick={() => setShowDropdown(!showDropdown)}
						className="w-8 h-8 rounded-full bg-brand-accent flex items-center justify-center"
					>
						<div className="h-full w-full rounded-full bg-brand-secondary-100 flex items-center justify-center overflow-hidden">
							{profile?.photo_url ? (
								<img
									src={profile?.photo_url}
									alt="Profile"
									className="w-full h-full object-cover object-top"
								/>
							) : (
								<span className="text-3xl font-medium text-brand-primary">
									JD
								</span>
							)}
						</div>
					</button>

					{showDropdown && (
						<>
							<div
								className="fixed inset-0 z-10"
								onClick={() => setShowDropdown(false)}
							/>
							<div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-20">
								{dropdownItems.map((item, index) => (
									<button
										key={index}
										onClick={() => {
											navigate(item.href);
											setShowDropdown(false);
										}}
										className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
									>
										{item.icon}
										<span className="ml-2">{item.label}</span>
									</button>
								))}
								<div className="border-t my-1" />
								<button
									onClick={handleSignOut}
									className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center whitespace-nowrap"
								>
									<LogOut className="w-4 h-4" />
									<span className="ml-2">Sign out</span>
								</button>
							</div>
						</>
					)}
				</div>
			</div>
		</header>
	);
}