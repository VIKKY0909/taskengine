import React, { useState, useEffect } from 'react';
import ExcelJS from 'exceljs';
import { Task, DBConfig, TeamRole, TaskWeek, TaskCategory, TaskStatus } from './types';
import ProgressStats from './components/ProgressStats';
import TaskCard from './components/TaskCard';
import TaskDetailsModal from './components/TaskDetailsModal';
import CreateTaskModal from './components/CreateTaskModal';
import {
  Plus,
  Search,
  Filter,
  RefreshCw,
  Compass,
  AlertCircle,
  Download,
  FileSpreadsheet
} from 'lucide-react';

export default function App() {
  // Application state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dbConfig, setDbConfig] = useState<DBConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [program, setProgram] = useState<'kthp' | 'symconverge' | 'databook'>('kthp');
  const [exporting, setExporting] = useState(false);

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<TeamRole | 'All'>('All');
  const [filterWeek, setFilterWeek] = useState<TaskWeek | 'All'>('All');
  const [filterCategory, setFilterCategory] = useState<TaskCategory | 'All'>('All');
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'All'>('All');
  const [showOnlySuggested, setShowOnlySuggested] = useState(false);

  // Modals state
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Initial fetch of data
  const parseApiJson = async (res: Response, label: string) => {
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const preview = (await res.text()).slice(0, 80);
      throw new Error(
        `${label} returned non-JSON (${res.status}). Backend may not be routed correctly. Preview: ${preview}`
      );
    }
    return res.json();
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const statusRes = await fetch('/api/db-status');
      if (!statusRes.ok) {
        const errBody = await statusRes.json().catch(() => ({}));
        throw new Error(
          errBody.connectionError ||
            errBody.error ||
            `API returned ${statusRes.status}. Ensure MONGODB_URI is set in Vercel environment variables.`
        );
      }
      const statusData: DBConfig = await parseApiJson(statusRes, 'Database status');
      setDbConfig(statusData);

      const tasksRes = await fetch(`/api/tasks?program=${program}`);
      if (!tasksRes.ok) throw new Error('Failed to retrieve task board parameters.');
      const tasksData: Task[] = await parseApiJson(tasksRes, 'Tasks');
      setTasks(tasksData);
    } catch (err: any) {
      console.error('[App] Initial load error:', err);
      setError(err.message || 'Failed to sync with active backend layer.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [program]);

  // Create Task Action
  const handleCreateTask = async (taskData: Omit<Task, 'history' | 'updatedAt'>) => {
    try {
      const response = await fetch(`/api/tasks?program=${program}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      });

      if (!response.ok) {
        const errBody = await response.json();
        throw new Error(errBody.error || 'Failed to record task creation on backend.');
      }

      await fetchData(); // Refresh state
    } catch (err: any) {
      console.error('[App] Create task error:', err);
      throw err;
    }
  };

  // Update Task Action (including modal edit edits)
  const handleUpdateTask = async (updatedTask: Task) => {
    try {
      const response = await fetch(`/api/tasks/${updatedTask._id}?program=${program}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTask),
      });

      if (!response.ok) {
        const errBody = await response.json();
        throw new Error(errBody.error || 'Failed to write task modifications.');
      }

      const saved: Task = await response.json();
      // Sync in list
      setTasks(prev => prev.map(t => (t._id === saved._id ? saved : t)));

      // If selected task is open, sync that too
      if (selectedTask?._id === saved._id) {
        setSelectedTask(saved);
      }
    } catch (err: any) {
      console.error('[App] Update task error:', err);
      throw err;
    }
  };

  // Quick Inline Status Selector Update
  const handleQuickStatusChange = async (task: Task, newStatus: TaskStatus) => {
    const contributorName = window.prompt("Please enter your name to confirm this status change:");
    if (!contributorName || contributorName.trim() === '') {
      alert("Name is required to update task status.");
      return;
    }

    try {
      const updatedTask: Task = {
        ...task,
        status: newStatus,
        contributor: contributorName.trim(),
      };

      await handleUpdateTask(updatedTask);
    } catch (err) {
      alert('Failed to modify status. Check database connection or server logs.');
    }
  };

  // Delete Task Action
  const handleDeleteTask = async (id: string) => {
    try {
      const response = await fetch(`/api/tasks/${id}?program=${program}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errBody = await response.json();
        throw new Error(errBody.error || 'Failed to delete task object from backend.');
      }

      await fetchData();
    } catch (err: any) {
      console.error('[App] Delete task error:', err);
      throw err;
    }
  };

  // Sync/Seed local tasks to MongoDB Atlas
  const handleSyncLocalTasks = async () => {
    try {
      const response = await fetch(`/api/db-sync?program=${program}`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errBody = await response.json();
        throw new Error(errBody.error || 'Failed to sync local tasks to MongoDB Atlas.');
      }

      await fetchData(); // Refresh tasks and status
    } catch (err: any) {
      console.error('[App] Sync local tasks error:', err);
      throw err;
    }
  };

  // Helper to construct and style a worksheet in a workbook using ExcelJS
  const addStyledProjectSheet = (workbook: ExcelJS.Workbook, projectTasks: Task[], projectLabel: string, sheetLabel: string) => {
    const ws = workbook.addWorksheet(sheetLabel, {
      views: [{ showGridLines: true }]
    });

    const headers = [
      'Project',
      'Task ID',
      'Title',
      'Description',
      'Timeline / Week',
      'Category',
      'Owner / Role',
      'Status',
      'Is Suggested',
      'Last Contributor',
      'Last Updated',
      'Full History / Implementation Log'
    ];

    ws.addRow(headers);

    // Style the header row beautifully
    const headerRow = ws.getRow(1);
    headerRow.height = 34;
    headerRow.eachCell((cell, colNumber) => {
      cell.font = {
        name: 'Segoe UI',
        size: 11,
        bold: true,
        color: { argb: 'FFFFFF' }
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '0F172A' } // Slate-900 (theme-compliant dark color)
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: (colNumber === 1 || colNumber === 3 || colNumber === 4 || colNumber === 12) ? 'left' : 'center',
        wrapText: true
      };
      cell.border = {
        bottom: { style: 'medium', color: { argb: '020617' } },
        right: { style: 'thin', color: { argb: '334155' } }
      };
    });

    // Populate and format task rows
    projectTasks.forEach((task, rowIndex) => {
      // Parse or determine the Task ID
      let taskCode = '';
      const match = task.title.match(/^([A-Z0-9]+-\d+):/i);
      if (match) {
        taskCode = match[1];
      } else {
        const match2 = task.title.match(/([A-Z0-9]+-\d+)/i);
        taskCode = match2 ? match2[1] : '';
      }

      // Fallback Task ID if none matches
      if (!taskCode) {
        taskCode = task._id ? `TASK-${task._id.slice(-4).toUpperCase()}` : 'TASK';
      }

      // Clean Title
      let cleanTitle = task.title;
      if (taskCode && cleanTitle.startsWith(taskCode)) {
        cleanTitle = cleanTitle.slice(taskCode.length).replace(/^:\s*/, '').trim();
      }

      // Format full history logs beautifully with breaks
      const formattedHistory = (task.history || []).map(entry => {
        const dateStr = entry.date ? new Date(entry.date).toLocaleString() : '';
        const contributor = entry.contributor || 'System';
        const action = entry.action || '';
        const details = entry.details || '';
        return `[${dateStr}] ${contributor}: ${action} - ${details}`;
      }).join('\r\n');

      const rowData = [
        projectLabel,
        taskCode,
        cleanTitle,
        task.description,
        task.week,
        task.category,
        task.role,
        task.status,
        task.isOptional ? 'Suggested / Optional' : 'Core Milestone',
        task.contributor || 'System',
        task.updatedAt ? new Date(task.updatedAt).toLocaleString() : '',
        formattedHistory
      ];

      ws.addRow(rowData);

      // Style row cells
      const row = ws.getRow(rowIndex + 2);
      
      // Calculate row height dynamically based on content length and expected cell wrapping limits
      const desc = task.description || '';
      const hist = formattedHistory || '';
      
      const estimatedTitleLines = Math.max(1, Math.ceil((cleanTitle || '').length / 28));
      const estimatedDescLines = Math.max(1, Math.ceil(desc.length / 40));
      const baseHistLines = hist.split(/\r?\n/);
      const estimatedHistLines = baseHistLines.reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / 50)), 0);

      const maxLines = Math.max(estimatedTitleLines, estimatedDescLines, estimatedHistLines, 1);
      
      // 16px per line + 14px padding. Caps at 180px for layout neatness.
      row.height = Math.max(28, Math.min(180, maxLines * 16 + 14));

      const isEven = rowIndex % 2 === 1;

      row.eachCell((cell, colNumber) => {
        cell.font = {
          name: 'Segoe UI',
          size: 10,
          color: { argb: '334155' } // slate-700
        };

        // Zebra striping background colors
        if (isEven) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'F8FAFC' } // Slate-50
          };
        } else {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFFF' }
          };
        }

        // Add soft cell grid borders
        cell.border = {
          top: { style: 'thin', color: { argb: 'E2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
          left: { style: 'thin', color: { argb: 'E2E8F0' } },
          right: { style: 'thin', color: { argb: 'E2E8F0' } }
        };

        // Alignments based on content types with robust wrapping enabled everywhere to prevent truncation
        cell.alignment = {
          vertical: 'top',
          horizontal: (colNumber === 1 || colNumber === 3 || colNumber === 4 || colNumber === 12) ? 'left' : 'center',
          wrapText: true
        };

        // Custom highlight for Task ID
        if (colNumber === 2) {
          cell.font = {
            name: 'Segoe UI',
            size: 10,
            bold: true,
            color: { argb: '0F172A' }
          };
        }

        // Color code status values
        if (colNumber === 8) {
          const statusVal = String(cell.value).toLowerCase();
          let bgHex = 'F1F5F9';
          let fgHex = '475569';

          if (statusVal === 'completed' || statusVal === 'done') {
            bgHex = 'DCFCE7'; // light green bg
            fgHex = '15803D'; // deep green text
          } else if (statusVal === 'in progress' || statusVal === 'started') {
            bgHex = 'FEF08A'; // light yellow bg
            fgHex = 'A16207'; // yellow-brown text
          } else if (statusVal === 'pending' || statusVal === 'to do') {
            bgHex = 'E0F2FE'; // light sky blue bg
            fgHex = '0369A1'; // deep blue text
          } else if (statusVal === 'blocked') {
            bgHex = 'FEE2E2'; // light red bg
            fgHex = 'B91C1C'; // deep red text
          }

          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: bgHex }
          };
          cell.font = {
            name: 'Segoe UI',
            size: 9.5,
            bold: true,
            color: { argb: fgHex }
          };
          cell.border = {
            top: { style: 'thin', color: { argb: 'CBD5E1' } },
            bottom: { style: 'thin', color: { argb: 'CBD5E1' } },
            left: { style: 'thin', color: { argb: 'CBD5E1' } },
            right: { style: 'thin', color: { argb: 'CBD5E1' } }
          };
        }

        // Is Suggested Highlight
        if (colNumber === 9) {
          const isOptVal = cell.value;
          if (isOptVal === 'Core Milestone') {
            cell.font = {
              name: 'Segoe UI',
              size: 10,
              bold: true,
              color: { argb: '0F172A' }
            };
          } else {
            cell.font = {
              name: 'Segoe UI',
              size: 9.5,
              italic: true,
              color: { argb: '64748B' }
            };
          }
        }
      });
    });

    // Populate Data Validation Dropdowns for the whole column to let users choose options easily (supports 100 rows)
    const maxValidationRows = Math.max(projectTasks.length + 50, 100);
    for (let r = 2; r <= maxValidationRows; r++) {
      const row = ws.getRow(r);
      
      // Category Dropdown validation (Column 6)
      const categoryCell = row.getCell(6);
      categoryCell.dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"Technical,On-Page,Local SEO,Content,Strategy"'],
        showErrorMessage: true,
        errorTitle: 'Invalid Category',
        error: 'Please select a valid category from the list (Technical, On-Page, Local SEO, Content, Strategy).'
      };

      // Owner / Role Dropdown validation (Column 7)
      const roleCell = row.getCell(7);
      roleCell.dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"Developer,SEO Lead,Founder,Operations"'],
        showErrorMessage: true,
        errorTitle: 'Invalid Role',
        error: 'Please select a valid role from the list (Developer, SEO Lead, Founder, Operations).'
      };

      // Status Dropdown validation (Column 8)
      const statusCell = row.getCell(8);
      statusCell.dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"Pending,In Progress,Completed"'],
        showErrorMessage: true,
        errorTitle: 'Invalid Status',
        error: 'Please select a valid status from the list (Pending, In Progress, Completed).'
      };
    }

    // Auto calculate Column Widths with bounds and padding
    const colWidths = headers.map((_, colIndex) => {
      let maxLen = 12; // Min width

      projectTasks.forEach((_, rowIndex) => {
        const cellRow = ws.getRow(rowIndex + 2);
        const cellVal = cellRow.getCell(colIndex + 1).value;
        if (cellVal !== null && cellVal !== undefined) {
          const valStr = String(cellVal);
          if (colIndex === 2 || colIndex === 3 || colIndex === 11) {
            const lines = valStr.split(/\r?\n/);
            const lineLens = lines.map(l => l.length);
            const longestLine = Math.max(...lineLens);
            if (longestLine > maxLen) {
              maxLen = longestLine;
            }
          } else {
            if (valStr.length > maxLen) {
              maxLen = valStr.length;
            }
          }
        }
      });

      let colWidth = maxLen + 4;
      // Cap columns logically for neat, professional readability
      if (colIndex === 0) colWidth = 26; // Project
      if (colIndex === 1) colWidth = 14; // Task ID
      if (colIndex === 2) colWidth = Math.min(colWidth, 32); // Title
      if (colIndex === 3) colWidth = Math.min(colWidth, 45); // Description
      if (colIndex === 4) colWidth = 18; // Timeline / Week
      if (colIndex === 5) colWidth = 16; // Category
      if (colIndex === 6) colWidth = 18; // Owner / Role
      if (colIndex === 7) colWidth = 15; // Status
      if (colIndex === 8) colWidth = 18; // Suggested vs Core
      if (colIndex === 9) colWidth = 18; // Last Contributor
      if (colIndex === 10) colWidth = 22; // Last Updated
      if (colIndex === 11) colWidth = Math.min(colWidth, 55); // Full History Log

      return colWidth;
    });

    colWidths.forEach((width, index) => {
      const col = ws.getColumn(index + 1);
      col.width = width;
    });
  };

  // Helper to fetch other projects' tasks in background
  const fetchAllProjectsData = async (): Promise<{ kthp: Task[], symconverge: Task[], databook: Task[] }> => {
    const [kthpRes, symRes, dataRes] = await Promise.all([
      fetch('/api/tasks?program=kthp'),
      fetch('/api/tasks?program=symconverge'),
      fetch('/api/tasks?program=databook')
    ]);

    if (!kthpRes.ok) throw new Error('Failed to retrieve tasks for KTHP blueprint.');
    if (!symRes.ok) throw new Error('Failed to retrieve tasks for SymConverge ERP.');
    if (!dataRes.ok) throw new Error('Failed to retrieve tasks for Databook SaaS.');

    const kthp: Task[] = await kthpRes.json();
    const symconverge: Task[] = await symRes.json();
    const databook: Task[] = await dataRes.json();

    return { kthp, symconverge, databook };
  };

  // Triggers browser download of workbook
  const saveWorkbook = async (workbook: ExcelJS.Workbook, filename: string) => {
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Handlers for click events
  const handleExportCurrentProject = async () => {
    const projFilename = program === 'kthp' 
      ? 'KTHP_Heritage_Palace_SEO_Blueprint' 
      : program === 'symconverge' 
      ? 'SymConverge_ERP_Partnership_SEO' 
      : 'Databook_SaaS_Reporting_SEO_Plan';

    const projLabel = program === 'kthp' 
      ? 'Kila The Heritage Palace (KTHP) Blueprint' 
      : program === 'symconverge' 
      ? 'SymConverge ERP Partnership' 
      : 'Databook SaaS Blueprint';

    const sheetLabel = program === 'kthp' 
      ? 'KTHP Blueprint' 
      : program === 'symconverge' 
      ? 'SymConverge ERP' 
      : 'Databook SaaS';

    setExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      addStyledProjectSheet(workbook, tasks, projLabel, sheetLabel);
      await saveWorkbook(workbook, `${projFilename}.xlsx`);
    } catch (err: any) {
      alert(`Export failed: ${err.message || String(err)}`);
    } finally {
      setExporting(false);
    }
  };

  const handleExportAllCombined = async () => {
    setExporting(true);
    try {
      const data = await fetchAllProjectsData();
      const workbook = new ExcelJS.Workbook();

      addStyledProjectSheet(workbook, data.kthp, 'Kila The Heritage Palace (KTHP) Blueprint', 'KTHP Blueprint');
      addStyledProjectSheet(workbook, data.symconverge, 'SymConverge ERP Partnership', 'SymConverge ERP');
      addStyledProjectSheet(workbook, data.databook, 'Databook SaaS Blueprint', 'Databook SaaS');

      await saveWorkbook(workbook, 'Multi_Tenant_SEO_Execution_Blueprints.xlsx');
    } catch (err: any) {
      alert(`Combined export failed: ${err.message || String(err)}`);
    } finally {
      setExporting(false);
    }
  };

  const handleExportAllSeparate = async () => {
    setExporting(true);
    try {
      const data = await fetchAllProjectsData();

      // Download KTHP
      const wb1 = new ExcelJS.Workbook();
      addStyledProjectSheet(wb1, data.kthp, 'Kila The Heritage Palace (KTHP) Blueprint', 'KTHP Blueprint');
      await saveWorkbook(wb1, 'KTHP_Heritage_Palace_SEO_Blueprint.xlsx');

      // Download SymConverge with safe delay
      setTimeout(async () => {
        const wb2 = new ExcelJS.Workbook();
        addStyledProjectSheet(wb2, data.symconverge, 'SymConverge ERP Partnership', 'SymConverge ERP');
        await saveWorkbook(wb2, 'SymConverge_ERP_Partnership_SEO.xlsx');
      }, 350);

      // Download Databook with safe delay
      setTimeout(async () => {
        const wb3 = new ExcelJS.Workbook();
        addStyledProjectSheet(wb3, data.databook, 'Databook SaaS Blueprint', 'Databook SaaS');
        await saveWorkbook(wb3, 'Databook_SaaS_Reporting_SEO_Plan.xlsx');
      }, 700);

    } catch (err: any) {
      alert(`Batch export failed: ${err.message || String(err)}`);
    } finally {
      setExporting(false);
    }
  };

  // Filter Tasks based on search term & choices
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = filterRole === 'All' || task.role === filterRole;
    const matchesWeek = filterWeek === 'All' || task.week === filterWeek;
    const matchesCategory = filterCategory === 'All' || task.category === filterCategory;
    const matchesStatus = filterStatus === 'All' || task.status === filterStatus;
    const matchesSuggested = !showOnlySuggested || !!task.isOptional;

    return matchesSearch && matchesRole && matchesWeek && matchesCategory && matchesStatus && matchesSuggested;
  });

  return (
    <div id="kthp-task-manager-app" className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 border-8 border-slate-900 selection:bg-emerald-200">
      {/* Top Header / Navigation */}
      <header id="app-header" className="h-16 bg-slate-900 text-white flex items-center justify-between px-6 sm:px-8 border-b-4 border-emerald-500 sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-emerald-500 rounded-none shrink-0 flex items-center justify-center border-2 border-white">
            <span className="text-slate-900 font-extrabold text-sm">//</span>
          </div>
          <h1 className="text-sm sm:text-base font-black tracking-widest uppercase font-display">
            TaskEngine.v2 <span className="text-slate-400 font-normal hidden sm:inline">// SEO &amp; Revenue System</span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="refresh-all-btn"
            onClick={fetchData}
            disabled={loading}
            className="bg-slate-800 hover:bg-slate-700 text-white border-2 border-slate-700 hover:border-slate-600 rounded-none px-3 py-1.5 transition-all flex items-center gap-1.5 text-xs font-bold shadow-[2px_2px_0px_0px_rgba(255,255,255,0.15)] active:translate-y-0.5"
            title="Sync Database State"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">SYNC STATE</span>
          </button>

          <button
            id="add-task-header-btn"
            onClick={() => setShowCreateModal(true)}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 px-4 py-1.5 border-2 border-slate-900 rounded-none font-bold text-xs transition-all active:translate-y-0.5 shadow-[2px_2px_0px_0px_rgba(255,255,255,0.2)] flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>+ NEW ENTRY</span>
          </button>
        </div>
      </header>

      {/* Main Content Container Area */}
      <main id="app-main-content" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col">
        {/* Multi-Tenant Program Selector Tabs */}
        <div className="flex flex-col md:flex-row border-4 border-slate-900 mb-8 overflow-hidden bg-slate-900 p-1.5 gap-1 sm:gap-2">
          <button
            onClick={() => setProgram('kthp')}
            className={`flex-1 py-3 px-4 text-center font-black tracking-widest text-xs uppercase transition-all rounded-none border-2 ${
              program === 'kthp'
                ? 'bg-emerald-400 text-slate-900 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] translate-x-[-1px] translate-y-[-1px]'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-transparent hover:text-white'
            }`}
          >
            🏰 Kila The Heritage Palace (KTHP)
          </button>
          <button
            onClick={() => setProgram('symconverge')}
            className={`flex-1 py-3 px-4 text-center font-black tracking-widest text-xs uppercase transition-all rounded-none border-2 ${
              program === 'symconverge'
                ? 'bg-emerald-400 text-slate-900 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] translate-x-[-1px] translate-y-[-1px]'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-transparent hover:text-white'
            }`}
          >
            ⚡ SymConverge ERP Partnership
          </button>
          <button
            onClick={() => setProgram('databook')}
            className={`flex-1 py-3 px-4 text-center font-black tracking-widest text-xs uppercase transition-all rounded-none border-2 ${
              program === 'databook'
                ? 'bg-emerald-400 text-slate-900 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] translate-x-[-1px] translate-y-[-1px]'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-transparent hover:text-white'
            }`}
          >
            📊 Databook SaaS Blueprint
          </button>
        </div>

        {/* Page Hero Description */}
        <div id="welcome-banner" className="mb-8 border-b-4 border-slate-900 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1 font-mono">
              {program === 'kthp'
                ? 'Strategic Growth Management Console'
                : program === 'symconverge'
                ? 'Cin7 ERP Partnership & Inbound Growth Platform'
                : 'SaaS Reporting Integration & Organic Growth Portal'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black italic text-slate-900 font-display uppercase tracking-tight">
              {program === 'kthp'
                ? 'KTHP SEO & Funnel Deployment Blueprint'
                : program === 'symconverge'
                ? 'SymConverge 30-Day Inbound SEO Campaign'
                : 'Databook 30-Day SEO Plan & Execution Blueprint'}
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed mt-2 max-w-4xl font-sans font-medium">
              {program === 'kthp'
                ? 'Welcome to the centralized KTHP development board. This console governs the detailed technical SEO audits, core content strategic milestones, and revenue pipelines of the Kila The Heritage Palace (KTHP) Growth Program. Use this terminal to update status, track contributor signatures, and deploy parameters.'
                : program === 'symconverge'
                ? 'Welcome to the official SymConverge growth campaign manager. This terminal coordinates structural index fixes, high-value ERP page development clusters, target wholesale/manufacturer customer profiles, and outbound B2B LinkedIn pipeline structures designed to translate partnership status into high-intent organic leads.'
                : 'Welcome to the Databook SEO action center. This cockpit manages search engine indexation overrides, removes legacy brand confusions (e.g., Lumen/Lovable), designs software schemas, maps high-intent comparison search clusters, and optimizes user acquisition funnels for the Cin7Core reporting SaaS.'}
            </p>
          </div>
          <div className="flex gap-2 self-start md:self-auto">
            <span className="px-3 py-1 bg-emerald-100 border-2 border-emerald-500 text-emerald-800 text-[9px] font-black uppercase tracking-widest rounded-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
              {tasks.filter(t => t.status === 'Completed').length} Completed
            </span>
            <span className="px-3 py-1 bg-amber-100 border-2 border-amber-500 text-amber-800 text-[9px] font-black uppercase tracking-widest rounded-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
              {tasks.filter(t => t.status === 'In Progress').length} Active
            </span>
          </div>
        </div>

        {/* Global Progress Metrics Panel */}
        <ProgressStats tasks={tasks} />

        {/* Filter Toolbar Card */}
        <div id="filter-controls-card" className="bg-white border-2 border-slate-900 rounded-none p-5 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] mb-8">
          <div className="flex items-center gap-2 mb-4 border-b-2 border-slate-900 pb-2.5">
            <Filter className="h-4.5 w-4.5 text-slate-900 shrink-0" />
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 font-display">
              Task Filter Toolbar
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search Box */}
            <div className="relative col-span-1 lg:col-span-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search tasks..."
                className="w-full text-xs border-2 border-slate-900 rounded-none p-2.5 pl-9 outline-none bg-slate-50 text-slate-900 font-bold focus:bg-white placeholder:font-normal"
              />
            </div>

            {/* Filter by Role */}
            <div>
              <select
                id="filter-role-select"
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value as any)}
                className="w-full text-xs border-2 border-slate-900 rounded-none p-2.5 outline-none bg-white text-slate-900 font-bold cursor-pointer"
              >
                <option value="All">Filter by Owner (All)</option>
                <option value="Developer">Developer (Technical)</option>
                <option value="SEO Lead">SEO Lead (Search)</option>
                <option value="Founder">Founder (Advisory)</option>
                <option value="Operations">Operations / Marketing</option>
              </select>
            </div>

            {/* Filter by Timeline */}
            <div>
              <select
                id="filter-timeline-select"
                value={filterWeek}
                onChange={(e) => setFilterWeek(e.target.value as any)}
                className="w-full text-xs border-2 border-slate-900 rounded-none p-2.5 outline-none bg-white text-slate-900 font-bold cursor-pointer"
              >
                <option value="All">Filter by Timeline (All)</option>
                <option value="Week 1">Week 1 (Foundations)</option>
                <option value="Week 2">Week 2 (Funnel Deployment)</option>
                <option value="Week 3">Week 3 (Optimization/Schema)</option>
                <option value="Week 4">Week 4 (Reporting/Indexing)</option>
                <option value="Suggested/Optional">Suggested / Optional</option>
              </select>
            </div>

            {/* Filter by Category */}
            <div>
              <select
                id="filter-category-select"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value as any)}
                className="w-full text-xs border-2 border-slate-900 rounded-none p-2.5 outline-none bg-white text-slate-900 font-bold cursor-pointer"
              >
                <option value="All">Filter by Category (All)</option>
                <option value="Technical">Technical SEO</option>
                <option value="On-Page">On-Page Optimization</option>
                <option value="Local SEO">Local SEO / GEO Mapping</option>
                <option value="Content">Content &amp; Socials</option>
                <option value="Strategy">Strategic Business Gaps</option>
              </select>
            </div>

            {/* Filter by Status */}
            <div>
              <select
                id="filter-status-select"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="w-full text-xs border-2 border-slate-900 rounded-none p-2.5 outline-none bg-white text-slate-900 font-bold cursor-pointer"
              >
                <option value="All">Filter by Status (All)</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>

          {/* Suggested Toggle Row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-4 pt-4 border-t-2 border-slate-900 text-xs">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="suggested-toggle"
                checked={showOnlySuggested}
                onChange={(e) => setShowOnlySuggested(e.target.checked)}
                className="border-2 border-slate-900 rounded-none text-slate-900 focus:ring-slate-900 h-4.5 w-4.5 cursor-pointer"
              />
              <label htmlFor="suggested-toggle" className="text-slate-900 font-black uppercase tracking-widest text-[9px] cursor-pointer">
                Show Only Suggested / Optional Tasks (From Blueprint)
              </label>
            </div>

            <div className="text-slate-500 text-[10px] font-black font-mono uppercase">
              Displaying {filteredTasks.length} of {tasks.length} total tasks
            </div>
          </div>

          {/* Smart Excel & CSV Export Center */}
          <div className="mt-5 pt-4 border-t-2 border-slate-900 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 font-display flex items-center gap-1.5">
                <FileSpreadsheet className="h-4.5 w-4.5 text-slate-900" />
                Smart Excel / CSV Export Center
              </h4>
              <p className="text-[10px] text-slate-500 font-bold font-sans uppercase tracking-tight">
                Export real-time task board specifications, status checklists, and developer activity history as high-quality spreadsheet data.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={handleExportCurrentProject}
                disabled={exporting || tasks.length === 0}
                className="flex items-center gap-1.5 py-2 px-3.5 bg-white hover:bg-slate-100 disabled:opacity-50 text-slate-900 border-2 border-slate-900 font-black uppercase tracking-widest text-[9px] transition-all shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] rounded-none cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                Export Active ({program.toUpperCase()})
              </button>

              <button
                onClick={handleExportAllCombined}
                disabled={exporting}
                className="flex items-center gap-1.5 py-2 px-3.5 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-slate-900 border-2 border-slate-900 font-black uppercase tracking-widest text-[9px] transition-all shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] rounded-none cursor-pointer"
              >
                {exporting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                Export Combined (All 3)
              </button>

              <button
                onClick={handleExportAllSeparate}
                disabled={exporting}
                className="flex items-center gap-1.5 py-2 px-3.5 bg-sky-400 hover:bg-sky-300 disabled:opacity-50 text-slate-900 border-2 border-slate-900 font-black uppercase tracking-widest text-[9px] transition-all shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] rounded-none cursor-pointer"
              >
                {exporting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                Batch Download (3 CSVs)
              </button>
            </div>
          </div>
        </div>

        {/* Error State Banner */}
        {error && (
          <div id="global-error-state" className="bg-rose-100 border-2 border-rose-900 text-slate-900 rounded-none p-4 flex items-center gap-3 mb-8 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] leading-relaxed text-sm">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
            <div>
              <strong className="font-bold uppercase tracking-wider">Sync Interruption:</strong> {error} Click 'SYNC STATE' to reconnect.
            </div>
          </div>
        )}

        {/* Task Grid Panel */}
        {loading ? (
          <div id="global-grid-loading" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-12">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white border-2 border-slate-900 rounded-none p-5 h-40 animate-pulse flex flex-col justify-between shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
                <div className="space-y-3">
                  <div className="h-4 bg-slate-200 w-1/3" />
                  <div className="h-5 bg-slate-200 w-3/4" />
                  <div className="h-4 bg-slate-200 w-full" />
                </div>
                <div className="h-4 bg-slate-200 w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredTasks.length > 0 ? (
          <div id="tasks-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTasks.map((task) => (
              <TaskCard
                key={task._id}
                task={task}
                onClick={() => setSelectedTask(task)}
                onQuickStatusChange={(newStatus) => handleQuickStatusChange(task, newStatus)}
              />
            ))}
          </div>
        ) : (
          <div id="empty-results-box" className="bg-white border-2 border-slate-900 rounded-none py-16 px-6 text-center max-w-xl mx-auto shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
            <Compass className="h-12 w-12 text-slate-900 mx-auto mb-4 animate-bounce" />
            <h4 className="font-black text-slate-900 font-display tracking-widest uppercase text-sm mb-2">
              No matching task parameters
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed max-w-xs mx-auto font-sans font-medium">
              We couldn't find any blueprint tasks matching your search or filters. Try adjusting your selector settings or click '+ NEW ENTRY' to insert a custom task.
            </p>
          </div>
        )}
      </main>

      {/* Task Details Edit & Audit logs Modal */}
      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleUpdateTask}
          onDelete={handleDeleteTask}
        />
      )}

      {/* Create New Task Modal */}
      {showCreateModal && (
        <CreateTaskModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateTask}
        />
      )}

      {/* Footer Branding Panel */}
      <footer id="app-footer" className="bg-slate-900 text-white border-t-4 border-slate-900 py-8 text-xs text-center font-bold">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <p className="font-display font-black tracking-widest text-emerald-400 uppercase">
            TaskEngine.v2 · {program === 'kthp' ? 'Kila The Heritage Palace (KTHP) SEO &amp; Revenue Blueprint' : program === 'symconverge' ? 'SymConverge ERP &amp; SEO Inbound Campaign' : 'Databook SaaS Reporting Inbound Campaign'}
          </p>
          <p className="max-w-2xl mx-auto leading-relaxed text-[11px] text-slate-400 font-normal">
            This program is strictly confidential. All task modifications, status updates, contributor signatures, and audit timelines are securely recorded in the live operational database.
          </p>

        </div>
      </footer>
    </div>
  );
}
