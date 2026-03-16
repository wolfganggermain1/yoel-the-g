'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/AdminGuard';

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: '\u{1F4CA}', minRole: 'outside_dev' },
  { href: '/admin/games', label: 'Games', icon: '\u{1F3AE}', minRole: 'family_dev' },
  { href: '/admin/developers', label: 'Developers', icon: '\u{1F468}\u{200D}\u{1F4BB}', minRole: 'admin' },
  { href: '/admin/users', label: 'Users', icon: '\u{1F465}', minRole: 'super_admin' },
];

const ROLE_HIERARCHY: Record<string, number> = {
  super_admin: 4,
  admin: 3,
  family_dev: 2,
  outside_dev: 1,
};

export default function AdminNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  const userLevel = user ? (ROLE_HIERARCHY[user.role] ?? 0) : 0;
  const visibleItems = NAV_ITEMS.filter(
    (item) => userLevel >= (ROLE_HIERARCHY[item.minRole] ?? 0),
  );

  return (
    <nav
      className="md:w-56 flex-shrink-0"
      style={{
        backgroundColor: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Header */}
      <div className="p-4 pb-2">
        <h1
          className="text-lg font-bold font-fredoka"
          style={{ color: 'var(--text)' }}
        >
          {'\u2699\uFE0F'} Admin Panel
        </h1>
      </div>

      {/* Nav links */}
      <ul className="flex md:flex-col gap-1 p-2 overflow-x-auto">
        {visibleItems.map((item) => {
          const isActive =
            item.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(item.href);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors"
                style={{
                  backgroundColor: isActive ? 'var(--primary)' : 'transparent',
                  color: isActive ? '#fff' : 'var(--text)',
                }}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Back to site */}
      <div className="p-2 mt-auto">
        <Link
          href="/"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm opacity-70 hover:opacity-100 transition-opacity"
          style={{ color: 'var(--text)' }}
        >
          <span>{'\u2190'}</span>
          Back to Site
        </Link>
      </div>
    </nav>
  );
}
