from apps.accounts.models import UserRole
from apps.academics.models import EnrollmentStatus
from apps.learning.services import get_assignments_for_user, get_submissions_for_user

from .models import AssignmentResource, LearningResource, NoteFile, StudentNote, SubmissionAttachment


TENANT_MANAGERS = {UserRole.SUPER_ADMIN, UserRole.ADMIN}


def get_notes_for_user(user):
    queryset = StudentNote.objects.select_related("institution", "student")
    if not user.is_authenticated or not user.is_active or user.role != UserRole.STUDENT:
        return queryset.none()
    return queryset.filter(student=user).order_by("-updated_at")


def get_note_files_for_user(user):
    queryset = NoteFile.objects.select_related("institution", "note", "student")
    if not user.is_authenticated or not user.is_active or user.role != UserRole.STUDENT:
        return queryset.none()
    return queryset.filter(student=user).order_by("-created_at")


def get_learning_resources_for_user(user):
    queryset = LearningResource.objects.select_related(
        "institution", "batch", "subject", "uploaded_by"
    )
    if not user.is_authenticated or not user.is_active or user.role == UserRole.PRODUCT_ADMIN:
        return queryset.none()
    if user.role in TENANT_MANAGERS:
        return queryset.filter(institution_id=user.institution_id).order_by("-created_at")
    if user.role == UserRole.TEACHER:
        return queryset.filter(
            batch__teacher_assignments__teacher=user,
            batch__teacher_assignments__is_active=True,
        ).distinct().order_by("-created_at")
    if user.role == UserRole.STUDENT:
        return queryset.filter(
            batch__student_enrollments__student=user,
            batch__student_enrollments__status=EnrollmentStatus.ACTIVE,
        ).distinct().order_by("-created_at")
    if user.role == UserRole.PARENT:
        return queryset.filter(
            batch__student_enrollments__status=EnrollmentStatus.ACTIVE,
            batch__student_enrollments__student__linked_parent_records__parent=user,
        ).distinct().order_by("-created_at")
    return queryset.none()


def get_submission_attachments_for_user(user):
    queryset = SubmissionAttachment.objects.select_related(
        "institution", "submission", "submission__student", "submission__assignment",
        "submission__assignment__batch", "uploaded_by",
    )
    visible_submissions = get_submissions_for_user(user).values("pk")
    return queryset.filter(submission_id__in=visible_submissions).order_by("-created_at")


def get_assignment_resources_for_user(user):
    queryset = AssignmentResource.objects.select_related(
        "institution", "assignment", "assignment__batch", "uploaded_by"
    )
    visible_assignments = get_assignments_for_user(user).values("pk")
    return queryset.filter(assignment_id__in=visible_assignments).order_by("-created_at")
