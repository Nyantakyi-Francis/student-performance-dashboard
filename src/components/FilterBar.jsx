function FilterBar({
  selectedGrade,
  setSelectedGrade,
  selectedGender,
  setSelectedGender,
  gradeOptions,
}) {
  return (
    <section className="filter-bar">
      <div className="filter-group">
        <label htmlFor="gradeFilter">Filter by Grade</label>
        <select
          id="gradeFilter"
          value={selectedGrade}
          onChange={(e) => setSelectedGrade(e.target.value)}
        >
          <option value="All">All Grades</option>
          {gradeOptions.map((grade) => (
            <option key={grade} value={grade}>
              {grade}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="genderFilter">Filter by Gender</label>
        <select
          id="genderFilter"
          value={selectedGender}
          onChange={(e) => setSelectedGender(e.target.value)}
        >
          <option value="All">All Genders</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
        </select>
      </div>
    </section>
  )
}

export default FilterBar