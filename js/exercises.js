// Wbudowana baza ćwiczeń. Identyfikatory są stałe, bo odwołują się do nich zapisane treningi.

export const MUSCLES = [
  'Klatka', 'Plecy', 'Barki', 'Biceps', 'Triceps', 'Przedramiona',
  'Czworogłowe', 'Dwugłowe uda', 'Pośladki', 'Łydki', 'Brzuch', 'Całe ciało',
];

export const EQUIPMENT = ['Sztanga', 'Hantle', 'Maszyna', 'Wyciąg', 'Masa ciała', 'Kettlebell', 'Inne'];

export const TYPES = [
  { id: 'weight', label: 'Ciężar i powtórzenia' },
  { id: 'bodyweight', label: 'Masa ciała: powtórzenia, opcjonalne dociążenie' },
  { id: 'time', label: 'Czas' },
];

const row = (id, name, muscle, equipment, type = 'weight') => ({ id, name, muscle, equipment, type });

export const SEED_EXERCISES = [
  // Klatka
  row('bench-press', 'Wyciskanie sztangi na ławce płaskiej', 'Klatka', 'Sztanga'),
  row('incline-bench', 'Wyciskanie sztangi na ławce skośnej', 'Klatka', 'Sztanga'),
  row('decline-bench', 'Wyciskanie sztangi na ławce ujemnej', 'Klatka', 'Sztanga'),
  row('db-bench', 'Wyciskanie hantli na ławce płaskiej', 'Klatka', 'Hantle'),
  row('db-incline', 'Wyciskanie hantli na ławce skośnej', 'Klatka', 'Hantle'),
  row('db-fly', 'Rozpiętki z hantlami', 'Klatka', 'Hantle'),
  row('machine-press', 'Wyciskanie na maszynie', 'Klatka', 'Maszyna'),
  row('pec-deck', 'Rozpiętki na maszynie', 'Klatka', 'Maszyna'),
  row('cable-fly', 'Krzyżowanie linek wyciągu', 'Klatka', 'Wyciąg'),
  row('push-up', 'Pompki', 'Klatka', 'Masa ciała', 'bodyweight'),
  row('chest-dip', 'Pompki na poręczach', 'Klatka', 'Masa ciała', 'bodyweight'),

  // Plecy
  row('deadlift', 'Martwy ciąg', 'Plecy', 'Sztanga'),
  row('barbell-row', 'Wiosłowanie sztangą', 'Plecy', 'Sztanga'),
  row('t-bar-row', 'Wiosłowanie T-sztangą', 'Plecy', 'Sztanga'),
  row('db-row', 'Wiosłowanie hantlem', 'Plecy', 'Hantle'),
  row('pull-up', 'Podciąganie nachwytem', 'Plecy', 'Masa ciała', 'bodyweight'),
  row('chin-up', 'Podciąganie podchwytem', 'Plecy', 'Masa ciała', 'bodyweight'),
  row('lat-pulldown', 'Ściąganie drążka wyciągu do klatki', 'Plecy', 'Wyciąg'),
  row('close-pulldown', 'Ściąganie wąskim uchwytem', 'Plecy', 'Wyciąg'),
  row('cable-row', 'Wiosłowanie na wyciągu siedząc', 'Plecy', 'Wyciąg'),
  row('straight-pulldown', 'Ściąganie linki prostymi rękami', 'Plecy', 'Wyciąg'),
  row('machine-row', 'Wiosłowanie na maszynie', 'Plecy', 'Maszyna'),
  row('back-extension', 'Wyprosty tułowia na ławce rzymskiej', 'Plecy', 'Masa ciała', 'bodyweight'),
  row('barbell-shrug', 'Szrugsy ze sztangą', 'Plecy', 'Sztanga'),
  row('db-shrug', 'Szrugsy z hantlami', 'Plecy', 'Hantle'),

  // Barki
  row('ohp', 'Wyciskanie żołnierskie', 'Barki', 'Sztanga'),
  row('db-shoulder-press', 'Wyciskanie hantli nad głowę', 'Barki', 'Hantle'),
  row('machine-shoulder', 'Wyciskanie nad głowę na maszynie', 'Barki', 'Maszyna'),
  row('lateral-raise', 'Unoszenie hantli bokiem', 'Barki', 'Hantle'),
  row('cable-lateral', 'Unoszenie linki bokiem', 'Barki', 'Wyciąg'),
  row('machine-lateral', 'Unoszenie bokiem na maszynie', 'Barki', 'Maszyna'),
  row('front-raise', 'Unoszenie hantli przodem', 'Barki', 'Hantle'),
  row('rear-delt-fly', 'Odwrotne rozpiętki z hantlami', 'Barki', 'Hantle'),
  row('reverse-pec-deck', 'Odwrotne rozpiętki na maszynie', 'Barki', 'Maszyna'),
  row('face-pull', 'Przyciąganie linki do twarzy', 'Barki', 'Wyciąg'),

  // Biceps
  row('barbell-curl', 'Uginanie ramion ze sztangą', 'Biceps', 'Sztanga'),
  row('ez-curl', 'Uginanie ramion ze sztangą łamaną', 'Biceps', 'Sztanga'),
  row('db-curl', 'Uginanie ramion z hantlami', 'Biceps', 'Hantle'),
  row('hammer-curl', 'Uginanie młotkowe', 'Biceps', 'Hantle'),
  row('incline-curl', 'Uginanie z hantlami na ławce skośnej', 'Biceps', 'Hantle'),
  row('preacher-curl', 'Uginanie na modlitewniku', 'Biceps', 'Sztanga'),
  row('cable-curl', 'Uginanie ramion na wyciągu', 'Biceps', 'Wyciąg'),

  // Triceps
  row('close-bench', 'Wyciskanie wąsko na ławce płaskiej', 'Triceps', 'Sztanga'),
  row('skull-crusher', 'Wyciskanie francuskie leżąc', 'Triceps', 'Sztanga'),
  row('overhead-db-ext', 'Wyciskanie francuskie hantlem', 'Triceps', 'Hantle'),
  row('pushdown', 'Prostowanie ramion na wyciągu', 'Triceps', 'Wyciąg'),
  row('rope-pushdown', 'Prostowanie ramion z liną', 'Triceps', 'Wyciąg'),
  row('overhead-cable-ext', 'Prostowanie ramion nad głową na wyciągu', 'Triceps', 'Wyciąg'),
  row('triceps-dip', 'Pompki na poręczach na triceps', 'Triceps', 'Masa ciała', 'bodyweight'),
  row('bench-dip', 'Pompki w podporze tyłem', 'Triceps', 'Masa ciała', 'bodyweight'),

  // Przedramiona
  row('wrist-curl', 'Uginanie nadgarstków', 'Przedramiona', 'Hantle'),
  row('reverse-curl', 'Uginanie ramion nachwytem', 'Przedramiona', 'Sztanga'),
  row('farmer-walk', 'Spacer farmera', 'Przedramiona', 'Hantle', 'time'),

  // Czworogłowe
  row('squat', 'Przysiad ze sztangą', 'Czworogłowe', 'Sztanga'),
  row('front-squat', 'Przysiad przedni', 'Czworogłowe', 'Sztanga'),
  row('goblet-squat', 'Przysiad goblet', 'Czworogłowe', 'Kettlebell'),
  row('hack-squat', 'Przysiad na maszynie hack', 'Czworogłowe', 'Maszyna'),
  row('leg-press', 'Wypychanie nogami na suwnicy', 'Czworogłowe', 'Maszyna'),
  row('leg-extension', 'Prostowanie nóg na maszynie', 'Czworogłowe', 'Maszyna'),
  row('bulgarian-squat', 'Przysiad bułgarski', 'Czworogłowe', 'Hantle'),
  row('lunge', 'Wykroki z hantlami', 'Czworogłowe', 'Hantle'),
  row('step-up', 'Wejścia na skrzynię', 'Czworogłowe', 'Hantle'),

  // Dwugłowe uda
  row('romanian-deadlift', 'Martwy ciąg na prostych nogach', 'Dwugłowe uda', 'Sztanga'),
  row('db-romanian', 'Martwy ciąg z hantlami', 'Dwugłowe uda', 'Hantle'),
  row('leg-curl-lying', 'Uginanie nóg leżąc', 'Dwugłowe uda', 'Maszyna'),
  row('leg-curl-seated', 'Uginanie nóg siedząc', 'Dwugłowe uda', 'Maszyna'),
  row('good-morning', 'Dzień dobry ze sztangą', 'Dwugłowe uda', 'Sztanga'),

  // Pośladki
  row('hip-thrust', 'Wypychanie bioder ze sztangą', 'Pośladki', 'Sztanga'),
  row('glute-bridge', 'Mostek biodrowy', 'Pośladki', 'Masa ciała', 'bodyweight'),
  row('hip-abduction', 'Odwodzenie nóg na maszynie', 'Pośladki', 'Maszyna'),
  row('cable-kickback', 'Wykopy nogą na wyciągu', 'Pośladki', 'Wyciąg'),

  // Łydki
  row('calf-standing', 'Wspięcia na palce stojąc', 'Łydki', 'Maszyna'),
  row('calf-seated', 'Wspięcia na palce siedząc', 'Łydki', 'Maszyna'),
  row('calf-press', 'Wspięcia na palce na suwnicy', 'Łydki', 'Maszyna'),

  // Brzuch
  row('crunch', 'Spięcia brzucha', 'Brzuch', 'Masa ciała', 'bodyweight'),
  row('cable-crunch', 'Spięcia brzucha na wyciągu', 'Brzuch', 'Wyciąg'),
  row('hanging-leg-raise', 'Unoszenie nóg w zwisie', 'Brzuch', 'Masa ciała', 'bodyweight'),
  row('lying-leg-raise', 'Unoszenie nóg leżąc', 'Brzuch', 'Masa ciała', 'bodyweight'),
  row('russian-twist', 'Rosyjski skręt', 'Brzuch', 'Masa ciała', 'bodyweight'),
  row('plank', 'Deska', 'Brzuch', 'Masa ciała', 'time'),
  row('side-plank', 'Deska boczna', 'Brzuch', 'Masa ciała', 'time'),

  // Całe ciało
  row('kb-swing', 'Swing z kettlebell', 'Całe ciało', 'Kettlebell'),
  row('clean-press', 'Zarzut i wyciskanie', 'Całe ciało', 'Sztanga'),
  row('burpee', 'Burpee', 'Całe ciało', 'Masa ciała', 'bodyweight'),
];
