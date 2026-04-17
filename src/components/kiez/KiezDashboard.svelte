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
    COLORS.teal, COLORS.wine, COLORS.yellow, '#5cb87a',
    COLORS.tealLight, COLORS.wineLight, COLORS.gray,
  ];

  // Migration donut colors
  const MIGRATION_COLORS = [COLORS.teal, COLORS.wine, COLORS.yellow];

  const reducedMotion = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : true;

  // Carousel CSS — chart cards (scrollable, tighter padding for more chart space)
  const chartScrollCls = 'flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2 -mx-4 px-4 md:-mx-8 md:px-8 lg:-mx-12 lg:px-12 scroll-pl-4 md:scroll-pl-8 lg:scroll-pl-12';
  const chartCardCls = 'snap-start shrink-0 w-[85vw] sm:w-[55%] lg:w-[calc(33.333%-1rem)] min-h-[22rem] rounded-xl p-4 sm:p-5 border border-transparent transition-all duration-300 hover:bg-white/[0.06] hover:backdrop-blur-md hover:border-white/[0.15] hover:border-t-white/30 hover:border-l-white/25 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]';

  // Arrow button classes (all screens, scaled)
  const arrowCls = 'flex absolute top-1/2 -translate-y-1/2 z-10 w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 items-center justify-center rounded-full bg-white/10 hover:backdrop-blur-md border border-white/15 hover:bg-white/20 active:scale-95 transition-all text-white/60 hover:text-white cursor-pointer';

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
      if (!error) dataReady = true;
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

  /** Format period "2021h2" → "H2 '21" for compact axis labels */
  function formatPeriod(period) {
    const year = period.slice(2, 4);
    const half = period.slice(4).toUpperCase();
    return `${half} '${year}`;
  }

  /** Format social period — year-only periods like "2013" → "'13" */
  function formatSocialPeriod(period) {
    return period.length === 4 ? `'${period.slice(2)}` : formatPeriod(period);
  }

  // Old LOR → new LOR mapping for continuous social trend lines
  // Pre-2021: 2 PLRs. Post-2021: 4 PLRs (each old area split into 2)
  const SOCIAL_PLR_GROUPS = [
    { name: 'Schillerpromenade', old: '08010117', new: ['08100102', '08100103'] },
    { name: 'Silbersteinstraße', old: '08010118', new: ['08100104', '08100105'] },
  ];

  /** Merge per-PLR social trend into 2 continuous virtual series across the LOR boundary */
  function mergeSocialPlrTrend(plrData, periods) {
    return SOCIAL_PLR_GROUPS.map(group => {
      const points = periods.map(period => {
        // Find matching docs: old code for pre-2021, average of new codes for 2021+
        const periodNum = parseInt(period);
        let vals;
        if (periodNum < 2021) {
          vals = plrData.filter(d => d.plr_code === group.old && d.period === period);
        } else {
          vals = plrData.filter(d => group.new.includes(d.plr_code) && d.period === period);
        }
        if (vals.length === 0) return null;
        const n = vals.length;
        return {
          period,
          date: `${period}-12-31`,
          unemploymentRate: Math.round(vals.reduce((s, v) => s + v.unemploymentRate, 0) / n * 10) / 10,
          childPovertyRate: Math.round(vals.reduce((s, v) => s + v.childPovertyRate, 0) / n * 10) / 10,
          transferBenefitRate: Math.round(vals.reduce((s, v) => s + v.transferBenefitRate, 0) / n * 10) / 10,
        };
      }).filter(Boolean);
      return { name: group.name, points };
    });
  }

  /** PLR line chart colors — match project palette */
  const PLR_LINE_COLORS = [COLORS.teal, COLORS.wine, COLORS.yellow, '#5cb87a'];

  // Human-readable German descriptions for pollutant abbreviations
  const POLLUTANT_DESCRIPTIONS = {
    pm10: 'Feinstaub',
    no2: 'Stickstoffdioxid',
    o3: 'Ozon',
    co: 'Kohlenmonoxid',
  };

  // Air quality grade → project palette color
  function gradeColor(grade) {
    if (grade <= 2) return '#5cb87a'; // green — gut/sehr gut
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

  // Scroll-triggered reveal animation (IntersectionObserver)
  let dataReady = $state(false);

  function reveal(node) {
    if (reducedMotion) {
      node.classList.add('revealed');
      return;
    }
    // Start hidden
    node.classList.add('reveal-hidden');

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && dataReady) {
          node.classList.remove('reveal-hidden');
          node.classList.add('revealed');
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: '-40px 0px' }
    );
    observer.observe(node);

    return {
      destroy() { observer.disconnect(); }
    };
  }

  // Carousel container refs (used by scrollCarousel)
  let trendScroll = $state(null);
  let ageScroll = $state(null);
  let migScroll = $state(null);
  let genderScroll = $state(null);
  let socialScroll = $state(null);
  let socialTrendScroll = $state(null);

  /** @type {Record<string, { left: boolean, right: boolean }>} */
  let canScroll = $state({
    trend:  { left: false, right: true },
    age:    { left: false, right: true },
    mig:    { left: false, right: true },
    gender: { left: false, right: true },
    social: { left: false, right: true },
    socialTrend: { left: false, right: true },
  });

  /** Per-carousel debounce timers to catch scroll-snap settle */
  const scrollTimers = { trend: 0, age: 0, mig: 0, gender: 0, social: 0, socialTrend: 0 };

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

  // After data loads, measure initial overflow state for carousels
  $effect(() => {
    if (!dataReady) return;
    const refs = { trend: trendScroll, age: ageScroll, mig: migScroll, gender: genderScroll, social: socialScroll, socialTrend: socialTrendScroll };
    setTimeout(() => {
      for (const [key, el] of Object.entries(refs)) {
        if (!el) continue;
        const pad = parseFloat(getComputedStyle(el).paddingLeft) || 0;
        canScroll[key] = {
          left: el.scrollLeft > pad + 2,
          right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
        };
      }
    }, 600);
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
    <p use:reveal class="text-sm text-white/40 -mt-4 mb-4 transition-all duration-700 ease-out">Stand: {data.lastUpdated}</p>
  {/if}

  {#if loading}
    <!-- Loading skeleton -->
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {#each Array(6) as _}
        <div class="bg-white/[0.04] hover:backdrop-blur-md border border-white/[0.1] rounded-xl p-5 animate-pulse">
          <div class="h-4 bg-white/10 rounded w-2/3 mb-3"></div>
          <div class="h-8 bg-white/10 rounded w-1/2"></div>
        </div>
      {/each}
    </div>
  {:else if error}
    <!-- Error state -->
    <div class="text-center py-16">
      <p class="text-white/70 mb-4">Daten konnten nicht geladen werden: {error}</p>
      <button
        onclick={fetchData}
        class="px-6 py-2 bg-[#5cb87a] text-white rounded-lg hover:bg-[#70cc8e] transition-colors"
      >
        Erneut versuchen
      </button>
    </div>
  {:else if !data?.demographics && !data?.social}
    <!-- Empty state -->
    <div class="text-center py-16">
      <p class="text-white/60 text-lg">Noch keine Daten verfügbar</p>
    </div>
  {:else}
    <!-- Air Quality (live BLUME data) -->
    {#if airData}
      <div use:reveal class="rounded-xl p-6 border border-transparent transition-all duration-300 hover:bg-white/[0.06] hover:backdrop-blur-md hover:border-white/[0.15] hover:border-t-white/30 hover:border-l-white/25 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
        <div class="flex items-center gap-2 mb-4">
          <h2 class="text-lg font-bold text-[#e8e6e1] font-['Space_Grotesk',sans-serif]">Luftqualität</h2>
          <span class="inline-flex items-center gap-1 text-xs text-white/40">
            <span class="w-2 h-2 rounded-full bg-green-500 motion-safe:animate-pulse"></span>
            Live · Nansenstraße
          </span>
        </div>

        <div class="flex flex-wrap justify-center gap-3">
          <!-- Overall LQI -->
          <div class="w-[calc(50%-6px)] sm:w-[calc(33.333%-8px)] lg:w-[calc(20%-10px)] rounded-lg p-4 text-center"
               style="background: {gradeColor(airData.overallGrade)}15; border: 2px solid {gradeColor(airData.overallGrade)}">
            <p class="text-xs text-white/60 font-medium">Gesamt</p>
            <p class="text-3xl font-bold" style="color: {gradeColor(airData.overallGrade)}">
              {airData.overallGrade}
            </p>
            <p class="text-sm font-medium" style="color: {gradeColor(airData.overallGrade)}">
              {airData.overallLabel}
            </p>
          </div>

          <!-- Per-pollutant cards -->
          {#each airData.pollutants as pol}
            <div class="w-[calc(50%-6px)] sm:w-[calc(33.333%-8px)] lg:w-[calc(20%-10px)] rounded-lg p-3 text-center border border-transparent transition-all duration-300 hover:bg-white/[0.06] hover:backdrop-blur-md hover:border-white/[0.15] hover:border-t-white/30 hover:border-l-white/25 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
              <p class="text-xs text-white/40 font-medium">{POLLUTANT_DESCRIPTIONS[pol.component] ?? pol.name}</p>
              <p class="text-xl font-bold" style="color: {pol.grade != null ? gradeColor(pol.grade) : '#d1d5db'}">{pol.grade ?? '–'}</p>
              <p class="text-xs" style="color: {pol.grade != null ? gradeColor(pol.grade) : '#9ca3af'}">{pol.gradeLabel}</p>
              <p class="text-[10px] text-white/30 mt-0.5">{pol.name}</p>
            </div>
          {/each}
        </div>

        <!-- Grade scale legend -->
        <div class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/40">
          <span class="font-medium text-white/60">Skala:</span>
          {#each [{ g: 1, l: 'sehr gut' }, { g: 2, l: 'gut' }, { g: 3, l: 'mäßig' }, { g: 4, l: 'schlecht' }, { g: 5, l: 'sehr schlecht' }] as item}
            <span class="inline-flex items-center gap-1">
              <span class="w-2.5 h-2.5 rounded-sm" style="background: {gradeColor(item.g)}"></span>
              {item.g} = {item.l}
            </span>
          {/each}
        </div>

        <p class="mt-2 text-xs text-white/40">
          Messung: {new Date(airData.datetime).toLocaleString('de-DE')}
          · <a href="https://luftdaten.berlin.de/station/mc042" target="_blank" rel="noopener"
               class="text-[#5cb87a] hover:underline">Quelle: BLUME-Messnetz</a>
        </p>
      </div>
    {/if}

    <!-- Chart Carousels -->
    <div class="space-y-6">

      <!-- Age Distribution Carousel -->
      {#if data.demographics}
        {@const maxCount = Math.max(...data.demographics.ageDistribution.map(a => a.count))}
        <div use:reveal class="transition-all duration-700 ease-out">
          <h2 class="text-lg font-bold text-[#e8e6e1] font-['Space_Grotesk',sans-serif] mb-3">Altersverteilung</h2>
          <div class="relative">
            {#if canScroll.age.left}
              <button class="{arrowCls} -left-1 lg:-left-5" onclick={() => scrollCarousel(ageScroll, -1)} aria-label="Zurück">
                <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>
              </button>
            {/if}
            <div class={chartScrollCls} bind:this={ageScroll} onscroll={handleScroll('age')}>
              <div class={chartCardCls} data-card>
                <div class="flex items-start justify-between mb-3">
                  <h3 class="text-sm font-semibold text-white/60">Gesamt · Schillerkiez</h3>
                  {@render plrMiniMap('all')}
                </div>
                <svg viewBox="0 0 400 240" class="w-full" role="img" aria-label="Altersverteilung Gesamt">
                  {#each data.demographics.ageDistribution as age, i}
                    {@const barWidth = maxCount > 0 ? (age.count / maxCount) * 260 : 0}
                    {@const y = i * 32 + 10}
                    <text x="55" y={y + 16} text-anchor="end" fill="rgba(232,230,225,0.9)" font-size="12" font-weight="500">{age.group}</text>
                    <rect x="65" y={y + 2} width={barWidth} height="20" rx="4" fill={AGE_COLORS[i]} opacity="0.85" />
                    <text x={65 + barWidth + 6} y={y + 16} fill="rgba(232,230,225,0.9)" font-size="11">
                      {fmt(age.count)} ({age.percentage}%)
                    </text>
                  {/each}
                </svg>
                <p class="text-xs text-white/40 mt-1 text-right">Einwohner: {fmt(data.demographics.population.total)}</p>
              </div>
              {#each data.plrAreas as area}
                {@const plrMax = Math.max(...area.ageDistribution.map(a => a.count))}
                <div class={chartCardCls} data-card>
                  <div class="flex items-start justify-between mb-3">
                    <h3 class="text-sm font-semibold text-white/60">{shortName(area.name)}</h3>
                    {@render plrMiniMap(area.code)}
                  </div>
                  <svg viewBox="0 0 400 240" class="w-full" role="img" aria-label="Altersverteilung {area.name}">
                    {#each area.ageDistribution as age, i}
                      {@const barWidth = plrMax > 0 ? (age.count / plrMax) * 260 : 0}
                      {@const y = i * 32 + 10}
                      <text x="55" y={y + 16} text-anchor="end" fill="rgba(232,230,225,0.9)" font-size="12" font-weight="500">{age.group}</text>
                      <rect x="65" y={y + 2} width={barWidth} height="20" rx="4" fill={AGE_COLORS[i]} opacity="0.85" />
                      <text x={65 + barWidth + 6} y={y + 16} fill="rgba(232,230,225,0.9)" font-size="11">
                        {fmt(age.count)} ({age.percentage}%)
                      </text>
                    {/each}
                  </svg>
                  <p class="text-xs text-white/40 mt-1 text-right">Einwohner: {fmt(area.population.total)}</p>
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
        <div use:reveal class="transition-all duration-700 ease-out">
          <h2 class="text-lg font-bold text-[#e8e6e1] font-['Space_Grotesk',sans-serif] mb-3">Vielfalt</h2>
          <div class="relative">
            {#if canScroll.mig.left}
              <button class="{arrowCls} -left-1 lg:-left-5" onclick={() => scrollCarousel(migScroll, -1)} aria-label="Zurück">
                <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>
              </button>
            {/if}
            <div class={chartScrollCls} bind:this={migScroll} onscroll={handleScroll('mig')}>
              <div class={chartCardCls} data-card>
                <div class="flex items-start justify-between mb-3">
                  <h3 class="text-sm font-semibold text-white/60">Gesamt · Schillerkiez</h3>
                  {@render plrMiniMap('all')}
                </div>
                <div class="flex flex-col items-center gap-3">
                  <svg viewBox="0 0 120 120" class="w-36 h-36 shrink-0" role="img" aria-label="Vielfalt Gesamt">
                    {#each aggSegments as seg}
                      <circle cx="60" cy="60" r="40" fill="none" stroke={seg.color} stroke-width="18"
                        stroke-dasharray={seg.dashArray} stroke-dashoffset={-seg.offset} transform="rotate(-90 60 60)" />
                    {/each}
                    <text x="60" y="58" text-anchor="middle" fill="rgba(232,230,225,0.9)" font-size="10" font-weight="600">{fmt(mig.totalPopulation)}</text>
                    <text x="60" y="70" text-anchor="middle" fill="rgba(255,255,255,0.5)" font-size="7">Gesamt</text>
                  </svg>
                  <div class="space-y-1 text-sm">
                    {#each aggSegments as seg}
                      <div class="flex items-center gap-2">
                        <span class="w-3 h-3 rounded-full shrink-0" style="background: {seg.color}"></span>
                        <span class="text-white/80">{seg.label}: <strong>{fmt(seg.value)}</strong> ({seg.percentage}%)</span>
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
                    <h3 class="text-sm font-semibold text-white/60">{shortName(area.name)}</h3>
                    {@render plrMiniMap(area.code)}
                  </div>
                  <div class="flex flex-col items-center gap-3">
                    <svg viewBox="0 0 120 120" class="w-36 h-36 shrink-0" role="img" aria-label="Vielfalt {area.name}">
                      {#each plrSegs as seg}
                        <circle cx="60" cy="60" r="40" fill="none" stroke={seg.color} stroke-width="18"
                          stroke-dasharray={seg.dashArray} stroke-dashoffset={-seg.offset} transform="rotate(-90 60 60)" />
                      {/each}
                      <text x="60" y="58" text-anchor="middle" fill="rgba(232,230,225,0.9)" font-size="10" font-weight="600">{fmt(area.migration.totalPopulation)}</text>
                      <text x="60" y="70" text-anchor="middle" fill="rgba(255,255,255,0.5)" font-size="7">{shortName(area.name)}</text>
                    </svg>
                    <div class="space-y-1 text-sm">
                      {#each plrSegs as seg}
                        <div class="flex items-center gap-2">
                          <span class="w-3 h-3 rounded-full shrink-0" style="background: {seg.color}"></span>
                          <span class="text-white/80">{seg.label}: <strong>{fmt(seg.value)}</strong> ({seg.percentage}%)</span>
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
        <div use:reveal class="transition-all duration-700 ease-out">
          <h2 class="text-lg font-bold text-[#e8e6e1] font-['Space_Grotesk',sans-serif] mb-3">Geschlecht</h2>
          <div class="relative">
            {#if canScroll.gender.left}
              <button class="{arrowCls} -left-1 lg:-left-5" onclick={() => scrollCarousel(genderScroll, -1)} aria-label="Zurück">
                <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>
              </button>
            {/if}
            <div class={chartScrollCls} bind:this={genderScroll} onscroll={handleScroll('gender')}>
              <div class={chartCardCls} data-card>
                <div class="flex items-start justify-between mb-3">
                  <h3 class="text-sm font-semibold text-white/60">Gesamt · Schillerkiez</h3>
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
                        <span class="text-white/80">{seg.label}: <strong>{fmt(seg.value)}</strong> ({seg.percentage}%)</span>
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
                    <h3 class="text-sm font-semibold text-white/60">{shortName(area.name)}</h3>
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
                          <span class="text-white/80">{seg.label}: <strong>{fmt(seg.value)}</strong> ({seg.percentage}%)</span>
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
        <div use:reveal class="transition-all duration-700 ease-out">
          <h2 class="text-lg font-bold text-[#e8e6e1] font-['Space_Grotesk',sans-serif] mb-3">Soziale Lage</h2>
          <div class="relative">
            {#if canScroll.social.left}
              <button class="{arrowCls} -left-1 lg:-left-5" onclick={() => scrollCarousel(socialScroll, -1)} aria-label="Zurück">
                <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>
              </button>
            {/if}
            <div class={chartScrollCls} bind:this={socialScroll} onscroll={handleScroll('social')}>
              <div class={chartCardCls} data-card>
                <div class="flex items-start justify-between mb-3">
                  <h3 class="text-sm font-semibold text-white/60">Gesamt · Schillerkiez</h3>
                  {@render plrMiniMap('all')}
                </div>
                <svg viewBox="0 0 300 195" class="w-full" role="img" aria-label="Soziale Lage Gesamt">
                  {#each aggIndicators as ind, i}
                    {@const barWidth = Math.min(ind.value, 100) / 100 * 240}
                    {@const y = i * 60 + 5}
                    <text x="10" y={y + 14} fill="rgba(232,230,225,0.9)" font-size="13" font-weight="500">{ind.label}</text>
                    <rect x="10" y={y + 22} width="240" height="22" rx="4" fill="rgba(255,255,255,0.08)" />
                    <rect x="10" y={y + 22} width={barWidth} height="22" rx="4" fill={ind.color} opacity="0.8" />
                    <text x={10 + barWidth + 6} y={y + 38} fill="rgba(232,230,225,0.9)" font-size="12" font-weight="600">{ind.value}%</text>
                  {/each}
                </svg>
                {#if social.statusIndex || social.dynamikIndex}
                  <div class="mt-3 flex flex-wrap gap-4 text-sm text-white/70">
                    <span>Status-Index: <strong>{social.statusIndex}</strong></span>
                    <span>Dynamik-Index: <strong>{social.dynamikIndex}</strong></span>
                    <span class="text-white/40">(*)</span>
                  </div>
                {/if}
              </div>
              {#each data.plrAreas as area}
                <div class={chartCardCls} data-card>
                  <div class="flex items-start justify-between mb-3">
                    <h3 class="text-sm font-semibold text-white/60">{shortName(area.name)}</h3>
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
                        <text x="10" y={y + 14} fill="rgba(232,230,225,0.9)" font-size="13" font-weight="500">{ind.label}</text>
                        <rect x="10" y={y + 22} width="240" height="22" rx="4" fill="rgba(255,255,255,0.08)" />
                        <rect x="10" y={y + 22} width={barWidth} height="22" rx="4" fill={ind.color} opacity="0.8" />
                        <text x={10 + barWidth + 6} y={y + 38} fill="rgba(232,230,225,0.9)" font-size="12" font-weight="600">{ind.value}%</text>
                      {/each}
                    </svg>
                    {#if area.social.statusIndex || area.social.dynamikIndex}
                      <div class="mt-3 flex flex-wrap gap-4 text-sm text-white/70">
                        <span>Status-Index: <strong>{area.social.statusIndex}</strong></span>
                        <span>Dynamik-Index: <strong>{area.social.dynamikIndex}</strong></span>
                        <span class="text-white/40">(*)</span>
                      </div>
                    {/if}
                  {:else}
                    <div class="flex items-center justify-center h-32 text-white/40">
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

    <!-- Population Trend Line Chart -->
    {#if data.trend && data.trend.length >= 2}
      {@const trend = data.trend}
      {@const plrTrend = data.plrTrend ?? []}
      {@const timestamps = trend.map(t => new Date(t.date).getTime())}
      {@const tMin = Math.min(...timestamps)}
      {@const tMax = Math.max(...timestamps)}
      {@const tRange = tMax - tMin || 1}
      {@const populations = trend.map(t => t.population)}
      {@const yMinRaw = Math.min(...populations)}
      {@const yMaxRaw = Math.max(...populations)}
      {@const yPad = (yMaxRaw - yMinRaw) * 0.08 || 500}
      {@const yMin = yMinRaw - yPad}
      {@const yMax = yMaxRaw + yPad}
      {@const yRange = yMax - yMin || 1}
      {@const chartL = 55}
      {@const chartR = 385}
      {@const chartT = 20}
      {@const chartB = 230}
      {@const chartW = chartR - chartL}
      {@const chartH = chartB - chartT}
      {@const toX = (/** @type {string} */ date) => chartL + ((new Date(date).getTime() - tMin) / tRange) * chartW}
      {@const toY = (/** @type {number} */ pop) => chartB - ((pop - yMin) / yRange) * chartH}
      {@const aggPoints = trend.map(t => `${toX(t.date)},${toY(t.population)}`).join(' ')}
      {@const gridLines = Array.from({ length: 5 }, (_, i) => yMin + (yRange / 4) * i)}
      <div use:reveal class="transition-all duration-700 ease-out">
        <h2 class="text-lg font-bold text-[#e8e6e1] font-['Space_Grotesk',sans-serif] mb-3">Bevölkerungsentwicklung</h2>
        <div class="relative">
          {#if canScroll.trend.left}
            <button class="{arrowCls} -left-1 lg:-left-5" onclick={() => scrollCarousel(trendScroll, -1)} aria-label="Zurück">
              <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>
            </button>
          {/if}
          <div class={chartScrollCls} bind:this={trendScroll} onscroll={handleScroll('trend')}>
            <!-- Aggregate trend card -->
            <div class={chartCardCls} data-card>
              <div class="flex items-start justify-between mb-3">
                <h3 class="text-sm font-semibold text-white/60">Gesamt · Schillerkiez</h3>
                {@render plrMiniMap('all')}
              </div>
              <svg viewBox="0 0 400 270" class="w-full" role="img" aria-label="Bevölkerungsentwicklung Gesamt">
                {#each gridLines as gl}
                  <line x1={chartL} y1={toY(gl)} x2={chartR} y2={toY(gl)} stroke="rgba(255,255,255,0.15)" stroke-width="1" />
                  <text x={chartL - 4} y={toY(gl) + 4} text-anchor="end" fill="rgba(255,255,255,0.5)" font-size="9">{fmt(Math.round(gl))}</text>
                {/each}
                <line x1={chartL} y1={chartB} x2={chartR} y2={chartB} stroke="rgba(255,255,255,0.2)" stroke-width="1" />
                {#each trend as t}
                  <text x={toX(t.date)} y={chartB + 16} text-anchor="middle" fill="rgba(255,255,255,0.6)" font-size="10">{formatPeriod(t.period)}</text>
                {/each}
                <polyline points={aggPoints} fill="none" stroke={COLORS.teal} stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
                {#each trend as t}
                  <circle cx={toX(t.date)} cy={toY(t.population)} r="3.5" fill={COLORS.teal} />
                {/each}
                {#if trend.length > 0}
                  {@const latest = trend[trend.length - 1]}
                  <text x={toX(latest.date)} y={toY(latest.population) - 10} text-anchor="middle" fill={COLORS.teal} font-size="11" font-weight="600">{fmt(latest.population)}</text>
                {/if}
              </svg>
            </div>

            <!-- Per-PLR trend card -->
            {#if plrTrend.length > 0}
              {@const plrCodes = [...new Set(plrTrend.map(d => d.plr_code))]}
              {@const allPlrPops = plrTrend.map(d => d.population)}
              {@const plrYMinRaw = Math.min(...allPlrPops)}
              {@const plrYMaxRaw = Math.max(...allPlrPops)}
              {@const plrYPad = (plrYMaxRaw - plrYMinRaw) * 0.08 || 200}
              {@const plrYMin = plrYMinRaw - plrYPad}
              {@const plrYMax = plrYMaxRaw + plrYPad}
              {@const plrYRange = plrYMax - plrYMin || 1}
              {@const plrToY = (/** @type {number} */ pop) => chartB - ((pop - plrYMin) / plrYRange) * chartH}
              {@const plrGridLines = Array.from({ length: 5 }, (_, i) => plrYMin + ((plrYMax - plrYMin) / 4) * i)}
              <div class={chartCardCls} data-card>
                <div class="flex items-start justify-between mb-3">
                  <h3 class="text-sm font-semibold text-white/60">Nach Planungsraum</h3>
                  {@render plrMiniMap('all')}
                </div>
                <svg viewBox="0 0 400 270" class="w-full" role="img" aria-label="Bevölkerungsentwicklung nach PLR">
                  {#each plrGridLines as gl}
                    <line x1={chartL} y1={plrToY(gl)} x2={chartR} y2={plrToY(gl)} stroke="rgba(255,255,255,0.15)" stroke-width="1" />
                    <text x={chartL - 4} y={plrToY(gl) + 4} text-anchor="end" fill="rgba(255,255,255,0.5)" font-size="9">{fmt(Math.round(gl))}</text>
                  {/each}
                  <line x1={chartL} y1={chartB} x2={chartR} y2={chartB} stroke="rgba(255,255,255,0.2)" stroke-width="1" />
                  {#each trend as t}
                    <text x={toX(t.date)} y={chartB + 16} text-anchor="middle" fill="rgba(255,255,255,0.6)" font-size="10">{formatPeriod(t.period)}</text>
                  {/each}
                  {#each plrCodes as code, ci}
                    {@const pts = plrTrend.filter(d => d.plr_code === code)}
                    {@const linePoints = pts.map(p => `${toX(p.date)},${plrToY(p.population)}`).join(' ')}
                    <polyline points={linePoints} fill="none" stroke={PLR_LINE_COLORS[ci % PLR_LINE_COLORS.length]} stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
                    {#each pts as p}
                      <circle cx={toX(p.date)} cy={plrToY(p.population)} r="2.5" fill={PLR_LINE_COLORS[ci % PLR_LINE_COLORS.length]} />
                    {/each}
                  {/each}
                </svg>
                <div class="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                  {#each plrCodes as code, ci}
                    {@const name = plrTrend.find(d => d.plr_code === code)?.plr_name ?? code}
                    <div class="flex items-center gap-1.5 text-xs text-white/70">
                      <span class="w-3 h-0.5 rounded-full shrink-0" style="background: {PLR_LINE_COLORS[ci % PLR_LINE_COLORS.length]}"></span>
                      {shortName(name)}
                    </div>
                  {/each}
                </div>
              </div>
            {/if}

            <!-- Migration diversity trend (multi-line chart) -->
            {#if trend.length >= 2}
              {@const migData = trend.map(t => {
                const fn = t.foreignNationals ?? 0;
                const gm = t.germanWithMigBg ?? 0;
                const wm = t.withoutMigBg ?? 0;
                const pop = t.population || 1;
                return { x: toX(t.date), f: fn / pop * 100, g: gm / pop * 100, w: wm / pop * 100 };
              })}
              {@const allPcts = migData.flatMap(d => [d.f, d.g, d.w])}
              {@const mPctMin = Math.floor(Math.min(...allPcts) / 5) * 5}
              {@const mPctMax = Math.ceil(Math.max(...allPcts) / 5) * 5}
              {@const mPctRange = mPctMax - mPctMin || 1}
              {@const mToY = (/** @type {number} */ p) => chartB - ((p - mPctMin) / mPctRange) * chartH}
              {@const mGridStep = mPctRange <= 20 ? 5 : 10}
              {@const mGridLines = Array.from({ length: Math.floor(mPctRange / mGridStep) + 1 }, (_, i) => mPctMin + i * mGridStep)}
              {@const migLines = [
                { key: 'w', label: 'Ohne MH', color: MIGRATION_COLORS[2] },
                { key: 'f', label: 'Ausländer', color: MIGRATION_COLORS[0] },
                { key: 'g', label: 'Deutsche mit MH', color: MIGRATION_COLORS[1] },
              ]}
              {@const latestMig = migData[migData.length - 1]}
              <div class={chartCardCls} data-card>
                <div class="flex items-start justify-between mb-3">
                  <h3 class="text-sm font-semibold text-white/60">Vielfalt im Zeitverlauf</h3>
                  {@render plrMiniMap('all')}
                </div>
                <svg viewBox="0 0 400 270" class="w-full" role="img" aria-label="Vielfalt im Zeitverlauf">
                  {#each mGridLines as gl}
                    <line x1={chartL} y1={mToY(gl)} x2={chartR} y2={mToY(gl)} stroke="rgba(255,255,255,0.15)" stroke-width="1" />
                    <text x={chartL - 4} y={mToY(gl) + 4} text-anchor="end" fill="rgba(255,255,255,0.5)" font-size="9">{gl}%</text>
                  {/each}
                  <line x1={chartL} y1={chartB} x2={chartR} y2={chartB} stroke="rgba(255,255,255,0.2)" stroke-width="1" />
                  {#each trend as t}
                    <text x={toX(t.date)} y={chartB + 16} text-anchor="middle" fill="rgba(255,255,255,0.6)" font-size="10">{formatPeriod(t.period)}</text>
                  {/each}
                  {#each migLines as line}
                    {@const pts = migData.map(d => `${d.x},${mToY(d[line.key])}`).join(' ')}
                    <polyline points={pts} fill="none" stroke={line.color} stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
                    {#each migData as d}
                      <circle cx={d.x} cy={mToY(d[line.key])} r="3" fill={line.color} />
                    {/each}
                  {/each}
                </svg>
                <div class="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                  {#each migLines as line}
                    <div class="flex items-center gap-1.5 text-xs text-white/70">
                      <span class="w-3 h-0.5 rounded-full shrink-0" style="background: {line.color}"></span>
                      {line.label} ({latestMig[line.key].toFixed(1)}%)
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
          {#if canScroll.trend.right}
            <button class="{arrowCls} -right-1 lg:-right-5" onclick={() => scrollCarousel(trendScroll, 1)} aria-label="Weiter">
              <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>
            </button>
          {/if}
        </div>
      </div>
    {/if}

    <!-- Social Trend Carousel -->
    {#if data.socialTrend && data.socialTrend.length >= 2}
      {@const sTrend = data.socialTrend}
      {@const plrST = data.plrSocialTrend ?? []}
      {@const sTimestamps = sTrend.map(t => new Date(t.date).getTime())}
      {@const sTMin = Math.min(...sTimestamps)}
      {@const sTMax = Math.max(...sTimestamps)}
      {@const sTRange = sTMax - sTMin || 1}
      {@const sChartL = 55}
      {@const sChartR = 385}
      {@const sChartT = 20}
      {@const sChartB = 230}
      {@const sChartW = sChartR - sChartL}
      {@const sChartH = sChartB - sChartT}
      {@const sToX = (/** @type {string} */ date) => sChartL + ((new Date(date).getTime() - sTMin) / sTRange) * sChartW}
      {@const latestS = sTrend[sTrend.length - 1]}
      {@const socialPeriods = sTrend.map(t => t.period)}
      {@const mergedPlrSeries = mergeSocialPlrTrend(plrST, socialPeriods)}
      {@const indicatorCards = [
        { key: 'unemploymentRate', label: 'Arbeitslosenquote', color: COLORS.teal },
        { key: 'childPovertyRate', label: 'Kinderarmut U15', color: COLORS.wine },
        { key: 'transferBenefitRate', label: 'Transferleistungen', color: COLORS.yellow },
      ]}
      {@const allVals = sTrend.flatMap(t => [t.unemploymentRate, t.childPovertyRate, t.transferBenefitRate])}
      {@const sDataMax = Math.max(...allVals)}
      {@const sYMax = Math.ceil(sDataMax / 5) * 5 + 5}
      {@const sYRange = sYMax || 1}
      {@const sToY = (/** @type {number} */ v) => sChartB - (v / sYRange) * sChartH}
      {@const sGridStep = sYMax <= 30 ? 5 : 10}
      {@const sGridLines = Array.from({ length: Math.floor(sYMax / sGridStep) + 1 }, (_, i) => i * sGridStep)}
      <div use:reveal class="transition-all duration-700 ease-out">
        <h2 class="text-lg font-bold text-[#e8e6e1] font-['Space_Grotesk',sans-serif] mb-3">Soziale Entwicklung</h2>
        <div class="relative">
          {#if canScroll.socialTrend.left}
            <button class="{arrowCls} -left-1 lg:-left-5" onclick={() => scrollCarousel(socialTrendScroll, -1)} aria-label="Zurück">
              <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>
            </button>
          {/if}
          <div class={chartScrollCls} bind:this={socialTrendScroll} onscroll={handleScroll('socialTrend')}>
            <!-- Card 1: Gesamt — all 3 indicators -->
            <div class={chartCardCls} data-card>
              <div class="flex items-start justify-between mb-3">
                <h3 class="text-sm font-semibold text-white/60">Gesamt · Schillerkiez</h3>
                {@render plrMiniMap('all')}
              </div>
              <svg viewBox="0 0 400 270" class="w-full" role="img" aria-label="Soziale Entwicklung Gesamt">
                {#each sGridLines as gl}
                  <line x1={sChartL} y1={sToY(gl)} x2={sChartR} y2={sToY(gl)} stroke="rgba(255,255,255,0.15)" stroke-width="1" />
                  <text x={sChartL - 4} y={sToY(gl) + 4} text-anchor="end" fill="rgba(255,255,255,0.5)" font-size="9">{gl}%</text>
                {/each}
                <line x1={sChartL} y1={sChartB} x2={sChartR} y2={sChartB} stroke="rgba(255,255,255,0.2)" stroke-width="1" />
                {#each sTrend as t}
                  <text x={sToX(t.date)} y={sChartB + 16} text-anchor="middle" fill="rgba(255,255,255,0.6)" font-size="10">{formatSocialPeriod(t.period)}</text>
                {/each}
                {#each indicatorCards as line}
                  {@const pts = sTrend.map(d => `${sToX(d.date)},${sToY(d[line.key])}`).join(' ')}
                  <polyline points={pts} fill="none" stroke={line.color} stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
                  {#each sTrend as d}
                    <circle cx={sToX(d.date)} cy={sToY(d[line.key])} r="3" fill={line.color} />
                  {/each}
                {/each}
              </svg>
              <div class="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                {#each indicatorCards as line}
                  <div class="flex items-center gap-1.5 text-xs text-white/70">
                    <span class="w-3 h-0.5 rounded-full shrink-0" style="background: {line.color}"></span>
                    {line.label} ({latestS[line.key]}%)
                  </div>
                {/each}
              </div>
            </div>

            <!-- Cards 2–4: Per-indicator with aggregate + merged PLR lines -->
            {#each indicatorCards as ind}
              {@const aggVals = sTrend.map(t => t[ind.key])}
              {@const plrVals = mergedPlrSeries.flatMap(s => s.points.map(p => p[ind.key]))}
              {@const iAllVals = [...aggVals, ...plrVals]}
              {@const iDataMax = Math.max(...iAllVals)}
              {@const iYMax = Math.ceil(iDataMax / 5) * 5 + 5}
              {@const iYRange = iYMax || 1}
              {@const iToY = (/** @type {number} */ v) => sChartB - (v / iYRange) * sChartH}
              {@const iGridStep = iYMax <= 30 ? 5 : 10}
              {@const iGridLines = Array.from({ length: Math.floor(iYMax / iGridStep) + 1 }, (_, i) => i * iGridStep)}
              {@const aggPts = sTrend.map(d => `${sToX(d.date)},${iToY(d[ind.key])}`).join(' ')}
              <div class={chartCardCls} data-card>
                <div class="flex items-start justify-between mb-3">
                  <h3 class="text-sm font-semibold text-white/60">{ind.label}</h3>
                  {@render plrMiniMap('all')}
                </div>
                <svg viewBox="0 0 400 270" class="w-full" role="img" aria-label="{ind.label} Entwicklung">
                  {#each iGridLines as gl}
                    <line x1={sChartL} y1={iToY(gl)} x2={sChartR} y2={iToY(gl)} stroke="rgba(255,255,255,0.15)" stroke-width="1" />
                    <text x={sChartL - 4} y={iToY(gl) + 4} text-anchor="end" fill="rgba(255,255,255,0.5)" font-size="9">{gl}%</text>
                  {/each}
                  <line x1={sChartL} y1={sChartB} x2={sChartR} y2={sChartB} stroke="rgba(255,255,255,0.2)" stroke-width="1" />
                  {#each sTrend as t}
                    <text x={sToX(t.date)} y={sChartB + 16} text-anchor="middle" fill="rgba(255,255,255,0.6)" font-size="10">{formatSocialPeriod(t.period)}</text>
                  {/each}
                  <!-- Merged PLR lines (thin, continuous across LOR boundary) -->
                  {#each mergedPlrSeries as series, ci}
                    {@const linePts = series.points.map(p => `${sToX(p.date)},${iToY(p[ind.key])}`).join(' ')}
                    <polyline points={linePts} fill="none" stroke={PLR_LINE_COLORS[ci % PLR_LINE_COLORS.length]} stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" opacity="0.5" />
                    {#each series.points as p}
                      <circle cx={sToX(p.date)} cy={iToY(p[ind.key])} r="2" fill={PLR_LINE_COLORS[ci % PLR_LINE_COLORS.length]} opacity="0.5" />
                    {/each}
                  {/each}
                  <!-- Aggregate line (thick, on top) -->
                  <polyline points={aggPts} fill="none" stroke={ind.color} stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
                  {#each sTrend as d}
                    <circle cx={sToX(d.date)} cy={iToY(d[ind.key])} r="3" fill={ind.color} />
                  {/each}
                </svg>
                <div class="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                  <div class="flex items-center gap-1.5 text-xs text-white/70">
                    <span class="w-3 h-0.5 rounded-full shrink-0" style="background: {ind.color}"></span>
                    Gesamt ({latestS[ind.key]}%)
                  </div>
                  {#each mergedPlrSeries as series, ci}
                    <div class="flex items-center gap-1.5 text-xs text-white/40">
                      <span class="w-3 h-0.5 rounded-full shrink-0 opacity-50" style="background: {PLR_LINE_COLORS[ci % PLR_LINE_COLORS.length]}"></span>
                      {shortName(series.name)}
                    </div>
                  {/each}
                </div>
              </div>
            {/each}
          </div>
          {#if canScroll.socialTrend.right}
            <button class="{arrowCls} -right-1 lg:-right-5" onclick={() => scrollCarousel(socialTrendScroll, 1)} aria-label="Weiter">
              <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>
            </button>
          {/if}
        </div>
        <p class="text-xs text-white/40 mt-2 italic">Ab 2021 neue Gebietseinteilung: Schillerpromenade vereint Nord + Süd, Silbersteinstr. vereint Wartheplatz + Silbersteinstr.</p>
      </div>
    {/if}

    <!-- Footer / Sources -->
    <div use:reveal class="rounded-xl p-6 text-sm text-white/60 space-y-2 border border-transparent transition-all duration-300 hover:bg-white/[0.06] hover:backdrop-blur-md hover:border-white/[0.15] hover:border-t-white/30 hover:border-l-white/25 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
      <p>
        <strong>Quellen:</strong> Amt für Statistik Berlin-Brandenburg (Demografie, halbjährlich) · Monitoring Soziale Stadtentwicklung Berlin (Sozialindex, alle 2 Jahre, 2013–2023)
      </p>
      <p>
        <strong>Lizenz:</strong>
        <a href="https://creativecommons.org/licenses/by/3.0/de/" target="_blank" rel="noopener" class="text-[#5cb87a] hover:underline">
          CC BY 3.0 DE
        </a>
      </p>
      {#if airData}
        <p>
          <strong>Luftdaten:</strong>
          <a href="https://luftdaten.berlin.de/station/mc042" target="_blank" rel="noopener"
             class="text-[#5cb87a] hover:underline">Berliner Luftgüte-Messnetz (BLUME)</a>, Station MC042 Nansenstraße
        </p>
      {/if}
      <p class="text-xs text-white/40">
        Die Daten beziehen sich auf den Schillerkiez (4 Planungsräume im LOR-System 2021):
        Schillerpromenade Nord, Schillerpromenade Süd, Wartheplatz und Silbersteinstraße.
      </p>
      <hr class="border-gray-300/50 my-2" />
      <p class="text-xs text-white/40 italic">
        <strong class="font-semibold">Gebietsreform 2021:</strong> Vor 2021 bestand der Schillerkiez aus 2 Planungsräumen (Schillerpromenade, Silbersteinstraße). Ab 2021 wurden diese in 4 aufgeteilt. In den Trendcharts werden die alten Gebiete mit den neuen zusammengeführt, um durchgängige Linien zu ermöglichen.
      </p>
      <hr class="border-gray-300/50 my-2" />
      <p class="text-xs text-white/40 italic">
        (*) <strong class="font-semibold">Status-Index:</strong> Zusammengesetzter Wert aus Arbeitslosigkeit, Kinderarmut und Transferleistungen — je niedriger, desto besser die soziale Lage.
        <strong class="font-semibold">Dynamik-Index:</strong> Zeigt die Entwicklung über die Zeit — positiv = Verbesserung, negativ = Verschlechterung, 0 = stabil.
      </p>
      <hr class="border-gray-300/50 my-2" />
    </div>
  {/if}
</div>

<style>
  .reveal-hidden {
    opacity: 0;
    transform: translateY(2rem);
  }
  .revealed {
    opacity: 1;
    transform: translateY(0);
  }
</style>
