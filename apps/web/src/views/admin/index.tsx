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
  HiOutlineUsers,
  HiOutlineSquares2X2,
  HiOutlinePaperAirplane,
  HiOutlineStar,
  HiOutlineArrowUpCircle,
  HiOutlineArrowDownCircle,
} from "react-icons/hi2";
import Avatar from "~/components/Avatar";
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
  const [sendToAll, setSendToAll] = useState(false);
  const [reminderStatus, setReminderStatus] = useState("");
  const [testEmailStatus, setTestEmailStatus] = useState("");
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
      setUserCreatedMsg(`کاربر «${data.user.name}» (${data.user.email}) با موفقیت در سیستم ثبت گردید.`);
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

  const toggleRoleMutation = api.admin.toggleUserRole.useMutation({
    onSuccess: (data) => {
      refetchOverview();
    },
    onError: (err) => {
      alert(err.message || "خطا در تغییر دسترسی کاربر");
    },
  });

  const sendTestEmailMutation = api.admin.sendTestEmail.useMutation({
    onSuccess: (data) => {
      setTestEmailStatus(`ایمیل آزمایشی با موفقیت به ${data.targetEmail} ارسال شد. شناسه: ${data.messageId}`);
    },
    onError: (err) => {
      setTestEmailStatus(`خطا در ارسال تست: ${err.message}`);
    },
  });

  const sendRemindersMutation = api.admin.sendReminders.useMutation({
    onSuccess: (data) => {
      if (data.dryRun) {
        setReminderStatus(
          `حالت آزمایشی: ${data.recipientCount} عضو شناسایی شدند (${data.recipients?.map((r) => r.name).join("، ")})`,
        );
      } else {
        const errorText = data.errors && data.errors.length > 0 ? ` (خطاها: ${data.errors.join(" | ")})` : "";
        setReminderStatus(
          `یادآوری به ${data.sentCount} عضو ارسال شد.${errorText}`,
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

  const isSuper = overview?.currentUser?.isSuperAdmin;

  return (
    <>
      <Head>
        <title>اتاق فرمان و مدیریت کل سایت | Parch Kanban</title>
      </Head>

      <div className="flex flex-col gap-8 p-6 md:p-8 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-light-200 pb-6 dark:border-dark-300">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg">
              <HiOutlineShieldCheck className="h-7 w-7" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-neutral-900 dark:text-dark-1000">
                  اتاق فرمان لید و پنل مدیریت کل سایت
                </h1>
                {isSuper && (
                  <span className="flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-950/80 dark:border-amber-700 dark:text-amber-300">
                    <HiOutlineStar className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    <span>مدیر ارشد (سهراب بهدانی)</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-light-700 dark:text-dark-700 mt-1">
                کنترل متمرکز کاربران، فضاهای کاری، بردهای توسعه، گلوگاه‌ها و سیستم اطلاع‌رسانی توزیع
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                refetchOverview();
                refetchChangelog();
              }}
              disabled={loadingOverview}
            >
              <span className="flex items-center gap-1.5 text-xs">
                <HiOutlineArrowPath className={`h-4 w-4 ${loadingOverview ? "animate-spin" : ""}`} />
                <span>به‌روزرسانی داده‌ها</span>
              </span>
            </Button>
          </div>
        </div>

        {/* Global Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="flex flex-col rounded-2xl border border-light-200 bg-white p-4 shadow-sm dark:border-dark-300 dark:bg-dark-100">
            <span className="text-[11px] font-medium text-light-700 dark:text-dark-700">کاربران ثبت‌شده</span>
            <span className="text-2xl font-black text-neutral-900 dark:text-dark-1000 mt-1">
              {overview?.stats.totalUsers ?? 0}
            </span>
          </div>

          <div className="flex flex-col rounded-2xl border border-light-200 bg-white p-4 shadow-sm dark:border-dark-300 dark:bg-dark-100">
            <span className="text-[11px] font-medium text-light-700 dark:text-dark-700">مدیران سیستم</span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {overview?.stats.totalAdmins ?? 0}
            </span>
          </div>

          <div className="flex flex-col rounded-2xl border border-light-200 bg-white p-4 shadow-sm dark:border-dark-300 dark:bg-dark-100">
            <span className="text-[11px] font-medium text-light-700 dark:text-dark-700">فضاهای کاری</span>
            <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
              {overview?.stats.totalWorkspaces ?? 0}
            </span>
          </div>

          <div className="flex flex-col rounded-2xl border border-light-200 bg-white p-4 shadow-sm dark:border-dark-300 dark:bg-dark-100">
            <span className="text-[11px] font-medium text-light-700 dark:text-dark-700">تخته‌های فعال</span>
            <span className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
              {overview?.stats.totalBoards ?? 0}
            </span>
          </div>

          <div className="flex flex-col rounded-2xl border border-light-200 bg-white p-4 shadow-sm dark:border-dark-300 dark:bg-dark-100">
            <span className="text-[11px] font-medium text-light-700 dark:text-dark-700">کارت‌های پروژه</span>
            <span className="text-2xl font-black text-neutral-900 dark:text-dark-1000 mt-1">
              {overview?.stats.totalCards ?? 0}
            </span>
          </div>

          <div className="flex flex-col rounded-2xl border border-red-200 bg-red-50/50 p-4 shadow-sm dark:border-red-900/40 dark:bg-red-950/20">
            <span className="text-[11px] font-medium text-red-700 dark:text-red-400">مسدودکننده‌ها</span>
            <span className="text-2xl font-black text-red-600 dark:text-red-400 mt-1">
              {overview?.stats.totalBlockers ?? 0}
            </span>
          </div>
        </div>

        {/* Section 1: Full Users Management */}
        <div className="rounded-2xl border border-light-200 bg-white p-6 shadow-sm dark:border-dark-300 dark:bg-dark-100">
          <div className="flex items-center justify-between mb-4 border-b border-light-200 pb-3 dark:border-dark-300">
            <div className="flex items-center gap-2.5">
              <HiOutlineUsers className="h-5 w-5 text-indigo-500" />
              <h2 className="text-base font-bold text-neutral-900 dark:text-dark-1000">
                مدیریت کاربران کل سایت و تعیین نقش‌ها
              </h2>
            </div>
            <span className="text-xs font-semibold text-light-700 dark:text-dark-700">
              {overview?.users.length ?? 0} حساب کاربری
            </span>
          </div>

          <p className="text-xs text-light-700 dark:text-dark-700 mb-4">
            در این بخش می‌توانید کلیه کاربران توزیع را مشاهده کرده و کاربران مورد اعتماد را به مدیر سیستم ارتقا دهید.
          </p>

          <div className="overflow-x-auto mb-6">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-light-200 text-light-700 dark:border-dark-300 dark:text-dark-700">
                  <th className="pb-3 font-semibold">کاربر</th>
                  <th className="pb-3 font-semibold">ایمیل</th>
                  <th className="pb-3 font-semibold">نقش در سیستم</th>
                  <th className="pb-3 font-semibold">تسک‌های محوله</th>
                  <th className="pb-3 font-semibold">فضاهای کاری</th>
                  <th className="pb-3 font-semibold text-left">عملیات مدیریت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-light-200 dark:divide-dark-300">
                {overview?.users.map((u) => (
                  <tr key={u.id} className="hover:bg-light-50/70 dark:hover:bg-dark-200/40 transition-colors">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <Avatar name={u.name} email={u.email} size="sm" />
                        <span className="font-bold text-neutral-900 dark:text-dark-1000">{u.name}</span>
                      </div>
                    </td>
                    <td className="py-3 font-mono text-[11px] text-light-800 dark:text-dark-800">{u.email}</td>
                    <td className="py-3">
                      {u.isSuperAdmin ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                          <HiOutlineStar className="h-3 w-3" />
                          <span>مدیر ارشد (SuperAdmin)</span>
                        </span>
                      ) : u.role === "admin" ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          مدیر سیستم (Admin)
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-light-200 px-2 py-0.5 text-[10px] font-medium text-light-800 dark:bg-dark-300 dark:text-dark-800">
                          عضو (Member)
                        </span>
                      )}
                    </td>
                    <td className="py-3">
                      <span className="font-semibold text-neutral-800 dark:text-dark-900">
                        {u.assignedTasks} تسک
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="text-[11px] text-light-700 dark:text-dark-700">
                        {u.workspaces.length > 0 ? u.workspaces.join("، ") : "ندارد"}
                      </span>
                    </td>
                    <td className="py-3 text-left">
                      {u.isSuperAdmin ? (
                        <span className="text-[10px] text-light-500 dark:text-dark-600 font-mono">مالک سیستم</span>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5">
                          {u.role === "member" ? (
                            <button
                              onClick={() => toggleRoleMutation.mutate({ userId: u.id, role: "admin" })}
                              disabled={toggleRoleMutation.isPending}
                              className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 transition-colors"
                              title="ارتقا به مدیر سیستم"
                            >
                              <HiOutlineArrowUpCircle className="h-3.5 w-3.5" />
                              <span>ارتقا به مدیر</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => toggleRoleMutation.mutate({ userId: u.id, role: "member" })}
                              disabled={toggleRoleMutation.isPending}
                              className="inline-flex items-center gap-1 rounded-lg border border-light-300 bg-light-100 px-2.5 py-1 text-[11px] font-medium text-neutral-700 hover:bg-light-200 dark:border-dark-300 dark:bg-dark-200 dark:text-dark-800 transition-colors"
                              title="تبدیل به کاربر عادی"
                            >
                              <HiOutlineArrowDownCircle className="h-3.5 w-3.5" />
                              <span>تبدیل به عضو</span>
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Sub-form: Add User */}
          <div className="rounded-xl border border-light-200 bg-light-50/60 p-4 dark:border-dark-300 dark:bg-dark-200/30">
            <h3 className="text-xs font-bold text-neutral-900 dark:text-dark-1000 mb-3 flex items-center gap-1.5">
              <HiOutlineUserPlus className="h-4 w-4 text-emerald-600" />
              <span>ایجاد دستی حساب کاربری جدید</span>
            </h3>

            {userCreatedMsg && (
              <div className="mb-3 rounded-lg border border-emerald-300 bg-emerald-50 p-2.5 text-xs text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                {userCreatedMsg}
              </div>
            )}
            {userErrorMsg && (
              <div className="mb-3 rounded-lg border border-red-300 bg-red-50 p-2.5 text-xs text-red-800 dark:border-red-800 dark:bg-red-950/60 dark:text-red-300">
                {userErrorMsg}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="نام و نام خانوادگی"
                required
                className="rounded-xl border border-light-300 bg-white px-3 py-2 text-xs text-neutral-900 dark:border-dark-300 dark:bg-dark-100 dark:text-dark-1000 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="dev@parchlinux.com"
                required
                className="rounded-xl border border-light-300 bg-white px-3 py-2 text-xs text-neutral-900 dark:border-dark-300 dark:bg-dark-100 dark:text-dark-1000 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <input
                type="password"
                value={userPassword}
                onChange={(e) => setUserPassword(e.target.value)}
                placeholder="رمز عبور اولیه (حداقل ۸ کاراکتر)"
                required
                minLength={8}
                className="rounded-xl border border-light-300 bg-white px-3 py-2 text-xs text-neutral-900 dark:border-dark-300 dark:bg-dark-100 dark:text-dark-1000 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <Button type="submit" disabled={createUserMutation.isPending}>
                <span className="flex items-center justify-center gap-1.5 text-xs">
                  <HiOutlineUserPlus className="h-4 w-4" />
                  <span>{createUserMutation.isPending ? "در حال ایجاد..." : "ایجاد حساب"}</span>
                </span>
              </Button>
            </form>
          </div>
        </div>

        {/* Section 2: Workspaces & Boards */}
        <div className="rounded-2xl border border-light-200 bg-white p-6 shadow-sm dark:border-dark-300 dark:bg-dark-100">
          <div className="flex items-center justify-between mb-4 border-b border-light-200 pb-3 dark:border-dark-300">
            <div className="flex items-center gap-2.5">
              <HiOutlineSquares2X2 className="h-5 w-5 text-blue-500" />
              <h2 className="text-base font-bold text-neutral-900 dark:text-dark-1000">
                فضاهای کاری و بردهای سایت
              </h2>
            </div>
            <span className="text-xs font-semibold text-light-700 dark:text-dark-700">
              {overview?.workspaces.length ?? 0} فضای کاری
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {overview?.workspaces.map((w) => (
              <div
                key={w.id}
                className="rounded-xl border border-light-200 bg-light-50/50 p-4 dark:border-dark-300 dark:bg-dark-200/30 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <h3 className="font-bold text-sm text-neutral-900 dark:text-dark-1000">{w.name}</h3>
                    <span className="rounded bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-mono text-indigo-700 dark:bg-indigo-950 dark:border-indigo-800 dark:text-indigo-300">
                      /{w.slug}
                    </span>
                  </div>
                  <p className="text-[11px] text-light-700 dark:text-dark-700 mb-3">
                    ایجادکننده: {w.ownerName}
                  </p>
                </div>
                <div className="flex items-center justify-between border-t border-light-200 pt-2.5 dark:border-dark-300 text-[11px] text-light-800 dark:text-dark-800">
                  <span>{w.boardCount} برد فعال</span>
                  <span>{w.memberCount} عضو</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Blockers Radar */}
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

        {/* Section 4: Email System & Reminder Console */}
        <div className="rounded-2xl border border-light-200 bg-white p-6 shadow-sm dark:border-dark-300 dark:bg-dark-100">
          <div className="flex items-center justify-between mb-4 border-b border-light-200 pb-3 dark:border-dark-300">
            <div className="flex items-center gap-2.5">
              <HiOutlineEnvelope className="h-5 w-5 text-emerald-500" />
              <h2 className="text-base font-bold text-neutral-900 dark:text-dark-1000">
                کنسول ارسال ایمیل و یادآوری تسک‌ها
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => sendTestEmailMutation.mutate({ targetEmail: "behdanisohrab@gmail.com" })}
                disabled={sendTestEmailMutation.isPending}
              >
                <span className="flex items-center gap-1.5 text-xs">
                  <HiOutlinePaperAirplane className="h-4 w-4 text-emerald-500" />
                  <span>{sendTestEmailMutation.isPending ? "در حال ارسال تست..." : "ارسال ایمیل تست به من (behdanisohrab@gmail.com)"}</span>
                </span>
              </Button>
            </div>
          </div>

          <p className="text-xs text-light-700 dark:text-dark-700 mb-4">
            ارسال ایمیل شخصی‌سازی‌شده و رسمی به اعضای تیم پارچ‌لینوکس از طریق درگاه رسمی SMTP (Zoho).
          </p>

          {testEmailStatus && (
            <div className="mb-4 rounded-xl border border-blue-300 bg-blue-50 p-3 text-xs text-blue-800 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
              {testEmailStatus}
            </div>
          )}

          <div className="flex flex-col gap-3 mb-4">
            <label className="text-xs font-semibold text-light-800 dark:text-dark-800">
              پیام دلخواه لید پروژه برای درج در ایمیل (اختیاری):
            </label>
            <textarea
              rows={2}
              value={reminderNote}
              onChange={(e) => setReminderNote(e.target.value)}
              placeholder="مثال: رفقا لطفاً تسک‌های مربوط به انتشار نسخه جدید رو تا آخر هفته به پایان برسونید."
              className="rounded-xl border border-light-300 bg-light-50 p-3 text-xs text-neutral-900 dark:border-dark-300 dark:bg-dark-200 dark:text-dark-1000 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2 mb-4">
            <input
              type="checkbox"
              id="sendToAll"
              checked={sendToAll}
              onChange={(e) => setSendToAll(e.target.checked)}
              className="rounded border-light-300 text-emerald-600 focus:ring-emerald-500"
            />
            <label htmlFor="sendToAll" className="text-xs text-neutral-800 dark:text-dark-900 cursor-pointer">
              ارسال همگانی به تمام اعضای ثبت‌شده در سیستم (حتی اگر در حال حاضر تسک اختصاصی ندارند)
            </label>
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
                  sendToAllMembers: sendToAll,
                })
              }
              disabled={sendRemindersMutation.isPending}
            >
              بررسی آزمایشی (بدون ارسال ایمیل)
            </Button>
            <Button
              onClick={() =>
                sendRemindersMutation.mutate({
                  workspacePublicId: workspace.publicId,
                  customNote: reminderNote,
                  dryRun: false,
                  sendToAllMembers: sendToAll,
                })
              }
              disabled={sendRemindersMutation.isPending}
            >
              <span className="flex items-center gap-1.5">
                <HiOutlineEnvelope className="h-4 w-4" />
                <span>{sendRemindersMutation.isPending ? "در حال ارسال..." : "ارسال ایمیل یادآوری به اعضا"}</span>
              </span>
            </Button>
          </div>
        </div>

        {/* Section 5: Master Release Notes Builder */}
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
