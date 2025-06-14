import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { PartyPopper, ArrowUpCircle, ArrowDownCircle } from "lucide-react";

type FeedbackType = "new" | "upgrade" | "downgrade";

interface SubscriptionFeedbackProps {
	type: FeedbackType;
	onClose: () => void;
	autoCloseDelay?: number;
}

const feedbackConfig = {
	new: {
		icon: PartyPopper,
		title: "Welcome aboard! 🎉",
		message: "Your subscription has been successfully activated.",
		color: "bg-green-50 border-green-200",
		iconColor: "text-green-600",
	},
	upgrade: {
		icon: ArrowUpCircle,
		title: "Upgraded Successfully! 📈",
		message: "Your subscription has been upgraded. Enjoy the new features!",
		color: "bg-blue-50 border-blue-200",
		iconColor: "text-blue-600",
	},
	downgrade: {
		icon: ArrowDownCircle,
		title: "Plan Changed ✨",
		message: "Your subscription has been adjusted to the new plan.",
		color: "bg-orange-50 border-orange-200",
		iconColor: "text-orange-600",
	},
};

export default function SubscriptionFeedback({
	type,
	onClose,
	autoCloseDelay = 5000,
}: SubscriptionFeedbackProps) {
	useEffect(() => {
		const timer = setTimeout(() => {
			onClose();
		}, autoCloseDelay);

		return () => clearTimeout(timer);
	}, [autoCloseDelay, onClose]);

	const config = feedbackConfig[type];
	const Icon = config.icon;

	return (
		<AnimatePresence>
			<div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
				<motion.div
					initial={{ scale: 0.9, opacity: 0 }}
					animate={{ scale: 1, opacity: 1 }}
					exit={{ scale: 0.9, opacity: 0 }}
					transition={{ type: "spring", duration: 0.5 }}
				>
					<Card className={`w-[400px] p-6 ${config.color}`}>
						<div className="flex flex-col items-center text-center space-y-4">
							<motion.div
								initial={{ rotate: 0 }}
								animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
								transition={{ duration: 1.5, delay: 0.2 }}
								className={`rounded-full p-3 ${config.iconColor}`}
							>
								<Icon className="w-12 h-12" />
							</motion.div>

							<motion.h2
								initial={{ y: 20, opacity: 0 }}
								animate={{ y: 0, opacity: 1 }}
								transition={{ delay: 0.3 }}
								className="text-2xl font-bold"
							>
								{config.title}
							</motion.h2>

							<motion.p
								initial={{ y: 20, opacity: 0 }}
								animate={{ y: 0, opacity: 1 }}
								transition={{ delay: 0.4 }}
								className="text-gray-600"
							>
								{config.message}
							</motion.p>

							<motion.div
								initial={{ y: 20, opacity: 0 }}
								animate={{ y: 0, opacity: 1 }}
								transition={{ delay: 0.5 }}
							>
								<Button onClick={onClose} className="mt-4">
									Continue
								</Button>
							</motion.div>
						</div>
					</Card>
				</motion.div>
			</div>
		</AnimatePresence>
	);
}
