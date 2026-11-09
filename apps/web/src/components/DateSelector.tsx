import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { useMemo, useState } from "react";
import { HiChevronLeft, HiChevronRight } from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

import {
  gregorianToJalali,
  jalaliToGregorian,
  PERSIAN_MONTH_NAMES,
} from "~/utils/helpers";

interface DateSelectorProps {
  selectedDate?: Date | null;
  onDateSelect?: (date: Date | undefined) => void;
  weekStartsOn?: 0 | 1 | 6;
}

const PERSIAN_DAY_HEADERS = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

export default function DateSelector({
  selectedDate,
  onDateSelect,
  weekStartsOn = 1,
}: DateSelectorProps) {
  const [isJalali, setIsJalali] = useState(false);

  // Gregorian Month State
  const [currentMonth, setCurrentMonth] = useState(() => {
    return selectedDate ? startOfMonth(selectedDate) : startOfMonth(new Date());
  });

  // Jalali Month & Year State
  const [jalaliDate, setJalaliDate] = useState(() => {
    const base = selectedDate ?? new Date();
    const [jy, jm] = gregorianToJalali(
      base.getFullYear(),
      base.getMonth() + 1,
      base.getDate(),
    );
    return { year: jy, month: jm };
  });

  // Gregorian Day Headers & Days
  const gregDayHeaders = useMemo(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn });
    return eachDayOfInterval({
      start: weekStart,
      end: new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000),
    }).map((date) => format(date, "EEEEEE"));
  }, [weekStartsOn]);

  const gregDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn });

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd }).map(
      (date) => {
        const dateString = format(date, "yyyy-MM-dd");
        return {
          id: dateString,
          displayNumber: date.getDate(),
          isToday: isToday(date),
          isSelected: selectedDate ? isSameDay(date, selectedDate) : false,
          isCurrentMonth: date >= monthStart && date <= monthEnd,
          dateObj: date,
        };
      },
    );
  }, [currentMonth, selectedDate, weekStartsOn]);

  // Jalali Days Calculation
  const jalaliDays = useMemo(() => {
    const { year: jy, month: jm } = jalaliDate;
    // Days in month
    let daysInMonth = 30;
    if (jm <= 6) {
      daysInMonth = 31;
    } else if (jm === 12) {
      // Check leap year for Jalali
      const [gy1] = jalaliToGregorian(jy, 12, 30);
      const [jyCheck] = gregorianToJalali(gy1, 3, 20);
      daysInMonth = jyCheck === jy ? 30 : 29;
    }

    // Day of week of first day (Saturday=0, Sunday=1, ..., Friday=6)
    const [gy, gm, gd] = jalaliToGregorian(jy, jm, 1);
    const firstDate = new Date(gy, gm - 1, gd);
    const firstDayOfWeek = (firstDate.getDay() + 1) % 7;

    const list: {
      id: string;
      displayNumber: number | string;
      isToday: boolean;
      isSelected: boolean;
      isCurrentMonth: boolean;
      dateObj: Date | null;
    }[] = [];

    // Empty padding slots
    for (let i = 0; i < firstDayOfWeek; i++) {
      list.push({
        id: `pad-${i}`,
        displayNumber: "",
        isToday: false,
        isSelected: false,
        isCurrentMonth: false,
        dateObj: null,
      });
    }

    // Month days
    for (let day = 1; day <= daysInMonth; day++) {
      const [gYear, gMonth, gDay] = jalaliToGregorian(jy, jm, day);
      const dateObj = new Date(gYear, gMonth - 1, gDay);
      list.push({
        id: `${jy}-${jm}-${day}`,
        displayNumber: day,
        isToday: isToday(dateObj),
        isSelected: selectedDate ? isSameDay(dateObj, selectedDate) : false,
        isCurrentMonth: true,
        dateObj,
      });
    }

    return list;
  }, [jalaliDate, selectedDate]);

  const handlePrev = () => {
    if (isJalali) {
      setJalaliDate((prev) => {
        if (prev.month === 1) {
          return { year: prev.year - 1, month: 12 };
        }
        return { ...prev, month: prev.month - 1 };
      });
    } else {
      setCurrentMonth(subMonths(currentMonth, 1));
    }
  };

  const handleNext = () => {
    if (isJalali) {
      setJalaliDate((prev) => {
        if (prev.month === 12) {
          return { year: prev.year + 1, month: 1 };
        }
        return { ...prev, month: prev.month + 1 };
      });
    } else {
      setCurrentMonth(addMonths(currentMonth, 1));
    }
  };

  const handleDateClick = (date: Date | null, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!date) return;
    if (selectedDate && isSameDay(date, selectedDate)) {
      onDateSelect?.(undefined);
    } else {
      onDateSelect?.(date);
    }
  };

  const currentMonthTitle = isJalali
    ? `${PERSIAN_MONTH_NAMES[jalaliDate.month - 1]} ${jalaliDate.year}`
    : `${format(currentMonth, "MMMM")} ${format(currentMonth, "yyyy")}`;

  const activeHeaders = isJalali ? PERSIAN_DAY_HEADERS : gregDayHeaders;
  const activeDays = isJalali ? jalaliDays : gregDays;

  return (
    <div className="w-[260px] p-4">
      {/* Calendar System Switcher */}
      <div className="mb-3 flex items-center justify-center">
        <div className="inline-flex rounded-md border border-light-300 bg-light-100 p-0.5 dark:border-dark-400 dark:bg-dark-200">
          <button
            type="button"
            onClick={() => setIsJalali(false)}
            className={twMerge(
              "rounded px-2.5 py-0.5 text-xs font-medium transition-colors",
              !isJalali
                ? "bg-white text-neutral-900 shadow-sm dark:bg-dark-100 dark:text-dark-1000"
                : "text-light-700 hover:text-light-900 dark:text-dark-700 dark:hover:text-dark-900",
            )}
          >
            Gregorian
          </button>
          <button
            type="button"
            onClick={() => setIsJalali(true)}
            className={twMerge(
              "rounded px-2.5 py-0.5 text-xs font-medium transition-colors",
              isJalali
                ? "bg-white text-neutral-900 shadow-sm dark:bg-dark-100 dark:text-dark-1000"
                : "text-light-700 hover:text-light-900 dark:text-dark-700 dark:hover:text-dark-900",
            )}
          >
            شمسی (جلالی)
          </button>
        </div>
      </div>

      <div className="flex items-center text-light-1000 dark:text-dark-1000">
        <button
          type="button"
          onClick={handlePrev}
          className="flex flex-none items-center justify-center p-1.5 text-light-700 hover:text-light-900 dark:text-dark-700 dark:hover:text-dark-1000"
        >
          <span className="sr-only">Previous month</span>
          <HiChevronLeft aria-hidden="true" className="h-4 w-4" />
        </button>
        <div className="flex-1 text-center text-sm font-semibold" dir="auto">
          {currentMonthTitle}
        </div>
        <button
          type="button"
          onClick={handleNext}
          className="flex flex-none items-center justify-center p-1.5 text-light-700 hover:text-light-900 dark:text-dark-700 dark:hover:text-dark-1000"
        >
          <span className="sr-only">Next month</span>
          <HiChevronRight aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-7 text-center text-xs/6 text-light-950 dark:text-dark-950">
        {activeHeaders.map((day, index) => (
          <div key={index}>{day}</div>
        ))}
      </div>

      <div className="isolate mt-2 grid grid-cols-7 text-sm">
        {activeDays.map((day) =>
          day.dateObj ? (
            <button
              key={day.id}
              type="button"
              onClick={(e) => handleDateClick(day.dateObj, e)}
              className={twMerge(
                "flex aspect-square items-center justify-center rounded-lg focus:z-10",
                day.isSelected
                  ? "bg-light-1000 hover:bg-light-1000 dark:bg-dark-1000 dark:hover:bg-dark-1000"
                  : "bg-transparent hover:bg-light-200 dark:bg-transparent dark:hover:bg-dark-200",
              )}
            >
              <time
                dateTime={day.id}
                className={twMerge(
                  "mx-auto flex size-7 items-center justify-center rounded-full text-light-900 dark:text-dark-900",
                  day.isCurrentMonth
                    ? "text-light-900 dark:text-dark-900"
                    : "text-light-700 dark:text-dark-600",
                  day.isSelected && "text-light-50 dark:text-dark-50",
                  day.isToday &&
                    !day.isSelected &&
                    "font-bold text-teal-600 dark:text-teal-400",
                )}
              >
                {day.displayNumber}
              </time>
            </button>
          ) : (
            <div key={day.id} className="aspect-square" />
          ),
        )}
      </div>
    </div>
  );
}
