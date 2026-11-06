// Orientacyjne normy siły dla mężczyzny ważącego 80 kg. Liczba to szacowany ciężar maksymalny jako wielokrotność
// masy ciała, który daje najwyższy poziom partii. Wyciskanie 2×, przysiad 3× i martwy ciąg 3,45× to 95. percentyl
// zawodników bez sprzętu z danych OpenPowerlifting (https://www.openpowerlifting.org), policzony w tools/opl-norms.mjs.
// Pozostałe liczby to szacunki tej aplikacji.
// Przy dwóch hantlach chodzi o ich sumę. Ćwiczeń, w których ciężar nie mówi o sile, tu nie ma,
// np. wspomaganego podciągania, gdzie większy ciężar oznacza łatwiejsze ćwiczenie.

export const STRENGTH_TOPS = {
  // Klatka
  'bench-press': 2, 'decline-bench': 2, 'wide-bench': 2, 'incline-bench': 1.7, 'guillotine-bench': 1.7,
  'db-bench': 1.6, 'db-decline': 1.6, 'db-hammer-press': 1.6, 'db-incline': 1.4, 'db-one-arm-bench': 0.8,
  'machine-press': 1.8, 'smith-bench': 1.8, 'machine-decline-press': 1.8, 'smith-incline': 1.6, 'machine-incline-press': 1.6,
  'cable-chest-press': 1.2, 'pec-deck': 1.3, 'db-fly': 0.8, 'db-incline-fly': 0.8,
  'cable-fly': 0.7, 'cable-incline-fly': 0.7, 'cable-low-fly': 0.7, 'db-pullover': 0.6,

  // Plecy
  deadlift: 3.45, 'rack-pull': 3.7, 'db-deadlift': 2.3,
  'barbell-row': 1.5, 'pendlay-row': 1.5, 'reverse-barbell-row': 1.5, 't-bar-row': 1.5, 'barbell-incline-row': 1.2,
  'db-row': 0.8, 'db-bent-row': 1.3, 'db-incline-row': 1.3,
  'lat-pulldown': 1.5, 'close-pulldown': 1.5, 'underhand-pulldown': 1.5, 'machine-pulldown': 1.5,
  'cable-row': 1.5, 'wide-cable-row': 1.5, 'machine-row': 1.5, 'machine-narrow-row': 1.5, 'machine-high-row': 1.5, 'smith-row': 1.5,
  'machine-high-row-single': 0.8, 'machine-one-arm-row': 0.8,
  'straight-pulldown': 0.7, 'rope-straight-pulldown': 0.7, 'barbell-pullover': 0.8, 'machine-pullover': 1.1,
  'barbell-shrug': 2, 'smith-shrug': 2, 'machine-shrug': 2, 'db-shrug': 1.6, 'machine-back-extension': 1.2,
  'pull-up': 2, 'wide-pull-up': 2, 'chin-up': 2.1,

  // Barki
  ohp: 1.35, 'seated-ohp': 1.35, 'smith-shoulder': 1.4, 'machine-shoulder': 1.4, 'cable-shoulder-press': 1,
  'db-shoulder-press': 1.1, 'arnold-press': 1.1, 'db-push-press': 1.3, 'one-arm-db-press': 0.55, 'machine-one-arm-shoulder': 0.7,
  'lateral-raise': 0.6, 'seated-lateral': 0.6, 'front-raise': 0.6, 'db-seated-front': 0.6, 'lateral-to-front': 0.6,
  'rear-delt-fly': 0.6, 'incline-rear-fly': 0.6, 'db-lying-rear': 0.6, 'one-arm-lateral': 0.3,
  'cable-lateral': 0.45, 'cable-front-raise': 0.45, 'cable-rear-fly': 0.45, 'machine-lateral': 0.8, 'reverse-pec-deck': 1, 'face-pull': 0.8,
  'barbell-upright-row': 0.9, 'cable-upright-row': 0.9, 'db-upright-row': 0.7, 'barbell-front-raise': 0.6, 'plate-front-raise': 0.45,
  'barbell-rear-delt-row': 1, 'db-rear-delt-row': 0.9, 'external-rotation': 0.15,

  // Biceps
  'barbell-curl': 0.9, 'ez-curl': 0.9, 'wide-curl': 0.8, 'drag-curl': 0.8, 'db-curl': 0.75, 'db-alternate-curl': 0.75, 'db-seated-curl': 0.75,
  'hammer-curl': 0.85, 'cross-body-hammer': 0.75, 'zottman-curl': 0.7, 'incline-curl': 0.6, 'incline-hammer': 0.65, 'db-preacher': 0.6,
  'concentration-curl': 0.35, 'preacher-curl': 0.75, 'ez-preacher': 0.75, 'spider-curl': 0.65,
  'cable-curl': 0.9, 'cable-hammer-curl': 0.9, 'machine-curl': 1, 'machine-preacher': 0.9,

  // Triceps
  'close-bench': 1.6, 'smith-close-bench': 1.6, 'ez-close-bench': 1.4, 'incline-close-bench': 1.3, 'jm-press': 1.2,
  'skull-crusher': 0.9, 'ez-lying-ext': 0.9, 'barbell-overhead-ext': 0.8, 'ez-overhead-ext': 0.8, 'barbell-seated-ext': 0.8,
  'overhead-db-ext': 0.6, 'db-standing-ext': 0.6, 'db-lying-ext': 0.7, 'db-incline-ext': 0.6, 'db-kickback': 0.2, 'db-two-arm-kickback': 0.4,
  pushdown: 1.1, 'vbar-pushdown': 1.1, 'rope-pushdown': 0.9, 'reverse-pushdown': 0.7, 'overhead-cable-ext': 0.9, 'rope-overhead-ext': 0.8,
  'one-arm-pushdown': 0.45, 'cable-kickback-triceps': 0.3, 'machine-triceps': 1.2, 'machine-dip': 1.8, 'machine-overhand-dip': 1.6,

  // Przedramiona
  'wrist-curl': 0.6, 'barbell-wrist-curl': 0.9, 'barbell-reverse-wrist': 0.5, 'db-reverse-wrist': 0.35, 'reverse-curl': 0.7, 'ez-reverse-curl': 0.75,

  // Czworogłowe
  squat: 3, 'barbell-box-squat': 3, 'barbell-wide-squat': 3, 'smith-squat': 3, 'front-squat': 2.4, 'barbell-hack': 2.4, 'zercher-squat': 2.3,
  'leg-press': 4.5, 'leg-press-wide': 4.5, 'leg-press-single': 2.2, 'hack-squat': 3.2, 'hack-close': 3, 'leg-extension': 1.4,
  'goblet-squat': 0.9, 'db-squat': 1.4, 'bulgarian-squat': 1, 'barbell-bulgarian': 1.2, lunge: 1.2, 'reverse-lunge': 1.2,
  'barbell-lunge': 1.4, 'barbell-forward-lunge': 1.4, 'step-up': 1, 'barbell-step-up': 1.2,

  // Dwugłowe uda
  'romanian-deadlift': 2.4, 'barbell-stiff-deadlift': 2.4, 'good-morning': 1.3, 'db-romanian': 1.9, 'db-stiff-deadlift': 1.9, 'single-leg-deadlift': 0.7,
  'leg-curl-lying': 1.1, 'leg-curl-seated': 1.2, 'leg-curl-alternate': 1, 'leg-curl-kneeling': 0.6, 'db-leg-curl': 0.5,

  // Pośladki
  'hip-thrust': 3, 'barbell-glute-bridge': 2.5, 'sumo-deadlift': 3.45, 'hip-abduction': 1.8, 'hip-adduction': 1.8,
  'cable-kickback': 0.6, 'cable-adduction': 0.6, 'machine-hip-extension': 1.5, 'reverse-hyper': 1, 'barbell-lateral-lunge': 1,

  // Łydki
  'calf-standing': 3, 'calf-hack': 3, 'calf-donkey': 3, 'calf-press': 4, 'calf-machine-press': 4, 'calf-seated': 2,
  'calf-barbell': 2.5, 'calf-barbell-seated': 1.6, 'calf-db': 1.6, 'calf-db-seated': 1.2, 'calf-db-single': 0.8,

  // Brzuch
  'cable-crunch': 1.4, 'machine-crunch': 1.6, 'machine-twist': 1.2, 'db-side-bend': 0.8, 'cable-side-bend': 0.9, 'cable-reverse-crunch': 1,
};

/** Ćwiczenia wielostawowe, które mówią też o sile innych partii, z normą dla tej partii. */
export const STRENGTH_ALSO = {
  squat: { Pośladki: 3, 'Dwugłowe uda': 3.6 },
  'barbell-box-squat': { Pośladki: 3, 'Dwugłowe uda': 3.6 },
  'barbell-wide-squat': { Pośladki: 3, 'Dwugłowe uda': 3.6 },
  'front-squat': { Pośladki: 2.9, 'Dwugłowe uda': 3.5 },
  deadlift: { 'Dwugłowe uda': 3.45, Pośladki: 3.45 },
  'sumo-deadlift': { 'Dwugłowe uda': 3.45 },
  'romanian-deadlift': { Pośladki: 2.6 },
  'barbell-stiff-deadlift': { Pośladki: 2.6 },
};

/** Ćwiczenia z hantlami, w których wpisany ciężar to jeden hantel, a nie para. */
export const ONE_DUMBBELL = new Set([
  'db-one-arm-bench', 'db-pullover', 'db-row', 'one-arm-db-press', 'one-arm-lateral', 'external-rotation', 'concentration-curl',
  'overhead-db-ext', 'db-standing-ext', 'db-kickback', 'goblet-squat', 'single-leg-deadlift', 'db-leg-curl', 'calf-db-single', 'db-side-bend',
]);

/** Odmiany martwego ciągu. W danych zawodników masa ciała pomaga w nich mniej niż w wyciskaniu i przysiadzie. */
export const DEADLIFT_LIKE = new Set(['deadlift', 'rack-pull', 'sumo-deadlift', 'db-deadlift', 'romanian-deadlift', 'barbell-stiff-deadlift', 'db-romanian', 'db-stiff-deadlift']);

/** Ćwiczenia z masą ciała, w których dociążenie dodaje się do całej masy, np. podciąganie. */
export const LIFTS_BODY = new Set(['pull-up', 'wide-pull-up', 'chin-up']);
