'use client';

import { useEffect, useState } from 'react';
import { UserSession, MedicalReport, storage } from '@/lib/storage';
import { ArrowLeft, Plus, FileText, Calendar, User } from 'lucide-react';

interface MedicalReportsScreenProps {
  user: UserSession | null;
  onBack: () => void;
  onUploadNew: () => void;
}

export default function MedicalReportsScreen({ user, onBack, onUploadNew }: MedicalReportsScreenProps) {
  const [reports, setReports] = useState<MedicalReport[]>([]);

  useEffect(() => {
    const savedReports = storage.getMedicalReports();
    setReports(savedReports);
  }, []);

  const categories = ['All', 'Lab Tests', 'Imaging', 'Consultation', 'Vaccination'];
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredReports = selectedCategory === 'All'
    ? reports
    : reports.filter(r => r.category === selectedCategory);

  const groupedByCategory = filteredReports.reduce((acc, report) => {
    if (!acc[report.category]) {
      acc[report.category] = [];
    }
    acc[report.category].push(report);
    return acc;
  }, {} as Record<string, MedicalReport[]>);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-slate-600 dark:text-slate-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Medical Reports</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">{reports.length} reports</p>
          </div>
        </div>
        <button
          onClick={onUploadNew}
          className="p-3 bg-gradient-to-r from-cyan-400 to-cyan-600 hover:from-cyan-500 hover:to-cyan-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-full whitespace-nowrap transition-all font-semibold text-sm ${
              selectedCategory === cat
                ? 'bg-gradient-to-r from-cyan-400 to-cyan-600 text-white shadow-lg'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Reports List */}
      {Object.keys(groupedByCategory).length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400 font-semibold mb-2">No reports yet</p>
          <p className="text-slate-500 dark:text-slate-500 text-sm mb-4">Upload your first medical report</p>
          <button
            onClick={onUploadNew}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-400 to-cyan-600 hover:from-cyan-500 hover:to-cyan-700 text-white rounded-lg font-semibold"
          >
            <Plus className="w-5 h-5" />
            Upload Report
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByCategory).map(([category, categoryReports]) => (
            <div key={category} className="space-y-3">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{category}</h3>
              <div className="space-y-3">
                {categoryReports.map((report) => (
                  <div
                    key={report.id}
                    className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-600 rounded-2xl p-4 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-xl flex items-center justify-center flex-shrink-0">
                          <FileText className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-slate-900 dark:text-white text-sm">{report.title}</h4>
                          <p className="text-xs text-slate-600 dark:text-slate-400 truncate">{report.description}</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ml-2 ${
                        report.status === 'completed'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                      }`}>
                        {report.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(report.date).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {report.doctor}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
