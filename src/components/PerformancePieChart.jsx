import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  Title,
} from 'chart.js'
import { Pie } from 'react-chartjs-2'

ChartJS.register(ArcElement, Tooltip, Legend, Title)

function PerformancePieChart({ students }) {
  if (students.length === 0) {
    return (
      <div className="chart-card">
        <h2>No data available for this filter</h2>
      </div>
    )
  }

  const averages = students.map((student) => {
    const total =
      student.mathematics +
      student.english +
      student.science +
      student.socialStudies
    return total / 4
  })

  const passCount = averages.filter((avg) => avg >= 50).length
  const failCount = averages.filter((avg) => avg < 50).length

  const data = {
    labels: ['Pass', 'Fail'],
    datasets: [
      {
        label: 'Student Outcome',
        data: [passCount, failCount],
        borderWidth: 1,
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
        text: 'Pass/Fail Distribution',
      },
    },
  }

  return (
    <div className="chart-card">
      <div className="pie-chart-inner">
        <Pie data={data} options={options} />
      </div>
    </div>
  )
}

export default PerformancePieChart