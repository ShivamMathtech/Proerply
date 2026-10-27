# Screen registry

All 41 required learner screens are registered and render-tested. Routes with completion prerequisites show an eligibility or empty state until those prerequisites are met.

| # | Reference screen | Route | Component / variant |
|---|---|---|---|
| 01 | 01_Onboarding | `/onboarding/1` | `Onboarding` / 1 |
| 02 | 02_Onboarding | `/onboarding/2` | `Onboarding` / 2 |
| 03 | 03_Onboarding | `/onboarding/3` | `Onboarding` / 3 |
| 04 | 04_Onboarding | `/onboarding/4` | `Onboarding` / 4 |
| 05 | 05_Login | `/login` | `AuthPage` / login |
| 06 | 06_Sign up | `/signup` | `AuthPage` / signup |
| 07 | 07_Login Forgot Password | `/forgot-password` | `ResetFlow` / forgot |
| 08 | 08_Login_Forgot Password_Enter code | `/verify-code` | `ResetFlow` / verify |
| 09 | 09_Login_Create new password | `/reset-password` | `ResetFlow` / reset |
| 10 | 10_Enable Notification | `/notifications` | `Notifications` / default |
| 11 | 11_Home | `/home` | `Home` / default |
| 12 | 12_Explore | `/explore` | `Explore` / all |
| 13 | 13_Search | `/search` | `SearchPage` / search |
| 14 | 14_Filter | `/filters` | `SearchPage` / filters |
| 15 | 15_Result | `/results` | `SearchPage` / results |
| 16 | 16_Result_Details | `/courses/:courseId` | `CourseDetails` / default |
| 17 | 17_Pricing Plan | `/pricing` | `Pricing` / default |
| 18 | 18_Start Course | `/checkout/:courseId` | `Checkout` / default |
| 19 | 19_Payment Success | `/payment/success` | `PaymentSuccess` / default |
| 20 | 20_Add new card | `/payment/add-card` | `AddCard` / default |
| 21 | 21_Account_instructor | `/instructors/:instructorId` | `InstructorProfile` / default |
| 22 | 22_BG | `/brand` | `BackgroundPage` / default |
| 23 | 23_Explore | `/explore/paths` | `Explore` / paths |
| 24 | 24_Explore | `/explore/instructors` | `Explore` / instructors |
| 25 | 25_Ongoing Course Lesson | `/learning/:courseId/lesson/:lessonId` | `LessonPage` / lesson |
| 26 | 26_video play list | `/learning/:courseId/playlist` | `LessonPage` / playlist |
| 27 | 27_Ongoing Course Lesson | `/learning/:courseId/lesson/:lessonId/notes` | `LessonPage` / notes |
| 28 | 28_Lesson Complete | `/lesson-complete` | `LessonComplete` / default |
| 29 | 29_Test | `/quiz/:quizId` | `QuizPage` / quiz |
| 30 | 30_wrong Test | `/quiz/:quizId/results` | `QuizPage` / results |
| 31 | 31_Achieved Badge | `/achievements/:badgeId` | `Achievements` / default |
| 32 | 32_Certificate | `/certificates/:certificateId` | `CertificatePage` / default |
| 33 | 33_Course Share | `/share/:courseId` | `ShareCourse` / default |
| 34 | 34_remider | `/reminders` | `Reminders` / default |
| 35 | 35_remider | `/reminders/:reminderId` | `ReminderEditor` / default |
| 36 | 36_Reminder Complete | `/reminders/complete` | `ReminderComplete` / default |
| 37 | 37_Chat | `/chat` | `Chat` / default |
| 38 | 38_Chat | `/chat/:conversationId` | `Chat` / default |
| 39 | 39_Video Chat | `/video-chat/:conversationId` | `VideoChat` / default |
| 40 | 40_Profile | `/profile` | `Profile` / self |
| 41 | 41_Friend Profile | `/users/:userId` | `Profile` / friend |

`22_BG` is a shared visual component, with `/brand` as a preview alias. The two additional Explore routes present learning paths and instructors. Lesson screen 27 presents the reading/exercise view. Screen 30 handles both incorrect-answer review and passing results.

Additional routes: `/my-learning`, `/achievements`, `/screens`, `/about`, `/admin`, `/admin/courses/:courseId`.
