import {
	Users,
	BookOpen,
	GraduationCap,
	DollarSign,
	TrendingUp,
	AlertCircle,
	Calendar,
	MessageSquare,
	Clock,
} from "lucide-react";
import StatsCard from "./StatsCard";
import { useAuth } from "../../contexts/AuthContext";
import { useLocalization } from "../../contexts/LocalizationContext";
import { formatCurrency } from "../../utils/formatters";
export default function Overview() {
	const { profile } = useAuth();
	const { currency } = useLocalization();

	if (profile?.role === "owner") {
		return (
			<div className="space-y-8">
				<h1 className="text-2xl font-bold text-brand-primary mb-6">
					Studio Overview
				</h1>

				{/* Financial Stats */}
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
					<StatsCard
						title="Total Revenue"
						value={formatCurrency(12450, currency)}
						icon={DollarSign}
						trend="+15%"
						description="vs last month"
					/>
					<StatsCard
						title="Outstanding Balance"
						value={formatCurrency(2380, currency)}
						icon={TrendingUp}
						trend="8 invoices"
						description="pending payment"
					/>
					<StatsCard
						title="Overdue Payments"
						value={formatCurrency(850, currency)}
						icon={AlertCircle}
						trend="3 invoices"
						description="overdue"
					/>
				</div>

				{/* Studio Stats */}
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
					<StatsCard
						title="Active Students"
						value="156"
						icon={GraduationCap}
						trend="+12"
						description="this month"
					/>
					<StatsCard
						title="Active Classes"
						value="24"
						icon={BookOpen}
						trend="+3"
						description="this week"
					/>
					<StatsCard
						title="Teachers"
						value="12"
						icon={Users}
						trend="stable"
						description="no change"
					/>
				</div>

				{/* Recent Activity */}
				<div className="bg-white rounded-lg shadow p-6">
					<h2 className="text-lg font-semibold text-brand-primary mb-4">
						Recent Activity
					</h2>
					<div className="space-y-4">
						<div className="flex items-start space-x-3">
							<div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
								<Users className="w-4 h-4 text-green-600" />
							</div>
							<div>
								<p className="text-gray-900">New student enrollment</p>
								<p className="text-sm text-gray-500">
									Sarah Johnson enrolled in Ballet Beginners
								</p>
								<p className="text-xs text-gray-400">2 hours ago</p>
							</div>
						</div>
						<div className="flex items-start space-x-3">
							<div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
								<DollarSign className="w-4 h-4 text-blue-600" />
							</div>
							<div>
								<p className="text-gray-900">Payment received</p>
								<p className="text-sm text-gray-500">
									Monthly tuition payment from Mark Wilson
								</p>
								<p className="text-xs text-gray-400">5 hours ago</p>
							</div>
						</div>
						<div className="flex items-start space-x-3">
							<div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
								<MessageSquare className="w-4 h-4 text-purple-600" />
							</div>
							<div>
								<p className="text-gray-900">New message</p>
								<p className="text-sm text-gray-500">
									Emily Brown asked about class schedule
								</p>
								<p className="text-xs text-gray-400">Yesterday</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		);
	}
	if (profile?.role === "teacher") {
		return (
			<div className="space-y-8">
				<h1 className="text-2xl font-bold text-brand-primary">
					Teacher Dashboard
				</h1>

				{/* Today's Schedule */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					<StatsCard
						title="Today's Classes"
						value="4"
						icon={Calendar}
						trend="Next: 2:30 PM"
						description="Ballet Intermediate"
					/>
					<StatsCard
						title="Total Students"
						value="45"
						icon={Users}
						trend="+2"
						description="this week"
					/>
					<StatsCard
						title="Class Hours"
						value="12"
						icon={Clock}
						trend="Today"
						description="6 remaining"
					/>
				</div>

				{/* Upcoming Classes */}
				<div className="bg-white rounded-lg shadow">
					<div className="p-6 border-b">
						<h2 className="text-lg font-semibold text-brand-primary">
							Today's Schedule
						</h2>
					</div>
					<div className="p-6">
						<div className="space-y-6">
							<div className="flex items-center justify-between">
								<div>
									<h3 className="font-medium text-gray-900">
										Ballet Beginners
									</h3>
									<p className="text-sm text-gray-500">
										Studio A • 15 students
									</p>
								</div>
								<div className="text-right">
									<p className="text-brand-primary font-medium">
										10:00 AM - 11:30 AM
									</p>
									<button className="text-sm text-brand-accent hover:text-brand-secondary-400">
										Take Attendance
									</button>
								</div>
							</div>
							<div className="flex items-center justify-between">
								<div>
									<h3 className="font-medium text-gray-900">
										Jazz Intermediate
									</h3>
									<p className="text-sm text-gray-500">
										Studio B • 12 students
									</p>
								</div>
								<div className="text-right">
									<p className="text-brand-primary font-medium">
										2:30 PM - 4:00 PM
									</p>
									<button className="text-sm text-brand-accent hover:text-brand-secondary-400">
										Take Attendance
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Recent Messages */}
				<div className="bg-white rounded-lg shadow p-6">
					<h2 className="text-lg font-semibold text-brand-primary mb-4">
						Recent Messages
					</h2>
					<div className="space-y-4">
						<div className="flex items-start space-x-3">
							<div className="w-8 h-8 rounded-full bg-brand-secondary-100 flex items-center justify-center">
								<span className="text-brand-primary font-medium">JD</span>
							</div>
							<div>
								<p className="text-gray-900">Jane Doe</p>
								<p className="text-sm text-gray-500">
									Will be 10 minutes late to class today
								</p>
								<p className="text-xs text-gray-400">30 minutes ago</p>
							</div>
						</div>
						<div className="flex items-start space-x-3">
							<div className="w-8 h-8 rounded-full bg-brand-secondary-100 flex items-center justify-center">
								<span className="text-brand-primary font-medium">MW</span>
							</div>
							<div>
								<p className="text-gray-900">Mike Wilson</p>
								<p className="text-sm text-gray-500">
									Question about next week's recital
								</p>
								<p className="text-xs text-gray-400">2 hours ago</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		);
	}

	// Parent Dashboard
	return (
		<div className="space-y-8">
			<h1 className="text-2xl font-bold text-brand-primary">
				Parent Dashboard
			</h1>

			{/* Student Overview */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<StatsCard
					title="Upcoming Classes"
					value="3"
					icon={Calendar}
					trend="This Week"
					description="Next: Today 4 PM"
				/>
				<StatsCard
					title="Total Classes"
					value="8"
					icon={BookOpen}
					trend="2 classes"
					description="per week"
				/>
				<StatsCard
					title="Balance Due"
					value={formatCurrency(150, currency)}
					icon={DollarSign}
					trend="Due in 5 days"
					description="Monthly tuition"
				/>
			</div>

			{/* Today's Classes */}
			<div className="bg-white rounded-lg shadow">
				<div className="p-6 border-b">
					<h2 className="text-lg font-semibold text-brand-primary">
						Today's Classes
					</h2>
				</div>
				<div className="p-6">
					<div className="space-y-6">
						<div className="flex items-center justify-between">
							<div>
								<h3 className="font-medium text-gray-900">
									Sarah - Ballet Intermediate
								</h3>
								<p className="text-sm text-gray-500">Ms. Johnson • Studio A</p>
							</div>
							<div className="text-right">
								<p className="text-brand-primary font-medium">
									4:00 PM - 5:30 PM
								</p>
								<span className="text-sm text-green-600">Confirmed</span>
							</div>
						</div>
						<div className="flex items-center justify-between">
							<div>
								<h3 className="font-medium text-gray-900">
									Michael - Hip Hop Beginners
								</h3>
								<p className="text-sm text-gray-500">Mr. Thompson • Studio B</p>
							</div>
							<div className="text-right">
								<p className="text-brand-primary font-medium">
									5:45 PM - 6:45 PM
								</p>
								<span className="text-sm text-green-600">Confirmed</span>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Recent Updates */}
			<div className="bg-white rounded-lg shadow p-6">
				<h2 className="text-lg font-semibold text-brand-primary mb-4">
					Recent Updates
				</h2>
				<div className="space-y-4">
					<div className="flex items-start space-x-3">
						<div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
							<MessageSquare className="w-4 h-4 text-blue-600" />
						</div>
						<div>
							<p className="text-gray-900">New message from Ms. Johnson</p>
							<p className="text-sm text-gray-500">
								Regarding Sarah's progress in Ballet class
							</p>
							<p className="text-xs text-gray-400">1 hour ago</p>
						</div>
					</div>
					<div className="flex items-start space-x-3">
						<div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
							<Calendar className="w-4 h-4 text-green-600" />
						</div>
						<div>
							<p className="text-gray-900">Schedule Update</p>
							<p className="text-sm text-gray-500">
								Next week's Hip Hop class moved to 6 PM
							</p>
							<p className="text-xs text-gray-400">Yesterday</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
