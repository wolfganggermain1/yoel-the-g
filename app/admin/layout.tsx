import AdminGuard from '@/components/AdminGuard';
import AdminNav from './AdminNav';

export const metadata = {
  title: 'Admin Panel | Yoel The G',
  description: 'Manage games, developers, and platform settings.',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGuard>
      <div className="flex flex-col md:flex-row min-h-[calc(100vh-40px)]">
        {/* Sidebar / Top navigation */}
        <AdminNav />

        {/* Main content */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </AdminGuard>
  );
}
