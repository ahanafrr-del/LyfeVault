'use client';

import { useState } from 'react';
import { Calendar, ArrowUpDown, Search, CheckCircle } from 'lucide-react';

export default function MedicalTimeline() {
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [searchTerm, setSearchTerm] = useState('');

  const timelineEntries = [
    {
      id: 1,
      date: '2024-01-15',
      type: 'Consultation',
      doctor: 'Dr. Lisa Brown',
      facility: 'City Medical Center',
      description: 'General checkup and health review',
      status: 'Completed',
      tags: ['General Medicine'],
    },
    {
      id: 2,
      date: '2024-01-10',
      type: 'Lab Test',
      doctor: 'Lab Technician',
      facility: 'City Medical Center',
      description: 'Blood work and glucose levels',
      status: 'Completed',
      tags: ['Laboratory'],
    },
    {
      id: 3,
      date: '2024-01-05',
      type: 'Imaging',
      doctor: 'Dr. Michael Rodriguez',
      facility: 'Radiology Department',
      description: 'Chest X-ray',
      status: 'Completed',
      tags: ['Imaging'],
    },
    {
      id: 4,
      date: '2023-12-28',
      type: 'Prescription',
      doctor: 'Dr. Lisa Brown',
      facility: 'City Medical Center',
      description: 'Medication refill - Metformin',
      status: 'Completed',
      tags: ['Pharmacy'],
    },
    {
      id: 5,
      date: '2023-12-20',
      type: 'Consultation',
      doctor: 'Dr. Patricia Lee',
      facility: 'Cardiology Clinic',
      description: 'Heart health assessment',
      status: 'Completed',
      tags: ['Cardiology'],
    },
  ];

  const sorted = [...timelineEntries].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
  });

  const filtered = sorted.filter(
    (entry) =>
      entry.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.doctor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Consultation':
        return 'bg-blue-500';
      case 'Lab Test':
        return 'bg-purple-500';
      case 'Imaging':
        return 'bg-orange-500';
      case 'Prescription':
        return 'bg-green-500';
      default:
        return 'bg-primary';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-background pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-6 py-6 rounded-b-3xl shadow-lg">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <Calendar size={28} />
          Medical Timeline
        </h1>
      </div>

      <div className="max-w-md mx-auto px-4 pt-6 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-3.5 text-muted-foreground" size={20} />
          <input
            type="text"
            placeholder="Search records..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-card border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Sort Button */}
        <button
          onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
          className="w-full flex items-center justify-center gap-2 py-3 bg-card border border-border rounded-xl text-foreground hover:bg-secondary transition-all font-medium"
        >
          <ArrowUpDown size={20} />
          Sort: {sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}
        </button>

        {/* Timeline */}
        <div className="space-y-4">
          {filtered.length > 0 ? (
            filtered.map((entry, idx) => (
              <div key={entry.id} className="relative">
                {/* Timeline Line */}
                {idx < filtered.length - 1 && (
                  <div className="absolute left-6 top-20 w-1 h-12 bg-border"></div>
                )}

                {/* Timeline Entry */}
                <div className="bg-card rounded-2xl p-5 shadow-md border border-border hover:shadow-lg transition-all">
                  {/* Header with Type Badge */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`${getTypeColor(entry.type)} p-2 rounded-lg text-white flex-shrink-0 mt-0.5`}>
                        <CheckCircle size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-foreground">{entry.type}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(entry.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </div>
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                      {entry.status}
                    </span>
                  </div>

                  {/* Doctor and Facility */}
                  <div className="mb-3 space-y-1 text-sm">
                    <p className="text-foreground font-medium">{entry.doctor}</p>
                    <p className="text-muted-foreground">{entry.facility}</p>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-foreground mb-3 bg-secondary p-3 rounded-lg">{entry.description}</p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2">
                    {entry.tags.map((tag) => (
                      <span key={tag} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Action Button */}
                  <button className="w-full mt-4 py-2 bg-secondary text-primary rounded-lg hover:bg-accent/20 transition-all font-medium text-sm">
                    View Details
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">No records found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
