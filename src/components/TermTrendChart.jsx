import {
  Chart as ChartJS,
  CategoryScale,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { getTermPerformance } from '../utils/analytics'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

function TermTrendChart({ students, subjects, terms }) {
  const termPerformance = getTermPerformance(students, subjects, terms)

  if (termPerformance.length < 2) {
    return (
      <section className="chart-card chart-card-wide chart-card-empty">
        <div className="chart-card-header">
          <div>
            <h2>Term Performance Trend</h2>
            <p>
              Add at least two terms to compare how performance changes over time.
            </p>
          </div>
        </div>
      </section>
    )
  }

  const data = {
    labels: termPerformance.map((item) => item.term),
    datasets: [
      {
        label: 'Average score',
        data: termPerformance.map((item) => item.average),
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.14)',
        fill: true,
        borderWidth: 3,
        pointRadius: 4,
        pointHoverRadius: 5,
        tension: 0.28,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
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
    <section className="chart-card chart-card-wide">
      <div className="chart-card-header">
        <div>
          <h2>Term Performance Trend</h2>
          <p>
            Compare average performance across terms for the current dashboard view.
          </p>
        </div>
      </div>

      <div className="chart-inner">
        <Line data={data} options={options} />
      </div>

      <p className="chart-description">
        Each point represents the class average for that term across the filtered
        student records.
      </p>
    </section>
  )
}

export default TermTrendChart
