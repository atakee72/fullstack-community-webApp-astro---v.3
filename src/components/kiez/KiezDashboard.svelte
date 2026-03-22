<script>
  import { onMount } from 'svelte';

  /** @type {import('../../types/kiezStats').KiezStatsResponse | null} */
  let data = $state(null);
  /** @type {import('../../types/kiezStats').AirQualityResponse | null} */
  let airData = $state(null);
  let loading = $state(true);
  let error = $state('');

  const COLORS = {
    teal: '#4b9aaa',
    wine: '#814256',
    yellow: '#eccc6e',
    gray: '#aca89f',
    tealLight: '#7bbdca',
    wineLight: '#a86b7e',
  };

  // Chart colors for age distribution bars
  const AGE_COLORS = [
    COLORS.teal, COLORS.wine, COLORS.yellow, '#6aab8e',
    COLORS.tealLight, COLORS.wineLight, COLORS.gray,
  ];

  // Migration donut colors
  const MIGRATION_COLORS = [COLORS.teal, COLORS.wine, COLORS.yellow];

  const reducedMotion = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : true;

  async function fetchData() {
    loading = true;
    error = '';
    try {
      const res = await fetch('/api/kiez-stats');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      data = await res.json();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Unbekannter Fehler';
    } finally {
      loading = false;
    }
  }

  async function fetchAirData() {
    try {
      const res = await fetch('/api/kiez-air');
      if (!res.ok) return;
      airData = await res.json();
    } catch {
      // Silently ignore — air quality is supplementary
    }
  }

  onMount(() => {
    fetchData();
    fetchAirData();
  });

  // Format numbers with German locale
  function fmt(n) {
    return n?.toLocaleString('de-DE') ?? '–';
  }

  function pct(n) {
    return n != null ? `${n.toFixed(1)}%` : '–';
  }

  // Human-readable German descriptions for pollutant abbreviations
  const POLLUTANT_DESCRIPTIONS = {
    pm10: 'Feinstaub',
    no2: 'Stickstoffdioxid',
    o3: 'Ozon',
    co: 'Kohlenmonoxid',
  };

  // Air quality grade → project palette color
  function gradeColor(grade) {
    if (grade <= 2) return '#4b9aaa'; // teal — gut/sehr gut
    if (grade === 3) return '#eccc6e'; // yellow — mäßig
    if (grade === 4) return '#814256'; // wine — schlecht
    return '#c0392b';                  // red — sehr schlecht
  }

  // Donut chart math
  function donutSegments(values, total) {
    const segments = [];
    let offset = 0;
    const circumference = 2 * Math.PI * 40; // radius = 40
    for (let i = 0; i < values.length; i++) {
      const ratio = total > 0 ? values[i].value / total : 0;
      const dashLength = ratio * circumference;
      segments.push({
        ...values[i],
        offset,
        dashArray: `${dashLength} ${circumference - dashLength}`,
        ratio,
        percentage: Math.round(ratio * 1000) / 10,
      });
      offset += dashLength;
    }
    return segments;
  }
</script>

<div class="space-y-8">
  <!-- Header -->
  <div class="text-center">
    <h1 class="text-3xl md:text-4xl font-bold text-gray-800">Schillerkiez in Zahlen</h1>
    <p class="mt-2 text-gray-600 text-lg">Demografische und soziale Daten aus dem Herzen Neuköllns</p>
    {#if data?.lastUpdated}
      <p class="mt-1 text-sm text-gray-400">Stand: {data.lastUpdated}</p>
    {/if}
  </div>

  {#if loading}
    <!-- Loading skeleton -->
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {#each Array(6) as _}
        <div class="bg-white rounded-xl p-5 shadow-sm animate-pulse">
          <div class="h-4 bg-gray-200 rounded w-2/3 mb-3"></div>
          <div class="h-8 bg-gray-200 rounded w-1/2"></div>
        </div>
      {/each}
    </div>
  {:else if error}
    <!-- Error state -->
    <div class="text-center py-16">
      <p class="text-gray-600 mb-4">Daten konnten nicht geladen werden: {error}</p>
      <button
        onclick={fetchData}
        class="px-6 py-2 bg-[#4b9aaa] text-white rounded-lg hover:bg-[#3a7a8a] transition-colors"
      >
        Erneut versuchen
      </button>
    </div>
  {:else if !data?.demographics && !data?.social}
    <!-- Empty state -->
    <div class="text-center py-16">
      <p class="text-gray-500 text-lg">Noch keine Daten verfügbar</p>
    </div>
  {:else}
    <!-- Stat Cards -->
    {#if data.demographics}
      {@const d = data.demographics}
      {@const migPct = d.migration.totalPopulation > 0
        ? Math.round((d.migration.foreignNationals + d.migration.germanWithMigBg) / d.migration.totalPopulation * 1000) / 10
        : 0}
      {@const auslPct = d.migration.totalPopulation > 0
        ? Math.round(d.migration.foreignNationals / d.migration.totalPopulation * 1000) / 10
        : 0}

      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <div class="bg-white rounded-xl p-5 shadow-sm border-l-4 border-[#4b9aaa]">
          <p class="text-sm text-gray-500 font-medium">Bevölkerung</p>
          <p class="text-2xl md:text-3xl font-bold text-gray-800 mt-1">{fmt(d.population.total)}</p>
        </div>
        <div class="bg-white rounded-xl p-5 shadow-sm border-l-4 border-[#814256]">
          <p class="text-sm text-gray-500 font-medium">Ausländeranteil</p>
          <p class="text-2xl md:text-3xl font-bold text-gray-800 mt-1">{pct(auslPct)}</p>
        </div>
        <div class="bg-white rounded-xl p-5 shadow-sm border-l-4 border-[#eccc6e]">
          <p class="text-sm text-gray-500 font-medium">Migrationshintergrund</p>
          <p class="text-2xl md:text-3xl font-bold text-gray-800 mt-1">{pct(migPct)}</p>
        </div>
        {#if data.social}
          <div class="bg-white rounded-xl p-5 shadow-sm border-l-4 border-[#aca89f]">
            <p class="text-sm text-gray-500 font-medium">Arbeitslosenquote</p>
            <p class="text-2xl md:text-3xl font-bold text-gray-800 mt-1">{pct(data.social.unemploymentRate)}</p>
          </div>
          <div class="bg-white rounded-xl p-5 shadow-sm border-l-4 border-[#814256]">
            <p class="text-sm text-gray-500 font-medium">Kinderarmut</p>
            <p class="text-2xl md:text-3xl font-bold text-gray-800 mt-1">{pct(data.social.childPovertyRate)}</p>
          </div>
        {/if}
        <div class="bg-white rounded-xl p-5 shadow-sm border-l-4 border-[#4b9aaa]">
          <p class="text-sm text-gray-500 font-medium">Planungsräume</p>
          <p class="text-2xl md:text-3xl font-bold text-gray-800 mt-1">{data.plrAreas.length}</p>
        </div>
      </div>
    {/if}

    <!-- Air Quality (live BLUME data) -->
    {#if airData}
      <div class="bg-white rounded-xl p-6 shadow-sm">
        <div class="flex items-center gap-2 mb-4">
          <h2 class="text-lg font-bold text-gray-800">Luftqualität</h2>
          <span class="inline-flex items-center gap-1 text-xs text-gray-400">
            <span class="w-2 h-2 rounded-full bg-green-500 motion-safe:animate-pulse"></span>
            Live · Nansenstraße
          </span>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <!-- Overall LQI -->
          <div class="col-span-2 sm:col-span-1 rounded-lg p-4 text-center"
               style="background: {gradeColor(airData.overallGrade)}15; border: 2px solid {gradeColor(airData.overallGrade)}">
            <p class="text-xs text-gray-500 font-medium">Gesamt</p>
            <p class="text-3xl font-bold" style="color: {gradeColor(airData.overallGrade)}">
              {airData.overallGrade}
            </p>
            <p class="text-sm font-medium" style="color: {gradeColor(airData.overallGrade)}">
              {airData.overallLabel}
            </p>
          </div>

          <!-- Per-pollutant cards -->
          {#each airData.pollutants as pol}
            <div class="rounded-lg p-3 bg-gray-50 text-center">
              <p class="text-xs text-gray-400 font-medium">{POLLUTANT_DESCRIPTIONS[pol.component] ?? pol.name}</p>
              <p class="text-xl font-bold" style="color: {gradeColor(pol.grade)}">{pol.grade}</p>
              <p class="text-xs" style="color: {gradeColor(pol.grade)}">{pol.gradeLabel}</p>
              <p class="text-[10px] text-gray-300 mt-0.5">{pol.name}</p>
            </div>
          {/each}
        </div>

        <!-- Grade scale legend -->
        <div class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-400">
          <span class="font-medium text-gray-500">Skala:</span>
          {#each [{ g: 1, l: 'sehr gut' }, { g: 2, l: 'gut' }, { g: 3, l: 'mäßig' }, { g: 4, l: 'schlecht' }, { g: 5, l: 'sehr schlecht' }] as item}
            <span class="inline-flex items-center gap-1">
              <span class="w-2.5 h-2.5 rounded-sm" style="background: {gradeColor(item.g)}"></span>
              {item.g} = {item.l}
            </span>
          {/each}
        </div>

        <p class="mt-2 text-xs text-gray-400">
          Messung: {new Date(airData.datetime).toLocaleString('de-DE')}
          · <a href="https://luftdaten.berlin.de/station/mc042" target="_blank" rel="noopener"
               class="text-[#4b9aaa] hover:underline">Quelle: BLUME-Messnetz</a>
        </p>
      </div>
    {/if}

    <!-- Charts Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

      <!-- Age Distribution - Horizontal Bar Chart -->
      {#if data.demographics}
        {@const maxCount = Math.max(...data.demographics.ageDistribution.map(a => a.count))}
        <div class="bg-white rounded-xl p-6 shadow-sm">
          <h2 class="text-lg font-bold text-gray-800 mb-4">Altersverteilung</h2>
          <svg viewBox="0 0 400 240" class="w-full" role="img" aria-label="Altersverteilung im Schillerkiez">
            {#each data.demographics.ageDistribution as age, i}
              {@const barWidth = maxCount > 0 ? (age.count / maxCount) * 260 : 0}
              {@const y = i * 32 + 10}
              <!-- Label -->
              <text x="55" y={y + 16} text-anchor="end" fill="#4a5568" font-size="12" font-weight="500">{age.group}</text>
              <!-- Bar -->
              <rect
                x="65"
                y={y + 2}
                width={barWidth}
                height="20"
                rx="4"
                fill={AGE_COLORS[i]}
                opacity="0.85"
              />
              <!-- Value -->
              <text x={65 + barWidth + 6} y={y + 16} fill="#4a5568" font-size="11">
                {fmt(age.count)} ({age.percentage}%)
              </text>
            {/each}
          </svg>
        </div>
      {/if}

      <!-- Migration Donut Chart -->
      {#if data.demographics}
        {@const mig = data.demographics.migration}
        {@const segments = donutSegments([
          { label: 'Ausländer', value: mig.foreignNationals, color: MIGRATION_COLORS[0] },
          { label: 'Deutsche mit MH', value: mig.germanWithMigBg, color: MIGRATION_COLORS[1] },
          { label: 'Ohne MH', value: mig.withoutMigBg, color: MIGRATION_COLORS[2] },
        ], mig.totalPopulation)}
        <div class="bg-white rounded-xl p-6 shadow-sm">
          <h2 class="text-lg font-bold text-gray-800 mb-4">Vielfalt</h2>
          <div class="flex flex-col sm:flex-row items-center gap-4">
            <svg viewBox="0 0 120 120" class="w-40 h-40 shrink-0" role="img" aria-label="Vielfalt im Schillerkiez">
              {#each segments as seg}
                <circle
                  cx="60" cy="60" r="40"
                  fill="none"
                  stroke={seg.color}
                  stroke-width="18"
                  stroke-dasharray={seg.dashArray}
                  stroke-dashoffset={-seg.offset}
                  transform="rotate(-90 60 60)"
                />
              {/each}
              <text x="60" y="58" text-anchor="middle" fill="#4a5568" font-size="10" font-weight="600">{fmt(mig.totalPopulation)}</text>
              <text x="60" y="70" text-anchor="middle" fill="#9ca3af" font-size="7">Gesamt</text>
            </svg>
            <!-- Legend -->
            <div class="space-y-2 text-sm">
              {#each segments as seg}
                <div class="flex items-center gap-2">
                  <span class="w-3 h-3 rounded-full shrink-0" style="background: {seg.color}"></span>
                  <span class="text-gray-700">{seg.label}: <strong>{fmt(seg.value)}</strong> ({seg.percentage}%)</span>
                </div>
              {/each}
            </div>
          </div>
        </div>
      {/if}

      <!-- Gender - Stat Cards -->
      {#if data.demographics}
        {@const pop = data.demographics.population}
        {@const malePct = pop.total > 0 ? Math.round(pop.male / pop.total * 1000) / 10 : 0}
        {@const femalePct = pop.total > 0 ? Math.round(pop.female / pop.total * 1000) / 10 : 0}
        {@const genderSegs = donutSegments([
          { label: 'Männlich', value: pop.male, color: COLORS.teal },
          { label: 'Weiblich', value: pop.female, color: COLORS.wine },
        ], pop.total)}
        <div class="bg-white rounded-xl p-6 shadow-sm">
          <h2 class="text-lg font-bold text-gray-800 mb-4">Geschlecht</h2>
          <div class="flex flex-col sm:flex-row items-center gap-4">
            <svg viewBox="0 0 120 120" class="w-40 h-40 shrink-0" role="img" aria-label="Geschlechterverteilung">
              {#each genderSegs as seg}
                <circle
                  cx="60" cy="60" r="40"
                  fill="none"
                  stroke={seg.color}
                  stroke-width="18"
                  stroke-dasharray={seg.dashArray}
                  stroke-dashoffset={-seg.offset}
                  transform="rotate(-90 60 60)"
                />
              {/each}
            </svg>
            <div class="space-y-3">
              <div class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-full shrink-0" style="background: {COLORS.teal}"></span>
                <span class="text-gray-700">Männlich: <strong>{fmt(pop.male)}</strong> ({malePct}%)</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-full shrink-0" style="background: {COLORS.wine}"></span>
                <span class="text-gray-700">Weiblich: <strong>{fmt(pop.female)}</strong> ({femalePct}%)</span>
              </div>
            </div>
          </div>
        </div>
      {/if}

      <!-- PLR Area Vertical Bar Chart -->
      {#if data.plrAreas.length > 0}
        {@const maxPop = Math.max(...data.plrAreas.map(a => a.population))}
        <div class="bg-white rounded-xl p-6 shadow-sm">
          <h2 class="text-lg font-bold text-gray-800 mb-4">Bevölkerung nach Planungsraum</h2>
          <svg viewBox="0 0 400 220" class="w-full" role="img" aria-label="Bevölkerung nach Planungsraum">
            {#each data.plrAreas as area, i}
              {@const barHeight = maxPop > 0 ? (area.population / maxPop) * 140 : 0}
              {@const x = i * 95 + 30}
              <!-- Bar -->
              <rect
                x={x}
                y={180 - barHeight}
                width="60"
                height={barHeight}
                rx="4"
                fill={AGE_COLORS[i % AGE_COLORS.length]}
                opacity="0.85"
              />
              <!-- Count -->
              <text x={x + 30} y={175 - barHeight} text-anchor="middle" fill="#4a5568" font-size="11" font-weight="600">
                {fmt(area.population)}
              </text>
              <!-- Name (shortened) -->
              <text x={x + 30} y="198" text-anchor="middle" fill="#6b7280" font-size="9">
                {area.name.replace('Schillerpromenade', 'Schiller.').replace('straße', 'str.')}
              </text>
            {/each}
          </svg>
        </div>
      {/if}

      <!-- Social Indicators -->
      {#if data.social}
        {@const social = data.social}
        {@const indicators = [
          { label: 'Arbeitslosenquote', value: social.unemploymentRate, color: COLORS.teal },
          { label: 'Kinderarmut (U15)', value: social.childPovertyRate, color: COLORS.wine },
          { label: 'Transferleistungen', value: social.transferBenefitRate, color: COLORS.yellow },
        ]}
        <div class="bg-white rounded-xl p-6 shadow-sm lg:col-span-2">
          <h2 class="text-lg font-bold text-gray-800 mb-4">Soziale Lage</h2>
          <svg viewBox="0 0 500 130" class="w-full" role="img" aria-label="Soziale Indikatoren im Schillerkiez">
            {#each indicators as ind, i}
              {@const barWidth = Math.min(ind.value, 100) / 100 * 320}
              {@const y = i * 38 + 10}
              <text x="130" y={y + 16} text-anchor="end" fill="#4a5568" font-size="12" font-weight="500">{ind.label}</text>
              <!-- Background track -->
              <rect x="140" y={y + 2} width="320" height="20" rx="4" fill="#f3f4f6" />
              <!-- Value bar -->
              <rect x="140" y={y + 2} width={barWidth} height="20" rx="4" fill={ind.color} opacity="0.8" />
              <text x={140 + barWidth + 6} y={y + 16} fill="#4a5568" font-size="11" font-weight="600">{ind.value}%</text>
            {/each}
          </svg>
          {#if social.statusIndex || social.dynamikIndex}
            <div class="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
              <span>Status-Index: <strong>{social.statusIndex}</strong></span>
              <span>Dynamik-Index: <strong>{social.dynamikIndex}</strong></span>
            </div>
          {/if}
        </div>
      {/if}
    </div>

    <!-- Footer / Sources -->
    <div class="bg-white/60 rounded-xl p-6 text-sm text-gray-500 space-y-2">
      <p>
        <strong>Quelle:</strong> Amt für Statistik Berlin-Brandenburg, Monitoring Soziale Stadtentwicklung Berlin
      </p>
      <p>
        <strong>Lizenz:</strong>
        <a href="https://creativecommons.org/licenses/by/3.0/de/" target="_blank" rel="noopener" class="text-[#4b9aaa] hover:underline">
          CC BY 3.0 DE
        </a>
      </p>
      {#if airData}
        <p>
          <strong>Luftdaten:</strong>
          <a href="https://luftdaten.berlin.de/station/mc042" target="_blank" rel="noopener"
             class="text-[#4b9aaa] hover:underline">Berliner Luftgüte-Messnetz (BLUME)</a>, Station MC042 Nansenstraße
        </p>
      {/if}
      <p class="text-xs text-gray-400">
        Die Daten beziehen sich auf den Schillerkiez (4 Planungsräume im LOR-System 2021):
        Schillerpromenade Nord, Schillerpromenade Süd, Wartheplatz und Silbersteinstraße.
      </p>
    </div>
  {/if}
</div>
