import { NavLink } from 'react-router-dom'

export default function NavItem({ path, emoji, label }) {
  return (
    <NavLink
      to={path}
      end={path === '/'}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? 'bg-celadon-100 text-ink-900'
            : 'text-ink-700 hover:bg-celadon-50 hover:text-ink-900'
        }`
      }
    >
      <span className="text-lg">{emoji}</span>
      <span>{label}</span>
    </NavLink>
  )
}
