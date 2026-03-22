import type { APIRoute } from 'astro';
import { connectDB } from '../../lib/mongodb';
import type { KiezStatsResponse, AgeDistributionEntry, PlrAreaDetail } from '../../types/kiezStats';

const AGE_LABELS: Array<{ key: string; group: string }> = [
  { key: 'u6', group: '0–5' },
  { key: 'u18', group: '6–17' },
  { key: 'u27', group: '18–26' },
  { key: 'u45', group: '27–44' },
  { key: 'u55', group: '45–54' },
  { key: 'u65', group: '55–64' },
  { key: 'a65', group: '65+' },
];

export const GET: APIRoute = async () => {
  try {
    const db = await connectDB();

    // Get latest demographics period
    const latestDemo = await db
      .collection('schillerkiez_demographics')
      .findOne({}, { sort: { period: -1 }, projection: { period: 1, date: 1 } });

    let demographics: KiezStatsResponse['demographics'] = null;
    let plrAreas: PlrAreaDetail[] = [];
    let lastUpdated = '';

    if (latestDemo) {
      const demoDocs = await db
        .collection('schillerkiez_demographics')
        .find({ period: latestDemo.period })
        .toArray();

      // Aggregate across all PLR areas
      let total = 0, male = 0, female = 0;
      const ageGroups: Record<string, number> = { u6: 0, u18: 0, u27: 0, u45: 0, u55: 0, u65: 0, a65: 0 };
      let foreignNationals = 0, migrationBg = 0, singlePerson = 0;

      for (const doc of demoDocs) {
        total += doc.population.total;
        male += doc.population.male;
        female += doc.population.female;
        for (const key of Object.keys(ageGroups)) {
          ageGroups[key] += doc.age_groups[key] ?? 0;
        }
        foreignNationals += doc.migration.foreign_nationals;
        migrationBg += doc.migration.migration_background;
        singlePerson += doc.households.single_person;

        // Per-PLR age distribution
        const plrTotal = doc.population.total;
        const plrAgeDist: AgeDistributionEntry[] = AGE_LABELS.map(({ key, group }) => ({
          group,
          key,
          count: doc.age_groups[key] ?? 0,
          percentage: plrTotal > 0 ? Math.round(((doc.age_groups[key] ?? 0) / plrTotal) * 1000) / 10 : 0,
        }));

        // Per-PLR non-overlapping migration segments
        const plrForeign = doc.migration.foreign_nationals;
        const plrMigBg = doc.migration.migration_background;
        const plrGermanWithMigBg = plrMigBg - plrForeign;
        const plrWithoutMigBg = plrTotal - plrMigBg;

        plrAreas.push({
          code: doc.plr_code,
          name: doc.plr_name,
          population: doc.population,
          ageDistribution: plrAgeDist,
          migration: {
            foreignNationals: plrForeign,
            germanWithMigBg: plrGermanWithMigBg,
            withoutMigBg: plrWithoutMigBg,
            totalPopulation: plrTotal,
          },
          social: null,
        });
      }

      const ageDistribution: AgeDistributionEntry[] = AGE_LABELS.map(({ key, group }) => ({
        group,
        key,
        count: ageGroups[key],
        percentage: total > 0 ? Math.round((ageGroups[key] / total) * 1000) / 10 : 0,
      }));

      // Non-overlapping migration segments: MH includes AUSL
      const germanWithMigBg = migrationBg - foreignNationals;
      const withoutMigBg = total - migrationBg;

      demographics = {
        population: { total, male, female },
        ageDistribution,
        migration: {
          foreignNationals,
          germanWithMigBg,
          withoutMigBg,
          totalPopulation: total,
        },
        households: { singlePerson },
      };

      lastUpdated = latestDemo.date ?? '';
    }

    // Get latest social data
    let social: KiezStatsResponse['social'] = null;

    const latestSocial = await db
      .collection('schillerkiez_social')
      .findOne({}, { sort: { period: -1 }, projection: { period: 1 } });

    if (latestSocial) {
      const socialDocs = await db
        .collection('schillerkiez_social')
        .find({ period: latestSocial.period })
        .toArray();

      if (socialDocs.length > 0) {
        const n = socialDocs.length;
        const avg = (field: string) =>
          Math.round((socialDocs.reduce((sum, d) => sum + (d[field] ?? 0), 0) / n) * 10) / 10;

        social = {
          unemploymentRate: avg('unemployment_rate'),
          childPovertyRate: avg('child_poverty_rate'),
          transferBenefitRate: avg('transfer_benefit_rate'),
          statusIndex: avg('status_index'),
          dynamikIndex: avg('dynamik_index'),
        };

        // Attach per-PLR social data
        const socialByPlr = new Map(socialDocs.map(d => [d.plr_code, d]));
        for (const area of plrAreas) {
          const s = socialByPlr.get(area.code);
          if (s) {
            area.social = {
              unemploymentRate: s.unemployment_rate,
              childPovertyRate: s.child_poverty_rate,
              transferBenefitRate: s.transfer_benefit_rate,
              statusIndex: s.status_index,
              dynamikIndex: s.dynamik_index,
            };
          }
        }
      }
    }

    // Trend data — all periods aggregated
    const trendPipeline = [
      { $group: {
        _id: { period: '$period', date: '$date' },
        population: { $sum: '$population.total' },
      }},
      { $sort: { '_id.period': 1 as const } },
      { $project: {
        _id: 0,
        period: '$_id.period',
        date: '$_id.date',
        population: 1,
      }},
    ];
    const trend = await db
      .collection('schillerkiez_demographics')
      .aggregate(trendPipeline)
      .toArray();

    const response: KiezStatsResponse = {
      lastUpdated,
      source: 'Amt für Statistik Berlin-Brandenburg / Monitoring Soziale Stadtentwicklung',
      demographics,
      social,
      plrAreas,
      trend: trend.map(t => ({ period: t.period, date: t.date, population: t.population })),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('kiez-stats API error:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch stats' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
