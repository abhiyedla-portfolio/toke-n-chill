'use client';

interface StockBadgeProps {
  inStock?: boolean;
  stockQuantity?: number;
  size?: 'sm' | 'md';
}

export default function StockBadge({ inStock, stockQuantity, size = 'sm' }: StockBadgeProps) {
  // No stock data available — don't render anything
  if (inStock === undefined) return null;

  const isLowStock = inStock && stockQuantity !== undefined && stockQuantity > 0 && stockQuantity <= 3;

  const dotSize = size === 'sm' ? 'h-1.5 w-1.5' : 'h-2 w-2';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  if (!inStock) {
    return (
      <span className={`inline-flex items-center gap-1 ${textSize} text-gray-500`}>
        <span className={`${dotSize} rounded-full bg-gray-400`} />
        Out of Stock
      </span>
    );
  }

  if (isLowStock) {
    return (
      <span className={`inline-flex items-center gap-1 ${textSize} text-amber-600`}>
        <span className={`${dotSize} rounded-full bg-amber-500`} />
        Low Stock
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 ${textSize} text-green-600`}>
      <span className={`${dotSize} rounded-full bg-green-500`} />
      In Stock
    </span>
  );
}
