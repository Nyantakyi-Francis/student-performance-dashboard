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
import { getSubjectAverages } from '../utils/analytics'
import { useMemo } from 'react'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
)

function SubjectBarChart({ students, subjects }) {
  const subjectAverages = useMemo(
    () => getSubjectAverages(students, subjects),
    [students, subjects]
  )

  const data = useMemo(
    () => ({
      labels: subjectAverages.map((item) => formatSubjectLabel(item.subject)),
      datasets: [
        {
          label: 'Average Score',
          data: subjectAverages.map((item) => item.average),
          backgroundColor: [
            '#60a5fa',
            '#34d399',
            '#a78bfa',
            '#f59e0b',
            '#f472b6',
            '#22c55e',
          ],
          borderColor: [
            '#2563eb',
            '#059669',
            '#7c3aed',
            '#d97706',
            '#db2777',
            '#16a34a',
          ],
          borderWidth: 1,
          borderRadius: 8,
        },
      ],
    }),
    [subjectAverages]
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
          text: 'Subject Average Performance',
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
        },
      },
    }),
    []
  )

  return (
    <div className="chart-card">
      <div className="chart-inner">
        {students.length === 0 || subjects.length === 0 ? (
          <h2>No data available for this filter</h2>
        ) : (
          <Bar data={data} options={options} />
        )}
      </div>
    </div>
  )
}

export default SubjectBarChart
