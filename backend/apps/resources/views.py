from django.http import FileResponse
from rest_framework import mixins, serializers, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser

from apps.accounts.permissions import IsActiveUser, IsStudent
from apps.learning.models import SubmissionStatus
from apps.learning.permissions import IsAcademicStaff

from .serializers import (
    AssignmentResourceSerializer,
    LearningResourceSerializer,
    NoteFileSerializer,
    StudentNoteSerializer,
    SubmissionAttachmentSerializer,
)
from .services import (
    get_assignment_resources_for_user,
    get_learning_resources_for_user,
    get_note_files_for_user,
    get_notes_for_user,
    get_submission_attachments_for_user,
)


class PrivateDownloadMixin:
    @action(detail=True, methods=("get",))
    def download(self, request, *args, **kwargs):
        obj = self.get_object()
        obj.file.open("rb")
        return FileResponse(
            obj.file,
            as_attachment=True,
            filename=obj.file_name,
            content_type=obj.mime_type,
        )


class StudentNoteViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = StudentNoteSerializer
    http_method_names = ("get", "post", "patch", "delete", "head", "options")

    def get_queryset(self):
        return get_notes_for_user(self.request.user)

    def get_permissions(self):
        classes = [IsActiveUser]
        if self.action in {"create", "update", "partial_update", "destroy"}:
            classes.append(IsStudent)
        return [permission() for permission in classes]


class NoteFileViewSet(
    PrivateDownloadMixin,
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = NoteFileSerializer
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    http_method_names = ("get", "post", "delete", "head", "options")

    def get_queryset(self):
        return get_note_files_for_user(self.request.user)

    def get_permissions(self):
        classes = [IsActiveUser]
        if self.action in {"create", "destroy"}:
            classes.append(IsStudent)
        return [permission() for permission in classes]


class LearningResourceViewSet(
    PrivateDownloadMixin,
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = LearningResourceSerializer
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    http_method_names = ("get", "post", "delete", "head", "options")

    def get_queryset(self):
        return get_learning_resources_for_user(self.request.user)

    def get_permissions(self):
        classes = [IsActiveUser]
        if self.action in {"create", "destroy"}:
            classes.append(IsAcademicStaff)
        return [permission() for permission in classes]


class SubmissionAttachmentViewSet(
    PrivateDownloadMixin,
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = SubmissionAttachmentSerializer
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    http_method_names = ("get", "post", "delete", "head", "options")

    def get_queryset(self):
        return get_submission_attachments_for_user(self.request.user)

    def get_permissions(self):
        classes = [IsActiveUser]
        if self.action in {"create", "destroy"}:
            classes.append(IsStudent)
        return [permission() for permission in classes]

    def perform_destroy(self, instance):
        if instance.submission.status == SubmissionStatus.GRADED:
            raise serializers.ValidationError("Files on a graded submission cannot be deleted.")
        if instance.submission.student_id != self.request.user.id:
            raise serializers.ValidationError("Only the submission owner may delete this file.")
        instance.delete()


class AssignmentResourceViewSet(
    PrivateDownloadMixin,
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = AssignmentResourceSerializer
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    http_method_names = ("get", "post", "head", "options")

    def get_queryset(self):
        return get_assignment_resources_for_user(self.request.user)

    def get_permissions(self):
        classes = [IsActiveUser]
        if self.action == "create":
            classes.append(IsAcademicStaff)
        return [permission() for permission in classes]
