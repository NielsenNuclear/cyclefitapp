// ─── lib/exercises/exerciseCoaching.ts ───────────────────────────────────────
// Step-by-step instructions, coaching cues, and common mistakes for key exercises.
// Keyed by exact exercise name matching exerciseLibrary.ts.
// Pure data — no React, no imports, no side effects.

export interface ExerciseCoachingData {
  instructions:   string[];
  coachingCues:   string[];
  commonMistakes: string[];
  beginnerTip?:   string;
  advancedTip?:   string;
}

const COACHING: Record<string, ExerciseCoachingData> = {

  // ─── Upper Push ──────────────────────────────────────────────────────────────

  "Barbell Bench Press (Flat)": {
    instructions: [
      "Lie on the bench with eyes under the bar. Retract and depress your scapulae into the bench.",
      "Grip the bar slightly wider than shoulder width, wrists stacked over elbows.",
      "Unrack the bar and position it directly over your lower chest.",
      "Lower the bar to your sternum under control, keeping elbows at ~75° from torso.",
      "Press the bar back up, driving your feet into the floor for leg drive.",
    ],
    coachingCues: [
      "Bend the bar like a horseshoe as you press",
      "Pull the bar apart as you lower it",
      "Drive your traps through the bench",
      "Push the ceiling away",
    ],
    commonMistakes: [
      "Flaring elbows to 90° — increases impingement risk",
      "Bouncing the bar off the chest — eliminates stretch reflex training",
      "Losing arch and scapular retraction mid-set",
      "Bar path drifting toward neck on press",
    ],
    beginnerTip: "Start with dumbbells to build shoulder stability before loading a barbell.",
    advancedTip: "Add pause reps at the chest to eliminate stretch-shortening cycle and build raw strength.",
  },

  "Barbell Overhead Press (Standing)": {
    instructions: [
      "Set the bar at collar-bone height on the rack. Grip just outside shoulder width.",
      "Unrack the bar onto your front deltoids with elbows slightly in front of the bar.",
      "Take a breath into your abdomen and brace your core hard.",
      "Press the bar straight up, moving your head back slightly to clear your chin, then forward once bar passes.",
      "Lock out overhead with ears in line with arms. Lower under control.",
    ],
    coachingCues: [
      "Squeeze your glutes at the top",
      "Push your head through at lockout",
      "Brace like you're about to take a punch",
      "Bar stays over the middle of your foot",
    ],
    commonMistakes: [
      "Excessive lumbar extension (lower back arch) — compress your ribcage",
      "Bar drifting forward off the vertical path",
      "Not locking out fully at the top",
      "Pressing with the bar too far in front of the body",
    ],
    beginnerTip: "Seated dumbbell press first — builds shoulder stability before standing barbell loading.",
    advancedTip: "Push press variations add leg drive to move heavier loads and train power transfer.",
  },

  "Push-Up (Standard)": {
    instructions: [
      "Place hands slightly wider than shoulder width. Fingers point forward or slightly out.",
      "Form a rigid plank from heels to head — no sagging hips or raised glutes.",
      "Lower your chest to 1 inch from the floor, keeping elbows at ~45° from torso.",
      "Push the floor away explosively to full arm extension.",
    ],
    coachingCues: [
      "Screw your hands into the floor",
      "Imagine pushing the floor away from you",
      "Body is a rigid plank throughout",
      "Protract your shoulder blades at the top",
    ],
    commonMistakes: [
      "Hips sagging — causes lumbar compression",
      "Head drooping forward — neutral spine required",
      "Elbow flare to 90° — increases shoulder stress",
      "Partial range — chest must approach floor",
    ],
    beginnerTip: "Use an incline (hands on bench) to reduce bodyweight percentage until standard push-up is achievable.",
    advancedTip: "Archer push-ups or weighted vest push-ups increase difficulty without equipment.",
  },

  "Incline Push-Up": {
    instructions: [
      "Place hands on a bench or elevated surface, slightly wider than shoulder width.",
      "Step back so your body forms a straight plank line from head to heels.",
      "Lower your chest toward the surface, keeping elbows at ~45°.",
      "Push back to full extension, protracting the shoulder blades at the top.",
    ],
    coachingCues: [
      "Body stays rigid — resist the urge to pike at the hips",
      "Lower chest to surface, not your chin",
      "Screw your hands outward into the surface",
    ],
    commonMistakes: [
      "Piking hips up — removes the core demand",
      "Partial range on the descent",
      "Looking down instead of slightly forward",
    ],
    beginnerTip: "The higher the surface, the easier. Progress by lowering the surface over time.",
  },

  "Seated Dumbbell Shoulder Press": {
    instructions: [
      "Sit upright on a bench with back support. Hold dumbbells at shoulder height, palms forward.",
      "Brace your core. Press the dumbbells overhead until arms are fully extended.",
      "At the top, don't clink the bells together — keep slight tension on the deltoids.",
      "Lower under control back to shoulder height.",
    ],
    coachingCues: [
      "Keep your lower back against the pad",
      "Don't lock out completely — maintain tension",
      "Elbows track slightly in front of the plane of your torso",
    ],
    commonMistakes: [
      "Arching the lower back excessively — compresses lumbar",
      "Pressing behind the head — increases impingement risk",
      "Using too heavy a weight and relying on body sway",
    ],
    beginnerTip: "Seated removes the stability demand of standing — good first shoulder press variation.",
    advancedTip: "Arnold press adds rotation to hit all three deltoid heads.",
  },

  "Barbell Incline Bench Press": {
    instructions: [
      "Set bench to 30–45°. Lie back with eyes under the bar.",
      "Grip slightly wider than shoulder width. Retract and depress scapulae.",
      "Lower bar to upper chest / clavicle area under control.",
      "Press back up along the same path, maintaining scapular position.",
    ],
    coachingCues: [
      "Drive your upper back through the pad",
      "Keep the bar over your upper chest",
      "Pull the bar apart on the way down",
    ],
    commonMistakes: [
      "Angle too steep (>45°) — shifts load entirely to deltoids",
      "Bar touching too low on the chest",
      "Losing scapular retraction mid-rep",
    ],
    beginnerTip: "Incline dumbbell press teaches the movement with less shoulder stress.",
    advancedTip: "30° is optimal for upper pec activation — avoid the 45° angle that mimics a shoulder press.",
  },

  "Dumbbell Incline Press": {
    instructions: [
      "Set bench to 30–45°. Sit on the edge, dumbbells on thighs.",
      "Kick the dumbbells up as you lie back, positioning them at chest level.",
      "Press the dumbbells up and slightly inward, stopping short of touching at the top.",
      "Lower under control, feeling a stretch through the upper chest.",
    ],
    coachingCues: [
      "Let the dumbbells travel in a slight arc, not straight up",
      "Keep elbows slightly below shoulder level",
      "Retract your shoulder blades before each rep",
    ],
    commonMistakes: [
      "Touching the dumbbells at the top — eliminates tension",
      "Flaring the elbows out to 90°",
      "Not reaching the chest-level stretch at the bottom",
    ],
    beginnerTip: "Lighter load than flat press — your upper chest is a smaller muscle group.",
  },

  "Dips (Chest-Forward Lean)": {
    instructions: [
      "Grip parallel bars, arms straight. Lean your torso forward ~15–30°.",
      "Lower by bending elbows, keeping them slightly flared out.",
      "Descend until upper arm is parallel to floor or slight stretch in chest.",
      "Push back to full lockout.",
    ],
    coachingCues: [
      "Lean forward to load the chest",
      "Keep elbows tracking back, not out wide",
      "Full lockout at the top",
    ],
    commonMistakes: [
      "Staying upright — shifts load to triceps, not chest",
      "Going too deep with tight shoulders — risks injury",
      "Shrugging at the top instead of depressing scapulae",
    ],
    beginnerTip: "Assisted dip machine or resistance band support while you build strength.",
    advancedTip: "Add weight via belt or dumbbell between feet for progressive overload.",
  },

  "Weighted Dips": {
    instructions: [
      "Attach a weight plate or dumbbell via a dip belt. Grip parallel bars.",
      "Lean forward slightly to emphasise the chest, or stay upright for tricep focus.",
      "Lower under control to upper arm parallel. Press back to full lockout.",
    ],
    coachingCues: [
      "Control the descent — the weight amplifies momentum",
      "Depress your scapulae before each rep",
      "Don't shrug at the top",
    ],
    commonMistakes: [
      "Going too deep with heavy load — places excessive stress on the shoulder capsule",
      "Swinging the weight",
      "Incomplete lockout at the top",
    ],
    advancedTip: "Combine with bodyweight failure sets (strip the weight and continue) for maximum volume.",
  },

  "Close-Grip Barbell Bench Press": {
    instructions: [
      "Lie on a flat bench. Grip the bar with hands ~shoulder-width (narrower than standard bench).",
      "Unrack the bar and hold it over your lower chest.",
      "Lower the bar to the lower sternum, keeping elbows tucked close to the torso.",
      "Press back to full extension. Elbows stay close throughout.",
    ],
    coachingCues: [
      "Elbows stay tight to your sides throughout",
      "Keep your wrists stacked directly over elbows",
      "Think: tricep press, not chest press",
    ],
    commonMistakes: [
      "Grip too narrow (hands touching) — creates wrist strain",
      "Elbows flaring out — takes load off the triceps",
      "Bar touching the belly button region",
    ],
    beginnerTip: "This is one of the best compound tricep builders — don't neglect it for isolation work.",
  },

  "Dumbbell Lateral Raise (Standing)": {
    instructions: [
      "Stand with dumbbells at your sides, slight forward lean at the hips (~10°).",
      "Raise your arms laterally to shoulder height, leading with your elbows.",
      "At the top, tilt the front of the dumbbell slightly down (like pouring water).",
      "Lower under control — resist gravity on the eccentric.",
    ],
    coachingCues: [
      "Lead with your elbows, not your hands",
      "Slight forward lean shifts load onto the lateral deltoid",
      "Don't shrug your traps — keep them depressed",
    ],
    commonMistakes: [
      "Using too much weight and swinging — removes the deltoid stimulus",
      "Going above shoulder height — shifts load to traps",
      "Dropping the dumbbells quickly — the eccentric is half the work",
    ],
    beginnerTip: "Start very light — 5kg per hand is challenging for most beginners.",
    advancedTip: "Cable lateral raises provide constant tension throughout the range of motion.",
  },

  // ─── Upper Pull ──────────────────────────────────────────────────────────────

  "Lat Pulldown (Wide Grip)": {
    instructions: [
      "Sit at the machine with thighs locked under the pad. Grip just outside shoulder width.",
      "Lean back slightly (~10–15°) and depress your scapulae.",
      "Pull the bar to your upper chest, driving elbows down and back.",
      "Control the bar back to full arm extension.",
    ],
    coachingCues: [
      "Pull the bar to your chest, not your neck",
      "Initiate with your lats — think 'elbows to pockets'",
      "Stay tall — don't collapse the spine",
    ],
    commonMistakes: [
      "Using a behind-the-neck path — cervical spine risk",
      "Leaning back too far — becomes a row, not a pulldown",
      "Not reaching full extension at the top",
    ],
    beginnerTip: "Use lighter loads to focus on feeling the lat activation before adding weight.",
    advancedTip: "Straight-arm pulldowns isolate the lats without bicep involvement.",
  },

  "Seated Cable Row (Neutral Grip)": {
    instructions: [
      "Sit upright at the cable row station, feet braced, knees slightly bent.",
      "Grip the neutral-grip (palms facing each other) handle.",
      "Retract your scapulae first, then row the handle to your lower sternum.",
      "Pause at the peak contraction, then let the cable pull your arms back to full extension.",
    ],
    coachingCues: [
      "Squeeze your shoulder blades together at the peak",
      "Keep your torso still — no swinging",
      "Elbows track close to your sides",
    ],
    commonMistakes: [
      "Leaning back to start the row — uses momentum instead of muscles",
      "Shrugging the shoulders on the pull",
      "Not reaching full extension at the end of each rep",
    ],
    beginnerTip: "Neutral grip is easier on the wrists and shoulders than a pronated grip.",
    advancedTip: "Tempo rows (3s eccentric) maximise lat time under tension.",
  },

  "Pull-Up (Bodyweight)": {
    instructions: [
      "Hang from bar with overhand grip, hands ~shoulder width or slightly wider.",
      "Depress and retract scapulae before initiating the pull.",
      "Drive elbows toward your hips, pulling your chest toward the bar.",
      "Chin clears the bar at the top. Lower under control to full hang.",
    ],
    coachingCues: [
      "Pull your elbows to your pockets",
      "Initiate with your lats, not your arms",
      "Squeeze your shoulder blades together at the top",
      "Stay long in the bottom — don't go slack",
    ],
    commonMistakes: [
      "Kipping when training for strength — removes the eccentric",
      "Pulling with biceps only — neglects lat activation",
      "Not reaching full extension at the bottom",
      "Head jutting forward at the top",
    ],
    beginnerTip: "Use a band for assistance, or do ring rows/lat pulldowns to build the prerequisite strength.",
    advancedTip: "Weighted pull-ups (belt) or L-sit pull-ups increase difficulty significantly.",
  },

  "Chin-Up (Bodyweight)": {
    instructions: [
      "Hang from bar with supinated (underhand) grip, hands shoulder width.",
      "Engage core and depress scapulae. Pull your chest to the bar.",
      "Lower under control to full extension.",
    ],
    coachingCues: [
      "Curl your elbows toward your hips",
      "Lead with your chest, not your chin",
      "Squeeze at the top before lowering",
    ],
    commonMistakes: [
      "Elbows flaring out wide instead of tracking toward hips",
      "Partial range on the descent",
      "Using momentum to get reps",
    ],
    beginnerTip: "Supinated grip allows more bicep contribution, making this slightly easier than pull-up.",
    advancedTip: "Slow the eccentric to 3–5 seconds to maximise muscle damage and hypertrophy stimulus.",
  },

  "Weighted Pull-Up": {
    instructions: [
      "Attach weight via a dip belt. Hang from the bar with overhand grip.",
      "Depress scapulae, then drive elbows toward your hips to pull up.",
      "Chin clears the bar. Lower under full control.",
    ],
    coachingCues: [
      "Control the descent — the added weight amplifies the eccentric",
      "Don't rush the bottom — maintain scapular depression",
      "Pull your chest to the bar, not just your chin",
    ],
    commonMistakes: [
      "Adding weight before mastering 10+ clean bodyweight reps",
      "Swinging due to the hanging weight",
      "Neglecting the full eccentric",
    ],
    advancedTip: "Cluster sets (brief rests within a set) allow more total volume at a given weight.",
  },

  "Barbell Bent-Over Row": {
    instructions: [
      "Stand with feet hip-width. Hinge at the hips to ~45°, keeping back flat.",
      "Grip the bar just outside shoulder width (overhand or underhand).",
      "Row the bar to your lower sternum / upper abdomen, driving elbows past your torso.",
      "Lower under control. Maintain hip hinge throughout — no torso bouncing.",
    ],
    coachingCues: [
      "Keep your chest up and back flat throughout",
      "Pull your elbows behind your body",
      "Squeeze your shoulder blades together at the top",
      "Push your hips back before rowing",
    ],
    commonMistakes: [
      "Excessive torso swing — turns it into a momentum exercise",
      "Bar touching belly button instead of lower sternum",
      "Losing hip hinge — torso becoming upright",
      "Not fully retracting scapulae at the top",
    ],
    beginnerTip: "Dumbbell rows allow you to brace against a bench, isolating one side at a time.",
    advancedTip: "Pendlay rows (dead-stop each rep from floor) increase power demand and eliminate momentum.",
  },

  "Dumbbell Single-Arm Row (Bench-Supported)": {
    instructions: [
      "Place one knee and same-side hand on a bench. Opposite foot flat on floor.",
      "Hold dumbbell with free hand, arm extended. Keep back flat.",
      "Row the dumbbell to your hip, driving elbow past torso.",
      "Lower fully. Avoid rotating the torso.",
    ],
    coachingCues: [
      "Pull your elbow to the ceiling",
      "Keep your chest parallel to the bench",
      "Think: 'start the lawn mower'",
    ],
    commonMistakes: [
      "Rotating the torso to complete the rep",
      "Not reaching full arm extension at the bottom",
      "Shrugging the shoulder instead of retracting the scapula",
    ],
    beginnerTip: "Great starting point for back training — no balance or complex setup required.",
    advancedTip: "Kroc rows (high rep, controlled cheat) with heavier loads build grip and lat mass.",
  },

  "Dumbbell Row (Standing, Braced)": {
    instructions: [
      "Hold one dumbbell. Place the non-working hand on a rack or wall for support.",
      "Hinge at the hips with back flat, torso close to horizontal.",
      "Row the dumbbell to your hip, driving the elbow past the torso.",
      "Lower fully and repeat. Switch sides.",
    ],
    coachingCues: [
      "Elbow stays close to your body on the pull",
      "Keep your back flat — don't let it round for range",
      "Retract the scapula at the top, don't just pull with the arm",
    ],
    commonMistakes: [
      "Using the hip or torso to swing the weight",
      "Partial range of motion at the bottom",
      "Letting the shoulder shrug instead of retracting",
    ],
  },

  "T-Bar Row": {
    instructions: [
      "Straddle the landmine or T-bar station. Hinge to ~45° with a flat back.",
      "Grip the close-grip handle or V-bar. Pull the bar to your lower chest.",
      "Squeeze your shoulder blades together at the top.",
      "Lower under control to full arm extension.",
    ],
    coachingCues: [
      "Chest stays up — don't round for more range",
      "Drive your elbows back, not just the handle up",
      "Maintain the hip hinge throughout the set",
    ],
    commonMistakes: [
      "Loading the bar too heavy and turning it into a body swing",
      "Rounding the lower back under fatigue",
      "Short range of motion — let the weight stretch your lats",
    ],
    advancedTip: "Chest-supported version removes lower back fatigue and isolates the mid-back.",
  },

  "Cable Face Pull (Rope)": {
    instructions: [
      "Set the cable at upper-chest to face height. Grip the rope with an overhand grip.",
      "Step back to create tension. Stand tall with a slight forward lean.",
      "Pull the rope to your face, separating the ends toward your ears.",
      "At the peak, your hands should be beside your ears, elbows flared high.",
      "Return to full extension under control.",
    ],
    coachingCues: [
      "Pull to your face, not your neck",
      "Flare your elbows high — think 'double bicep pose'",
      "Retract and depress scapulae throughout",
    ],
    commonMistakes: [
      "Pulling too low — misses the rear delt and external rotators",
      "Using too much weight and turning it into a row",
      "Not separating the rope ends at the peak",
    ],
    beginnerTip: "Essential for shoulder health — the face pull trains external rotation that most pressing neglects.",
    advancedTip: "Add a momentary isometric hold at the peak to increase time under tension.",
  },

  "Band Pull-Apart": {
    instructions: [
      "Hold a light resistance band with both hands at shoulder width, arms extended at chest height.",
      "Pull the band apart by moving hands outward until the band touches your chest.",
      "Squeeze your shoulder blades together at the end range.",
      "Return slowly under tension.",
    ],
    coachingCues: [
      "Keep your arms straight throughout",
      "Lead with your elbows, not your hands",
      "Squeeze the shoulder blades at the end of each rep",
    ],
    commonMistakes: [
      "Using a band too heavy — causes cheating with torso",
      "Bending the elbows instead of keeping arms straight",
      "Going too fast — the eccentric is important",
    ],
    beginnerTip: "Do 20–30 reps with a light band before pressing sessions as a shoulder health primer.",
  },

  // ─── Lower Quad ──────────────────────────────────────────────────────────────

  "Goblet Squat": {
    instructions: [
      "Hold a dumbbell or kettlebell at chest height, cupping the top weight.",
      "Stand feet shoulder-width, toes turned out slightly.",
      "Squat down, keeping elbows inside your knees at the bottom.",
      "Drive through your heels to stand fully.",
    ],
    coachingCues: [
      "Keep the weight tight to your chest",
      "Elbows push knees open at the bottom",
      "Sit tall — chest up, long spine",
    ],
    commonMistakes: [
      "Weight drifting away from chest — collapses torso",
      "Not reaching depth — sit until hips are at knee level",
      "Heels rising off the floor",
    ],
    beginnerTip: "The goblet squat is the single best teaching tool for squat mechanics.",
    advancedTip: "Holding a heavier kettlebell teaches the body how to maintain position under load.",
  },

  "Barbell Back Squat (High Bar)": {
    instructions: [
      "Set the bar across your upper traps. Grip just outside shoulder width to create a shelf.",
      "Unrack with a hip-width stance, toes turned out ~30°.",
      "Brace your core, take a big breath, and hold it (Valsalva manoeuvre).",
      "Descend by pushing knees out over toes and sitting hips back and down.",
      "Reach depth (hip crease below kneecap) then drive through your midfoot to stand.",
    ],
    coachingCues: [
      "Push the floor apart with your feet",
      "Chest up, elbows down",
      "Knees track over your pinky toe",
      "Stand up through your heels",
    ],
    commonMistakes: [
      "Knees caving inward (valgus collapse) — cue knees out",
      "Forward torso lean — often caused by tight ankles or weak upper back",
      "Butt wink at depth — stop just above where pelvis rotates",
      "Rising onto toes — shift weight to midfoot/heel",
    ],
    beginnerTip: "Goblet squat first — the counterbalance teaches torso position and depth.",
    advancedTip: "Pause squats (2–3s at bottom) eliminate the bounce and expose true strength weaknesses.",
  },

  "Barbell Back Squat (Low Bar)": {
    instructions: [
      "Place the bar lower, resting on your rear deltoids rather than upper traps.",
      "Grip wider to create a stable shelf. More forward lean than high bar.",
      "Squat with a wider stance, hinging more at the hip to keep bar over midfoot.",
      "Drive through your whole foot, keeping chest up throughout.",
    ],
    coachingCues: [
      "Bar stays over midfoot throughout the lift",
      "Push knees out in line with toes",
      "Maintain back angle — don't let chest fall forward",
    ],
    commonMistakes: [
      "Bar creeping up toward the neck — loses the low bar position",
      "Not adjusting stance width — low bar requires a wider stance",
      "Letting the hips rise faster than the chest",
    ],
    advancedTip: "Low bar allows more weight but requires greater hip mobility and hip flexor flexibility.",
  },

  "Dumbbell Bulgarian Split Squat": {
    instructions: [
      "Stand 2–3 feet in front of a bench. Rest the top of your rear foot on the bench.",
      "Hold dumbbells at your sides. Keep torso upright.",
      "Lower your rear knee toward the floor until front thigh is parallel.",
      "Drive through the heel of your front foot to stand.",
    ],
    coachingCues: [
      "Front shin stays vertical",
      "Drive the front knee out over the pinky toe",
      "Stay tall — don't lean forward",
    ],
    commonMistakes: [
      "Front foot too close to bench — creates excessive knee forward travel",
      "Torso tilting forward — usually means glutes or hip flexors need work",
      "Hip hiking on the working side",
    ],
    beginnerTip: "Use bodyweight only initially — this is a balance-intensive movement.",
    advancedTip: "Front foot elevated on a plate increases range of motion and quad depth.",
  },

  "Hack Squat (Machine)": {
    instructions: [
      "Step into the machine, shoulders under the pads. Feet shoulder-width on the platform.",
      "Unhinge the safety handles. Lower the sled by bending your knees deeply.",
      "Keep your back flat against the pad throughout.",
      "Drive through your heels to press back up, stopping just short of lockout.",
    ],
    coachingCues: [
      "Keep your heels flat on the platform",
      "Don't let your lower back peel off the pad",
      "Control the descent — don't free-fall",
    ],
    commonMistakes: [
      "Feet too high — reduces quad activation",
      "Locking out fully — removes tension",
      "Losing back contact with the pad",
    ],
    advancedTip: "High-foot placement targets glutes and hamstrings more than quads.",
  },

  "Leg Press (Machine)": {
    instructions: [
      "Sit in the machine with your back fully against the pad.",
      "Place feet shoulder-width on the platform, toes slightly out.",
      "Lower the platform by bending your knees toward your chest, heels flat.",
      "Press back to just short of lockout (keep tension on the muscle).",
    ],
    coachingCues: [
      "Heels stay flat on the platform",
      "Knees track over second toe",
      "Don't let your lower back peel off the pad",
    ],
    commonMistakes: [
      "Locking out fully — removes tension and stresses the joint",
      "Too shallow depth — stay at or below 90° for full quad stimulus",
      "Heels rising off the platform",
    ],
    beginnerTip: "Higher foot placement targets glutes and hamstrings. Lower foot placement targets quads.",
    advancedTip: "Single-leg press addresses strength imbalances between sides.",
  },

  "Walking Lunge (Dumbbell)": {
    instructions: [
      "Hold dumbbells at your sides. Stand tall with feet together.",
      "Step forward and lower your rear knee toward the floor.",
      "Front shin stays vertical; torso stays upright.",
      "Drive off the front foot and step the rear foot forward to begin the next rep.",
    ],
    coachingCues: [
      "Keep your torso tall — don't lean forward",
      "Front knee stays behind your toes",
      "Step with control — don't crash onto the knee",
    ],
    commonMistakes: [
      "Knee caving inward on the front leg",
      "Torso collapsing forward — squeeze your glutes",
      "Steps too short — rear knee must approach the floor",
    ],
    beginnerTip: "Static lunges (stepping in place) first before introducing the walking pattern.",
  },

  "Reverse Lunge (Dumbbell)": {
    instructions: [
      "Stand tall with dumbbells at sides. Step one foot back and lower your rear knee toward the floor.",
      "Front thigh approaches parallel. Keep front shin vertical.",
      "Drive through the front heel to return to standing. Alternate legs.",
    ],
    coachingCues: [
      "Step back far enough that the front shin stays vertical",
      "Keep your torso upright throughout",
      "Control the descent — don't drop into it",
    ],
    commonMistakes: [
      "Step not far enough back — creates forward knee travel",
      "Leaning heavily forward at the torso",
      "Rear heel touching the floor (it should float)",
    ],
    beginnerTip: "Reverse lunge is more knee-friendly than forward lunge — better for beginners.",
  },

  "Barbell Front Squat": {
    instructions: [
      "Rest the bar on your front deltoids with elbows high and parallel to the floor.",
      "Cross-grip or clean grip — keep elbows up regardless.",
      "Squat straight down, maintaining an upright torso and high elbows.",
      "Drive out of the bottom, keeping elbows up throughout.",
    ],
    coachingCues: [
      "Elbows high — if they drop, the bar rolls forward",
      "Squat into the hole, not back into it",
      "Stay tall — front squat demands more ankle flexibility than back squat",
    ],
    commonMistakes: [
      "Elbows dropping — causes the bar to roll and the torso to collapse forward",
      "Insufficient ankle mobility causing heels to rise",
      "Too forward lean — if this happens, build ankle mobility first",
    ],
    beginnerTip: "Use a cross-grip (arms crossed) until wrist flexibility allows a full clean grip.",
    advancedTip: "Front squat trains a more upright torso than back squat — excellent for quad isolation.",
  },

  // ─── Lower Posterior ─────────────────────────────────────────────────────────

  "Barbell Romanian Deadlift": {
    instructions: [
      "Stand holding barbell at hip width, shoulder-width overhand grip.",
      "Push your hips back and hinge forward, keeping a flat back. Knees soft.",
      "Lower the bar along your thighs until you feel a stretch in your hamstrings.",
      "Drive your hips forward to stand. Squeeze glutes at the top.",
    ],
    coachingCues: [
      "Push your hips to the wall behind you",
      "Bar stays in contact with your legs throughout",
      "Maintain a long neutral spine",
      "Hamstrings stretch, not lower back",
    ],
    commonMistakes: [
      "Rounding the lower back — keep the spine neutral",
      "Bar drifting away from the body",
      "Squatting instead of hinging — keep a minimal knee bend",
      "Not feeling the hamstring stretch — probably not hinging far enough back",
    ],
    beginnerTip: "Practice the hip hinge with a dowel rod along your spine before adding load.",
    advancedTip: "Deficit RDLs (standing on plates) increase hamstring stretch range.",
  },

  "Romanian Deadlift (Dumbbell)": {
    instructions: [
      "Hold two dumbbells in front of your thighs, palms facing your body.",
      "Hinge at the hips, sending them back while keeping a flat back. Knees slightly bent.",
      "Lower the dumbbells along your legs until you feel a strong hamstring stretch.",
      "Drive hips forward to return to standing. Squeeze glutes at the top.",
    ],
    coachingCues: [
      "Dumbbells stay close to your shins throughout",
      "Push your hips back as far as possible",
      "Neutral spine — not a rounded lower back stretch",
    ],
    commonMistakes: [
      "Dumbbells drifting too far from the body",
      "Bending the knees too much — turns it into a squat",
      "Rounding the back — this should be felt in the hamstrings, not the lumbar spine",
    ],
    beginnerTip: "Dumbbell version allows a more natural bar path and is easier to learn than barbell.",
  },

  "Conventional Deadlift": {
    instructions: [
      "Stand with shins ~1 inch from the bar, feet hip-width.",
      "Hip hinge to grip just outside your knees. Pull the slack out of the bar.",
      "Take a big breath, brace hard. Push the floor away (don't think 'pull').",
      "Hips and shoulders rise at the same rate. Bar stays over midfoot.",
      "Lock out by driving hips through, squeezing glutes.",
    ],
    coachingCues: [
      "Push the floor away through your heels",
      "Protect your armpits — bar stays close",
      "Hips and shoulders rise together",
      "Think: 'leg press the floor'",
    ],
    commonMistakes: [
      "Bar drifting forward off the midfoot path",
      "Hips shooting up first — turns it into a stiff-leg deadlift",
      "Rounding the upper back at the start",
      "Jerking the bar off the floor instead of pulling slack out first",
    ],
    beginnerTip: "Romanian deadlift and trap bar deadlift are excellent learning progressions.",
    advancedTip: "Touch-and-go versus dead-stop reps train different qualities — use both.",
  },

  "Sumo Deadlift": {
    instructions: [
      "Set a wide stance with toes pointing out significantly (~45–60°). Bar over mid-foot.",
      "Reach down and grip the bar inside your legs. Torso more upright than conventional.",
      "Drive your knees out over your toes as you push the floor away.",
      "Lock out by driving hips through at the top.",
    ],
    coachingCues: [
      "Drive your knees out — actively push them toward your elbows",
      "Stay over the bar — don't let it drift forward",
      "Hip-width stance on the hips, not just the feet",
    ],
    commonMistakes: [
      "Knees caving inward off the floor — cue them out hard",
      "Torso too horizontal — sumo should be more upright than conventional",
      "Stance not wide enough to allow the upright torso",
    ],
    advancedTip: "Sumo can be mechanically more efficient for lifters with longer torsos or shorter arms.",
  },

  "Trap Bar Deadlift": {
    instructions: [
      "Stand inside the trap bar with feet hip-width. Grip the handles.",
      "Hip hinge to grip level, chest up, back flat.",
      "Drive through your feet to stand, keeping the bar close.",
      "Lock out by squeezing glutes at the top.",
    ],
    coachingCues: [
      "Think: squat down to grab, then push the floor away",
      "Keep your chest up throughout",
      "Torso angle is between a squat and a deadlift",
    ],
    commonMistakes: [
      "Treating it exactly like a conventional deadlift — the trap bar allows more quad involvement",
      "Hips rising faster than the chest at the start",
      "Not achieving full hip extension at the top",
    ],
    beginnerTip: "Trap bar deadlift is the most beginner-friendly deadlift variation — great entry point.",
  },

  "Good Morning (Barbell)": {
    instructions: [
      "Place bar on upper traps, same as back squat. Stand hip-width.",
      "With a slight knee bend, hinge forward at the hip, maintaining a completely flat back.",
      "Lower until your torso is roughly parallel to the floor (or hamstrings pull).",
      "Drive hips forward to return to standing.",
    ],
    coachingCues: [
      "Hinge from the hip, not the waist",
      "Think of it as an RDL with the bar on your back",
      "Keep the bar pressed hard into your traps throughout",
    ],
    commonMistakes: [
      "Rounding the lower back — highly dangerous at this moment",
      "Treating it as a back exercise instead of a hip hinge",
      "Going too heavy — technique must be perfect",
    ],
    advancedTip: "Excellent for building hip hinge strength in a posterior chain-dominant pattern.",
  },

  "Nordic Hamstring Curl": {
    instructions: [
      "Kneel on a pad with feet secured under a pad or by a partner.",
      "Lower your torso toward the floor as slowly as possible, resisting with your hamstrings.",
      "Catch yourself with your hands at the bottom, then use arms to push back to start.",
      "Gradually reduce the arm assistance as strength improves.",
    ],
    coachingCues: [
      "Fight the descent — the eccentric IS the exercise",
      "Keep your hips extended — don't sit back",
      "Squeeze your glutes throughout",
    ],
    commonMistakes: [
      "Dropping quickly with no hamstring tension",
      "Hips flexing instead of staying extended",
      "Returning entirely via arm push without any hamstring assistance",
    ],
    beginnerTip: "Even the eccentric-only version (lowering with full arm assistance on the way up) has enormous benefit.",
    advancedTip: "One of the most effective hamstring injury prevention exercises in sport science.",
  },

  "Single-Leg Romanian Deadlift (Dumbbell)": {
    instructions: [
      "Hold one or two dumbbells. Stand on one foot with a soft knee bend.",
      "Hinge forward at the hip, extending the non-working leg straight behind you for balance.",
      "Lower until torso is roughly parallel and you feel the hamstring stretch.",
      "Drive the hip forward to return to standing.",
    ],
    coachingCues: [
      "Keep your hips square — resist the urge to open the hip of the raised leg",
      "Maintain a flat back throughout",
      "Reach the back leg long — it counterbalances your torso",
    ],
    commonMistakes: [
      "Hip opening on the raised side — sign of hip tightness",
      "Bending the standing knee too much — reduces the hinge",
      "Looking down — leads the chest to drop",
    ],
    beginnerTip: "Place your non-working foot lightly on the floor beside you until balance improves.",
  },

  "Barbell Hip Thrust": {
    instructions: [
      "Sit on the floor with your upper back against a bench. Roll the barbell over your hips.",
      "Feet flat on the floor, shoulder-width apart, toes slightly out.",
      "Drive through your heels to thrust your hips up until your body is flat.",
      "Squeeze your glutes hard at the top for 1 second. Lower under control.",
    ],
    coachingCues: [
      "Drive through your heels, not your toes",
      "Posterior pelvic tilt at the top — tuck your pelvis",
      "Chin tucked — avoid hyperextending your neck",
    ],
    commonMistakes: [
      "Feet too far away — shifts load to hamstrings, not glutes",
      "Not achieving full hip extension at the top",
      "Ribcage flaring at lockout — indicates over-extension",
    ],
    beginnerTip: "Bodyweight hip thrust or glute bridge first to learn the movement.",
    advancedTip: "Banded hip thrust adds resistance at the top where hip extension is at its weakest.",
  },

  "Glute Bridge (Bodyweight)": {
    instructions: [
      "Lie on your back, feet flat, knees bent at ~90°.",
      "Drive through your heels to lift your hips off the floor.",
      "Squeeze your glutes at the top. Lower under control.",
    ],
    coachingCues: [
      "Drive through your heels",
      "Posterior pelvic tilt at the top",
      "Keep your core engaged",
    ],
    commonMistakes: [
      "Pushing through the toes instead of heels",
      "Not reaching full hip extension",
      "Letting the hips drop too fast on the eccentric",
    ],
    beginnerTip: "This is the foundational glute activation exercise — master it before hip thrusting.",
    advancedTip: "Single-leg glute bridge increases the challenge and reveals side imbalances.",
  },

  // ─── Core ─────────────────────────────────────────────────────────────────────

  "Plank (Standard)": {
    instructions: [
      "Place forearms on the floor, elbows under shoulders. Feet together.",
      "Create a rigid plank from head to heels — no sagging or raised hips.",
      "Breathe slowly and consistently. Hold the position.",
    ],
    coachingCues: [
      "Pull your elbows toward your toes without moving",
      "Squeeze your glutes and quads",
      "Push your heels back against an imaginary wall",
    ],
    commonMistakes: [
      "Hips sagging — compresses the lumbar spine",
      "Hips raised into a pike — reduces the demand",
      "Holding breath instead of breathing steadily",
    ],
    beginnerTip: "Knee plank reduces load until you can hold a full plank for 30+ seconds.",
    advancedTip: "RKC plank — contract every muscle simultaneously while maintaining position.",
  },

  "Dead Bug": {
    instructions: [
      "Lie on your back. Raise arms straight to ceiling. Raise knees to 90°.",
      "Press your lower back flat into the floor throughout.",
      "Slowly extend one arm and the opposite leg toward the floor simultaneously.",
      "Return and alternate sides. Back must stay flat at all times.",
    ],
    coachingCues: [
      "Lower back must stay glued to the floor",
      "Exhale as you extend the limbs",
      "Move slowly — this is a control exercise",
    ],
    commonMistakes: [
      "Lower back arching off the floor — reduce range of motion",
      "Moving too fast — reduces motor control demand",
      "Moving same-side arm and leg (ipsilateral) instead of cross-body",
    ],
    beginnerTip: "Start by just extending one leg at a time while holding both arms up.",
    advancedTip: "Add a resistance band between your knees for additional core demand.",
  },

  "Bird Dog": {
    instructions: [
      "Start in a quadruped position — hands under shoulders, knees under hips.",
      "Brace your core. Simultaneously extend one arm forward and the opposite leg back.",
      "Hold for 1–2 seconds at full extension, then return under control.",
      "Alternate sides without rocking the hips.",
    ],
    coachingCues: [
      "Keep your hips level — no rotation",
      "Think long: reach your hand forward and your heel back",
      "Don't hyperextend the lower back at full extension",
    ],
    commonMistakes: [
      "Hip rotation when extending the leg",
      "Rushing the movement — this is a stability exercise",
      "Looking up instead of keeping the spine neutral",
    ],
    beginnerTip: "Start by extending just the leg, then just the arm, before combining.",
  },

  "Side Plank (Standard)": {
    instructions: [
      "Lie on your side. Place the bottom forearm on the floor, elbow under shoulder.",
      "Stack your feet or offset them for balance. Lift your hips off the floor.",
      "Create a straight line from head to feet. Hold.",
    ],
    coachingCues: [
      "Push your hip toward the ceiling",
      "Don't let your top hip sag back behind you",
      "Brace your core like you're about to be punched from the side",
    ],
    commonMistakes: [
      "Hips sagging toward the floor",
      "Top hip rotating backward",
      "Holding breath — breathe steadily",
    ],
    beginnerTip: "Knee-supported side plank (bottom knee on floor) reduces the load to build up.",
    advancedTip: "Side plank with hip abduction (raising the top leg) increases the lateral chain demand.",
  },

  "Hollow Body Hold": {
    instructions: [
      "Lie on your back. Press your lower back into the floor.",
      "Raise your legs to ~45° and your shoulder blades off the floor, arms extended overhead.",
      "Hold this 'banana' shape with maximum core tension.",
    ],
    coachingCues: [
      "Lower back stays pressed to the floor — if it lifts, raise your legs",
      "Keep your ribs compressed downward",
      "Arms and legs stay long",
    ],
    commonMistakes: [
      "Lower back arching off the floor — the most common error",
      "Legs too low before the core is strong enough to support them",
      "Shoulder blades not lifted off the floor",
    ],
    beginnerTip: "Start with knees bent at 90° and arms at sides, then progressively extend both.",
    advancedTip: "Hollow body rock (slow rocking forward and back) increases the dynamic demand.",
  },

  "Ab Wheel Rollout (Kneeling)": {
    instructions: [
      "Kneel on a mat, both hands gripping the ab wheel.",
      "Brace your core hard. Roll forward, extending your arms and lowering your body toward the floor.",
      "Extend as far as you can maintain a neutral spine, then pull back to the start.",
    ],
    coachingCues: [
      "Round the lower back slightly — don't hyperextend",
      "Breathe out on the rollout, brace on the pull-back",
      "Don't touch your chest to the floor — return before that point",
    ],
    commonMistakes: [
      "Hyperextending the lower back at full extension — high injury risk",
      "Hips breaking into flexion on the return",
      "Going beyond your current strength level",
    ],
    beginnerTip: "Roll to a wall — it stops you at a safe range while building strength.",
    advancedTip: "Standing ab wheel rollout is one of the most advanced core exercises.",
  },

  "Pallof Press (Standing)": {
    instructions: [
      "Set a cable at chest height. Stand sideways to the cable, feet shoulder-width.",
      "Grip the handle at your sternum. Brace your core.",
      "Press the handle straight out in front of you, resisting the rotational pull.",
      "Hold for 1–2 seconds at full extension. Return to start.",
    ],
    coachingCues: [
      "Don't let the cable pull you toward it — stay square",
      "Brace as if someone is about to punch you in the stomach",
      "Keep your shoulders square to the front",
    ],
    commonMistakes: [
      "Rotating toward the cable at full extension",
      "Using too much weight and losing the anti-rotation quality",
      "Feet too close together — reduces stability base",
    ],
    beginnerTip: "Kneeling version is more stable and easier to learn before standing.",
    advancedTip: "Pallof press with a pause and slow eccentric maximises the anti-rotation training effect.",
  },

  "Cable Crunch (Kneeling)": {
    instructions: [
      "Kneel facing a cable machine with the rope handle at upper-cable height.",
      "Grip the rope and hold it beside your head or at your temples.",
      "Flex your spine — crunch your sternum toward your hips.",
      "Pause at the bottom, then control the return.",
    ],
    coachingCues: [
      "Round your spine — this is not a hip flexion exercise",
      "Keep hips stationary — movement should happen in the spine",
      "Contract from the top of the abs, not just the bottom",
    ],
    commonMistakes: [
      "Hinging at the hips instead of crunching the spine",
      "Pulling with the arms — the hands just hold the rope, abs do the work",
      "Not holding the peak contraction",
    ],
    advancedTip: "Weighted cable crunches can build significant core thickness when done correctly.",
  },

  "Hanging Straight-Leg Raise": {
    instructions: [
      "Hang from a bar with straight arms, shoulders packed down.",
      "Raise your legs (straight) until hip crease reaches bar level.",
      "Lower under control without swinging.",
    ],
    coachingCues: [
      "Initiate by posteriorly tilting your pelvis",
      "Control the eccentric — don't drop",
      "Pack your shoulders down before you lift",
    ],
    commonMistakes: [
      "Swinging the legs — eliminates core isolation",
      "Using only hip flexors rather than tilting the pelvis",
      "Partial range — go past 90°",
    ],
    beginnerTip: "Lying leg raises or knee raises in a captain's chair are effective regressions.",
    advancedTip: "Toes-to-bar (full range to touch the bar) is the advanced progression.",
  },

  "Hanging Knee Raise": {
    instructions: [
      "Hang from a bar with straight arms, shoulders packed.",
      "Raise your knees toward your chest, posteriorly tilting your pelvis at the top.",
      "Lower under control without swinging.",
    ],
    coachingCues: [
      "Tuck your pelvis at the top to engage the abs, not just the hip flexors",
      "Control the descent",
      "Don't swing to generate momentum",
    ],
    commonMistakes: [
      "Pure hip flexion with no pelvic tilt — mostly hip flexors, not abs",
      "Swinging the body",
      "Dropping the legs quickly on the eccentric",
    ],
    beginnerTip: "Good regression from hanging leg raises — builds the same pattern with less demand.",
  },

  // ─── Full Body ────────────────────────────────────────────────────────────────

  "Kettlebell Swing (Two-Hand)": {
    instructions: [
      "Stand with feet shoulder-width, kettlebell ~1 foot in front.",
      "Hike the kettlebell back between your legs — hip hinge, not squat.",
      "Drive your hips explosively forward, propelling the bell to shoulder height.",
      "Let the bell swing back, immediately hinging your hips back to absorb it.",
    ],
    coachingCues: [
      "Hike it back like a football snap",
      "Hips drive the bell — not your arms",
      "Squeeze your glutes explosively at the top",
      "Think: hinge, not squat",
    ],
    commonMistakes: [
      "Squatting instead of hinging — makes it a squat exercise, not a hip hinge",
      "Pulling the bell up with the arms",
      "Letting the lower back round on the hike-back",
    ],
    beginnerTip: "Romanian deadlift practice and box hinge drills build the movement pattern first.",
    advancedTip: "Single-arm swing or double kettlebell swing increases demand significantly.",
  },

  "Box Jump": {
    instructions: [
      "Stand facing the box, feet hip-width. Dip slightly and swing your arms back.",
      "Explode upward, swinging arms forward to assist the jump.",
      "Land softly on the box with both feet, absorbing through hips, knees, and ankles.",
      "Stand tall on the box, then step (not jump) down one foot at a time.",
    ],
    coachingCues: [
      "Land as softly as possible — minimal sound",
      "Full triple extension at takeoff: ankles, knees, hips",
      "Land in an athletic position — hips back, knees out",
    ],
    commonMistakes: [
      "Jumping down off the box — high Achilles tendon injury risk",
      "Landing with stiff knees — transmits force rather than absorbing it",
      "Box too high for current ability — reduces jump mechanics",
    ],
    beginnerTip: "Start with a low box (30–40cm) to master the landing mechanics first.",
    advancedTip: "Depth jump (stepping off a box and immediately jumping) trains reactive strength.",
  },

  "Farmers Carry (Heavy, Bilateral)": {
    instructions: [
      "Pick up two heavy dumbbells, kettlebells, or farmer's carry handles.",
      "Stand tall: shoulders back and down, core braced, head neutral.",
      "Walk with short, deliberate steps for the prescribed distance or time.",
      "Set the implements down under control.",
    ],
    coachingCues: [
      "Walk tall — resist the implements pulling you forward or sideways",
      "Keep your shoulders level and packed",
      "Breathe in 3–5 step cycles — don't hold your breath",
    ],
    commonMistakes: [
      "Leaning forward or to one side",
      "Letting the shoulders shrug up",
      "Taking long, unstable strides instead of short controlled steps",
    ],
    beginnerTip: "Even a moderate load for distance is highly effective — no need to go maximum weight.",
    advancedTip: "Trap bar carries allow heavier loads and teach similar patterns to the trap bar deadlift.",
  },

  "Kettlebell Turkish Get-Up": {
    instructions: [
      "Lie on your back, kettlebell pressed overhead in one hand. Keep your eyes on the bell throughout.",
      "Roll to your elbow on the same side, then press up to your hand.",
      "Sweep the opposite leg back into a kneeling position.",
      "Stand up fully. Reverse the sequence to return to the floor.",
    ],
    coachingCues: [
      "Eyes on the bell at all times",
      "Keep the elbow of the pressing arm locked throughout",
      "Move slowly and deliberately — this is a movement quality exercise",
    ],
    commonMistakes: [
      "Rushing any portion of the movement",
      "Elbow bending during the transitions",
      "Looking away from the bell",
    ],
    beginnerTip: "Learn the movement with a shoe balanced on your fist before adding any weight.",
    advancedTip: "The Turkish get-up is one of the most comprehensive movement assessments available.",
  },

  // ─── Mobility ─────────────────────────────────────────────────────────────────

  "World's Greatest Stretch": {
    instructions: [
      "Start in a half-kneeling lunge position with your right foot forward.",
      "Place both hands on the floor inside your right foot.",
      "Rotate your right arm to the ceiling, following it with your eyes.",
      "Return your hand to the floor. Then drop your right elbow toward the floor inside your foot.",
      "Finally, push your hips back to straighten the front leg and stretch the hamstring.",
      "Repeat on the other side.",
    ],
    coachingCues: [
      "Follow your hand with your eyes on the rotation",
      "Keep your back knee up if possible",
      "Breathe into each position — don't force it",
    ],
    commonMistakes: [
      "Rushing through the sequence — take 2–3 seconds in each position",
      "Not getting the elbow all the way to the floor",
      "Rounding the back in the hamstring stretch portion",
    ],
    beginnerTip: "Perform 5 reps per side as a warm-up before any compound lower body session.",
    advancedTip: "Adding a thoracic rotation at the top to each rep increases the spinal mobility demand.",
  },

};

export function getCoachingData(exerciseName: string): ExerciseCoachingData | null {
  return COACHING[exerciseName] ?? null;
}
