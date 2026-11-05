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
  "Invite teammate": "সহকর্মীকে আমন্ত্রণ",
  "Download report": "প্রতিবেদন ডাউনলোড",
  "Company profile": "কোম্পানির পরিচিতি",
  "Language": "ভাষা",
  "Invitation link": "আমন্ত্রণের লিংক",
  "Copy invite link": "আমন্ত্রণের লিংক কপি করুন",
  "Save changes": "পরিবর্তন সংরক্ষণ",
  "Current plan": "বর্তমান পরিকল্পনা",
  "Monthly budget": "মাসিক বাজেট",
  "Company name": "কোম্পানির নাম",
  "Country": "দেশ",
  "Currency": "মুদ্রা",
  "No records in this report yet.": "এই প্রতিবেদনে এখনো কোনো তথ্য নেই।",
  "Download CSV": "CSV ডাউনলোড",
  "Download Excel": "Excel ডাউনলোড",
  "Preferences": "পছন্দসমূহ",
  "Workspace settings": "কর্মক্ষেত্রের সেটিংস",
  "Profile & preferences": "প্রোফাইল ও পছন্দসমূহ",
  "Company workspace": "কোম্পানির কর্মক্ষেত্র",
  "Team role": "দলের ভূমিকা",
  "Pending invitations": "অমীমাংসিত আমন্ত্রণ",
  "Resend invite": "আমন্ত্রণ আবার পাঠান",
  "Cancel invite": "আমন্ত্রণ বাতিল করুন",
  "Notifications": "বিজ্ঞপ্তি",
  "Loading notifications…": "বিজ্ঞপ্তি লোড হচ্ছে…",
  "Notifications could not be loaded.": "বিজ্ঞপ্তি লোড করা যায়নি।",
  "You're all caught up.": "নতুন কোনো বিজ্ঞপ্তি নেই।",
  "Only Owners and Admins can update these details.": "শুধু Owner ও Admin এই তথ্য পরিবর্তন করতে পারবেন।",
  "Choose the language shown in the app.": "অ্যাপে প্রদর্শিত ভাষা নির্বাচন করুন।",
  "Workspace details and personal language preferences.": "কর্মক্ষেত্রের তথ্য ও ব্যক্তিগত ভাষার পছন্দ।",
  "Only workspace editors can update these details.": "শুধু কর্মক্ষেত্রের সম্পাদকরা এই তথ্য পরিবর্তন করতে পারবেন।",
  "Owner": "মালিক",
  "Admin": "অ্যাডমিন",
  "Manager": "ম্যানেজার",
  "Analyst": "বিশ্লেষক",
  "Viewer": "দর্শক",
  "Create invite": "আমন্ত্রণ তৈরি করুন",
  "New chat": "নতুন চ্যাট",
  "Saved chats": "সংরক্ষিত চ্যাট",
  "Your saved conversations will appear here.": "আপনার সংরক্ষিত কথোপকথন এখানে দেখা যাবে।",
  "Loading report data…": "প্রতিবেদনের তথ্য লোড হচ্ছে…",
  "Could not load report data": "প্রতিবেদনের তথ্য লোড করা যায়নি",
  "Inventory": "ইনভেন্টরি",
  "Purchase orders": "ক্রয় আদেশ",
  "Report": "প্রতিবেদন",
  "File type": "ফাইলের ধরন",
  "English": "ইংরেজি",
  "Bangla": "বাংলা",
  "Invitation created and link copied.": "আমন্ত্রণ তৈরি হয়েছে এবং লিংক কপি করা হয়েছে।",
  "Team role updated.": "দলের ভূমিকা হালনাগাদ হয়েছে।",
  "Invitation cancelled.": "আমন্ত্রণ বাতিল হয়েছে।",
  "Manage who can access this company workspace.": "এই কোম্পানির কর্মক্ষেত্রে কারা প্রবেশ করতে পারবেন তা পরিচালনা করুন।",
  "members": "সদস্য",
  "Team members could not be loaded.": "দলের সদস্যদের লোড করা যায়নি।",
  "No team members found.": "কোনো দলের সদস্য পাওয়া যায়নি।",
  "Invite a teammate": "একজন সহকর্মীকে আমন্ত্রণ জানান",
  "Create a secure link to share with the invited email address.": "আমন্ত্রিত ইমেইল ঠিকানায় পাঠানোর জন্য নিরাপদ লিংক তৈরি করুন।",
  "Email address": "ইমেইল ঠিকানা",
  "Creating…": "তৈরি হচ্ছে…",
  "pending": "অমীমাংসিত",
  "Invitations could not be loaded.": "আমন্ত্রণগুলো লোড করা যায়নি।",
  "No active invitations.": "কোনো সক্রিয় আমন্ত্রণ নেই।",
  "Role for": "ভূমিকা",
  "member": "সদস্য",
  "Only workspace Owners and Admins can create invitations or change member roles.": "শুধু কর্মক্ষেত্রের Owner ও Admin আমন্ত্রণ তৈরি বা সদস্যদের ভূমিকা পরিবর্তন করতে পারবেন।",
  "Invitation could not be accepted.": "আমন্ত্রণ গ্রহণ করা যায়নি।",
  "You are not a member of that workspace.": "আপনি ওই কর্মক্ষেত্রের সদস্য নন।",
  "That invitation has expired. Ask the workspace admin for a new link.": "আমন্ত্রণটির মেয়াদ শেষ। নতুন লিংকের জন্য কর্মক্ষেত্রের অ্যাডমিনকে বলুন।",
  "This invitation is no longer available.": "এই আমন্ত্রণটি আর ব্যবহার করা যাবে না।",
  "This invitation was sent to a different email address.": "এই আমন্ত্রণটি অন্য ইমেইল ঠিকানায় পাঠানো হয়েছে।",
  "Download live workspace records as CSV or Excel.": "কর্মক্ষেত্রের বর্তমান তথ্য CSV বা Excel হিসেবে ডাউনলোড করুন।",
  "Download": "ডাউনলোড",
  "Preparing report…": "প্রতিবেদন তৈরি হচ্ছে…",
};

type LanguageContextValue = { language: Language; setLanguage: (language: Language) => void; t: (text: string) => string };
const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "bn") {
      setLanguageState(saved);
      document.documentElement.lang = saved;
    }
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