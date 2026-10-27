export type Role = "learner" | "instructor" | "admin";
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  bio: string;
  avatar: string;
  publicProfile: boolean;
  notifications: boolean;
  onboarding: boolean;
}
export interface Instructor {
  id: string;
  userId: string;
  name: string;
  title: string;
  bio: string;
  color: string;
  initials: string;
}
export interface Lesson {
  id: string;
  title: string;
  section: string;
  minutes: number;
  content: string;
  exercise: string;
  videoUrl: string;
}
export interface Question {
  id: string;
  text: string;
  options: string[];
  correct?: number;
  explanation?: string;
}
export interface Quiz {
  id: string;
  title: string;
  passScore: number;
  questions: Question[];
}
export interface Course {
  id: string;
  title: string;
  category: string;
  instructorId: string;
  price: number;
  level: string;
  rating: number;
  students: number;
  color: string;
  art: string;
  description: string;
  language: string;
  published: boolean;
  duration: number;
  outcomes: string[];
  requirements: string[];
  lessons: Lesson[];
  quiz: Quiz;
}
export interface Filters {
  q?: string;
  category?: string;
  level?: string;
  rating?: string;
  duration?: string;
  price?: string;
  sort?: string;
}
export interface Enrollment {
  courseId: string;
  createdAt: string;
}
export interface Progress {
  lessonId: string;
  courseId: string;
  completed: boolean;
  position: number;
  updatedAt: string;
}
export interface Attempt {
  id: string;
  quizId: string;
  score: number;
  passed: boolean;
  answers: Record<string, number>;
  feedback: { id: string; correct: number; explanation: string }[];
  createdAt: string;
}
export interface Reminder {
  id: string;
  title: string;
  dueAt: string;
  description: string;
  completed: boolean;
}
export interface Message {
  id: string;
  senderId: string;
  text: string;
  createdAt: string;
  read: boolean;
}
export interface Conversation {
  id: string;
  name: string;
  subtitle: string;
  members: string[];
  messages: Message[];
}
export interface Badge {
  id: string;
  title: string;
  description: string;
  kind: string;
  threshold: number;
  awardedAt?: string;
}
export interface Certificate {
  id: string;
  courseId: string;
  courseTitle: string;
  name: string;
  issuedAt: string;
}
export interface Order {
  id: string;
  courseId: string;
  title: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  demo?: boolean;
  url?: string;
}
export interface Snapshot {
  user: User | null;
  enrollments: Enrollment[];
  progress: Progress[];
  attempts: Attempt[];
  reminders: Reminder[];
  conversations: Conversation[];
  achievements: Badge[];
  certificates: Certificate[];
  orders: Order[];
  history: string[];
}
export interface Analytics {
  users: number;
  enrollments: number;
  revenue: number;
  completion: number;
  courses: { id: string; title: string; students: number; completed: number }[];
  orders: Order[];
  usersList: User[];
  audits: { id: string; action: string; createdAt: string }[];
}
