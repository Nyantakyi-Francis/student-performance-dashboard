import { formatSubjectLabel } from '../data/config'

function StudentTable({ students, subjects, onDeleteStudent, onEditStudent }) {
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => {
                const total = subjects.reduce(
                  (sum, subject) => sum + (student.scores[subject] ?? 0),
                  0
                )
                const average = total / subjects.length

                return (
                  <tr key={student.id}>
                    <td>{student.name}</td>
                    <td>{student.gender}</td>
                    <td>{student.grade}</td>
                    {subjects.map((subject) => (
                      <td key={subject}>{student.scores[subject] ?? 0}</td>
                    ))}
                    <td>{average.toFixed(1)}%</td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="edit-button"
                          onClick={() => onEditStudent(student)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
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