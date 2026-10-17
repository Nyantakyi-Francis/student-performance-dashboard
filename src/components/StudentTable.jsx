import { formatAverage, parseScore } from '../utils/scores'
import { useMemo } from 'react'
import { DEFAULT_TERM, formatSubjectLabel } from '../data/config'
import { getStudentAverage, getRiskLevel } from '../utils/analytics'

function StudentTable({
  students,
  subjects,
  onDeleteStudent,
  onEditStudent,
  onViewStudent,
}) {
  const rows = useMemo(
    () =>
      students.map((student) => {
        const average = getStudentAverage(student, subjects)
        const riskLevel = getRiskLevel(average)
        return { student, average, riskLevel }
      }),
    [students, subjects]
  )

  return (
    <section className="table-card">
      <div className="section-heading">
        <h2>Student Performance Records</h2>
      </div>

      {students.length === 0 ? (
        <p>No students match the selected filters.</p>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Name</th>
                <th>Gender</th>
                <th>Grade</th>
                <th>Term</th>
                {subjects.map((subject) => (
                  <th key={subject}>{formatSubjectLabel(subject)}</th>
                ))}
                <th>Average</th>
                <th>Risk Level</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {rows.map(({ student, average, riskLevel }) => {
                return (
                  <tr key={student.id}>
                    <td>{student.studentId ?? student.id}</td>
                    <td>{student.name}</td>
                    <td>{student.gender}</td>
                    <td>{student.grade}</td>
                    <td>{student.term || DEFAULT_TERM}</td>

                    {subjects.map((subject) => (
                      <td key={subject}>{parseScore(student.scores?.[subject]) ?? 'Missing'}</td>
                    ))}

                    <td>{formatAverage(average)}</td>
                    <td>
                      <span
                        className={`risk-badge ${riskLevel
                          .toLowerCase()
                          .replace(/\s+/g, '-')}`}
                      >
                        {riskLevel}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          className="view-button"
                          onClick={() => onViewStudent(student)}
                        >
                          View
                        </button>

                        {onEditStudent && <button
                          className="edit-button"
                          onClick={() => onEditStudent(student)}
                        >
                          Edit
                        </button>}

                        {onDeleteStudent && <button
                          className="delete-button"
                          onClick={() => onDeleteStudent(student.id)}
                        >
                          Delete
                        </button>}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export default StudentTable
