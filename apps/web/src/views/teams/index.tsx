import { useState } from "react";
import Head from "next/head";
import {
  HiOutlineUserGroup,
  HiOutlineCpuChip,
  HiOutlineComputerDesktop,
  HiOutlineWrenchScrewdriver,
  HiOutlinePaintBrush,
  HiOutlineGlobeAlt,
  HiOutlineSparkles,
} from "react-icons/hi2";
import Dashboard from "~/components/Dashboard";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";

interface TeamDefinition {
  id: string;
  name: string;
  enName: string;
  icon: string;
  description: string;
  focusRepos: string[];
  color: string;
}

const PARCH_TEAMS: TeamDefinition[] = [
  {
    id: "core",
    name: "هسته و سیستم پایه",
    enName: "Core & Base System",
    icon: "🐧",
    description: "توسعه و نگهداری پکیج‌های سیستمی اختصاصی، معماری‌های پردازنده و بهینه‌سازی توزیع.",
    focusRepos: ["ppr", "bsa", "world"],
    color: "from-blue-600 to-indigo-600",
  },
  {
    id: "iso",
    name: "انتشار و نصاب ایزو",
    enName: "ISO Releases & Installer",
    icon: "💿",
    description: "ساخت ایزوهای رسمی، نصاب Calamares، بسته‌بندی درود و ایمیج‌های بوت‌ابل لینوکس پارچ.",
    focusRepos: ["parch-iso-template", "calamares-parch-net", "parch-welcome-legacy"],
    color: "from-purple-600 to-pink-600",
  },
  {
    id: "desktop",
    name: "دسکتاپ و هیپرلند",
    enName: "Hyprland & Desktop Experience",
    icon: "💻",
    description: "طراحی دات‌فایل‌ها، تم‌های اختصاصی وی‌لند، کانفیگ‌های هیپرلند و ستاپ‌های گرافیکی.",
    focusRepos: ["parch-iso-hyprland", "dotfiles"],
    color: "from-cyan-600 to-teal-600",
  },
  {
    id: "tools",
    name: "نرم‌افزارها و ابزارها",
    enName: "Tools & Applications",
    icon: "🛠️",
    description: "توسعه ابزارهای کاربردی پارچ شامل گیم‌هاب، میرورمن، پاستور و اپلیکیشن‌های گرافیکی.",
    focusRepos: ["gamehub", "mirrorman", "pastor", "gitee"],
    color: "from-amber-600 to-orange-600",
  },
  {
    id: "media",
    name: "طراحی و محتوا",
    enName: "Design & Content Production",
    icon: "🎨",
    description: "تولید والپیپرهای اختصاصی، تم GTK، ویدیوهای تایم‌لپس و آموزش‌های جامعه کاربری.",
    focusRepos: ["parch-gtk-theme", "parch-community-photos"],
    color: "from-rose-600 to-red-600",
  },
  {
    id: "infra",
    name: "وب و زیرساخت",
    enName: "Web & Infrastructure",
    icon: "🌐",
    description: "مدیریت سرورها، کان‌بان، وب‌سایت اصلی، فروم گفتگو و پورتال توسعه‌دهندگان پارچ.",
    focusRepos: ["parchlinux.com", "kan", "developer"],
    color: "from-emerald-600 to-green-600",
  },
];

export default function TeamsView() {
  const { workspace } = useWorkspace();
  const { data: workspaceData } = api.workspace.byId.useQuery(
    { workspacePublicId: workspace.publicId },
    { enabled: !!workspace.publicId },
  );

  return (
    <Dashboard>
      <Head>
        <title>تیم‌ها و گروه‌های تخصصی پارچ | Parch Kanban</title>
      </Head>

      <div className="flex flex-col gap-8 p-6 md:p-8 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-light-200 pb-6 dark:border-dark-300">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white shadow-lg">
              <HiOutlineUserGroup className="h-7 w-7" />
            </span>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-neutral-900 dark:text-dark-1000">
                تیم‌ها و گروه‌های تخصصی پارچ‌لینوکس
              </h1>
              <p className="text-xs text-light-700 dark:text-dark-700">
                ساختار تیم‌های مهندسی، مسئولیت‌ها و مخازن متمرکز هر اسکواد
              </p>
            </div>
          </div>
        </div>

        {/* Teams Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {PARCH_TEAMS.map((team) => (
            <div
              key={team.id}
              className="flex flex-col justify-between rounded-2xl border border-light-200 bg-white p-6 shadow-sm hover:shadow-md transition-all dark:border-dark-300 dark:bg-dark-100"
            >
              <div>
                <div className="flex items-center justify-between gap-3 mb-4">
                  <span className="text-3xl">{team.icon}</span>
                  <span className="rounded-full bg-light-200 dark:bg-dark-300 px-2.5 py-0.5 text-[10px] font-bold text-light-800 dark:text-dark-800">
                    {team.enName}
                  </span>
                </div>

                <h2 className="text-base font-bold text-neutral-900 dark:text-dark-1000 mb-2">
                  {team.name}
                </h2>
                <p className="text-xs leading-relaxed text-light-700 dark:text-dark-700 mb-4">
                  {team.description}
                </p>
              </div>

              <div className="border-t border-light-200 pt-4 dark:border-dark-300">
                <span className="block text-xs font-semibold text-light-800 dark:text-dark-800 mb-2">
                  مخازن تحت نظارت:
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {team.focusRepos.map((repo) => (
                    <span
                      key={repo}
                      className="font-mono rounded-md border border-light-300 bg-light-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:border-dark-300 dark:bg-dark-200 dark:text-emerald-400"
                    >
                      {repo}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Dashboard>
  );
}
