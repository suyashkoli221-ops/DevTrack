import { useEffect, useMemo, useState } from "react";

import {
  Activity,
  AlertCircle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Bell,
  Bug,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Command,
  FolderKanban,
  LayoutDashboard,
  ListFilter,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Sparkles,
  Users,
  X,
  Zap,
  GitPullRequest,
  CircleDot,
  SlidersHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
  Bar,
  Cell,
} from "recharts";

import "./index.css";

/* =========================================================
   API CONFIGURATION
========================================================= */

const API_URL = "http://localhost:8080/api/issues";
const ANALYTICS_URL = `${API_URL}/analytics`;
const ISSUE_CACHE_KEY = "devtrack.issues.cache.v1";

const PRIORITY_COLORS = {
  Critical: "#ef6475",
  High: "#f2a65a",
  Medium: "#e9ca70",
  Low: "#64b99b",
};

const STATUS_NAMES = ["Open", "In Progress", "In Review", "Resolved"];
const PRIORITY_NAMES = ["Critical", "High", "Medium", "Low"];

const assigneeColors = {
  Suyash: "#b3a1ff",
  "Suyash Koli": "#b3a1ff",
  "Aarav Kulkarni": "#8b7cf6",
  "Sana Patel": "#ef9b62",
  "Rohan Verma": "#5fa7df",
  "Meera Kapoor": "#e7a5c2",
  Admin: "#64b99b",
};

const navItems = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Issues", icon: Bug },
  { label: "Projects", icon: FolderKanban },
  { label: "Team", icon: Users },
];

const priorityClass = {
  Critical: "critical",
  High: "high",
  Medium: "medium",
  Low: "low",
};

const statusClass = {
  Open: "open",
  "In Progress": "progress",
  "In Review": "review",
  Resolved: "resolved",
};

const PRIORITY_RANK = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1,
};

/* =========================================================
   DATA HELPERS
========================================================= */

function getCachedIssues() {
  try {
    const cached = window.localStorage.getItem(ISSUE_CACHE_KEY);
    const parsed = cached ? JSON.parse(cached) : [];

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatIssueDate(value) {
  if (!value) return "—";

  const parsed = new Date(
    value.includes("T") ? value : value.replace(" ", "T") + "Z"
  );

  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      });
}

function formatTimeAgo(value) {
  if (!value) return "Date unavailable";

  const normalized = value.includes("T")
    ? value
    : value.replace(" ", "T") + "Z";

  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    return formatIssueDate(value);
  }

  const seconds = Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / 1000)
  );

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 172800) return "Yesterday";

  return formatIssueDate(value);
}

function getInitials(name) {
  return String(name || "Unassigned")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function fromApiIssue(issue) {
  const assigneeName = issue.assignee || "Unassigned";

  return {
    id: String(issue.id),
    title: issue.title || "Untitled issue",
    description: issue.description || "",
    project: issue.project || "Web Platform",
    type: "Bug",
    priority: issue.priority || "Medium",
    status: issue.status || "Open",
    assignee: getInitials(assigneeName) || "—",
    assigneeName,
    name: assigneeName,
    color: assigneeColors[assigneeName] || "#9b8bff",
    reporter: issue.reporter || "",
    createdAt: issue.createdAt || "",
    date: formatIssueDate(issue.createdAt),
  };
}

function toApiIssue(issue) {
  return {
    title: issue.title,
    description: issue.description || "",
    status: issue.status || "Open",
    priority: issue.priority || "Medium",
    assignee:
      issue.assigneeName ||
      issue.name ||
      issue.assignee ||
      "Unassigned",
    reporter: issue.reporter || "Suyash Koli",
  };
}

function buildTrendData(dailyActivity = [], issues = []) {
  const countsByDate = new Map();

  if (Array.isArray(dailyActivity)) {
    dailyActivity.forEach((item) => {
      if (item?.day) {
        countsByDate.set(
          String(item.day).slice(0, 10),
          Number(item.count) || 0
        );
      }
    });
  }

  if (!dailyActivity.length) {
    issues.forEach((issue) => {
      if (!issue.createdAt) return;

      const key = String(issue.createdAt).slice(0, 10);

      countsByDate.set(
        key,
        (countsByDate.get(key) || 0) + 1
      );
    });
  }

  const result = [];
  const today = new Date();

  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const key = `${year}-${month}-${day}`;

    result.push({
      day: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      opened: countsByDate.get(key) || 0,
    });
  }

  return result;
}

function countByValue(items, key, values) {
  return values.reduce((result, value) => {
    result[value] = items.filter(
      (item) => item[key] === value
    ).length;

    return result;
  }, {});
}

function getTimestamp(value) {
  if (!value) return 0;

  const normalized = String(value).includes("T")
    ? value
    : String(value).replace(" ", "T") + "Z";

  const timestamp = new Date(normalized).getTime();

  return Number.isNaN(timestamp) ? 0 : timestamp;
}

/* =========================================================
   COMMON UI COMPONENTS
========================================================= */

function Avatar({ initials, color = "#9b8bff", small = false }) {
  return (
    <span
      className={`avatar ${small ? "avatar-small" : ""}`}
      style={{
        background: `${color}22`,
        color,
      }}
    >
      {initials || "—"}
    </span>
  );
}

function Brand() {
  return (
    <div className="brand">
      <div className="brand-mark">
        <Bug size={21} strokeWidth={2.4} />
      </div>

      <span>
        devtrack<span className="brand-dot">.</span>
      </span>

      <span className="brand-version">BETA</span>
    </div>
  );
}

function Sidebar({ active, setActive, onCreate, issueCount }) {
  return (
    <aside className="sidebar">
      <Brand />

      <button className="workspace-switch">
        <span className="workspace-logo">A</span>

        <span className="workspace-copy">
          <strong>Acme Studio</strong>
          <small>Free workspace</small>
        </span>

        <ChevronDown size={15} />
      </button>

      <div className="nav-section-label">WORKSPACE</div>

      <nav className="main-nav">
        {navItems.map(({ label, icon: Icon }) => (
          <button
            key={label}
            className={`nav-link ${
              active === label ? "active" : ""
            }`}
            onClick={() => setActive(label)}
          >
            <Icon size={18} />
            <span>{label}</span>

            {label === "Issues" && (
              <span className="nav-count">{issueCount}</span>
            )}
          </button>
        ))}
      </nav>

      <div className="nav-section-label project-label">
        YOUR PROJECTS

        <button
          aria-label="Add project"
          onClick={() => setActive("Projects")}
        >
          <Plus size={15} />
        </button>
      </div>

      <button
        className="project-link"
        onClick={() => setActive("Web Platform")}
      >
        <span className="project-dot violet" />
        Web Platform
      </button>

      <button
        className="project-link"
        onClick={() => setActive("Backend API")}
      >
        <span className="project-dot blue" />
        Backend API
      </button>

      <button
        className="project-link"
        onClick={() => setActive("Analytics")}
      >
        <span className="project-dot orange" />
        Analytics
      </button>

      <button
        className="project-link"
        onClick={() => setActive("Core Services")}
      >
        <span className="project-dot green" />
        Core Services
      </button>

      <div className="sidebar-spacer" />

      <div className="sidebar-tip">
        <div className="tip-icon">
          <Sparkles size={17} />
        </div>

        <strong>Work smarter</strong>

        <p>
          Find duplicate issues and keep your team in sync.
        </p>

        <button onClick={() => setActive("Issues")}>
          Explore issues <ArrowRight size={14} />
        </button>
      </div>

      <button
        className="nav-link sidebar-bottom"
        onClick={() => setActive("Settings")}
      >
        <Settings size={18} />
        <span>Settings</span>
      </button>

      <button
        className="profile-row"
        onClick={() => setActive("Profile")}
      >
        <Avatar initials="SK" color="#b3a1ff" />

        <span className="profile-copy">
          <strong>Suyash Koli</strong>
          <small>Workspace admin</small>
        </span>

        <MoreHorizontal size={18} />
      </button>
    </aside>
  );
}

function MetricCard({ label, value, icon: Icon, tone, note }) {
  return (
    <article className="metric-card">
      <div className="metric-top">
        <span>{label}</span>

        <span className={`metric-icon ${tone}`}>
          <Icon size={17} />
        </span>
      </div>

      <div className="metric-value-row">
        <strong className="metric-value">{value}</strong>
      </div>

      <div className="metric-note">{note}</div>
    </article>
  );
}

function StatusBadge({ status }) {
  const Icon =
    status === "Resolved"
      ? CheckCircle2
      : status === "In Progress"
        ? Clock3
        : status === "In Review"
          ? GitPullRequest
          : CircleDot;

  return (
    <span
      className={`status-badge ${
        statusClass[status] || "open"
      }`}
    >
      <Icon size={13} />
      {status}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const Icon =
    priority === "Critical" || priority === "High"
      ? ArrowUp
      : priority === "Low"
        ? ArrowDown
        : ArrowRight;

  return (
    <span
      className={`priority-badge ${
        priorityClass[priority] || "medium"
      }`}
    >
      <Icon size={13} />
      {priority}
    </span>
  );
}

/* =========================================================
   CREATE ISSUE MODAL
========================================================= */

function CreateIssueModal({ onClose, onCreate }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [project, setProject] = useState("Web Platform");
  const [priority, setPriority] = useState("Medium");
  const [assignee, setAssignee] = useState("SP");
  const [status, setStatus] = useState("Open");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();

    if (!title.trim()) {
      setError("Please enter an issue title.");
      return;
    }

    const people = {
      AK: ["Aarav Kulkarni", "#8b7cf6"],
      SP: ["Sana Patel", "#ef9b62"],
      RV: ["Rohan Verma", "#5fa7df"],
      MK: ["Meera Kapoor", "#e7a5c2"],
    };

    const [assigneeName, color] = people[assignee];

    setSubmitting(true);
    setError("");

    try {
      const success = await onCreate({
        title: title.trim(),
        description: description.trim(),
        project,
        priority,
        assignee,
        assigneeName,
        name: assigneeName,
        color,
        status,
        type: "Bug",
        reporter: "Suyash Koli",
      });

      if (success === false) {
        setError("Could not create the issue. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form className="issue-modal" onSubmit={submit}>
        <div className="modal-heading">
          <div>
            <span className="eyebrow">ISSUE TRACKER</span>
            <h2>Create new issue</h2>
            <p>
              Describe the problem so your team can get started.
            </p>
          </div>

          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={19} />
          </button>
        </div>

        <label className="form-label">
          Issue title <span>*</span>

          <input
            autoFocus
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              setError("");
            }}
            placeholder="e.g. Login button not responding"
          />
        </label>

        {error && <div className="form-error">{error}</div>}

        <label className="form-label">
          Description

          <textarea
            value={description}
            onChange={(event) =>
              setDescription(event.target.value)
            }
            placeholder="What happened? What did you expect?"
            rows={3}
          />
        </label>

        <div className="form-grid">
          <label className="form-label">
            Project

            <select
              value={project}
              onChange={(event) => setProject(event.target.value)}
            >
              <option>Web Platform</option>
              <option>Backend API</option>
              <option>Analytics</option>
              <option>Core Services</option>
            </select>
          </label>

          <label className="form-label">
            Priority

            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
            >
              {PRIORITY_NAMES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>

          <label className="form-label">
            Assignee

            <select
              value={assignee}
              onChange={(event) => setAssignee(event.target.value)}
            >
              <option value="AK">Aarav Kulkarni</option>
              <option value="SP">Sana Patel</option>
              <option value="RV">Rohan Verma</option>
              <option value="MK">Meera Kapoor</option>
            </select>
          </label>

          <label className="form-label">
            Status

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              {STATUS_NAMES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="modal-footer">
          <span className="required-note">
            <span>*</span> Required field
          </span>

          <div className="modal-actions">
            <button
              type="button"
              className="button-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="button-primary"
              disabled={submitting}
            >
              <Plus size={16} />
              {submitting ? "Creating..." : "Create issue"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

/* =========================================================
   EDIT ISSUE MODAL
========================================================= */

function EditIssueModal({ issue, onClose, onSave }) {
  const [title, setTitle] = useState(issue.title || "");
  const [description, setDescription] = useState(
    issue.description || ""
  );
  const [priority, setPriority] = useState(
    issue.priority || "Medium"
  );
  const [status, setStatus] = useState(issue.status || "Open");
  const [assigneeName, setAssigneeName] = useState(
    issue.assigneeName ||
      issue.name ||
      "Unassigned"
  );
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();

    if (!title.trim()) {
      setError("Please enter an issue title.");
      return;
    }

    if (!assigneeName.trim()) {
      setError("Please select an assignee.");
      return;
    }

    setSubmitting(true);
    setError("");

    const updatedIssue = {
      ...issue,
      title: title.trim(),
      description: description.trim(),
      priority,
      status,
      assigneeName,
      name: assigneeName,
      assignee: getInitials(assigneeName),
      color:
        assigneeColors[assigneeName] ||
        issue.color ||
        "#9b8bff",
    };

    try {
      const success = await onSave(updatedIssue);

      if (success === false) {
        setError("Could not update the issue. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) {
          onClose();
        }
      }}
    >
      <form className="issue-modal" onSubmit={submit}>
        <div className="modal-heading">
          <div>
            <span className="eyebrow">
              EDIT ISSUE #{issue.id}
            </span>
            <h2>Edit issue</h2>
            <p>Update the issue details and save your changes.</p>
          </div>

          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Close"
            disabled={submitting}
          >
            <X size={19} />
          </button>
        </div>

        <label className="form-label">
          Issue title <span>*</span>

          <input
            autoFocus
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              setError("");
            }}
            placeholder="Enter issue title"
          />
        </label>

        <label className="form-label">
          Description

          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Describe the issue"
            rows={4}
          />
        </label>

        <div className="form-grid">
          <label className="form-label">
            Priority

            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
            >
              {PRIORITY_NAMES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="form-label">
            Status

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              {STATUS_NAMES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="form-label">
            Assignee

            <select
              value={assigneeName}
              onChange={(event) =>
                setAssigneeName(event.target.value)
              }
            >
              <option value="Aarav Kulkarni">
                Aarav Kulkarni
              </option>
              <option value="Sana Patel">Sana Patel</option>
              <option value="Rohan Verma">Rohan Verma</option>
              <option value="Meera Kapoor">Meera Kapoor</option>
              <option value="Suyash Koli">Suyash Koli</option>
              <option value="Unassigned">Unassigned</option>
            </select>
          </label>
        </div>

        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}

        <div className="modal-footer">
          <span className="required-note">
            <span>*</span> Required field
          </span>

          <div className="modal-actions">
            <button
              type="button"
              className="button-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="button-primary"
              disabled={submitting}
            >
              <CheckCircle2 size={16} />
              {submitting ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

/* =========================================================
   ISSUES TABLE
========================================================= */

function IssuesTable({ issues, onSelectIssue }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [priorityFilter, setPriorityFilter] = useState("All priorities");
  const [assigneeFilter, setAssigneeFilter] = useState("All assignees");
  const [sortBy, setSortBy] = useState("newest");

  const assignees = useMemo(() => {
    return [
      ...new Set(
        issues.map((issue) => issue.name || "Unassigned")
      ),
    ].sort((a, b) => a.localeCompare(b));
  }, [issues]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    const results = issues.filter((issue) => {
      const searchableValues = [
        issue.id,
        issue.title,
        issue.description,
        issue.project,
        issue.name,
        issue.assigneeName,
        issue.reporter,
        issue.status,
        issue.priority,
      ];

      const matchesSearch =
        !query ||
        searchableValues.some((value) =>
          String(value || "").toLowerCase().includes(query)
        );

      const matchesStatus =
        statusFilter === "All statuses" ||
        issue.status === statusFilter;

      const matchesPriority =
        priorityFilter === "All priorities" ||
        issue.priority === priorityFilter;

      const matchesAssignee =
        assigneeFilter === "All assignees" ||
        (issue.name || "Unassigned") === assigneeFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority &&
        matchesAssignee
      );
    });

    results.sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return (
            getTimestamp(a.createdAt) -
            getTimestamp(b.createdAt)
          );

        case "priority":
          return (
            (PRIORITY_RANK[b.priority] || 0) -
              (PRIORITY_RANK[a.priority] || 0) ||
            getTimestamp(b.createdAt) -
              getTimestamp(a.createdAt)
          );

        case "title":
          return a.title.localeCompare(b.title);

        case "newest":
        default:
          return (
            getTimestamp(b.createdAt) -
            getTimestamp(a.createdAt)
          );
      }
    });

    return results;
  }, [
    issues,
    search,
    statusFilter,
    priorityFilter,
    assigneeFilter,
    sortBy,
  ]);

  function resetFilters() {
    setSearch("");
    setStatusFilter("All statuses");
    setPriorityFilter("All priorities");
    setAssigneeFilter("All assignees");
    setSortBy("newest");
  }

  const hasActiveFilters =
    search.trim() !== "" ||
    statusFilter !== "All statuses" ||
    priorityFilter !== "All priorities" ||
    assigneeFilter !== "All assignees";

  return (
    <section className="panel issues-panel">
      <div className="panel-heading issues-heading">
        <div>
          <div className="heading-title-row">
            <h2>Recent issues</h2>
            <span className="count-pill">{filtered.length}</span>
          </div>

          <p>Track and manage your team's latest work.</p>
        </div>

        <button
          className="text-button"
          onClick={() => onSelectIssue("Issues")}
        >
          View all issues <ArrowRight size={15} />
        </button>
      </div>

      <div className="table-toolbar">
        <div className="table-search">
          <Search size={16} />

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search ID, title, description, assignee..."
            aria-label="Search issues"
          />

          {search && (
            <button
              type="button"
              className="row-more"
              aria-label="Clear search"
              onClick={() => setSearch("")}
            >
              <X size={15} />
            </button>
          )}
        </div>

        <div className="filter-controls">
          <label className="filter-select">
            <ListFilter size={15} />

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
              aria-label="Filter by status"
            >
              <option>All statuses</option>

              {STATUS_NAMES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>

          <label className="filter-select">
            <SlidersHorizontal size={15} />

            <select
              value={priorityFilter}
              onChange={(event) =>
                setPriorityFilter(event.target.value)
              }
              aria-label="Filter by priority"
            >
              <option>All priorities</option>

              {PRIORITY_NAMES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>

          <label className="filter-select">
            <Users size={15} />

            <select
              value={assigneeFilter}
              onChange={(event) =>
                setAssigneeFilter(event.target.value)
              }
              aria-label="Filter by assignee"
            >
              <option>All assignees</option>

              {assignees.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>

          <label className="filter-select">
            <ArrowDown size={15} />

            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              aria-label="Sort issues"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="priority">Highest priority</option>
              <option value="title">Title A–Z</option>
            </select>
          </label>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="active-filters-row">
          <span>
            <ListFilter size={14} />
            Filters applied
          </span>

          <button
            type="button"
            className="text-button"
            onClick={resetFilters}
          >
            Clear filters <X size={13} />
          </button>
        </div>
      )}

      <div className="table-scroll">
        <table className="issues-table">
          <thead>
            <tr>
              <th>ISSUE</th>
              <th>PRIORITY</th>
              <th>STATUS</th>
              <th>ASSIGNEE</th>
              <th>UPDATED</th>
              <th />
            </tr>
          </thead>

          <tbody>
            {filtered.map((issue) => (
              <tr
                key={issue.id}
                onClick={() => onSelectIssue(issue.id)}
                className="issue-row"
              >
                <td>
                  <div className="issue-title-cell">
                    <span className="issue-type-icon">
                      <Bug size={15} />
                    </span>

                    <div>
                      <strong>{issue.title}</strong>

                      <small>
                        {issue.id} <span>·</span> {issue.project}
                      </small>
                    </div>
                  </div>
                </td>

                <td>
                  <PriorityBadge priority={issue.priority} />
                </td>

                <td>
                  <StatusBadge status={issue.status} />
                </td>

                <td>
                  <div className="assignee-cell">
                    <Avatar
                      initials={issue.assignee}
                      color={issue.color}
                      small
                    />

                    <span>{issue.name || "Unassigned"}</span>
                  </div>
                </td>

                <td className="date-cell">{issue.date}</td>

                <td>
                  <button
                    className="row-more"
                    aria-label={`Open ${issue.id}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelectIssue(issue.id);
                    }}
                  >
                    <MoreHorizontal size={18} />
                  </button>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan="6" className="empty-state">
                  <Search size={22} />
                  <strong>No issues found</strong>

                  <span>
                    Try a different keyword or change your filters.
                  </span>

                  <button
                    type="button"
                    className="button-secondary"
                    onClick={resetFilters}
                  >
                    Reset search and filters
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="table-footer">
        <span>
          Showing <strong>{filtered.length}</strong> of{" "}
          <strong>{issues.length}</strong> issues
        </span>

        <button
          type="button"
          className="pagination-button"
          onClick={resetFilters}
        >
          Reset all <X size={13} />
        </button>
      </div>
    </section>
  );
}

/* =========================================================
   DASHBOARD
========================================================= */

function Dashboard({
  issues,
  analytics,
  analyticsError,
  setModal,
  setActive,
  onSelectIssue,
}) {
  const statusCounts =
    analytics?.statuses ||
    countByValue(issues, "status", STATUS_NAMES);

  const priorityCounts =
    analytics?.priorities ||
    countByValue(issues, "priority", PRIORITY_NAMES);

  const totalIssues = Number.isFinite(Number(analytics?.total))
    ? Number(analytics.total)
    : issues.length;

  const trendData = buildTrendData(
    analytics?.dailyActivity || [],
    issues
  );

  const priorityData = PRIORITY_NAMES.map((name) => ({
    name,
    count: Number(priorityCounts[name]) || 0,
    fill: PRIORITY_COLORS[name],
  }));

  const recentIssues = [...issues]
    .sort(
      (a, b) =>
        getTimestamp(b.createdAt) - getTimestamp(a.createdAt)
    )
    .slice(0, 3);

  const todayLabel = new Date()
    .toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    })
    .toUpperCase();

  return (
    <>
      <div className="welcome-row">
        <div>
          <div className="eyebrow">
            <span className="live-dot" />
            {todayLabel}
          </div>

          <h1>
            Good afternoon, Suyash <span className="wave">✳</span>
          </h1>

          <p>
            Here's what's happening across your workspace today.
          </p>
        </div>

        <button
          className="button-primary create-top"
          onClick={() => setModal(true)}
        >
          <Plus size={17} />
          Create issue
        </button>
      </div>

      <div className="metrics-grid">
        <MetricCard
          label="Total issues"
          value={totalIssues}
          icon={Bug}
          tone="purple"
          note="All recorded issues"
        />

        <MetricCard
          label="Open issues"
          value={statusCounts.Open || 0}
          icon={AlertCircle}
          tone="orange"
          note="Need attention"
        />

        <MetricCard
          label="In progress"
          value={statusCounts["In Progress"] || 0}
          icon={Activity}
          tone="blue"
          note="Being worked on"
        />

        <MetricCard
          label="Resolved"
          value={statusCounts.Resolved || 0}
          icon={CheckCircle2}
          tone="green"
          note="Successfully completed"
        />
      </div>

      <div className="charts-grid">
        <section className="panel trend-panel">
          <div className="panel-heading">
            <div>
              <h2>Issue activity</h2>
              <p>Issues created over the last 7 days</p>
            </div>

            <span className="period-button">
              Last 7 days <ChevronDown size={14} />
            </span>
          </div>

          <div className="chart-legend">
            <span>
              <i className="legend-dot opened" />
              Created
            </span>

            <span className="chart-insight">
              <Activity size={14} />
              Based on saved issue dates
            </span>
          </div>

          {analyticsError && (
            <p
              className="metric-note"
              style={{ marginBottom: 8 }}
            >
              Analytics endpoint unavailable. Showing counts from
              loaded issues where possible.
            </p>
          )}

          <div className="trend-chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={trendData}
                margin={{
                  top: 12,
                  right: 8,
                  left: -22,
                  bottom: 0,
                }}
              >
                <defs>
                  <linearGradient
                    id="openedFill"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="#8b7cf6"
                      stopOpacity={0.24}
                    />

                    <stop
                      offset="95%"
                      stopColor="#8b7cf6"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  stroke="#292a38"
                  strokeDasharray="4 5"
                  vertical={false}
                />

                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#82849a", fontSize: 11 }}
                  dy={10}
                />

                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#82849a", fontSize: 11 }}
                />

                <Tooltip
                  contentStyle={{
                    background: "#191a27",
                    border: "1px solid #303145",
                    borderRadius: 10,
                    color: "#f4f4fa",
                    fontSize: 12,
                  }}
                  itemStyle={{ color: "#e7e7f1" }}
                />

                <Area
                  type="monotone"
                  dataKey="opened"
                  name="Created"
                  stroke="#9b8bff"
                  strokeWidth={2.3}
                  fill="url(#openedFill)"
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel priority-panel">
          <div className="panel-heading">
            <div>
              <h2>Priority breakdown</h2>
              <p>Issues by severity level</p>
            </div>

            <button
              className="icon-button"
              aria-label="Priority information"
            >
              <MoreHorizontal size={19} />
            </button>
          </div>

          <div className="priority-total">
            <strong>{totalIssues}</strong>
            <span>Total issues</span>
          </div>

          <div className="priority-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={priorityData}
                layout="vertical"
                margin={{
                  top: 4,
                  right: 14,
                  left: 4,
                  bottom: 0,
                }}
                barCategoryGap={12}
              >
                <XAxis
                  type="number"
                  allowDecimals={false}
                  hide
                />

                <YAxis
                  type="category"
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#a6a7ba", fontSize: 12 }}
                  width={58}
                />

                <Tooltip
                  cursor={{ fill: "#252638" }}
                  contentStyle={{
                    background: "#191a27",
                    border: "1px solid #303145",
                    borderRadius: 8,
                    color: "#f4f4fa",
                    fontSize: 12,
                  }}
                />

                <Bar
                  dataKey="count"
                  radius={[0, 5, 5, 0]}
                  barSize={13}
                  label={{
                    position: "right",
                    fill: "#d9d9e8",
                    fontSize: 11,
                  }}
                >
                  {priorityData.map((item) => (
                    <Cell key={item.name} fill={item.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <button
            className="panel-bottom-link"
            onClick={() => setActive("Issues")}
          >
            View priority report <ArrowRight size={14} />
          </button>
        </section>
      </div>

      <IssuesTable
        issues={issues}
        onSelectIssue={onSelectIssue}
      />

      <div className="bottom-grid">
        <section className="panel activity-panel">
          <div className="panel-heading">
            <div>
              <h2>Recent activity</h2>
              <p>Recently created issues</p>
            </div>

            <button
              className="text-button"
              onClick={() => setActive("Activity")}
            >
              View all <ArrowRight size={14} />
            </button>
          </div>

          <div className="activity-list">
            {recentIssues.length > 0 ? (
              recentIssues.map((issue) => (
                <div className="activity-item" key={issue.id}>
                  <Avatar
                    initials={getInitials(issue.reporter || "SK")}
                    color={
                      assigneeColors[issue.reporter] || "#b3a1ff"
                    }
                    small
                  />

                  <div>
                    <p>
                      <strong>
                        {issue.reporter || "Workspace member"}
                      </strong>{" "}
                      created <b>#{issue.id}</b>
                    </p>

                    <small>{issue.title}</small>
                    <time>{formatTimeAgo(issue.createdAt)}</time>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <Activity size={22} />
                <strong>No recent issues</strong>
                <span>Create an issue to see activity here.</span>
              </div>
            )}
          </div>
        </section>

        <section className="panel sprint-panel">
          <div className="panel-heading">
            <div>
              <h2>Issue summary</h2>
              <p>Current database status</p>
            </div>

            <span className="sprint-status">
              <span /> Live
            </span>
          </div>

          <div className="sprint-progress-copy">
            <strong>
              {totalIssues > 0
                ? Math.round(
                    ((statusCounts.Resolved || 0) / totalIssues) * 100
                  )
                : 0}
              %
            </strong>

            <span>Issues resolved</span>
          </div>

          <div className="progress-track">
            <span
              style={{
                width: `${
                  totalIssues > 0
                    ? Math.min(
                        100,
                        ((statusCounts.Resolved || 0) / totalIssues) *
                          100
                      )
                    : 0
                }%`,
              }}
            />
          </div>

          <div className="sprint-meta">
            <span>
              <CheckCircle2 size={14} />{" "}
              {statusCounts.Resolved || 0} resolved
            </span>

            <span>
              <Clock3 size={14} />{" "}
              {Math.max(
                0,
                totalIssues - (statusCounts.Resolved || 0)
              )}{" "}
              remaining
            </span>
          </div>

          <div className="sprint-deadline">
            <CalendarDays size={16} />

            <span>
              <strong>{totalIssues}</strong> saved issues
            </span>

            <button
              className="days-left"
              onClick={() => setActive("Issues")}
            >
              View issues
            </button>
          </div>
        </section>
      </div>
    </>
  );
}

/* =========================================================
   ISSUE DETAILS
   Added:
   - Edit issue button
   - Delete issue button
========================================================= */

function DetailView({
  issue,
  onBack,
  onStatusChange,
  onEdit,
  onDelete,
}) {
  if (!issue) {
    return (
      <section className="panel empty-detail">
        <Bug size={32} />
        <h2>Issue not found</h2>

        <button
          className="button-secondary"
          onClick={onBack}
        >
          Back to issues
        </button>
      </section>
    );
  }

  return (
    <section className="panel detail-panel">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 20,
        }}
      >
        <button className="text-button" onClick={onBack}>
          ← Back to issues
        </button>

        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            className="button-secondary"
            onClick={() => onEdit(issue)}
          >
            <Pencil size={15} />
            Edit issue
          </button>

          <button
            type="button"
            className="button-secondary"
            onClick={() => onDelete(issue.id)}
            style={{
              color: "#ef6475",
              borderColor: "#ef647555",
            }}
          >
            <Trash2 size={15} />
            Delete issue
          </button>
        </div>
      </div>

      <div className="detail-title">
        <span className="issue-type-icon">
          <Bug size={18} />
        </span>

        <span className="detail-id">#{issue.id}</span>
        <span className="detail-project">{issue.project}</span>
      </div>

      <h1>{issue.title}</h1>

      <p className="detail-description">
        {issue.description ||
          "No description has been added to this issue yet. Add details to help the team understand and resolve it."}
      </p>

      <div className="detail-fields">
        <div>
          <span>Status</span>

          <select
            value={issue.status}
            onChange={(event) =>
              onStatusChange(issue.id, event.target.value)
            }
          >
            {STATUS_NAMES.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </div>

        <div>
          <span>Priority</span>
          <strong>
            <PriorityBadge priority={issue.priority} />
          </strong>
        </div>

        <div>
          <span>Assignee</span>

          <strong className="assignee-cell">
            <Avatar
              initials={issue.assignee}
              color={issue.color}
              small
            />
            {issue.name || "Unassigned"}
          </strong>
        </div>

        <div>
          <span>Created</span>
          <strong>{issue.date}</strong>
        </div>
      </div>

      <div className="detail-activity">
        <h3>
          <Activity size={17} /> Activity
        </h3>

        <div className="activity-item">
          <Avatar
            initials={getInitials(issue.reporter || "SK")}
            color={
              assigneeColors[issue.reporter] || "#b3a1ff"
            }
            small
          />

          <div>
            <p>
              <strong>
                {issue.reporter || "Workspace member"}
              </strong>{" "}
              created this issue
            </p>

            <time>{issue.date}</time>
          </div>
        </div>

        <div className="activity-item">
          <span className="activity-line-icon">
            <CircleDot size={16} />
          </span>

          <div>
            <p>
              Current status: <StatusBadge status={issue.status} />
            </p>

            <time>
              Current status from the database. Historical status
              changes are not stored yet.
            </time>
          </div>
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   OTHER WORKSPACE PAGES
========================================================= */

function SimplePage({ active, issues, onCreate, setActive }) {
  const description = {
    Projects:
      "Organize your work into focused projects and track progress in one place.",
    Team: "Meet your team and see who's working on what.",
    Settings: "Manage your workspace preferences.",
    Profile: "Your workspace profile and account.",
    Activity: "A timeline of recent changes across your workspace.",
  }[active] || `Issues associated with ${active}.`;

  return (
    <div className="simple-page">
      <div className="welcome-row">
        <div>
          <div className="eyebrow">
            WORKSPACE / {active.toUpperCase()}
          </div>

          <h1>{active}</h1>
          <p>{description}</p>
        </div>

        <button className="button-primary" onClick={onCreate}>
          <Plus size={17} /> Create issue
        </button>
      </div>

      {active === "Activity" ? (
        <section className="panel simple-panel">
          <div className="simple-icon">
            <Activity size={25} />
          </div>

          <h2>Recently created issues</h2>

          <p>
            This timeline shows the available issue creation records.
            The current database does not store a full history of
            status changes.
          </p>

          <div className="activity-list">
            {[...issues]
              .sort(
                (a, b) =>
                  getTimestamp(b.createdAt) -
                  getTimestamp(a.createdAt)
              )
              .slice(0, 10)
              .map((issue) => (
                <div className="activity-item" key={issue.id}>
                  <Avatar
                    initials={getInitials(issue.reporter || "SK")}
                    color={
                      assigneeColors[issue.reporter] || "#b3a1ff"
                    }
                    small
                  />

                  <div>
                    <p>
                      <strong>
                        {issue.reporter || "Workspace member"}
                      </strong>{" "}
                      created <b>#{issue.id}</b>
                    </p>

                    <small>{issue.title}</small>
                    <time>{formatTimeAgo(issue.createdAt)}</time>
                  </div>
                </div>
              ))}
          </div>
        </section>
      ) : (
        <section className="panel simple-panel">
          <div className="simple-icon">
            <FolderKanban size={25} />
          </div>

          <h2>
            {active === "Projects"
              ? "Your projects"
              : active === "Team"
                ? "Your team"
                : `${active} workspace`}
          </h2>

          <p>
            This section is ready to expand as additional backend
            features are connected.
          </p>

          <div className="simple-stats">
            <span>
              <strong>{issues.length}</strong> saved issues
            </span>

            <span>
              <strong>4</strong> project categories
            </span>

            <span>
              <strong>4</strong> assignees available
            </span>
          </div>
        </section>
      )}

      <button
        className="button-secondary"
        onClick={() => setActive("Overview")}
      >
        Return to overview <ArrowRight size={15} />
      </button>
    </div>
  );
}

/* =========================================================
   MAIN APP
========================================================= */

export default function App() {
  const [issues, setIssues] = useState(getCachedIssues);
  const [loadingIssues, setLoadingIssues] = useState(true);
  const [apiError, setApiError] = useState("");
  const [analytics, setAnalytics] = useState(null);
  const [analyticsError, setAnalyticsError] = useState("");

  const [active, setActive] = useState("Overview");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState(null);
  const [selectedIssueId, setSelectedIssueId] = useState(null);
  const [globalSearch, setGlobalSearch] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    try {
      window.localStorage.setItem(
        ISSUE_CACHE_KEY,
        JSON.stringify(issues)
      );
    } catch (error) {
      console.warn(
        "Could not save the DevTrack issue cache:",
        error
      );
    }
  }, [issues]);

  function showNotice(message, duration = 3000) {
    setNotice(message);

    window.setTimeout(() => {
      setNotice("");
    }, duration);
  }

  async function loadAnalytics() {
    try {
      const response = await fetch(ANALYTICS_URL);

      if (!response.ok) {
        throw new Error(
          `Analytics endpoint returned ${response.status}`
        );
      }

      const data = await response.json();

      setAnalytics(data);
      setAnalyticsError("");

      return true;
    } catch (error) {
      setAnalyticsError(
        error.message || "Could not load analytics."
      );

      return false;
    }
  }

  async function loadIssues() {
    setLoadingIssues(true);

    try {
      const response = await fetch(API_URL);

      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}`);
      }

      const data = await response.json();

      const latestIssues = Array.isArray(data)
        ? data.map(fromApiIssue)
        : [];

      setIssues(latestIssues);
      setApiError("");

      await loadAnalytics();

      return true;
    } catch (error) {
      setApiError(
        "Cannot connect to the backend. Make sure Spring Boot is running on port 8080."
      );

      console.error(
        "Could not load DevTrack issues:",
        error
      );

      return false;
    } finally {
      setLoadingIssues(false);
    }
  }

  useEffect(() => {
    loadIssues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void loadIssues();
      }
    };

    document.addEventListener(
      "visibilitychange",
      refreshWhenVisible
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        refreshWhenVisible
      );
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* -------------------------
     CREATE ISSUE
  ------------------------- */

  async function createIssue(issue) {
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(toApiIssue(issue)),
      });

      if (!response.ok) {
        const detail = await response.text();

        throw new Error(
          detail || `Backend returned ${response.status}`
        );
      }

      const created = await response.json();

      const refreshed = await loadIssues();

      if (!refreshed) {
        throw new Error(
          "The issue was created, but the issue list could not be refreshed."
        );
      }

      setModalOpen(false);
      setActive("Issues");
      setSelectedIssueId(null);

      showNotice(`Issue #${created.id} created successfully`);

      return true;
    } catch (error) {
      showNotice(`Could not create issue: ${error.message}`);

      return false;
    }
  }

  /* -------------------------
     OPEN ISSUE
  ------------------------- */

  function openIssue(id) {
    if (id === "Issues") {
      setActive("Issues");
      setSelectedIssueId(null);
    } else {
      setSelectedIssueId(String(id));
      setActive("Issue details");
    }
  }

  /* -------------------------
     UPDATE ISSUE STATUS
  ------------------------- */

  async function changeStatus(id, status) {
    const issue = issues.find(
      (item) => item.id === String(id)
    );

    if (!issue) return false;

    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...toApiIssue(issue),
          status,
        }),
      });

      if (!response.ok) {
        const detail = await response.text();

        throw new Error(
          detail || `Backend returned ${response.status}`
        );
      }

      setIssues((current) =>
        current.map((item) =>
          item.id === String(id)
            ? { ...item, status }
            : item
        )
      );

      await loadAnalytics();

      showNotice("Issue status updated", 2500);

      return true;
    } catch (error) {
      showNotice(
        `Could not update status: ${error.message}`
      );

      return false;
    }
  }

  /* -------------------------
     EDIT ISSUE
  ------------------------- */

  async function updateIssue(updatedIssue) {
    try {
      const response = await fetch(
        `${API_URL}/${updatedIssue.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(toApiIssue(updatedIssue)),
        }
      );

      if (!response.ok) {
        const detail = await response.text();

        throw new Error(
          detail || `Backend returned ${response.status}`
        );
      }

      const refreshed = await loadIssues();

      if (!refreshed) {
        throw new Error(
          "The issue was updated, but the issue list could not be refreshed."
        );
      }

      setEditingIssue(null);

      showNotice(
        `Issue #${updatedIssue.id} updated successfully`
      );

      return true;
    } catch (error) {
      showNotice(`Could not update issue: ${error.message}`);

      return false;
    }
  }

  /* -------------------------
     DELETE ISSUE
  ------------------------- */

  async function deleteIssue(id) {
    const issue = issues.find(
      (item) => item.id === String(id)
    );

    if (!issue) {
      showNotice("Issue not found.");
      return false;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete issue #${issue.id}?\n\n"${issue.title}"\n\nThis action cannot be undone.`
    );

    if (!confirmed) return false;

    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const detail = await response.text();

        throw new Error(
          detail || `Backend returned ${response.status}`
        );
      }

      const refreshed = await loadIssues();

      if (!refreshed) {
        throw new Error(
          "The issue was deleted, but the issue list could not be refreshed."
        );
      }

      if (selectedIssueId === String(id)) {
        setSelectedIssueId(null);
        setActive("Issues");
      }

      if (editingIssue?.id === String(id)) {
        setEditingIssue(null);
      }

      showNotice(`Issue #${id} deleted successfully`);

      return true;
    } catch (error) {
      showNotice(`Could not delete issue: ${error.message}`);

      return false;
    }
  }

  /* -------------------------
     SELECTED ISSUE
  ------------------------- */

  const selectedIssue = issues.find(
    (issue) => issue.id === selectedIssueId
  );

  /* -------------------------
     GLOBAL SEARCH
  ------------------------- */

  const globalMatches = globalSearch.trim()
    ? issues.filter((issue) =>
        [
          issue.id,
          issue.title,
          issue.description,
          issue.project,
          issue.name,
          issue.reporter,
        ]
          .join(" ")
          .toLowerCase()
          .includes(globalSearch.trim().toLowerCase())
      )
    : [];

  function navigate(label) {
    setActive(label);
    setSelectedIssueId(null);
    setMobileNav(false);
  }

  /* -------------------------
     RENDER
  ------------------------- */

  return (
    <div className="app-shell">
      <div
        className={`mobile-sidebar-wrap ${
          mobileNav ? "show" : ""
        }`}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            setMobileNav(false);
          }
        }}
      >
        <Sidebar
          active={active}
          setActive={navigate}
          onCreate={() => {
            setModalOpen(true);
            setMobileNav(false);
          }}
          issueCount={issues.length}
        />
      </div>

      <div className="desktop-sidebar">
        <Sidebar
          active={active}
          setActive={navigate}
          onCreate={() => setModalOpen(true)}
          issueCount={issues.length}
        />
      </div>

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="mobile-menu icon-button"
              onClick={() => setMobileNav(true)}
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>

            <div className="breadcrumb">
              Workspace <span>/</span> <strong>{active}</strong>
            </div>
          </div>

          <div className="topbar-actions">
            <div className="global-search">
              <Search size={16} />

              <input
                value={globalSearch}
                onChange={(event) =>
                  setGlobalSearch(event.target.value)
                }
                placeholder="Search anything..."
              />

              <kbd>
                <Command size={11} /> K
              </kbd>

              {globalSearch.trim() && (
                <div className="search-popover">
                  {globalMatches.length ? (
                    globalMatches
                      .slice(0, 5)
                      .map((issue) => (
                        <button
                          key={issue.id}
                          onClick={() => {
                            openIssue(issue.id);
                            setGlobalSearch("");
                          }}
                        >
                          <Bug size={15} />

                          <span>
                            <strong>{issue.title}</strong>

                            <small>
                              #{issue.id} · {issue.project}
                            </small>
                          </span>
                        </button>
                      ))
                  ) : (
                    <p>No matching issues found.</p>
                  )}
                </div>
              )}
            </div>

            <button
              className="icon-button notification-button"
              aria-label="Notifications"
              onClick={() =>
                showNotice("You're all caught up!", 2500)
              }
            >
              <Bell size={18} />
              <i />
            </button>

            <span className="topbar-divider" />

            <Avatar initials="SK" color="#b3a1ff" />
          </div>
        </header>

        <div className="page-content">
          {apiError && (
            <div
              className="form-error"
              role="alert"
              style={{ marginBottom: 16 }}
            >
              {apiError}{" "}

              <button
                className="text-button"
                onClick={loadIssues}
              >
                Retry
              </button>
            </div>
          )}

          {loadingIssues ? (
            <section
              className="panel"
              style={{ padding: 24 }}
            >
              <p>Loading issues from DevTrack database…</p>
            </section>
          ) : active === "Overview" ? (
            <Dashboard
              issues={issues}
              analytics={analytics}
              analyticsError={analyticsError}
              setModal={setModalOpen}
              setActive={navigate}
              onSelectIssue={openIssue}
            />
          ) : active === "Issue details" ? (
            <DetailView
              issue={selectedIssue}
              onBack={() => navigate("Issues")}
              onStatusChange={changeStatus}
              onEdit={(issue) => setEditingIssue(issue)}
              onDelete={deleteIssue}
            />
          ) : active === "Issues" ? (
            <>
              <div className="welcome-row">
                <div>
                  <div className="eyebrow">
                    WORKSPACE / ISSUES
                  </div>

                  <h1>All issues</h1>

                  <p>
                    Search, filter, and manage issues across your
                    workspace.
                  </p>
                </div>

                <button
                  className="button-primary"
                  onClick={() => setModalOpen(true)}
                >
                  <Plus size={17} /> Create issue
                </button>
              </div>

              <IssuesTable
                issues={issues}
                onSelectIssue={openIssue}
              />
            </>
          ) : [
              "Web Platform",
              "Backend API",
              "Analytics",
              "Core Services",
            ].includes(active) ? (
            <>
              <div className="welcome-row">
                <div>
                  <div className="eyebrow">
                    WORKSPACE / PROJECTS
                  </div>

                  <h1>{active}</h1>

                  <p>Issues and progress for this project.</p>
                </div>

                <button
                  className="button-primary"
                  onClick={() => setModalOpen(true)}
                >
                  <Plus size={17} /> Create issue
                </button>
              </div>

              <IssuesTable
                issues={issues.filter(
                  (issue) => issue.project === active
                )}
                onSelectIssue={openIssue}
              />
            </>
          ) : (
            <SimplePage
              active={active}
              issues={issues}
              onCreate={() => setModalOpen(true)}
              setActive={navigate}
            />
          )}
        </div>

        <footer className="app-footer">
          <span>© 2026 DevTrack</span>

          <span>
            <span className="footer-online" />
            {apiError
              ? "Backend disconnected"
              : "Backend connected"}
          </span>

          <span>
            Built for teams that ship <Zap size={12} />
          </span>
        </footer>
      </main>

      {modalOpen && (
        <CreateIssueModal
          onClose={() => setModalOpen(false)}
          onCreate={createIssue}
        />
      )}

      {editingIssue && (
        <EditIssueModal
          issue={editingIssue}
          onClose={() => setEditingIssue(null)}
          onSave={updateIssue}
        />
      )}

      {notice && (
        <div className="toast">
          <CheckCircle2 size={17} />
          {notice}

          <button
            onClick={() => setNotice("")}
            aria-label="Dismiss"
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}