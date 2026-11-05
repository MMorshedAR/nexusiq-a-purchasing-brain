import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Language = "en" | "bn";
const STORAGE_KEY = "nexusiq.language";

const translations: Record<string, string> = {
  "Overview": "সারসংক্ষেপ",
  "AI Command Center": "এআই কমান্ড সেন্টার",
  "Demand Forecasts": "চাহিদার পূর্বাভাস",
  "Smart Reorder Planner": "স্মার্ট পুনঃঅর্ডার পরিকল্পনা",
  "Inventory Intelligence": "ইনভেন্টরি বিশ্লেষণ",
  "Supplier Intelligence": "সরবরাহকারী বিশ্লেষণ",
  "Risk & Disruption Lab": "ঝুঁকি ও বিঘ্ন বিশ্লেষণ",
  "Cash Flow Optimizer": "নগদ প্রবাহ অপ্টিমাইজার",
  "Savings & Impact": "সাশ্রয় ও প্রভাব",
  "Products": "পণ্য",
  "Suppliers": "সরবরাহকারী",
  "Warehouses": "গুদাম",
  "Purchase Orders": "ক্রয় আদেশ",
  "Data Import Center": "তথ্য আমদানি কেন্দ্র",
  "Reports & Analytics": "প্রতিবেদন ও বিশ্লেষণ",
  "Activity log": "কার্যকলাপের ইতিহাস",
  "Team & Permissions": "দল ও অনুমতি",
  "Integrations": "সংযোগসমূহ",
  "Billing & Plans": "বিলিং ও পরিকল্পনা",
  "Company Settings": "কোম্পানির সেটিংস",
  "Help": "সহায়তা",
  "Intelligence": "বিশ্লেষণ",
  "Operations": "কার্যক্রম",
  "Workspace": "কর্মক্ষেত্র",
  "Upload data": "তথ্য আপলোড",
  "Ask Nexus AI": "Nexus AI-কে জিজ্ঞাসা করুন",
  "Search pages…": "পৃষ্ঠা খুঁজুন…",
  "Jump to…": "যান…",
  "Sign out": "সাইন আউট",
  "New conversation": "নতুন কথোপকথন",
  "Team members": "দলের সদস্য",
  "Invite teammate": "সহকর্মীকে আমন্ত্রণ",
  "Download report": "প্রতিবেদন ডাউনলোড",
  "Company profile": "কোম্পানির পরিচিতি",
  "Language": "ভাষা",
};

type LanguageContextValue = { language: Language; setLanguage: (language: Language) => void; t: (text: string) => string };
const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "bn") setLanguageState(saved);
  }, []);

  const value = useMemo<LanguageContextValue>(() => ({
    language,
    setLanguage: (next) => {
      localStorage.setItem(STORAGE_KEY, next);
      setLanguageState(next);
      document.documentElement.lang = next;
    },
    t: (text) => language === "bn" ? (translations[text] ?? text) : text,
  }), [language]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useLanguage must be used inside LanguageProvider");
  return value;
}