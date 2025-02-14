import React from 'react';
import { DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import StatsCard from '../dashboard/StatsCard';

export default function Payments() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-primary mb-6">Payments Overview</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatsCard
          title="Total Revenue"
          value="$12,450"
          icon={DollarSign}
          trend="+15%"
          description="vs last month"
        />
        <StatsCard
          title="Outstanding Balance"
          value="$2,380"
          icon={TrendingUp}
          trend="8 invoices"
          description="pending payment"
        />
        <StatsCard
          title="Overdue Payments"
          value="$850"
          icon={AlertCircle}
          trend="3 invoices"
          description="overdue"
        />
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-brand-primary mb-4">Recent Transactions</h2>
        <div className="space-y-4">
          <p className="text-center text-gray-500 py-4">
            Payment history will appear here
          </p>
        </div>
      </div>
    </div>
  );
}