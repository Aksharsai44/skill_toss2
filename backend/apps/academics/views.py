from rest_framework import mixins, viewsets

from apps.accounts.models import Institution
from apps.accounts.permissions import IsActiveUser, IsTenantManager

from .models import Batch, Course, Department, ParentStudentLink, StudentEnrollment, Subject, TeacherAssignment
from .serializers import (
    BatchSerializer,
    CourseSerializer,
    DepartmentSerializer,
    InstitutionSummarySerializer,
    ParentStudentLinkSerializer,
    StudentEnrollmentSerializer,
    SubjectSerializer,
    TeacherAssignmentSerializer,
)
from .services import (
    get_batches_for_user,
    get_courses_for_user,
    get_departments_for_user,
    get_institutions_for_user,
    get_parent_links_for_user,
    get_student_enrollments_for_user,
    get_subjects_for_user,
    get_teacher_assignments_for_user,
)


class ScopedViewSetMixin:
    management_actions = {"create", "update", "partial_update", "destroy"}

    def get_permissions(self):
        permission_classes = [IsActiveUser]
        if self.action in self.management_actions:
            permission_classes.append(IsTenantManager)
        return [permission() for permission in permission_classes]


class InstitutionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = InstitutionSummarySerializer
    permission_classes = (IsActiveUser,)

    def get_queryset(self):
        return get_institutions_for_user(self.request.user)


class DepartmentViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = DepartmentSerializer
    permission_classes = (IsActiveUser,)

    def get_queryset(self):
        return get_departments_for_user(self.request.user)


class CourseViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CourseSerializer
    permission_classes = (IsActiveUser,)

    def get_queryset(self):
        return get_courses_for_user(self.request.user)


class SubjectViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = SubjectSerializer
    permission_classes = (IsActiveUser,)

    def get_queryset(self):
        return get_subjects_for_user(self.request.user)


class BatchViewSet(ScopedViewSetMixin, viewsets.ModelViewSet):
    serializer_class = BatchSerializer
    http_method_names = ("get", "post", "patch", "head", "options")

    def get_queryset(self):
        return get_batches_for_user(self.request.user)


class TeacherAssignmentViewSet(
    ScopedViewSetMixin,
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = TeacherAssignmentSerializer
    http_method_names = ("get", "post", "patch", "head", "options")

    def get_queryset(self):
        return get_teacher_assignments_for_user(self.request.user)


class StudentEnrollmentViewSet(
    ScopedViewSetMixin,
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = StudentEnrollmentSerializer
    http_method_names = ("get", "post", "patch", "head", "options")

    def get_queryset(self):
        return get_student_enrollments_for_user(self.request.user)


class ParentStudentLinkViewSet(
    ScopedViewSetMixin,
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = ParentStudentLinkSerializer
    http_method_names = ("get", "post", "patch", "delete", "head", "options")

    def get_queryset(self):
        return get_parent_links_for_user(self.request.user)
