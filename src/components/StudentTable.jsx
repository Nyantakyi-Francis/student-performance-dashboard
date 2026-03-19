function StudentTable({ students }) {
  return (
    <section className="table-card">
      <h2>Student Performance Table</h2>

      {students.length === 0 ? (
        <p>No students match the selected filters.</p>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Gender</th>
                <th>Class</th>
                <th>Mathematics</th>
                <th>English</th>
                <th>Science</th>
                <th>Social Studies</th>
                <th>Average</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => {
                const average =
                  (
                    student.mathematics +
                    student.english +
                    student.science +
                    student.socialStudies
                  ) / 4

                return (
                  <tr key={student.id}>
                    <td>{student.name}</td>
                    <td>{student.gender}</td>
                    <td>{student.class}</td>
                    <td>{student.mathematics}</td>
                    <td>{student.english}</td>
                    <td>{student.science}</td>
                    <td>{student.socialStudies}</td>
                    <td>{average.toFixed(1)}%</td>
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