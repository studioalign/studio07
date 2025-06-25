"use client";

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
import {
	Users,
	Calendar,
	Download,
	CheckCircle,
	Clock,
	Star,
	ArrowLeft,
	ChevronDown,
	ChevronUp,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import type { Database } from "../../types/database-types";
import SubscriptionFeedback from "./SubscriptionFeedback";

type StudioSubscription =
	Database["public"]["Tables"]["studio_subscriptions"]["Row"];
type BillingHistory = Database["public"]["Tables"]["billing_history"]["Row"];
type PricingTier = {
	tier_name: string;
	max_students: number;
	student_range_min: number;
	student_range_max: number;
	monthly_price: number;
	yearly_price: number;
	lifetime_price: number;
	stripe_product_id: string;
};

type UpgradePreview = {
	is_upgrade: boolean;
	immediate_total: number;
	credit_amount: number;
	proration_amount: number;
	next_renewal_amount: number;
	explanation: string;
	current_tier: string;
	new_tier: string;
	billing_interval: string;
};

export default function BillingPage() {
	const [currentStudents, setCurrentStudents] = useState(0);
	const [subscription, setSubscription] = useState<StudioSubscription | null>(
		null
	);
	const [showFeedback, setShowFeedback] = useState<
		"upgrade" | "downgrade" | "new" | null
	>(null);
	const [billingHistory, setBillingHistory] = useState<BillingHistory[]>([]);
	const [loading, setLoading] = useState(true);
	const [studioId, setStudioId] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);
	const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([]);
	const [selectedBillingInterval, setSelectedBillingInterval] = useState<
		"monthly" | "yearly" | "lifetime"
	>("monthly");

	// New state for upgrade previews and promotions
	const [upgradePreviews, setUpgradePreviews] = useState<
		Record<string, UpgradePreview>
	>({});
	const [promotionCodes, setPromotionCodes] = useState<Record<string, string>>(
		{}
	);
	const [expandedTiers, setExpandedTiers] = useState<Record<string, boolean>>(
		{}
	);
	const [loadingPreviews, setLoadingPreviews] = useState<
		Record<string, boolean>
	>({});

	// Get the current tier based on subscription first, fallback to student count
	const currentTier = subscription
		? pricingTiers.find((tier) => tier.tier_name === subscription.tier)
		: pricingTiers.find(
				(tier) =>
					currentStudents >= tier.student_range_min &&
					currentStudents <= tier.student_range_max
		  );

	const progressPercentage = currentTier
		? (currentStudents / currentTier.max_students) * 100
		: 0;

	const loadPricingTiers = async () => {
		try {
			const { data, error } = await supabase.functions.invoke(
				"sync-stripe-products",
				{
					body: { action: "get_tiers" },
				}
			);

			if (error) throw error;
			setPricingTiers(data.tiers || []);
		} catch (error) {
			console.error("❌ Error loading pricing tiers:", error);
			setError("Failed to load pricing information. Please try again.");
		}
	};

	const loadBillingData = async () => {
		try {
			// Get studio ID from user data
			const {
				data: { user },
			} = await supabase.auth.getUser();

			if (!user) throw new Error("User not authenticated");

			const { data: userData, error: userError } = await supabase
				.from("users")
				.select("studio_id")
				.eq("id", user.id)
				.single();

			if (userError) throw userError;
			if (!userData?.studio_id) throw new Error("No studio found for user");

			setStudioId(userData.studio_id);

			// Get current students count
			const { data: studentsData, error: studentsError } = await supabase
				.from("students")
				.select("id")
				.eq("studio_id", userData.studio_id);

			if (studentsError) throw studentsError;
			setCurrentStudents(studentsData?.length || 0);

			// Get subscription data with enhanced fields
			const { data: subscriptionData, error: subscriptionError } =
				await supabase
					.from("studio_subscriptions")
					.select("*")
					.eq("studio_id", userData.studio_id)
					.or("status.eq.active,status.eq.trialing")
					.single();

			if (subscriptionError && subscriptionError.code !== "PGRST116") {
				throw subscriptionError;
			}

			setSubscription(subscriptionData);

			// Get billing history with enhanced fields
			const { data: billingData, error: billingError } = await supabase
				.from("billing_history")
				.select("*")
				.eq("studio_id", userData.studio_id)
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

	// Load upgrade preview for a specific tier
	const loadUpgradePreview = async (
		tierName: string,
		billingInterval: string
	) => {
		if (!studioId || !subscription) return;

		const tierKey = `${tierName}-${billingInterval}`;
		setLoadingPreviews((prev) => ({ ...prev, [tierKey]: true }));

		try {
			const { data, error } = await supabase.functions.invoke(
				"manage-subscription",
				{
					body: {
						action: "preview_upgrade",
						studioId,
						tierName,
						billingInterval,
					},
				}
			);

			if (error) throw error;
			if (data.preview) {
				setUpgradePreviews((prev) => ({ ...prev, [tierKey]: data.preview }));
			}
		} catch (error) {
			console.error("❌ Error loading upgrade preview:", error);
		} finally {
			setLoadingPreviews((prev) => ({ ...prev, [tierKey]: false }));
		}
	};

	// Toggle tier expansion and load preview if needed
	const toggleTierExpansion = (tierName: string, billingInterval: string) => {
		const tierKey = `${tierName}-${billingInterval}`;
		const isExpanding = !expandedTiers[tierKey];

		setExpandedTiers((prev) => ({ ...prev, [tierKey]: isExpanding }));

		// Load preview when expanding if not already loaded
		if (isExpanding && !upgradePreviews[tierKey] && subscription) {
			loadUpgradePreview(tierName, billingInterval);
		}
	};

	useEffect(() => {
		loadPricingTiers();
		loadBillingData();
	}, []);

	const handleSubscription = async (
		tierName: string,
		billingInterval: string
	) => {
		if (!studioId) return;

		const tierKey = `${tierName}-${billingInterval}`;
		const promotionCode = promotionCodes[tierKey];

		// Find the target tier
		const targetTier = pricingTiers.find((t) => t.tier_name === tierName);
		if (!targetTier) {
			setError("Invalid subscription tier selected.");
			return;
		}

		// Check student count compatibility
		if (currentStudents > targetTier.max_students) {
			setError(
				`Your current student count (${currentStudents}) exceeds the limit for ${tierName} plan (${targetTier.max_students} students). Please reduce your student count first.`
			);
			return;
		}

		setLoading(true);
		setError(null);
		try {
			let actionType = subscription ? "upgrade" : "create_subscription";

			// Use promotion upgrade if promotion code is provided
			if (promotionCode && subscription) {
				actionType = "apply_promotion_and_upgrade";
			}

			const { data, error } = await supabase.functions.invoke(
				"manage-subscription",
				{
					body: {
						action: actionType,
						studioId,
						tierName,
						billingInterval,
						...(promotionCode && { promotionCode }),
					},
				}
			);

			if (error) throw error;

			// Check if this was a direct subscription update (no redirect needed)
			if (data?.success && !data?.url) {
				// Set feedback type based on current subscription state and price comparison
				if (subscription) {
					const currentPrice = getCurrentPrice(subscription);
					const newPrice = getPriceForTier(tierName, billingInterval);

					if (newPrice < currentPrice) {
						setShowFeedback("downgrade");
					} else {
						setShowFeedback("upgrade");
					}
				} else {
					setShowFeedback("new");
				}

				// Show success message
				const message = promotionCode
					? `Subscription upgraded successfully with promotion code ${promotionCode}!`
					: data.billing_explanation || "Subscription updated successfully!";
				setSuccessMessage(message);

				// Clear promotion code
				setPromotionCodes((prev) => ({ ...prev, [tierKey]: "" }));

				// Refresh the billing data to show updated subscription
				await loadBillingData();
				return;
			}

			// Redirect to Stripe checkout (for new subscriptions)
			if (data?.url) {
				window.location.href = data.url;
			}
		} catch (error) {
			console.error("Error managing subscription:", error);
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error occurred";
			setError(`Failed to process subscription: ${errorMessage}`);
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

	const getPriceForTier = (tierName: string, interval: string) => {
		const tier = pricingTiers.find((t) => t.tier_name === tierName);
		if (!tier) return 0;

		if (interval === "monthly") return tier.monthly_price * 12;
		if (interval === "yearly") return tier.yearly_price;
		return tier.lifetime_price;
	};

	const getCurrentPrice = (subscription: StudioSubscription) => {
		if (subscription.is_lifetime) {
			return subscription.price_gbp;
		}
		// For recurring subscriptions, compare annual equivalents
		if (subscription.billing_interval === "monthly") {
			return subscription.price_gbp * 12;
		}
		return subscription.price_gbp;
	};

	const formatBillingInterval = (interval: string | null) => {
		if (interval === "yearly") return "Yearly";
		if (interval === "lifetime") return "Lifetime";
		return "Monthly";
	};

	const getTrialStatus = () => {
		if (
			!subscription?.trial_end ||
			subscription.billing_interval === "lifetime"
		)
			return null;

		const trialEnd = new Date(subscription.trial_end);
		const now = new Date();

		if (trialEnd > now) {
			const daysLeft = Math.ceil(
				(trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
			);
			return { active: true, daysLeft };
		}

		return { active: false, daysLeft: 0 };
	};

	// Determine if a subscription change is allowed
	const isSubscriptionChangeAllowed = (
		targetTier: PricingTier,
		targetInterval: string
	) => {
		if (!subscription) return true; // New subscription always allowed

		const currentTierIndex = [
			"starter",
			"growth",
			"professional",
			"scale",
			"enterprise",
		].indexOf(subscription.tier.toLowerCase());
		const targetTierIndex = [
			"starter",
			"growth",
			"professional",
			"scale",
			"enterprise",
		].indexOf(targetTier.tier_name.toLowerCase());

		// For lifetime users
		if (subscription.is_lifetime) {
			// Allow upgrades to higher tiers (both lifetime and recurring)
			if (targetTierIndex > currentTierIndex) {
				return true;
			}
			// Allow same tier with lifetime billing only (for plan changes within same tier)
			if (
				targetTierIndex === currentTierIndex &&
				targetInterval === "lifetime"
			) {
				return true;
			}
			// Disallow downgrades and same-tier recurring conversions
			return false;
		}

		// For recurring users
		if (targetInterval === "lifetime") {
			// Always allow upgrade to lifetime for any tier >= current tier
			return targetTierIndex >= currentTierIndex;
		}

		// For recurring to recurring changes
		return true; // Allow all changes (upgrades, downgrades, interval changes)
	};

	// Get the appropriate button text and styling
	const getSubscriptionButtonInfo = (tier: PricingTier, interval: string) => {
		if (!subscription) {
			return {
				text: "Subscribe",
				disabled: false,
				className: "bg-brand-primary text-white",
			};
		}

		// Prevent new subscriptions during cancellation period
		if (subscription.cancel_at_period_end) {
			return {
				text: "Not Available During Cancellation",
				disabled: true,
				className: "bg-gray-200 text-gray-500",
			};
		}

		const isCurrentTier =
			subscription.tier === tier.tier_name &&
			subscription.billing_interval === interval;
		if (isCurrentTier) {
			return {
				text: "Current Plan",
				disabled: true,
				className: "bg-gray-200 text-gray-500",
			};
		}

		const canSubscribe = currentStudents <= tier.max_students;
		if (!canSubscribe) {
			return {
				text: "Not Available",
				disabled: true,
				className: "bg-gray-200 text-gray-500",
			};
		}

		const isAllowed = isSubscriptionChangeAllowed(tier, interval);
		if (!isAllowed) {
			return {
				text: "Not Available",
				disabled: true,
				className: "bg-gray-200 text-gray-500",
			};
		}

		// Determine upgrade/downgrade/change type
		if (subscription.is_lifetime && interval === "lifetime") {
			return {
				text: "Upgrade",
				disabled: false,
				className: "bg-brand-primary text-white",
			};
		}

		if (subscription.is_lifetime && interval !== "lifetime") {
			const intervalText = interval === "monthly" ? "Monthly" : "Yearly";
			return {
				text: `Switch to ${intervalText}`,
				disabled: false,
				className: "bg-brand-primary text-white",
			};
		}

		if (interval === "lifetime") {
			return {
				text: "Upgrade to Lifetime",
				disabled: false,
				className: "bg-yellow-500 text-white",
			};
		}

		const currentTierIndex = [
			"starter",
			"growth",
			"professional",
			"scale",
			"enterprise",
		].indexOf(subscription.tier.toLowerCase());
		const targetTierIndex = [
			"starter",
			"growth",
			"professional",
			"scale",
			"enterprise",
		].indexOf(tier.tier_name.toLowerCase());
		const isUpgrade = targetTierIndex > currentTierIndex;

		const text = isUpgrade ? "Upgrade" : "Downgrade";
		const className = isUpgrade
			? "bg-brand-primary text-white"
			: "bg-orange-500 text-white";

		return { text, disabled: false, className };
	};

	const trialStatus = getTrialStatus();

	// Define showUpgradeInfo
	const showUpgradeInfo = subscription && !subscription.is_lifetime;

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
				<Button asChild variant="outline">
					<Link to="/dashboard">
						<ArrowLeft className="mr-2 h-4 w-4" />
						Back to Dashboard
					</Link>
				</Button>
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

			{/* Trial Status */}
			{trialStatus?.active && (
				<Card className="border-blue-200 bg-blue-50">
					<CardContent className="pt-6">
						<div className="flex items-center gap-3">
							<Clock className="h-5 w-5 text-blue-600" />
							<div>
								<p className="text-blue-900 font-medium">Free Trial Active</p>
								<p className="text-blue-700 text-sm">
									{trialStatus.daysLeft} days remaining in your free trial
								</p>
							</div>
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
							{subscription.is_lifetime && (
								<Badge
									variant="secondary"
									className="bg-gold-100 text-gold-800"
								>
									<Star className="h-3 w-3 mr-1" />
									Lifetime
								</Badge>
							)}
						</CardTitle>
						<CardDescription>Your active subscription details</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-2xl font-bold">
									£{subscription?.price_gbp}
									{!subscription.is_lifetime &&
										`/${subscription.billing_interval || "month"}`}
								</p>
								<p className="text-sm text-muted-foreground">
									{subscription?.tier} Plan (
									{formatBillingInterval(subscription.billing_interval)})
								</p>
							</div>
							<Badge
								variant="secondary"
								className={
									subscription?.status === "active"
										? "bg-green-100 text-green-800"
										: subscription?.status === "trialing"
										? "bg-blue-100 text-blue-800"
										: "bg-yellow-100 text-yellow-800"
								}
							>
								<CheckCircle className="h-3 w-3 mr-1" />
								{subscription?.status === "trialing"
									? "Trial"
									: subscription?.status}
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

						{subscription && !subscription.is_lifetime && (
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
									<span>
										{formatBillingInterval(subscription.billing_interval)}
									</span>
								</div>
							</div>
						)}

						{subscription &&
							!subscription.cancel_at_period_end &&
							!subscription.is_lifetime && (
								<div className="pt-4 flex gap-2">
									<Button
										variant="outline"
										size="sm"
										onClick={() => {
											const confirmCancel = window.confirm(
												`Are you sure you want to cancel your subscription?\n\n` +
													`• Your subscription will remain active until ${new Date(
														subscription.current_period_end
													).toLocaleDateString("en-GB")}\n` +
													`• You'll continue to have full access until then\n` +
													`• No partial refunds are provided for cancellations\n` +
													`• You cannot start a new subscription until the current one ends`
											);
											if (confirmCancel) {
												handleCancelSubscription();
											}
										}}
									>
										Cancel Subscription
									</Button>
								</div>
							)}
					</CardContent>
				</Card>
			)}

			{/* Billing Interval Selector */}
			<Card>
				<CardHeader>
					<CardTitle className="text-brand-primary">
						Choose Billing Interval
					</CardTitle>
					<CardDescription>
						Select how often you'd like to be billed
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex gap-4 mb-6">
						{["monthly", "yearly", "lifetime"].map((interval) => (
							<Button
								key={interval}
								variant={
									selectedBillingInterval === interval ? "default" : "outline"
								}
								onClick={() =>
									setSelectedBillingInterval(
										interval as "monthly" | "yearly" | "lifetime"
									)
								}
								className={`capitalize ${
									selectedBillingInterval === interval
										? "bg-brand-primary text-white"
										: ""
								}`}
							>
								{interval === "yearly" && (
									<Badge
										variant="secondary"
										className="mr-2 bg-green-100 text-green-800"
									>
										Save 2 months
									</Badge>
								)}
								{interval === "lifetime" && <Star className="h-4 w-4 mr-2" />}
								{interval}
							</Button>
						))}
					</div>

					{/* Pricing Tiers */}
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						{pricingTiers.map((tier, index) => {
							const originalPrice =
								selectedBillingInterval === "monthly"
									? tier.monthly_price
									: selectedBillingInterval === "yearly"
									? tier.yearly_price
									: tier.lifetime_price;

							const isCurrentTier =
								subscription?.tier === tier.tier_name &&
								subscription?.billing_interval === selectedBillingInterval;

							const buttonInfo = getSubscriptionButtonInfo(
								tier,
								selectedBillingInterval
							);
							const tierKey = `${tier.tier_name}-${selectedBillingInterval}`;
							const preview = upgradePreviews[tierKey];
							const isExpanded = expandedTiers[tierKey];
							const isLoadingPreview = loadingPreviews[tierKey];
							const promotionCode = promotionCodes[tierKey] || "";

							// Show upgrade preview info if available
							const showUpgradeInfo =
								subscription && !isCurrentTier && !buttonInfo.disabled;

							return (
								<div
									key={index}
									className={`p-4 border rounded-lg transition-colors ${
										isCurrentTier
											? "border-primary bg-brand-primary text-white"
											: "border-border hover:border-primary/50"
									}`}
								>
									<div className="flex items-center justify-between mb-2">
										<h3 className="font-semibold">{tier.tier_name}</h3>
										{isCurrentTier && (
											<Badge variant="default" className="text-xs">
												Current
											</Badge>
										)}
									</div>

									{/* Original Price */}
									<p className="text-2xl font-bold mb-1">
										£{originalPrice.toFixed(2)}
										{selectedBillingInterval !== "lifetime" && (
											<span className="text-sm font-normal">
												/
												{selectedBillingInterval === "yearly"
													? "year"
													: "month"}
											</span>
										)}
									</p>

									<p className="text-sm text-muted-foreground mb-3">
										{tier.student_range_min}-{tier.student_range_max} students
									</p>

									{selectedBillingInterval !== "lifetime" && (
										<p className="text-xs mb-3 opacity-75">
											Includes 5-day free trial
										</p>
									)}

									{/* Upgrade Preview Section */}
									{showUpgradeInfo && (
										<div className="mb-3">
											<Button
												variant="ghost"
												size="sm"
												onClick={() =>
													toggleTierExpansion(
														tier.tier_name,
														selectedBillingInterval
													)
												}
												className="w-full justify-between p-2 h-8 text-xs"
											>
												<span>
													{preview
														? preview.is_upgrade
															? `Immediate Charge: £${preview.immediate_total.toFixed(
																	2
															  )}`
															: "View Credit Details"
														: "See Billing Impact"}
												</span>
												{isExpanded ? (
													<ChevronUp className="h-3 w-3" />
												) : (
													<ChevronDown className="h-3 w-3" />
												)}
											</Button>

											{isExpanded && (
												<div className="mt-2 p-3 bg-blue-50 rounded text-xs space-y-2">
													{isLoadingPreview ? (
														<div className="animate-pulse">
															Loading preview...
														</div>
													) : preview ? (
														<>
															<div className="space-y-1">
																<div className="flex justify-between">
																	<span>Current:</span>
																	<span>{preview.current_tier}</span>
																</div>
																<div className="flex justify-between">
																	<span>New:</span>
																	<span>{preview.new_tier}</span>
																</div>
																<div className="border-t my-1"></div>

																{preview.is_upgrade ? (
																	<>
																		<div className="flex justify-between font-semibold">
																			<span>Immediate Charge:</span>
																			<span>
																				£{preview.immediate_total.toFixed(2)}
																			</span>
																		</div>
																		<div className="pl-2 text-gray-600">
																			<div className="flex justify-between">
																				<span>Prorated new plan:</span>
																				<span>
																					+£
																					{preview.proration_amount.toFixed(2)}
																				</span>
																			</div>
																			<div className="flex justify-between">
																				<span>Credit for old plan:</span>
																				<span>
																					-£{preview.credit_amount.toFixed(2)}
																				</span>
																			</div>
																		</div>
																	</>
																) : (
																	<div className="flex justify-between font-semibold">
																		<span>Credit for unused time:</span>
																		<span>
																			£{preview.credit_amount.toFixed(2)}
																		</span>
																	</div>
																)}

																<div className="border-t my-1"></div>
																<div className="flex justify-between">
																	<span>Next Renewal:</span>
																	<span>
																		£{preview.next_renewal_amount.toFixed(2)}
																	</span>
																</div>
															</div>

															{/* Promotion Code Input */}
															<div className="border-t pt-2 mt-2 space-y-1">
																<label className="block text-xs font-medium">
																	Promotion Code
																</label>
																<div className="flex gap-1">
																	<input
																		type="text"
																		placeholder="Enter code"
																		value={promotionCode}
																		onChange={(e) =>
																			setPromotionCodes((prev) => ({
																				...prev,
																				[tierKey]: e.target.value.toUpperCase(),
																			}))
																		}
																		className="flex-1 px-2 py-1 border rounded text-xs"
																	/>
																</div>
															</div>

															<p className="text-gray-600 text-xs mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
																{preview.explanation}
															</p>
														</>
													) : (
														<div className="text-red-600">
															Failed to load preview
														</div>
													)}
												</div>
											)}
										</div>
									)}

									{/* Subscribe Button */}
									<Button
										size="sm"
										className={`w-full ${buttonInfo.className}`}
										onClick={() =>
											buttonInfo.disabled
												? null
												: handleSubscription(
														tier.tier_name,
														selectedBillingInterval
												  )
										}
										disabled={loading || buttonInfo.disabled}
									>
										{promotionCode && !buttonInfo.disabled && showUpgradeInfo
											? `${buttonInfo.text} with Promo`
											: buttonInfo.text}
									</Button>
								</div>
							);
						})}
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
					<CardDescription>
						Your recent plan changes and payments
					</CardDescription>
				</CardHeader>
				<CardContent>
					{billingHistory.length > 0 ? (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Date</TableHead>
									<TableHead>Activity</TableHead>
									<TableHead>Description</TableHead>
									<TableHead>Status</TableHead>
									<TableHead className="text-right">Invoice</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{billingHistory.map((item, index) => {
									// Helper function to get activity type and styling
									const getActivityInfo = (
										transactionType: string,
										amount: number
									) => {
										switch (transactionType) {
											case "upgrade":
												return {
													label: "Upgrade",
													color: "bg-green-100 text-green-800",
													icon: "📈",
												};
											case "downgrade":
												return {
													label: "Downgrade",
													color: "bg-orange-100 text-orange-800",
													icon: "📉",
												};
											case "upgrade_with_promo":
												return {
													label: "Upgrade + Promo",
													color: "bg-purple-100 text-purple-800",
													icon: "🎟️",
												};
											case "trial_change":
												return {
													label: "Trial Change",
													color: "bg-blue-100 text-blue-800",
													icon: "🆓",
												};
											case "plan_change":
												return {
													label: "Plan Change",
													color: "bg-gray-100 text-gray-800",
													icon: "🔄",
												};
											case "subscription":
												return {
													label: amount > 0 ? "Payment" : "Refund",
													color:
														amount > 0
															? "bg-green-100 text-green-800"
															: "bg-red-100 text-red-800",
													icon: amount > 0 ? "💳" : "💰",
												};
											case "lifetime":
												return {
													label: "Lifetime Purchase",
													color: "bg-yellow-100 text-yellow-800",
													icon: "⭐",
												};
											case "superseded":
												return {
													label: "Plan Replaced",
													color: "bg-gray-100 text-gray-600",
													icon: "🔄",
												};
											default:
												return {
													label: transactionType || "Activity",
													color: "bg-gray-100 text-gray-800",
													icon: "📋",
												};
										}
									};

									const activityInfo = getActivityInfo(
										item.transaction_type || "",
										item.amount_gbp || 0
									);

									return (
										<TableRow key={index}>
											<TableCell>
												{new Date(item.created_at || "").toLocaleDateString(
													"en-GB"
												)}
											</TableCell>
											<TableCell>
												<Badge
													variant="outline"
													className={`${activityInfo.color}`}
												>
													<span className="mr-1">{activityInfo.icon}</span>
													{activityInfo.label}
												</Badge>
											</TableCell>
											<TableCell className="max-w-md">
												<div className="text-sm">{item.description}</div>
												{item.amount_gbp > 0 && (
													<div className="text-xs text-muted-foreground mt-1">
														Amount: £{item.amount_gbp.toFixed(2)}
													</div>
												)}
												{item.proration_amount && item.proration_amount > 0 && (
													<div className="text-xs text-blue-600 mt-1">
														Proration: £{item.proration_amount.toFixed(2)}
													</div>
												)}
											</TableCell>
											<TableCell>
												<Badge
													variant={
														item.status === "paid" ||
														item.status === "completed"
															? "default"
															: item.status === "pending"
															? "secondary"
															: item.status === "trial"
															? "outline"
															: "destructive"
													}
													className={
														item.status === "trial"
															? "bg-blue-50 text-blue-700 border-blue-200"
															: ""
													}
												>
													{item.status === "completed"
														? "✅ Complete"
														: item.status === "paid"
														? "✅ Paid"
														: item.status === "trial"
														? "🆓 Trial"
														: item.status === "pending"
														? "⏳ Pending"
														: item.status}
												</Badge>
											</TableCell>
											<TableCell className="text-right">
												{item.invoice_url && (
													<Button variant="ghost" size="sm" asChild>
														<a
															href={item.invoice_url}
															target="_blank"
															rel="noopener noreferrer"
														>
															<Download className="h-4 w-4" />
														</a>
													</Button>
												)}
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					) : (
						<p className="text-center text-muted-foreground py-8">
							No billing history found.
						</p>
					)}
				</CardContent>
			</Card>

			{/* Add this near other status badges */}
			{subscription?.cancel_at_period_end && (
				<div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
					<div className="flex items-start gap-3">
						<div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
						<div className="flex-1">
							<h4 className="font-semibold text-yellow-900 mb-2">
								Subscription Cancellation Scheduled
							</h4>
							<div className="space-y-2 text-sm text-yellow-800">
								<p>
									Your subscription will remain active until the end of the
									current billing period:{" "}
									<span className="font-medium">
										{new Date(
											subscription.current_period_end
										).toLocaleDateString("en-GB")}
									</span>
								</p>
								<p>
									You'll continue to have full access to your current plan
									features until then. No partial refunds are provided for
									cancellations.
								</p>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Add warning when trying to upgrade during cancellation */}
			{showUpgradeInfo && subscription?.cancel_at_period_end && (
				<div className="mt-2 p-3 bg-yellow-50 rounded text-xs">
					<p className="text-yellow-800">
						⚠️ You cannot upgrade while your subscription is pending
						cancellation. Your current plan will remain active until{" "}
						{new Date(subscription.current_period_end).toLocaleDateString(
							"en-GB"
						)}
						.
					</p>
				</div>
			)}
		</div>
	);
}
