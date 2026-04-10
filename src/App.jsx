import { useEffect, useState } from 'react'
import './App.css'
import initialStudents from './data/students'
import { defaultSubjects, defaultGrades, defaultTerms } from './data/config'
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

const DASHBOARD_STORAGE_KEY = 'student-performance-dashboard:v2'

function normalizeStudents(records) {
  return records.map((student) => ({
    ...student,
    term: student.term || 'Term 1',
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

  useEffect(() => {
    if (typeof window === 'undefined') return

    window.localStorage.setItem(
      DASHBOARD_STORAGE_KEY,
      JSON.stringify({
        grades,
        students,
        subjects,
        terms,
      })
    )
  }, [grades, students, subjects, terms])

  const filters = {
    searchTerm,
    selectedGender,
    selectedGrade,
    selectedRisk,
    selectedSubject,
    selectedTerm,
  }

  const availableGrades = [
    ...new Set([...grades, ...students.map((student) => student.grade)]),
  ]
  const availableTerms = [
    ...new Set([...terms, ...students.map((student) => student.term || 'Term 1')]),
  ]

  const filteredStudents = filterStudents(students, subjects, filters)

  const chartSubjects =
    selectedSubject === 'All'
      ? subjects
      : subjects.filter((subject) => subject === selectedSubject)

  const handleDeleteStudent = (id) => {
    setStudents((previous) => previous.filter((student) => student.id !== id))

    if (editingStudent && editingStudent.id === id) {
      setEditingStudent(null)
    }

    if (viewingStudent && viewingStudent.id === id) {
      setViewingStudent(null)
    }
  }

  const handleEditStudent = (student) => {
    setEditingStudent(student)
  }

  const handleViewStudent = (student) => {
    setViewingStudent(student)
  }

  const handleCloseModal = () => {
    setViewingStudent(null)
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Student Performance Analytics Dashboard</h1>
        <p>
          Import, analyze, and compare student performance across terms. Changes
          save automatically in your browser.
        </p>
      </header>

      <main className="main-content">
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
