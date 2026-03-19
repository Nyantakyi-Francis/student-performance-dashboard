function FilterBar({
  selectedClass,
  setSelectedClass,
  selectedGender,
  setSelectedGender,
  classOptions,
}) {
  return (
    <section className="filter-bar">
      <div className="filter-group">
        <label htmlFor="classFilter">Filter by Class</label>
        <select
          id="classFilter"
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
        >
          <option value="All">All Classes</option>
          {classOptions.map((className) => (
            <option key={className} value={className}>
              {className}
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