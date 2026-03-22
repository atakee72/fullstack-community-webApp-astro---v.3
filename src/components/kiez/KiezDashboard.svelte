<script>
  import { onMount } from 'svelte';
  import { PLR_PATHS, PLR_CODES, PLR_VIEWBOX } from './plrPaths';

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

  // Carousel CSS — chart cards (scrollable, tighter padding for more chart space)
  const chartScrollCls = 'flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2 -mx-4 px-4 md:-mx-8 md:px-8 lg:-mx-12 lg:px-12 scroll-pl-4 md:scroll-pl-8 lg:scroll-pl-12';
  const chartCardCls = 'snap-start shrink-0 w-[85vw] sm:w-[55%] lg:w-[calc(33.333%-1rem)] min-h-[22rem] bg-white rounded-xl p-4 sm:p-5 shadow-sm';

  // Arrow button classes (all screens, scaled)
  const arrowCls = 'flex absolute top-1/2 -translate-y-1/2 z-10 w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 items-center justify-center rounded-full bg-white/90 shadow-md hover:bg-white hover:shadow-lg active:scale-95 transition-all text-gray-500 hover:text-gray-800 cursor-pointer';

  /** Shorten PLR names for compact display */
  function shortName(name) {
    return name.replace('Schillerpromenade', 'Schiller.').replace('straße', 'str.');
  }

  /** Scroll a carousel by one card width */
  function scrollCarousel(container, direction) {
    const card = container.querySelector('[data-card]');
    if (!card) return;
    const scrollAmount = card.offsetWidth + 16; // card width + gap
    container.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' });
  }

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
      if (!error) staggerReveal();
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

  // Staggered entrance animation
  let revealedCount = $state(0);
  const STAGGER_DELAY = 120; // ms between each section
  const TOTAL_SECTIONS = 6; // air, age, migration, gender, social, sources

  function staggerReveal() {
    if (reducedMotion) {
      revealedCount = TOTAL_SECTIONS;
      return;
    }
    revealedCount = 0;
    for (let i = 1; i <= TOTAL_SECTIONS; i++) {
      setTimeout(() => { revealedCount = i; }, i * STAGGER_DELAY);
    }
  }

  // Carousel container refs (used by scrollCarousel)
  let ageScroll = $state(null);
  let migScroll = $state(null);
  let genderScroll = $state(null);
  let socialScroll = $state(null);

  /** @type {Record<string, { left: boolean, right: boolean }>} */
  let canScroll = $state({
    age:    { left: false, right: true },
    mig:    { left: false, right: true },
    gender: { left: false, right: true },
    social: { left: false, right: true },
  });

  /** Per-carousel debounce timers to catch scroll-snap settle */
  const scrollTimers = { age: 0, mig: 0, gender: 0, social: 0 };

  function handleScroll(key) {
    return function (/** @type {Event} */ e) {
      const el = /** @type {HTMLElement} */ (e.currentTarget);
      const update = () => {
        const pad = parseFloat(getComputedStyle(el).paddingLeft) || 0;
        canScroll[key] = {
          left: el.scrollLeft > pad + 2,
          right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
        };
      };
      update();                              // immediate — responsive during active scroll
      clearTimeout(scrollTimers[key]);
      scrollTimers[key] = setTimeout(update, 200); // debounced — catches snap settle
    };
  }

  // After stagger reveal completes, measure initial overflow state
  $effect(() => {
    if (revealedCount < TOTAL_SECTIONS) return;
    const refs = { age: ageScroll, mig: migScroll, gender: genderScroll, social: socialScroll };
    setTimeout(() => {
      for (const [key, el] of Object.entries(refs)) {
        if (!el) continue;
        const pad = parseFloat(getComputedStyle(el).paddingLeft) || 0;
        canScroll[key] = {
          left: el.scrollLeft > pad + 2,
          right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
        };
      }
    }, 100);
  });
</script>

<div class="space-y-8">
  {#snippet plrMiniMap(highlightCode)}
    <svg viewBox={PLR_VIEWBOX} class="w-10 h-10 sm:w-12 sm:h-12 shrink-0" aria-hidden="true">
      {#each PLR_CODES as code}
        <path
          d={PLR_PATHS[code]}
          fill={highlightCode === 'all' || highlightCode === code ? COLORS.teal : '#e5e7eb'}
          stroke="white"
          stroke-width="1.5"
          opacity={highlightCode === 'all' || highlightCode === code ? 0.85 : 1}
        />
      {/each}
    </svg>
  {/snippet}

  {#if data?.lastUpdated}
    <p class="text-sm text-gray-400 -mt-4 mb-4 transition-all duration-500 {revealedCount >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}">Stand: {data.lastUpdated}</p>
  {/if}

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
    <!-- Air Quality (live BLUME data) -->
    {#if airData}
      <div class="bg-white rounded-xl p-6 shadow-sm transition-all duration-500 {revealedCount >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}">
        <div class="flex items-center gap-2 mb-4">
          <h2 class="text-lg font-bold text-gray-800">Luftqualität</h2>
          <span class="inline-flex items-center gap-1 text-xs text-gray-400">
            <span class="w-2 h-2 rounded-full bg-green-500 motion-safe:animate-pulse"></span>
            Live · Nansenstraße
          </span>
        </div>

        <div class="flex flex-wrap justify-center gap-3">
          <!-- Overall LQI -->
          <div class="w-[calc(50%-6px)] sm:w-[calc(33.333%-8px)] lg:w-[calc(20%-10px)] rounded-lg p-4 text-center"
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
            <div class="w-[calc(50%-6px)] sm:w-[calc(33.333%-8px)] lg:w-[calc(20%-10px)] rounded-lg p-3 bg-gray-50 text-center">
              <p class="text-xs text-gray-400 font-medium">{POLLUTANT_DESCRIPTIONS[pol.component] ?? pol.name}</p>
              <p class="text-xl font-bold" style="color: {pol.grade != null ? gradeColor(pol.grade) : '#d1d5db'}">{pol.grade ?? '–'}</p>
              <p class="text-xs" style="color: {pol.grade != null ? gradeColor(pol.grade) : '#9ca3af'}">{pol.gradeLabel}</p>
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

    <!-- Chart Carousels -->
    <div class="space-y-6">

      <!-- Age Distribution Carousel -->
      {#if data.demographics}
        {@const maxCount = Math.max(...data.demographics.ageDistribution.map(a => a.count))}
        <div class="transition-all duration-500 {revealedCount >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}">
          <h2 class="text-lg font-bold text-gray-800 mb-3">Altersverteilung</h2>
          <div class="relative">
            {#if canScroll.age.left}
              <button class="{arrowCls} -left-1 lg:-left-5" onclick={() => scrollCarousel(ageScroll, -1)} aria-label="Zurück">
                <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>
              </button>
            {/if}
            <div class={chartScrollCls} bind:this={ageScroll} onscroll={handleScroll('age')}>
              <div class={chartCardCls} data-card>
                <div class="flex items-start justify-between mb-3">
                  <h3 class="text-sm font-semibold text-gray-500">Gesamt · Schillerkiez</h3>
                  {@render plrMiniMap('all')}
                </div>
                <svg viewBox="0 0 400 240" class="w-full" role="img" aria-label="Altersverteilung Gesamt">
                  {#each data.demographics.ageDistribution as age, i}
                    {@const barWidth = maxCount > 0 ? (age.count / maxCount) * 260 : 0}
                    {@const y = i * 32 + 10}
                    <text x="55" y={y + 16} text-anchor="end" fill="#4a5568" font-size="12" font-weight="500">{age.group}</text>
                    <rect x="65" y={y + 2} width={barWidth} height="20" rx="4" fill={AGE_COLORS[i]} opacity="0.85" />
                    <text x={65 + barWidth + 6} y={y + 16} fill="#4a5568" font-size="11">
                      {fmt(age.count)} ({age.percentage}%)
                    </text>
                  {/each}
                </svg>
                <p class="text-xs text-gray-400 mt-1 text-right">Einwohner: {fmt(data.demographics.population.total)}</p>
              </div>
              {#each data.plrAreas as area}
                {@const plrMax = Math.max(...area.ageDistribution.map(a => a.count))}
                <div class={chartCardCls} data-card>
                  <div class="flex items-start justify-between mb-3">
                    <h3 class="text-sm font-semibold text-gray-500">{shortName(area.name)}</h3>
                    {@render plrMiniMap(area.code)}
                  </div>
                  <svg viewBox="0 0 400 240" class="w-full" role="img" aria-label="Altersverteilung {area.name}">
                    {#each area.ageDistribution as age, i}
                      {@const barWidth = plrMax > 0 ? (age.count / plrMax) * 260 : 0}
                      {@const y = i * 32 + 10}
                      <text x="55" y={y + 16} text-anchor="end" fill="#4a5568" font-size="12" font-weight="500">{age.group}</text>
                      <rect x="65" y={y + 2} width={barWidth} height="20" rx="4" fill={AGE_COLORS[i]} opacity="0.85" />
                      <text x={65 + barWidth + 6} y={y + 16} fill="#4a5568" font-size="11">
                        {fmt(age.count)} ({age.percentage}%)
                      </text>
                    {/each}
                  </svg>
                  <p class="text-xs text-gray-400 mt-1 text-right">Einwohner: {fmt(area.population.total)}</p>
                </div>
              {/each}
            </div>
            {#if canScroll.age.right}
              <button class="{arrowCls} -right-1 lg:-right-5" onclick={() => scrollCarousel(ageScroll, 1)} aria-label="Weiter">
                <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>
              </button>
            {/if}
          </div>
        </div>
      {/if}

      <!-- Migration Donut Carousel -->
      {#if data.demographics}
        {@const mig = data.demographics.migration}
        {@const aggSegments = donutSegments([
          { label: 'Ausländer', value: mig.foreignNationals, color: MIGRATION_COLORS[0] },
          { label: 'Deutsche mit MH', value: mig.germanWithMigBg, color: MIGRATION_COLORS[1] },
          { label: 'Ohne MH', value: mig.withoutMigBg, color: MIGRATION_COLORS[2] },
        ], mig.totalPopulation)}
        <div class="transition-all duration-500 {revealedCount >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}">
          <h2 class="text-lg font-bold text-gray-800 mb-3">Vielfalt</h2>
          <div class="relative">
            {#if canScroll.mig.left}
              <button class="{arrowCls} -left-1 lg:-left-5" onclick={() => scrollCarousel(migScroll, -1)} aria-label="Zurück">
                <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>
              </button>
            {/if}
            <div class={chartScrollCls} bind:this={migScroll} onscroll={handleScroll('mig')}>
              <div class={chartCardCls} data-card>
                <div class="flex items-start justify-between mb-3">
                  <h3 class="text-sm font-semibold text-gray-500">Gesamt · Schillerkiez</h3>
                  {@render plrMiniMap('all')}
                </div>
                <div class="flex flex-col items-center gap-3">
                  <svg viewBox="0 0 120 120" class="w-36 h-36 shrink-0" role="img" aria-label="Vielfalt Gesamt">
                    {#each aggSegments as seg}
                      <circle cx="60" cy="60" r="40" fill="none" stroke={seg.color} stroke-width="18"
                        stroke-dasharray={seg.dashArray} stroke-dashoffset={-seg.offset} transform="rotate(-90 60 60)" />
                    {/each}
                    <text x="60" y="58" text-anchor="middle" fill="#4a5568" font-size="10" font-weight="600">{fmt(mig.totalPopulation)}</text>
                    <text x="60" y="70" text-anchor="middle" fill="#9ca3af" font-size="7">Gesamt</text>
                  </svg>
                  <div class="space-y-1 text-sm">
                    {#each aggSegments as seg}
                      <div class="flex items-center gap-2">
                        <span class="w-3 h-3 rounded-full shrink-0" style="background: {seg.color}"></span>
                        <span class="text-gray-700">{seg.label}: <strong>{fmt(seg.value)}</strong> ({seg.percentage}%)</span>
                      </div>
                    {/each}
                  </div>
                </div>
              </div>
              {#each data.plrAreas as area}
                {@const plrSegs = donutSegments([
                  { label: 'Ausländer', value: area.migration.foreignNationals, color: MIGRATION_COLORS[0] },
                  { label: 'Deutsche mit MH', value: area.migration.germanWithMigBg, color: MIGRATION_COLORS[1] },
                  { label: 'Ohne MH', value: area.migration.withoutMigBg, color: MIGRATION_COLORS[2] },
                ], area.migration.totalPopulation)}
                <div class={chartCardCls} data-card>
                  <div class="flex items-start justify-between mb-3">
                    <h3 class="text-sm font-semibold text-gray-500">{shortName(area.name)}</h3>
                    {@render plrMiniMap(area.code)}
                  </div>
                  <div class="flex flex-col items-center gap-3">
                    <svg viewBox="0 0 120 120" class="w-36 h-36 shrink-0" role="img" aria-label="Vielfalt {area.name}">
                      {#each plrSegs as seg}
                        <circle cx="60" cy="60" r="40" fill="none" stroke={seg.color} stroke-width="18"
                          stroke-dasharray={seg.dashArray} stroke-dashoffset={-seg.offset} transform="rotate(-90 60 60)" />
                      {/each}
                      <text x="60" y="58" text-anchor="middle" fill="#4a5568" font-size="10" font-weight="600">{fmt(area.migration.totalPopulation)}</text>
                      <text x="60" y="70" text-anchor="middle" fill="#9ca3af" font-size="7">{shortName(area.name)}</text>
                    </svg>
                    <div class="space-y-1 text-sm">
                      {#each plrSegs as seg}
                        <div class="flex items-center gap-2">
                          <span class="w-3 h-3 rounded-full shrink-0" style="background: {seg.color}"></span>
                          <span class="text-gray-700">{seg.label}: <strong>{fmt(seg.value)}</strong> ({seg.percentage}%)</span>
                        </div>
                      {/each}
                    </div>
                  </div>
                </div>
              {/each}
            </div>
            {#if canScroll.mig.right}
              <button class="{arrowCls} -right-1 lg:-right-5" onclick={() => scrollCarousel(migScroll, 1)} aria-label="Weiter">
                <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>
              </button>
            {/if}
          </div>
        </div>
      {/if}

      <!-- Gender Donut Carousel -->
      {#if data.demographics}
        {@const pop = data.demographics.population}
        {@const aggGenderSegs = donutSegments([
          { label: 'Männlich', value: pop.male, color: COLORS.teal },
          { label: 'Weiblich', value: pop.female, color: COLORS.wine },
        ], pop.total)}
        <div class="transition-all duration-500 {revealedCount >= 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}">
          <h2 class="text-lg font-bold text-gray-800 mb-3">Geschlecht</h2>
          <div class="relative">
            {#if canScroll.gender.left}
              <button class="{arrowCls} -left-1 lg:-left-5" onclick={() => scrollCarousel(genderScroll, -1)} aria-label="Zurück">
                <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>
              </button>
            {/if}
            <div class={chartScrollCls} bind:this={genderScroll} onscroll={handleScroll('gender')}>
              <div class={chartCardCls} data-card>
                <div class="flex items-start justify-between mb-3">
                  <h3 class="text-sm font-semibold text-gray-500">Gesamt · Schillerkiez</h3>
                  {@render plrMiniMap('all')}
                </div>
                <div class="flex flex-col items-center gap-3">
                  <svg viewBox="0 0 120 120" class="w-36 h-36 shrink-0" role="img" aria-label="Geschlecht Gesamt">
                    {#each aggGenderSegs as seg}
                      <circle cx="60" cy="60" r="40" fill="none" stroke={seg.color} stroke-width="18"
                        stroke-dasharray={seg.dashArray} stroke-dashoffset={-seg.offset} transform="rotate(-90 60 60)" />
                    {/each}
                  </svg>
                  <div class="space-y-1 text-sm">
                    {#each aggGenderSegs as seg}
                      <div class="flex items-center gap-2">
                        <span class="w-3 h-3 rounded-full shrink-0" style="background: {seg.color}"></span>
                        <span class="text-gray-700">{seg.label}: <strong>{fmt(seg.value)}</strong> ({seg.percentage}%)</span>
                      </div>
                    {/each}
                  </div>
                </div>
              </div>
              {#each data.plrAreas as area}
                {@const plrGenderSegs = donutSegments([
                  { label: 'Männlich', value: area.population.male, color: COLORS.teal },
                  { label: 'Weiblich', value: area.population.female, color: COLORS.wine },
                ], area.population.total)}
                <div class={chartCardCls} data-card>
                  <div class="flex items-start justify-between mb-3">
                    <h3 class="text-sm font-semibold text-gray-500">{shortName(area.name)}</h3>
                    {@render plrMiniMap(area.code)}
                  </div>
                  <div class="flex flex-col items-center gap-3">
                    <svg viewBox="0 0 120 120" class="w-36 h-36 shrink-0" role="img" aria-label="Geschlecht {area.name}">
                      {#each plrGenderSegs as seg}
                        <circle cx="60" cy="60" r="40" fill="none" stroke={seg.color} stroke-width="18"
                          stroke-dasharray={seg.dashArray} stroke-dashoffset={-seg.offset} transform="rotate(-90 60 60)" />
                      {/each}
                    </svg>
                    <div class="space-y-1 text-sm">
                      {#each plrGenderSegs as seg}
                        <div class="flex items-center gap-2">
                          <span class="w-3 h-3 rounded-full shrink-0" style="background: {seg.color}"></span>
                          <span class="text-gray-700">{seg.label}: <strong>{fmt(seg.value)}</strong> ({seg.percentage}%)</span>
                        </div>
                      {/each}
                    </div>
                  </div>
                </div>
              {/each}
            </div>
            {#if canScroll.gender.right}
              <button class="{arrowCls} -right-1 lg:-right-5" onclick={() => scrollCarousel(genderScroll, 1)} aria-label="Weiter">
                <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>
              </button>
            {/if}
          </div>
        </div>
      {/if}

      <!-- Social Indicators Carousel -->
      {#if data.social}
        {@const social = data.social}
        {@const aggIndicators = [
          { label: 'Arbeitslosenquote', value: social.unemploymentRate, color: COLORS.teal },
          { label: 'Kinderarmut (U15)', value: social.childPovertyRate, color: COLORS.wine },
          { label: 'Transferleistungen', value: social.transferBenefitRate, color: COLORS.yellow },
        ]}
        <div class="transition-all duration-500 {revealedCount >= 5 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}">
          <h2 class="text-lg font-bold text-gray-800 mb-3">Soziale Lage</h2>
          <div class="relative">
            {#if canScroll.social.left}
              <button class="{arrowCls} -left-1 lg:-left-5" onclick={() => scrollCarousel(socialScroll, -1)} aria-label="Zurück">
                <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>
              </button>
            {/if}
            <div class={chartScrollCls} bind:this={socialScroll} onscroll={handleScroll('social')}>
              <div class={chartCardCls} data-card>
                <div class="flex items-start justify-between mb-3">
                  <h3 class="text-sm font-semibold text-gray-500">Gesamt · Schillerkiez</h3>
                  {@render plrMiniMap('all')}
                </div>
                <svg viewBox="0 0 300 195" class="w-full" role="img" aria-label="Soziale Lage Gesamt">
                  {#each aggIndicators as ind, i}
                    {@const barWidth = Math.min(ind.value, 100) / 100 * 240}
                    {@const y = i * 60 + 5}
                    <text x="10" y={y + 14} fill="#4a5568" font-size="13" font-weight="500">{ind.label}</text>
                    <rect x="10" y={y + 22} width="240" height="22" rx="4" fill="#f3f4f6" />
                    <rect x="10" y={y + 22} width={barWidth} height="22" rx="4" fill={ind.color} opacity="0.8" />
                    <text x={10 + barWidth + 6} y={y + 38} fill="#4a5568" font-size="12" font-weight="600">{ind.value}%</text>
                  {/each}
                </svg>
                {#if social.statusIndex || social.dynamikIndex}
                  <div class="mt-3 flex flex-wrap gap-4 text-sm text-gray-600">
                    <span>Status-Index: <strong>{social.statusIndex}</strong></span>
                    <span>Dynamik-Index: <strong>{social.dynamikIndex}</strong></span>
                    <span class="text-gray-400">(*)</span>
                  </div>
                {/if}
              </div>
              {#each data.plrAreas as area}
                <div class={chartCardCls} data-card>
                  <div class="flex items-start justify-between mb-3">
                    <h3 class="text-sm font-semibold text-gray-500">{shortName(area.name)}</h3>
                    {@render plrMiniMap(area.code)}
                  </div>
                  {#if area.social}
                    {@const plrIndicators = [
                      { label: 'Arbeitslosenquote', value: area.social.unemploymentRate, color: COLORS.teal },
                      { label: 'Kinderarmut (U15)', value: area.social.childPovertyRate, color: COLORS.wine },
                      { label: 'Transferleistungen', value: area.social.transferBenefitRate, color: COLORS.yellow },
                    ]}
                    <svg viewBox="0 0 300 195" class="w-full" role="img" aria-label="Soziale Lage {area.name}">
                      {#each plrIndicators as ind, i}
                        {@const barWidth = Math.min(ind.value, 100) / 100 * 240}
                        {@const y = i * 60 + 5}
                        <text x="10" y={y + 14} fill="#4a5568" font-size="13" font-weight="500">{ind.label}</text>
                        <rect x="10" y={y + 22} width="240" height="22" rx="4" fill="#f3f4f6" />
                        <rect x="10" y={y + 22} width={barWidth} height="22" rx="4" fill={ind.color} opacity="0.8" />
                        <text x={10 + barWidth + 6} y={y + 38} fill="#4a5568" font-size="12" font-weight="600">{ind.value}%</text>
                      {/each}
                    </svg>
                    {#if area.social.statusIndex || area.social.dynamikIndex}
                      <div class="mt-3 flex flex-wrap gap-4 text-sm text-gray-600">
                        <span>Status-Index: <strong>{area.social.statusIndex}</strong></span>
                        <span>Dynamik-Index: <strong>{area.social.dynamikIndex}</strong></span>
                        <span class="text-gray-400">(*)</span>
                      </div>
                    {/if}
                  {:else}
                    <div class="flex items-center justify-center h-32 text-gray-400">
                      Keine Sozialdaten verfügbar
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
            {#if canScroll.social.right}
              <button class="{arrowCls} -right-1 lg:-right-5" onclick={() => scrollCarousel(socialScroll, 1)} aria-label="Weiter">
                <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>
              </button>
            {/if}
          </div>
        </div>
      {/if}

    </div>

    <!-- Footer / Sources -->
    <div class="bg-white/60 rounded-xl p-6 text-sm text-gray-500 space-y-2 transition-all duration-500 {revealedCount >= 6 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}">
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
      <hr class="border-gray-300/50 my-2" />
      <p class="text-xs text-gray-400 italic">
        (*) <strong class="font-semibold">Status-Index:</strong> Zusammengesetzter Wert aus Arbeitslosigkeit, Kinderarmut und Transferleistungen — je niedriger, desto besser die soziale Lage.
        <strong class="font-semibold">Dynamik-Index:</strong> Zeigt die Entwicklung über die Zeit — positiv = Verbesserung, negativ = Verschlechterung, 0 = stabil.
      </p>
      <hr class="border-gray-300/50 my-2" />
    </div>
  {/if}
</div>
