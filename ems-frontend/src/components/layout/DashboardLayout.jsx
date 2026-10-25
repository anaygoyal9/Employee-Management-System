import { useState } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const DashboardLayout = ({ children }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900 antialiased">
            {/* Sidebar */}
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            {/* Main Content Area */}
            <div className="flex flex-1 flex-col overflow-x-hidden">
                {/* Navbar */}
                <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

                {/* Page View Body */}
                <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
