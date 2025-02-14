import React, { useState, useCallback, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
	addWeeks,
	subWeeks,
	startOfWeek,
	addDays,
	format,
	isSameDay,
} from "date-fns";
import { Edit2, Trash2 } from "lucide-react";

interface ClassInstance {
	id: string;
	class_id: string;
	date: string;
	is_recurring: boolean;
	is_drop_in: boolean;
	capacity: number | null;
	drop_in_price: number | null;
	booked_count: number;
	status: string;
	name: string | null;
	start_time: string;
	end_time: string;
	teacher_id: string | null;
	teacher: {
		name: string | null;
	} | null;
	location_id: string | null;
	location: {
		name: string | null;
	} | null;
	enrolledStudents?: string[];
}

interface WeeklyCalendarProps {
	classes: ClassInstance[];
	onClassClick: (classItem: ClassInstance) => void;
	onEdit?: (classItem: ClassInstance) => void;
	onDelete?: (classItem: ClassInstance) => void;
	onBookDropIn?: (classItem: ClassInstance) => void;
	userRole: string | null;
}

export default function WeeklyCalendar({
	classes,
	onClassClick,
	onEdit,
	onDelete,
	userRole,
}: WeeklyCalendarProps) {
	const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
	const weekStart = useMemo(
		() => startOfWeek(currentDate, { weekStartsOn: 1 }),
		[currentDate]
	);

	const formatTime = useCallback((time: string) => {
		return format(new Date(`2000-01-01T${time}`), "h:mm a");
	}, []);

	const getClassesForDay = useCallback(
		(date: Date) => {
			const dateStr = format(date, "yyyy-MM-dd");
			return classes.filter((classItem) => classItem.date === dateStr);
		},
		[classes]
	);

	const handlePrevWeek = useCallback(() => {
		setCurrentDate(subWeeks(currentDate, 1));
	}, [currentDate]);

	const handleNextWeek = useCallback(() => {
		setCurrentDate(addWeeks(currentDate, 1));
	}, [currentDate]);

	const memoizedDays = useMemo(
		() =>
			Array.from({ length: 7 }).map((_, index) => {
				const day = addDays(weekStart, index);
				const dayClasses = getClassesForDay(day);
				const isToday = isSameDay(day, new Date());

				return { day, dayClasses, isToday };
			}),
		[weekStart, getClassesForDay]
	);

	return (
		<div className="bg-white rounded-lg shadow">
			<div className="flex items-center justify-between p-4 border-b">
				<button
					onClick={handlePrevWeek}
					className="p-2 hover:bg-gray-100 rounded-full"
				>
					<ChevronLeft className="w-5 h-5" />
				</button>
				<h2 className="text-lg font-semibold">
					Week of {format(weekStart, "MMMM d, yyyy")}
				</h2>
				<button
					onClick={handleNextWeek}
					className="p-2 hover:bg-gray-100 rounded-full"
				>
					<ChevronRight className="w-5 h-5" />
				</button>
			</div>

			<div className="divide-y">
				{memoizedDays.map(({ day, dayClasses, isToday }, index) => (
					<div key={index} className="p-4">
						<h3
							className={`font-medium mb-2 ${
								isToday ? "text-brand-primary" : "text-gray-900"
							}`}
						>
							{format(day, "EEEE, MMMM d")}
							{isToday && (
								<span className="ml-2 text-brand-accent">(Today)</span>
							)}
						</h3>
						<div className="space-y-2">
							{dayClasses.length > 0 ? (
								dayClasses.map((classItem) => (
									<div
										key={classItem.id}
										className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
										onClick={(e) => {
											if (!(e.target as HTMLElement).closest("button")) {
												onClassClick(classItem);
											}
										}}
									>
										<div className="flex justify-between items-start">
											<div>
												<h4 className="font-medium text-brand-primary">
													{classItem.name || "Unnamed Class"}
												</h4>
												<p className="text-sm text-brand-secondary-400">
													{formatTime(classItem.start_time)} -{" "}
													{formatTime(classItem.end_time)}
												</p>
												<p className="text-sm text-gray-600">
													Teacher:{" "}
													{classItem.teacher?.name || "Unknown Teacher"}
												</p>
												<p className="text-sm text-gray-600">
													Location:{" "}
													{classItem.location?.name || "Unknown Location"}
												</p>
												{classItem.is_drop_in && (
													<div className="mt-2 flex items-center justify-between">
														<span className="text-brand-primary font-medium">
															${classItem.drop_in_price?.toFixed(2)} per class
														</span>
														<span
															className={`text-sm ${
																classItem.capacity! - classItem.booked_count <=
																3
																	? "text-red-600"
																	: "text-gray-600"
															}`}
														>
															{classItem.capacity! - classItem.booked_count}{" "}
															spots left
														</span>
													</div>
												)}
												{userRole === "parent" && (
													<p className="text-sm text-gray-600 mt-1">
														{classItem.enrolledStudents?.length > 0
															? `Enrolled: ${classItem.enrolledStudents.join(
																	", "
															  )}`
															: "Not enrolled"}
													</p>
												)}

												{userRole === "owner" && (
													<div className="flex space-x-2 mt-2">
														<button
															onClick={(e) => {
																e.stopPropagation();
																onEdit?.(classItem);
															}}
															className="p-1 text-gray-400 hover:text-brand-primary transition-colors"
															title="Edit class"
														>
															<Edit2 className="w-4 h-4" />
														</button>
														<button
															onClick={(e) => {
																e.stopPropagation();
																onDelete?.(classItem);
															}}
															className="p-1 text-gray-400 hover:text-red-500 transition-colors"
															title="Delete class"
														>
															<Trash2 className="w-4 h-4" />
														</button>
													</div>
												)}
											</div>
										</div>
										{userRole === "parent" && (
											<div className="mt-2">
												{classItem.enrolledStudents?.length > 0 ? (
													<p className="text-sm text-gray-600">
														Enrolled: {classItem.enrolledStudents.join(", ")}
													</p>
												) : classItem.is_drop_in ? (
													<button
														onClick={(e) => {
															e.stopPropagation();
															onBookDropIn?.(classItem);
														}}
														disabled={
															classItem.capacity! <= classItem.booked_count
														}
														className="w-full mt-2 px-3 py-1.5 bg-brand-primary text-white text-sm rounded hover:bg-brand-secondary-400 disabled:bg-gray-400"
													>
														Book Drop-in Class
													</button>
												) : (
													<p className="text-sm text-gray-600">Not enrolled</p>
												)}
											</div>
										)}
									</div>
								))
							) : (
								<p className="text-sm text-gray-500 py-2">
									No classes scheduled
								</p>
							)}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
