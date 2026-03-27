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
import { getStudentAverage, getRiskLevel } from './utils/analytics'

function App() {
  const [students, setStudents] = useState(initialStudents)
  const [subjects, setSubjects] = useState(defaultSubjects)
  const [grades, setGrades] = useState(defaultGrades)
  const [selectedGrade, setSelectedGrade] = useState('All')
  const [selectedGender, setSelectedGender] = useState('All')
  const [selectedRisk, setSelectedRisk] = useState('All')
  const [searchTerm, setSearchTerm] = useState('')
  const [editingStudent, setEditingStudent] = useState(null)

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

      return matchesGrade && matchesGender && matchesRisk && matchesSearch
    })
  }, [students, subjects, selectedGrade, selectedGender, selectedRisk, searchTerm])

  const handleDeleteStudent = (id) => {
    setStudents((prev) => prev.filter((student) => student.id !== id))

    if (editingStudent && editingStudent.id === id) {
      setEditingStudent(null)
    }
  }

  const handleEditStudent = (student) => {
    setEditingStudent(student)
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
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          gradeOptions={availableGrades}
        />

        <DashboardCards students={filteredStudents} subjects={subjects} />

        <section className="charts-grid">
          <SubjectBarChart students={filteredStudents} subjects={subjects} />
          <PerformancePieChart students={filteredStudents} subjects={subjects} />
        </section>

        <StudentTable
          students={filteredStudents}
          subjects={subjects}
          onDeleteStudent={handleDeleteStudent}
          onEditStudent={handleEditStudent}
        />
      </main>

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