"use client";

import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "../ui/card";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "../ui/table";
import { Users, Calendar, Download, CheckCircle } from "lucide-react";
import { supabase } from "../../lib/supabase";
import type { Database } from "../../types/database-types";
import SubscriptionFeedback from "./SubscriptionFeedback";

type StudioSubscription =
	Database["public"]["Tables"]["studio_subscriptions"]["Row"];
type BillingHistory = Database["public"]["Tables"]["billing_history"]["Row"];

// Add type for formatted description
type FormattedDescription = string | JSX.Element;

const pricingTiers = [
	{ min: 1, max: 100, price: 15, name: "Starter" },
	{ min: 101, max: 200, price: 20, name: "Growth" },
	{ min: 201, max: 300, price: 25, name: "Professional" },
	{ min: 301, max: 500, price: 35, name: "Scale" },
	{ min: 501, max: 1000, price: 50, name: "Enterprise" },
];

export default function BillingPage() {
	const [currentStudents, setCurrentStudents] = useState(0);
	const [subscription, setSubscription] = useState<StudioSubscription | null>(
		null
	);
	const [showFeedback, setShowFeedback] = useState<
		"new" | "upgrade" | "downgrade" | null
	>(null);
	const [billingHistory, setBillingHistory] = useState<BillingHistory[]>([]);
	const [loading, setLoading] = useState(true);
	const [studioId, setStudioId] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);

	// Get the current tier based on subscription first, fallback to student count
	const currentTier = subscription
		? pricingTiers.find((tier) => tier.name === subscription.tier)
		: pricingTiers.find(
				(tier) => currentStudents >= tier.min && currentStudents <= tier.max
		  );

	// Get the next tier based on price, not just student count
	const nextTier = pricingTiers.find(
		(tier) => tier.price > (subscription?.price_gbp || currentTier?.price || 0)
	);

	// Check if there's a scheduled downgrade using the scheduled_tier field
	const isScheduledDowngrade = subscription?.scheduled_tier;
	const scheduledTier = isScheduledDowngrade
		? pricingTiers.find((tier) => tier.name === subscription.scheduled_tier)
		: null;

	const progressPercentage = currentTier
		? (currentStudents / currentTier.max) * 100
		: 0;

	// Extract loadBillingData to be reusable
	const loadBillingData = async () => {
		try {
			setLoading(true);

			// Get current user's studio
			const {
				data: { user },
				error: userError,
			} = await supabase.auth.getUser();

			if (userError) throw userError;

			if (!user) {
				throw new Error("No authenticated user");
			}

			// Get studio details
			const { data: studioData, error: studioError } = await supabase
				.from("studios")
				.select("*")
				.eq("owner_id", user.id)
				.single();

			if (studioError) throw studioError;
			if (!studioData) throw new Error("No studio found");

			setStudioId(studioData.id);

			// Get student count
			const { count: studentCount, error: countError } = await supabase
				.from("students")
				.select("*", { count: "exact", head: true })
				.eq("studio_id", studioData.id);

			if (countError) throw countError;
			setCurrentStudents(studentCount || 0);

			const { data: subscriptionData, error: subscriptionError } =
				await supabase
					.from("studio_subscriptions")
					.select("*")
					.eq("studio_id", studioData.id)
					.eq("status", "active")
					.order("created_at", { ascending: false })
					.maybeSingle();

			if (subscriptionError && subscriptionError.code !== "PGRST116") {
				console.error(
					"❌ Subscription error (not 'no rows'):",
					subscriptionError
				);
				throw subscriptionError;
			}

			if (!subscriptionData) {
				const { data: pendingSubscription, error: pendingError } =
					await supabase
						.from("studio_subscriptions")
						.select("*")
						.eq("studio_id", studioData.id)
						.in("status", ["incomplete", "incomplete_expired", "past_due"])
						.order("created_at", { ascending: false })
						.maybeSingle();

				if (!pendingError && pendingSubscription) {
					setSubscription(pendingSubscription);
				}
			} else {
				setSubscription(subscriptionData);
			}

			// Get billing history
			const { data: billingData, error: billingError } = await supabase
				.from("billing_history")
				.select("*")
				.eq("studio_id", studioData.id)
				.order("created_at", { ascending: false })
				.limit(10);

			if (billingError) throw billingError;
			setBillingHistory(billingData || []);
		} catch (error) {
			console.error("❌ Error loading billing data:", error);
			setError(
				`Failed to load billing data: ${
					error instanceof Error ? error.message : "Unknown error"
				}`
			);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadBillingData();
	}, []);

	const handleUpgradeSubscription = async (tierName: string) => {
		if (!studioId) return;

		setLoading(true);
		setError(null);
		try {
			const { data, error } = await supabase.functions.invoke(
				"manage-subscription",
				{
					body: {
						action: "upgrade",
						studioId,
						tierName,
					},
				}
			);

			if (error) throw error;

			// Set feedback type based on current subscription state and price comparison
			const targetTier = pricingTiers.find((tier) => tier.name === tierName);
			const currentPrice = subscription?.price_gbp || 0;
			const newPrice = targetTier?.price || 0;

			if (newPrice < currentPrice) {
				setShowFeedback("downgrade");
			}

			// Redirect to Stripe checkout
			if (data?.url) {
				window.location.href = data.url;
			}
		} catch (error) {
			console.error("Error upgrading subscription:", error);
			setError("Failed to upgrade subscription. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	const handleCancelSubscription = async () => {
		if (!studioId || !subscription) return;

		setLoading(true);
		setError(null);
		try {
			const { error } = await supabase.functions.invoke("manage-subscription", {
				body: {
					action: "cancel",
					studioId,
					subscriptionId: subscription.id,
				},
			});

			if (error) throw error;

			setSuccessMessage(
				"Subscription cancellation scheduled for the end of your billing period."
			);

			// Refresh the billing data
			await loadBillingData();
		} catch (error) {
			console.error("Error canceling subscription:", error);
			setError("Failed to cancel subscription. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
			</div>
		);
	}

	return (
		<div className="container mx-auto p-6 max-w-6xl space-y-8">
			{/* Feedback Animation */}
			{showFeedback && (
				<SubscriptionFeedback
					type={showFeedback}
					onClose={() => {
						setShowFeedback(null);
						loadBillingData(); // Refresh data when feedback is closed
					}}
					autoCloseDelay={5000}
				/>
			)}

			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-brand-primary">
						Billing & Usage
					</h1>
					<p className="text-muted-foreground mt-1">
						Manage your studio subscription and billing details
					</p>
				</div>
				{/* <Button variant="outline" className="gap-2">
					<Settings className="h-4 w-4" />
					Billing Settings
				</Button> */}
			</div>

			{/* Error and Success Messages */}
			{error && (
				<Card className="border-red-200 bg-red-50">
					<CardContent className="pt-6">
						<div className="flex items-center gap-3">
							<div className="w-2 h-2 bg-red-500 rounded-full"></div>
							<p className="text-red-900 font-medium">{error}</p>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setError(null)}
								className="ml-auto text-red-700 hover:text-red-900"
							>
								×
							</Button>
						</div>
					</CardContent>
				</Card>
			)}

			{successMessage && (
				<Card className="border-green-200 bg-green-50">
					<CardContent className="pt-6">
						<div className="flex items-center gap-3">
							<div className="w-2 h-2 bg-green-500 rounded-full"></div>
							<p className="text-green-900 font-medium">{successMessage}</p>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setSuccessMessage(null)}
								className="ml-auto text-green-700 hover:text-green-900"
							>
								×
							</Button>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Current Plan & Usage */}
			{subscription && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-brand-primary">
							<Users className="h-5 w-5" />
							Current Plan
						</CardTitle>
						<CardDescription>Your active subscription details</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-2xl font-bold">
									£{subscription?.price_gbp}/month
								</p>
								<p className="text-sm text-muted-foreground">
									{subscription?.tier} Plan
								</p>
							</div>
							<Badge
								variant="secondary"
								className={
									subscription?.status === "active"
										? "bg-green-100 text-green-800"
										: "bg-yellow-100 text-yellow-800"
								}
							>
								<CheckCircle className="h-3 w-3 mr-1" />
								{subscription?.status}
							</Badge>
						</div>

						<div className="space-y-2">
							<div className="flex justify-between text-sm">
								<span>
									Students: {currentStudents} / {subscription?.max_students}
								</span>
								<span>{Math.round(progressPercentage)}% used</span>
							</div>
							<Progress value={progressPercentage} className="h-2" />
						</div>

						{subscription && (
							<div className="pt-2 space-y-2 text-sm">
								<div className="flex justify-between">
									<span className="text-muted-foreground">
										{subscription.cancel_at_period_end
											? "Cancels at:"
											: "Next billing date:"}
									</span>
									<span
										className={
											subscription.cancel_at_period_end ? "text-yellow-600" : ""
										}
									>
										{subscription.current_period_end
											? new Date(
													subscription.current_period_end
											  ).toLocaleDateString("en-GB")
											: "N/A"}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-muted-foreground">Billing cycle:</span>
									<span>Monthly</span>
								</div>
								{subscription.cancel_at_period_end && (
									<div className="flex justify-between">
										<span className="text-muted-foreground">Cancels at:</span>
										<span className="text-red-600">
											{new Date(
												subscription.current_period_end || ""
											).toLocaleDateString("en-GB")}
										</span>
									</div>
								)}
							</div>
						)}

						{/* Scheduled Downgrade Information */}
						{isScheduledDowngrade && scheduledTier && currentTier && (
							<div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
								<div className="flex items-start gap-3">
									<div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
									<div className="flex-1">
										<h4 className="font-semibold text-blue-900 mb-2">
											Plan Change Scheduled
										</h4>
										<div className="space-y-2 text-sm text-blue-800">
											<div className="flex justify-between">
												<span>Current plan:</span>
												<span className="font-medium">
													{currentTier.name} - £{currentTier.price}/month
												</span>
											</div>
											<div className="flex justify-between">
												<span>Changing to:</span>
												<span className="font-medium">
													{scheduledTier.name} - £{scheduledTier.price}/month
												</span>
											</div>
											<div className="flex justify-between">
												<span>Effective date:</span>
												<span className="font-medium">
													{subscription.current_period_end
														? new Date(
																subscription.current_period_end
														  ).toLocaleDateString("en-GB")
														: "N/A"}
												</span>
											</div>
											<div className="flex justify-between">
												<span>Next billing amount:</span>
												<span className="font-medium text-green-600">
													£{scheduledTier.price}/month
												</span>
											</div>
										</div>
										<div className="mt-3 p-3 bg-blue-100 rounded-md">
											<p className="text-xs text-blue-700">
												<strong>What happens next:</strong> You'll continue to
												enjoy your current {currentTier.name} plan benefits
												until{" "}
												{subscription.current_period_end
													? new Date(
															subscription.current_period_end
													  ).toLocaleDateString("en-GB")
													: "the end of your billing period"}
												. On that date, your plan will automatically change to{" "}
												{scheduledTier.name} and you'll be charged £
												{scheduledTier.price} for the next month.
											</p>
										</div>
									</div>
								</div>
							</div>
						)}

						<div className="pt-4 flex gap-2">
							{subscription && !subscription.cancel_at_period_end && (
								<Button
									variant="outline"
									size="sm"
									onClick={handleCancelSubscription}
								>
									Cancel Subscription
								</Button>
							)}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Pricing Tiers */}
			<Card>
				<CardHeader>
					<CardTitle className="text-brand-primary">Pricing Tiers</CardTitle>
					<CardDescription>
						Subscription cost based on number of students
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						{pricingTiers.map((tier, index) => (
							<div
								key={index}
								className={`p-4 border rounded-lg transition-colors ${
									subscription?.tier === tier.name
										? "border-primary bg-brand-primary text-white"
										: "border-border hover:border-primary/50"
								}`}
							>
								<div className="flex items-center justify-between mb-2">
									<h3 className="font-semibold">{tier.name}</h3>
									{subscription?.tier === tier.name && (
										<Badge variant="default" className="text-xs">
											Current
										</Badge>
									)}
								</div>
								<p className="text-2xl font-bold mb-1">£{tier.price}</p>
								<p className="text-sm text-muted-foreground mb-3">
									Up to {tier.max} students
								</p>
								{subscription?.tier !== tier.name && (
									<Button
										size="sm"
										className="w-full bg-brand-primary text-white"
										onClick={() => handleUpgradeSubscription(tier.name)}
										disabled={loading || currentStudents > tier.max}
									>
										{currentStudents <= tier.max
											? tier.price < (subscription?.price_gbp || 0)
												? `Downgrade`
												: subscription
												? `Upgrade`
												: `Subscribe`
											: "Not Available"}
									</Button>
								)}
							</div>
						))}
					</div>
				</CardContent>
			</Card>

			{/* Billing History */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-brand-primary">
						<Calendar className="h-5 w-5" />
						Billing History
					</CardTitle>
					<CardDescription>Your recent invoices and payments</CardDescription>
				</CardHeader>
				<CardContent>
					{billingHistory.length > 0 ? (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Date</TableHead>
									<TableHead>Amount</TableHead>
									<TableHead>Type</TableHead>
									<TableHead>Description</TableHead>
									<TableHead>Status</TableHead>
									<TableHead className="text-right">Invoice</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{billingHistory.map((item, index) => {
									// Determine payment type and format description
									const isSubscriptionChange =
										item.description.includes("changed from");
									const isNewSubscription =
										item.description.includes("activated");

									let paymentType = "Monthly Renewal";
									if (isSubscriptionChange) paymentType = "Plan Change";
									if (isNewSubscription) paymentType = "New Subscription";

									// Format the description to be more user-friendly
									let formattedDescription: FormattedDescription =
										item.description;
									if (isSubscriptionChange) {
										const [from, to] = item.description
											.replace("Subscription changed from ", "")
											.split(" to ");
										formattedDescription = (
											<span>
												Changed from{" "}
												<Badge variant="outline" className="font-normal">
													{from}
												</Badge>{" "}
												to{" "}
												<Badge variant="outline" className="font-normal">
													{to}
												</Badge>
											</span>
										);
									} else if (isNewSubscription) {
										const plan = item.description.replace(
											" subscription activated",
											""
										);
										formattedDescription = (
											<span>
												New subscription -{" "}
												<Badge variant="outline" className="font-normal">
													{plan}
												</Badge>
											</span>
										);
									}

									return (
										<TableRow key={index}>
											<TableCell>
												{new Date(item.created_at || "").toLocaleDateString(
													"en-GB",
													{
														day: "numeric",
														month: "short",
														year: "numeric",
													}
												)}
											</TableCell>
											<TableCell className="font-medium">
												£{item.amount_gbp.toFixed(2)}
											</TableCell>
											<TableCell>
												<Badge
													variant="secondary"
													className={
														isSubscriptionChange
															? "bg-blue-100 text-blue-800"
															: isNewSubscription
															? "bg-green-100 text-green-800"
															: "bg-gray-100 text-gray-800"
													}
												>
													{paymentType}
												</Badge>
											</TableCell>
											<TableCell>{formattedDescription}</TableCell>
											<TableCell>
												<Badge
													variant="secondary"
													className={`${
														item.status === "paid"
															? "bg-green-100 text-green-800"
															: item.status === "pending"
															? "bg-yellow-100 text-yellow-800"
															: item.status === "failed"
															? "bg-red-100 text-red-800"
															: "bg-gray-100 text-gray-800"
													}`}
												>
													{item.status.charAt(0).toUpperCase() +
														item.status.slice(1)}
												</Badge>
											</TableCell>
											<TableCell className="text-right">
												{item.invoice_url ? (
													<Button
														variant="ghost"
														size="sm"
														className="gap-1"
														asChild
													>
														<a
															href={item.invoice_url}
															target="_blank"
															rel="noopener noreferrer"
														>
															<Download className="h-3 w-3" />
															Invoice
														</a>
													</Button>
												) : (
													<span className="text-sm text-muted-foreground">
														-
													</span>
												)}
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					) : (
						<div className="text-center py-8 text-muted-foreground">
							No billing history available yet.
						</div>
					)}
				</CardContent>
			</Card>

			{/* Usage Alert */}
			{progressPercentage > 80 && (
				<Card className="border-orange-200 bg-orange-50">
					<CardContent className="pt-6">
						<div className="flex items-start gap-3">
							<div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
							<div className="flex-1">
								<h3 className="font-semibold text-orange-900">
									Approaching Plan Limit
								</h3>
								<p className="text-sm text-orange-700 mt-1">
									You're using {currentStudents} out of{" "}
									{subscription?.max_students || currentTier?.max} students in
									your {subscription?.tier || currentTier?.name} plan. Consider
									upgrading to avoid service interruption.
								</p>
								{nextTier && (
									<Button
										className="mt-3"
										size="sm"
										onClick={() => handleUpgradeSubscription(nextTier.name)}
										disabled={loading}
									>
										Upgrade to {nextTier.name} (£{nextTier.price}/month)
									</Button>
								)}
							</div>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
