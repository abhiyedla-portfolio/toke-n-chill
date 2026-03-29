import { AlertTriangle } from 'lucide-react';

export default function NicotineWarning() {
  return (
    <div
      className="flex items-center gap-3 rounded-lg border px-4 py-3"
      style={{
        backgroundColor: 'rgba(234, 179, 8, 0.1)',
        borderColor: 'rgba(234, 179, 8, 0.3)',
        color: '#EAB308',
      }}
    >
      <AlertTriangle className="h-5 w-5 flex-shrink-0" style={{ color: '#EAB308' }} />
      <p className="text-sm font-medium">
        WARNING: This product contains nicotine. Nicotine is an addictive chemical.
      </p>
    </div>
  );
}
