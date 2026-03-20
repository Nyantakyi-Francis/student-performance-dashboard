import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import { formatSubjectLabel } from '../data/config'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
)

function SubjectBarChart({ students, subjects }) {
  if (students.length === 0) {
    return (
      <div className="chart-card">
        <h2>No data available for this filter</h2>
      </div>
    )
  }

  const totalStudents = students.length

  const averages = subjects.map((subject) => {
    const total = students.reduce(
      (sum, student) => sum + (student.scores[subject] ?? 0),
      0
    )
    return total / totalStudents
  })

  const data = {
    labels: subjects.map(formatSubjectLabel),
datasets: [
  {
    label: 'Average Score',
    data: averages,
    backgroundColor: ['#60a5fa', '#34d399', '#a78bfa', '#f59e0b', '#f472b6', '#22c55e'],
    borderColor: ['#2563eb', '#059669', '#7c3aed', '#d97706', '#db2777', '#16a34a'],
    borderWidth: 1,
    borderRadius: 8,
  },
],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Subject Average Performance',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
      },
    },
  }

  return (
    <div className="chart-card">
      <div className="chart-inner">
        <Bar data={data} options={options} />
      </div>
    </div>
  )
}

export default SubjectBarChart