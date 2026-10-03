from rest_framework.routers import DefaultRouter

from .views import AssignmentViewSet, AttendanceRecordViewSet, AttendanceSessionViewSet, SubmissionViewSet


router = DefaultRouter()
router.register("attendance-sessions", AttendanceSessionViewSet, basename="attendance-session")
router.register("attendance-records", AttendanceRecordViewSet, basename="attendance-record")
router.register("assignments", AssignmentViewSet, basename="learning-assignment")
router.register("submissions", SubmissionViewSet, basename="submission")

urlpatterns = router.urls
