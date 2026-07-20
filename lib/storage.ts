export interface RegisteredUser {
  id: string;
  email: string;
  password: string;
  fullName: string;
  age: number;
  bloodGroup: string;
  allergies: string[];
  createdAt: string;
}

export interface MedicalReport {
  id: string;
  date: string;
  category: string;
  title: string;
  doctor: string;
  description: string;
  status: 'completed' | 'pending';
}

export interface UserSession {
  userId: string;
  email: string;
  fullName: string;
  loggedInAt: string;
}

const STORAGE_KEYS = {
  REGISTERED_USER: 'lyfvault_registered_user',
  MEDICAL_REPORTS: 'lyfvault_medical_reports',
  USER_SESSION: 'lyfvault_user_session',
};

export const storage = {
  // User registration
  saveUser: (user: RegisteredUser) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.REGISTERED_USER, JSON.stringify(user));
    }
  },

  getUser: (): RegisteredUser | null => {
    if (typeof window !== 'undefined') {
      const user = localStorage.getItem(STORAGE_KEYS.REGISTERED_USER);
      return user ? JSON.parse(user) : null;
    }
    return null;
  },

  // Session management
  saveSession: (session: UserSession) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.USER_SESSION, JSON.stringify(session));
    }
  },

  getSession: (): UserSession | null => {
    if (typeof window !== 'undefined') {
      const session = localStorage.getItem(STORAGE_KEYS.USER_SESSION);
      return session ? JSON.parse(session) : null;
    }
    return null;
  },

  clearSession: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.USER_SESSION);
    }
  },

  // Medical reports
  saveMedicalReports: (reports: MedicalReport[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.MEDICAL_REPORTS, JSON.stringify(reports));
    }
  },

  getMedicalReports: (): MedicalReport[] => {
    if (typeof window !== 'undefined') {
      const reports = localStorage.getItem(STORAGE_KEYS.MEDICAL_REPORTS);
      return reports ? JSON.parse(reports) : [];
    }
    return [];
  },

  addMedicalReport: (report: MedicalReport) => {
    const reports = storage.getMedicalReports();
    reports.push(report);
    storage.saveMedicalReports(reports);
  },

  // Clear all data
  clearAll: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.REGISTERED_USER);
      localStorage.removeItem(STORAGE_KEYS.MEDICAL_REPORTS);
      localStorage.removeItem(STORAGE_KEYS.USER_SESSION);
    }
  },
};
