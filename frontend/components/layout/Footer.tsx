import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-slate-200 mt-auto py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            <span className="font-semibold text-slate-700">Sunset Group</span> &copy; {new Date().getFullYear()}. All rights reserved.
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <span>Sunset Kuakata Hotel &amp; Resort</span>
            <span className="text-slate-300">&bull;</span>
            <span>Dhaka Fantasy Island</span>
            <span className="text-slate-300">&bull;</span>
            <span>Sun Care Hospital &amp; Diagnostic Centre</span>
            <span className="text-slate-300">&bull;</span>
            <span>Super Combo</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

