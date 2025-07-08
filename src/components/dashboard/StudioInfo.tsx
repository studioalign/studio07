import React, { useState, useEffect } from "react";
import { MapPin, Phone, Mail, Save, Plus, Globe, CreditCard, Building2 } from "lucide-react";
import FormField from "../FormField";
import RoomCard from "./RoomCard";
import AddRoomForm from "./AddRoomForm";
import BankAccountSetup from "./BankAccountSetup";
import { supabase } from "../../lib/supabase";
import type { StudioInfo as StudioInfoType } from "../../types/studio";
import { useData } from "../../contexts/DataContext";
import { useLocalization } from "../../contexts/LocalizationContext";
import { useAuth } from "../../contexts/AuthContext";
import { SUPPORTED_COUNTRIES } from "../../utils/formatters";
import { getStudioPaymentMethods } from "../../utils/studioUtils";
import BankDetailsSetup from './BankDetailsSetup';

const TIMEZONE_LABELS: Record<string, string> = {
	// UK & Ireland
	"Europe/London": "London (GMT/BST)",
	"Europe/Dublin": "Dublin (GMT/IST)",
	// US
	"America/New_York": "Eastern Time (ET)",
	"America/Chicago": "Central Time (CT)",
	"America/Denver": "Mountain Time (MT)",
	"America/Los_Angeles": "Pacific Time (PT)",
	"America/Phoenix": "Arizona (MT - no DST)",
	"America/Anchorage": "Alaska Time (AKT)",
	"Pacific/Honolulu": "Hawaii Time (HST)",
	// Canada
	"America/Toronto": "Eastern Time (ET)",
	"America/Vancouver": "Pacific Time (PT)",
	"America/Edmonton": "Mountain Time (MT)",
	"America/Winnipeg": "Central Time (CT)",
	"America/Halifax": "Atlantic Time (AT)",
	"America/St_Johns": "Newfoundland Time (NT)",
	// Australia
	"Australia/Sydney": "Sydney (AEST/AEDT)",
	"Australia/Melbourne": "Melbourne (AEST/AEDT)",
	"Australia/Brisbane": "Brisbane (AEST)",
	"Australia/Adelaide": "Adelaide (ACST/ACDT)",
	"Australia/Perth": "Perth (AWST)",
	"Australia/Darwin": "Darwin (ACST)",
	"Australia/Hobart": "Hobart (AEST/AEDT)",
	// New Zealand
	"Pacific/Auckland": "Auckland (NZST/NZDT)",
	"Pacific/Chatham": "Chatham Islands (CHAST/CHADT)",
};

interface Room {
	id: string;
	name: string;
	capacity?: number;
	description: string;
	address?: string;
}

type Role = "owner" | "teacher" | "parent" | "student";

export default function StudioInfo() {
	const { profile } = useAuth();
	const [rooms, setRooms] = useState<Room[]>([]);
	const [loadingLocations, setLoadingLocations] = useState(false);
	const [showAddRoom, setShowAddRoom] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [hasActiveStripeSubscriptions, setHasActiveStripeSubscriptions] = useState(false);
	const [timezone, setTimezone] = useState("Europe/London");
	const [dateFormat, setDateFormat] = useState("dd/MM/yyyy");
	const [localStudioInfo, setLocalStudioInfo] = useState<StudioInfoType | null>(null);
	const [localPaymentMethods, setLocalPaymentMethods] = useState<{
		stripe: boolean;
		bacs: boolean;
	}>({ stripe: true, bacs: false });
	const { updateLocalization } = useLocalization();

	const { error: dataError, isLoading: dataLoading, refreshData } = useData();

	// Get studio payment methods from current profile
	useEffect(() => {
		if (profile?.studio && !localStudioInfo) {
			setLocalStudioInfo(profile.studio);
			
			// Initialize payment methods
			const paymentMethods = getStudioPaymentMethods(profile.studio);
			setLocalPaymentMethods(paymentMethods);
			
			// Check for active Stripe subscriptions
			const checkSubscriptions = async () => {
				try {
					const { count, error } = await supabase
						.from('invoices')
						.select('*', { count: 'exact', head: true })
						.eq('studio_id', profile.studio?.id || '')
						.eq('payment_method', 'stripe')
						.eq('is_recurring', true)
						.eq('status', 'active');
						
					if (error) throw error;
					setHasActiveStripeSubscriptions(count > 0);
				} catch (err) {
					console.error('Error checking for active subscriptions:', err);
				}
			};
			
			checkSubscriptions();
		}
	}, [profile?.studio, localStudioInfo]);

	const fetchRooms = async () => {
		if (!profile?.studio?.id) return;

		setLoadingLocations(true);
		try {
			const { data, error } = await supabase
				.from("locations")
				.select("*")
				.eq("studio_id", profile.studio.id);

			if (error) throw error;
			setRooms(data || []);
		} catch (err) {
			console.error("Error fetching locations:", err);
		} finally {
			setLoadingLocations(false);
		}
	};

	const handleDeleteRoom = async (roomId: string) => {
		try {
			const { error } = await supabase
				.from("locations")
				.delete()
				.eq("id", roomId);

			if (error) throw error;
			
			// Remove from local state
			setRooms(prev => prev.filter(room => room.id !== roomId));
		} catch (err) {
			console.error("Error deleting room:", err);
			setError("Failed to delete room");
		}
	};

	useEffect(() => {
		fetchRooms();
	}, [profile?.studio?.id]);

	const handleSave = async () => {
		if (!localStudioInfo || !profile?.studio?.id) return;

		setIsLoading(true);
		setError(null);

		try {
			const country = SUPPORTED_COUNTRIES.find(
				(c) => c.currency === localStudioInfo.currency
			)?.code;

			const { error } = await supabase
				.from("studios")
				.update({
					name: localStudioInfo?.name,
					address: localStudioInfo?.address,
					phone: localStudioInfo?.phone,
					email: localStudioInfo?.email,
					country: country,
					currency: SUPPORTED_COUNTRIES.find((c) => c.code === country)
						?.currency,
					timezone: timezone,
					payment_methods_enabled: localPaymentMethods,
					bacs_enabled: localPaymentMethods.bacs,
					updated_at: new Date().toISOString(),
				})
				.eq("id", profile?.studio?.id + "");

			if (error) throw error;

			// Update localization
			updateLocalization({
				currency: localStudioInfo.currency,
				timezone: timezone,
				payment_methods_enabled: localPaymentMethods,
				bacs_enabled: localPaymentMethods.bacs,
				dateFormat: dateFormat,
			});

			setIsEditing(false);
			await refreshData();
		} catch (err) {
			console.error("Error updating studio:", err);
			setError(err instanceof Error ? err.message : "Failed to update studio");
		} finally {
			setIsLoading(false);
		}
	};

	if (dataLoading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="animate-spin rounded-full h-32 w-32 border-b-2 border-brand-primary"></div>
			</div>
		);
	}

	if (dataError) {
		return (
			<div className="text-center text-red-600 p-6">
				Error loading studio information: {dataError}
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<h1 className="text-2xl font-bold text-brand-primary">Studio Information</h1>
				<button
					onClick={isEditing ? handleSave : () => setIsEditing(true)}
					disabled={isLoading}
					className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400 disabled:opacity-50"
				>
					<Save className="w-5 h-5 mr-2" />
					{isEditing ? "Save Changes" : "Edit Information"}
				</button>
				{error && <p className="text-red-500 text-sm ml-4">{error}</p>}
			</div>

			{/* Studio Details Card */}
			<div className="bg-white rounded-lg shadow p-6">
				<h2 className="text-xl font-semibold text-brand-primary mb-4">
					Studio Details
				</h2>
				<div className="space-y-6">
					{/* Location Information */}
					<div>
						<div className="flex items-center mb-4">
							<MapPin className="w-5 h-5 text-brand-accent mr-2" />
							<h3 className="font-medium">Location Information</h3>
						</div>
						{isEditing && localStudioInfo ? (
							<div className="space-y-4 pl-7">
								<FormField
									id="studioName"
									label="Studio Name"
									value={localStudioInfo.name}
									onChange={(value) =>
										setLocalStudioInfo({ ...localStudioInfo, name: value })
									}
								/>
								<FormField
									id="address"
									label="Address"
									value={localStudioInfo.address}
									onChange={(value) =>
										setLocalStudioInfo({ ...localStudioInfo, address: value })
									}
								/>
							</div>
						) : (
							<div className="pl-7 space-y-2">
								<p className="font-medium text-gray-900">
									{profile?.studio?.name}
								</p>
								<p className="text-brand-secondary-400">
									{profile?.studio?.address}
								</p>
							</div>
						)}
					</div>

					{/* Contact Information */}
					<div>
						<div className="flex items-center mb-4">
							<Phone className="w-5 h-5 text-brand-accent mr-2" />
							<h3 className="font-medium">Contact Information</h3>
						</div>
						{isEditing && localStudioInfo ? (
							<div className="space-y-4 pl-7">
								<FormField
									id="phone"
									type="tel"
									label="Phone Number"
									value={localStudioInfo.phone}
									onChange={(value) =>
										setLocalStudioInfo({
											...localStudioInfo,
											phone: value,
										})
									}
								/>
								<FormField
									id="email"
									type="email"
									label="Email Address"
									value={localStudioInfo.email}
									onChange={(value) =>
										setLocalStudioInfo({
											...localStudioInfo,
											email: value,
										})
									}
								/>
							</div>
						) : (
							<div className="pl-7 space-y-2">
								<p className="text-brand-secondary-400">
									{profile?.studio?.phone}
								</p>
								<p className="text-brand-secondary-400">
									{profile?.studio?.email}
								</p>
							</div>
						)}
					</div>

					{/* Localization Settings */}
					<div>
						<div className="flex items-center mb-4">
							<Globe className="w-5 h-5 text-brand-accent mr-2" />
							<h3 className="font-medium">Localization Settings</h3>
						</div>
						{isEditing ? (
							<div className="space-y-4 pl-7">
								<div>
									<label className="block text-sm font-medium text-brand-secondary-400 mb-1">
										Currency
									</label>
									<select
										value={localStudioInfo?.currency || "GBP"}
										onChange={(e) =>
											setLocalStudioInfo(
												localStudioInfo
													? { ...localStudioInfo, currency: e.target.value }
													: null
											)
										}
										className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
									>
										{SUPPORTED_COUNTRIES.map((country) => (
											<option key={country.code} value={country.currency}>
												{country.currency} - {country.name}
											</option>
										))}
									</select>
								</div>
								<div>
									<label className="block text-sm font-medium text-brand-secondary-400 mb-1">
										Timezone
									</label>
									<select
										value={timezone}
										onChange={(e) => setTimezone(e.target.value)}
										className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
									>
										{Object.entries(TIMEZONE_LABELS).map(([value, label]) => (
											<option key={value} value={value}>
												{label}
											</option>
										))}
									</select>
								</div>
							</div>
						) : (
							<div className="pl-7 space-y-2">
								<p className="text-brand-secondary-400">
									Currency: {profile?.studio?.currency || "Not set"}
								</p>
								<p className="text-brand-secondary-400">
									Timezone: {TIMEZONE_LABELS[timezone] || timezone}
								</p>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Payment Methods Card - SEPARATE SECTION */}
			<div className="bg-white rounded-lg shadow p-6">
				<div className="flex justify-between items-center mb-4">
					<div className="flex items-center">
						<CreditCard className="w-5 h-5 text-brand-primary mr-2" />
						<h2 className="text-xl font-semibold text-brand-primary">Payment Methods</h2>
					</div>
				</div>

				{isEditing ? (
					<div className="space-y-4">
						<div className="space-y-2">
							<label className="flex items-center space-x-2">
								<input 
									type="checkbox" 
									checked={localPaymentMethods.stripe}
									onChange={(e) => {
										const newValue = e.target.checked;
										// Prevent disabling both
										if (!newValue && !localPaymentMethods.bacs) {
											setError("At least one payment method must be enabled");
											return;
										}
										setLocalPaymentMethods(prev => ({ ...prev, stripe: newValue }));
									}}
									disabled={hasActiveStripeSubscriptions && !localPaymentMethods.bacs}
									className="h-4 w-4 text-brand-primary border-gray-300 rounded focus:ring-brand-accent"
								/>
								<span className="text-sm text-gray-700">Stripe Payments (Card payments with automatic processing)</span>
							</label>
							{hasActiveStripeSubscriptions && !localPaymentMethods.bacs && (
								<p className="text-sm text-red-600 ml-6">
									Cannot disable while you have active Stripe subscriptions
								</p>
							)}
							
							<label className="flex items-center space-x-2">
								<input 
									type="checkbox" 
									checked={localPaymentMethods.bacs}
									onChange={(e) => {
										const newValue = e.target.checked;
										// Prevent disabling both
										if (!newValue && !localPaymentMethods.stripe) {
											setError("At least one payment method must be enabled");
											return;
										}
										setLocalPaymentMethods(prev => ({ ...prev, bacs: newValue }));
									}}
									className="h-4 w-4 text-brand-primary border-gray-300 rounded focus:ring-brand-accent"
								/>
								<span className="text-sm text-gray-700">BACS/Bank Transfer (Manual payments via bank transfer)</span>
							</label>
						</div>
						
						{localPaymentMethods.bacs && (
							<div className="mt-4 p-4 bg-blue-50 rounded-lg">
								<p className="text-sm text-blue-800">
									When BACS is enabled, you can create invoices that parents pay manually via bank transfer. 
									You'll need to mark these payments as received in StudioAlign.
								</p>
							</div>
						)}
					</div>
				) : (
					<div className="space-y-2">
						<div className="flex flex-wrap gap-2">
							{localPaymentMethods.stripe && (
								<span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
									<CreditCard className="w-3 h-3 mr-1" />
									Stripe Payments
								</span>
							)}
							{localPaymentMethods.bacs && (
								<span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
									<Building2 className="w-3 h-3 mr-1" />
									BACS/Bank Transfer
								</span>
							)}
						</div>
						{!localPaymentMethods.stripe && !localPaymentMethods.bacs && (
							<p className="text-gray-500">No payment methods configured</p>
						)}
					</div>
				)}

				{/* Bank Account Setup */}
				<div className="mt-6">
					<BankAccountSetup />
				</div>

				{/* Bank Details Setup for BACS */}
				{localPaymentMethods.bacs && (
					<div className="mt-6">
						<BankDetailsSetup />
					</div>
				)}
			</div>

			{/* Studio Locations Card - SEPARATE SECTION */}
			<div className="bg-white rounded-lg shadow p-6">
				<div className="flex justify-between items-center mb-4">
					<h2 className="text-xl font-semibold text-brand-primary">Studio Locations</h2>
					<button
						onClick={() => setShowAddRoom(true)}
						className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400"
					>
						<Plus className="w-5 h-5 mr-2" />
						Add Location
					</button>
				</div>

				{showAddRoom && (
					<div className="mb-6">
						<AddRoomForm
							onClose={() => setShowAddRoom(false)}
							onSuccess={() => {
								setShowAddRoom(false);
								fetchRooms();
							}}
						/>
					</div>
				)}

				<div className="space-y-4">
					{loadingLocations ? (
						<div className="animate-pulse space-y-4">
							{[1, 2].map((i) => (
								<div key={i} className="bg-gray-100 h-24 rounded-lg" />
							))}
						</div>
					) : rooms.length > 0 ? (
						rooms.map((room) => (
							<RoomCard
								key={room.id}
								name={room.name}
								description={room.description}
								address={room.address}
								onDelete={() => handleDeleteRoom(room.id)}
							/>
						))
					) : (
						<p className="text-center text-gray-500 py-4">
							No locations added yet. Click "Add Location" to get started.
						</p>
					)}
				</div>
			</div>
		</div>
	);
}
