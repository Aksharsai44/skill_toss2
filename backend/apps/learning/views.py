from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.permissions import IsActiveUser

from .models import Assignment, AttendanceRecord, AttendanceSession, Submission
from .permissions import IsAcademicStaff, IsStudent
from .serializers import (
    AssignmentSerializer,
    AttendanceRecordSerializer,
    AttendanceSessionSerializer,
    GradeSubmissionSerializer,
    SubmissionSerializer,
)
from .services import (
    get_assignments_for_user,
    get_attendance_records_for_user,
    get_attendance_sessions_for_user,
    get_submissions_for_user,
)


class StaffManagedViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    http_method_names = ("get", "post", "patch", "head", "options")

    def get_permissions(self):
        classes = [IsActiveUser]
        if self.action in {"create", "update", "partial_update"}:
            classes.append(IsAcademicStaff)
        return [permission() for permission in classes]


class AttendanceSessionViewSet(StaffManagedViewSet):
    serializer_class = AttendanceSessionSerializer

    def get_queryset(self):
        return get_attendance_sessions_for_user(self.request.user)


class AttendanceRecordViewSet(StaffManagedViewSet):
    serializer_class = AttendanceRecordSerializer

    def get_queryset(self):
        return get_attendance_records_for_user(self.request.user)


class AssignmentViewSet(StaffManagedViewSet):
    serializer_class = AssignmentSerializer

    def get_queryset(self):
        return get_assignments_for_user(self.request.user)


class SubmissionViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = SubmissionSerializer
    http_method_names = ("get", "post", "patch", "head", "options")

    def get_queryset(self):
        return get_submissions_for_user(self.request.user)

    def get_permissions(self):
        classes = [IsActiveUser]
        if self.action in {"create", "update", "partial_update"}:
            classes.append(IsStudent)
        elif self.action == "grade":
            classes.append(IsAcademicStaff)
        return [permission() for permission in classes]

    @action(detail=True, methods=("post",))
    def grade(self, request, *args, **kwargs):
        submission = self.get_object()
        serializer = GradeSubmissionSerializer(
            submission, data=request.data, context=self.get_serializer_context()
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            SubmissionSerializer(submission, context=self.get_serializer_context()).data,
            status=status.HTTP_200_OK,
        )
