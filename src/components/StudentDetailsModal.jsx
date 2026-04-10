import { useEffect } from 'react'
import { formatSubjectLabel } from '../data/config'
import { getStudentAverage, getRiskLevel } from '../utils/analytics'

function StudentDetailsModal({ student, subjects, onClose }) {
  useEffect(() => {
    if (!student) return undefined

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleEscape)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleEscape)
    }
  }, [onClose, student])

  if (!student) return null

  const average = getStudentAverage(student, subjects)
  const riskLevel = getRiskLevel(average)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="student-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 id="student-modal-title">{student.name}</h2>
            <p>
              {student.gender} / {student.grade} / {student.term || 'Term 1'}
            </p>
          </div>

          <button
            type="button"
            className="modal-close-button"
            aria-label="Close student details"
            onClick={onClose}
          >
            x
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
