import React, { useState, useEffect } from "react";
import { MapPin, Phone, Mail, Save, Plus, Globe } from "lucide-react";
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

interface Location {
	id: string;
	name: string;
	description: string | null;
	address: string | null;
}
export default function StudioInfo() {
	const [isEditing, setIsEditing] = useState(false);
	const [showAddRoom, setShowAddRoom] = useState(false);
	const [locations, setLocations] = useState<Location[]>([]);
	const [loadingLocations, setLoadingLocations] = useState(true);
	const [country, setCountry] = useState("GB");
	const [timezone, setTimezone] = useState("Europe/London");
	const [dateFormat, setDateFormat] = useState("dd/MM/yyyy");
	const [localStudioInfo, setLocalStudioInfo] = useState<StudioInfoType | null>(
		null
	);
	const { updateLocalization } = useLocalization();

	const { error, isLoading, refreshData } = useData();
	const { profile } = useAuth();

	useEffect(() => {
		if (profile?.studio && !localStudioInfo) {
			setLocalStudioInfo(profile.studio);
		}
	}, [profile?.studio, localStudioInfo]);

	useEffect(() => {
	  if (!profile?.studio?.id) return;
	  
	  // Subscribe to location changes for this studio
	  const subscription = supabase
	    .channel('locations-changes')
	    .on(
	      'postgres_changes',
	      {
	        event: '*', // Listen for all events (INSERT, UPDATE, DELETE)
	        schema: 'public',
	        table: 'locations',
	        filter: `studio_id=eq.${profile.studio.id}`
	      },
	      (payload) => {
	        console.log('Location change detected:', payload);
	        // Refresh locations when something changes
	        fetchLocations();
	      }
	    )
	    .subscribe();
	  
	  // Clean up subscription on unmount
	  return () => {
	    supabase.removeChannel(subscription);
	  };
	}, [profile?.studio?.id]);

	const fetchLocations = async () => {
	  if (!profile?.studio?.id) return;
	  try {
	    setLoadingLocations(true);
	    const { data, error: fetchError } = await supabase
	      .from("locations")
	      .select("*")
	      .eq("studio_id", profile?.studio.id)
	      .order("name");
	
	    if (fetchError) throw fetchError;
	    setLocations(data || []);
	  } catch (err) {
	    console.error("Error fetching locations:", err);
	  } finally {
	    setLoadingLocations(false);
	  }
	};
	
	// Keep the existing useEffect, but now it just calls the function
	useEffect(() => {
	  fetchLocations();
	}, [profile?.studio]);
	
	const handleDeleteRoom = async (roomId: string) => {
		try {
			const { error: deleteError } = await supabase
				.from("locations")
				.delete()
				.eq("id", roomId);

			if (deleteError) throw deleteError;

			setLocations((prevLocations) =>
				prevLocations.filter((location) => location.id !== roomId)
			);
		} catch (err) {
			console.error("Error deleting room:", err);
			// You might want to show an error message to the user here
		}
	};

	const handleSave = async () => {
		try {
			// Update the existing studio record
			const { error: studioError } = await supabase
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
					updated_at: new Date().toISOString(),
				})
				.eq("id", profile?.studio?.id + "")
				.eq("owner_id", profile?.id + "");

			if (studioError) throw studioError;

			// Update localization context
			const selectedCountry = SUPPORTED_COUNTRIES.find(
				(c) => c.code === country
			);
			if (selectedCountry) {
				updateLocalization({
					country,
					timezone,
					currency: selectedCountry.currency,
					dateFormat,
				});
			}

			setIsEditing(false);
			await refreshData();
		} catch (err) {
			const error =
				err instanceof Error
					? err.message
					: "Failed to save studio information";
			console.error(error, err);
			throw error;
		}
	};

	if (isLoading) {
		return (
			<div>
				<div className="flex justify-between items-center mb-6">
					<h1 className="text-2xl font-bold text-brand-primary">
						Studio Information
					</h1>
					<div className="w-32 h-10 bg-gray-200 rounded-md animate-pulse" />
				</div>
				<div className="bg-white rounded-lg shadow p-6">
					<div className="h-6 bg-gray-200 rounded w-1/4 mb-6" />
					<div className="space-y-6">
						<div className="h-4 bg-gray-200 rounded w-3/4" />
						<div className="h-4 bg-gray-200 rounded w-1/2" />
						<div className="h-4 bg-gray-200 rounded w-2/3" />
					</div>
				</div>
			</div>
		);
	}

	return (
		<div>
			<div className="flex justify-between items-center mb-6">
				<h1 className="text-2xl font-bold text-brand-primary">
					Studio Information
				</h1>
				<button
					onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
					className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400"
				>
					<Save className="w-5 h-5 mr-2" />
					{isEditing ? "Save Changes" : "Edit Information"}
				</button>
				{error && <p className="text-red-500 text-sm ml-4">{error}</p>}
			</div>
			<div className="bg-white rounded-lg shadow p-6">
				<h2 className="text-xl font-semibold text-brand-primary mb-4">
					Studio Details
				</h2>
				<div className="space-y-6">
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

					{/* Bank Account Setup */}
					<BankAccountSetup />

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
										Country
									</label>
									<select
										value={country}
										onChange={(e) => {
											setCountry(e.target.value);
											// Reset timezone when country changes
											const newCountry = SUPPORTED_COUNTRIES.find(
												(c) => c.code === e.target.value
											);
											if (newCountry) {
												switch (newCountry.code) {
													case "GB":
														setTimezone("Europe/London");
														break;
													case "IE":
														setTimezone("Europe/Dublin");
														break;
													case "US":
														setTimezone("America/New_York");
														break;
													case "CA":
														setTimezone("America/Toronto");
														break;
													case "AU":
														setTimezone("Australia/Sydney");
														break;
													case "NZ":
														setTimezone("Pacific/Auckland");
														break;
												}
											}
										}}
										className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
									>
										{SUPPORTED_COUNTRIES.map((country) => (
											<option key={country.code} value={country.code}>
												{country.name} ({country.currency})
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
										{Object.entries(TIMEZONE_LABELS)
											.filter(([tz]) => {
												// Filter timezones based on selected country
												switch (country) {
													case "GB":
														return tz === "Europe/London";
													case "IE":
														return tz === "Europe/Dublin";
													case "US":
														return (
															tz.startsWith("America/") ||
															tz === "Pacific/Honolulu"
														);
													case "CA":
														return [
															"Toronto",
															"Vancouver",
															"Edmonton",
															"Winnipeg",
															"Halifax",
															"St_Johns",
														].some((city) => tz === `America/${city}`);
													case "AU":
														return tz.startsWith("Australia/");
													case "NZ":
														return tz.startsWith("Pacific/");
													default:
														return false;
												}
											})
											.map(([tz, label]) => (
												<option key={tz} value={tz}>
													{label}
												</option>
											))}
									</select>
								</div>

								<div>
									<label className="block text-sm font-medium text-brand-secondary-400 mb-1">
										Date Format
									</label>
									<select
										value={dateFormat}
										onChange={(e) => setDateFormat(e.target.value)}
										className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
									>
										<option value="dd/MM/yyyy">DD/MM/YYYY (31/12/2024)</option>
										<option value="MM/dd/yyyy">MM/DD/YYYY (12/31/2024)</option>
										<option value="yyyy-MM-dd">YYYY-MM-DD (2024-12-31)</option>
									</select>
								</div>
							</div>
						) : (
							<div className="pl-7 space-y-2">
								<p className="text-brand-secondary-400">
									Country:{" "}
									{SUPPORTED_COUNTRIES.find((c) => c.code === country)?.name}
								</p>
								<p className="text-brand-secondary-400">
									Timezone: {TIMEZONE_LABELS[timezone]}
								</p>
								<p className="text-brand-secondary-400">
									Currency:{" "}
									{
										SUPPORTED_COUNTRIES.find((c) => c.code === country)
											?.currency
									}
								</p>
							</div>
						)}
					</div>
				</div>
			</div>

			<div className="bg-white rounded-lg shadow p-6 mt-6">
				<div className="flex justify-between items-center mb-6">
					<h2 className="text-xl font-semibold text-brand-primary">
						Studio Rooms
					</h2>
					<button
						onClick={() => setShowAddRoom(true)}
						className="flex items-center px-4 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-secondary-400"
					>
						<Plus className="w-5 h-5 mr-2" />
						Add Room
					</button>
				</div>

				{showAddRoom && profile?.studio && (
				  <div className="mb-6">
				    <AddRoomForm
				      studioId={profile?.studio?.id}
				      onSuccess={(newRoom) => {
				        setShowAddRoom(false);
				        // If we get the new room, add it directly to state
				        if (newRoom) {
				          setLocations(prev => [...prev, newRoom]);
				        } else {
				          // Otherwise fetch all locations
				          fetchLocations();
				        }
				      }}
				      onCancel={() => setShowAddRoom(false)}
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
					) : locations.length > 0 ? (
						locations.map((location) => (
							<RoomCard
								key={location.id}
								name={location.name}
								description={location.description}
								address={location.address}
								onDelete={() => handleDeleteRoom(location.id)}
							/>
						))
					) : (
						<p className="text-center text-gray-500 py-4">
							No rooms added yet. Add your first room to get started.
						</p>
					)}
				</div>
			</div>
		</div>
	);
}
