'use client';

import { useState } from 'react';
import { Search, ChevronRight, Heart, Brain, Zap, Wind, Eye, Ear, Pill, Stethoscope } from 'lucide-react';

export default function DepartmentalReports() {
  const [searchTerm, setSearchTerm] = useState('');

  const departments = [
    {
      id: 1,
      name: 'Cardiology',
      icon: Heart,
      color: 'text-red-500',
      bg: 'bg-red-50',
      reports: 3,
    },
    {
      id: 2,
      name: 'Neurology',
      icon: Brain,
      color: 'text-purple-500',
      bg: 'bg-purple-50',
      reports: 2,
    },
    {
      id: 3,
      name: 'Orthopedics',
      icon: Zap,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
      reports: 1,
    },
    {
      id: 4,
      name: 'Pulmonology',
      icon: Wind,
      color: 'text-blue-500',
      bg: 'bg-blue-50',
      reports: 2,
    },
    {
      id: 5,
      name: 'Ophthalmology',
      icon: Eye,
      color: 'text-indigo-500',
      bg: 'bg-indigo-50',
      reports: 1,
    },
    {
      id: 6,
      name: 'Otolaryngology',
      icon: Ear,
      color: 'text-pink-500',
      bg: 'bg-pink-50',
      reports: 1,
    },
    {
      id: 7,
      name: 'Pharmacology',
      icon: Pill,
      color: 'text-green-500',
      bg: 'bg-green-50',
      reports: 4,
    },
    {
      id: 8,
      name: 'General Medicine',
      icon: Stethoscope,
      color: 'text-teal-500',
      bg: 'bg-teal-50',
      reports: 5,
    },
  ];

  const filtered = departments.filter((dept) =>
    dept.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-background pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-6 py-6 rounded-b-3xl shadow-lg">
        <h1 className="text-2xl font-bold">Departmental Reports</h1>
        <p className="text-primary-foreground/80 text-sm mt-1">Browse by specialty</p>
      </div>

      <div className="max-w-md mx-auto px-4 pt-6 space-y-6">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-3.5 text-muted-foreground" size={20} />
          <input
            type="text"
            placeholder="Search departments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-card border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Departments Grid */}
        <div className="grid grid-cols-2 gap-4">
          {filtered.map((dept) => {
            const IconComponent = dept.icon;
            return (
              <button
                key={dept.id}
                className={`${dept.bg} rounded-2xl p-4 border-2 border-transparent hover:border-primary transition-all text-left group cursor-pointer`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`${dept.color} p-3 rounded-xl bg-white group-hover:shadow-lg transition-all`}>
                    <IconComponent size={24} />
                  </div>
                  <span className="text-xs font-bold text-muted-foreground bg-white/60 px-2 py-1 rounded-full">
                    {dept.reports}
                  </span>
                </div>
                <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">{dept.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">{dept.reports} report{dept.reports !== 1 ? 's' : ''}</p>
              </button>
            );
          })}
        </div>

        {/* Department Details */}
        {filtered.length > 0 && (
          <div className="bg-card rounded-3xl p-6 shadow-lg border border-border">
            <h3 className="text-lg font-bold text-foreground mb-4">Recent Reports</h3>
            <div className="space-y-3">
              {[
                { dept: 'Cardiology', date: '2024-01-15', status: 'Normal' },
                { dept: 'General Medicine', date: '2024-01-10', status: 'Pending' },
                { dept: 'Pharmacology', date: '2024-01-08', status: 'Reviewed' },
              ].map((report, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-secondary rounded-xl hover:bg-primary/10 transition-all cursor-pointer">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">{report.dept}</p>
                    <p className="text-xs text-muted-foreground">{report.date}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        report.status === 'Normal'
                          ? 'bg-green-100 text-green-700'
                          : report.status === 'Pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {report.status}
                    </span>
                    <ChevronRight size={18} className="text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">No departments found</p>
          </div>
        )}
      </div>
    </div>
  );
}
