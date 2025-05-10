// Fixed handleAddCourse implementation
const handleAddCourse = async (courseData) => {
  try {
    setIsLoading(true);
    setError('');
    console.log('🆕 Adding new course:', courseData.title);
    
    // Use the improved saveCourse function from courseUtils.js
    // This will handle both localStorage and MongoDB saving
    const savedCourse = await saveCourse(courseData);
    
    if (!savedCourse || !savedCourse._id) {
      throw new Error('Failed to save course: No course data returned');
    }
    
    // Update the courses state with the new course
    setCourses(prevCourses => [...prevCourses, savedCourse]);
    
    // Force sync across all apps if EduTubeSync is available
    if (window.EduTubeSync && typeof window.EduTubeSync.forceSync === 'function') {
      await window.EduTubeSync.forceSync();
    }
    
    // Show success message
    setSuccess(`Course "${savedCourse.title}" successfully added!`);
    console.log('✅ Course successfully added:', savedCourse);
    
    // Reset form
    setNewCourse({
      title: '',
      description: '',
      instructor: '',
      level: 'beginner',
      thumbnail: '',
      category: categories.length > 0 ? categories[0]._id : '',
      videoUrl: '',
      featured: false
    });
    
    return savedCourse;
  } catch (error) {
    console.error('❌ Error adding course:', error);
    setError(error instanceof Error ? error.message : 'Failed to add course');
    throw error;
  } finally {
    setIsLoading(false);
  }
};
