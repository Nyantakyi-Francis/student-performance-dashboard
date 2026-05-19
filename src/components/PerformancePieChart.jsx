import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  Title,
} from 'chart.js'
import { Pie } from 'react-chartjs-2'
import { useMemo } from 'react'
import { getStudentAverage } from '../utils/analytics'

ChartJS.register(ArcElement, Tooltip, Legend, Title)

function PerformancePieChart({ students, subjects }) {
  const { passCount, failCount } = useMemo(() => {
    if (students.length === 0 || subjects.length === 0) {
      return { passCount: 0, failCount: 0 }
    }

    const averages = students.map((student) => getStudentAverage(student, subjects))
    return {
      passCount: averages.filter((avg) => avg >= 50).length,
      failCount: averages.filter((avg) => avg < 50).length,
    }
  }, [students, subjects])

  const data = useMemo(
    () => ({
      labels: ['Pass', 'Fail'],
      datasets: [
        {
          label: 'Student Outcome',
          data: [passCount, failCount],
          backgroundColor: ['#34d399', '#f87171'],
          borderColor: ['#059669', '#dc2626'],
          borderWidth: 1,
        },
      ],
    }),
    [failCount, passCount]
  )

  const options = useMemo(
    () => ({
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
    }),
    []
  )

  return (
    <div className="chart-card">
      <div className="pie-chart-inner">
        {students.length === 0 || subjects.length === 0 ? (
          <h2>No data available for this filter</h2>
        ) : (
          <Pie data={data} options={options} />
        )}
      </div>
    </div>
  )
}

export default PerformancePieChart
