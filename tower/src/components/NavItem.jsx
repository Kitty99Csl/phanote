import { NavLink } from 'react-router-dom'

export default function NavItem({ path, label, subtitle }) {
  return (
    <NavLink
      to={path}
      end={path === '/'}
      className={({ isActive }) =>
        `block px-4 py-3 transition-all border-l-2 ${
          isActive
            ? 'border-ember-500 bg-gradient-to-r from-ember-500/10 to-transparent'
            : 'border-transparent hover:bg-slate-800/50'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <div className={`text-[11px] tracking-[0.2em] uppercase font-semibold ${isActive ? 'text-ember-500' : 'text-slate-300'}`}>
            {isActive && <span className="mr-1">▸</span>}{label}
          </div>
          <div className="text-[9px] tracking-[0.1em] text-slate-500 uppercase mt-1">
            {subtitle}
          </div>
        </>
      )}
    </NavLink>
  )
}
