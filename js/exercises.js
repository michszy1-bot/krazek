// Wbudowana baza ćwiczeń. Identyfikatory są stałe, bo odwołują się do nich zapisane treningi.
// Partie i sprzęt zostają po polsku jako klucze w danych, a na ekranie pokazują je muscleName i equipmentName.

import { EQUIPMENT_NAMES_EN, EXERCISE_NAMES_EN, MUSCLE_NAMES_EN } from './exercises-en.js';
import { isEnglish, L } from './i18n.js';

/** Nazwa partii do pokazania w bieżącym języku. */
export const muscleName = (muscle) => (isEnglish() ? MUSCLE_NAMES_EN[muscle] ?? muscle : muscle);

/** Nazwa sprzętu do pokazania w bieżącym języku. */
export const equipmentName = (equipment) => (isEnglish() ? EQUIPMENT_NAMES_EN[equipment] ?? equipment : equipment);

export const MUSCLES = [
  'Klatka', 'Plecy', 'Barki', 'Biceps', 'Triceps', 'Przedramiona',
  'Czworogłowe', 'Dwugłowe uda', 'Pośladki', 'Łydki', 'Brzuch', 'Całe ciało',
];

export const EQUIPMENT = ['Sztanga', 'Hantle', 'Maszyna', 'Wyciąg', 'Masa ciała', 'Kettlebell', 'Inne'];

export const TYPES = [
  { id: 'weight', label: L('Ciężar i powtórzenia', 'Weight and reps') },
  { id: 'bodyweight', label: L('Masa ciała: powtórzenia, opcjonalne dociążenie', 'Bodyweight: reps, optional added weight') },
  { id: 'time', label: L('Czas', 'Time') },
];

// Nazwa wbudowanego ćwiczenia idzie za językiem aplikacji, bo przy starcie i tak trafia do bazy od nowa.
const row = (id, name, muscle, equipment, type = 'weight') => ({ id, name: isEnglish() ? EXERCISE_NAMES_EN[id] ?? name : name, muscle, equipment, type });

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
  row('smith-bench', 'Wyciskanie na suwnicy Smitha', 'Klatka', 'Maszyna'),
  row('smith-incline', 'Wyciskanie na skosie na suwnicy Smitha', 'Klatka', 'Maszyna'),
  row('db-pullover', 'Przenoszenie hantla za głowę', 'Klatka', 'Hantle'),
  row('cable-incline-fly', 'Rozpiętki na wyciągu na ławce skośnej', 'Klatka', 'Wyciąg'),
  row('cable-low-fly', 'Krzyżowanie linek od dołu', 'Klatka', 'Wyciąg'),
  row('cable-chest-press', 'Wyciskanie na wyciągu siedząc', 'Klatka', 'Wyciąg'),
  row('db-decline', 'Wyciskanie hantli na ławce ujemnej', 'Klatka', 'Hantle'),
  row('db-incline-fly', 'Rozpiętki z hantlami na ławce skośnej', 'Klatka', 'Hantle'),
  row('db-hammer-press', 'Wyciskanie hantli chwytem neutralnym', 'Klatka', 'Hantle'),
  row('db-one-arm-bench', 'Wyciskanie hantla jednorącz na ławce', 'Klatka', 'Hantle'),
  row('wide-bench', 'Wyciskanie sztangi szerokim chwytem', 'Klatka', 'Sztanga'),
  row('guillotine-bench', 'Wyciskanie sztangi do szyi', 'Klatka', 'Sztanga'),
  row('machine-incline-press', 'Wyciskanie na skosie na maszynie', 'Klatka', 'Maszyna'),
  row('machine-decline-press', 'Wyciskanie w dół na maszynie', 'Klatka', 'Maszyna'),

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
  row('pendlay-row', 'Wiosłowanie Pendlaya', 'Plecy', 'Sztanga'),
  row('rack-pull', 'Martwy ciąg z podwyższenia', 'Plecy', 'Sztanga'),
  row('barbell-pullover', 'Przenoszenie sztangi za głowę', 'Plecy', 'Sztanga'),
  row('inverted-row', 'Podciąganie australijskie', 'Plecy', 'Masa ciała', 'bodyweight'),
  row('wide-pull-up', 'Podciąganie szerokim nachwytem', 'Plecy', 'Masa ciała', 'bodyweight'),
  row('underhand-pulldown', 'Ściąganie drążka podchwytem', 'Plecy', 'Wyciąg'),
  row('rope-straight-pulldown', 'Ściąganie liny prostymi rękami', 'Plecy', 'Wyciąg'),
  row('wide-cable-row', 'Wiosłowanie na wyciągu szerokim uchwytem', 'Plecy', 'Wyciąg'),
  row('machine-pulldown', 'Ściąganie na maszynie', 'Plecy', 'Maszyna'),
  row('machine-pullover', 'Przenoszenie za głowę na maszynie', 'Plecy', 'Maszyna'),
  row('smith-row', 'Wiosłowanie na suwnicy Smitha', 'Plecy', 'Maszyna'),
  row('smith-shrug', 'Szrugsy na suwnicy Smitha', 'Plecy', 'Maszyna'),
  row('db-bent-row', 'Wiosłowanie dwoma hantlami w opadzie', 'Plecy', 'Hantle'),
  row('db-incline-row', 'Wiosłowanie hantlami na ławce skośnej', 'Plecy', 'Hantle'),
  row('db-deadlift', 'Martwy ciąg klasyczny z hantlami', 'Plecy', 'Hantle'),
  row('barbell-incline-row', 'Wiosłowanie sztangą na ławce skośnej', 'Plecy', 'Sztanga'),
  row('reverse-barbell-row', 'Wiosłowanie sztangą podchwytem', 'Plecy', 'Sztanga'),
  row('machine-high-row', 'Wiosłowanie górne iso-lateral na maszynie', 'Plecy', 'Maszyna'),
  row('machine-high-row-single', 'Wiosłowanie górne jednorącz na maszynie', 'Plecy', 'Maszyna'),
  row('machine-narrow-row', 'Wiosłowanie wąskim uchwytem na maszynie', 'Plecy', 'Maszyna'),
  row('machine-one-arm-row', 'Wiosłowanie jednorącz na maszynie', 'Plecy', 'Maszyna'),
  row('machine-shrug', 'Szrugsy na maszynie', 'Plecy', 'Maszyna'),
  row('machine-back-extension', 'Wyprosty tułowia na maszynie', 'Plecy', 'Maszyna'),
  row('machine-assisted-pull-up', 'Podciąganie z odciążeniem na maszynie', 'Plecy', 'Maszyna'),

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
  row('arnold-press', 'Wyciskanie Arnolda', 'Barki', 'Hantle'),
  row('one-arm-db-press', 'Wyciskanie hantla jednorącz nad głowę', 'Barki', 'Hantle'),
  row('db-push-press', 'Podrzut hantli nad głowę', 'Barki', 'Hantle'),
  row('seated-lateral', 'Unoszenie hantli bokiem siedząc', 'Barki', 'Hantle'),
  row('one-arm-lateral', 'Unoszenie hantla bokiem jednorącz', 'Barki', 'Hantle'),
  row('db-upright-row', 'Podciąganie hantli wzdłuż tułowia', 'Barki', 'Hantle'),
  row('incline-rear-fly', 'Odwrotne rozpiętki na ławce skośnej', 'Barki', 'Hantle'),
  row('db-rear-delt-row', 'Wiosłowanie hantlami na tył barków', 'Barki', 'Hantle'),
  row('external-rotation', 'Rotacja zewnętrzna barku z hantlem', 'Barki', 'Hantle'),
  row('barbell-upright-row', 'Podciąganie sztangi wzdłuż tułowia', 'Barki', 'Sztanga'),
  row('barbell-front-raise', 'Unoszenie sztangi przodem', 'Barki', 'Sztanga'),
  row('cable-shoulder-press', 'Wyciskanie nad głowę na wyciągu', 'Barki', 'Wyciąg'),
  row('cable-upright-row', 'Podciąganie linki wzdłuż tułowia', 'Barki', 'Wyciąg'),
  row('cable-front-raise', 'Unoszenie linki przodem', 'Barki', 'Wyciąg'),
  row('cable-rear-fly', 'Odwrotne rozpiętki na wyciągu', 'Barki', 'Wyciąg'),
  row('smith-shoulder', 'Wyciskanie nad głowę na suwnicy Smitha', 'Barki', 'Maszyna'),
  row('plate-front-raise', 'Unoszenie talerza przodem', 'Barki', 'Inne'),
  row('seated-ohp', 'Wyciskanie sztangi siedząc', 'Barki', 'Sztanga'),
  row('barbell-rear-delt-row', 'Wiosłowanie sztangą na tył barków', 'Barki', 'Sztanga'),
  row('db-seated-front', 'Unoszenie hantli przodem siedząc', 'Barki', 'Hantle'),
  row('lateral-to-front', 'Unoszenie hantli bokiem i przodem', 'Barki', 'Hantle'),
  row('db-lying-rear', 'Odwrotne rozpiętki leżąc przodem', 'Barki', 'Hantle'),
  row('machine-one-arm-shoulder', 'Wyciskanie jednorącz nad głowę na maszynie', 'Barki', 'Maszyna'),

  // Biceps
  row('barbell-curl', 'Uginanie ramion ze sztangą', 'Biceps', 'Sztanga'),
  row('ez-curl', 'Uginanie ramion ze sztangą łamaną', 'Biceps', 'Sztanga'),
  row('db-curl', 'Uginanie ramion z hantlami', 'Biceps', 'Hantle'),
  row('hammer-curl', 'Uginanie młotkowe', 'Biceps', 'Hantle'),
  row('incline-curl', 'Uginanie z hantlami na ławce skośnej', 'Biceps', 'Hantle'),
  row('preacher-curl', 'Uginanie na modlitewniku', 'Biceps', 'Sztanga'),
  row('cable-curl', 'Uginanie ramion na wyciągu', 'Biceps', 'Wyciąg'),
  row('concentration-curl', 'Uginanie w koncentracji', 'Biceps', 'Hantle'),
  row('zottman-curl', 'Uginanie Zottmana', 'Biceps', 'Hantle'),
  row('spider-curl', 'Uginanie na ławce skośnej przodem', 'Biceps', 'Sztanga'),
  row('drag-curl', 'Uginanie ze sztangą przy tułowiu', 'Biceps', 'Sztanga'),
  row('wide-curl', 'Uginanie ze sztangą szerokim chwytem', 'Biceps', 'Sztanga'),
  row('cable-hammer-curl', 'Uginanie młotkowe z liną', 'Biceps', 'Wyciąg'),
  row('db-alternate-curl', 'Uginanie naprzemienne z hantlami', 'Biceps', 'Hantle'),
  row('db-seated-curl', 'Uginanie z hantlami siedząc', 'Biceps', 'Hantle'),
  row('db-preacher', 'Uginanie z hantlami na modlitewniku', 'Biceps', 'Hantle'),
  row('cross-body-hammer', 'Uginanie młotkowe w poprzek tułowia', 'Biceps', 'Hantle'),
  row('incline-hammer', 'Uginanie młotkowe na ławce skośnej', 'Biceps', 'Hantle'),
  row('ez-preacher', 'Uginanie sztangą łamaną na modlitewniku', 'Biceps', 'Sztanga'),
  row('machine-curl', 'Uginanie ramion na maszynie', 'Biceps', 'Maszyna'),
  row('machine-preacher', 'Uginanie na modlitewniku na maszynie', 'Biceps', 'Maszyna'),

  // Triceps
  row('close-bench', 'Wyciskanie wąsko na ławce płaskiej', 'Triceps', 'Sztanga'),
  row('skull-crusher', 'Wyciskanie francuskie leżąc', 'Triceps', 'Sztanga'),
  row('overhead-db-ext', 'Wyciskanie francuskie hantlem', 'Triceps', 'Hantle'),
  row('pushdown', 'Prostowanie ramion na wyciągu', 'Triceps', 'Wyciąg'),
  row('rope-pushdown', 'Prostowanie ramion z liną', 'Triceps', 'Wyciąg'),
  row('overhead-cable-ext', 'Prostowanie ramion nad głową na wyciągu', 'Triceps', 'Wyciąg'),
  row('barbell-overhead-ext', 'Wyciskanie francuskie sztangą stojąc', 'Triceps', 'Sztanga'),
  row('ez-overhead-ext', 'Wyciskanie francuskie sztangą łamaną siedząc', 'Triceps', 'Sztanga'),
  row('db-lying-ext', 'Wyciskanie francuskie hantlami leżąc', 'Triceps', 'Hantle'),
  row('db-standing-ext', 'Wyciskanie francuskie hantlem stojąc', 'Triceps', 'Hantle'),
  row('db-kickback', 'Prostowanie ramienia z hantlem w opadzie', 'Triceps', 'Hantle'),
  row('vbar-pushdown', 'Prostowanie ramion z uchwytem V', 'Triceps', 'Wyciąg'),
  row('reverse-pushdown', 'Prostowanie ramion podchwytem na wyciągu', 'Triceps', 'Wyciąg'),
  row('one-arm-pushdown', 'Prostowanie ramienia jednorącz na wyciągu', 'Triceps', 'Wyciąg'),
  row('rope-overhead-ext', 'Prostowanie ramion z liną nad głową', 'Triceps', 'Wyciąg'),
  row('cable-kickback-triceps', 'Prostowanie ramienia w opadzie na wyciągu', 'Triceps', 'Wyciąg'),
  row('machine-triceps', 'Prostowanie ramion na maszynie', 'Triceps', 'Maszyna'),
  row('machine-dip', 'Dipy na maszynie', 'Triceps', 'Maszyna'),
  row('assisted-dip', 'Dipy z odciążeniem', 'Triceps', 'Maszyna'),
  row('smith-close-bench', 'Wyciskanie wąsko na suwnicy Smitha', 'Triceps', 'Maszyna'),
  row('incline-close-bench', 'Wyciskanie wąsko na ławce skośnej', 'Triceps', 'Sztanga'),
  row('jm-press', 'Wyciskanie JM', 'Triceps', 'Sztanga'),
  row('barbell-seated-ext', 'Wyciskanie francuskie sztangą siedząc', 'Triceps', 'Sztanga'),
  row('ez-lying-ext', 'Wyciskanie francuskie sztangą łamaną leżąc', 'Triceps', 'Sztanga'),
  row('ez-close-bench', 'Wyciskanie wąsko sztangą łamaną', 'Triceps', 'Sztanga'),
  row('db-incline-ext', 'Wyciskanie francuskie hantlami na ławce skośnej', 'Triceps', 'Hantle'),
  row('db-two-arm-kickback', 'Prostowanie obu ramion z hantlami w opadzie', 'Triceps', 'Hantle'),
  row('machine-overhand-dip', 'Dipy nachwytem na maszynie', 'Triceps', 'Maszyna'),

  // Przedramiona
  row('wrist-curl', 'Uginanie nadgarstków', 'Przedramiona', 'Hantle'),
  row('reverse-curl', 'Uginanie ramion nachwytem', 'Przedramiona', 'Sztanga'),
  row('farmer-walk', 'Spacer farmera', 'Przedramiona', 'Hantle', 'time'),
  row('barbell-wrist-curl', 'Uginanie nadgarstków ze sztangą', 'Przedramiona', 'Sztanga'),
  row('barbell-reverse-wrist', 'Prostowanie nadgarstków ze sztangą', 'Przedramiona', 'Sztanga'),
  row('db-reverse-wrist', 'Prostowanie nadgarstków z hantlami', 'Przedramiona', 'Hantle'),
  row('wrist-roller', 'Nawijanie linki z ciężarkiem', 'Przedramiona', 'Inne'),
  row('ez-reverse-curl', 'Uginanie sztangą łamaną nachwytem', 'Przedramiona', 'Sztanga'),

  // Czworogłowe
  row('squat', 'Przysiad ze sztangą', 'Czworogłowe', 'Sztanga'),
  row('front-squat', 'Przysiad przedni', 'Czworogłowe', 'Sztanga'),
  row('goblet-squat', 'Przysiad goblet', 'Czworogłowe', 'Hantle'),
  row('hack-squat', 'Przysiad na maszynie hack', 'Czworogłowe', 'Maszyna'),
  row('leg-press', 'Wypychanie nogami na suwnicy', 'Czworogłowe', 'Maszyna'),
  row('leg-extension', 'Prostowanie nóg na maszynie', 'Czworogłowe', 'Maszyna'),
  row('bulgarian-squat', 'Przysiad bułgarski', 'Czworogłowe', 'Hantle'),
  row('lunge', 'Wykroki z hantlami', 'Czworogłowe', 'Hantle'),
  row('step-up', 'Wejścia na skrzynię', 'Czworogłowe', 'Hantle'),
  row('reverse-lunge', 'Wykroki w tył z hantlami', 'Czworogłowe', 'Hantle'),
  row('barbell-lunge', 'Wykroki w tył ze sztangą', 'Czworogłowe', 'Sztanga'),
  row('walking-lunge', 'Wykroki chodzone', 'Czworogłowe', 'Masa ciała', 'bodyweight'),
  row('sissy-squat', 'Przysiad sissy', 'Czworogłowe', 'Masa ciała', 'bodyweight'),
  row('pistol-squat', 'Przysiad na jednej nodze', 'Czworogłowe', 'Masa ciała', 'bodyweight'),
  row('smith-squat', 'Przysiad na suwnicy Smitha', 'Czworogłowe', 'Maszyna'),
  row('db-squat', 'Przysiad z hantlami', 'Czworogłowe', 'Hantle'),
  row('barbell-hack', 'Przysiad hack ze sztangą', 'Czworogłowe', 'Sztanga'),
  row('barbell-box-squat', 'Przysiad ze sztangą na ławkę', 'Czworogłowe', 'Sztanga'),
  row('barbell-wide-squat', 'Przysiad ze sztangą szeroko', 'Czworogłowe', 'Sztanga'),
  row('zercher-squat', 'Przysiad Zerchera', 'Czworogłowe', 'Sztanga'),
  row('barbell-bulgarian', 'Przysiad bułgarski ze sztangą', 'Czworogłowe', 'Sztanga'),
  row('barbell-step-up', 'Wejścia na skrzynię ze sztangą', 'Czworogłowe', 'Sztanga'),
  row('barbell-forward-lunge', 'Wykroki w przód ze sztangą', 'Czworogłowe', 'Sztanga'),
  row('leg-press-wide', 'Wypychanie nogami szeroko na suwnicy', 'Czworogłowe', 'Maszyna'),
  row('leg-press-single', 'Wypychanie jedną nogą na suwnicy', 'Czworogłowe', 'Maszyna'),
  row('hack-close', 'Przysiad hack wąsko na maszynie', 'Czworogłowe', 'Maszyna'),

  // Dwugłowe uda
  row('romanian-deadlift', 'Martwy ciąg na prostych nogach', 'Dwugłowe uda', 'Sztanga'),
  row('db-romanian', 'Martwy ciąg z hantlami', 'Dwugłowe uda', 'Hantle'),
  row('leg-curl-lying', 'Uginanie nóg leżąc', 'Dwugłowe uda', 'Maszyna'),
  row('leg-curl-seated', 'Uginanie nóg siedząc', 'Dwugłowe uda', 'Maszyna'),
  row('good-morning', 'Dzień dobry ze sztangą', 'Dwugłowe uda', 'Sztanga'),
  row('leg-curl-kneeling', 'Uginanie nogi klęcząc na maszynie', 'Dwugłowe uda', 'Maszyna'),
  row('db-leg-curl', 'Uginanie nóg z hantlem leżąc', 'Dwugłowe uda', 'Hantle'),
  row('single-leg-deadlift', 'Martwy ciąg na jednej nodze', 'Dwugłowe uda', 'Hantle'),
  row('glute-ham-raise', 'Unoszenie tułowia na dwugłowe', 'Dwugłowe uda', 'Masa ciała', 'bodyweight'),
  row('barbell-stiff-deadlift', 'Martwy ciąg sztywny ze sztangą', 'Dwugłowe uda', 'Sztanga'),
  row('db-stiff-deadlift', 'Martwy ciąg sztywny z hantlami', 'Dwugłowe uda', 'Hantle'),
  row('leg-curl-alternate', 'Uginanie nóg naprzemiennie na maszynie', 'Dwugłowe uda', 'Maszyna'),

  // Pośladki
  row('hip-thrust', 'Wypychanie bioder ze sztangą', 'Pośladki', 'Sztanga'),
  row('glute-bridge', 'Mostek biodrowy', 'Pośladki', 'Masa ciała', 'bodyweight'),
  row('hip-abduction', 'Odwodzenie nóg na maszynie', 'Pośladki', 'Maszyna'),
  row('cable-kickback', 'Wykopy nogą na wyciągu', 'Pośladki', 'Wyciąg'),
  row('barbell-glute-bridge', 'Mostek biodrowy ze sztangą', 'Pośladki', 'Sztanga'),
  row('sumo-deadlift', 'Martwy ciąg sumo', 'Pośladki', 'Sztanga'),
  row('bench-glute-bridge', 'Mostek biodrowy na ławce', 'Pośladki', 'Masa ciała', 'bodyweight'),
  row('hip-adduction', 'Przywodzenie nóg na maszynie', 'Pośladki', 'Maszyna'),
  row('reverse-hyper', 'Unoszenie nóg na maszynie do wyprostów', 'Pośladki', 'Maszyna'),
  row('cable-adduction', 'Przywodzenie nogi na wyciągu', 'Pośladki', 'Wyciąg'),
  row('barbell-lateral-lunge', 'Wykroki w bok ze sztangą', 'Pośladki', 'Sztanga'),
  row('machine-hip-extension', 'Prostowanie biodra na maszynie', 'Pośladki', 'Maszyna'),

  // Łydki
  row('calf-standing', 'Wspięcia na palce stojąc', 'Łydki', 'Maszyna'),
  row('calf-seated', 'Wspięcia na palce siedząc', 'Łydki', 'Maszyna'),
  row('calf-press', 'Wspięcia na palce na suwnicy', 'Łydki', 'Maszyna'),
  row('calf-hack', 'Wspięcia na palce na maszynie hack', 'Łydki', 'Maszyna'),
  row('calf-donkey', 'Wspięcia na palce w opadzie na maszynie', 'Łydki', 'Maszyna'),
  row('calf-barbell', 'Wspięcia na palce ze sztangą', 'Łydki', 'Sztanga'),
  row('calf-db', 'Wspięcia na palce z hantlami', 'Łydki', 'Hantle'),
  row('calf-db-seated', 'Wspięcia na palce z hantlami siedząc', 'Łydki', 'Hantle'),
  row('calf-bodyweight', 'Wspięcia na palce bez obciążenia', 'Łydki', 'Masa ciała', 'bodyweight'),
  row('calf-machine-press', 'Wspięcia na palce na maszynie do wypychania', 'Łydki', 'Maszyna'),
  row('calf-barbell-seated', 'Wspięcia na palce ze sztangą siedząc', 'Łydki', 'Sztanga'),
  row('calf-db-single', 'Wspięcia na jednej nodze z hantlem', 'Łydki', 'Hantle'),

  // Brzuch
  row('crunch', 'Spięcia brzucha', 'Brzuch', 'Masa ciała', 'bodyweight'),
  row('cable-crunch', 'Spięcia brzucha na wyciągu', 'Brzuch', 'Wyciąg'),
  row('hanging-leg-raise', 'Unoszenie nóg w zwisie', 'Brzuch', 'Masa ciała', 'bodyweight'),
  row('lying-leg-raise', 'Unoszenie nóg leżąc', 'Brzuch', 'Masa ciała', 'bodyweight'),
  row('russian-twist', 'Rosyjski skręt', 'Brzuch', 'Masa ciała', 'bodyweight'),
  row('plank', 'Deska', 'Brzuch', 'Masa ciała', 'time'),
  row('side-plank', 'Deska boczna', 'Brzuch', 'Masa ciała', 'time'),
  row('sit-up', 'Brzuszki pełne', 'Brzuch', 'Masa ciała', 'bodyweight'),
  row('decline-sit-up', 'Brzuszki na ławce skośnej', 'Brzuch', 'Masa ciała', 'bodyweight'),
  row('bicycle-crunch', 'Rowerek', 'Brzuch', 'Masa ciała', 'bodyweight'),
  row('reverse-crunch', 'Spięcia odwrotne', 'Brzuch', 'Masa ciała', 'bodyweight'),
  row('mountain-climber', 'Wspinaczka górska', 'Brzuch', 'Masa ciała', 'bodyweight'),
  row('dead-bug', 'Martwy robak', 'Brzuch', 'Masa ciała', 'bodyweight'),
  row('hanging-knee-raise', 'Unoszenie kolan w zwisie z odciążeniem', 'Brzuch', 'Masa ciała', 'bodyweight'),
  row('wheel-rollout', 'Wałek do brzucha', 'Brzuch', 'Inne', 'bodyweight'),
  row('db-side-bend', 'Skłony boczne z hantlem', 'Brzuch', 'Hantle'),
  row('cable-side-bend', 'Skłony boczne na wyciągu', 'Brzuch', 'Wyciąg'),
  row('cable-reverse-crunch', 'Spięcia odwrotne na wyciągu', 'Brzuch', 'Wyciąg'),
  row('machine-crunch', 'Spięcia brzucha na maszynie', 'Brzuch', 'Maszyna'),
  row('machine-twist', 'Skręty tułowia na maszynie', 'Brzuch', 'Maszyna'),

  // Całe ciało
  row('clean-press', 'Zarzut i wyciskanie', 'Całe ciało', 'Sztanga'),
  row('burpee', 'Burpee', 'Całe ciało', 'Masa ciała', 'bodyweight'),
  row('barbell-thruster', 'Przysiad z wyciskaniem ze sztangą', 'Całe ciało', 'Sztanga'),
  row('power-clean', 'Zarzut siłowy', 'Całe ciało', 'Sztanga'),
  row('db-clean', 'Zarzut hantlami', 'Całe ciało', 'Hantle'),
  row('db-snatch', 'Rwanie hantlem jednorącz', 'Całe ciało', 'Hantle'),
];

/**
 * Ćwiczenia na nogi pracują na kilka partii nóg. Grupy: partie pomocnicze i ćwiczenia, których to dotyczy.
 * Góry ciała celowo tu nie ma: wyciskanie liczy się tylko do klatki, a wiosłowanie tylko do pleców.
 */
const HELPER_GROUPS = [
  [['Pośladki', 'Dwugłowe uda'], ['squat', 'front-squat', 'barbell-box-squat', 'barbell-wide-squat', 'barbell-hack', 'zercher-squat', 'smith-squat', 'goblet-squat', 'db-squat', 'hack-squat', 'hack-close', 'leg-press', 'leg-press-wide', 'leg-press-single', 'bulgarian-squat', 'barbell-bulgarian', 'lunge', 'reverse-lunge', 'walking-lunge', 'barbell-lunge', 'barbell-forward-lunge', 'step-up', 'barbell-step-up', 'pistol-squat']],
  [['Dwugłowe uda', 'Pośladki'], ['deadlift', 'rack-pull', 'db-deadlift']],
  [['Czworogłowe', 'Dwugłowe uda'], ['sumo-deadlift']],
  [['Pośladki'], ['romanian-deadlift', 'barbell-stiff-deadlift', 'db-romanian', 'db-stiff-deadlift', 'good-morning', 'single-leg-deadlift']],
  [['Dwugłowe uda'], ['hip-thrust', 'barbell-glute-bridge', 'glute-bridge', 'bench-glute-bridge', 'machine-hip-extension', 'reverse-hyper']],
];

// Seria liczy się w całości do partii głównej, a do pomocniczej w połowie.
const HELPER_SHARE = 0.5;
export const HELPER_MUSCLES = new Map(HELPER_GROUPS.flatMap(([muscles, ids]) => ids.map((id) => [id, muscles])));

/** Partie, na które pracuje ćwiczenie, z udziałem serii: [[partia, udział]]. Własne ćwiczenia mają tylko główną. */
export function musclesOf(exercise) {
  if (!exercise?.muscle) return [];
  return [[exercise.muscle, 1], ...(HELPER_MUSCLES.get(exercise.id) ?? []).map((muscle) => [muscle, HELPER_SHARE])];
}

/** Ćwiczenia usunięte z bazy. Telefon ma je już zapisane, więc trzeba je z niego zdjąć przy starcie. */
export const RETIRED_EXERCISES = [
  'push-up', 'chest-dip', 'incline-push-up', 'decline-push-up', 'wide-push-up', 'triceps-dip', 'bench-dip', 'diamond-push-up',
  'kb-swing', 'kb-row', 'kb-press', 'kb-front-squat', 'kb-clean', 'kb-snatch', 'kb-thruster', 'turkish-get-up',
];

/**
 * Uzgadnia zapisane ćwiczenia z bazą i zwraca, co trzeba zapisać oraz usunąć.
 * Nazwy i kategorie wbudowanych ćwiczeń idą za bazą, a ustawienia użytkownika zostają.
 * Wycofane ćwiczenie użyte w historii lub rutynie jest tylko ukrywane, żeby zachować jego nazwę.
 */
export function syncExercises(stored, isUsed) {
  const exercises = new Map(stored.map((e) => [e.id, e]));
  const toSave = [];
  const toRemove = [];
  const save = (exercise) => {
    exercises.set(exercise.id, exercise);
    toSave.push(exercise);
  };

  for (const seed of SEED_EXERCISES) {
    const current = exercises.get(seed.id);
    if (!current) save(seed);
    else if (current.name !== seed.name || current.muscle !== seed.muscle || current.equipment !== seed.equipment) {
      save({ ...current, name: seed.name, muscle: seed.muscle, equipment: seed.equipment });
    }
  }

  for (const id of RETIRED_EXERCISES) {
    const current = exercises.get(id);
    if (!current) continue;
    if (!isUsed(id)) {
      exercises.delete(id);
      toRemove.push(id);
    } else if (!current.archived) {
      save({ ...current, archived: true });
    }
  }
  return { exercises, toSave, toRemove };
}
