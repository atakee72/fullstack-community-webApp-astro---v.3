/** MongoDB document for AfS demographics (per PLR, per period) */
export interface KiezDemographicsDoc {
  plr_code: string;
  plr_name: string;
  period: string; // e.g. "2025h2"
  date: string; // e.g. "2025-12-31"
  population: {
    total: number;
    male: number;
    female: number;
  };
  age_groups: {
    u6: number;   // 0–5
    u18: number;  // 6–17
    u27: number;  // 18–26
    u45: number;  // 27–44
    u55: number;  // 45–54
    u65: number;  // 55–64
    a65: number;  // 65+
  };
  migration: {
    foreign_nationals: number; // AUSL
    migration_background: number; // MH (includes AUSL)
  };
  households: {
    single_person: number; // E_E
  };
}

/** MongoDB document for MSS social index (per PLR, per report period) */
export interface KiezSocialDoc {
  plr_code: string;
  plr_name: string;
  period: string; // e.g. "2023"
  unemployment_rate: number;
  child_poverty_rate: number;
  youth_unemployment_rate: number;
  transfer_benefit_rate: number;
  status_index: number;
  dynamik_index: number;
}

/** Age distribution entry in API response */
export interface AgeDistributionEntry {
  group: string;
  key: string;
  count: number;
  percentage: number;
}

/** Per-PLR area detail (demographics + social) */
export interface PlrAreaDetail {
  code: string;
  name: string;
  population: { total: number; male: number; female: number };
  ageDistribution: AgeDistributionEntry[];
  migration: {
    foreignNationals: number;
    germanWithMigBg: number;
    withoutMigBg: number;
    totalPopulation: number;
  };
  social: {
    unemploymentRate: number;
    childPovertyRate: number;
    transferBenefitRate: number;
    statusIndex: number;
    dynamikIndex: number;
  } | null;
}

/** Aggregated API response */
export interface KiezStatsResponse {
  lastUpdated: string;
  source: string;
  demographics: {
    population: { total: number; male: number; female: number };
    ageDistribution: AgeDistributionEntry[];
    migration: {
      foreignNationals: number;
      germanWithMigBg: number;
      withoutMigBg: number;
      totalPopulation: number;
    };
    households: { singlePerson: number };
  } | null;
  social: {
    unemploymentRate: number;
    childPovertyRate: number;
    transferBenefitRate: number;
    statusIndex: number;
    dynamikIndex: number;
  } | null;
  plrAreas: PlrAreaDetail[];
  trend: Array<{
    period: string;
    date: string;
    population: number;
  }>;
}

/** BLUME air quality — single pollutant grade */
export interface AirQualityPollutant {
  name: string;         // "PM10", "NO₂", "O₃", "CO"
  component: string;    // "pm10", "no2", "o3", "co"
  grade: number;        // 1–5
  gradeLabel: string;   // "sehr gut" | "gut" | "mäßig" | "schlecht" | "sehr schlecht"
}

/** BLUME air quality — full response from /api/kiez-air */
export interface AirQualityResponse {
  station: string;      // "mc042"
  stationName: string;  // "Nansenstraße"
  datetime: string;     // ISO timestamp of measurement
  overallGrade: number; // 1–5 (from "lqi" component)
  overallLabel: string; // German label
  pollutants: AirQualityPollutant[];
}
