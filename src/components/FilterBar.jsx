import { formatSubjectLabel } from '../data/config'

function FilterBar({
  selectedGrade,
  setSelectedGrade,
  selectedGender,
  setSelectedGender,
  selectedRisk,
  setSelectedRisk,
  selectedSubject,
  setSelectedSubject,
  selectedTerm,
  setSelectedTerm,
  searchTerm,
  setSearchTerm,
  gradeOptions,
  termOptions,
  subjects,
}) {
  return (
    <section className="filter-bar">
      <div className="filter-group">
        <label htmlFor="search-student">Search Student</label>
        <input
          id="search-student"
          type="text"
          placeholder="Enter student name"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="filter-group">
        <label htmlFor="grade-filter">Filter by Grade</label>
        <select
          id="grade-filter"
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
        <label htmlFor="term-filter">Filter by Term</label>
        <select
          id="term-filter"
          value={selectedTerm}
          onChange={(e) => setSelectedTerm(e.target.value)}
        >
          <option value="All">All Terms</option>
          {termOptions.map((term) => (
            <option key={term} value={term}>
              {term}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="gender-filter">Filter by Gender</label>
        <select
          id="gender-filter"
          value={selectedGender}
          onChange={(e) => setSelectedGender(e.target.value)}
        >
          <option value="All">All Genders</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="risk-filter">Filter by Risk Level</label>
        <select
          id="risk-filter"
          value={selectedRisk}
          onChange={(e) => setSelectedRisk(e.target.value)}
        >
          <option value="All">All Risk Levels</option>
          <option value="Excellent">Excellent</option>
          <option value="Good">Good</option>
          <option value="Average">Average</option>
          <option value="At Risk">At Risk</option>
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="subject-filter">Filter by Subject</label>
        <select
          id="subject-filter"
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
        >
          <option value="All">All Subjects</option>
          {subjects.map((subject) => (
            <option key={subject} value={subject}>
              {formatSubjectLabel(subject)}
            </option>
          ))}
        </select>
      </div>
    </section>
  )
}

export default FilterBar