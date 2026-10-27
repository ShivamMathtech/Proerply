import type {
  User,
  Course,
  Instructor,
  Filters,
  Enrollment,
  Progress,
  Quiz,
  Attempt,
  Reminder,
  Conversation,
  Message,
  Certificate,
  Badge,
  Order,
  Snapshot,
  Analytics,
} from "../types";
export interface AuthService {
  login(email: string, password: string): Promise<User>;
  register(name: string, email: string, password: string): Promise<User>;
  logout(): Promise<void>;
  session(): Promise<User | null>;
  forgot(email: string): Promise<{ message: string }>;
  verify(email: string, code: string): Promise<{ token: string }>;
  reset(token: string, password: string): Promise<void>;
}
export interface CourseService {
  listCourses(filters?: Filters): Promise<Course[]>;
  getCourse(id: string): Promise<Course>;
  instructors(): Promise<Instructor[]>;
  categories(): Promise<string[]>;
}
export interface SearchService {
  history(): Promise<string[]>;
  remember(query: string): Promise<void>;
  clear(): Promise<void>;
}
export interface EnrollmentService {
  list(): Promise<Enrollment[]>;
  enroll(courseId: string): Promise<Enrollment>;
}
export interface LearningProgressService {
  list(): Promise<Progress[]>;
  update(
    lessonId: string,
    data: { completed?: boolean; position?: number },
  ): Promise<Progress>;
}
export interface QuizService {
  get(id: string): Promise<Quiz>;
  submit(id: string, answers: Record<string, number>): Promise<Attempt>;
  attempts(): Promise<Attempt[]>;
}
export interface PaymentService {
  checkout(id: string): Promise<Order>;
  orders(): Promise<Order[]>;
}
export interface ReminderService {
  list(): Promise<Reminder[]>;
  save(data: Omit<Reminder, "id">, id?: string): Promise<Reminder>;
  remove(id: string): Promise<void>;
}
export interface ChatService {
  list(): Promise<Conversation[]>;
  send(id: string, text: string): Promise<Message>;
  read(id: string): Promise<void>;
  start(userId: string): Promise<Conversation>;
}
export interface ProfileService {
  get(): Promise<User | null>;
  update(data: Partial<User>): Promise<User>;
  public(
    id: string,
  ): Promise<{ user: Partial<User>; certificates: Certificate[] }>;
}
export interface CertificateService {
  list(): Promise<Certificate[]>;
  achievements(): Promise<Badge[]>;
}
export interface NotificationService {
  save(enabled: boolean): Promise<User>;
}
export interface AdminService {
  analytics(): Promise<Analytics>;
  courses(): Promise<Course[]>;
  saveCourse(data: Course): Promise<Course>;
  setRole(id: string, role: string): Promise<User>;
  saveCategory(name: string): Promise<string[]>;
  saveInstructor(data: Instructor): Promise<Instructor>;
  saveBadge(data: Badge): Promise<Badge>;
  badges(): Promise<Badge[]>;
  moderate(conversationId: string, messageId: string): Promise<void>;
}
export interface Services {
  auth: AuthService;
  courses: CourseService;
  search: SearchService;
  enrollments: EnrollmentService;
  progress: LearningProgressService;
  quizzes: QuizService;
  payments: PaymentService;
  reminders: ReminderService;
  chat: ChatService;
  profile: ProfileService;
  certificates: CertificateService;
  notifications: NotificationService;
  admin: AdminService;
  snapshot(): Promise<Snapshot>;
  resetDemo(): Promise<void>;
}
