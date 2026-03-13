'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: '\u{1F4CA}' },
  { href: '/admin/games', label: 'Games', icon: '\u{1F3AE}' },
  { href: '/admin/developers', label: 'Developers', icon: '\u{1F468}\u{200D}\u{1F4BB}' },
];

export default function AdminNav() {
  const pathname = usePathname();

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
        {NAV_ITEMS.map((item) => {
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
