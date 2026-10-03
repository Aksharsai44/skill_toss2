from apps.accounts.models import UserRole
from apps.academics.models import EnrollmentStatus

from .models import ActivityEvent, DailyGoal, DailyTask


TENANT_MANAGERS = {UserRole.SUPER_ADMIN, UserRole.ADMIN}


def _scope_by_student(queryset, user):
    if not user.is_authenticated or not user.is_active or user.role == UserRole.PRODUCT_ADMIN:
        return queryset.none()
    if user.role in TENANT_MANAGERS:
        return queryset.filter(institution_id=user.institution_id)
    if user.role == UserRole.STUDENT:
        return queryset.filter(student=user)
    if user.role == UserRole.PARENT:
        return queryset.filter(student__linked_parent_records__parent=user)
    if user.role == UserRole.TEACHER:
        return queryset.filter(
            student__student_enrollments__status=EnrollmentStatus.ACTIVE,
            student__student_enrollments__batch__teacher_assignments__teacher=user,
            student__student_enrollments__batch__teacher_assignments__is_active=True,
        )
    return queryset.none()


def get_daily_goals_for_user(user):
    return _scope_by_student(
        DailyGoal.objects.select_related("institution", "student"), user
    ).distinct().order_by("-created_at")


def get_daily_tasks_for_user(user):
    return _scope_by_student(
        DailyTask.objects.select_related("institution", "student", "goal"), user
    ).distinct().order_by("-activity_date", "-created_at")


def get_activity_events_for_user(user):
    return _scope_by_student(
        ActivityEvent.objects.select_related("institution", "student", "goal", "task"), user
    ).distinct().order_by("-occurred_at")
