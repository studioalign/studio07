import { format as dateFnsFormat } from 'date-fns';

const CURRENCY_FORMATS: Record<string, { symbol: string, position: 'before' | 'after' }> = {
  GBP: { symbol: '£', position: 'before' }, // Default
  EUR: { symbol: '€', position: 'before' },
  USD: { symbol: '$', position: 'before' },
  CAD: { symbol: 'C$', position: 'before' },
  AUD: { symbol: 'A$', position: 'before' },
  NZD: { symbol: 'NZ$', position: 'before' }
};

export const formatCurrency = (amount: number, currency: string = 'GBP') => {
  const format = CURRENCY_FORMATS[currency] || CURRENCY_FORMATS.GBP;
  const locale = currency === 'GBP' ? 'en-GB' : 'en-US';
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);

  return format.position === 'before' 
    ? `${format.symbol}${formatted}`
    : `${formatted}${format.symbol}`;
};

export const formatDate = (
  date: string | Date,
  format: string = 'dd/MM/yyyy',
  timezone: string = 'Europe/London'
) => {
  const d = new Date(date);
  return dateFnsFormat(d, format);
};

export const formatTime = (time: string, timezone: string = 'Europe/London') => {
  try {
    const date = new Date();
    const [hours, minutes] = time.split(':');
    date.setHours(parseInt(hours), parseInt(minutes));

    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: timezone,
      hour12: true
    }).format(date);
  } catch (err) {
    console.error('Error formatting time:', err);
    return time;
  }
};

export const formatPhoneNumber = (phone: string, countryCode: string = 'GB') => {
  const cleaned = phone.replace(/\D/g, '');
  
  switch (countryCode) {
    case 'US':
    case 'CA':
      return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
    case 'GB':
      return cleaned.replace(/(\d{4})(\d{6})/, '$1 $2');
    case 'IE':
      return cleaned.replace(/(\d{2})(\d{7})/, '$1 $2');
    case 'AU':
      return cleaned.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
    case 'NZ':
      return cleaned.replace(/(\d{2})(\d{3})(\d{4})/, '$1 $2 $3');
    default:
      return phone;
  }
};