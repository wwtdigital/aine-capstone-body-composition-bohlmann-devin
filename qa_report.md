# QA Report — Fitness Tracking App
_Generated: 2026-05-21T04:53:43.436Z_
_Base URL: https://aine-capstone-body-composition-bohl-smoky.vercel.app_
_Viewport: 1440×900_

---

## Executive Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 3 |
| HIGH | 0 |
| MEDIUM | 2 |
| LOW | 3 |
| INFO | 0 |
| **Total** | **8** |

Screens visited: **19**
Screenshots saved to: `qa_screenshots/`

---

## CRITICAL Findings

### 1. JS error surfaced in UI: "undefined"
**Screen:** /history  
**Detail:** HistoryLast 90 daysShare weekThis Week4/7 days logged10sessions83%cal goal74%prot goal68recovery1× Cardio1× Other4× Soccer4× StrengthmealsworkoutsToday1445 cal · 102g P++11:33 PM125 cal20g P15g C1g F++++11:33 PM375 cal32g P16g C13g F++++11:31 PM445 cal25g P24g C30g F++++11:30 PM500 cal25g P65g C14g F++Today2893 cal · 238g P++2:19 PM520 cal42g P45g C19g F++++2:17 PM312 cal20g P18g C15g F++++10:26 P  
**Repro:** Navigate to /history

### 2. JS error surfaced in UI: "undefined"
**Screen:** /progress  
**Detail:** ProgressPhotos ›NutritionBody CompAsk AINutrition (7 Days)++Avg Calories1,666goal: 2,00083% of goal++++Avg Protein130ggoal: 175g74% of goal++++Today's Macro Split1,44572% of goalProtein 102gCarbs 120gFat 58g++++CaloriesFriSatSunMonTueWedThu0750150022503000Protein (g)FriSatSunMonTueWedThu060120180240++++Thu1,445calWed2,893calTue849calMon1,475calSun—Sat—Fri—++Body CompositionAddImport++Weight999999l  
**Repro:** Navigate to /progress

### 3. JS error surfaced in UI: "undefined"
**Screen:** /muscles  
**Detail:** MusclesHybrid Athlete TrackerScan Physique ›Using synthetic data — log workouts to see real recoveryRecoveryDevelopmentFrontBack++++>66% recovered33–66%<33% (fatigued)++Chest20h ago · 28% recoveredFront Delt20h ago · 42% recoveredBiceps44h ago · 92% recoveredAbs96h ago · 100% recoveredQuads8h ago · 11% recoveredHip Flexors8h ago · 11% recoveredCalves8h ago · 11% recovered++← ProgressTodayLogNutrit  
**Repro:** Navigate to /muscles


---

## HIGH Findings

_None_


---

## MEDIUM Findings

### 1. Slow page load (5727ms)
**Screen:** Dashboard / Home  
**Detail:** Page took 5727ms to settle — over the 3s threshold.  
**Repro:** Navigate to /

### 2. 1 console error(s) on page load
**Screen:** Dashboard / Home  
**Detail:** [PAGEERROR] Minified React error #418; visit https://react.dev/errors/418?args[]=text&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.  
**Repro:** Navigate to /, check DevTools console


---

## LOW Findings

### 1. No max-length enforcement on input field
**Screen:** /log  
**Detail:** Input accepted 5000 characters. May cause DB or UI issues.  
**Repro:** Go to /log, paste 5000-char string into a text input

### 2. No max-length enforcement on input field
**Screen:** /chat  
**Detail:** Input accepted 5000 characters. May cause DB or UI issues.  
**Repro:** Go to /chat, paste 5000-char string into a text input

### 3. No max-length enforcement on input field
**Screen:** /chat  
**Detail:** Input accepted 5000 characters. May cause DB or UI issues.  
**Repro:** Go to /chat, paste 5000-char string into a text input


---

## INFO

_None_


---

## Screen Log (Phase 1 Walk)

| Phase | Route | Screen | Screenshot | Anomalies |
|-------|-------|--------|------------|-----------|
| 1 | /login | Login | 01_login.png | — |
| 1 | /onboarding | Onboarding | 02_onboarding.png | — |
| 1 | / | Dashboard / Home | 03_dashboard_home.png | Slow load: 5727ms |
| 1 | /log | Log | 04_log.png | — |
| 1 | /log/workout | Log Workout | 05_log_workout.png | — |
| 1 | /training | Training | 06_training.png | — |
| 1 | /inbody | InBody | 07_inbody.png | — |
| 1 | /inbody/new | InBody New Entry | 08_inbody_new_entry.png | — |
| 1 | /inbody/import | InBody Import | 09_inbody_import.png | — |
| 1 | /progress | Progress | 10_progress.png | — |
| 1 | /progress-photos | Progress Photos | 11_progress_photos.png | — |
| 1 | /history | History | 12_history.png | — |
| 1 | /month | Month View | 13_month_view.png | — |
| 1 | /week | Week View | 14_week_view.png | — |
| 1 | /muscles | Muscles | 15_muscles.png | — |
| 1 | /gap | Gap Analysis | 16_gap_analysis.png | — |
| 1 | /gallery | Gallery | 17_gallery.png | — |
| 1 | /chat | Chat | 18_chat.png | — |
| 1 | /settings | Settings | 19_settings.png | — |
| 2 | /this-route-does-not-exist-xyz | Phase 2 Final State | phase2_final_state.png | — |

---

## Screenshots

All screenshots saved to `qa_screenshots/`:
- `01_login.png` — Login (Phase 1)
- `02_onboarding.png` — Onboarding (Phase 1)
- `03_dashboard_home.png` — Dashboard / Home (Phase 1)
- `04_log.png` — Log (Phase 1)
- `05_log_workout.png` — Log Workout (Phase 1)
- `06_training.png` — Training (Phase 1)
- `07_inbody.png` — InBody (Phase 1)
- `08_inbody_new_entry.png` — InBody New Entry (Phase 1)
- `09_inbody_import.png` — InBody Import (Phase 1)
- `10_progress.png` — Progress (Phase 1)
- `11_progress_photos.png` — Progress Photos (Phase 1)
- `12_history.png` — History (Phase 1)
- `13_month_view.png` — Month View (Phase 1)
- `14_week_view.png` — Week View (Phase 1)
- `15_muscles.png` — Muscles (Phase 1)
- `16_gap_analysis.png` — Gap Analysis (Phase 1)
- `17_gallery.png` — Gallery (Phase 1)
- `18_chat.png` — Chat (Phase 1)
- `19_settings.png` — Settings (Phase 1)
- `phase2_final_state.png` — Phase 2 Final State (Phase 2)
