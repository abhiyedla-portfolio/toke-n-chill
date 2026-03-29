'use client';

interface MapEmbedProps {
  address: string;
  title?: string;
  className?: string;
}

export default function MapEmbed({ address, title = 'Store Location', className = '' }: MapEmbedProps) {
  const encodedAddress = encodeURIComponent(address);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

  const src = apiKey
    ? `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodedAddress}`
    : `https://maps.google.com/maps?q=${encodedAddress}&output=embed`;

  return (
    <div className={`overflow-hidden rounded-xl border border-border ${className}`}>
      <iframe
        src={src}
        width="100%"
        height="300"
        style={{ border: 0 }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title={title}
      />
    </div>
  );
}
