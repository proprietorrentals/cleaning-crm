"use client";

import { createContext, useContext, useState } from "react";
import { demoAfterPhotos, demoChecklist } from "@/lib/demo-fixtures";

const STORAGE_KEY = "serviceos.demo.session";
const SESSION_TTL_MS = 1000 * 60 * 90;

type DemoSessionData = {
  quoteApproved: boolean;
  jobScheduled: boolean;
  invoicePaid: boolean;
  employeeClockedIn: boolean;
  employeeJobStarted: boolean;
  employeeJobCompleted: boolean;
  employeeClockedOut: boolean;
  selectedAfterPhotos: string[];
  uploadedAfterPhotos: string[];
  jobNote: string;
  checklist: Record<string, boolean>;
};

type StoredDemoSession = {
  expiresAt: number;
  data: DemoSessionData;
};

type DemoSessionContextValue = {
  data: DemoSessionData;
  updateSession: (patch: Partial<DemoSessionData>) => void;
  updateChecklist: (id: string, checked: boolean) => void;
  addUploadedAfterPhoto: (url: string) => void;
  useSimulatedAfterPhotos: () => void;
  resetDemo: () => void;
};

const DemoSessionContext = createContext<DemoSessionContextValue | null>(null);

function getDefaultChecklist() {
  return demoChecklist.reduce<Record<string, boolean>>((acc, item) => {
    acc[item.id] = item.defaultChecked;
    return acc;
  }, {});
}

function createDefaultSession(): DemoSessionData {
  return {
    quoteApproved: false,
    jobScheduled: false,
    invoicePaid: false,
    employeeClockedIn: false,
    employeeJobStarted: false,
    employeeJobCompleted: false,
    employeeClockedOut: false,
    selectedAfterPhotos: [],
    uploadedAfterPhotos: [],
    jobNote: "",
    checklist: getDefaultChecklist(),
  };
}

function readStoredSession() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as StoredDemoSession;
    if (!parsed.expiresAt || Date.now() > parsed.expiresAt) {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed.data;
  } catch {
    window.sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function persistSession(data: DemoSessionData) {
  if (typeof window === "undefined") {
    return;
  }

  const payload: StoredDemoSession = {
    expiresAt: Date.now() + SESSION_TTL_MS,
    data,
  };

  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function DemoSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [data, setData] = useState<DemoSessionData>(() => {
    const stored = readStoredSession();
    if (stored) {
      return stored;
    }
    const fresh = createDefaultSession();
    persistSession(fresh);
    return fresh;
  });

  const updateSession = (patch: Partial<DemoSessionData>) => {
    setData((current) => {
      const next = { ...current, ...patch };
      persistSession(next);
      return next;
    });
  };

  const updateChecklist = (id: string, checked: boolean) => {
    setData((current) => {
      const next = {
        ...current,
        checklist: {
          ...current.checklist,
          [id]: checked,
        },
      };
      persistSession(next);
      return next;
    });
  };

  const addUploadedAfterPhoto = (url: string) => {
    setData((current) => {
      const next = {
        ...current,
        uploadedAfterPhotos: [...current.uploadedAfterPhotos, url],
      };
      persistSession(next);
      return next;
    });
  };

  const useSimulatedAfterPhotos = () => {
    setData((current) => {
      const next = {
        ...current,
        selectedAfterPhotos: demoAfterPhotos,
      };
      persistSession(next);
      return next;
    });
  };

  const resetDemo = () => {
    const fresh = createDefaultSession();
    setData(fresh);
    persistSession(fresh);
  };

  const value: DemoSessionContextValue = {
    data,
    updateSession,
    updateChecklist,
    addUploadedAfterPhoto,
    useSimulatedAfterPhotos,
    resetDemo,
  };

  return (
    <DemoSessionContext.Provider value={value}>
      {children}
    </DemoSessionContext.Provider>
  );
}

export function useDemoSession() {
  const context = useContext(DemoSessionContext);
  if (!context) {
    throw new Error("useDemoSession must be used within DemoSessionProvider");
  }
  return context;
}
