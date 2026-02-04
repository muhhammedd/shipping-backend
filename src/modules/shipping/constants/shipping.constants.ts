// Egyptian cities for address validation
export const EGYPTIAN_CITIES = [
    'Cairo',
    'Alexandria',
    'Giza',
    'Shubra El Kheima',
    'Port Said',
    'Suez',
    'Luxor',
    'Mansoura',
    'El-Mahalla El-Kubra',
    'Tanta',
    'Asyut',
    'Ismailia',
    'Fayyum',
    'Zagazig',
    'Aswan',
    'Damietta',
    'Damanhur',
    'Minya',
    'Beni Suef',
    'Qena',
    'Sohag',
    'Hurghada',
    'Shibin El Kom',
    'Banha',
    'Kafr El Sheikh',
    'Arish',
    'Mallawi',
    '10th of Ramadan City',
    '6th of October City',
    'Obour City',
    'New Cairo',
    'Nasr City',
    'Heliopolis',
    'Maadi',
    'Zamalek',
    'Dokki',
    'Mohandessin',
    'Helwan',
    'Sharm El Sheikh',
    'Marsa Alam',
    'Dahab',
    'El Gouna',
    'Safaga',
    'Quseer',
    'Ras Gharib',
];

// Normalize city name for comparison
export function normalizeCityName(city: string): string {
    return city
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/^el-/, '')
        .replace(/^al-/, '');
}

// Find closest matching city (for typo suggestions)
export function findClosestCity(input: string): string | null {
    const normalized = normalizeCityName(input);

    // Exact match
    const exactMatch = EGYPTIAN_CITIES.find(
        city => normalizeCityName(city) === normalized
    );
    if (exactMatch) return exactMatch;

    // Partial match
    const partialMatch = EGYPTIAN_CITIES.find(
        city => normalizeCityName(city).includes(normalized) ||
            normalized.includes(normalizeCityName(city))
    );

    return partialMatch || null;
}

// Validate Egyptian phone number
export function isValidEgyptianPhone(phone: string): boolean {
    // Remove spaces, dashes, and plus signs
    const cleaned = phone.replace(/[\s\-+]/g, '');

    // Egyptian phone patterns:
    // Mobile: 01[0-2,5][0-9]{8} (11 digits)
    // Landline: 0[2-9][0-9]{7,8} (9-10 digits)
    const mobilePattern = /^01[0125]\d{8}$/;
    const landlinePattern = /^0[2-9]\d{7,8}$/;

    return mobilePattern.test(cleaned) || landlinePattern.test(cleaned);
}

// Time slot definitions
export const TIME_SLOTS = [
    { id: 'morning', label: 'Morning', start: '09:00', end: '12:00' },
    { id: 'afternoon', label: 'Afternoon', start: '12:00', end: '15:00' },
    { id: 'evening', label: 'Evening', start: '15:00', end: '18:00' },
    { id: 'night', label: 'Night', start: '18:00', end: '21:00' },
];

// Failure reasons for failed deliveries
export const DELIVERY_FAILURE_REASONS = [
    'Customer not available',
    'Wrong address',
    'Customer refused delivery',
    'Incomplete address',
    'Customer requested reschedule',
    'Security/Access issues',
    'Weather conditions',
    'Vehicle breakdown',
    'Other',
];
