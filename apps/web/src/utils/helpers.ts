import { env } from "next-runtime-env";

export const formatToArray = (
  value: string | string[] | undefined,
): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item) => item !== undefined);
  }
  return value ? [value] : [];
};

export const isPlaceholderPublicId = (publicId: string) =>
  publicId.startsWith("PLACEHOLDER_");

export const inferInitialsFromEmail = (email: string) => {
  const localPart = email.split("@")[0];
  if (!localPart) return "";
  const separators = /[._-]/;
  const parts = localPart.split(separators);

  if (parts.length > 1) {
    return (
      (parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")
    ).toUpperCase();
  } else {
    return localPart.slice(0, 2).toUpperCase();
  }
};

export const getInitialsFromName = (name: string) => {
  return name
    .split(" ")
    .map((namePart) => namePart.charAt(0).toUpperCase())
    .join("");
};

export const formatMemberDisplayName = (
  name: string | null,
  email: string | null,
) => {
  if (name) return name;
  if (!email) return "";

  const localPart = email.split("@")[0];

  if (!localPart) return "";

  return localPart.replace(/[_-]/g, ".");
};

export const getAvatarUrl = (imageOrKey: string | null) => {
  if (!imageOrKey) return "";

  if (imageOrKey.startsWith("http://") || imageOrKey.startsWith("https://")) {
    return imageOrKey;
  }

  // Construct URL from S3 key
  const useVirtualHosted = env("NEXT_PUBLIC_USE_VIRTUAL_HOSTED_URLS") === "true";
  const storageDomain = env("NEXT_PUBLIC_STORAGE_DOMAIN");
  const storageUrl = env("NEXT_PUBLIC_STORAGE_URL");
  const bucket = env("NEXT_PUBLIC_AVATAR_BUCKET_NAME");

  if (useVirtualHosted && storageDomain && bucket) {
    // Virtual-hosted style: https://{bucket}.{domain}/{key}
    return `https://${bucket}.${storageDomain}/${imageOrKey}`;
  }

  if (storageUrl && bucket) {
    // Path-style: {storageUrl}/{bucket}/{key}
    return `${storageUrl}/${bucket}/${imageOrKey}`;
  }

  return "";
};

export function gregorianToJalali(
  gy: number,
  gm: number,
  gd: number,
): [number, number, number] {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = gy <= 1600 ? 0 : 979;
  let gYear = gy - (gy <= 1600 ? 621 : 1600);
  const gy2 = gm > 2 ? gYear + 1 : gYear;
  let days =
    365 * gYear +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) -
    80 +
    gd +
    (g_d_m[gm - 1] ?? 0);
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  jy += Math.floor((days - 1) / 365);
  if (days > 0) days = (days - 1) % 365;
  const jm =
    days < 186
      ? 1 + Math.floor(days / 31)
      : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return [jy, jm, jd];
}

export function jalaliToGregorian(
  jy: number,
  jm: number,
  jd: number,
): [number, number, number] {
  let gy = jy <= 979 ? 621 : 1600;
  let jYear = jy - (jy <= 979 ? 0 : 979);
  let days =
    365 * jYear +
    Math.floor(jYear / 33) * 8 +
    Math.floor(((jYear % 33) + 3) / 4) +
    78 +
    jd +
    (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  gy += 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  gy += Math.floor((days - 1) / 365);
  if (days > 0) days = (days - 1) % 365;
  const sal_a = [
    0,
    31,
    (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0 ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  let gm = 0;
  while (gm < 13 && days >= (sal_a[gm] ?? 0)) {
    days -= sal_a[gm] ?? 0;
    gm++;
  }
  const gd = days + 1;
  return [gy, gm, gd];
}

export const PERSIAN_MONTH_NAMES = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

export function formatJalaliDate(date: Date, showYear = false): string {
  const [jy, jm, jd] = gregorianToJalali(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
  );
  const monthName = PERSIAN_MONTH_NAMES[jm - 1] ?? "";
  return showYear ? `${jd} ${monthName} ${jy}` : `${jd} ${monthName}`;
}
