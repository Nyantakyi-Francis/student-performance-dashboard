import './App.css'
import students from './data/students'
import DashboardCards from './components/DashboardCards'
import SubjectBarChart from './components/SubjectBarChart'
import PerformancePieChart from './components/PerformancePieChart'
import StudentTable from './components/StudentTable'

function App() {
  return (
    <div className="app">
      <header className="header">
        <h1>Student Performance Analytics Dashboard</h1>
        <p>
          Track student results, class averages, and subject performance in one place.
        </p>
      </header>

      <main className="main-content">
        <DashboardCards students={students} />

        <section className="charts-grid">
          <SubjectBarChart students={students} />
          <PerformancePieChart students={students} />
        </section>

        <StudentTable students={students} />
      </main>
    </div>
  )
}

export default App