import { formatSubjectLabel } from '../data/config'
import { getStudentAverage, getRiskLevel } from '../utils/analytics'

function StudentTable({
  students,
  subjects,
  onDeleteStudent,
  onEditStudent,
  onViewStudent,
}) {
  return (
    <section className="table-card">
      <div className="section-heading">
        <h2>Student Performance Table</h2>
      </div>

      {students.length === 0 ? (
        <p>No students match the selected filters.</p>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Gender</th>
                <th>Grade</th>
                {subjects.map((subject) => (
                  <th key={subject}>{formatSubjectLabel(subject)}</th>
                ))}
                <th>Average</th>
                <th>Risk Level</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {students.map((student) => {
                const average = getStudentAverage(student, subjects)
                const riskLevel = getRiskLevel(average)

                return (
                  <tr key={student.id}>
                    <td>{student.name}</td>
                    <td>{student.gender}</td>
                    <td>{student.grade}</td>

                    {subjects.map((subject) => (
                      <td key={subject}>{student.scores?.[subject] ?? 0}</td>
                    ))}

                    <td>{average.toFixed(1)}%</td>
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

                        <button
                          className="edit-button"
                          onClick={() => onEditStudent(student)}
                        >
                          Edit
                        </button>

                        <button
                          className="delete-button"
                          onClick={() => onDeleteStudent(student.id)}
                        >
                          Delete
                        </button>
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