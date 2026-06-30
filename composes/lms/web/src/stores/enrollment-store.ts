import { create } from "zustand";
import { lmsApi } from "../api/lms-client";

interface Enrollment {
  id: string;
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  status: string;
  completionPct: number;
  thumbnailUrl?: string;
}

interface EnrollmentState {
  enrollments: Enrollment[];
  activeEnrollment: Enrollment | null;
  isLoading: boolean;
  fetchEnrollments: () => Promise<void>;
  setActiveEnrollment: (enrollment: Enrollment | null) => void;
}

export const useEnrollmentStore = create<EnrollmentState>((set) => ({
  enrollments: [],
  activeEnrollment: null,
  isLoading: false,
  fetchEnrollments: async () => {
    set({ isLoading: true });
    try {
      const data: any = await lmsApi.get("/enrollments?status=active");
      set({ enrollments: data?.enrollments ?? [], isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },
  setActiveEnrollment: (enrollment) => set({ activeEnrollment: enrollment }),
}));
