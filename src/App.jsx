import { useMemo, useState } from 'react'
import './App.css'
import initialStudents from './data/students'
import { defaultSubjects, defaultGrades } from './data/config'
import DashboardCards from './components/DashboardCards'
import SubjectBarChart from './components/SubjectBarChart'
import PerformancePieChart from './components/PerformancePieChart'
import StudentTable from './components/StudentTable'
import FilterBar from './components/FilterBar'
import DataManager from './components/DataManager'
import InsightsPanel from './components/InsightsPanel'
import StudentDetailsModal from './components/StudentDetailsModal'
import { getStudentAverage, getRiskLevel } from './utils/analytics'

function App() {
  const [students, setStudents] = useState(initialStudents)
  const [subjects, setSubjects] = useState(defaultSubjects)
  const [grades, setGrades] = useState(defaultGrades)
  const [selectedGrade, setSelectedGrade] = useState('All')
  const [selectedGender, setSelectedGender] = useState('All')
  const [selectedRisk, setSelectedRisk] = useState('All')
  const [selectedSubject, setSelectedSubject] = useState('All')
  const [searchTerm, setSearchTerm] = useState('')
  const [editingStudent, setEditingStudent] = useState(null)
  const [viewingStudent, setViewingStudent] = useState(null)

  const availableGrades = [...new Set([...grades, ...students.map((student) => student.grade)])]

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const average = getStudentAverage(student, subjects)
      const riskLevel = getRiskLevel(average)

      const matchesGrade =
        selectedGrade === 'All' || student.grade === selectedGrade

      const matchesGender =
        selectedGender === 'All' || student.gender === selectedGender

      const matchesRisk =
        selectedRisk === 'All' || riskLevel === selectedRisk

      const matchesSearch =
        student.name.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesSubject =
        selectedSubject === 'All' ||
        Object.prototype.hasOwnProperty.call(student.scores || {}, selectedSubject)

      return (
        matchesGrade &&
        matchesGender &&
        matchesRisk &&
        matchesSearch &&
        matchesSubject
      )
    })
  }, [
    students,
    subjects,
    selectedGrade,
    selectedGender,
    selectedRisk,
    selectedSubject,
    searchTerm,
  ])

  const chartSubjects =
    selectedSubject === 'All'
      ? subjects
      : subjects.filter((subject) => subject === selectedSubject)

  const handleDeleteStudent = (id) => {
    setStudents((prev) => prev.filter((student) => student.id !== id))

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
          Track student results, class averages, and subject performance in one place.
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
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          gradeOptions={availableGrades}
          subjects={subjects}
        />

        <DashboardCards students={filteredStudents} subjects={chartSubjects} />

        <InsightsPanel students={filteredStudents} subjects={chartSubjects} />

        <section className="charts-grid">
          <SubjectBarChart students={filteredStudents} subjects={chartSubjects} />
          <PerformancePieChart students={filteredStudents} subjects={chartSubjects} />
        </section>

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