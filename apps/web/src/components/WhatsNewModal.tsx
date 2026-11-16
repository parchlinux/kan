import { useEffect, useState } from "react";
import { t } from "@lingui/core/macro";
import {
  HiOutlineSparkles,
  HiOutlineLanguage,
  HiOutlineCodeBracketSquare,
  HiOutlineAdjustmentsHorizontal,
  HiOutlineDocumentText,
  HiOutlineUserGroup,
  HiXMark,
  HiCheck,
} from "react-icons/hi2";
import Button from "~/components/Button";

interface WhatsNewModalProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

const STORAGE_KEY = "parch_kanban_whats_new_seen_v2";

export function WhatsNewModal({ forceOpen = false, onClose }: WhatsNewModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
      return;
    }
    const hasSeen = localStorage.getItem(STORAGE_KEY);
    if (!hasSeen) {
      setIsOpen(true);
    }
  }, [forceOpen]);

  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsOpen(false);
    if (onClose) onClose();
  };

  if (!isOpen) return null;

  const features = [
    {
      icon: HiOutlineLanguage,
      title: "پشتیبانی کامل از زبان فارسی و راست‌به‌چپ (RTL)",
      desc: "ترجمه روان تمام بخش‌ها، فرم‌ها، تنظیمات و تاریخچه فعالیت‌ها به همراه چینش طبیعی متون و المان‌ها.",
      tag: "بومی‌سازی",
      color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800",
    },
    {
      icon: HiOutlineSparkles,
      title: "فونت رسمی و زیبای استعداد (Estedad)",
      desc: "تنظیم فونت استعداد به عنوان فونت پیش‌فرض کل سیستم بدون نیاز به اتصال اینترنت برای سرعت لود حداکثری.",
      tag: "تایپوگرافی",
      color: "text-blue-500 bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800",
    },
    {
      icon: HiOutlineCodeBracketSquare,
      title: "همگام‌سازی دوطرفه با گیت‌هاب پارچ",
      desc: "وب‌هوک هوشمند: ساخت خودکار کارت با باز شدن Issue و انتقال به ستون Done با بسته شدن آن در گیت‌هاب.",
      tag: "اتوماسیون",
      color: "text-purple-500 bg-purple-50 dark:bg-purple-950/50 border-purple-200 dark:border-purple-800",
    },
    {
      icon: HiOutlineAdjustmentsHorizontal,
      title: "فیلترهای پیشرفته مهندسی پارچ",
      desc: "فیلتر فوری بر اساس معماری (x86_64 و aarch64)، محیط دسکتاپ (Hyprland, KDE, GNOME) و باگ‌های مسدودکننده.",
      tag: "مهندسی",
      color: "text-amber-500 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800",
    },
    {
      icon: HiOutlineDocumentText,
      title: "خروجی‌گیر خودکار Release Notes",
      desc: "تولید چنج‌لاگ انتشار به فرمت مارک‌داون با یک کلیک از روی کارت‌های تکمیل‌شده برای گیت‌هاب و فروم پارچ.",
      tag: "انتشار ایزو",
      color: "text-cyan-500 bg-cyan-50 dark:bg-cyan-950/50 border-cyan-200 dark:border-cyan-800",
    },
    {
      icon: HiOutlineUserGroup,
      title: "سیستم تیم‌ها، پروژه‌ها و پنل مدیریت پارچ",
      desc: "مدیریت گروه‌های کاری تخصصی، مایلستون‌های انتشار و داشبورد مرکزی مدیریت برای لید پارچ.",
      tag: "استودیو پارچ",
      color: "text-rose-500 bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-light-300 bg-white shadow-2xl dark:border-dark-400 dark:bg-dark-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-light-200 bg-light-50/70 px-6 py-4 dark:border-dark-300 dark:bg-dark-200/50">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md">
              <HiOutlineSparkles className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-dark-1000">
                ویژگی‌های جدید کان‌بان پارچ‌لینوکس
              </h2>
              <p className="text-xs text-light-700 dark:text-dark-700">
                نسخه هاردفورک اختصاصی استودیوی مهندسی پارچ (Parch Studio)
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-1 text-light-700 hover:bg-light-200 dark:text-dark-800 dark:hover:bg-dark-300 transition-colors"
          >
            <HiXMark className="h-5 w-5" />
          </button>
        </div>

        {/* Body list of features */}
        <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto p-6">
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={idx}
                className="flex items-start gap-3.5 rounded-xl border border-light-200 bg-light-50/40 p-4 transition-all hover:border-emerald-300 hover:bg-white dark:border-dark-300 dark:bg-dark-200/30 dark:hover:border-emerald-700 dark:hover:bg-dark-200/70"
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${feat.color}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-bold text-neutral-900 dark:text-dark-1000">
                      {feat.title}
                    </h3>
                    <span className="rounded-full bg-light-200 px-2 py-0.5 text-[10px] font-medium text-light-800 dark:bg-dark-300 dark:text-dark-800">
                      {feat.tag}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-light-700 dark:text-dark-700">
                    {feat.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-light-200 bg-light-50/50 px-6 py-4 dark:border-dark-300 dark:bg-dark-200/30">
          <span className="text-[11px] text-light-600 dark:text-dark-600">
            توسعه‌یافته با افتخار برای جامعه پارچ‌لینوکس
          </span>
          <Button onClick={handleClose}>
            <span className="flex items-center gap-1.5 px-3">
              <HiCheck className="h-4 w-4" />
              <span>متوجه شدم</span>
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}
