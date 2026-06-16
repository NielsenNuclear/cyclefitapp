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

  "Dips (Chest-Focused)": {
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

  // ─── Upper Pull ──────────────────────────────────────────────────────────────

  "Pull-Up (Overhand)": {
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

  "Chin-Up": {
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

  "Lat Pulldown": {
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

  "Dumbbell Single-Arm Row": {
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

  // ─── Lower Quad ──────────────────────────────────────────────────────────────

  "Barbell Back Squat": {
    instructions: [
      "Set the bar across your upper traps (high bar) or rear deltoids (low bar). Unrack with a hip-width stance.",
      "Brace your core, take a big breath, and hold it (Valsalva manoeuvre).",
      "Descend by pushing knees out over toes and sitting hips back and down.",
      "Reach depth (hip crease below knee cap) then drive through your midfoot to stand.",
      "Exhale at the top. Reset breath before the next rep.",
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

  "Bulgarian Split Squat": {
    instructions: [
      "Stand 2–3 feet in front of a bench. Rest the top of your rear foot on the bench.",
      "Hold dumbbells at your sides (or barbell on back). Keep torso upright.",
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

  "Leg Press": {
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

  // ─── Lower Posterior ─────────────────────────────────────────────────────────

  "Romanian Deadlift": {
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

  "Barbell Deadlift": {
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

  "Hip Thrust (Barbell)": {
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

  "Glute Bridge": {
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

  "Hanging Leg Raise": {
    instructions: [
      "Hang from a bar with straight arms, shoulders packed down.",
      "Raise your legs (straight or bent) until hip crease reaches bar level.",
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

  "Burpee": {
    instructions: [
      "Stand tall. Drop your hands to the floor outside your feet.",
      "Jump or step your feet back into a high plank position.",
      "Perform a push-up (optional but recommended for upper body benefit).",
      "Jump or step your feet back to your hands.",
      "Jump up with arms overhead. Land softly.",
    ],
    coachingCues: [
      "Land softly on every jump",
      "Maintain a plank in the bottom position",
      "Use your arms to generate vertical momentum",
    ],
    commonMistakes: [
      "Landing with stiff knees — absorb with hips, knees, and ankles",
      "Sagging in the plank position",
      "Half-hearted jump at the top — go for full extension",
    ],
    beginnerTip: "Step feet back and forward instead of jumping to reduce impact.",
    advancedTip: "Add a box jump at the top to increase the power demand.",
  },

};

export function getCoachingData(exerciseName: string): ExerciseCoachingData | null {
  return COACHING[exerciseName] ?? null;
}
