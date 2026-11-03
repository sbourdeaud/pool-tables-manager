import type { Language } from './i18n'

export interface CurrencyDefinition {
  code: string
  symbol: string
  name: string
  languages: Language[]
}

export interface CurrencyOption {
  value: string
  label: string
  code: string
}

// Currencies used in countries where the app's available languages are spoken.
// Values are display symbols because the app stores and renders the symbol
// directly (e.g. settings.currency is used as the amount prefix).
const CURRENCY_DEFINITIONS: CurrencyDefinition[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar', languages: ['en', 'es', 'pt'] },
  { code: 'EUR', symbol: '€', name: 'Euro', languages: ['en', 'fr', 'de', 'es', 'it', 'nl', 'pt'] },
  { code: 'GBP', symbol: '£', name: 'British Pound', languages: ['en'] },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', languages: ['en'] },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', languages: ['en', 'fr'] },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar', languages: ['en'] },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand', languages: ['en'] },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', languages: ['en'] },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', languages: ['en', 'zh'] },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso', languages: ['en'] },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', languages: ['en'] },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', languages: ['en'] },
  { code: 'GHS', symbol: 'GH₵', name: 'Ghanaian Cedi', languages: ['en'] },
  { code: 'PKR', symbol: 'PKR', name: 'Pakistani Rupee', languages: ['en'] },
  { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka', languages: ['en'] },
  { code: 'LKR', symbol: 'LKR', name: 'Sri Lankan Rupee', languages: ['en'] },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', languages: ['en', 'zh'] },
  { code: 'JMD', symbol: 'J$', name: 'Jamaican Dollar', languages: ['en'] },
  { code: 'TTD', symbol: 'TT$', name: 'Trinidad and Tobago Dollar', languages: ['en'] },
  { code: 'BSD', symbol: 'B$', name: 'Bahamian Dollar', languages: ['en'] },
  { code: 'BBD', symbol: 'Bds$', name: 'Barbadian Dollar', languages: ['en'] },
  { code: 'BZD', symbol: 'BZ$', name: 'Belize Dollar', languages: ['en'] },
  { code: 'GYD', symbol: 'G$', name: 'Guyanese Dollar', languages: ['en'] },
  { code: 'FJD', symbol: 'FJ$', name: 'Fijian Dollar', languages: ['en'] },
  { code: 'PGK', symbol: 'PGK', name: 'Papua New Guinean Kina', languages: ['en'] },
  { code: 'WST', symbol: 'WS$', name: 'Samoan Tala', languages: ['en'] },
  { code: 'TOP', symbol: 'T$', name: 'Tongan Paʻanga', languages: ['en'] },
  { code: 'VUV', symbol: 'VT', name: 'Vanuatu Vatu', languages: ['en', 'fr'] },
  { code: 'SBD', symbol: 'SI$', name: 'Solomon Islands Dollar', languages: ['en'] },
  { code: 'BWP', symbol: 'P', name: 'Botswana Pula', languages: ['en'] },
  { code: 'NAD', symbol: 'N$', name: 'Namibian Dollar', languages: ['en'] },
  { code: 'ZWG', symbol: 'ZiG', name: 'Zimbabwe Gold', languages: ['en'] },
  { code: 'ZMW', symbol: 'ZK', name: 'Zambian Kwacha', languages: ['en'] },
  { code: 'UGX', symbol: 'USh', name: 'Ugandan Shilling', languages: ['en'] },
  { code: 'TZS', symbol: 'TSh', name: 'Tanzanian Shilling', languages: ['en'] },
  { code: 'RWF', symbol: 'FRw', name: 'Rwandan Franc', languages: ['en'] },
  { code: 'SSP', symbol: 'SS£', name: 'South Sudanese Pound', languages: ['en'] },
  { code: 'SDG', symbol: 'SDG', name: 'Sudanese Pound', languages: ['en', 'ar'] },
  { code: 'MWK', symbol: 'MK', name: 'Malawian Kwacha', languages: ['en'] },
  { code: 'LSL', symbol: 'LSL', name: 'Lesotho Loti', languages: ['en'] },
  { code: 'SZL', symbol: 'E', name: 'Swazi Lilangeni', languages: ['en'] },
  { code: 'GMD', symbol: 'D', name: 'Gambian Dalasi', languages: ['en'] },
  { code: 'SLE', symbol: 'Le', name: 'Sierra Leonean Leone', languages: ['en'] },
  { code: 'LRD', symbol: 'L$', name: 'Liberian Dollar', languages: ['en'] },
  { code: 'SCR', symbol: 'SCR', name: 'Seychellois Rupee', languages: ['en', 'fr'] },
  { code: 'MUR', symbol: 'MUR', name: 'Mauritian Rupee', languages: ['en', 'fr'] },
  { code: 'XCD', symbol: 'EC$', name: 'East Caribbean Dollar', languages: ['en'] },
  { code: 'KYD', symbol: 'CI$', name: 'Cayman Islands Dollar', languages: ['en'] },
  { code: 'BMD', symbol: 'BD$', name: 'Bermudian Dollar', languages: ['en'] },
  { code: 'FKP', symbol: 'FK£', name: 'Falkland Islands Pound', languages: ['en'] },
  { code: 'GIP', symbol: 'GI£', name: 'Gibraltar Pound', languages: ['en'] },
  { code: 'SHP', symbol: 'SH£', name: 'Saint Helena Pound', languages: ['en'] },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar', languages: ['en', 'zh'] },
  { code: 'BND', symbol: 'BN$', name: 'Brunei Dollar', languages: ['en'] },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', languages: ['fr', 'de', 'it'] },
  { code: 'XOF', symbol: 'CFA', name: 'West African CFA Franc', languages: ['fr', 'pt'] },
  { code: 'XAF', symbol: 'FCFA', name: 'Central African CFA Franc', languages: ['fr', 'es'] },
  { code: 'HTG', symbol: 'G', name: 'Haitian Gourde', languages: ['fr'] },
  { code: 'MGA', symbol: 'Ar', name: 'Malagasy Ariary', languages: ['fr'] },
  { code: 'CDF', symbol: 'FC', name: 'Congolese Franc', languages: ['fr'] },
  { code: 'DJF', symbol: 'Fdj', name: 'Djiboutian Franc', languages: ['fr', 'ar'] },
  { code: 'KMF', symbol: 'CF', name: 'Comorian Franc', languages: ['fr', 'ar'] },
  { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso', languages: ['es'] },
  { code: 'ARS', symbol: 'AR$', name: 'Argentine Peso', languages: ['es'] },
  { code: 'COP', symbol: 'COL$', name: 'Colombian Peso', languages: ['es'] },
  { code: 'CLP', symbol: 'CLP$', name: 'Chilean Peso', languages: ['es'] },
  { code: 'PEN', symbol: 'S/', name: 'Peruvian Sol', languages: ['es'] },
  { code: 'UYU', symbol: '$U', name: 'Uruguayan Peso', languages: ['es'] },
  { code: 'BOB', symbol: 'Bs', name: 'Bolivian Boliviano', languages: ['es'] },
  { code: 'PYG', symbol: '₲', name: 'Paraguayan Guaraní', languages: ['es'] },
  { code: 'VES', symbol: 'Bs.S', name: 'Venezuelan Bolívar', languages: ['es'] },
  { code: 'GTQ', symbol: 'Q', name: 'Guatemalan Quetzal', languages: ['es'] },
  { code: 'HNL', symbol: 'HNL', name: 'Honduran Lempira', languages: ['es'] },
  { code: 'NIO', symbol: 'C$', name: 'Nicaraguan Córdoba', languages: ['es'] },
  { code: 'CRC', symbol: '₡', name: 'Costa Rican Colón', languages: ['es'] },
  { code: 'DOP', symbol: 'RD$', name: 'Dominican Peso', languages: ['es'] },
  { code: 'CUP', symbol: 'CUP$', name: 'Cuban Peso', languages: ['es'] },
  { code: 'PAB', symbol: 'B/.', name: 'Panamanian Balboa', languages: ['es'] },
  { code: 'SRD', symbol: 'Sr$', name: 'Surinamese Dollar', languages: ['nl'] },
  { code: 'AWG', symbol: 'Afl.', name: 'Aruban Florin', languages: ['nl'] },
  { code: 'ANG', symbol: 'ƒ', name: 'Netherlands Antillean Guilder', languages: ['nl'] },
  { code: 'SAR', symbol: 'SAR', name: 'Saudi Riyal', languages: ['ar'] },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham', languages: ['ar'] },
  { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound', languages: ['ar'] },
  { code: 'DZD', symbol: 'DA', name: 'Algerian Dinar', languages: ['ar'] },
  { code: 'MAD', symbol: 'DH', name: 'Moroccan Dirham', languages: ['ar'] },
  { code: 'TND', symbol: 'DT', name: 'Tunisian Dinar', languages: ['ar'] },
  { code: 'LYD', symbol: 'LD', name: 'Libyan Dinar', languages: ['ar'] },
  { code: 'IQD', symbol: 'IQD', name: 'Iraqi Dinar', languages: ['ar'] },
  { code: 'JOD', symbol: 'JD', name: 'Jordanian Dinar', languages: ['ar'] },
  { code: 'KWD', symbol: 'KD', name: 'Kuwaiti Dinar', languages: ['ar'] },
  { code: 'QAR', symbol: 'QR', name: 'Qatari Riyal', languages: ['ar'] },
  { code: 'BHD', symbol: 'BD', name: 'Bahraini Dinar', languages: ['ar'] },
  { code: 'OMR', symbol: 'OMR', name: 'Omani Rial', languages: ['ar'] },
  { code: 'YER', symbol: 'YER', name: 'Yemeni Rial', languages: ['ar'] },
  { code: 'LBP', symbol: 'L£', name: 'Lebanese Pound', languages: ['ar'] },
  { code: 'SYP', symbol: 'S£', name: 'Syrian Pound', languages: ['ar'] },
  { code: 'ILS', symbol: '₪', name: 'Israeli New Shekel', languages: ['ar'] },
  { code: 'MRU', symbol: 'UM', name: 'Mauritanian Ouguiya', languages: ['ar'] },
  { code: 'SOS', symbol: 'SOS', name: 'Somali Shilling', languages: ['ar'] },
  { code: 'ERN', symbol: 'ERN', name: 'Eritrean Nakfa', languages: ['ar', 'en'] },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', languages: ['pt'] },
  { code: 'AOA', symbol: 'Kz', name: 'Angolan Kwanza', languages: ['pt'] },
  { code: 'MZN', symbol: 'MT', name: 'Mozambican Metical', languages: ['pt'] },
  { code: 'CVE', symbol: 'Esc', name: 'Cape Verdean Escudo', languages: ['pt'] },
  { code: 'STN', symbol: 'Db', name: 'São Tomé and Príncipe Dobra', languages: ['pt'] },
  { code: 'CNY', symbol: 'CN¥', name: 'Chinese Yuan', languages: ['zh'] },
  { code: 'TWD', symbol: 'NT$', name: 'New Taiwan Dollar', languages: ['zh'] },
  { code: 'MOP', symbol: 'MOP$', name: 'Macanese Pataca', languages: ['zh'] },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', languages: ['ja'] },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won', languages: ['ko'] },
  { code: 'KPW', symbol: 'KP₩', name: 'North Korean Won', languages: ['ko'] },
]

export function currencyOptionsForLanguages(languages: Language[]): CurrencyOption[] {
  const wanted = new Set(languages)
  const seen = new Set<string>()
  return CURRENCY_DEFINITIONS
    .filter((currency) => currency.languages.some((language) => wanted.has(language)))
    .filter((currency) => {
      if (seen.has(currency.symbol)) return false
      seen.add(currency.symbol)
      return true
    })
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((currency) => ({
      value: currency.symbol,
      label: currency.symbol === currency.code
        ? `${currency.code} (${currency.name})`
        : `${currency.symbol} (${currency.code})`,
      code: currency.code,
    }))
}
