'use client';

import { CheckCircle, AlertCircle, TrendingUp, Clock, Zap } from 'lucide-react';

export default function AIHealthSummary() {
  const insights = [
    {
      id: 1,
      title: 'Maintain Cardiovascular Health',
      description: 'Your recent cardiology reports show stable heart function. Continue current exercise routine and medication.',
      severity: 'positive',
      sources: ['Cardiology Report (Jan 15)', 'Vital Stats (Today)'],
      icon: CheckCircle,
    },
    {
      id: 2,
      title: 'Blood Sugar Management',
      description: 'Lab results indicate good glucose control. Continue Metformin as prescribed and maintain current diet.',
      severity: 'positive',
      sources: ['Lab Test (Jan 10)', 'Medical History'],
      icon: CheckCircle,
    },
    {
      id: 3,
      title: 'Increase Daily Hydration',
      description: 'Based on your recent test results and vital signs, increasing water intake will help optimize kidney function.',
      severity: 'warning',
      sources: ['Lab Test (Jan 10)', 'Vital Stats (Jan 15)'],
      icon: AlertCircle,
    },
    {
      id: 4,
      title: 'Schedule Regular Check-ups',
      description: 'It has been 3 months since your last general checkup. Schedule an appointment with Dr. Brown.',
      severity: 'info',
      sources: ['Medical Timeline', 'System Tracking'],
      icon: Clock,
    },
    {
      id: 5,
      title: 'Medication Review Due',
      description: 'Your blood pressure medication can be reviewed based on recent readings. Discuss optimization with your doctor.',
      severity: 'info',
      sources: ['Vital Signs (Weekly)', 'Pharmacy Records'],
      icon: Zap,
    },
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'positive':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          badge: 'bg-green-100 text-green-700',
          text: 'text-green-900',
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          badge: 'bg-yellow-100 text-yellow-700',
          text: 'text-yellow-900',
        };
      case 'info':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          badge: 'bg-blue-100 text-blue-700',
          text: 'text-blue-900',
        };
      default:
        return {
          bg: 'bg-secondary',
          border: 'border-border',
          badge: 'bg-secondary text-foreground',
          text: 'text-foreground',
        };
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary to-background pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-6 py-6 rounded-b-3xl shadow-lg">
        <h1 className="text-2xl font-bold mb-2">AI Health Summary</h1>
        <p className="text-primary-foreground/80 text-sm">Generated from your medical records</p>
      </div>

      <div className="max-w-md mx-auto px-4 pt-6 space-y-4">
        {/* Last Updated */}
        <div className="text-center text-sm text-muted-foreground mb-6">
          <p>Last updated: Today at 9:45 AM</p>
        </div>

        {/* Insights */}
        <div className="space-y-4">
          {insights.map((insight) => {
            const colors = getSeverityColor(insight.severity);
            const IconComponent = insight.icon;

            return (
              <div key={insight.id} className={`${colors.bg} rounded-2xl p-5 border-2 ${colors.border}`}>
                {/* Header with Icon and Badge */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="pt-1">
                    <IconComponent size={24} className="text-primary flex-shrink-0" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-bold ${colors.text}`}>{insight.title}</h3>
                  </div>
                  <span className={`${colors.badge} px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0`}>
                    {insight.severity === 'positive'
                      ? 'Positive'
                      : insight.severity === 'warning'
                        ? 'Action'
                        : 'Info'}
                  </span>
                </div>

                {/* Description */}
                <p className={`text-sm mb-4 ${colors.text}`}>{insight.description}</p>

                {/* Sources */}
                <div className="border-t border-current border-opacity-20 pt-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Sources:</p>
                  <div className="flex flex-wrap gap-2">
                    {insight.sources.map((source, idx) => (
                      <span
                        key={idx}
                        className={`text-xs px-2 py-1 rounded-full ${colors.badge}`}
                      >
                        {source}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Card */}
        <div className="bg-primary text-primary-foreground rounded-3xl p-6 shadow-lg mt-8">
          <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
            <TrendingUp size={24} />
            Next Steps
          </h3>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-3">
              <span className="text-lg mt-0.5">1.</span>
              <span>Schedule a follow-up with your primary care doctor</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-lg mt-0.5">2.</span>
              <span>Review medication effectiveness with Dr. Brown</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-lg mt-0.5">3.</span>
              <span>Increase daily water intake to 2-3 liters</span>
            </li>
          </ul>
        </div>

        {/* Disclaimer */}
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-4 text-center">
          <p className="text-xs text-yellow-900">
            This AI summary is for informational purposes only. Always consult with your healthcare provider for medical decisions.
          </p>
        </div>
      </div>
    </div>
  );
}
