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

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
)

function SubjectBarChart({ students }) {
  const totalStudents = students.length

  const mathAvg =
    students.reduce((sum, student) => sum + student.mathematics, 0) / totalStudents
  const engAvg =
    students.reduce((sum, student) => sum + student.english, 0) / totalStudents
  const sciAvg =
    students.reduce((sum, student) => sum + student.science, 0) / totalStudents
  const socAvg =
    students.reduce((sum, student) => sum + student.socialStudies, 0) / totalStudents

  const data = {
    labels: ['Mathematics', 'English', 'Science', 'Social Studies'],
    datasets: [
      {
        label: 'Average Score',
        data: [mathAvg, engAvg, sciAvg, socAvg],
        borderWidth: 1,
      },
    ],
  }

  const options = {
    responsive: true,
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
      <Bar data={data} options={options} />
    </div>
  )
}

export default SubjectBarChart