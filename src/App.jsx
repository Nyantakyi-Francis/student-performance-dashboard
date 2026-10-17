import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'
import initialStudents from './data/students'
import { DEFAULT_TERM, defaultSubjects, defaultGrades, defaultTerms } from './data/config'
import DashboardCards from './components/DashboardCards'
import SubjectBarChart from './components/SubjectBarChart'
import PerformancePieChart from './components/PerformancePieChart'
import StudentTable from './components/StudentTable'
import FilterBar from './components/FilterBar'
import DataManager from './components/DataManager'
import InsightsPanel from './components/InsightsPanel'
import StudentDetailsModal from './components/StudentDetailsModal'
import TermTrendChart from './components/TermTrendChart'
import { filterStudents } from './utils/filters'
import DatabaseView from './components/DatabaseView'

const DASHBOARD_STORAGE_KEY = 'student-performance-dashboard:v2'

function normalizeStudents(records) {
  return records.map((student) => ({
    ...student,
    studentId: student.studentId ?? String(student.id),
    term: student.term || DEFAULT_TERM,
  }))
}

function getDefaultDashboardState() {
  return {
    grades: defaultGrades,
    students: normalizeStudents(initialStudents),
    subjects: defaultSubjects,
    terms: defaultTerms,
  }
}

function loadDashboardState() {
  const defaultState = getDefaultDashboardState()

  if (typeof window === 'undefined') {
    return defaultState
  }

  try {
    const savedState = window.localStorage.getItem(DASHBOARD_STORAGE_KEY)
    if (!savedState) return defaultState

    const parsedState = JSON.parse(savedState)

    return {
      grades:
        Array.isArray(parsedState.grades) && parsedState.grades.length > 0
          ? parsedState.grades
          : defaultState.grades,
      students: Array.isArray(parsedState.students)
        ? normalizeStudents(parsedState.students)
        : defaultState.students,
      subjects:
        Array.isArray(parsedState.subjects) && parsedState.subjects.length > 0
          ? parsedState.subjects
          : defaultState.subjects,
      terms:
        Array.isArray(parsedState.terms) && parsedState.terms.length > 0
          ? parsedState.terms
          : defaultState.terms,
    }
  } catch {
    return defaultState
  }
}

const persistedDashboardState = loadDashboardState()

function App() {
  const [students, setStudents] = useState(persistedDashboardState.students)
  const [subjects, setSubjects] = useState(persistedDashboardState.subjects)
  const [grades, setGrades] = useState(persistedDashboardState.grades)
  const [terms, setTerms] = useState(persistedDashboardState.terms)
  const [selectedGrade, setSelectedGrade] = useState('All')
  const [selectedGender, setSelectedGender] = useState('All')
  const [selectedRisk, setSelectedRisk] = useState('All')
  const [selectedSubject, setSelectedSubject] = useState('All')
  const [selectedTerm, setSelectedTerm] = useState('All')
  const [searchTerm, setSearchTerm] = useState('')
  const [editingStudent, setEditingStudent] = useState(null)
  const [viewingStudent, setViewingStudent] = useState(null)
  const [storageWarning, setStorageWarning] = useState('')
  const [mode, setMode] = useState(() => {
    try { return window.localStorage.getItem('student-dashboard:mode') === 'database' ? 'database' : 'sandbox' } catch { return 'sandbox' }
  })
  const changeMode = (nextMode) => {
    setViewingStudent(null)
    setMode(nextMode)
    try { window.localStorage.setItem('student-dashboard:mode', nextMode) } catch { /* mode stays available in memory */ }
  }

  useEffect(() => {
    const failed = () => setStorageWarning('Browser storage is unavailable or full. Keep this tab open and export your sandbox data before leaving.')
    window.addEventListener('sandbox-storage-failed', failed)
    return () => window.removeEventListener('sandbox-storage-failed', failed)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      window.localStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify({ grades, students, subjects, terms }))
    } catch {
      window.dispatchEvent(new Event('sandbox-storage-failed'))
    }

  }, [grades, students, subjects, terms])

  const filters = useMemo(
    () => ({
      searchTerm,
      selectedGender,
      selectedGrade,
      selectedRisk,
      selectedSubject,
      selectedTerm,
    }),
    [
      searchTerm,
      selectedGender,
      selectedGrade,
      selectedRisk,
      selectedSubject,
      selectedTerm,
    ]
  )

  const availableGrades = useMemo(
    () => [...new Set([...grades, ...students.map((student) => student.grade)])],
    [grades, students]
  )
  const availableTerms = useMemo(
    () => [
      ...new Set([
        ...terms,
        ...students.map((student) => student.term || DEFAULT_TERM),
      ]),
    ],
    [terms, students]
  )

  const filteredStudents = useMemo(
    () => filterStudents(students, subjects, filters),
    [filters, students, subjects]
  )

  const chartSubjects = useMemo(() => {
    if (selectedSubject === 'All') return subjects
    return subjects.filter((subject) => subject === selectedSubject)
  }, [selectedSubject, subjects])

  const handleDeleteStudent = useCallback(
    (id) => {
    setStudents((previous) => previous.filter((student) => student.id !== id))

    if (editingStudent && editingStudent.id === id) {
      setEditingStudent(null)
    }

    if (viewingStudent && viewingStudent.id === id) {
      setViewingStudent(null)
    }
    },
    [editingStudent, viewingStudent]
  )

  const handleEditStudent = useCallback((student) => {
    setEditingStudent(student)
  }, [])

  const handleViewStudent = useCallback((student) => {
    setViewingStudent(student)
  }, [])

  const handleCloseModal = useCallback(() => {
    setViewingStudent(null)
  }, [])

  return (
    <div className="app">
      <header className="header">
        <h1>Student Performance Analytics Dashboard</h1>
        <p>
          Explore student performance in a browser sandbox or sign in to read school records.
        </p>
      </header>

      <main className="main-content">
        <nav className="data-mode-switch" aria-label="Data source">
          <button className="action-button secondary" aria-pressed={mode === 'sandbox'} onClick={() => changeMode('sandbox')}>Browser sandbox</button>
          <button className="action-button secondary" aria-pressed={mode === 'database'} onClick={() => changeMode('database')}>Database view</button>
        </nav>
        <div className="demo-notice" role="note"><strong>Synthetic demo only.</strong> Use fictional student records in both modes.</div>
        {mode === 'database' && <DatabaseView />}
        <div hidden={mode !== 'sandbox'}>
        <p role="status">Browser sandbox: edits save in this browser. Database records are kept separate.</p>
        {storageWarning && <p role="alert">{storageWarning}</p>}
        <DataManager
          students={students}
          setStudents={setStudents}
          subjects={subjects}
          setSubjects={setSubjects}
          grades={grades}
          setGrades={setGrades}
          terms={terms}
          setTerms={setTerms}
          editingStudent={editingStudent}
          setEditingStudent={setEditingStudent}
        />

        <FilterBar
          selectedGrade={selectedGrade}
          setSelectedGrade={setSelectedGrade}
          selectedGender={selectedGender}
          setSelectedGender={setSelectedGender}
          selectedRisk={selectedRisk}
          setSelectedRisk={setSelectedRisk}
          selectedSubject={selectedSubject}
          setSelectedSubject={setSelectedSubject}
          selectedTerm={selectedTerm}
          setSelectedTerm={setSelectedTerm}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          gradeOptions={availableGrades}
          termOptions={availableTerms}
          subjects={subjects}
        />

        <DashboardCards students={filteredStudents} subjects={chartSubjects} />

        <InsightsPanel
          students={filteredStudents}
          subjects={chartSubjects}
          terms={availableTerms}
        />

        <section className="charts-grid">
          <SubjectBarChart students={filteredStudents} subjects={chartSubjects} />
          <PerformancePieChart students={filteredStudents} subjects={chartSubjects} />
        </section>

        <TermTrendChart
          students={filteredStudents}
          subjects={chartSubjects}
          terms={availableTerms}
        />

        <StudentTable
          students={filteredStudents}
          subjects={subjects}
          onDeleteStudent={handleDeleteStudent}
          onEditStudent={handleEditStudent}
          onViewStudent={handleViewStudent}
        />
        </div>
      </main>

      <StudentDetailsModal
        student={viewingStudent}
        subjects={subjects}
        onClose={handleCloseModal}
      />

      <footer className="footer">
        Created by{' '}
        <a
          href="https://nyantakyi-francis.github.io/portfolio/"
          target="_blank"
          rel="noreferrer"
        >
          Nyantakyi Francis
        </a>
      </footer>
    </div>
  )
}

export default App
