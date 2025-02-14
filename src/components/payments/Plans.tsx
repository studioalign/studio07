import React, { useState } from "react";
import { Plus } from "lucide-react";
import { supabase } from "../../lib/supabase";
import PlanCard from "./PlanCard";
import AddPlanForm from "./AddPlanForm";
import EditPlanForm from "./EditPlanForm";
import { useAuth } from "../../contexts/AuthContext";

interface Plan {
	id: string;
	name: string;
	description: string | null;
	amount: number;
	interval: "weekly" | "monthly" | "term" | "annual";
	active: boolean;
	enrollmentCount?: number;
	revenue?: number;
}

export default function Plans() {
	const { profile } = useAuth();
	const [showAddPlan, setShowAddPlan] = useState(false);
	const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
	const [plans, setPlans] = useState<Plan[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	React.useEffect(() => {
		fetchPlans();
	}, [profile?.studio?.id]);

	const fetchPlans = async () => {
		try {
			const { data, error: fetchError } = await supabase
				.from("pricing_plans")
				.select(
					`
          id,
          name,
          description,
          amount,
          interval,
          active,
          enrollments:plan_enrollments(count)
        `
				)
				.eq("studio_id", profile?.studio?.id + "");

			if (fetchError) throw fetchError;

			// Transform the data to include enrollment count
			const transformedData = (data || []).map((plan) => ({
				...plan,
				enrollmentCount: plan.enrollments?.[0]?.count || 0,
			}));

			setPlans(transformedData);
		} catch (err) {
			console.error("Error fetching plans:", err);
			setError(err instanceof Error ? err.message : "Failed to fetch plans");
		} finally {
			setLoading(false);
		}
	};

	const handleDelete = async (planId: string) => {
		if (!window.confirm("Are you sure you want to delete this plan?")) return;

		try {
			const { error: deleteError } = await supabase
				.from("pricing_plans")
				.delete()
				.eq("id", planId);

			if (deleteError) throw deleteError;
			fetchPlans();
		} catch (err) {
			console.error("Error deleting plan:", err);
			setError(err instanceof Error ? err.message : "Failed to delete plan");
		}
	};

	if (loading) {
		return (
			<div>
				<div className="flex justify-between items-center mb-6">
					<h1 className="text-2xl font-bold text-brand-primary">
						Payment Plans
					</h1>
					<div className="w-32 h-10 bg-gray-200 rounded-md animate-pulse" />
				</div>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{[1, 2, 3].map((i) => (
						<div
							key={i}
							className="bg-white rounded-lg shadow p-6 animate-pulse"
						>
							<div className="h-6 bg-gray-200 rounded w-3/4 mb-4" />
							<div className="space-y-3">
								<div className="h-4 bg-gray-200 rounded w-full" />
								<div className="h-4 bg-gray-200 rounded w-2/3" />
							</div>
						</div>
					))}
				</div>
			</div>
		);
	}

	return (
		<div>
			<div className="flex justify-between items-center mb-6">
				<h1 className="text-2xl font-bold text-brand-primary">Payment Plans</h1>
				<button
					onClick={() => setShowAddPlan(true)}
					className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400"
				>
					<Plus className="w-5 h-5 mr-2" />
					Add Plan
				</button>
			</div>

			{showAddPlan && (
				<div className="bg-white rounded-lg shadow-lg p-6 mb-6">
					<h2 className="text-lg font-semibold text-brand-primary mb-4">
						Create New Plan
					</h2>
					<AddPlanForm
						onSuccess={() => {
							setShowAddPlan(false);
							fetchPlans();
						}}
						onCancel={() => setShowAddPlan(false)}
					/>
				</div>
			)}

			{editingPlan && (
				<div className="bg-white rounded-lg shadow-lg p-6 mb-6">
					<h2 className="text-lg font-semibold text-brand-primary mb-4">
						Edit Plan
					</h2>
					<EditPlanForm
						plan={editingPlan}
						onSuccess={() => {
							setEditingPlan(null);
							fetchPlans();
						}}
						onCancel={() => setEditingPlan(null)}
					/>
				</div>
			)}

			{error && (
				<div className="mb-6 p-4 bg-red-100 text-red-700 rounded-md">
					{error}
				</div>
			)}

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{plans.map((plan) => (
					<PlanCard
						key={plan.id}
						plan={plan}
						onEdit={() => setEditingPlan(plan)}
						onDelete={() => handleDelete(plan.id)}
					/>
				))}
			</div>

			{plans.length === 0 && !loading && (
				<p className="text-center text-gray-500 mt-8">
					No payment plans found. Create your first plan to get started.
				</p>
			)}
		</div>
	);
}
