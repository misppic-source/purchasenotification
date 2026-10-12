import React from 'react';
import { ScheduleStatus, ArrivalRequestStatus } from '../../types';

interface StatusBadgeProps {
  status: ScheduleStatus | ArrivalRequestStatus | string;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
}) => {
  let label = status.replace(/_/g, ' ');
  let dotColor = 'bg-slate-400';
  let textColor = 'text-slate-700';
  let bgColor = 'bg-slate-100';

  switch (status) {
    case 'SCHEDULED':
      label = 'Scheduled';
      dotColor = 'bg-slate-400';
      textColor = 'text-slate-700';
      bgColor = 'bg-slate-100/80';
      break;
    case 'DUE_SOON':
      label = 'Due Soon';
      dotColor = 'bg-amber-500';
      textColor = 'text-amber-800';
      bgColor = 'bg-amber-50/80';
      break;
    case 'DUE_TODAY':
      label = 'Due Today';
      dotColor = 'bg-blue-600 animate-pulse';
      textColor = 'text-blue-900 font-semibold';
      bgColor = 'bg-blue-50';
      break;
    case 'OVERDUE':
      label = 'Overdue';
      dotColor = 'bg-rose-600';
      textColor = 'text-rose-900 font-bold';
      bgColor = 'bg-rose-50';
      break;
    case 'ARRIVAL_PENDING_APPROVAL':
    case 'PENDING_APPROVAL':
      label = 'Awaiting PPIC Approval';
      dotColor = 'bg-amber-600 animate-pulse';
      textColor = 'text-amber-900 font-semibold';
      bgColor = 'bg-amber-50';
      break;
    case 'PARTIALLY_RECEIVED':
    case 'PARTIALLY_APPROVED':
      label = 'Partially Received';
      dotColor = 'bg-teal-600';
      textColor = 'text-teal-900 font-semibold';
      bgColor = 'bg-teal-50';
      break;
    case 'RECEIVED':
    case 'APPROVED':
      label = 'Official Received';
      dotColor = 'bg-emerald-600';
      textColor = 'text-emerald-900 font-semibold';
      bgColor = 'bg-emerald-50';
      break;
    case 'ARRIVAL_REJECTED':
    case 'REJECTED':
      label = 'Rejected';
      dotColor = 'bg-rose-500';
      textColor = 'text-rose-900';
      bgColor = 'bg-rose-50';
      break;
    case 'CANCELLED':
      label = 'Cancelled';
      dotColor = 'bg-slate-400';
      textColor = 'text-slate-500 line-through';
      bgColor = 'bg-slate-100';
      break;
  }

  const sizeClass =
    size === 'sm'
      ? 'text-[11px] px-2 py-0.5 gap-1.5'
      : size === 'lg'
      ? 'text-xs px-2.5 py-1 gap-2'
      : 'text-[11px] px-2 py-0.5 gap-1.5';

  return (
    <span
      className={`inline-flex items-center rounded-md font-medium tracking-tight border border-black/5 ${sizeClass} ${textColor} ${bgColor}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
      <span>{label}</span>
    </span>
  );
};
