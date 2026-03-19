import { useMemo, useState } from 'react'
import './App.css'
import initialStudents from './data/students'
import DashboardCards from './components/DashboardCards'
import SubjectBarChart from './components/SubjectBarChart'
import PerformancePieChart from './components/PerformancePieChart'
import StudentTable from './components/StudentTable'
import FilterBar from './components/FilterBar'
import DataManager from './components/DataManager'

function App() {
  const [students, setStudents] = useState(initialStudents)
  const [selectedClass, setSelectedClass] = useState('All')
  const [selectedGender, setSelectedGender] = useState('All')

  const classOptions = [...new Set(students.map((student) => student.class))]

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchesClass =
        selectedClass === 'All' || student.class === selectedClass
      const matchesGender =
        selectedGender === 'All' || student.gender === selectedGender

      return matchesClass && matchesGender
    })
  }, [students, selectedClass, selectedGender])

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
        <DataManager students={students} setStudents={setStudents} />

        <FilterBar
          selectedClass={selectedClass}
          setSelectedClass={setSelectedClass}
          selectedGender={selectedGender}
          setSelectedGender={setSelectedGender}
          classOptions={classOptions}
        />

        <DashboardCards students={filteredStudents} />

        <section className="charts-grid">
          <SubjectBarChart students={filteredStudents} />
          <PerformancePieChart students={filteredStudents} />
        </section>

        <StudentTable students={filteredStudents} />
      </main>
    </div>
  )
}

export default App