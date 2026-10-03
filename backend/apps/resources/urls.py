from rest_framework.routers import DefaultRouter

from .views import (
    AssignmentResourceViewSet,
    LearningResourceViewSet,
    NoteFileViewSet,
    StudentNoteViewSet,
    SubmissionAttachmentViewSet,
)


router = DefaultRouter()
router.register("notes", StudentNoteViewSet, basename="student-note")
router.register("note-files", NoteFileViewSet, basename="note-file")
router.register("learning-resources", LearningResourceViewSet, basename="learning-resource")
router.register("submission-files", SubmissionAttachmentViewSet, basename="submission-file")
router.register("assignment-resources", AssignmentResourceViewSet, basename="assignment-resource")

urlpatterns = router.urls
