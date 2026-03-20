export const defaultSubjects = [
  'english',
  'mathematics',
  'science',
  'socialStudies',
]

export const defaultGrades = ['Grade 7', 'Grade 8', 'Grade 9']

export const formatSubjectLabel = (subject) => {
  const labels = {
    english: 'English',
    mathematics: 'Mathematics',
    science: 'Science',
    socialStudies: 'Social Studies',
  }

  return labels[subject] || subject
}