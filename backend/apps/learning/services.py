from apps.accounts.models import UserRole
from apps.academics.models import BatchStatus, EnrollmentStatus, TeacherAssignment

from .models import Assignment, AssignmentStatus, AttendanceRecord, AttendanceSession, Submission


TENANT_MANAGERS = {UserRole.SUPER_ADMIN, UserRole.ADMIN}


def can_manage_batch(user, batch):
    if (
        not user.is_authenticated
        or not user.is_active
        or not user.institution_id
        or user.institution_id != batch.institution_id
        or batch.status != BatchStatus.ACTIVE
    ):
        return False
    if user.role in TENANT_MANAGERS:
        return True
    return user.role == UserRole.TEACHER and TeacherAssignment.objects.filter(
        batch=batch, teacher=user, is_active=True
    ).exists()


def _visible_batch_filter(queryset, user, prefix="batch"):
    if not user.is_authenticated or not user.is_active or user.role == UserRole.PRODUCT_ADMIN:
        return queryset.none()
    if user.role in TENANT_MANAGERS:
        return queryset.filter(**{f"{prefix}__institution_id": user.institution_id})
    if user.role == UserRole.TEACHER:
        return queryset.filter(
            **{
                f"{prefix}__teacher_assignments__teacher": user,
                f"{prefix}__teacher_assignments__is_active": True,
            }
        )
    if user.role == UserRole.STUDENT:
        return queryset.filter(
            **{
                f"{prefix}__student_enrollments__student": user,
                f"{prefix}__student_enrollments__status": EnrollmentStatus.ACTIVE,
            }
        )
    if user.role == UserRole.PARENT:
        return queryset.filter(
            **{
                f"{prefix}__student_enrollments__status": EnrollmentStatus.ACTIVE,
                f"{prefix}__student_enrollments__student__linked_parent_records__parent": user,
            }
        )
    return queryset.none()


def get_attendance_sessions_for_user(user):
    queryset = AttendanceSession.objects.select_related("institution", "batch", "subject", "created_by")
    return _visible_batch_filter(queryset, user).distinct().order_by("-attendance_date", "created_at")


def get_attendance_records_for_user(user):
    queryset = AttendanceRecord.objects.select_related(
        "institution", "session", "session__batch", "session__subject", "student", "marked_by"
    )
    if not user.is_authenticated or not user.is_active or user.role == UserRole.PRODUCT_ADMIN:
        return queryset.none()
    if user.role in TENANT_MANAGERS:
        return queryset.filter(institution_id=user.institution_id).order_by("student__full_name")
    if user.role == UserRole.TEACHER:
        return queryset.filter(
            session__batch__teacher_assignments__teacher=user,
            session__batch__teacher_assignments__is_active=True,
        ).distinct().order_by("student__full_name")
    if user.role == UserRole.STUDENT:
        return queryset.filter(student=user).order_by("-session__attendance_date")
    if user.role == UserRole.PARENT:
        return queryset.filter(student__linked_parent_records__parent=user).distinct().order_by(
            "-session__attendance_date"
        )
    return queryset.none()


def get_assignments_for_user(user):
    queryset = Assignment.objects.select_related("institution", "batch", "subject", "created_by")
    visible = _visible_batch_filter(queryset, user)
    if user.role in {UserRole.STUDENT, UserRole.PARENT}:
        visible = visible.filter(status=AssignmentStatus.PUBLISHED)
    return visible.distinct().order_by("due_at")


def get_submissions_for_user(user):
    queryset = Submission.objects.select_related(
        "institution", "assignment", "assignment__batch", "assignment__subject", "student", "graded_by"
    )
    if not user.is_authenticated or not user.is_active or user.role == UserRole.PRODUCT_ADMIN:
        return queryset.none()
    if user.role in TENANT_MANAGERS:
        return queryset.filter(institution_id=user.institution_id).order_by("-updated_at")
    if user.role == UserRole.TEACHER:
        return queryset.filter(
            assignment__batch__teacher_assignments__teacher=user,
            assignment__batch__teacher_assignments__is_active=True,
        ).distinct().order_by("-updated_at")
    if user.role == UserRole.STUDENT:
        return queryset.filter(student=user).order_by("-updated_at")
    if user.role == UserRole.PARENT:
        return queryset.filter(student__linked_parent_records__parent=user).distinct().order_by(
            "-updated_at"
        )
    return queryset.none()
