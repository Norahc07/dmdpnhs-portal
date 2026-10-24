# Feature testing — user flows

PastraPortal (DMDPNHS Digital Portal)

Use this checklist to walk each feature the way a real user would. Mark **Pass / Fail** and note what you saw vs what you expected.

| | |
|---|---|
| Local | http://localhost:3000 |
| Live | https://dmdpnhs-portal.vercel.app |
| School year in demo | 2025–2026 |

On first visit of a login page, dismiss the **Data Privacy Act (RA 10173)** notice with **OK**.

---

## Before you start

Run these in the **Supabase SQL Editor** if they are not applied yet (order matters):

1. Base schema (profiles, students, teachers, sections, subjects)
2. `supabase/student-activation-upgrade.sql`
3. `supabase/class-record-upgrade.sql`
4. `supabase/grades-term-upgrade.sql`
5. `supabase/seed-walkthrough-demo.sql` (demo logins)
6. `supabase/section-secretary.sql`
7. `supabase/announcements.sql`
7b. `supabase/push-subscriptions.sql` (phone notification-bar alerts)
8. `supabase/student-documents.sql`
9. `supabase/evaluations-upgrade.sql` then `supabase/evaluations-v2-types.sql` then `supabase/evaluations-self-student.sql`
10. `supabase/calendar-teacher-events.sql` (if teacher class events fail to save)

Optional: `profile-upgrade.sql`, `grade-validation-upgrade.sql`, HUMSS / JHS section seeds.

If a walkthrough student LRN is missing (“Student record not found”), use another **active enrolled** learner from Registrar → Academics / Enrollment, or re-run the walkthrough seed.

---

## Demo accounts

| Role | Login page | ID | Password |
|---|---|---|---|
| Registrar | `/login/teacher` | `registrar@dmdpnhs.edu.ph` | `Registrar@2026` |
| Teacher (Ana Reyes) | `/login/teacher` | email `teacher.reyes@dmdpnhs.edu.ph` **or** Teacher ID `T26-10001` | `Teacher@2026` |
| Pending teacher | `/login/teacher` | `teacher.pending@dmdpnhs.edu.ph` | `Pending@2026` |
| Student (Juan Dela Cruz) | `/login/student` | LRN `111111111111` | `demo123` |
| Other active students | `/login/student` | LRN `222222222222` … `666666666666` | `demo123` |
| Pending student | `/login/student` | LRN `777777777777` | `demo123` |

**Class secretary** has no extra password. The adviser appoints one enrolled student in **Student Management**. That student signs in with LRN, then opens **Class secretary**.

**Parent portal is removed.** `/login/parent` should not open a parent workspace.

How to log out: sidebar **Logout** (returns to `/login`).

---

## How to record a test

For each flow:

- [ ] **Pass** — behaved as expected  
- [ ] **Fail** — write: page, steps, expected vs actual  

---

## 1. Login & accounts

**Pages:** `/login` · `/login/student` · `/login/teacher` · `/register/student` · `/register/teacher` · `/login/student/reset` · `/login/teacher/reset`

### 1.1 Login hub

1. Open `/login` (or click **Login** in the header).
2. Confirm three choices: **Student login**, **Educator login**, **Class secretary** (secretary explains there is no separate account).
3. Confirm links for **Set up a password**, **Student reset**, **Educator reset**.

Expected: hub is public; Student / Educator switch appears on the actual login forms.

### 1.2 Student login (LRN)

1. Open `/login/student`.
2. Confirm subtitle: LRN-based sign-in; secretaries use the same login.
3. Enter a 12-digit LRN and password → **Sign in**.
4. Try a wrong password → error, stay on login.

Expected: success opens `/student`. Invalid LRN/password stays on the form with a clear error.

### 1.3 Educator login

1. Open `/login/teacher`.
2. Sign in with **email + password**, then log out and sign in with **Teacher ID + password**.
3. Sign in as registrar with school email.

Expected: teacher → `/teacher`. Registrar → `/registrar`. Pending teacher → `/teacher/pending` only.

### 1.4 Password setup (register)

1. Student: `/register/student` — LRN + birthdate + new password (already enrolled by registrar).
2. Faculty: `/register/teacher` — name, email, password (min 8 characters).

Expected: student continues to personal details / activation. Faculty lands on pending approval.

### 1.5 Change password

1. Student: `/student/password` **and** Profile → **Password management**.
2. Teacher: `/teacher/password`.
3. Enter current password, new password, confirm.

Expected: success toast; next login uses the new password. Wrong current password is rejected.

### 1.6 Forgot / reset password

1. Student: `/login/student/reset` — LRN + birthdate + new password.
2. Educator: `/login/teacher/reset` — Teacher ID + registered email + new password (min 8).

Expected: student can sign in with LRN + new password. Faculty can sign in with email or Teacher ID. Registrar cannot self-reset here.

### 1.7 Logout

1. While signed in, click **Logout**.

Expected: session ends; `/login` hub. Protected URLs no longer stay open.

---

## 2. Users / access

**Role-based access and unauthorized protection.**

### 2.1 Signed-out protection

1. Sign out.
2. Open `/student`, `/teacher`, `/registrar` in the address bar.

Expected: redirect to `/login` (not the private dashboard).

### 2.2 Wrong-role protection

1. Sign in as student. Open `/teacher` and `/registrar`.
2. Sign in as teacher. Open `/student` and `/registrar`.
3. Sign in as registrar. Open `/student`.

Expected: bounce to that user’s home portal. No other role’s modules.

### 2.3 Student activation gates

1. Incomplete student: must finish `/student/activate` before the full portal.
2. Pending student: dashboard only; grades / attendance / secretary stay closed until the registrar activates.
3. Active but unassigned: dashboard/profile/calendar OK; grades/attendance/announcements wait for section enrollment.

### 2.4 Faculty approval

1. Pending teacher cannot open gradebook or attendance.
2. Registrar → **Faculty** → approve.
3. Same teacher can now use `/teacher`.

### 2.5 Registrar user tools

1. `/registrar/activations` — pending vs active learners.
2. `/registrar/teachers` — faculty list, approve/reject, department / position if grade-lock SQL is applied.
3. `/registrar/enrollment` — enrollment status.

---

## 3. Grade & sections

**Who:** Registrar (structure) · Teacher (rosters) · Student (assigned grade/section on profile)

**Pages:** `/registrar/academics` · `/registrar/enrollment` · `/teacher/students` · `/student/profile`

### 3.1 Registrar — sections and loads

1. Open **Academics**.
2. Review **subjects**, **sections** (grade, school year, strand, capacity), **teaching loads**.
3. Create or edit a section (e.g. Grade 12 HUMSS-A) if your test data allows.
4. Assign a teacher + subject to a section for SY 2025–2026.

Expected: section appears on the teacher’s **Student Management** and **Academic Records**. Student profile shows Grade Level, Section, School Year (locked).

### 3.2 Teacher — section rosters

1. Teacher → **Student Management**.
2. Open an advisory section and an assigned (non-advisory) section.
3. Confirm names, LRN, activation status.

Expected: only handled / advisory sections. Adviser can appoint a class secretary.

### 3.3 Student — sees own placement

1. Student → **Profile**.
2. Confirm **Grade level**, **Section**, **School Year** are registrar-assigned and not editable.

---

## 4. Academic records

**Pages:** `/teacher/gradebook` · `/teacher/validation` (dept head) · `/registrar/grades` · `/student/grades`

### 4.1 Teacher encodes class record

1. Teacher → **Academic Records**.
2. Open a subject + section (e.g. English · Grade 7 Rose).
3. Select term (1st / 2nd / Final).
4. Enter Written Work, Performance Task, and exam as the form allows.
5. Save. If the workflow is on, **Submit for validation**.

Expected: scores persist after refresh. Locked/published terms are not freely editable.

### 4.2 Department head / registrar lock (if SQL applied)

1. Dept head → **Validation** — endorse or return.
2. Registrar → **Grade Lock** — lock / publish.

Expected: students see published grades only when the term is unlocked for them (and after required evaluations — see Evaluations).

### 4.3 Student views records

1. Complete term evaluations if grades are gated (system + self-assessment + each subject teacher).
2. Student → **Academic Records**.
3. Switch **Class Record** vs **Grades** (published).
4. Change term in the dropdown.

Expected: only that learner’s row. Empty/locked term shows a clear message, not another student’s data.

---

## 5. Attendance

**Pages:** `/teacher/attendance` · `/student/attendance`

### 5.1 Teacher marks attendance

1. Teacher → **Attendance**.
2. Choose section, date, and subject/period if shown.
3. Mark **Present**, **Late**, **Absent**, **Excused**.
4. Save. Change one mark and save again.

Expected: roster matches the section. Updates stick after refresh.

### 5.2 Student views own attendance

1. Student → **Attendance**.
2. Review daily/period marks and totals.

Expected: own record only. Excuse-letter upload (if shown) only for **Absent** periods, PDF/image, size limit honored.

---

## 6. Class secretary

**SQL:** `section-secretary.sql`

**Pages:** `/teacher/students` · `/student/class-secretary` · `/student/class-attendance` · `/student/class-attendance/history`

### 6.1 Adviser grants access

1. Sign in as the **adviser** of a section (Ana Reyes advisory: G7 Rose / G12 HUMSS-A in demo).
2. **Student Management** → open that section.
3. Appoint one **active enrolled** student as secretary.
4. Confirm the roster badge / button shows they are secretary.
5. Remove and re-appoint to confirm only one secretary at a time.

Expected: non-advisers cannot appoint. Unassigned students cannot be secretary.

### 6.2 Secretary records attendance

1. Log out. Sign in as that student (LRN + password).
2. Dashboard banner + sidebar **Class secretary**.
3. Open **Class secretary** → **Record attendance**.
4. Mark Present / Late / Absent / Excused for the assigned section only.
5. Open **Attendance history** and edit an earlier day if the UI allows.

Expected: only that section. No gradebook, no other sections, no registrar tools.

### 6.3 Unauthorized secretary URL

1. Sign in as a student who is **not** secretary.
2. Open `/student/class-secretary`.

Expected: redirect to student home, not the secretary workspace.

---

## 7. Announcements & updates

**SQL:** `announcements.sql`

**Pages:** `/teacher/announcements` · `/student/announcements` · `/student/notifications`

### 7.1 Teacher posts

1. Teacher → **Announcements & Updates**.
2. Create a post (announcement / reminder / assignment / update).
3. Target one or more **handled sections**.
4. Optional: attach a file. Publish.

Expected: cannot target sections they do not handle.

### 7.2 Student receives post

1. Sign in as a learner in a targeted section.
2. **Announcements & Updates** — post is listed; unread if new.
3. Open the post. **Notifications** unread count drops after read.

Expected: students in other sections do not see it.

---

## 8. Calendar

**Pages:** `/student/calendar` · `/teacher/calendar` · `/registrar/calendar`  
**SQL (teacher events):** `calendar-teacher-events.sql`

### 8.1 Official DepEd dates

1. Open Calendar as student, teacher, and registrar.
2. Confirm official / school-year dates are visible (holidays, enrollment windows, etc. from the built-in DepEd calendar).

Expected: official dates are not mixed up with teacher class events.

### 8.2 Teacher class events

1. Teacher → **Calendar**.
2. Add an event for a handled section (title, date).
3. Student in that section → **Calendar** — event appears, labeled as a class/teacher event.
4. Student in another section — event does not appear.
5. Registrar → **Calendar** — can manage school-wide events if the registrar tools are shown.

---

## 9. Student portal

Walk the **Modules** then **Account** groups while signed in as an enrolled student.

| Module | Path | What to check |
|---|---|---|
| Dashboard | `/student` | Name, LRN, section, shortcuts; secretary banner if appointed |
| Academic Records | `/student/grades` | Class record + published grades |
| Attendance | `/student/attendance` | Own marks |
| Class Schedule | `/student/schedule` | Weekly timetable for assigned section |
| Announcements | `/student/announcements` | Teacher posts |
| Calendar | `/student/calendar` | Official + class events |
| Documents | `/student/requests` | Required uploads + official copy requests |
| Evaluation | `/student/evaluation` | System, self, teachers, records |
| Notifications | `/student/notifications` | Unread posts |
| Profile | `/student/profile` | Name, LRN, grade, section, SY, photo, account, password |
| Account Settings | `/student/settings` | Sign-in ID = LRN, status, shortcuts |
| Change Password | `/student/password` | Current + new password |

Also confirm: unenrolled/pending students still see dashboard/profile/calendar, but not grades/attendance/schedule/announcements.

---

## 10. Educator and student portal (layout & consistency)

Compare **sidebar + dashboard grids** so labels match.

### 10.1 Educator portal (`/teacher`)

Walk:

| Module | Path | What to check |
|---|---|---|
| Dashboard | `/teacher` | Advisory + assigned classes, module grid |
| Student Management | `/teacher/students` | Rosters, secretary (adviser) |
| Academic Records | `/teacher/gradebook` | Encode class records |
| Attendance | `/teacher/attendance` | Mark by section/period |
| Announcements | `/teacher/announcements` | Post to handled sections |
| Calendar | `/teacher/calendar` | Official + teacher events |
| Documents | `/teacher/documents` | Required uploads review + official copy list |
| Evaluation | `/teacher/evaluation` | System, sections, learners, records |
| Notifications | `/teacher/notifications` | Reminders |
| Profile / Settings / Password | `/teacher/profile` etc. | Account tools |

Dept head only: extra **Validation** item when `canValidateGrades` is true.

Registrar uses educator **login**, then a **Registrar** sidebar (`/registrar` … activations, academics, enrollment, faculty, grade lock, promotion, documents, evaluation, calendar).

### 10.2 Same feature, both sides

Pick one data change and confirm it shows on the other portal:

1. Teacher posts an announcement → student announcements + notifications.
2. Teacher marks attendance → student attendance.
3. Teacher adds a calendar event → student calendar (same section).
4. Student uploads a required document → teacher/registrar Documents review.
5. Student submits a teacher evaluation → registrar Evaluation summary counts move.

Expected: names of modules stay the same on dashboard cards and sidebar. Logout is always visible.

---

## 11. Evaluations

**SQL:** `evaluations-upgrade.sql`, `evaluations-v2-types.sql`, `evaluations-self-student.sql`

**Pages:** `/student/evaluation` · `/teacher/evaluation` · `/registrar/evaluation`

Parent evaluation must **not** appear. `/parent/evaluation` redirects away.

### 11.1 Student forms and status

1. Student → **Evaluation**.
2. Complete **System** (portal).
3. Complete **Self** (self-assessment).
4. Open **Teachers** — every subject teacher listed; submit each (1–5 + optional comment).
5. Progress card: Not submitted vs Submitted; grades stay locked until all required items are done.
6. **Evaluation records** table lists submitted forms, averages, dates.

### 11.2 Teacher → student

1. Teacher → **Evaluation**.
2. **System** (year-end portal) and **Sections** (each handled section).
3. **Learners** — each active student in handled sections shows **Not submitted** or **Submitted**.
4. Open a learner, score 1–5, submit.
5. Records table updates.

### 11.3 Registrar summary

1. `/registrar/evaluation`.
2. Counts/averages for: Student → System, Student → Teachers, Student self-assessment, Teacher → System, Teacher → Sections, Teacher → Students.

If you see a SQL hint, the evaluation scripts are not applied yet.

---

## 12. Documents

**SQL:** `student-documents.sql`

**Pages:** `/student/requests` · `/teacher/documents` · `/registrar/requests`

### 12.1 Student — required uploads

1. Student → **Documents**.
2. Status chips: **Not Submitted**, **Submitted**, **Under Review**, **Approved**, **Needs Revision**.
3. Upload PDF/JPG/PNG/WebP (max 8 MB) for PSA birth cert, report card, 2×2, parent ID (and optional SF10 / good moral).
4. After upload, status becomes **Submitted**. Approved files are locked. **Needs Revision** allows replace + shows the review note.

### 12.2 Student — official copies

1. Request **SF9**, **SF10**, or **Good Moral** with a reason.
2. Status starts **Pending**. Later: **Ready for Pickup** (SMS if configured) → **Already Claimed**.

### 12.3 Educator / registrar management

1. Teacher → **Documents** — required-document board for learners in handled sections; filter by status; **View file**; mark Under Review / Approved / Needs Revision (note required for revision).
2. Same page: official copy requests (read-only for teachers).
3. Registrar → **Documents** — all learners’ required uploads + **Ready for Pickup** / **Mark claimed** for official copies.

If the amber SQL hint appears, run `student-documents.sql` before upload/review will save.

---

## Suggested full-path smoke test (one sitting)

1. Open `/login` → student LRN login → dashboard, profile, calendar.
2. Logout → educator Teacher ID login → students, attendance, announcement, calendar event.
3. Logout → same student → see announcement, attendance, calendar event.
4. Student uploads one required document and submits evaluation **System** + **Self**.
5. Teacher reviews that document and evaluates that learner.
6. Adviser appoints secretary → that student records attendance.
7. Registrar checks Academics, Documents pipeline, Evaluation summary.
8. Signed-out visit to `/registrar` returns to login.

---

## Notes for testers

- Do not use production learner data on a shared demo.
- Change-password tests will break the printed demo password until you reset it.
- Guardian SMS for absences/grades can still send if SMS env keys are set; parent **login** should stay gone.
- Hydration/privacy overlays on local `next dev` can block clicks; dismiss **OK** and wait for the page to settle.
