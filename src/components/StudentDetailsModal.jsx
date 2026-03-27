import { formatSubjectLabel } from '../data/config'
import { getStudentAverage, getRiskLevel } from '../utils/analytics'

function StudentDetailsModal({ student, subjects, onClose }) {
  if (!student) return null

  const average = getStudentAverage(student, subjects)
  const riskLevel = getRiskLevel(average)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="student-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2>{student.name}</h2>
            <p>
              {student.gender} • {student.grade} • {student.term || 'Term 1'}
            </p>
          </div>

          <button className="modal-close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="student-summary-grid">
          <div className="student-summary-card">
            <h3>Average</h3>
            <p>{average.toFixed(1)}%</p>
          </div>

          <div className="student-summary-card">
            <h3>Risk Level</h3>
            <p>
              <span
                className={`risk-badge ${riskLevel
                  .toLowerCase()
                  .replace(/\s+/g, '-')}`}
              >
                {riskLevel}
              </span>
            </p>
          </div>
        </div>

        <div className="modal-scores">
          <h3>Subject Scores</h3>

          <div className="modal-score-list">
            {subjects.map((subject) => (
              <div className="modal-score-item" key={subject}>
                <span>{formatSubjectLabel(subject)}</span>
                <strong>{student.scores?.[subject] ?? 0}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default StudentDetailsModal