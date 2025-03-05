import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useState } from "react";
import { Menu } from "lucide-react";

export default function DashboardLayout() {
	const [sidebarOpen, setSidebarOpen] = useState(false);

	return (
		<div className="min-h-screen bg-gray-50 relative">
			{/* Mobile menu button */}
			<button
				onClick={() => setSidebarOpen(true)}
				className="lg:hidden fixed top-3 left-4 z-50 p-2 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100"
			>
				<Menu className="w-6 h-6" />
			</button>

			{/* Backdrop */}
			{sidebarOpen && (
				<div
					className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
					onClick={() => setSidebarOpen(false)}
				/>
			)}

			<Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
			<div className="lg:pl-64">
				<Header />
				<main className="p-4 md:p-6 lg:p-8">
					<Outlet />
				</main>
			</div>
		</div>
	);
}
