import { useState } from "react";
import Head from "next/head";
import {
  HiOutlineShieldCheck,
  HiOutlineUserPlus,
  HiOutlineEnvelope,
  HiOutlineExclamationTriangle,
  HiOutlineDocumentText,
  HiOutlineCpuChip,
  HiCheck,
  HiOutlineClipboardDocument,
  HiOutlineArrowPath,
} from "react-icons/hi2";
import Button from "~/components/Button";
import Input from "~/components/Input";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";

export default function AdminCockpitView() {
  const { workspace } = useWorkspace();
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userRole, setUserRole] = useState<"admin" | "member">("member");
  const [userCreatedMsg, setUserCreatedMsg] = useState("");
  const [userErrorMsg, setUserErrorMsg] = useState("");

  const [reminderNote, setReminderNote] = useState("");
  const [reminderStatus, setReminderStatus] = useState("");
  const [copiedChangelog, setCopiedChangelog] = useState(false);

  // Queries
  const {
    data: overview,
    isLoading: loadingOverview,
    refetch: refetchOverview,
  } = api.admin.getOverview.useQuery(
    { workspacePublicId: workspace.publicId },
    { enabled: !!workspace.publicId },
  );

  const { data: masterChangelog, refetch: refetchChangelog } =
    api.admin.getMasterReleaseNotes.useQuery(
      { workspacePublicId: workspace.publicId },
      { enabled: !!workspace.publicId },
    );

  // Mutations
  const createUserMutation = api.admin.createUser.useMutation({
    onSuccess: (data) => {
      setUserCreatedMsg(`کاربر «${data.user.name}» (${data.user.email}) با موفقیت ایجاد و به ورک‌اسپیس اضافه شد.`);
      setUserErrorMsg("");
      setUserName("");
      setUserEmail("");
      setUserPassword("");
      refetchOverview();
    },
    onError: (err) => {
      setUserErrorMsg(err.message || "خطا در ایجاد کاربر");
      setUserCreatedMsg("");
    },
  });

  const sendRemindersMutation = api.admin.sendReminders.useMutation({
    onSuccess: (data) => {
      if (data.dryRun) {
        setReminderStatus(
          `حالت آزمایشی: ${data.recipientCount} عضو دارای تسک فعال شناسایی شدند (${data.recipients?.map((r) => r.name).join("، ")})`,
        );
      } else {
        setReminderStatus(
          `یادآوری با موفقیت به ${data.sentCount} عضو ارسال گردید.`,
        );
      }
    },
    onError: (err) => {
      setReminderStatus(`خطا در ارسال ایمیل: ${err.message}`);
    },
  });

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName || !userEmail || !userPassword) return;
    createUserMutation.mutate({
      name: userName,
      email: userEmail,
      password: userPassword,
      role: userRole,
      workspacePublicId: workspace.publicId,
    });
  };

  const handleCopyChangelog = async () => {
    if (!masterChangelog?.markdown) return;
    try {
      await navigator.clipboard.writeText(masterChangelog.markdown);
      setCopiedChangelog(true);
      setTimeout(() => setCopiedChangelog(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <>
      <Head>
        <title>اتاق فرمان لید و پنل مدیریت | Parch Kanban</title>
      </Head>

      <div className="flex flex-col gap-8 p-6 md:p-8 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-light-200 pb-6 dark:border-dark-300">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg">
              <HiOutlineShieldCheck className="h-7 w-7" />
            </span>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-neutral-900 dark:text-dark-1000">
                اتاق فرمان لید و پنل مدیریت پارچ
              </h1>
              <p className="text-xs text-light-700 dark:text-dark-700">
                مرکز کنترل متمرکز، رادار مسدودکننده‌ها، مدیریت کاربران و ابزارهای مهندسی توزیع
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              refetchOverview();
              refetchChangelog();
            }}
            className="flex items-center gap-2 rounded-xl border border-light-300 bg-white px-4 py-2 text-xs font-semibold text-neutral-800 shadow-sm hover:bg-light-100 dark:border-dark-300 dark:bg-dark-100 dark:text-dark-900 transition-colors"
          >
            <HiOutlineArrowPath className="h-4 w-4 text-emerald-500" />
            <span>به‌روزرسانی داده‌ها</span>
          </button>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex flex-col rounded-2xl border border-light-200 bg-white p-5 shadow-sm dark:border-dark-300 dark:bg-dark-100">
            <span className="text-xs font-semibold text-light-700 dark:text-dark-700">کل بردهای فعال</span>
            <span className="text-2xl md:text-3xl font-black text-neutral-900 dark:text-dark-1000 mt-2">
              {overview?.stats.totalBoards ?? "-"}
            </span>
          </div>
          <div className="flex flex-col rounded-2xl border border-light-200 bg-white p-5 shadow-sm dark:border-dark-300 dark:bg-dark-100">
            <span className="text-xs font-semibold text-light-700 dark:text-dark-700">کل کارت‌ها و وظایف</span>
            <span className="text-2xl md:text-3xl font-black text-neutral-900 dark:text-dark-1000 mt-2">
              {overview?.stats.totalCards ?? "-"}
            </span>
          </div>
          <div className="flex flex-col rounded-2xl border border-light-200 bg-white p-5 shadow-sm dark:border-dark-300 dark:bg-dark-100">
            <span className="text-xs font-semibold text-light-700 dark:text-dark-700">کاربران و اعضا</span>
            <span className="text-2xl md:text-3xl font-black text-neutral-900 dark:text-dark-1000 mt-2">
              {overview?.stats.totalUsers ?? "-"}
            </span>
          </div>
          <div className="flex flex-col rounded-2xl border border-red-200 bg-red-50/50 p-5 shadow-sm dark:border-red-900/60 dark:bg-red-950/20">
            <span className="text-xs font-semibold text-red-700 dark:text-red-400">مسدودکننده‌ها (Blockers)</span>
            <span className="text-2xl md:text-3xl font-black text-red-600 dark:text-red-400 mt-2">
              {overview?.stats.totalBlockers ?? 0}
            </span>
          </div>
        </div>

        {/* Section 1: Manual User Account Creation */}
        <div className="rounded-2xl border border-light-200 bg-white p-6 shadow-sm dark:border-dark-300 dark:bg-dark-100">
          <div className="flex items-center gap-2.5 mb-4 border-b border-light-200 pb-3 dark:border-dark-300">
            <HiOutlineUserPlus className="h-5 w-5 text-emerald-500" />
            <h2 className="text-base font-bold text-neutral-900 dark:text-dark-1000">
              ساخت دستی حساب کاربری برای اعضای تیم
            </h2>
          </div>
          <p className="text-xs text-light-700 dark:text-dark-700 mb-4">
            به عنوان مدیر ارشد می‌توانید مستقیماً برای توسعه‌دهندگان جدید حساب بسازید و آن‌ها را عضو ورک‌اسپیس کنید.
          </p>

          {userCreatedMsg && (
            <div className="mb-4 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              {userCreatedMsg}
            </div>
          )}
          {userErrorMsg && (
            <div className="mb-4 rounded-xl border border-red-300 bg-red-50 p-3 text-xs text-red-700 dark:border-red-800 dark:bg-red-950/60 dark:text-red-300">
              {userErrorMsg}
            </div>
          )}

          <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-light-800 dark:text-dark-800 mb-1.5">
                نام و نام خانوادگی
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="مثال: سهراب بهدانی"
                required
                className="w-full rounded-xl border border-light-300 bg-light-50 px-3.5 py-2.5 text-xs text-neutral-900 dark:border-dark-300 dark:bg-dark-200 dark:text-dark-1000 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-light-800 dark:text-dark-800 mb-1.5">
                آدرس ایمیل
              </label>
              <input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="dev@parchlinux.com"
                required
                className="w-full rounded-xl border border-light-300 bg-light-50 px-3.5 py-2.5 text-xs text-neutral-900 dark:border-dark-300 dark:bg-dark-200 dark:text-dark-1000 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-light-800 dark:text-dark-800 mb-1.5">
                رمز عبور اولیه (حداقل ۸ کاراکتر)
              </label>
              <input
                type="password"
                value={userPassword}
                onChange={(e) => setUserPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                className="w-full rounded-xl border border-light-300 bg-light-50 px-3.5 py-2.5 text-xs text-neutral-900 dark:border-dark-300 dark:bg-dark-200 dark:text-dark-1000 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <Button type="submit" disabled={createUserMutation.isPending}>
                <span className="flex items-center justify-center gap-2">
                  <HiOutlineUserPlus className="h-4 w-4" />
                  <span>{createUserMutation.isPending ? "در حال ایجاد..." : "ایجاد حساب کاربری"}</span>
                </span>
              </Button>
            </div>
          </form>
        </div>

        {/* Section 2: Blockers Radar */}
        <div className="rounded-2xl border border-light-200 bg-white p-6 shadow-sm dark:border-dark-300 dark:bg-dark-100">
          <div className="flex items-center justify-between mb-4 border-b border-light-200 pb-3 dark:border-dark-300">
            <div className="flex items-center gap-2.5">
              <HiOutlineExclamationTriangle className="h-5 w-5 text-red-500" />
              <h2 className="text-base font-bold text-neutral-900 dark:text-dark-1000">
                رادار مسدودکننده‌ها و باگ‌های بحرانی توزیع
              </h2>
            </div>
            <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700 dark:bg-red-950 dark:text-red-400">
              {overview?.blockers.length ?? 0} مورد فعال
            </span>
          </div>

          {overview?.blockers.length === 0 ? (
            <div className="flex items-center justify-center p-8 text-center text-xs text-emerald-600 dark:text-emerald-400">
              <HiCheck className="h-5 w-5 ml-2" />
              <span>تبریک! هیچ تسک مسدودکننده یا بحرانی در حال حاضر وجود ندارد.</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5 overflow-x-auto">
              {overview?.blockers.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50/40 p-3.5 text-xs dark:border-red-900/50 dark:bg-red-950/20"
                >
                  <div className="flex items-center gap-3">
                    <span className="rounded-md bg-red-600 text-white px-2 py-0.5 font-bold text-[10px]">
                      {(b.priority ?? "normal").toUpperCase()}
                    </span>
                    <span className="font-bold text-neutral-900 dark:text-dark-1000">
                      {b.title}
                    </span>
                    {b.desktopEnv && b.desktopEnv !== "all" && (
                      <span className="rounded bg-light-200 dark:bg-dark-300 px-1.5 py-0.5 text-[10px] text-light-800 dark:text-dark-800 uppercase">
                        {b.desktopEnv}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-light-600 dark:text-dark-600">
                    شناسه کارت: {b.publicId}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 3: Email Reminder Broadcast */}
        <div className="rounded-2xl border border-light-200 bg-white p-6 shadow-sm dark:border-dark-300 dark:bg-dark-100">
          <div className="flex items-center gap-2.5 mb-4 border-b border-light-200 pb-3 dark:border-dark-300">
            <HiOutlineEnvelope className="h-5 w-5 text-emerald-500" />
            <h2 className="text-base font-bold text-neutral-900 dark:text-dark-1000">
              کنسول ارسال ایمیل یادآوری تسک‌ها به اعضا
            </h2>
          </div>
          <p className="text-xs text-light-700 dark:text-dark-700 mb-4">
            ارسال خودکار ایمیل شخصی‌سازی‌شده به تمام اعضایی که در حال حاضر تسک‌های فعال و تمام‌نشده دارند.
          </p>

          <div className="flex flex-col gap-3 mb-4">
            <label className="text-xs font-semibold text-light-800 dark:text-dark-800">
              پیام دلخواه لید پروژه برای پیوست در ایمیل (اختیاری):
            </label>
            <textarea
              rows={2}
              value={reminderNote}
              onChange={(e) => setReminderNote(e.target.value)}
              placeholder="مثال: رفقا لطفاً تسک‌های مربوط به انتشار نسخه جدید رو تا آخر هفته به پایان برسونید."
              className="rounded-xl border border-light-300 bg-light-50 p-3 text-xs text-neutral-900 dark:border-dark-300 dark:bg-dark-200 dark:text-dark-1000 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {reminderStatus && (
            <div className="mb-4 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              {reminderStatus}
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={() =>
                sendRemindersMutation.mutate({
                  workspacePublicId: workspace.publicId,
                  customNote: reminderNote,
                  dryRun: true,
                })
              }
              disabled={sendRemindersMutation.isPending}
            >
              بررسی آزمایشی (بدون ارسال)
            </Button>
            <Button
              onClick={() =>
                sendRemindersMutation.mutate({
                  workspacePublicId: workspace.publicId,
                  customNote: reminderNote,
                  dryRun: false,
                })
              }
              disabled={sendRemindersMutation.isPending}
            >
              <span className="flex items-center gap-1.5">
                <HiOutlineEnvelope className="h-4 w-4" />
                <span>ارسال ایمیل یادآوری به اعضا</span>
              </span>
            </Button>
          </div>
        </div>

        {/* Section 4: Master Release Notes Builder */}
        <div className="rounded-2xl border border-light-200 bg-white p-6 shadow-sm dark:border-dark-300 dark:bg-dark-100">
          <div className="flex items-center justify-between mb-4 border-b border-light-200 pb-3 dark:border-dark-300">
            <div className="flex items-center gap-2.5">
              <HiOutlineDocumentText className="h-5 w-5 text-emerald-500" />
              <h2 className="text-base font-bold text-neutral-900 dark:text-dark-1000">
                چنج‌لاگ جامع انتشار نسخه رسمی پارچ‌لینوکس (Master Release Notes)
              </h2>
            </div>
            <Button variant="secondary" onClick={handleCopyChangelog}>
              <span className="flex items-center gap-1.5">
                {copiedChangelog ? (
                  <>
                    <HiCheck className="h-4 w-4 text-emerald-500" />
                    <span>کپی شد!</span>
                  </>
                ) : (
                  <>
                    <HiOutlineClipboardDocument className="h-4 w-4" />
                    <span>کپی مارک‌داون</span>
                  </>
                )}
              </span>
            </Button>
          </div>
          <pre className="max-h-72 overflow-y-auto rounded-xl border border-light-300 bg-light-100 p-4 font-mono text-xs text-neutral-800 dark:border-dark-400 dark:bg-dark-50 dark:text-dark-900 whitespace-pre-wrap">
            {masterChangelog?.markdown || "در حال بارگذاری چنج‌لاگ..."}
          </pre>
        </div>
      </div>
    </>
  );
}
