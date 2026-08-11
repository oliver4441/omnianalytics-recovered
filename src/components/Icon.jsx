const paths = {
  overview: <><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></>,
  projects: <><path d="M3.5 7.5h17v11a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-11Z" /><path d="M3.5 7.5V6a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2" /></>,
  issue: <><circle cx="12" cy="12" r="9" /><path d="M12 7.7v4.8" /><path d="M12 16.3h.01" /></>,
  branch: <><circle cx="6" cy="5" r="2" /><circle cx="18" cy="6" r="2" /><circle cx="6" cy="19" r="2" /><path d="M6 7v10" /><path d="M8 7c2 0 2 4 5 4h1a4 4 0 0 0 4-4V8" /></>,
  pullRequest: <><circle cx="6" cy="5" r="2" /><circle cx="18" cy="19" r="2" /><path d="M6 7v12" /><path d="m14 5 2-2 2 2" /><path d="M16 3v10a6 6 0 0 0 2 4.5" /></>,
  pipeline: <><rect x="3" y="4" width="6" height="6" rx="2" /><rect x="15" y="14" width="6" height="6" rx="2" /><path d="M9 7h3a5 5 0 0 1 5 5v2" /><path d="m14 12 3 3 3-3" /></>,
  rocket: <><path d="M14.5 5.5c2.5-2.5 5.5-2 5.5-2s.5 3-2 5.5l-5.8 5.8-4-4 6.3-5.3Z" /><path d="m13 7 4 4" /><path d="M8.2 10.8 5 10l-3 3 5 2" /><path d="m12.2 14.8.8 3.2-3 3-2-5" /><circle cx="16" cy="7.5" r="1" /></>,
  chart: <><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-7" /><path d="M22 20H2" /></>,
  shield: <><path d="M12 3 4.5 6v5.5c0 4.7 3.2 8 7.5 9.5 4.3-1.5 7.5-4.8 7.5-9.5V6L12 3Z" /><path d="m9 12 2 2 4-4" /></>,
  book: <><path d="M4 4.5h11a3 3 0 0 1 3 3V20H7a3 3 0 0 1-3-3V4.5Z" /><path d="M7 20a3 3 0 0 1 0-6h11" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
  menu: <><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></>,
  close: <><path d="m6 6 12 12" /><path d="M18 6 6 18" /></>,
  chevronDown: <path d="m7 10 5 5 5-5" />,
  chevronRight: <path d="m9 6 6 6-6 6" />,
  arrowRight: <><path d="M5 12h14" /><path d="m14 7 5 5-5 5" /></>,
  arrowUpRight: <><path d="M7 17 17 7" /><path d="M8 7h9v9" /></>,
  plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
  moon: <path d="M20 15.2A8 8 0 0 1 8.8 4a8.5 8.5 0 1 0 11.2 11.2Z" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.9 4.9 1.4 1.4" /><path d="m17.7 17.7 1.4 1.4" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m4.9 19.1 1.4-1.4" /><path d="m17.7 6.3 1.4-1.4" /></>,
  logout: <><path d="M10 5H5v14h5" /><path d="M14 8l4 4-4 4" /><path d="M18 12H9" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  checkCircle: <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16.5 8" /></>,
  circle: <circle cx="12" cy="12" r="8" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  gitCommit: <><circle cx="12" cy="12" r="3" /><path d="M3 12h6" /><path d="M15 12h6" /></>,
  server: <><rect x="3" y="4" width="18" height="6" rx="2" /><rect x="3" y="14" width="18" height="6" rx="2" /><path d="M7 7h.01" /><path d="M7 17h.01" /></>,
  zap: <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />,
  filter: <path d="M4 5h16l-6 7v5l-4 2v-7L4 5Z" />,
  more: <><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" /></>,
  users: <><circle cx="9" cy="8" r="3" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /><circle cx="17" cy="9" r="2" /><path d="M15.5 14.5A4.5 4.5 0 0 1 21 19" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4" /><path d="M17 3v4" /><path d="M3 10h18" /></>,
  cube: <><path d="m12 2 9 5-9 5-9-5 9-5Z" /><path d="m3 7 9 5 9-5" /><path d="M3 12.5 12 18l9-5.5" /><path d="M12 12v10" /></>,
  database: <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5" /><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" /></>,
  code: <><path d="m8 8-4 4 4 4" /><path d="m16 8 4 4-4 4" /><path d="m14 5-4 14" /></>,
  activity: <path d="M3 12h4l2-6 4 12 2-6h6" />,
  graph: <><circle cx="5" cy="6" r="2.5" /><circle cx="19" cy="5" r="2.5" /><circle cx="12" cy="19" r="2.5" /><path d="m7.4 6.4 9.1-.9" /><path d="m6.7 8 4.2 8.8" /><path d="m17.7 7.2-4.5 9.6" /></>,
  health: <><path d="M3 12h4l2-5 4 10 2-5h6" /><path d="M5 4.8A9 9 0 1 1 3.7 17" /></>,
  link: <><path d="m10 13 4-4" /><path d="M8.5 16.5 7 18a3.5 3.5 0 1 1-5-5l3-3a3.5 3.5 0 0 1 5 0" /><path d="M15.5 7.5 17 6a3.5 3.5 0 1 1 5 5l-3 3a3.5 3.5 0 0 1-5 0" /></>,
  layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5" /><path d="m3 16 9 5 9-5" /></>,
  table: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18" /><path d="M3 15h18" /><path d="M9 4v16" /></>,
  route: <><circle cx="6" cy="18" r="2" /><circle cx="18" cy="6" r="2" /><path d="M8 18h3a3 3 0 0 0 3-3V9a3 3 0 0 1 3-3h-1" /><path d="m9 5 3 3-3 3" /></>,
  refresh: <><path d="M20 7v5h-5" /><path d="M4 17v-5h5" /><path d="M6.1 8a7 7 0 0 1 11.6-2.6L20 7" /><path d="m4 17 2.3 1.6A7 7 0 0 0 18 16" /></>,
  download: <><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M4 20h16" /></>,
  maximize: <><path d="M8 3H3v5" /><path d="M16 3h5v5" /><path d="M8 21H3v-5" /><path d="M16 21h5v-5" /></>,
  columns: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" /><path d="M15 4v16" /></>,
  panel: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M14 4v16" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9S9.5 5.5 12 3Z" /></>,
  chevronLeft: <path d="m15 6-6 6 6 6" />,
};

export default function Icon({ name, size = 18, strokeWidth = 1.8, className = '', ...props }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      {...props}
    >
      {paths[name] || paths.circle}
    </svg>
  );
}
