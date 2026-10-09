import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { LogOut, House, UserSearch, ClipboardCheck, FlaskConical, TestTubeDiagonal, Siren, Plane, User, Stethoscope, Syringe, BriefcaseMedical, FileText, Mic, Settings, KeyRound, ShieldCheck, UserCog, Users, ScrollText, BadgeCheck, ShieldPlus } from 'lucide-react'
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import useAuthDataStore from '@/store/authStore'
import useSosStore, { SOS_POLL_INTERVAL_MS } from '@/store/sosStore'
import { initEmergencyAudioUnlock } from '@/lib/emergencyAlertSound'
import API from '@/api'
import { canSeeMenuItem, hasDrawerAccess, isSuperadmin } from '@/lib/rbac'
import { APPROVALS_CHANGED_EVENT } from '@/pages/dashboard/approval-requests/components/approval-helpers'

const APPROVALS_POLL_INTERVAL_MS = 30000
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'


/**
 * Feature flag: show/hide the superadmin "Permissions" drawer.
 * `true` shows the Permissions (permission-requests) drawer, `false` hides it.
 * The same flag hides "Request Access" for other roles — there is no point
 * requesting access if the superadmin has no drawer to approve it in.
 */
export const SHOW_PERMISSIONS_DRAWER = true

export const menuItems = [
  {
    icon: House,
    label: 'Dashboard',
    href: '/dashboard',
    matchPaths: ['/dashboard'],
    requiredPermission: null
  },
  {
    icon: UserSearch,
    label: 'Patients Enquiry',
    href: '/dashboard/patients-enquiries',
    matchPaths: ['/dashboard/patients-enquiries'],
    requiredPermission: 'patients-enquiry'
  },
  {
    icon: ClipboardCheck,
    label: 'Appointments',
    href: '/dashboard/appointments',
    matchPaths: ['/dashboard/appointments'],
    requiredPermission: 'appointments'
  },
  {
    icon: FlaskConical,
    label: 'Checkup Bookings',
    href: '/dashboard/checkup-bookings',
    matchPaths: ['/dashboard/checkup-bookings'],
    requiredPermission: 'checkup-bookings'
  },
  {
    icon: TestTubeDiagonal,
    label: 'Tests Bookings',
    href: '/dashboard/tests-bookings',
    matchPaths: ['/dashboard/tests-bookings'],
    requiredPermission: 'tests-bookings'
  },
  {
    icon: Siren,
    label: 'Emergency SOS',
    href: '/dashboard/emergency-sos',
    matchPaths: ['/dashboard/emergency-sos', '/dashboard/emergency-sos/[id]'],
    requiredPermission: 'emergency-sos'
  },
  {
    icon: Plane,
    label: 'International Patient',
    href: '/dashboard/international-patients',
    matchPaths: ['/dashboard/international-patients', '/dashboard/international-patients/[id]'],
    requiredPermission: 'international-patients'
  },
  {
    icon: User,
    label: 'Patients',
    href: '/dashboard/patient',
    matchPaths: ['/dashboard/patient', '/dashboard/patient/[id]'],
    requiredPermission: 'patients'
  },
  {
    icon: Stethoscope,
    label: 'Doctors',
    href: '/dashboard/doctors',
    matchPaths: ['/dashboard/doctors', '/dashboard/doctors/[id]'],
    requiredPermission: 'doctors'
  },
  {
    icon: Syringe,
    label: 'Health checkup',
    href: '/dashboard/health-checkup',
    matchPaths: ['/dashboard/health-checkup', '/dashboard/health-checkup/[id]'],
    requiredPermission: 'health-checkup'
  },
  {
    icon: BriefcaseMedical,
    label: 'Departments',
    href: '/dashboard/departments',
    matchPaths: ['/dashboard/departments', '/dashboard/departments/[id]'],
    requiredPermission: 'departments'
  },
  {
    icon: ShieldPlus,
    label: 'Ayushman Bharat',
    href: '/dashboard/ayushman-bharat',
    matchPaths: ['/dashboard/ayushman-bharat'],
    requiredPermission: 'ayushman-bharat'
  },
  {
    icon: FileText,
    label: 'Blog',
    href: '/dashboard/blogs',
    matchPaths: ['/dashboard/blogs', '/dashboard/blogs/all-blogs', '/dashboard/blogs/create-blog', '/dashboard/blogs/edit'],
    requiredPermission: 'blogs'
  },
  {
    icon: Mic,
    label: 'News',
    href: '/dashboard/news',
    matchPaths: ['/dashboard/news', '/dashboard/news/all-news', '/dashboard/news/create-news', '/dashboard/news/edit'],
    requiredPermission: 'news'
  },
  {
    icon: ScrollText,
    label: 'Activity Logs',
    href: '/dashboard/activity-logs',
    matchPaths: ['/dashboard/activity-logs'],
    requiredPermission: 'activity-logs'
  },
  {
    icon: Settings,
    label: 'Settings',
    href: '/dashboard/settings',
    matchPaths: ['/dashboard/settings'],
    // Always visible — Settings is each admin's own profile/account page.
    requiredPermission: null
  },
  {
    icon: KeyRound,
    label: 'Request Access',
    href: '/dashboard/request-access',
    matchPaths: ['/dashboard/request-access'],
    requiredPermission: null,
    hideForSuperadmin: true,
    hidden: !SHOW_PERMISSIONS_DRAWER
  },
  {
    icon: ShieldCheck,
    label: 'Permissions',
    href: '/dashboard/permission-requests',
    matchPaths: ['/dashboard/permission-requests'],
    requiredPermission: null,
    superadminOnly: true,
    hidden: !SHOW_PERMISSIONS_DRAWER
  },
  {
    icon: BadgeCheck,
    label: 'Approval Requests',
    href: '/dashboard/approval-requests',
    matchPaths: ['/dashboard/approval-requests'],
    requiredPermission: null,
    superadminOnly: true
  },
  {
    icon: UserCog,
    label: 'Roles',
    href: '/dashboard/role-management',
    matchPaths: ['/dashboard/role-management'],
    requiredPermission: null,
    superadminOnly: true
  },
  {
    icon: Users,
    label: 'Users',
    href: '/dashboard/user-management',
    matchPaths: ['/dashboard/user-management'],
    requiredPermission: null,
    superadminOnly: true
  }
]


export function Sidebar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [isCollapsed, setIsCollapsed] = useState(false)

  const clearAuthData = useAuthDataStore((state) => state.clearAuthData)
  const authData = useAuthDataStore((state) => state.authData)

  const visibleMenuItems = menuItems.filter((item) => canSeeMenuItem(authData, item))

  const canSeeSos = hasDrawerAccess(authData, 'emergency-sos')

  // NEW SOS FLOW (unread) — ACTIVE.
  // ── OLD FLOW (pending `total` badge) — COMMENTED OUT ──
  // const sosTotal = useSosStore((state) => state.total)
  const sosUnread = useSosStore((state) => state.unread)
  const fetchSosCount = useSosStore((state) => state.fetchSosCount)
  const resetSosAlert = useSosStore((state) => state.resetAlert)

  useEffect(() => {
    if (!canSeeSos) return
    initEmergencyAudioUnlock()
    // Fresh dashboard session (this runs on each login, since logout unmounts
    // the dashboard): clear any stale `dismissed` flag so the popup shows again.
    resetSosAlert()
    fetchSosCount()
  }, [canSeeSos, fetchSosCount, resetSosAlert])

  // ── SOS POLLING (auto-refresh) ─────────────────────────────────────────────
  // The sidebar is mounted on every dashboard page, so one poller here keeps the
  // unread badge / popup / alarm live everywhere — an SOS that arrives while the
  // admin sits idle is never missed. `fetchSosCount()` only sounds the alarm when
  // the unread count RISES, so routine polls stay silent.
  //
  // ⚠️ Remove this whole block (and SOS_POLL_INTERVAL_MS in the store) if upper
  // management / the client don't want background polling.
  useEffect(() => {
    if (!canSeeSos) return

    const id = setInterval(() => {
      // Skip while the tab is hidden — no point polling (or alarming) in the
      // background; the visibility listener below catches up on return.
      if (typeof document !== "undefined" && document.hidden) return
      fetchSosCount()
    }, SOS_POLL_INTERVAL_MS)

    // Coming back to the tab should re-check immediately, not wait a full cycle.
    const onVisible = () => {
      if (!document.hidden) fetchSosCount()
    }
    document.addEventListener("visibilitychange", onVisible)

    return () => {
      clearInterval(id)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [canSeeSos, fetchSosCount])

  // ── Approval Requests badge (superadmin) 
  const superadmin = isSuperadmin(authData)
  const [approvalsPending, setApprovalsPending] = useState(0)

  useEffect(() => {
    if (!superadmin) return

    const load = async () => {
      if (typeof document !== "undefined" && document.hidden) return
      const res = await API.approvalRequests.GetCounts()
      if (res?.counts) setApprovalsPending(res.counts.pending || 0)
    }

    load()
    const id = setInterval(load, APPROVALS_POLL_INTERVAL_MS)
    window.addEventListener(APPROVALS_CHANGED_EVENT, load)
    document.addEventListener("visibilitychange", load)

    return () => {
      clearInterval(id)
      window.removeEventListener(APPROVALS_CHANGED_EVENT, load)
      document.removeEventListener("visibilitychange", load)
    }
  }, [superadmin])

  const handleLogout = () => {
    API.auth.Logout(navigate, clearAuthData);
  }

  const isActiveRoute = (item) => {
    if (item.label === 'Dashboard') {
      return pathname === '/dashboard'
    }

    // For more precise matching, check exact matches first, then startsWith
    return item.matchPaths.some(path => {

      // Special case: prevent "Patients Enquiry" from matching "Patients"
      if (item.label === 'Patients Enquiry') {
        return pathname === '/dashboard/patients-enquiries'
      }

      // Special case: prevent "Patients" from matching "Patients Enquiry"
      if (item.label === 'Patients') {
        return pathname.startsWith('/dashboard/patient') && !pathname.startsWith('/dashboard/patients-enquiries')
      }

      // Handle dynamic routes with [id]
      if (path.includes('[id]')) {
        const basePath = path.replace('/[id]', '')
        return pathname.startsWith(basePath) && pathname !== basePath
      }

      // For exact paths - be more specific to avoid conflicts
      if (pathname === path) {
        return true
      }

      // For paths that should match sub-routes, but be careful about overlaps
      // Add more specific checks to avoid conflicts between similar paths
      if (pathname.startsWith(path + '/')) {
        return true
      }
      return false
    })
  }

  return (
    <div className={cn(
      " h-screen flex flex-col transition-all duration-500 relative shrink-0",
      isCollapsed ? "w-20" : "w-64"
    )}>
      <div className={isCollapsed ? 'shrink-0 flex  flex-col  justify-center items-center' : "shrink-0 flex  flex-col gap-y-0 justify-center items-center "}>
        <div className={isCollapsed ? ` h-[45px] flex flex-col items-center justify-center ` : ` h-[45px] flex flex-col items-center justify-center`} >
          {isCollapsed ?
            <img src="/assets/images/logo.png" alt="Logo" className='w-[35px] ' /> :
            <div className="w-[130px]  flex ">
              <img
                src="/assets/images/logo.png"
                alt="white Logo"
                className="h-[30px]  xl:h-[35px] "
              />
              <div className="flex flex-col justify-center items-center">
                <p className="uppercase text-[#83A83E] leading-3 md:leading-4 font-bold text-sm ">
                  Ashsheefa
                </p>
                <p className="uppercase text-[11px]  text-[#3B8BF4]">
                  Hospital
                </p>
              </div>
            </div>}
        </div>
        <div className='h-[1px] bg-[#D9D9D9]' style={{ width: isCollapsed ? '70%' : '80%' }}>

        </div>
        {/* <div className="absolute top-6 -right-4 ">
          <div
            variant="ghost"

            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-black cursor-pointer bg-white rounded-[8px] px-2 py-1 border border-[rgb(0,0,0,0.15)]"
          >
            {isCollapsed ? <ChevronsLeftRight className='w-4' /> : <ChevronsLeftRight className='w-4' />}
          </div>
        </div> */}
      </div>
      <nav className="w-full px-4 py-2 flex-1 min-h-0 overflow-y-auto eme-scroll">
        <ul>
          {visibleMenuItems.map((item) => (
            <li key={item.href}>
              <Link to={item.href}>
                <span className={cn(
                  " relative flex items-center gap-x-2 text-sm py-1 px-2 my-0 text-[#7F7F7F] rounded-[12px] hover:bg-[#FFFFFF] hover:text-[#323232] cursor-pointer transition-all border border-transparent hover:border hover:border-[#E5E5E5]",
                  isActiveRoute(item) ? "bg-[#FFFFFF] text-[#323232] border border-[#E5E5E5]" : "",
                  isCollapsed ? "justify-center" : ""
                )}>
                  <TooltipProvider className='relative'>
                    <Tooltip>
                      <TooltipTrigger>
                        <span className="relative inline-flex items-center justify-center">
                          {item.label === 'Emergency SOS' && (
                            <span className="absolute inline-flex h-[16px] w-full animate-ping rounded-full bg-[#FF8282] opacity-75"></span>
                          )}
                          <item.icon className={cn("relative shrink-0 w-4", item.label === 'Emergency SOS' ? "text-red-500" : "")} />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className='bg-white text-[#41A3FF]  border absolute ml-8'>
                        <p>{item.label}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {!isCollapsed && <span>{item.label}</span>}

                  {item.label === 'Approval Requests' && approvalsPending > 0 && (
                    isCollapsed ? (
                      <span className="absolute top-0.5 right-1.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-blue-600 text-white text-[9px] font-semibold">
                        {approvalsPending > 99 ? '99+' : approvalsPending}
                      </span>
                    ) : (
                      <span className="ml-auto min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full bg-blue-600 text-white text-[11px] font-semibold">
                        {approvalsPending > 99 ? '99+' : approvalsPending}
                      </span>
                    )
                  )}

                  {/* Emergency SOS count badge (static — only the icon animates) */}
                  {item.label === 'Emergency SOS' && sosUnread > 0 && (
                    isCollapsed ? (
                      <span className="absolute top-0.5 right-1.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-semibold">
                        {sosUnread > 99 ? '99+' : sosUnread}
                      </span>
                    ) : (
                      <span className="ml-auto min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full bg-red-500 text-white text-[11px] font-semibold">
                        {sosUnread > 99 ? '99+' : sosUnread}
                      </span>
                    )
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className='h-[1px] shrink-0 bg-[#D0D5DD] mx-auto' style={{ width: isCollapsed ? '70%' : '80%' }}>

      </div>
      <div className='shrink-0 px-4 pt-2'>

        <AlertDialog className='w-full '>
          <AlertDialogTrigger className='w-full'>
            <Button
              className={cn(
                "w-full flex items-center justify-start gap-x-2 bg-transparent border border-transparent shadow-none rounded-[12px] text-[#7F7F7F] hover:bg-gray-100 cursor-pointer",
                isCollapsed ? "justify-center p-2" : "px-2"
              )}
            >
              <LogOut className={cn("shrink-0 text-[#7F7F7F]", isCollapsed ? "mr-0 " : "mr-0")} />
              {!isCollapsed && <span className='text-sm font-medium'>Log out</span>}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className='max-w-sm flex flex-col gap-y-4'>
            <AlertDialogHeader>
              <AlertDialogTitle className='text-center text-sm sm:text-base flex flex-col items-center gap-y-1'>

                Are you sure, you want to Logout?
              </AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogFooter className="w-full grid grid-cols-2 gap-x-4  px-10 place-content-center content-center">
              <AlertDialogCancel className='bg-gray-100 border text-xs  sm:text-sm py-4 hover:bg-gray-200'>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleLogout}
                className='bg-red-500 py-4 text-white text-xs  sm:text-sm hover:bg-red-600'
              >
                Logout
              </AlertDialogAction>
            </AlertDialogFooter>
            <div className="text-[#52544F] font-normal text-xs leading-4 text-center">
              Facing issues? <span className="text-[#004CA3] font-normal text-xs leading-4">Talk to our technical person </span>
            </div>

          </AlertDialogContent>
        </AlertDialog>
      </div>

      {
        <div className='w-full shrink-0 flex flex-col items-center pt-5 pb-2'>
          {isCollapsed ? <p className='text-blue-700 font-semibold'>M</p> :
            <div>
              <div className='text-[#656565] text-sm flex items-center gap-x-1 leading-3'>
                Developed By
                <img src="/assets/images/love.svg"
                  className='w-4 h-4'
                  alt="love" />
              </div>
              <a href='https://martiancorporation.com/' target='_blank' className='text-[#323232] text-sm'>

                Martian Corporation
              </a>
            </div>
          }
        </div>
      }
    </div>
  )
}

export default Sidebar

