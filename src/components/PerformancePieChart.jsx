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
      <Pie data={data} options={options} />
    </div>
  )
}

export default PerformancePieChart