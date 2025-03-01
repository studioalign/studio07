import { NavLink } from "react-router-dom";
import {
	Home,
	BookOpen,
	Building2,
	Users,
	GraduationCap,
	MessageSquare,
	Hash,
	DollarSign,
	FileText,
	X,
	File,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

interface SidebarProps {
	isOpen: boolean;
	onClose: () => void;
}

const ownerNavigation = [
	{ name: "Overview", to: "/dashboard", icon: Home, end: true },
	{ name: "Classes", to: "/dashboard/classes", icon: BookOpen },
	{ name: "Messages", to: "/dashboard/messages", icon: MessageSquare },
	{ name: "Channels", to: "/dashboard/channels", icon: Hash },
	{ name: "Users", to: "/dashboard/users", icon: Users },
	{ name: "Documents", to: "/dashboard/documents", icon: File },
	{ name: "Studio Info", to: "/dashboard/studio", icon: Building2 },
	{ name: "Teachers", to: "/dashboard/teachers", icon: Users },
	{ name: "Students", to: "/dashboard/students", icon: GraduationCap },
	{ name: "Payments", to: "/dashboard/payments", icon: DollarSign },
	{ name: "Invoices", to: "/dashboard/invoices", icon: FileText },
	{
		name: "Payment Settings",
		to: "/dashboard/payment-settings",
		icon: DollarSign,
	},
];

const teacherNavigation = [
	{ name: "Overview", to: "/dashboard", icon: Home, end: true },
	{ name: "Classes", to: "/dashboard/classes", icon: BookOpen },
	{ name: "Messages", to: "/dashboard/messages", icon: MessageSquare },
	{ name: "Channels", to: "/dashboard/channels", icon: Hash },
	{ name: "Documents", to: "/dashboard/documents", icon: File },
];

const parentNavigation = [
	{ name: "Overview", to: "/dashboard", icon: Home, end: true },
	{ name: "Classes", to: "/dashboard/classes", icon: BookOpen },
	{ name: "Messages", to: "/dashboard/messages", icon: MessageSquare },
	{ name: "Channels", to: "/dashboard/channels", icon: Hash },
	{ name: "Payments", to: "/dashboard/payments", icon: DollarSign },
	{ name: "Documents", to: "/dashboard/documents", icon: File },
	{ name: "My Students", to: "/dashboard/my-students", icon: GraduationCap },
];

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
	const { profile } = useAuth();

	let navigation;
	switch (profile?.role) {
		case "owner":
			navigation = ownerNavigation;
			break;
		case "teacher":
			navigation = teacherNavigation;
			break;
		default:
			navigation = parentNavigation;
	}

	return (
		<div
			className={`fixed inset-y-0 left-0 w-64 bg-brand-primary text-white transform flex flex-col ${
				isOpen ? "translate-x-0" : "-translate-x-full"
			} lg:translate-x-0 transition-transform duration-200 ease-in-out z-50`}
		>
			<div className="h-16 flex-none flex items-center justify-between px-6">
				<h1 className="text-xl font-bold">StudioAlign</h1>
				<button
					onClick={onClose}
					className="lg:hidden text-white hover:text-gray-300"
				>
					<X className="w-6 h-6" />
				</button>
			</div>
			<nav className="flex-1 overflow-y-auto min-h-0">
				<div className="py-6 space-y-1">
					{navigation.map((item) => {
						const Icon = item.icon;
						return (
							<NavLink
								key={item.name}
								to={item.to}
								end={item.end}
								onClick={() => onClose()}
								className={({ isActive }) =>
									`flex items-center px-6 py-3 text-sm font-medium transition-colors ${
										isActive
											? "bg-brand-secondary-400 text-brand-accent"
											: "text-gray-300 hover:bg-brand-secondary-400/50 hover:text-white"
									}`
								}
							>
								<Icon className="w-5 h-5 mr-3" />
								{item.name}
							</NavLink>
						);
					})}
				</div>
			</nav>
		</div>
	);
}
