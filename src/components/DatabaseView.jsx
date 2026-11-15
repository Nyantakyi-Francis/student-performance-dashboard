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
import AssessmentWorkspace from './AssessmentWorkspace'
import PublishedReports from './PublishedReports'
import AccountManager from './AccountManager'
import AccountRecovery from './AccountRecovery'
import { publicDemoAccounts, publicDemoSchool } from '../data/demoAccounts'

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
        const principal = validateSessionResponse(response)
        setSession(principal)
        if (['student', 'guardian'].includes(principal.role)) {
          setData(null)
          setStatus('success')
          setMessage('Signed in. Your published reports appear below.')
          return
        }
        const dashboard = await fetchDashboardData({ signal: controller.signal })
        if (controller.signal.aborted) return
        setData(dashboard)
        setStatus(dashboard.students.length ? 'success' : 'empty')
        setMessage(dashboard.students.length ? 'School records loaded.' : 'No student records are available yet.')
      } catch (error) {
        if (controller.signal.aborted) return
        setData(null)
        if (error.code === 'UNAUTHENTICATED') {
          setSession(null)
          setStatus('signed-out')
          setMessage('Sign in to view records from your school.')
        } else {
          setStatus('error')
          setMessage(error.message || 'School records could not be loaded. Please try again.')
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
    setMessage('Loading school records...')
    setFilters(initialFilters)
    setReload((value) => value + 1)
  }
  const signInWith = async (account) => {
    setSigningIn(true)
    try {
      await apiRequest('/api/v1/auth/login', { method: 'POST', body: account })
      setCredentials((previous) => ({ ...previous, password: '' }))
      retry()
    } catch (error) {
      setStatus('error')
      setMessage(error.message || 'Sign-in failed.')
    } finally { setSigningIn(false) }
  }
  const signIn = (event) => {
    event.preventDefault()
    void signInWith(credentials)
  }
  const signOut = async () => {
    if (!window.dispatchEvent(new Event('before-school-navigation', { cancelable: true }))) return
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
  const refreshWorkflow = useCallback(() => setReload((value) => value + 1), [])
  useEffect(() => {
    const expired = () => { if (session) clearExpiredSession() }
    window.addEventListener('school-session-expired', expired)
    return () => window.removeEventListener('school-session-expired', expired)
  }, [session, clearExpiredSession])

  return (
    <section aria-label="School workspace">
      <div className={`remote-status remote-status--${status}`} role={status === 'error' ? 'alert' : 'status'}>
        {message}
      </div>
      {!session && import.meta.env.VITE_PUBLIC_DEMO === 'true' && <section className="card demo-accounts" aria-label="Try the school workspace">
        <h2>Try the school workspace</h2>
        <p>Choose a role to explore the sample school.</p>
        <div className="workflow-actions">{publicDemoAccounts.map((account) => <button key={account.role} className="action-button secondary" disabled={signingIn || status === 'loading'} onClick={() => void signInWith({ email: account.email, password: account.password, schoolSlug: publicDemoSchool })}>Try as {account.label.toLowerCase()}</button>)}</div>
      </section>}
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
      {!session && hasConfiguredApiBaseUrl && <AccountRecovery />}
      {status !== 'loading' && hasConfiguredApiBaseUrl && <button className="action-button secondary" onClick={retry}>Refresh school records</button>}
      {session?.role === 'administrator' && status !== 'loading' && <AccessManager onUnauthorized={clearExpiredSession} />}
      {session?.role === 'teacher' && <p>Your view includes only assigned classes and subjects. Ask your administrator to change your assignments.</p>}
      {session && <PublishedReports revision={reload} />}
      {session && ['administrator', 'teacher'].includes(session.role) && <AssessmentWorkspace role={session.role} onChanged={refreshWorkflow} />}
      {session?.role === 'administrator' && <AccountManager />}
      {session && data && (
        <>
          <div className="section-heading"><h2>Class overview</h2><p>Includes saved draft scores. Check published reports for released results.</p></div>
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
