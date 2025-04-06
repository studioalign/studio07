import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface QRCodeDisplayProps {
  uri: string;
  size?: number;
  alt?: string;
}

export default function QRCodeDisplay({ uri, size = 200, alt = 'QR Code' }: QRCodeDisplayProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uri) return;
    
    const generateQrCode = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Use a QR code generator API
        const response = await fetch(
          `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(uri)}`
        );
        
        if (!response.ok) {
          throw new Error(`Failed to generate QR code: ${response.statusText}`);
        }
        
        setQrCodeUrl(response.url);
      } catch (err) {
        console.error('Error generating QR code:', err);
        setError('Failed to generate QR code');
      } finally {
        setIsLoading(false);
      }
    };
    
    generateQrCode();
  }, [uri, size]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center" style={{ width: size, height: size }}>
        <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center bg-red-50 border border-red-200 rounded-md p-4" style={{ width: size, height: size }}>
        <p className="text-red-600 text-sm text-center">{error}</p>
      </div>
    );
  }

  if (!qrCodeUrl) {
    return (
      <div className="flex items-center justify-center bg-gray-100 rounded-md" style={{ width: size, height: size }}>
        <p className="text-gray-500 text-sm text-center">QR code not available</p>
      </div>
    );
  }

  return (
    <img 
      src={qrCodeUrl} 
      alt={alt} 
      width={size} 
      height={size} 
      className="rounded-md"
    />
  );
}
