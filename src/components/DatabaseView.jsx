import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { apiRequest, fetchDashboardData, hasConfiguredApiBaseUrl } from '../api/dashboard'
import { validateSessionResponse } from '../api/client'
import { filterStudents } from '../utils/filters'
import FilterBar from './FilterBar'
import DashboardCards from './DashboardCards'
import InsightsPanel from './InsightsPanel'
import SubjectBarChart from './SubjectBarChart'
import PerformancePieChart from './PerformancePieChart'
import TermTrendChart from './TermTrendChart'
import StudentTable from './StudentTable'
import StudentDetailsModal from './StudentDetailsModal'
import AccessManager from './AccessManager'

const initialFilters = { searchTerm: '', selectedGender: 'All', selectedGrade: 'All', selectedRisk: 'All', selectedSubject: 'All', selectedTerm: 'All' }

export default function DatabaseView() {
  const loadController = useRef(null)
  const [session, setSession] = useState(null)
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('Checking your session...')
  const [credentials, setCredentials] = useState({ email: '', password: '', schoolSlug: 'accra-demo-jhs' })
  const [filters, setFilters] = useState(initialFilters)
  const [viewingStudent, setViewingStudent] = useState(null)
  const [reload, setReload] = useState(0)
  const [signingIn, setSigningIn] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    loadController.current = controller
    async function load() {
      try {
        const response = await apiRequest('/api/v1/auth/session', { signal: controller.signal })
        if (controller.signal.aborted) return
        setSession(validateSessionResponse(response))
        const dashboard = await fetchDashboardData({ signal: controller.signal })
        if (controller.signal.aborted) return
        setData(dashboard)
        setStatus(dashboard.students.length ? 'success' : 'empty')
        setMessage(dashboard.students.length ? 'Database records loaded. This view is read-only.' : 'No records are available for your school or teaching assignments.')
      } catch (error) {
        if (controller.signal.aborted) return
        setData(null)
        if (error.code === 'UNAUTHENTICATED') {
          setSession(null)
          setStatus('signed-out')
          setMessage('Sign in to view records from your school.')
        } else {
          setStatus('error')
          setMessage(error.message || 'Database records could not be loaded.')
        }
      }
    }
    load()
    return () => controller.abort()
  }, [reload])

  const retry = () => {
    setData(null)
    setViewingStudent(null)
    setStatus('loading')
    setMessage('Loading database records...')
    setFilters(initialFilters)
    setReload((value) => value + 1)
  }
  const signIn = async (event) => {
    event.preventDefault()
    setSigningIn(true)
    try {
      await apiRequest('/api/v1/auth/login', { method: 'POST', body: credentials })
      setCredentials((previous) => ({ ...previous, password: '' }))
      retry()
    } catch (error) {
      setStatus('error')
      setMessage(error.message || 'Sign-in failed.')
    } finally { setSigningIn(false) }
  }
  const signOut = async () => {
    loadController.current?.abort()
    setSigningOut(true)
    try {
      await apiRequest('/api/v1/auth/logout', { method: 'POST', body: {} })
      setSession(null)
      setData(null)
      setViewingStudent(null)
      setStatus('signed-out')
      setMessage('You are signed out.')
    } catch (error) {
      setStatus('error')
      setMessage(error.message || 'Could not sign out. Please retry.')
      setData(null)
    } finally { setSigningOut(false) }
  }
  const updateFilter = (key) => (value) => setFilters((previous) => ({ ...previous, [key]: value }))
  const filtered = useMemo(() => data ? filterStudents(data.students, data.subjects, filters) : [], [data, filters])
  const chartSubjects = data ? (filters.selectedSubject === 'All' ? data.subjects : [filters.selectedSubject]) : []
  const clearExpiredSession = useCallback(() => {
    loadController.current?.abort()
    setData(null)
    setSession(null)
    setViewingStudent(null)
    setStatus('signed-out')
    setMessage('Your session expired or access changed. Sign in again.')
  }, [])
  const closeModal = useCallback(() => setViewingStudent(null), [])

  return (
    <section aria-label="Database view">
      <div className={`remote-status remote-status--${status}`} role={status === 'error' ? 'alert' : 'status'}>
        {message}
      </div>
      <p>Database records are read-only and are not saved in browser storage. Sandbox edits stay separate.</p>
      {session ? (
        <div className="database-session">
          <p>Signed in as {session.displayName} ({session.role}) at {session.schoolName}.</p>
          <button className="action-button secondary" onClick={signOut} disabled={signingOut}>{signingOut ? 'Signing out...' : 'Sign out'}</button>
        </div>
      ) : status !== 'loading' && hasConfiguredApiBaseUrl ? (
        <form className="database-login card" onSubmit={signIn}>
          <h2>School sign-in</h2>
          <label>School code<input value={credentials.schoolSlug} autoComplete="organization" onChange={(event) => setCredentials({ ...credentials, schoolSlug: event.target.value })} required /></label>
          <label>Email<input type="email" value={credentials.email} autoComplete="username" onChange={(event) => setCredentials({ ...credentials, email: event.target.value })} required /></label>
          <label>Password<input type="password" value={credentials.password} autoComplete="current-password" onChange={(event) => setCredentials({ ...credentials, password: event.target.value })} required maxLength={128} /></label>
          <button className="action-button" disabled={signingIn}>{signingIn ? 'Signing in...' : 'Sign in'}</button>
        </form>
      ) : null}
      {status !== 'loading' && hasConfiguredApiBaseUrl && <button className="action-button secondary" onClick={retry}>Reload database records</button>}
      {session?.role === 'administrator' && status !== 'loading' && <AccessManager onUnauthorized={clearExpiredSession} />}
      {session?.role === 'teacher' && <p>Your view includes only assigned classes and subjects. Ask your administrator to change your assignments.</p>}
      {session && data && (
        <>
          <FilterBar {...filters}
            setSearchTerm={updateFilter('searchTerm')} setSelectedGender={updateFilter('selectedGender')}
            setSelectedGrade={updateFilter('selectedGrade')} setSelectedRisk={updateFilter('selectedRisk')}
            setSelectedSubject={updateFilter('selectedSubject')} setSelectedTerm={updateFilter('selectedTerm')}
            gradeOptions={data.grades} termOptions={data.terms} subjects={data.subjects} />
          <DashboardCards students={filtered} subjects={chartSubjects} />
          <InsightsPanel students={filtered} subjects={chartSubjects} terms={data.terms} />
          <section className="charts-grid"><SubjectBarChart students={filtered} subjects={chartSubjects} /><PerformancePieChart students={filtered} subjects={chartSubjects} /></section>
          <TermTrendChart students={filtered} subjects={chartSubjects} terms={data.terms} />
          <StudentTable students={filtered} subjects={data.subjects} onViewStudent={setViewingStudent} />
        </>
      )}
      <StudentDetailsModal student={viewingStudent} subjects={data?.subjects ?? []} onClose={closeModal} />
    </section>
  )
}
