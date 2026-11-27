// Official investment package specifications for Sunset Group divisions
export interface DivisionPackageSpec {
  name: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  price: number;
  bookingMoney: number;
  units: number;
  sharesText: string;
  space?: string;
  perks: string;
}

export const DIVISION_PACKAGES: Record<string, DivisionPackageSpec[]> = {
  // Sunset Kuakata Hotel & Resort
  SKH: [
    {
      name: 'Bronze',
      price: 570000,
      bookingMoney: 150000,
      units: 1,
      sharesText: '1x Unit',
      space: '28 sft (Land 8 + Constr. 20)',
      perks: '10 Days Stay · 40% Resort Discount',
    },
    {
      name: 'Silver',
      price: 1680000,
      bookingMoney: 450000,
      units: 3,
      sharesText: '3x Units',
      space: '84 sft (Land 24 + Constr. 60)',
      perks: '33 Days Stay · 50% Resort Discount',
    },
    {
      name: 'Gold',
      price: 2750000,
      bookingMoney: 750000,
      units: 5,
      sharesText: '5x Units',
      space: '140 sft (Land 40 + Constr. 100)',
      perks: '56 Days Stay · 60% Resort Discount',
    },
    {
      name: 'Platinum',
      price: 5400000,
      bookingMoney: 1200000,
      units: 10,
      sharesText: '10x Units',
      space: '280 sft (Land 80 + Constr. 200)',
      perks: '112 Days Stay · 60% Resort Discount',
    },
  ],
  // The Deck – Cox's Bazar
  DECK: [
    {
      name: 'Bronze',
      price: 580000,
      bookingMoney: 150000,
      units: 1,
      sharesText: '1x Unit',
      space: 'Luxury Suite Share (120 Rooms / G+11)',
      perks: '7 Days Stay · Saf-Kabala Deed · Halal Profit',
    },
    {
      name: 'Silver',
      price: 1700000,
      bookingMoney: 450000,
      units: 3,
      sharesText: '3x Units',
      space: 'Luxury Suite Share (120 Rooms / G+11)',
      perks: '21 Days Stay · Saf-Kabala Deed · Halal Profit',
    },
    {
      name: 'Gold',
      price: 2700000,
      bookingMoney: 750000,
      units: 5,
      sharesText: '5x Units',
      space: 'Luxury Suite Share (120 Rooms / G+11)',
      perks: '35 Days Stay · Saf-Kabala Deed · Halal Profit',
    },
    {
      name: 'Platinum',
      price: 5300000,
      bookingMoney: 1050000,
      units: 10,
      sharesText: '10x Units',
      space: 'Luxury Suite Share (120 Rooms / G+11)',
      perks: '70 Days Stay · Saf-Kabala Deed · Halal Profit',
    },
  ],
  // Dhaka Fantasy Island
  DFI: [
    {
      name: 'Bronze',
      price: 350000,
      bookingMoney: 100000,
      units: 1,
      sharesText: '1x Unit',
      space: '14 sft (Land 4 + Constr. 10)',
      perks: '3 Days Stay · 10% Resort Discount',
    },
    {
      name: 'Silver',
      price: 1020000,
      bookingMoney: 300000,
      units: 3,
      sharesText: '3x Units',
      space: '42 sft (Land 12 + Constr. 30)',
      perks: '10 Days Stay · 15% Resort Discount',
    },
    {
      name: 'Gold',
      price: 1650000,
      bookingMoney: 500000,
      units: 5,
      sharesText: '5x Units',
      space: '70 sft (Land 20 + Constr. 50)',
      perks: '17 Days Stay · 20% Resort Discount',
    },
    {
      name: 'Platinum',
      price: 3200000,
      bookingMoney: 800000,
      units: 10,
      sharesText: '10x Units',
      space: '140 sft (Land 40 + Constr. 100)',
      perks: '36 Days Stay · 25% Resort Discount',
    },
  ],
  // Sun Care Hospital & Diagnostic Centre
  SCH: [
    {
      name: 'Bronze',
      price: 350000,
      bookingMoney: 100000,
      units: 1,
      sharesText: '1x Unit',
      space: '2.464 sft',
      perks: 'At-cost medical for 20 nominated persons',
    },
    {
      name: 'Silver',
      price: 1020000,
      bookingMoney: 300000,
      units: 3,
      sharesText: '3x Units',
      space: '7.392 sft',
      perks: 'At-cost medical for 60 nominated persons',
    },
    {
      name: 'Gold',
      price: 1650000,
      bookingMoney: 500000,
      units: 5,
      sharesText: '5x Units',
      space: '12.32 sft',
      perks: 'At-cost medical for 100 nominated persons',
    },
    {
      name: 'Platinum',
      price: 3200000,
      bookingMoney: 800000,
      units: 10,
      sharesText: '10x Units',
      space: '24.64 sft',
      perks: 'At-cost medical for 200 nominated persons',
    },
  ],
  // Super Combo (4-in-1 Investment)
  SPC: [
    {
      name: 'Bronze',
      price: 1240000,
      bookingMoney: 300000,
      units: 1,
      sharesText: '1x Unit',
      space: '44.46 sft',
      perks: '13 Days Stay · ৳5L Life Insurance Cover',
    },
    {
      name: 'Silver',
      price: 3630000,
      bookingMoney: 700000,
      units: 3,
      sharesText: '3x Units',
      space: '133.39 sft',
      perks: '43 Days Stay · ৳15L Life Insurance Cover',
    },
    {
      name: 'Gold',
      price: 5900000,
      bookingMoney: 1000000,
      units: 5,
      sharesText: '5x Units',
      space: '222.32 sft',
      perks: '73 Days Stay · ৳25L Life Insurance Cover',
    },
    {
      name: 'Platinum',
      price: 11500000,
      bookingMoney: 1700000,
      units: 10,
      sharesText: '10x Units',
      space: '444.64 sft',
      perks: '148 Days Stay · ৳50L Life Insurance Cover',
    },
  ],
};

// Fallback if business code not matched
export const DEFAULT_PACKAGES: DivisionPackageSpec[] = [
  { name: 'Bronze', price: 350000, bookingMoney: 100000, units: 1, sharesText: '1x Unit', perks: 'Bronze Ownership' },
  { name: 'Silver', price: 1020000, bookingMoney: 300000, units: 3, sharesText: '3x Units', perks: 'Silver Ownership' },
  { name: 'Gold', price: 1650000, bookingMoney: 500000, units: 5, sharesText: '5x Units', perks: 'Gold Ownership' },
  { name: 'Platinum', price: 3200000, bookingMoney: 800000, units: 10, sharesText: '10x Units', perks: 'Platinum Ownership' },
];

export const getDivisionPackages = (businessCode?: string): DivisionPackageSpec[] => {
  const code = (businessCode || '').toUpperCase().trim();
  return DIVISION_PACKAGES[code] || DEFAULT_PACKAGES;
};
