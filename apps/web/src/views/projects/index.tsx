import { useMemo, useState } from "react";
import Head from "next/head";
import {
  HiOutlineFolder,
  HiOutlineFlag,
  HiOutlineCalendar,
  HiOutlineCheckCircle,
  HiOutlineSparkles,
  HiOutlineArrowTopRightOnSquare,
} from "react-icons/hi2";
import Link from "next/link";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";

interface ProjectItem {
  id: string;
  title: string;
  description: string;
  targetVersion: string;
  deadline: string;
  lead: string;
  boards: string[];
  status: "active" | "planning" | "completed";
}

const DEFAULT_PROJECTS: ProjectItem[] = [
  {
    id: "parch-2026-release",
    title: "انتشار نسخه رسمی Parch Linux 2026",
    description: "آماده‌سازی پکیج‌های پایه، حل مشکلات میکروکد، نصاب کلامارس و تولید ایمیج‌های پایدار دسکتاپ‌های مختلف.",
    targetVersion: "v2026.04",
    deadline: "اردیبهشت ۱۴۰۵ (April 2026)",
    lead: "سهراب بهدانی",
    boards: ["Iso Releases", "hyprland"],
    status: "active",
  },
  {
    id: "parch-gamehub-v2",
    title: "بازطراحی و توسعه GameHub پارچ",
    description: "پیاده‌سازی سایدبار تاشو، پشتیبانی از گیم‌پد و حالت کنسول و اجرای فرامین ترمینال درون‌برنامه‌ای.",
    targetVersion: "v2.1.0",
    deadline: "خرداد ۱۴۰۵ (May 2026)",
    lead: "تیم Tools & Apps",
    boards: ["Tools&Apps"],
    status: "active",
  },
  {
    id: "parch-community-media",
    title: "بسته گرافیک، برندینگ و ویدیوهای آموزشی",
    description: "تولید پست‌های اسلایدی هفتگی، والپیپرهای اختصاصی پارچ و ویدیوهای تایم‌لپس و آموزش لینوکس به کاربران جدید.",
    targetVersion: "Quarter 1",
    deadline: "مستمر و هفتگی",
    lead: "تیم Design & Media",
    boards: ["Graphic&Contentproduction"],
    status: "active",
  },
];

export default function ProjectsView() {
  const { workspace } = useWorkspace();
  const [projects] = useState<ProjectItem[]>(DEFAULT_PROJECTS);

  const { data: boardsData } = api.board.all.useQuery(
    { workspacePublicId: workspace.publicId },
    { enabled: !!workspace.publicId },
  );

  return (
    <>
      <Head>
        <title>مدیریت پروژه‌ها و مایلستون‌ها | Parch Kanban</title>
      </Head>

      <div className="flex flex-col gap-8 p-6 md:p-8 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-light-200 pb-6 dark:border-dark-300">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-500 text-white shadow-lg">
              <HiOutlineFolder className="h-7 w-7" />
            </span>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-neutral-900 dark:text-dark-1000">
                مدیریت پروژه‌ها و مایلستون‌های پارچ
              </h1>
              <p className="text-xs text-light-700 dark:text-dark-700">
                پیگیری اهداف کلان توزیع، پیشرفت نسخه‌ها و مایلستون‌های مشترک میان چند برد
              </p>
            </div>
          </div>
        </div>

        {/* Projects List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((proj) => (
            <div
              key={proj.id}
              className="flex flex-col justify-between rounded-2xl border border-light-200 bg-white p-6 shadow-sm hover:shadow-md transition-all dark:border-dark-300 dark:bg-dark-100"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2.5 py-0.5 text-[11px] font-bold">
                    {proj.targetVersion}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] font-medium text-light-700 dark:text-dark-700">
                    <HiOutlineCalendar className="h-3.5 w-3.5" />
                    <span>{proj.deadline}</span>
                  </span>
                </div>

                <h2 className="text-base font-bold text-neutral-900 dark:text-dark-1000 mb-2">
                  {proj.title}
                </h2>
                <p className="text-xs leading-relaxed text-light-700 dark:text-dark-700 mb-4">
                  {proj.description}
                </p>
              </div>

              <div className="border-t border-light-200 pt-4 dark:border-dark-300">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-semibold text-light-800 dark:text-dark-800">
                    مسئول پروژه:
                  </span>
                  <span className="font-bold text-neutral-900 dark:text-dark-1000">
                    {proj.lead}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 mt-3">
                  {proj.boards.map((bName) => (
                    <span
                      key={bName}
                      className="rounded-lg border border-light-300 bg-light-50 px-2 py-0.5 text-[10px] font-medium text-light-800 dark:border-dark-300 dark:bg-dark-200 dark:text-dark-800"
                    >
                      برد: {bName}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
