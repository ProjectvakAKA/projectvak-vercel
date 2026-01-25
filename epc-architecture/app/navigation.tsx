'use client'

import Link from 'next/link';
import { FileText, Home } from 'lucide-react';

export default function Navigation() {
  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="flex items-center gap-2 text-gray-900 font-semibold">
                <Home className="w-5 h-5" />
                <span>Real Estate Document Parser</span>
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                href="/contracts"
                className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
              >
                <FileText className="w-4 h-4 mr-2" />
                Contracten
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
