import { useEffect, useMemo, useState } from 'react'
import Papa from 'papaparse'
import sampleStudents from '../data/students'
import {
  DEFAULT_TERM,
  defaultGrades,
  defaultSubjects,
  defaultTerms,
  formatSubjectLabel,
} from '../data/config'
import {
  buildStudentExportRows,
  buildTemplateRows,
  createEmptyScores,
  detectSubjectsFromRows,
  downloadBlobFile,
  validateImportRows,
  normalizeKey,
} from '../utils/studentData'
import { parseScore } from '../utils/scores'
import { getStudentIdentity } from '../utils/analytics'
import { createId } from '../utils/ids'

function DataManager({
  students,
  setStudents,
  editingStudent,
  setEditingStudent,
  subjects,
  setSubjects,
  grades,
  setGrades,
  terms,
  setTerms,
}) {
  const [message, setMessage] = useState(null)

  const getDefaultFormState = () => ({
    studentId: '',
    name: '',
    gender: 'Female',
    grade: grades[0] || 'Grade 7',
    term: terms[0] || DEFAULT_TERM,
    scores: createEmptyScores(subjects),
  })

  const [formData, setFormData] = useState(getDefaultFormState)
  const [uploadMode, setUploadMode] = useState('replace')
  const [newSubject, setNewSubject] = useState('')
  const [newGrade, setNewGrade] = useState('')
  const [newTerm, setNewTerm] = useState('')

  const detectedSubjectSeed = useMemo(
    () => (uploadMode === 'append' ? subjects : []),
    [subjects, uploadMode]
  )

  useEffect(() => {
    if (editingStudent) {
      const mergedScores = subjects.reduce((accumulator, subject) => {
        accumulator[subject] = editingStudent.scores[subject] ?? ''
        return accumulator
      }, {})

      setFormData({
        studentId: getStudentIdentity(editingStudent),
        name: editingStudent.name,
        gender: editingStudent.gender,
        grade: editingStudent.grade,
        term: editingStudent.term || (terms[0] || DEFAULT_TERM),
        scores: mergedScores,
      })
      return
    }

    setFormData((previous) => ({
      studentId: previous.studentId,
      name: previous.name,
      gender: previous.gender || 'Female',
      grade: grades.includes(previous.grade) ? previous.grade : grades[0] || 'Grade 7',
      term: terms.includes(previous.term) ? previous.term : terms[0] || DEFAULT_TERM,
      scores: subjects.reduce((accumulator, subject) => {
        accumulator[subject] = previous.scores?.[subject] ?? ''
        return accumulator
      }, {}),
    }))
  }, [editingStudent, grades, subjects, terms])

  const applyUploadData = (parsedStudents, detectedSubjects) => {
    if (parsedStudents.length === 0) {
      setMessage({
        type: 'error',
        text: 'No valid student records were found in the uploaded file.',
      })
      return
    }

    setSubjects(detectedSubjects)

    const uploadedGrades = parsedStudents.map((student) => student.grade)
    setGrades((previous) => [...new Set([...previous, ...uploadedGrades])])

    const uploadedTerms = parsedStudents.map((student) => student.term)
    setTerms((previous) => [...new Set([...previous, ...uploadedTerms])])

    if (uploadMode === 'append') {
      setStudents((previous) => [...previous, ...parsedStudents])
      setMessage({ type: 'success', text: `Appended ${parsedStudents.length} record(s).` })
      return
    }

    setStudents(parsedStudents)
    setMessage({ type: 'success', text: `Loaded ${parsedStudents.length} record(s).` })
  }

  const validateAndUpload = (rows, parserErrors = []) => {
    const detectedSubjects = detectSubjectsFromRows(rows, detectedSubjectSeed)
    const result = validateImportRows(rows, detectedSubjects, terms)
    const errors = [
      ...parserErrors.map((error) => `Row ${(error.row ?? 0) + 2}: ${error.message}`),
      ...result.errors,
    ]
    if (uploadMode === 'append') {
      const existing = new Set(students.map((student) => JSON.stringify([getStudentIdentity(student), student.term])))
      result.students.forEach((student, index) => {
        if (existing.has(JSON.stringify([student.studentId, student.term]))) {
          errors.push(`Row ${index + 2}: this student ID already has a record for ${student.term}. Edit that record instead.`)
        }
      })
    }
    if (errors.length) {
      setMessage({ type: 'error', text: 'Import rejected. No records changed.', errors })
      return
    }
    applyUploadData(result.students, detectedSubjects)
  }

  const handleCsvUpload = (event) => {
    const file = event.target.files[0]
    if (!file) return

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        validateAndUpload(results.data, results.errors)
      },
      error: () => {
        setMessage({ type: 'error', text: 'Failed to parse CSV file.' })
      },
    })

    event.target.value = ''
  }

  const handleExcelUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    try {
      const XLSX = await import('xlsx')
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer)
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet)
      validateAndUpload(jsonData)
    } catch {
      setMessage({ type: 'error', text: 'Failed to parse Excel file.' })
    }

    event.target.value = ''
  }

  const handleBasicChange = (event) => {
    const { name, value } = event.target
    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  const handleScoreChange = (subject, value) => {
    setFormData((previous) => ({
      ...previous,
      scores: {
        ...previous.scores,
        [subject]: value,
      },
    }))
  }

  const handleManualSubmit = (event) => {
    event.preventDefault()

    const scoreObject = {}
    subjects.forEach((subject) => {
      scoreObject[subject] = parseScore(formData.scores[subject])
    })

    const scoreValues = Object.values(scoreObject)
    const hasInvalidScore = scoreValues.some(
      (score) => score !== null && (!Number.isFinite(score) || score < 0 || score > 100)
    )

    const studentRecord = {
      id: editingStudent ? editingStudent.id : createId(),
      studentId: editingStudent ? getStudentIdentity(editingStudent) : formData.studentId.trim() || createId(),
      name: formData.name.trim(),
      gender: formData.gender,
      grade: formData.grade,
      term: formData.term,
      scores: scoreObject,
    }

    if (
      !studentRecord.name ||
      !studentRecord.grade ||
      !studentRecord.term ||
      hasInvalidScore
    ) {
      setMessage({
        type: 'error',
        text: 'Enter a valid name, grade, term, and scores between 0 and 100.',
      })
      return
    }

    if (students.some((student) => student.id !== studentRecord.id && getStudentIdentity(student) === studentRecord.studentId && student.term === studentRecord.term)) {
      setMessage({ type: 'error', text: 'This student ID already has a record for that term. Edit the existing record.' })
      return
    }

    if (editingStudent) {
      setStudents((previous) =>
        previous.map((student) =>
          student.id === editingStudent.id ? studentRecord : student
        )
      )
      setEditingStudent(null)
    } else {
      setStudents((previous) => [...previous, studentRecord])
    }

    setGrades((previous) => [...new Set([...previous, studentRecord.grade])])
    setTerms((previous) => [...new Set([...previous, studentRecord.term])])
    setFormData(getDefaultFormState())
    setMessage({ type: 'success', text: editingStudent ? 'Student updated.' : 'Student added.' })
  }

  const handleCancelEdit = () => {
    setEditingStudent(null)
    setFormData(getDefaultFormState())
  }

  const handleAddSubject = () => {
    const subjectKey = normalizeKey(newSubject)

    if (!subjectKey || subjects.includes(subjectKey)) return

    setSubjects((previous) => [...previous, subjectKey])
    setStudents((previous) =>
      previous.map((student) => ({
        ...student,
        scores: {
          ...student.scores,
          [subjectKey]: null,
        },
      }))
    )
    setNewSubject('')
  }

  const handleAddGrade = () => {
    const gradeValue = newGrade.trim()
    if (!gradeValue || grades.includes(gradeValue)) return

    setGrades((previous) => [...previous, gradeValue])
    setNewGrade('')
  }

  const handleAddTerm = () => {
    const termValue = newTerm.trim()
    if (!termValue || terms.includes(termValue)) return

    setTerms((previous) => [...previous, termValue])
    setNewTerm('')
  }

  const resetToSampleData = () => {
    const resetStudents = sampleStudents.map((student) => ({
      ...student,
      term: student.term || DEFAULT_TERM,
    }))

    setStudents(resetStudents)
    setSubjects(defaultSubjects)
    setGrades(defaultGrades)
    setTerms(defaultTerms)
    setEditingStudent(null)
    setMessage({ type: 'success', text: 'Reset to sample data.' })
  }

  const exportToCsv = () => {
    if (students.length === 0) {
      setMessage({ type: 'error', text: 'There is no data to export.' })
      return
    }

    const csv = Papa.unparse(buildStudentExportRows(students, subjects))
    downloadBlobFile(
      csv,
      'student-performance-data.csv',
      'text/csv;charset=utf-8;'
    )
  }

  const exportToExcel = async () => {
    if (students.length === 0) {
      setMessage({ type: 'error', text: 'There is no data to export.' })
      return
    }

    const XLSX = await import('xlsx')
    const exportData = buildStudentExportRows(students, subjects)
    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students')
    XLSX.writeFile(workbook, 'student-performance-data.xlsx')
  }

  const downloadTemplateCsv = () => {
    const csv = Papa.unparse(buildTemplateRows(subjects, grades, terms))

    downloadBlobFile(
      csv,
      'student-performance-template.csv',
      'text/csv;charset=utf-8;'
    )
  }

  return (
    <section className="card manager-card">
      <div className="section-heading">
        <h2>Manage Student Data</h2>
        <p>
          Upload student records, add new students, edit entries, and expand the
          system with more subjects, grades, and terms.
        </p>
      </div>

      {message && (
        <div
          className={`manager-message manager-message--${message.type}`}
          role={message.type === 'error' ? 'alert' : 'status'}
        >
          {message.text}
          {message.errors?.length > 0 && (
            <ul>{message.errors.map((error, index) => <li key={index}>{error}</li>)}</ul>
          )}
        </div>
      )}

      <div className="manager-actions">
        <label className="upload-mode">
          <span>Upload Mode</span>
          <select value={uploadMode} onChange={(event) => setUploadMode(event.target.value)}>
            <option value="replace">Replace current dataset</option>
            <option value="append">Append to current dataset</option>
          </select>
        </label>

        <div className="upload-buttons">
          <label className="action-button secondary">
            Upload CSV
            <input type="file" accept=".csv" onChange={handleCsvUpload} hidden />
          </label>

          <label className="action-button secondary">
            Upload Excel
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleExcelUpload}
              hidden
            />
          </label>

          <button
            type="button"
            className="action-button secondary"
            onClick={downloadTemplateCsv}
          >
            Download CSV Template
          </button>
        </div>
      </div>

      <div className="manager-grid">
        <div className="manager-side">
          <h3>Add More Subjects, Grades and Terms</h3>

          <div className="inline-form">
            <input
              type="text"
              placeholder="e.g. Creative Arts"
              value={newSubject}
              onChange={(event) => setNewSubject(event.target.value)}
            />
            <button type="button" className="action-button" onClick={handleAddSubject}>
              Add Subject
            </button>
          </div>

          <div className="inline-form">
            <input
              type="text"
              placeholder="e.g. Grade 10"
              value={newGrade}
              onChange={(event) => setNewGrade(event.target.value)}
            />
            <button type="button" className="action-button" onClick={handleAddGrade}>
              Add Grade
            </button>
          </div>

          <div className="inline-form">
            <input
              type="text"
              placeholder="e.g. Term 4"
              value={newTerm}
              onChange={(event) => setNewTerm(event.target.value)}
            />
            <button type="button" className="action-button" onClick={handleAddTerm}>
              Add Term
            </button>
          </div>
        </div>

        <div className="manager-main">
          <h3>{editingStudent ? 'Edit Student Record' : 'Manual Student Entry'}</h3>

          <p>Blank scores mean missing work and are excluded from averages. Use the same student ID for each term; leave it blank for a new student.</p>
          <form className="student-form" onSubmit={handleManualSubmit}>
            <label>
              Student ID
              <input name="studentId" value={formData.studentId} onChange={handleBasicChange} readOnly={Boolean(editingStudent)} placeholder="Auto-generated for new students" />
            </label>
            <input
              type="text"
              name="name"
              placeholder="Student name"
              value={formData.name}
              onChange={handleBasicChange}
              required
            />

            <select name="gender" value={formData.gender} onChange={handleBasicChange}>
              <option value="Female">Female</option>
              <option value="Male">Male</option>
            </select>

            <select name="grade" value={formData.grade} onChange={handleBasicChange}>
              {grades.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>

            <select name="term" value={formData.term} onChange={handleBasicChange}>
              {terms.map((term) => (
                <option key={term} value={term}>
                  {term}
                </option>
              ))}
            </select>

            {subjects.map((subject) => (
              <input
                key={subject}
                type="number"
                min="0"
                max="100"
                placeholder={formatSubjectLabel(subject)}
                value={formData.scores[subject] ?? ''}
                onChange={(event) => handleScoreChange(subject, event.target.value)}
                step="any"
                aria-label={formatSubjectLabel(subject)}
              />
            ))}

            <div className="form-actions">
              <button type="submit" className="action-button">
                {editingStudent ? 'Update Student' : 'Add Student'}
              </button>

              {editingStudent && (
                <button
                  type="button"
                  className="action-button secondary"
                  onClick={handleCancelEdit}
                >
                  Cancel Edit
                </button>
              )}

              <button
                type="button"
                className="action-button secondary"
                onClick={resetToSampleData}
              >
                Reset Sample Data
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="export-actions">
        <button type="button" className="action-button secondary" onClick={exportToCsv}>
          Export CSV
        </button>
        <button type="button" className="action-button secondary" onClick={exportToExcel}>
          Export Excel
        </button>
      </div>

      <p className="dataset-note">
        Current dataset size: {students.length} records. Changes save automatically
        in this browser.
      </p>
    </section>
  )
}

export default DataManager
