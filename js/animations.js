// Które animacje z darmowego ExerciseDB pokazują dane ćwiczenie. Same pliki ładują się z ich serwera.
// W komentarzu nazwa animacji u źródła, żeby łatwo było wychwycić złe dopasowanie.

export const ANIMATION_BASE = 'https://static.exercisedb.dev/media/';

export const ANIMATIONS = {
  "bench-press": "EIeI8Vf", // barbell bench press
  "incline-bench": "3TZduzM", // barbell incline bench press
  "decline-bench": "GrO65fd", // barbell decline bench press
  "db-bench": "SpYC0Kp", // dumbbell bench press
  "db-incline": "ns0SIbU", // dumbbell incline bench press
  "db-fly": "yz9nUhF", // dumbbell fly
  "deadlift": "ila4NZS", // barbell deadlift
  "barbell-row": "eZyBC3j", // barbell bent over row
  "pull-up": "lBDjFxJ", // pull-up
  "chin-up": "T2mxWqc", // chin-up
  "lat-pulldown": "eYnzaCm", // cable bar lateral pulldown
  "close-pulldown": "4c9BhzB", // cable lateral pulldown with v-bar
  "cable-row": "fUBheHs", // cable seated row
  "straight-pulldown": "x69MAlq", // cable straight arm pulldown
  "back-extension": "zhMwOwE", // hyperextension
  "barbell-shrug": "dG7tG5y", // barbell shrug
  "db-shrug": "NJzBsGJ", // dumbbell shrug
  "db-shoulder-press": "znQUdHY", // dumbbell seated shoulder press
  "lateral-raise": "DsgkuIt", // dumbbell lateral raise
  "cable-lateral": "goJ6ezq", // cable lateral raise
  "front-raise": "Rr7S3yg", // dumbbell front raise
  "rear-delt-fly": "8DiFDVA", // dumbbell rear fly
  "barbell-curl": "25GPyDY", // barbell curl
  "db-curl": "NbVPDMW", // dumbbell biceps curl
  "hammer-curl": "slDvUAU", // dumbbell hammer curl
  "incline-curl": "RaflbWD", // dumbbell incline curl
  "preacher-curl": "qOgPVf6", // barbell preacher curl
  "cable-curl": "G08RZcQ", // cable curl
  "close-bench": "J6Dx1Mu", // barbell close-grip bench press
  "skull-crusher": "h8LFzo9", // barbell lying triceps extension skull crusher
  "overhead-db-ext": "kont8Ut", // dumbbell seated triceps extension
  "pushdown": "3ZflifB", // cable pushdown
  "rope-pushdown": "dU605di", // cable pushdown (with rope attachment)
  "reverse-curl": "xNrS20v", // barbell reverse curl
  "farmer-walk": "qPEzJjA", // farmers walk
  "squat": "qXTaZnJ", // barbell full squat
  "front-squat": "zG0zs85", // barbell front squat
  "goblet-squat": "yn8yg1r", // dumbbell goblet squat
  "hack-squat": "Qa55kX1", // sled hack squat
  "leg-press": "2Qh2J1e", // Sled 45° Leg Press
  "bulgarian-squat": "qx4fgX7", // dumbbell single leg split squat
  "lunge": "RRWFUcw", // dumbbell lunge
  "step-up": "aXtJhlg", // dumbbell step-up
  "romanian-deadlift": "wQ2c4XD", // barbell romanian deadlift
  "db-romanian": "rR0LJzx", // dumbbell romanian deadlift
  "good-morning": "XlZ4lAC", // barbell good morning
  "glute-bridge": "u0cNiij", // low glute bridge on floor
  "cable-kickback": "Kpajagk", // cable standing hip extension
  "calf-press": "ykHcWme", // sled calf press on leg press
  "crunch": "TFqbd8t", // crunch floor
  "cable-crunch": "WW95auq", // cable kneeling crunch
  "hanging-leg-raise": "I3tsCnC", // hanging leg raise
  "russian-twist": "XVDdcoj", // russian twist
  "clean-press": "SGY8Zui", // barbell clean and press
  "burpee": "dK9394r", // burpee
  "machine-press": "DOoWcnA", // Machine Chest Press
  "pec-deck": "v3xmPAR", // Machine Seated Fly
  "cable-fly": "0CXGHya", // Cable Crossover
  "t-bar-row": "aaXr7ld", // Machine T Bar Row
  "db-row": "C0MA9bC", // Dumbbell Single-Arm Bent-Over Row
  "machine-row": "7I6LNUG", // Machine Seated Row
  "ohp": "Kyd9Rz5", // barbell standing wide military press
  "machine-shoulder": "67n3r98", // Machine Shoulder Press
  "machine-lateral": "dRTfGZT", // Machine Lateral Raise
  "reverse-pec-deck": "myfUsKf", // Machine Seated Reverse Fly
  "face-pull": "ZfyAGhK", // cable standing rear delt row (with rope)
  "ez-curl": "6TG6x2w", // EZ-Bar Curl
  "overhead-cable-ext": "1xHyxys", // Cable High Pulley Overhead Triceps Extension
  "wrist-curl": "q8aHNoF", // Dumbbell Single-Arm Wrist Curl
  "leg-extension": "my33uHU", // Machine Leg Extension
  "leg-curl-lying": "17lJ1kr", // Machine Lying Leg Curl
  "leg-curl-seated": "Zg3XY7P", // Machine Seated Leg Curl
  "hip-thrust": "qg2PGl6", // Barbell Glute Bridge Two-Leg On Bench
  "hip-abduction": "CHpahtl", // Machine Seated Hip Abduction
  "calf-standing": "ykUOVze", // Machine Standing Calf Raise
  "calf-seated": "bOOdeyc", // Machine Seated Calf Raise
  "lying-leg-raise": "WhuFnR7", // lying leg raise flat bench
  "plank": "VBAWRPG", // weighted front plank
  "side-plank": "5VXmnV5", // bodyweight incline side plank
  // Klatka
  "smith-bench": "trqKQv2", // smith bench press
  "smith-incline": "5v7KYld", // smith incline bench press
  "db-pullover": "9XjtHvS", // dumbbell pullover
  "cable-incline-fly": "tBWXbIT", // cable incline fly
  "cable-low-fly": "FVmZVhk", // cable low fly
  "cable-chest-press": "nIR4Rwl", // cable seated chest press
  // Plecy
  "pendlay-row": "r0z6xzQ", // barbell pendlay row
  "rack-pull": "za9Ni4z", // barbell rack pull
  "barbell-pullover": "i6LWjok", // barbell pullover
  "inverted-row": "bZGHsAZ", // inverted row
  "wide-pull-up": "Qqi7bko", // Wide-Grip Pull-Up
  "underhand-pulldown": "xBYcQHj", // cable underhand pulldown
  "rope-straight-pulldown": "DT14T9T", // cable straight arm pulldown (with rope)
  "wide-cable-row": "qcY50ZD", // cable seated wide-grip row
  "machine-pulldown": "7F1DVzn", // Machine Front Pulldown
  "machine-pullover": "4U7iLb5", // Machine Pullover
  "smith-row": "ZX9UZmj", // smith bent over row
  "smith-shrug": "OUQ0ZyW", // smith shrug
  // Barki
  "arnold-press": "eOrFCnx", // dumbbell arnold press
  "one-arm-db-press": "1TkiAFK", // Dumbbell Single-Arm Shoulder Press
  "db-push-press": "FS63wTN", // dumbbell push press
  "seated-lateral": "hrrS0Ed", // dumbbell seated lateral raise
  "one-arm-lateral": "n5cWCsI", // Dumbbell Single-Arm Lateral Raise
  "db-upright-row": "ainizkb", // dumbbell upright row
  "incline-rear-fly": "vYk8lqw", // dumbbell incline rear lateral raise
  "db-rear-delt-row": "EKXOMEh", // dumbbell rear delt row (shoulder)
  "external-rotation": "x306lCW", // dumbbell upright shoulder external rotation
  "barbell-upright-row": "83HoW9X", // barbell upright row
  "barbell-front-raise": "b2Uoz54", // barbell front raise
  "cable-shoulder-press": "PzQanLE", // cable shoulder press
  "cable-upright-row": "cALKspW", // cable upright row
  "cable-front-raise": "u2X71Np", // cable front raise
  "cable-rear-fly": "aqvSOQE", // Cable Crossover Reverse Fly
  "smith-shoulder": "903mzG8", // smith shoulder press
  "plate-front-raise": "e4aFmFY", // weighted front raise
  // Biceps
  "concentration-curl": "gvsWLQw", // dumbbell concentration curl
  "zottman-curl": "kXaIn5A", // dumbbell zottman curl
  "spider-curl": "2kattbR", // EZ-Bar Spider Curl
  "drag-curl": "IENzBdA", // barbell drag curl
  "wide-curl": "NdIb5Z1", // barbell standing wide-grip curl
  "cable-hammer-curl": "HPlPoQA", // cable hammer curl (with rope)
  // Triceps
  "barbell-overhead-ext": "dZl9Q27", // barbell standing overhead triceps extension
  "ez-overhead-ext": "iaapw0g", // EZ-Bar Seated Triceps Extension
  "db-lying-ext": "mpKZGWz", // dumbbell lying triceps extension
  "db-standing-ext": "PdmaD0N", // dumbbell standing triceps extension
  "db-kickback": "W6PxUkg", // dumbbell kickback
  "vbar-pushdown": "gAwDzB3", // cable triceps pushdown (v-bar)
  "reverse-pushdown": "VjYliFZ", // cable reverse-grip pushdown
  "one-arm-pushdown": "qRZ5S1N", // Cable Single-Arm Triceps Pushdown
  "rope-overhead-ext": "2IxROQ1", // cable overhead triceps extension (rope attachment)
  "cable-kickback-triceps": "HEJ6DIX", // cable kickback
  "machine-triceps": "Ser9eQp", // Machine Triceps Extension
  "machine-dip": "BRImeP8", // Machine Seated Dip
  "assisted-dip": "J60bN17", // assisted triceps dip (kneeling)
  "smith-close-bench": "WcHl7ru", // smith close-grip bench press
  // Przedramiona
  "barbell-wrist-curl": "6kSxYnw", // barbell wrist curl
  "barbell-reverse-wrist": "LsZkfU6", // barbell reverse wrist curl
  "db-reverse-wrist": "BLCvwr2", // dumbbell reverse wrist curl
  "wrist-roller": "bd5b860", // wrist rollerer
  // Nogi
  "reverse-lunge": "SSsBDwB", // dumbbell rear lunge
  "barbell-lunge": "62Nw60O", // barbell rear lunge
  "walking-lunge": "IZVHb27", // walking lunge
  "sissy-squat": "xdYPUtE", // sissy squat
  "pistol-squat": "nqs5HGV", // Single Leg Squat (Pistol)
  "smith-squat": "NNoHCEA", // smith full squat
  "leg-curl-kneeling": "nnmCTLN", // Machine Kneeling Leg Curl
  "db-leg-curl": "FkBIE6a", // Lying Dumbbell Leg Curl
  "single-leg-deadlift": "gKozT8X", // dumbbell single leg deadlift
  "glute-ham-raise": "Vvwjz6N", // glute-ham raise
  // Pośladki
  "barbell-glute-bridge": "qKBpF7I", // barbell glute bridge
  "sumo-deadlift": "KgI0tqW", // barbell sumo deadlift
  "bench-glute-bridge": "aWedzZX", // Glute Bridge Two-Leg On Bench
  "hip-adduction": "oHsrypV", // Machine Seated Hip Adduction
  "reverse-hyper": "Krmb3cB", // Machine Reverse Hyperextension
  "cable-adduction": "hBGWILP", // cable hip adduction
  // Łydki
  "calf-hack": "2ORFMoR", // hack calf raise
  "calf-donkey": "C9LuR4A", // Machine Donkey Calf Raise
  "calf-barbell": "8ozhUIZ", // barbell standing calf raise
  "calf-db": "dPmaUaU", // dumbbell standing calf raise
  "calf-db-seated": "r29jP7S", // dumbbell seated calf raise
  "calf-bodyweight": "bJYHBIN", // bodyweight standing calf raise
  // Brzuch
  "sit-up": "Bn6TXyO", // sit-up
  "decline-sit-up": "QLL2gdc", // decline sit-up
  "bicycle-crunch": "1ZFqTDN", // Bicycle Crunch
  "reverse-crunch": "nCU1Ekp", // reverse crunch
  "mountain-climber": "RJgzwny", // mountain climber
  "dead-bug": "iny3m5y", // dead bug
  "hanging-knee-raise": "03lzqwk", // assisted hanging knee raise
  "wheel-rollout": "NAgVB3t", // wheel rollout
  "db-side-bend": "IpONWYv", // dumbbell side bend
  "cable-side-bend": "wPypxFY", // cable side bend
  "cable-reverse-crunch": "RqOtqD7", // cable reverse crunch
  // Całe ciało
  "barbell-thruster": "f7Y9eDZ", // barbell thruster
  "power-clean": "SiWCcTN", // power clean
  // Hantle, sztanga i maszyny
  "db-decline": "DwhEmmE", // dumbbell decline bench press
  "db-incline-fly": "ESOd5Pl", // dumbbell incline fly
  "db-hammer-press": "7gdLIXa", // dumbbell lying hammer press
  "db-one-arm-bench": "K3dIO25", // Dumbbell Lying Single-Arm Press
  "wide-bench": "JsKq9so", // barbell wide bench press
  "guillotine-bench": "GXoaSgn", // barbell guillotine bench press
  "machine-incline-press": "jHAnWmT", // Machine Incline Chest Press
  "machine-decline-press": "vsVoPHt", // Machine Decline Chest Press
  "db-bent-row": "BJ0Hz5L", // dumbbell bent over row
  "db-incline-row": "7vG5o25", // dumbbell incline row
  "db-deadlift": "nUwVh7b", // dumbbell deadlift
  "barbell-incline-row": "dmgMp3n", // barbell incline row
  "reverse-barbell-row": "SzX3uzM", // Barbell Reverse-Grip Bent Over Row
  "machine-high-row": "nZZZy9m", // Machine High Row
  "machine-high-row-single": "OIFMAp1", // Machine Single-Arm Lateral High Row
  "machine-narrow-row": "IGjKj1v", // Machine Narrow Grip Seated Row
  "machine-one-arm-row": "oROuvrX", // Machine Unilateral Row
  "machine-shrug": "ZZKbeMw", // Machine Shrug
  "machine-back-extension": "rUXfn3R", // Machine Back Extension
  "machine-assisted-pull-up": "MaMuGH6", // Machine Assisted Pull-Up
  "seated-ohp": "kTbSH9h", // barbell seated overhead press
  "barbell-rear-delt-row": "S9zHIvU", // barbell rear delt row
  "db-seated-front": "Ys97II0", // dumbbell seated front raise
  "lateral-to-front": "xMjBKwn", // dumbbell lateral to front raise
  "db-lying-rear": "53Ttlck", // dumbbell lying rear lateral raise
  "machine-one-arm-shoulder": "2KGnL6M", // Machine Single-Arm Shoulder Press
  "db-alternate-curl": "BU15nH4", // dumbbell alternate biceps curl
  "db-seated-curl": "TiaZTxx", // dumbbell seated curl
  "db-preacher": "jivWf8n", // dumbbell preacher curl
  "cross-body-hammer": "HDYiZcY", // dumbbell cross body hammer curl
  "incline-hammer": "ByX0WxV", // dumbbell incline hammer curl
  "ez-preacher": "hacCyUv", // EZ-Bar Close-Grip Preacher Curl
  "machine-curl": "q6y3OhV", // Machine Biceps Curl
  "machine-preacher": "b6hQYMb", // Machine Preacher Curl
  "incline-close-bench": "gx7s7uF", // Barbell Incline Close-Grip Bench Press
  "jm-press": "ZsiqXYa", // barbell jm bench press
  "barbell-seated-ext": "5uFK1xr", // barbell seated overhead triceps extension
  "ez-lying-ext": "6CKUx7o", // EZ-Bar Lying Close-Grip Triceps Extension Behind Head
  "ez-close-bench": "da4cXST", // ez-bar close-grip bench press
  "db-incline-ext": "OVIKwsd", // dumbbell incline triceps extension
  "db-two-arm-kickback": "3T12T87", // Dumbbell Standing Bent Over Two-Arm Triceps Extension
  "machine-overhand-dip": "D5yqP2p", // Machine Overhand Triceps Dip
  "ez-reverse-curl": "Y5X65IB", // EZ-Bar Reverse-Grip Curl
  "db-squat": "HsvHqgf", // dumbbell squat
  "barbell-hack": "5VCj6iH", // barbell hack squat
  "barbell-box-squat": "W9pFVv1", // barbell bench squat
  "barbell-wide-squat": "s7HX1BY", // barbell wide squat
  "zercher-squat": "LSTChY9", // barbell zercher squat
  "barbell-bulgarian": "gGNQmVt", // barbell single leg split squat
  "barbell-step-up": "Kxquu2E", // barbell step-up
  "barbell-forward-lunge": "t8iSghb", // barbell lunge
  "leg-press-wide": "tj41Nu6", // sled 45° leg wide press
  "leg-press-single": "WWD6FzI", // Sled 45 Degrees Single-Leg Press
  "hack-close": "gf3ZjB9", // sled closer hack squat
  "barbell-stiff-deadlift": "hrVQWvE", // Barbell Straight-Leg Deadlift
  "db-stiff-deadlift": "oom75KC", // Dumbbell Straight-Leg Deadlift
  "leg-curl-alternate": "UXpKJoq", // Machine Lying Two-Single-Leg Curl
  "barbell-lateral-lunge": "py1HSzx", // barbell lateral lunge
  "machine-hip-extension": "OPqShYN", // Machine Hip Extension
  "calf-machine-press": "7B4F5nZ", // Machine Calf Press
  "calf-barbell-seated": "ipvgBnC", // barbell seated calf raise
  "calf-db-single": "1kB3Wmk", // dumbbell single leg calf raise
  "machine-crunch": "eXFXCY0", // Machine Seated Crunch
  "machine-twist": "sZOR9EV", // Machine Kneeling Twist
  "db-clean": "7Hg55JG", // dumbbell clean
  "db-snatch": "6pTkI99", // Dumbbell Single-Arm Snatch
};