"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function IconDashboard({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 12h6V3H3v9z" />
      <path d="M15 21h6V11h-6v10z" />
      <path d="M15 3h6v6h-6V3z" />
      <path d="M3 21h6v-7H3v7z" />
    </svg>
  );
}

function IconBrain({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M8 6a3 3 0 0 1 5.2-2" />
      <path d="M14 6a3 3 0 0 1 2 5 3 3 0 0 1 0 6 3 3 0 0 1-3 3H10a3 3 0 0 1-3-3 3 3 0 0 1 0-6 3 3 0 0 1 2-5" />
      <path d="M9 9h.01" />
      <path d="M15 9h.01" />
      <path d="M9 15h.01" />
    </svg>
  );
}

function IconUsers({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconReport({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M9 11H7v-2h2v2z" />
      <path d="M17 11h-6V9h6v2z" />
      <path d="M9 17H7v-2h2v2z" />
      <path d="M17 17H9v-2h8v2z" />
      <path d="M3 21V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v16H3z" />
    </svg>
  );
}

type NavItem = {
  href: string;
  label: string;
  icon: (props: { className?: string }) => React.ReactNode;
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: IconDashboard },
  {
    href: "/alzheimer-predictions",
    label: "Alzheimer predictions",
    icon: IconBrain,
  },
  { href: "/users", label: "Users", icon: IconUsers },
  { href: "/reports", label: "Reports", icon: IconReport },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-72 shrink-0 border-r border-zinc-200 bg-white">
      <div className="flex items-start gap-2 px-4 py-4">
        <button
          type="button"
          className="rounded-xl border border-zinc-200 bg-white px-2 py-2 text-zinc-600 hover:bg-zinc-50"
          aria-label="Back"
        >
          ←
        </button>
        <div className="flex-1" />
      </div>

      <div className="px-4 pb-4">
        <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5D5FEF]/10 text-[#5D5FEF]">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path d="M12 2a9 9 0 0 1 0 18a9 9 0 0 1 0-18z" />
              <path d="M8 12h6" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-zinc-900">
              Daniel Perez
            </div>
            <div className="truncate text-[11px] text-zinc-500">
              Administrator
            </div>
          </div>
        </div>
      </div>

      <div className="px-4">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          Main Menu
        </div>

        <nav className="mt-3 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
                  isActive
                    ? "bg-[#5D5FEF]/10 text-[#2B2B5F] shadow-sm ring-1 ring-[#5D5FEF]/20"
                    : "text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                <Icon className="h-4 w-4 text-inherit" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

