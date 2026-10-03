from rest_framework.routers import DefaultRouter

from .views import (
    BatchViewSet,
    CourseViewSet,
    DepartmentViewSet,
    InstitutionViewSet,
    ParentStudentLinkViewSet,
    StudentEnrollmentViewSet,
    SubjectViewSet,
    TeacherAssignmentViewSet,
)

router = DefaultRouter()
router.register("institutions", InstitutionViewSet, basename="institution")
router.register("departments", DepartmentViewSet, basename="department")
router.register("courses", CourseViewSet, basename="course")
router.register("subjects", SubjectViewSet, basename="subject")
router.register("batches", BatchViewSet, basename="batch")
router.register("teacher-assignments", TeacherAssignmentViewSet, basename="teacher-assignment")
router.register("student-enrollments", StudentEnrollmentViewSet, basename="student-enrollment")
router.register("parent-student-links", ParentStudentLinkViewSet, basename="parent-student-link")

urlpatterns = router.urls
