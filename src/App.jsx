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

function App() {
  const [students, setStudents] = useState(initialStudents)
  const [subjects, setSubjects] = useState(defaultSubjects)
  const [grades, setGrades] = useState(defaultGrades)
  const [selectedGrade, setSelectedGrade] = useState('All')
  const [selectedGender, setSelectedGender] = useState('All')
  const [editingStudent, setEditingStudent] = useState(null)

  const availableGrades = [...new Set([...grades, ...students.map((student) => student.grade)])]

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchesGrade =
        selectedGrade === 'All' || student.grade === selectedGrade
      const matchesGender =
        selectedGender === 'All' || student.gender === selectedGender

      return matchesGrade && matchesGender
    })
  }, [students, selectedGrade, selectedGender])

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
          Track student results, class averages, and subject performance in one
          place.
        </p>
      </header>

      <main className="main-content">
        <DataManager
          students={students}
          setStudents={setStudents}
          editingStudent={editingStudent}
          setEditingStudent={setEditingStudent}
          subjects={subjects}
          setSubjects={setSubjects}
          grades={grades}
          setGrades={setGrades}
        />

        <FilterBar
          selectedGrade={selectedGrade}
          setSelectedGrade={setSelectedGrade}
          selectedGender={selectedGender}
          setSelectedGender={setSelectedGender}
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
  <p>
    Built by{' '}
    <a
      href="https://nyantakyi-francis.github.io/portfolio/"
      target="_blank"
      rel="noopener noreferrer"
    >
      Nyantakyi Francis
    </a>
  </p>
</footer>
    </div>
  )
}

export default App