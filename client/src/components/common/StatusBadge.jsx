import { STATUS_COLORS } from '../../utils/constants';

const StatusBadge = ({ status, className = '' }) => {
  const colorClass = STATUS_COLORS[status] || 'bg-gray-100 text-gray-800';

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${colorClass} ${className}`}
    >
      {status?.replace(/[-_]/g, ' ')}
    </span>
  );
};

export default StatusBadge;
