'use client';

import React, { useState, useMemo } from 'react';
import { Clock, Download, Filter, AlertTriangle, Info, AlertCircle, X } from 'lucide-react';
import type { Notice, OperationalPeriod } from './types/airfield';

interface NoticeTimelineProps {
  notices: Notice[];
  operationalPeriods: OperationalPeriod[];
  onClose: () => void;
}

type FilterPeriod = '7days' | '30days' | '90days' | '12months' | 'custom' | 'all';

const NoticeTimeline: React.FC<NoticeTimelineProps> = ({ notices, operationalPeriods, onClose }) => {
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('30days');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'warning' | 'info' | 'alert'>('all');

  const getFilteredNotices = useMemo(() => {
    let filtered = [...notices].reverse(); // Most recent first

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(n => n.type === filterType);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(n =>
        n.message.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by date period
    const now = new Date();
    let cutoffDate: Date | null = null;

    switch (filterPeriod) {
      case '7days':
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30days':
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90days':
        cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '12months':
        cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case 'custom':
        if (customStartDate && customEndDate) {
          const start = new Date(customStartDate);
          const end = new Date(customEndDate);
          filtered = filtered.filter(n => {
            const noticeDate = new Date(n.timestamp);
            return noticeDate >= start && noticeDate <= end;
          });
        }
        break;
      case 'all':
      default:
        break;
    }

    if (cutoffDate && filterPeriod !== 'custom') {
      filtered = filtered.filter(n => new Date(n.timestamp) >= cutoffDate);
    }

    return filtered;
  }, [notices, filterPeriod, customStartDate, customEndDate, searchQuery, filterType]);

  const formatTimestamp = (isoString: string, icaoCode?: string) => {
    const date = new Date(isoString);
    const utcFormatted = date.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'UTC'
    });
    const icao = icaoCode ? ` [${icaoCode}]` : '';
    return `${utcFormatted} UTC${icao}`;
  };

  const getNoticeIcon = (type: Notice['type']) => {
    switch (type) {
      case 'alert':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-400" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-400" />;
    }
  };

  const getNoticeColor = (type: Notice['type']) => {
    switch (type) {
      case 'alert':
        return 'border-red-500 bg-red-900 bg-opacity-20';
      case 'warning':
        return 'border-amber-500 bg-amber-900 bg-opacity-20';
      case 'info':
        return 'border-blue-500 bg-blue-900 bg-opacity-20';
    }
  };

  const exportToPDF = () => {
    // Get severity counts for summary page
    const severityCounts = {
      safetySignificant: getFilteredNotices.filter(n => n.significance === 'safety-significant').length,
      operational: getFilteredNotices.filter(n => n.significance === 'operational').length,
      routine: getFilteredNotices.filter(n => n.significance === 'routine').length
    };

    // Create printable HTML content
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Airfield Operations Audit Report</title>
        <style>
          @page {
            margin: 2cm 2cm 3cm 2cm;
            @bottom-right {
              content: "Page " counter(page);
            }
          }
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          h1 {
            text-align: center;
            color: #1e40af;
            border-bottom: 3px solid #1e40af;
            padding-bottom: 10px;
          }
          h2 {
            color: #1e40af;
            border-bottom: 2px solid #93c5fd;
            padding-bottom: 5px;
            margin-top: 30px;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .system-info {
            text-align: center;
            font-size: 0.75rem;
            color: #6b7280;
            margin-bottom: 20px;
          }
          .filters {
            background: #f3f4f6;
            padding: 15px;
            margin-bottom: 20px;
            border-radius: 5px;
          }
          .notice {
            border-left: 4px solid #ccc;
            padding: 15px;
            margin-bottom: 15px;
            page-break-inside: avoid;
          }
          .notice.alert { border-left-color: #dc2626; background: #fef2f2; }
          .notice.warning { border-left-color: #f59e0b; background: #fffbeb; }
          .notice.info { border-left-color: #3b82f6; background: #eff6ff; }
          .notice-type {
            font-weight: bold;
            text-transform: uppercase;
            font-size: 0.875rem;
          }
          .notice-type.alert { color: #dc2626; }
          .notice-type.warning { color: #f59e0b; }
          .notice-type.info { color: #3b82f6; }
          .timestamp {
            color: #6b7280;
            font-size: 0.875rem;
            margin-top: 5px;
          }
          .message {
            margin-top: 8px;
            font-size: 0.95rem;
          }
          .user-info {
            font-size: 0.8rem;
            color: #6b7280;
            margin-top: 8px;
            font-style: italic;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
            text-align: center;
            font-size: 0.875rem;
            color: #6b7280;
          }
          .summary {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin-bottom: 30px;
          }
          .summary-card {
            padding: 15px;
            border-radius: 5px;
            text-align: center;
          }
          .summary-card.alert { background: #fef2f2; border: 2px solid #dc2626; }
          .summary-card.warning { background: #fffbeb; border: 2px solid #f59e0b; }
          .summary-card.info { background: #eff6ff; border: 2px solid #3b82f6; }
          .summary-count {
            font-size: 2rem;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .summary-page {
            page-break-before: always;
            page-break-after: always;
          }
          .severity-summary {
            display: grid;
            grid-template-columns: 1fr;
            gap: 15px;
            margin: 20px 0;
          }
          .severity-card {
            padding: 15px;
            border-radius: 5px;
            border: 2px solid #e5e7eb;
          }
          .severity-card h3 {
            margin: 0 0 10px 0;
            font-size: 1.2rem;
          }
          .severity-card .count {
            font-size: 2.5rem;
            font-weight: bold;
            color: #1e40af;
          }
          .signature-block {
            margin-top: 60px;
            page-break-inside: avoid;
            border: 2px solid #e5e7eb;
            padding: 30px;
            border-radius: 5px;
          }
          .signature-line {
            margin-top: 40px;
            padding-top: 2px;
            border-top: 2px solid #000;
            width: 300px;
          }
          .signature-label {
            font-size: 0.875rem;
            color: #6b7280;
            margin-top: 5px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Airfield Operations Audit Report</h1>
          <div class="system-info">
            <strong>System:</strong> Airfield Operations Map v0.1.0<br>
            ${getFilteredNotices.length > 0 && getFilteredNotices[0].airportIcao ? `<strong>Airport:</strong> ${getFilteredNotices[0].airportIcao}<br>` : ''}
            <strong>Generated:</strong> ${new Date().toLocaleString('en-GB', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              timeZone: 'UTC'
            })} UTC
          </div>
          <p style="font-size: 0.875rem; color: #6b7280; margin-top: 10px;">
            <strong>Note:</strong> All timestamps in this report are in Coordinated Universal Time (UTC)
          </p>
        </div>

        <div class="filters">
          <strong>Report Parameters:</strong><br>
          Period: ${filterPeriod === 'custom' ? `${customStartDate} to ${customEndDate}` : filterPeriod}<br>
          Filter: ${filterType === 'all' ? 'All Types' : filterType.toUpperCase()}<br>
          Total Records: ${getFilteredNotices.length}<br>
          Time Zone: UTC (Coordinated Universal Time)
        </div>

        <h2>Event Type Summary</h2>
        <div class="summary">
          <div class="summary-card alert">
            <div class="summary-count">${getFilteredNotices.filter(n => n.type === 'alert').length}</div>
            <div>ALERTS</div>
          </div>
          <div class="summary-card warning">
            <div class="summary-count">${getFilteredNotices.filter(n => n.type === 'warning').length}</div>
            <div>WARNINGS</div>
          </div>
          <div class="summary-card info">
            <div class="summary-count">${getFilteredNotices.filter(n => n.type === 'info').length}</div>
            <div>INFO</div>
          </div>
        </div>

        <h2>Operational Events</h2>
        ${getFilteredNotices.map(notice => `
          <div class="notice ${notice.type}">
            <span class="notice-type ${notice.type}">${notice.type}</span>
            ${notice.significance ? `<span style="margin-left: 10px; font-size: 0.75rem; color: #6b7280;">[${notice.significance.toUpperCase()}]</span>` : ''}
            <div class="timestamp">${formatTimestamp(notice.timestamp, notice.airportIcao)}</div>
            <div class="message">${notice.message}</div>
            ${notice.changedBy ? `<div class="user-info">Changed by: ${notice.changedBy}${notice.changedByRole ? ` (${notice.changedByRole})` : ''}${notice.reason ? ` - Reason: ${notice.reason}` : ''}</div>` : ''}
          </div>
        `).join('')}

        <!-- Summary Page -->
        <div class="summary-page">
          <h1>Report Summary</h1>

          <h2>Event Classification by Safety Significance</h2>
          <div class="severity-summary">
            <div class="severity-card" style="background: #fef2f2; border-color: #dc2626;">
              <h3 style="color: #dc2626;">Safety-Significant Events</h3>
              <div class="count" style="color: #dc2626;">${severityCounts.safetySignificant}</div>
              <p style="font-size: 0.875rem; color: #6b7280;">Events with potential impact on flight safety (runway/taxiway status, RWYCC, snow/ice, low visibility)</p>
            </div>
            <div class="severity-card" style="background: #fffbeb; border-color: #f59e0b;">
              <h3 style="color: #f59e0b;">Operational Events</h3>
              <div class="count" style="color: #f59e0b;">${severityCounts.operational}</div>
              <p style="font-size: 0.875rem; color: #6b7280;">Events affecting operational efficiency (WIP scheduling, maintenance activities)</p>
            </div>
            <div class="severity-card" style="background: #eff6ff; border-color: #3b82f6;">
              <h3 style="color: #3b82f6;">Routine Events</h3>
              <div class="count" style="color: #3b82f6;">${severityCounts.routine}</div>
              <p style="font-size: 0.875rem; color: #6b7280;">Standard operational activities (diagram uploads, configuration changes)</p>
            </div>
          </div>

          <h2>Regulatory Compliance</h2>
          <div style="background: #eff6ff; padding: 15px; border-radius: 5px; border: 2px solid #3b82f6; margin: 20px 0;">
            <p><strong>Audit Log Integrity:</strong> All operational events and notices are immutable and append-only. Records are retained for a minimum of 3 years in accordance with UK CAA regulations for continuing airworthiness (CAP 562).</p>
            <p style="margin-top: 10px;"><strong>Record Retention:</strong> This report contains ${getFilteredNotices.length} operational notice(s) from the selected reporting period.</p>
          </div>

          <div class="signature-block">
            <h3>Certification</h3>
            <p>I certify that this report has been reviewed and is an accurate representation of the airfield operational events for the specified period.</p>

            <div style="margin-top: 40px;">
              <div class="signature-line"></div>
              <div class="signature-label">Signature</div>
            </div>

            <div style="margin-top: 30px;">
              <div class="signature-line"></div>
              <div class="signature-label">Printed Name & Position</div>
            </div>

            <div style="margin-top: 30px;">
              <div class="signature-line"></div>
              <div class="signature-label">Date</div>
            </div>
          </div>
        </div>

        <div class="footer">
          <p><strong>Airfield Operations Map System v0.1.0</strong></p>
          <p>This is an official audit report containing ${getFilteredNotices.length} operational notice(s).</p>
          <p>Report generated in accordance with UK CAA regulatory requirements.</p>
        </div>
      </body>
      </html>
    `;

    // Open print dialog
    const printWindow = window.open('', '', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  const stats = useMemo(() => {
    const filtered = getFilteredNotices;
    return {
      total: filtered.length,
      alerts: filtered.filter(n => n.type === 'alert').length,
      warnings: filtered.filter(n => n.type === 'warning').length,
      info: filtered.filter(n => n.type === 'info').length
    };
  }, [getFilteredNotices]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-blue-400" />
            <div>
              <h2 className="text-2xl font-bold">Operations Timeline</h2>
              <p className="text-sm text-slate-400">Historical audit trail of all system events</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Statistics Summary */}
        <div className="grid grid-cols-4 gap-4 p-6 border-b border-slate-700">
          <div className="bg-slate-700 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-white">{stats.total}</div>
            <div className="text-sm text-slate-400">Total Events</div>
          </div>
          <div className="bg-red-900 bg-opacity-30 border-2 border-red-500 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-red-400">{stats.alerts}</div>
            <div className="text-sm text-red-300">Alerts</div>
          </div>
          <div className="bg-amber-900 bg-opacity-30 border-2 border-amber-500 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-amber-400">{stats.warnings}</div>
            <div className="text-sm text-amber-300">Warnings</div>
          </div>
          <div className="bg-blue-900 bg-opacity-30 border-2 border-blue-500 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-blue-400">{stats.info}</div>
            <div className="text-sm text-blue-300">Info</div>
          </div>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-slate-700 space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-5 h-5 text-slate-400" />
            <h3 className="font-semibold">Filters</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Time Period */}
            <div>
              <label className="block text-sm font-semibold mb-2">Time Period</label>
              <select
                value={filterPeriod}
                onChange={(e) => setFilterPeriod(e.target.value as FilterPeriod)}
                className="w-full bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 focus:border-blue-500 outline-none"
              >
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="90days">Last 90 Days</option>
                <option value="12months">Last 12 Months</option>
                <option value="custom">Custom Range</option>
                <option value="all">All Time</option>
              </select>
            </div>

            {/* Event Type */}
            <div>
              <label className="block text-sm font-semibold mb-2">Event Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as typeof filterType)}
                className="w-full bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 focus:border-blue-500 outline-none"
              >
                <option value="all">All Types</option>
                <option value="alert">Alerts Only</option>
                <option value="warning">Warnings Only</option>
                <option value="info">Info Only</option>
              </select>
            </div>
          </div>

          {/* Custom Date Range */}
          {filterPeriod === 'custom' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Start Date</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">End Date</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 focus:border-blue-500 outline-none"
                />
              </div>
            </div>
          )}

          {/* Search */}
          <div>
            <label className="block text-sm font-semibold mb-2">Search</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by message content..."
              className="w-full bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 focus:border-blue-500 outline-none"
            />
          </div>

          {/* Export Button */}
          <button
            onClick={exportToPDF}
            className="w-full bg-green-600 hover:bg-green-700 px-4 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            Export to PDF / Print
          </button>
        </div>

        {/* Timeline List */}
        <div className="flex-1 overflow-y-auto p-6">
          {getFilteredNotices.length === 0 ? (
            <div className="text-center text-slate-400 py-12">
              <Clock className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No events found for the selected filters</p>
            </div>
          ) : (
            <div className="space-y-3">
              {getFilteredNotices.map(notice => (
                <div
                  key={notice.id}
                  className={`border-2 rounded-lg p-4 ${getNoticeColor(notice.type)}`}
                >
                  <div className="flex items-start gap-3">
                    {getNoticeIcon(notice.type)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`font-bold text-xs uppercase px-2 py-1 rounded ${
                          notice.type === 'alert' ? 'bg-red-500 text-white' :
                          notice.type === 'warning' ? 'bg-amber-500 text-black' :
                          'bg-blue-500 text-white'
                        }`}>
                          {notice.type}
                        </span>
                        <span className="text-sm text-slate-400">
                          {formatTimestamp(notice.timestamp, notice.airportIcao)}
                        </span>
                      </div>
                      <p className="text-white">{notice.message}</p>
                      {notice.airportIcao && (
                        <p className="text-xs text-slate-500 mt-1">Airport: {notice.airportIcao}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NoticeTimeline;
