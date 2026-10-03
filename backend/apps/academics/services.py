from django.db.models import Prefetch, QuerySet

from apps.accounts.models import Institution, UserRole

from .models import Batch, Department, ParentStudentLink, StudentEnrollment, TeacherAssignment, Course, Subject


TENANT_MANAGERS = {UserRole.SUPER_ADMIN, UserRole.ADMIN}


def get_institutions_for_user(user) -> QuerySet[Institution]:
    queryset = Institution.objects.filter(is_active=True).order_by("name")
    if not user.is_authenticated or not user.is_active:
        return queryset.none()
    if user.role == UserRole.PRODUCT_ADMIN:
        return queryset
    return queryset.filter(pk=user.institution_id)


def _tenant_catalog(queryset, user):
    if not user.is_authenticated or not user.is_active or not user.institution_id:
        return queryset.none()
    return queryset.filter(institution_id=user.institution_id)


def get_departments_for_user(user):
    return _tenant_catalog(Department.objects.all(), user).order_by("name")


def get_courses_for_user(user):
    return _tenant_catalog(Course.objects.select_related("department", "institution"), user).order_by("title")


def get_subjects_for_user(user):
    return _tenant_catalog(
        Subject.objects.select_related("course", "course__department", "institution"), user
    ).order_by("title")


def _visible_batch_base(user):
    queryset = Batch.objects.select_related("institution", "course", "course__department")
    if not user.is_authenticated or not user.is_active or user.role == UserRole.PRODUCT_ADMIN:
        return queryset.none()
    if user.role in TENANT_MANAGERS:
        return queryset.filter(institution_id=user.institution_id)
    if user.role == UserRole.TEACHER:
        return queryset.filter(teacher_assignments__teacher=user, teacher_assignments__is_active=True)
    if user.role == UserRole.STUDENT:
        return queryset.filter(student_enrollments__student=user, student_enrollments__status="active")
    if user.role == UserRole.PARENT:
        return queryset.filter(
            student_enrollments__status="active",
            student_enrollments__student__linked_parent_records__parent=user,
        )
    return queryset.none()


def get_teacher_assignments_for_user(user):
    queryset = TeacherAssignment.objects.select_related("batch", "teacher", "subject", "institution")
    visible_batches = _visible_batch_base(user).values("pk")
    return queryset.filter(batch_id__in=visible_batches).order_by("-is_primary", "teacher__full_name")


def get_student_enrollments_for_user(user):
    queryset = StudentEnrollment.objects.select_related("batch", "student", "institution")
    if not user.is_authenticated or not user.is_active or user.role == UserRole.PRODUCT_ADMIN:
        return queryset.none()
    if user.role in TENANT_MANAGERS:
        return queryset.filter(institution_id=user.institution_id)
    if user.role == UserRole.TEACHER:
        return queryset.filter(
            batch__teacher_assignments__teacher=user,
            batch__teacher_assignments__is_active=True,
        ).distinct()
    if user.role == UserRole.STUDENT:
        return queryset.filter(student=user)
    if user.role == UserRole.PARENT:
        return queryset.filter(student__linked_parent_records__parent=user)
    return queryset.none()


def get_parent_links_for_user(user):
    queryset = ParentStudentLink.objects.select_related("parent", "student", "institution")
    if not user.is_authenticated or not user.is_active:
        return queryset.none()
    if user.role in TENANT_MANAGERS:
        return queryset.filter(institution_id=user.institution_id)
    if user.role == UserRole.PARENT:
        return queryset.filter(parent=user)
    return queryset.none()


def get_batches_for_user(user):
    teacher_assignments = get_teacher_assignments_for_user(user)
    student_enrollments = get_student_enrollments_for_user(user)
    return (
        _visible_batch_base(user)
        .distinct()
        .prefetch_related(
            Prefetch(
                "teacher_assignments",
                queryset=teacher_assignments,
                to_attr="visible_teacher_assignments",
            ),
            Prefetch(
                "student_enrollments",
                queryset=student_enrollments,
                to_attr="visible_student_enrollments",
            ),
        )
        .order_by("name")
    )
