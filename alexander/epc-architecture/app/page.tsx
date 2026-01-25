'use client'

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { FileText, TrendingUp, CheckCircle, AlertCircle, Clock, ArrowRight, Database } from 'lucide-react';

interface Stats {
  total: number;
  highConfidence: number;
  needsReview: number;
  recent: number;
}

export default function HomePage() {
  const [stats, setStats] = useState<Stats>({
    total: 0,
    highConfidence: 0,
    needsReview: 0,
    recent: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/contracts');
        if (!response.ok) {
          throw new Error('Failed to fetch contracts');
        }
        const data = await response.json();
        const contracts = data.contracts || [];

        // Calculate stats
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const recent = contracts.filter((c: any) => {
          const modified = new Date(c.modified);
          return modified >= oneWeekAgo;
        }).length;

        // Calculate high confidence and needs review from available data
        const highConfidence = contracts.filter((c: any) => {
          const confidence = c.confidence;
          return confidence !== null && confidence >= 95;
        }).length;

        const needsReview = contracts.filter((c: any) => {
          const confidence = c.confidence;
          return confidence !== null && confidence < 80;
        }).length;

        setStats({
          total: contracts.length,
          highConfidence,
          needsReview,
          recent,
        });
      } catch (err: any) {
        setError(err.message || 'Failed to load statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto p-6">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 border-2 border-primary/20 flex items-center justify-center shrink-0 shadow-sm">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">
                Document Hub
              </h1>
              <p className="text-xl text-gray-600 mt-2">
                Automatische analyse en extractie van huurcontracten uit Dropbox
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-8">
            {error}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">Totaal Contracten</h3>
              <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">Hoog Vertrouwen</h3>
              <p className="text-3xl font-bold text-gray-900">{stats.highConfidence}</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">Nakijken Vereist</h3>
              <p className="text-3xl font-bold text-gray-900">{stats.needsReview}</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Clock className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">Laatste Week</h3>
              <p className="text-3xl font-bold text-gray-900">{stats.recent}</p>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Link
            href="/contracts"
            className="bg-white rounded-lg shadow-sm p-8 border border-gray-200 hover:shadow-md transition group"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Bekijk Alle Contracten
                </h2>
                <p className="text-gray-600 mb-4">
                  Overzicht van alle geanalyseerde huurcontracten uit Dropbox TARGET
                </p>
                <div className="flex items-center text-blue-600 font-medium group-hover:gap-3 transition-all gap-2">
                  <span>Ga naar overzicht</span>
                  <ArrowRight className="w-5 h-5" />
                </div>
              </div>
              <div className="p-4 bg-blue-100 rounded-lg">
                <Database className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </Link>

          <div className="bg-white rounded-lg shadow-sm p-8 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Systeem Status
                </h2>
                <p className="text-gray-600 mb-4">
                  Python backend verwerkt documenten en slaat JSON op in Dropbox TARGET
                </p>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-gray-600">Actief</span>
                </div>
              </div>
              <div className="p-4 bg-green-100 rounded-lg">
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="bg-white rounded-lg shadow-sm p-8 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Hoe het werkt</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-blue-600 font-bold">1</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Python Backend</h3>
              <p className="text-gray-600 text-sm">
                De Python script analyseert PDF documenten met Gemini AI en extraheert alle contractgegevens.
              </p>
            </div>
            <div>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-blue-600 font-bold">2</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Dropbox TARGET</h3>
              <p className="text-gray-600 text-sm">
                Geanalyseerde data wordt opgeslagen als JSON bestanden in Dropbox TARGET folder.
              </p>
            </div>
            <div>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-blue-600 font-bold">3</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Frontend Display</h3>
              <p className="text-gray-600 text-sm">
                Deze website haalt JSON bestanden op en toont alle contractgegevens in een overzichtelijke interface.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
